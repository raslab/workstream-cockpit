import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  createTestProject,
  createTestWorkstream,
  createTestStatusUpdate,
  prisma,
} from '../helpers/testDb';
import workstreamsRoutes from '../../src/routes/workstreams';
import timelineRoutes from '../../src/routes/timeline';

let person: any;
let project: any;
let workstreamsApp: any;
let timelineApp: any;

beforeAll(async () => {
  await setupTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
  person = await createTestPerson({ email: 'hierarchy@example.com', name: 'Parent Stream User' });
  project = await createTestProject(person.id, { name: 'Parent Stream Project' });
  workstreamsApp = createTestApp(workstreamsRoutes, person);
  timelineApp = createTestApp(timelineRoutes, person);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('Parent streams and sub-streams backend contract', () => {
  it('creates a sub-stream, records structural event, and exposes parent-stream/activity fields', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Parent' });
    const parentUpdate = await createTestStatusUpdate(parent.id, { status: 'Parent direct' });

    const create = await request(workstreamsApp).post('/').send({ name: 'Sub-stream', parentId: parent.id, initialStatus: 'Sub-stream direct' });
    expect(create.status).toBe(201);
    expect(create.body).toMatchObject({ name: 'Sub-stream', parentId: parent.id, depth: 2 });
    expect(create.body.parent).toMatchObject({ id: parent.id, name: 'Parent' });
    expect(create.body.parentStreams).toEqual([expect.objectContaining({ id: parent.id, name: 'Parent' })]);

    const parentDetail = await request(workstreamsApp).get(`/${parent.id}`).expect(200);
    expect(parentDetail.body).toMatchObject({
      id: parent.id,
      depth: 1,
      directSubstreamCount: 1,
      activeSubstreamCount: 1,
      closedSubstreamCount: 0,
    });
    expect(parentDetail.body.substreams).toEqual([expect.objectContaining({ id: create.body.id, name: 'Sub-stream', depth: 2 })]);
    expect(parentDetail.body.lastDirectUpdateAt).toBe(new Date(parentUpdate.createdAt).toISOString());
    expect(parentDetail.body.lastSubstreamActivityAt).toBeTruthy();
    expect(parentDetail.body.lastActivityAt).toBeTruthy();
    expect(parentDetail.body.latestSubstreamActivitySource).toMatchObject({ workstreamId: create.body.id, workstreamName: 'Sub-stream' });

    const event = await prisma.workstreamEvent.findFirstOrThrow({ where: { workstreamId: create.body.id, eventType: 'sub_stream_created' } });
    expect(event.metadata).toMatchObject({ newParentId: parent.id, newParentName: 'Parent' });
  });

  it('validates parent changes: closed parent, cross-project parent, self/cycle/sub-stream, and max depth', async () => {
    const root = await createTestWorkstream(project.id, { name: 'Root' });
    let current = root;
    for (const name of ['L2', 'L3', 'L4', 'L5']) {
      current = await createTestWorkstream(project.id, { name, parentId: current.id } as any);
    }

    const tooDeep = await request(workstreamsApp).post('/').send({ name: 'Too deep', parentId: current.id });
    expect(tooDeep.status).toBe(400);
    expect(tooDeep.body.error).toMatch(/depth/i);

    const self = await request(workstreamsApp).put(`/${root.id}`).send({ parentId: root.id });
    expect(self.status).toBe(400);
    expect(self.body.error).toMatch(/own parent/i);

    const cycle = await request(workstreamsApp).put(`/${root.id}`).send({ parentId: current.id });
    expect(cycle.status).toBe(400);
    expect(cycle.body.error).toMatch(/sub-stream|cycle/i);

    const closedParent = await createTestWorkstream(project.id, { name: 'Closed parent', state: 'closed' });
    const underClosed = await request(workstreamsApp).post('/').send({ name: 'Nope', parentId: closedParent.id });
    expect(underClosed.status).toBe(400);
    expect(underClosed.body.error).toMatch(/closed parent/i);

    const otherPerson = await createTestPerson({ email: 'hierarchy-other@example.com' });
    const otherProject = await createTestProject(otherPerson.id);
    const foreignParent = await createTestWorkstream(otherProject.id, { name: 'Foreign' });
    const crossProject = await request(workstreamsApp).put(`/${root.id}`).send({ parentId: foreignParent.id });
    expect(crossProject.status).toBe(404);
    expect(crossProject.body.error).toBe('Parent workstream not found');
  });

  it('allows closed stream reparent/detach, blocks parent close with active sub-streams, and blocks sub-stream reopen under closed parent', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Parent' });
    const substream = await createTestWorkstream(project.id, { name: 'Sub-stream', parentId: parent.id } as any);

    const closeParent = await request(workstreamsApp).put(`/${parent.id}/close`);
    expect(closeParent.status).toBe(400);
    expect(closeParent.body.error).toMatch(/active sub-streams/i);

    await prisma.workstream.update({ where: { id: substream.id }, data: { state: 'closed', closedAt: new Date() } });
    await request(workstreamsApp).put(`/${parent.id}/close`).expect(200);
    const reopenSubstream = await request(workstreamsApp).put(`/${substream.id}/reopen`);
    expect(reopenSubstream.status).toBe(400);
    expect(reopenSubstream.body.error).toMatch(/parent.*closed/i);

    const activeParent = await createTestWorkstream(project.id, { name: 'Active parent' });
    const moved = await request(workstreamsApp).put(`/${substream.id}`).send({ parentId: activeParent.id });
    expect(moved.status).toBe(200);
    expect(moved.body.parentId).toBe(activeParent.id);

    const detached = await request(workstreamsApp).put(`/${substream.id}`).send({ parentId: null });
    expect(detached.status).toBe(200);
    expect(detached.body.parentId).toBeNull();
  });

  it('returns includeSubstreams status history with source and breadcrumb metadata', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Parent' });
    const substream = await createTestWorkstream(project.id, { name: 'Sub-stream', parentId: parent.id } as any);
    const parentUpdate = await createTestStatusUpdate(parent.id, { status: 'Parent status' });
    const substreamUpdate = await createTestStatusUpdate(substream.id, { status: 'Sub-stream status' });

    const direct = await request(workstreamsApp).get(`/${parent.id}/status-updates`).expect(200);
    expect(direct.body.map((u: any) => u.id)).toContain(parentUpdate.id);
    expect(direct.body.map((u: any) => u.id)).not.toContain(substreamUpdate.id);

    const tree = await request(workstreamsApp).get(`/${parent.id}/status-updates?includeSubstreams=true`).expect(200);
    expect(tree.body.map((u: any) => u.id)).toEqual(expect.arrayContaining([parentUpdate.id, substreamUpdate.id]));
    const substreamRow = tree.body.find((u: any) => u.id === substreamUpdate.id);
    expect(substreamRow.source).toMatchObject({ workstreamId: substream.id, workstreamName: 'Sub-stream' });
    expect(substreamRow.breadcrumb).toBe('Parent > Sub-stream');
  });

  it('includes parent stream fields and structural events in timeline with event type filtering', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Parent' });
    const substream = await request(workstreamsApp).post('/').send({ name: 'Sub-stream', parentId: parent.id }).then(r => r.body);
    const top = await request(workstreamsApp).put(`/${substream.id}`).send({ parentId: null }).then(r => r.body);
    expect(top.parentId).toBeNull();

    const response = await request(timelineApp).get('/').query({ eventTypes: 'parent_changed,sub_stream_created' }).expect(200);
    const eventTypes = response.body.map((e: any) => e.eventType);
    expect(eventTypes).toEqual(expect.arrayContaining(['sub_stream_created', 'parent_changed']));
    const created = response.body.find((e: any) => e.eventType === 'sub_stream_created');
    expect(created).toMatchObject({
      workstreamId: substream.id,
      oldParentId: null,
      oldParentName: null,
      newParentId: parent.id,
      newParentName: 'Parent',
      parentId: null,
      parentName: null,
      breadcrumb: 'Parent > Sub-stream',
      currentBreadcrumb: 'Sub-stream',
    });
    const moved = response.body.find((e: any) => e.eventType === 'parent_changed');
    expect(moved).toMatchObject({ workstreamId: substream.id, oldParentId: parent.id, oldParentName: 'Parent', newParentId: null, newParentName: null, breadcrumb: 'Sub-stream', currentBreadcrumb: 'Sub-stream' });
  });

  it('rejects invalid REST timeline eventTypes before querying service', async () => {
    const bad = await request(timelineApp).get('/').query({ eventTypes: 'status_update,not_real' });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatch(/eventTypes/i);

    const repeated = await request(timelineApp).get('/?eventTypes=status_update&eventTypes=not_real');
    expect(repeated.status).toBe(400);
    expect(repeated.body.error).toMatch(/eventTypes/i);
  });

  it('blocks deleting parents with sub-streams and permits deleting leaves', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Delete Parent' });
    const substream = await createTestWorkstream(project.id, { name: 'Delete Sub-stream', parentId: parent.id } as any);

    const parentDelete = await request(workstreamsApp).delete(`/${parent.id}`);
    expect(parentDelete.status).toBe(409);
    expect(parentDelete.body.error).toMatch(/sub-streams/i);
    expect(await prisma.workstream.findUnique({ where: { id: parent.id } })).not.toBeNull();

    await request(workstreamsApp).delete(`/${substream.id}`).expect(204);
    expect(await prisma.workstream.findUnique({ where: { id: substream.id } })).toBeNull();
  });

  it('filters timeline parent/sub-stream scopes for top-level, sub-streams, and under-parent direct/include', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Scope Parent' });
    const sibling = await createTestWorkstream(project.id, { name: 'Scope Sibling' });
    const substream = await createTestWorkstream(project.id, { name: 'Scope Sub-stream', parentId: parent.id } as any);
    const nestedSubstream = await createTestWorkstream(project.id, { name: 'Scope Nested sub-stream', parentId: substream.id } as any);
    await createTestStatusUpdate(parent.id, { status: 'parent #scope' });
    await createTestStatusUpdate(sibling.id, { status: 'sibling #scope' });
    await createTestStatusUpdate(substream.id, { status: 'sub-stream #scope' });
    await createTestStatusUpdate(nestedSubstream.id, { status: 'nested sub-stream #scope' });

    const topLevel = await request(timelineApp).get('/').query({ eventTypes: 'status_update', tags: 'scope', streamScope: 'top-level' }).expect(200);
    expect(topLevel.body.map((e: any) => e.workstreamId)).toEqual(expect.arrayContaining([parent.id, sibling.id]));
    expect(topLevel.body.map((e: any) => e.workstreamId)).not.toEqual(expect.arrayContaining([substream.id, nestedSubstream.id]));

    const substreams = await request(timelineApp).get('/').query({ eventTypes: 'status_update', tags: 'scope', streamScope: 'sub-streams' }).expect(200);
    expect(substreams.body.map((e: any) => e.workstreamId)).toEqual(expect.arrayContaining([substream.id, nestedSubstream.id]));
    expect(substreams.body.map((e: any) => e.workstreamId)).not.toEqual(expect.arrayContaining([parent.id, sibling.id]));

    const direct = await request(timelineApp).get('/').query({ eventTypes: 'status_update', tags: 'scope', streamScope: 'under-parent', parentId: parent.id }).expect(200);
    expect(direct.body.map((e: any) => e.workstreamId)).toEqual([parent.id]);

    const included = await request(timelineApp).get('/').query({ eventTypes: 'status_update', tags: 'scope', streamScope: 'under-parent', parentId: parent.id, includeSubstreams: 'true' }).expect(200);
    expect(included.body.map((e: any) => e.workstreamId)).toEqual(expect.arrayContaining([parent.id, substream.id, nestedSubstream.id]));
    expect(included.body.map((e: any) => e.workstreamId)).not.toContain(sibling.id);
  });

  it('uses full current parent stream path for deep structural timeline events', async () => {
    const root = await createTestWorkstream(project.id, { name: 'Root' });
    const mid = await createTestWorkstream(project.id, { name: 'Mid', parentId: root.id } as any);
    const created = await request(workstreamsApp).post('/').send({ name: 'Leaf', parentId: mid.id }).expect(201);

    const response = await request(timelineApp).get('/').query({ eventTypes: 'sub_stream_created' }).expect(200);
    const event = response.body.find((e: any) => e.workstreamId === created.body.id);
    expect(event).toMatchObject({ breadcrumb: 'Root > Mid > Leaf', currentBreadcrumb: 'Root > Mid > Leaf', parentId: mid.id, parentName: 'Mid', newParentId: mid.id, newParentName: 'Mid' });
  });

  it('keeps sub-stream traversal cycle-safe for corrupted parent stream data', async () => {
    const a = await createTestWorkstream(project.id, { name: 'Corrupt A' });
    const b = await createTestWorkstream(project.id, { name: 'Corrupt B', parentId: a.id } as any);
    await prisma.$executeRawUnsafe('UPDATE "workstreams" SET "parent_id" = $1 WHERE "id" = $2', b.id, a.id);

    const detail = await request(workstreamsApp).get(`/${a.id}`).expect(200);
    expect(detail.body.substreams.map((substream: any) => substream.id)).toContain(b.id);
    expect(detail.body.substreamCount).toBe(1);

    const close = await request(workstreamsApp).put(`/${a.id}/close`);
    expect(close.status).toBe(400);
    expect(close.body.error).toMatch(/active sub-streams/i);
  });

  it('returns frontend-compatible aliases and handles state=all', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Alias Parent' });
    const substream = await createTestWorkstream(project.id, { name: 'Alias Sub-stream', parentId: parent.id } as any);
    await prisma.workstream.update({ where: { id: substream.id }, data: { state: 'closed', closedAt: new Date() } });
    await createTestStatusUpdate(substream.id, { status: 'sub-stream activity' });

    const detail = await request(workstreamsApp).get(`/${parent.id}`).expect(200);
    expect(detail.body.substreamCount).toBe(1);
    expect(detail.body.latestSubstreamActivitySource).toMatchObject({ workstreamId: substream.id, workstreamName: 'Alias Sub-stream', name: 'Alias Sub-stream' });

    const all = await request(workstreamsApp).get('/').query({ state: 'all' }).expect(200);
    expect(all.body.map((w: any) => w.id)).toEqual(expect.arrayContaining([parent.id, substream.id]));
  });

  it('validates parentId/categoryId request types cleanly', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Validation Parent' });
    await request(workstreamsApp).post('/').send({ name: 'Bad Parent', parentId: 123 }).expect(400);
    await request(workstreamsApp).post('/').send({ name: 'Bad Category', categoryId: 'not-a-uuid' }).expect(400);
    await request(workstreamsApp).put(`/${parent.id}`).send({ parentId: 123 }).expect(400);
    await request(workstreamsApp).put(`/${parent.id}`).send({ categoryId: 'not-a-uuid' }).expect(400);
  });
});
