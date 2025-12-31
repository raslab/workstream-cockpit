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
  createTestTag,
  createTestWorkstream,
  createTestStatusUpdate,
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
      expect(workstream.tagId).toBeNull();
      expect(workstream.context).toBeNull();
    });

    it('should create workstream with tag', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const tag = await createTestTag(project.id);

      const workstream = await createWorkstream({
        projectId: project.id,
        name: 'Tagged Workstream',
        tagId: tag.id,
      });

      expect(workstream.tagId).toBe(tag.id);
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

    it('should include tag information', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const tag = await createTestTag(project.id, { name: 'urgent', color: '#FF0000' });
      
      await createTestWorkstream(project.id, { name: 'Tagged WS', tagId: tag.id });

      const workstreams = await getWorkstreams(project.id);

      expect(workstreams[0].tag).toBeDefined();
      expect(workstreams[0].tag?.name).toBe('urgent');
      expect(workstreams[0].tag?.color).toBe('#FF0000');
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
      const tag = await createTestTag(project.id, { name: 'test-tag' });
      const workstream = await createTestWorkstream(project.id, { tagId: tag.id });
      await createTestStatusUpdate(workstream.id, { status: 'Current status' });

      const found = await getWorkstreamById(workstream.id, project.id);

      expect(found?.tag?.name).toBe('test-tag');
      expect(found?.latestStatus?.status).toBe('Current status');
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
      const tag = await createTestTag(project.id);
      const workstream = await createTestWorkstream(project.id);

      const updated = await updateWorkstream(workstream.id, project.id, { tagId: tag.id });

      expect(updated.tagId).toBe(tag.id);
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
      const tag = await createTestTag(project.id);
      const workstream = await createTestWorkstream(project.id, { tagId: tag.id });

      const updated = await updateWorkstream(workstream.id, project.id, { tagId: null });

      expect(updated.tagId).toBeNull();
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
