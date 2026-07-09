import {
  createWorkstream,
  getWorkstreams,
  getWorkstreamById,
  updateWorkstream,
  closeWorkstream,
  reopenWorkstream,
  deleteWorkstream,
} from '../../src/services/workstreamService';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  createTestProject,
  createTestCategory,
  createTestWorkstream,
  createTestStatusUpdate,
  prisma,
} from '../helpers/testDb';

beforeAll(async () => {
  await setupTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('WorkstreamService', () => {
  describe('createWorkstream', () => {
    it('should create a new workstream with required fields only', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);

      const workstream = await createWorkstream({
        projectId: project.id,
        name: 'New Feature Development',
      });

      expect(workstream).toBeDefined();
      expect(workstream.id).toBeDefined();
      expect(workstream.projectId).toBe(project.id);
      expect(workstream.name).toBe('New Feature Development');
      expect(workstream.state).toBe('active');
      expect(workstream.categoryId).toBeNull();
      expect(workstream.context).toBeNull();
    });

    it('should create workstream with tag', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const category = await createTestCategory(project.id);

      const workstream = await createWorkstream({
        projectId: project.id,
        name: 'Tagged Workstream',
        categoryId: category.id,
      });

      expect(workstream.categoryId).toBe(category.id);
    });

    it('should create workstream with context', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);

      const workstream = await createWorkstream({
        projectId: project.id,
        name: 'Workstream with Context',
        context: 'This is important background information',
      });

      expect(workstream.context).toBe('This is important background information');
    });

    it('should create workstream with initial status update', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);

      const workstream = await createWorkstream({
        projectId: project.id,
        name: 'Workstream with Status',
        initialStatus: 'Starting work on this',
        initialNote: 'First note',
      });

      const { prisma } = await import('../helpers/testDb');
      const statusUpdates = await prisma.statusUpdate.findMany({
        where: { workstreamId: workstream.id },
      });

      expect(statusUpdates).toHaveLength(1);
      expect(statusUpdates[0].status).toBe('Starting work on this');
      expect(statusUpdates[0].note).toBe('First note');
    });

    it('should create workstream without status update when not provided', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);

      const workstream = await createWorkstream({
        projectId: project.id,
        name: 'No Status Workstream',
      });

      const { prisma } = await import('../helpers/testDb');
      const statusUpdates = await prisma.statusUpdate.findMany({
        where: { workstreamId: workstream.id },
      });

      expect(statusUpdates).toHaveLength(0);
    });
  });

  describe('getWorkstreams', () => {
    it('should return all workstreams for a project', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      
      await createTestWorkstream(project.id, { name: 'Workstream 1' });
      await createTestWorkstream(project.id, { name: 'Workstream 2' });

      const workstreams = await getWorkstreams(project.id);

      expect(workstreams).toHaveLength(2);
    });

    it('should filter active workstreams only', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      
      await createTestWorkstream(project.id, { name: 'Active 1', state: 'active' });
      await createTestWorkstream(project.id, { name: 'Closed 1', state: 'closed' });
      await createTestWorkstream(project.id, { name: 'Active 2', state: 'active' });

      const workstreams = await getWorkstreams(project.id, 'active');

      expect(workstreams).toHaveLength(2);
      expect(workstreams.every(ws => ws.state === 'active')).toBe(true);
    });

    it('should filter closed workstreams only', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      
      await createTestWorkstream(project.id, { name: 'Active 1', state: 'active' });
      await createTestWorkstream(project.id, { name: 'Closed 1', state: 'closed' });
      await createTestWorkstream(project.id, { name: 'Closed 2', state: 'closed' });

      const workstreams = await getWorkstreams(project.id, 'closed');

      expect(workstreams).toHaveLength(2);
      expect(workstreams.every(ws => ws.state === 'closed')).toBe(true);
    });

    it('should return closed workstreams ordered by close date, not creation or later updates', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);

      const createdLaterButClosedEarlier = await createTestWorkstream(project.id, {
        name: 'Created later but closed earlier',
        state: 'closed',
      });
      const createdEarlierButClosedLater = await createTestWorkstream(project.id, {
        name: 'Created earlier but closed later',
        state: 'closed',
      });
      await prisma.workstream.update({
        where: { id: createdLaterButClosedEarlier.id },
        data: {
          createdAt: new Date('2026-01-02T10:00:00.000Z'),
          closedAt: new Date('2026-01-10T10:00:00.000Z'),
        },
      });
      await prisma.workstream.update({
        where: { id: createdEarlierButClosedLater.id },
        data: {
          createdAt: new Date('2026-01-01T10:00:00.000Z'),
          closedAt: new Date('2026-01-20T10:00:00.000Z'),
        },
      });

      const laterUnrelatedUpdate = await createTestStatusUpdate(createdLaterButClosedEarlier.id, {
        status: 'Corrected archived history after closure',
      });
      await prisma.statusUpdate.update({
        where: { id: laterUnrelatedUpdate.id },
        data: {
          createdAt: new Date('2026-02-01T10:00:00.000Z'),
          updatedAt: new Date('2026-02-01T10:00:00.000Z'),
        },
      });

      const workstreams = await getWorkstreams(project.id, 'closed');

      expect(workstreams.map((ws) => ws.id)).toEqual([
        createdEarlierButClosedLater.id,
        createdLaterButClosedEarlier.id,
      ]);
    });

    it('should include tag information', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const category = await createTestCategory(project.id, { name: 'urgent', color: '#FF0000' });
      
      await createTestWorkstream(project.id, { name: 'Tagged WS', categoryId: category.id });

      const workstreams = await getWorkstreams(project.id);

      expect(workstreams[0].category).toBeDefined();
      expect(workstreams[0].category?.name).toBe('urgent');
      expect(workstreams[0].category?.color).toBe('#FF0000');
    });

    it('should include latest status update', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const workstream = await createTestWorkstream(project.id);
      
      await createTestStatusUpdate(workstream.id, { status: 'Old status' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await createTestStatusUpdate(workstream.id, { status: 'Latest status' });

      const workstreams = await getWorkstreams(project.id);

      expect(workstreams[0].latestStatus).toBeDefined();
      expect(workstreams[0].latestStatus?.status).toBe('Latest status');
    });

    it('should return workstreams in descending order by creation date', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      
      const ws1 = await createTestWorkstream(project.id, { name: 'First' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const ws2 = await createTestWorkstream(project.id, { name: 'Second' });

      const workstreams = await getWorkstreams(project.id);

      expect(workstreams[0].id).toBe(ws2.id); // Most recent first
      expect(workstreams[1].id).toBe(ws1.id);
    });
  });

  describe('getWorkstreamById', () => {
    it('should return workstream when it belongs to the project', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const workstream = await createTestWorkstream(project.id, { name: 'My Workstream' });

      const found = await getWorkstreamById(workstream.id, project.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(workstream.id);
      expect(found?.name).toBe('My Workstream');
    });

    it('should return null when workstream does not belong to project', async () => {
      const person = await createTestPerson();
      const project1 = await createTestProject(person.id);
      const project2 = await createTestProject(person.id);
      const workstream = await createTestWorkstream(project1.id);

      const found = await getWorkstreamById(workstream.id, project2.id);

      expect(found).toBeNull();
    });

    it('should include tag and latest status', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const category = await createTestCategory(project.id, { name: 'test-tag' });
      const workstream = await createTestWorkstream(project.id, { categoryId: category.id });
      await createTestStatusUpdate(workstream.id, { status: 'Current status' });

      const found = await getWorkstreamById(workstream.id, project.id);

      expect(found?.category?.name).toBe('test-tag');
      expect(found?.latestStatus?.status).toBe('Current status');
    });

    it('should include latest activity metadata on direct substreams in detail response', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const parent = await createTestWorkstream(project.id, { name: 'Parent' });
      const substream = await createTestWorkstream(project.id, { name: 'Sub-stream with activity', parentId: parent.id });
      const quietSubstream = await createTestWorkstream(project.id, { name: 'Sub-stream without activity', parentId: parent.id });
      const nestedSubstream = await createTestWorkstream(project.id, { name: 'Nested sub-stream with latest activity', parentId: substream.id });

      const substreamUpdate = await createTestStatusUpdate(substream.id, { status: 'Sub-stream direct update' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const nestedSubstreamUpdate = await createTestStatusUpdate(nestedSubstream.id, { status: 'Nested sub-stream latest update' });

      const found = await getWorkstreamById(parent.id, project.id);
      const substreams = found?.substreams ?? [];
      const substreamSummary = substreams.find(summary => summary.id === substream.id) as any;
      const quietSubstreamSummary = substreams.find(summary => summary.id === quietSubstream.id) as any;

      expect(substreamSummary).toBeDefined();
      expect(substreamSummary.lastDirectUpdateAt?.toISOString()).toBe(substreamUpdate.createdAt.toISOString());
      expect(substreamSummary.lastSubstreamActivityAt?.toISOString()).toBe(nestedSubstreamUpdate.createdAt.toISOString());
      expect(substreamSummary.lastActivityAt?.toISOString()).toBe(nestedSubstreamUpdate.createdAt.toISOString());
      expect(substreamSummary.latestSubstreamActivitySource).toMatchObject({
        workstreamId: nestedSubstream.id,
        workstreamName: 'Nested sub-stream with latest activity',
        updateId: nestedSubstreamUpdate.id,
      });

      expect(quietSubstreamSummary).toBeDefined();
      expect(quietSubstreamSummary.lastDirectUpdateAt).toBeNull();
      expect(quietSubstreamSummary.lastSubstreamActivityAt).toBeNull();
      expect(quietSubstreamSummary.lastActivityAt).toBeNull();
      expect(quietSubstreamSummary.latestSubstreamActivitySource).toBeNull();
    });
  });

  describe('updateWorkstream', () => {
    it('should update workstream name', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const workstream = await createTestWorkstream(project.id, { name: 'Old Name' });

      const updated = await updateWorkstream(workstream.id, project.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
    });

    it('should update workstream tag', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const category = await createTestCategory(project.id);
      const workstream = await createTestWorkstream(project.id);

      const updated = await updateWorkstream(workstream.id, project.id, { categoryId: category.id });

      expect(updated.categoryId).toBe(category.id);
    });

    it('should update workstream context', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const workstream = await createTestWorkstream(project.id);

      const updated = await updateWorkstream(workstream.id, project.id, {
        context: 'New context',
      });

      expect(updated.context).toBe('New context');
    });

    it('should clear tag by setting to null', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const category = await createTestCategory(project.id);
      const workstream = await createTestWorkstream(project.id, { categoryId: category.id });

      const updated = await updateWorkstream(workstream.id, project.id, { categoryId: null });

      expect(updated.categoryId).toBeNull();
    });

    it('should throw error when updating workstream from different project', async () => {
      const person = await createTestPerson();
      const project1 = await createTestProject(person.id);
      const project2 = await createTestProject(person.id);
      const workstream = await createTestWorkstream(project1.id);

      await expect(
        updateWorkstream(workstream.id, project2.id, { name: 'Hacked' })
      ).rejects.toThrow('Workstream not found or access denied');
    });
  });

  describe('closeWorkstream', () => {
    it('should close an active workstream', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const workstream = await createTestWorkstream(project.id, { state: 'active' });

      const closed = await closeWorkstream(workstream.id, project.id);

      expect(closed.state).toBe('closed');
      expect(closed.closedAt).toBeDefined();
      expect(closed.closedAt).toBeInstanceOf(Date);
    });

    it('should throw error when closing workstream from different project', async () => {
      const person = await createTestPerson();
      const project1 = await createTestProject(person.id);
      const project2 = await createTestProject(person.id);
      const workstream = await createTestWorkstream(project1.id);

      await expect(closeWorkstream(workstream.id, project2.id)).rejects.toThrow(
        'Workstream not found or access denied'
      );
    });
  });

  describe('reopenWorkstream', () => {
    it('should reopen a closed workstream', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const { prisma } = await import('../helpers/testDb');
      
      const workstream = await createTestWorkstream(project.id, { state: 'active' });
      await prisma.workstream.update({
        where: { id: workstream.id },
        data: { state: 'closed', closedAt: new Date() },
      });

      const reopened = await reopenWorkstream(workstream.id, project.id);

      expect(reopened.state).toBe('active');
      expect(reopened.closedAt).toBeNull();
    });

    it('should throw error when reopening workstream from different project', async () => {
      const person = await createTestPerson();
      const project1 = await createTestProject(person.id);
      const project2 = await createTestProject(person.id);
      const workstream = await createTestWorkstream(project1.id);

      await expect(reopenWorkstream(workstream.id, project2.id)).rejects.toThrow(
        'Workstream not found or access denied'
      );
    });
  });

  describe('deleteWorkstream', () => {
    it('should delete a workstream', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const workstream = await createTestWorkstream(project.id);

      await deleteWorkstream(workstream.id, project.id);

      const found = await getWorkstreamById(workstream.id, project.id);
      expect(found).toBeNull();
    });

    it('should cascade delete status updates', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const workstream = await createTestWorkstream(project.id);
      await createTestStatusUpdate(workstream.id, { status: 'Status 1' });
      await createTestStatusUpdate(workstream.id, { status: 'Status 2' });

      await deleteWorkstream(workstream.id, project.id);

      const { prisma } = await import('../helpers/testDb');
      const statusUpdates = await prisma.statusUpdate.findMany({
        where: { workstreamId: workstream.id },
      });
      
      expect(statusUpdates).toHaveLength(0);
    });

    it('should throw error when deleting workstream from different project', async () => {
      const person = await createTestPerson();
      const project1 = await createTestProject(person.id);
      const project2 = await createTestProject(person.id);
      const workstream = await createTestWorkstream(project1.id);

      await expect(deleteWorkstream(workstream.id, project2.id)).rejects.toThrow(
        'Workstream not found or access denied'
      );
    });
  });
});
