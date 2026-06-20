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
  person = await createTestPerson({ email: 'hierarchy@example.com', name: 'Hierarchy User' });
  project = await createTestProject(person.id, { name: 'Hierarchy Project' });
  workstreamsApp = createTestApp(workstreamsRoutes, person);
  timelineApp = createTestApp(timelineRoutes, person);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('Hierarchy V1 backend contract', () => {
  it('creates a sub-stream, records structural event, and exposes hierarchy/activity fields', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Parent' });
    const parentUpdate = await createTestStatusUpdate(parent.id, { status: 'Parent direct' });

    const create = await request(workstreamsApp).post('/').send({ name: 'Child', parentId: parent.id, initialStatus: 'Child direct' });
    expect(create.status).toBe(201);
    expect(create.body).toMatchObject({ name: 'Child', parentId: parent.id, depth: 2 });
    expect(create.body.parent).toMatchObject({ id: parent.id, name: 'Parent' });
    expect(create.body.ancestors).toEqual([expect.objectContaining({ id: parent.id, name: 'Parent' })]);

    const parentDetail = await request(workstreamsApp).get(`/${parent.id}`).expect(200);
    expect(parentDetail.body).toMatchObject({
      id: parent.id,
      depth: 1,
      directChildCount: 1,
      activeChildCount: 1,
      closedChildCount: 0,
    });
    expect(parentDetail.body.children).toEqual([expect.objectContaining({ id: create.body.id, name: 'Child', depth: 2 })]);
    expect(parentDetail.body.lastDirectUpdateAt).toBe(new Date(parentUpdate.createdAt).toISOString());
    expect(parentDetail.body.lastSubstreamActivityAt).toBeTruthy();
    expect(parentDetail.body.lastActivityAt).toBeTruthy();
    expect(parentDetail.body.latestSubstreamActivitySource).toMatchObject({ workstreamId: create.body.id, workstreamName: 'Child' });

    const event = await prisma.workstreamEvent.findFirstOrThrow({ where: { workstreamId: create.body.id, eventType: 'sub_stream_created' } });
    expect(event.metadata).toMatchObject({ newParentId: parent.id, newParentName: 'Parent' });
  });

  it('validates parent changes: closed parent, cross-project parent, self/cycle/descendant, and max depth', async () => {
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
    expect(cycle.body.error).toMatch(/descendant|cycle/i);

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

  it('allows closed stream reparent/detach, blocks parent close with active descendants, and blocks child reopen under closed parent', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Parent' });
    const child = await createTestWorkstream(project.id, { name: 'Child', parentId: parent.id } as any);

    const closeParent = await request(workstreamsApp).put(`/${parent.id}/close`);
    expect(closeParent.status).toBe(400);
    expect(closeParent.body.error).toMatch(/active descendants/i);

    await prisma.workstream.update({ where: { id: child.id }, data: { state: 'closed', closedAt: new Date() } });
    await request(workstreamsApp).put(`/${parent.id}/close`).expect(200);
    const reopenChild = await request(workstreamsApp).put(`/${child.id}/reopen`);
    expect(reopenChild.status).toBe(400);
    expect(reopenChild.body.error).toMatch(/parent.*closed/i);

    const activeParent = await createTestWorkstream(project.id, { name: 'Active parent' });
    const moved = await request(workstreamsApp).put(`/${child.id}`).send({ parentId: activeParent.id });
    expect(moved.status).toBe(200);
    expect(moved.body.parentId).toBe(activeParent.id);

    const detached = await request(workstreamsApp).put(`/${child.id}`).send({ parentId: null });
    expect(detached.status).toBe(200);
    expect(detached.body.parentId).toBeNull();
  });

  it('returns includeSubstreams status history with source and breadcrumb metadata', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Parent' });
    const child = await createTestWorkstream(project.id, { name: 'Child', parentId: parent.id } as any);
    const parentUpdate = await createTestStatusUpdate(parent.id, { status: 'Parent status' });
    const childUpdate = await createTestStatusUpdate(child.id, { status: 'Child status' });

    const direct = await request(workstreamsApp).get(`/${parent.id}/status-updates`).expect(200);
    expect(direct.body.map((u: any) => u.id)).toContain(parentUpdate.id);
    expect(direct.body.map((u: any) => u.id)).not.toContain(childUpdate.id);

    const tree = await request(workstreamsApp).get(`/${parent.id}/status-updates?includeSubstreams=true`).expect(200);
    expect(tree.body.map((u: any) => u.id)).toEqual(expect.arrayContaining([parentUpdate.id, childUpdate.id]));
    const childRow = tree.body.find((u: any) => u.id === childUpdate.id);
    expect(childRow.source).toMatchObject({ workstreamId: child.id, workstreamName: 'Child' });
    expect(childRow.breadcrumb).toBe('Parent > Child');
  });

  it('includes hierarchy fields and structural events in timeline with event type filtering', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Parent' });
    const child = await request(workstreamsApp).post('/').send({ name: 'Child', parentId: parent.id }).then(r => r.body);
    const top = await request(workstreamsApp).put(`/${child.id}`).send({ parentId: null }).then(r => r.body);
    expect(top.parentId).toBeNull();

    const response = await request(timelineApp).get('/').query({ eventTypes: 'parent_changed,sub_stream_created' }).expect(200);
    const eventTypes = response.body.map((e: any) => e.eventType);
    expect(eventTypes).toEqual(expect.arrayContaining(['sub_stream_created', 'parent_changed']));
    const created = response.body.find((e: any) => e.eventType === 'sub_stream_created');
    expect(created).toMatchObject({
      workstreamId: child.id,
      oldParentId: null,
      oldParentName: null,
      newParentId: parent.id,
      newParentName: 'Parent',
      parentId: null,
      parentName: null,
      breadcrumb: 'Parent > Child',
      currentBreadcrumb: 'Child',
    });
    const moved = response.body.find((e: any) => e.eventType === 'parent_changed');
    expect(moved).toMatchObject({ workstreamId: child.id, oldParentId: parent.id, oldParentName: 'Parent', newParentId: null, newParentName: null, breadcrumb: 'Child', currentBreadcrumb: 'Child' });
  });

  it('rejects invalid REST timeline eventTypes before querying service', async () => {
    const bad = await request(timelineApp).get('/').query({ eventTypes: 'status_update,not_real' });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatch(/eventTypes/i);

    const repeated = await request(timelineApp).get('/?eventTypes=status_update&eventTypes=not_real');
    expect(repeated.status).toBe(400);
    expect(repeated.body.error).toMatch(/eventTypes/i);
  });

  it('blocks deleting parents with descendants and permits deleting leaves', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Delete Parent' });
    const child = await createTestWorkstream(project.id, { name: 'Delete Child', parentId: parent.id } as any);

    const parentDelete = await request(workstreamsApp).delete(`/${parent.id}`);
    expect(parentDelete.status).toBe(409);
    expect(parentDelete.body.error).toMatch(/descendants/i);
    expect(await prisma.workstream.findUnique({ where: { id: parent.id } })).not.toBeNull();

    await request(workstreamsApp).delete(`/${child.id}`).expect(204);
    expect(await prisma.workstream.findUnique({ where: { id: child.id } })).toBeNull();
  });

  it('filters timeline hierarchy scopes for top-level, sub-streams, and under-parent direct/include', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Scope Parent' });
    const sibling = await createTestWorkstream(project.id, { name: 'Scope Sibling' });
    const child = await createTestWorkstream(project.id, { name: 'Scope Child', parentId: parent.id } as any);
    const grandchild = await createTestWorkstream(project.id, { name: 'Scope Grandchild', parentId: child.id } as any);
    await createTestStatusUpdate(parent.id, { status: 'parent #scope' });
    await createTestStatusUpdate(sibling.id, { status: 'sibling #scope' });
    await createTestStatusUpdate(child.id, { status: 'child #scope' });
    await createTestStatusUpdate(grandchild.id, { status: 'grandchild #scope' });

    const topLevel = await request(timelineApp).get('/').query({ eventTypes: 'status_update', tags: 'scope', hierarchyScope: 'top-level' }).expect(200);
    expect(topLevel.body.map((e: any) => e.workstreamId)).toEqual(expect.arrayContaining([parent.id, sibling.id]));
    expect(topLevel.body.map((e: any) => e.workstreamId)).not.toEqual(expect.arrayContaining([child.id, grandchild.id]));

    const substreams = await request(timelineApp).get('/').query({ eventTypes: 'status_update', tags: 'scope', hierarchyScope: 'sub-streams' }).expect(200);
    expect(substreams.body.map((e: any) => e.workstreamId)).toEqual(expect.arrayContaining([child.id, grandchild.id]));
    expect(substreams.body.map((e: any) => e.workstreamId)).not.toEqual(expect.arrayContaining([parent.id, sibling.id]));

    const direct = await request(timelineApp).get('/').query({ eventTypes: 'status_update', tags: 'scope', hierarchyScope: 'under-parent', parentId: parent.id }).expect(200);
    expect(direct.body.map((e: any) => e.workstreamId)).toEqual([parent.id]);

    const included = await request(timelineApp).get('/').query({ eventTypes: 'status_update', tags: 'scope', hierarchyScope: 'under-parent', parentId: parent.id, includeSubstreams: 'true' }).expect(200);
    expect(included.body.map((e: any) => e.workstreamId)).toEqual(expect.arrayContaining([parent.id, child.id, grandchild.id]));
    expect(included.body.map((e: any) => e.workstreamId)).not.toContain(sibling.id);
  });

  it('uses full current hierarchy breadcrumb for deep structural timeline events', async () => {
    const root = await createTestWorkstream(project.id, { name: 'Root' });
    const mid = await createTestWorkstream(project.id, { name: 'Mid', parentId: root.id } as any);
    const created = await request(workstreamsApp).post('/').send({ name: 'Leaf', parentId: mid.id }).expect(201);

    const response = await request(timelineApp).get('/').query({ eventTypes: 'sub_stream_created' }).expect(200);
    const event = response.body.find((e: any) => e.workstreamId === created.body.id);
    expect(event).toMatchObject({ breadcrumb: 'Root > Mid > Leaf', currentBreadcrumb: 'Root > Mid > Leaf', parentId: mid.id, parentName: 'Mid', newParentId: mid.id, newParentName: 'Mid' });
  });

  it('keeps descendant traversal cycle-safe for corrupted hierarchy data', async () => {
    const a = await createTestWorkstream(project.id, { name: 'Corrupt A' });
    const b = await createTestWorkstream(project.id, { name: 'Corrupt B', parentId: a.id } as any);
    await prisma.$executeRawUnsafe('UPDATE "workstreams" SET "parent_id" = $1 WHERE "id" = $2', b.id, a.id);

    const detail = await request(workstreamsApp).get(`/${a.id}`).expect(200);
    expect(detail.body.children.map((child: any) => child.id)).toContain(b.id);
    expect(detail.body.childCount).toBe(1);

    const close = await request(workstreamsApp).put(`/${a.id}/close`);
    expect(close.status).toBe(400);
    expect(close.body.error).toMatch(/active descendants/i);
  });

  it('returns frontend-compatible aliases and handles state=all', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Alias Parent' });
    const child = await createTestWorkstream(project.id, { name: 'Alias Child', parentId: parent.id } as any);
    await prisma.workstream.update({ where: { id: child.id }, data: { state: 'closed', closedAt: new Date() } });
    await createTestStatusUpdate(child.id, { status: 'child activity' });

    const detail = await request(workstreamsApp).get(`/${parent.id}`).expect(200);
    expect(detail.body.childCount).toBe(1);
    expect(detail.body.latestSubstreamActivitySource).toMatchObject({ workstreamId: child.id, workstreamName: 'Alias Child', name: 'Alias Child' });

    const all = await request(workstreamsApp).get('/').query({ state: 'all' }).expect(200);
    expect(all.body.map((w: any) => w.id)).toEqual(expect.arrayContaining([parent.id, child.id]));
  });

  it('validates parentId/categoryId request types cleanly', async () => {
    const parent = await createTestWorkstream(project.id, { name: 'Validation Parent' });
    await request(workstreamsApp).post('/').send({ name: 'Bad Parent', parentId: 123 }).expect(400);
    await request(workstreamsApp).post('/').send({ name: 'Bad Category', categoryId: 'not-a-uuid' }).expect(400);
    await request(workstreamsApp).put(`/${parent.id}`).send({ parentId: 123 }).expect(400);
    await request(workstreamsApp).put(`/${parent.id}`).send({ categoryId: 'not-a-uuid' }).expect(400);
  });
});
