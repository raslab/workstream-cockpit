import request from 'supertest';
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
import { createTestApp } from '../helpers/testApp';
import workstreamsRoutes from '../../src/routes/workstreams';
import statusUpdatesRoutes from '../../src/routes/statusUpdates';

let person: any;
let project: any;
let workstream: any;
let workstreamsApp: any;
let statusUpdatesApp: any;

beforeAll(async () => {
  await setupTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
  person = await createTestPerson({ email: 'next-steps@example.com', name: 'Next Steps User' });
  project = await createTestProject(person.id, { name: 'Next Steps Project' });
  workstream = await createTestWorkstream(project.id, { name: 'Stream with next steps' });
  workstreamsApp = createTestApp(workstreamsRoutes, person);
  statusUpdatesApp = createTestApp(statusUpdatesRoutes, person);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('Next steps API integration', () => {
  it('creates, lists, edits, reorders, and deletes stream-local next steps without creating movement', async () => {
    const first = await request(workstreamsApp)
      .post(`/${workstream.id}/next-steps`)
      .send({ text: 'Draft API contract' })
      .expect(201);
    expect(first.body).toMatchObject({ workstreamId: workstream.id, text: 'Draft API contract', sortOrder: 0 });

    const second = await request(workstreamsApp)
      .post(`/${workstream.id}/next-steps`)
      .send({ text: 'Review edge cases' })
      .expect(201);
    expect(second.body.sortOrder).toBe(1);

    const listed = await request(workstreamsApp).get(`/${workstream.id}/next-steps`).expect(200);
    expect(listed.body.map((step: any) => step.text)).toEqual(['Draft API contract', 'Review edge cases']);

    await request(workstreamsApp)
      .put(`/${workstream.id}/next-steps/${first.body.id}`)
      .send({ text: 'Draft REST API contract' })
      .expect(200)
      .expect((res) => expect(res.body.text).toBe('Draft REST API contract'));

    await request(workstreamsApp)
      .put(`/${workstream.id}/next-steps/reorder`)
      .send({ nextStepIds: [second.body.id, first.body.id] })
      .expect(200)
      .expect((res) => expect(res.body.map((step: any) => step.id)).toEqual([second.body.id, first.body.id]));

    const afterReorder = await request(workstreamsApp).get(`/${workstream.id}/next-steps`).expect(200);
    expect(afterReorder.body.map((step: any) => step.id)).toEqual([second.body.id, first.body.id]);

    const tile = await request(workstreamsApp).get('/').expect(200);
    expect(tile.body[0].nextStepCount).toBe(2);

    await request(workstreamsApp).delete(`/${workstream.id}/next-steps/${first.body.id}`).expect(204);
    await expect(prisma.statusUpdate.count({ where: { workstreamId: workstream.id } })).resolves.toBe(0);
    const finalTile = await request(workstreamsApp).get('/').expect(200);
    expect(finalTile.body[0].nextStepCount).toBe(1);
  });

  it('solves and abandons next steps atomically with active/passive updates', async () => {
    const solveStep = await request(workstreamsApp)
      .post(`/${workstream.id}/next-steps`)
      .send({ text: 'Ship migration' })
      .expect(201);
    const abandonStep = await request(workstreamsApp)
      .post(`/${workstream.id}/next-steps`)
      .send({ text: 'Try risky shortcut' })
      .expect(201);

    const solved = await request(workstreamsApp)
      .post(`/${workstream.id}/next-steps/${solveStep.body.id}/solve`)
      .expect(200);
    expect(solved.body.update).toMatchObject({
      workstreamId: workstream.id,
      status: 'Solved next step: Ship migration',
      impact: 'active',
    });
    expect(solved.body.nextStep).toMatchObject({ id: solveStep.body.id, text: 'Ship migration' });

    const abandoned = await request(workstreamsApp)
      .post(`/${workstream.id}/next-steps/${abandonStep.body.id}/abandon`)
      .expect(200);
    expect(abandoned.body.update).toMatchObject({
      workstreamId: workstream.id,
      status: 'Abandoned next step: Try risky shortcut',
      impact: 'passive',
    });

    const remaining = await request(workstreamsApp).get(`/${workstream.id}/next-steps`).expect(200);
    expect(remaining.body).toEqual([]);

    const history = await request(statusUpdatesApp)
      .get(`/workstreams/${workstream.id}/status-updates`)
      .expect(200);
    expect(history.body.updates.map((update: any) => update.impact)).toEqual(['passive', 'active']);
  });

  it('passive updates appear in history but do not affect latest active status or not-updated-today freshness', async () => {
    const active = await createTestStatusUpdate(workstream.id, { status: 'Meaningful active progress' });
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeAt = await prisma.statusUpdate.update({
      where: { id: active.id },
      data: { createdAt: yesterday, updatedAt: yesterday, impact: 'active' },
    });

    const step = await request(workstreamsApp)
      .post(`/${workstream.id}/next-steps`)
      .send({ text: 'Drop stale idea' })
      .expect(201);
    await request(workstreamsApp)
      .post(`/${workstream.id}/next-steps/${step.body.id}/abandon`)
      .expect(200);

    const history = await request(statusUpdatesApp)
      .get(`/workstreams/${workstream.id}/status-updates`)
      .expect(200);
    expect(history.body.updates[0]).toMatchObject({
      status: 'Abandoned next step: Drop stale idea',
      impact: 'passive',
    });

    const detail = await request(workstreamsApp).get(`/${workstream.id}`).expect(200);
    expect(detail.body.latestStatus).toMatchObject({ id: active.id, status: 'Meaningful active progress', impact: 'active' });
    expect(detail.body.lastDirectUpdateAt).toBe(activeAt.createdAt.toISOString());

    const notUpdatedToday = await request(workstreamsApp).get('/?notUpdatedToday=true').expect(200);
    expect(notUpdatedToday.body.map((stream: any) => stream.id)).toContain(workstream.id);
  });

  it('rejects invalid next step mutations', async () => {
    await request(workstreamsApp)
      .post(`/${workstream.id}/next-steps`)
      .send({ text: '   ' })
      .expect(400)
      .expect((res) => expect(res.body.error).toBe('Next step text is required'));

    const otherPerson = await createTestPerson({ email: 'other-next-steps@example.com' });
    const otherProject = await createTestProject(otherPerson.id, { name: 'Other project' });
    const otherWorkstream = await createTestWorkstream(otherProject.id, { name: 'Other stream' });
    await request(workstreamsApp)
      .post(`/${otherWorkstream.id}/next-steps`)
      .send({ text: 'Forbidden' })
      .expect(404);
  });
});
