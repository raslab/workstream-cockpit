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
import { listResourceChanges } from '../../src/services/resourceChangeService';
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

describe('resource change parent stream metadata', () => {
  it('includes every parent stream number for sub-stream create, close, reopen, and status update events', async () => {
    const person = await createTestPerson();
    const project = await createTestProject(person.id);
    const rootStream = await createWorkstream({ projectId: project.id, name: 'Root stream' });
    const substream = await createWorkstream({
      projectId: project.id,
      name: 'Sub-stream',
      parentId: rootStream.id,
    });
    const nestedSubstream = await createWorkstream({
      projectId: project.id,
      name: 'Nested sub-stream',
      parentId: substream.id,
    });

    await closeWorkstream(nestedSubstream.id, project.id);
    await reopenWorkstream(nestedSubstream.id, project.id);
    const update = await createStatusUpdate({
      projectId: project.id,
      workstreamId: nestedSubstream.id,
      status: 'Nested movement',
    });
    await updateStatusUpdate(
      update.id,
      nestedSubstream.id,
      { status: 'Corrected movement', expectedVersion: update.version },
      project.id,
    );
    await deleteStatusUpdate(update.id, nestedSubstream.id);

    const changes = await prisma.resourceChange.findMany({
      where: {
        OR: [
          { resourceType: 'workstream', resourceId: nestedSubstream.id },
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
    changes.forEach((change) => {
      expect(change.metadata).toEqual({
        parentStreamNumbers: [rootStream.number, substream.number],
      });
      expect(JSON.stringify(change.metadata)).not.toContain(rootStream.id);
      expect(JSON.stringify(change.metadata)).not.toContain(substream.id);
    });

    const apiOutput = await listResourceChanges(project.id, null, 50);
    const apiChanges = apiOutput.changes.filter(
      (change) =>
        change.workstreamNumber === nestedSubstream.number &&
        (change.resourceType === 'workstream' || change.resourceId === update.id),
    );
    expect(apiChanges).toHaveLength(6);
    apiChanges.forEach((change) => {
      expect(change.metadata).toEqual({
        parentStreamNumbers: [rootStream.number, substream.number],
      });
      expect(change).not.toHaveProperty('projectId');
      expect(change).not.toHaveProperty('workstreamId');
      expect(JSON.stringify(change)).not.toContain(rootStream.id);
      expect(JSON.stringify(change)).not.toContain(substream.id);
      expect(JSON.stringify(change)).not.toContain(nestedSubstream.id);
    });
  });

  it('correlates a sub-stream creation with its initial status event', async () => {
    const person = await createTestPerson();
    const project = await createTestProject(person.id);
    const parentStream = await createWorkstream({
      projectId: project.id,
      name: 'Parent stream',
    });
    const substream = await createWorkstream({
      projectId: project.id,
      name: 'Sub-stream with status',
      parentId: parentStream.id,
      initialStatus: 'Starting nested work',
    });

    const changes = await prisma.resourceChange.findMany({
      where: { workstreamId: substream.id },
      orderBy: { sequence: 'asc' },
    });

    expect(changes).toHaveLength(2);
    expect(changes.map((change) => [change.resourceType, change.operation])).toEqual([
      ['workstream', 'created'],
      ['status_update', 'created'],
    ]);
    changes.forEach((change) =>
      expect(change.metadata).toEqual({
        parentStreamNumbers: [parentStream.number],
        correlationId: expect.any(String),
      }),
    );
    changes.forEach((change) => {
      expect(JSON.stringify(change.metadata)).not.toContain(parentStream.id);
    });
    expect((changes[0].metadata as { correlationId: string }).correlationId).toBe(
      (changes[1].metadata as { correlationId: string }).correlationId,
    );
  });
});
