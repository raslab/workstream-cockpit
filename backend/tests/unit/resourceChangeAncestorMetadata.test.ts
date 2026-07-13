import {
  closeWorkstream,
  createWorkstream,
  reopenWorkstream,
} from '../../src/services/workstreamService';
import {
  createStatusUpdate,
  deleteStatusUpdate,
  updateStatusUpdate,
} from '../../src/services/statusUpdateService';
import {
  cleanDatabase,
  createTestPerson,
  createTestProject,
  disconnectDatabase,
  prisma,
  setupTestDatabase,
} from '../helpers/testDb';

beforeAll(setupTestDatabase);
beforeEach(cleanDatabase);
afterAll(disconnectDatabase);

describe('resource change ancestor metadata', () => {
  it('includes every ancestor for descendant create, close, reopen, and status update events', async () => {
    const person = await createTestPerson();
    const project = await createTestProject(person.id);
    const root = await createWorkstream({ projectId: project.id, name: 'Root' });
    const child = await createWorkstream({
      projectId: project.id,
      name: 'Child',
      parentId: root.id,
    });
    const grandchild = await createWorkstream({
      projectId: project.id,
      name: 'Grandchild',
      parentId: child.id,
    });

    await closeWorkstream(grandchild.id, project.id);
    await reopenWorkstream(grandchild.id, project.id);
    const update = await createStatusUpdate({
      projectId: project.id,
      workstreamId: grandchild.id,
      status: 'Nested movement',
    });
    await updateStatusUpdate(
      update.id,
      grandchild.id,
      { status: 'Corrected movement' },
      project.id,
    );
    await deleteStatusUpdate(update.id, grandchild.id);

    const changes = await prisma.resourceChange.findMany({
      where: {
        OR: [
          { resourceType: 'workstream', resourceId: grandchild.id },
          { resourceType: 'status_update', resourceId: update.id },
        ],
      },
      orderBy: { sequence: 'asc' },
    });

    expect(changes.map((change) => change.operation)).toEqual([
      'created',
      'closed',
      'reopened',
      'created',
      'updated',
      'deleted',
    ]);
    expect(changes).toHaveLength(6);
    changes.forEach((change) =>
      expect(change.metadata).toMatchObject({ ancestorWorkstreamIds: [root.id, child.id] }),
    );
  });

  it('correlates a descendant stream creation with its initial status event', async () => {
    const person = await createTestPerson();
    const project = await createTestProject(person.id);
    const root = await createWorkstream({ projectId: project.id, name: 'Root' });
    const child = await createWorkstream({
      projectId: project.id,
      name: 'Child with status',
      parentId: root.id,
      initialStatus: 'Starting nested work',
    });

    const changes = await prisma.resourceChange.findMany({
      where: { workstreamId: child.id },
      orderBy: { sequence: 'asc' },
    });

    expect(changes).toHaveLength(2);
    expect(changes.map((change) => [change.resourceType, change.operation])).toEqual([
      ['workstream', 'created'],
      ['status_update', 'created'],
    ]);
    changes.forEach((change) =>
      expect(change.metadata).toMatchObject({
        ancestorWorkstreamIds: [root.id],
        correlationId: expect.any(String),
      }),
    );
    expect((changes[0].metadata as { correlationId: string }).correlationId).toBe(
      (changes[1].metadata as { correlationId: string }).correlationId,
    );
  });
});
