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
import statusUpdatesRoutes from '../../src/routes/statusUpdates';

let person: any;
let project: any;
let workstream: any;
let app: any;

beforeAll(async () => {
  await setupTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
  
  // Create test user, project, and workstream
  person = await createTestPerson({ email: 'test@example.com', name: 'Test User' });
  project = await createTestProject(person.id, { name: 'Test Project' });
  workstream = await createTestWorkstream(project.id, { name: 'Test Workstream' });
  
  // Create app with authenticated user
  app = createTestApp(statusUpdatesRoutes, person);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('Status Updates API Integration Tests', () => {
  describe('POST /status-updates', () => {
    it('should create status update with required fields only and assign a public number', async () => {
      const response = await request(app).post('/').send({
        workstreamId: workstream.id,
        status: 'Making good progress',
      });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.number).toBe(1);
      expect(response.body.projectId).toBe(project.id);
      expect(response.body.workstreamId).toBe(workstream.id);
      expect(response.body.status).toBe('Making good progress');
      expect(response.body.createdAt).toBeDefined();
    });

    it('should create status update with optional note', async () => {
      const response = await request(app).post('/').send({
        workstreamId: workstream.id,
        status: 'Completed first milestone',
        note: 'Deployed to staging environment',
      });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('Completed first milestone');
      expect(response.body.note).toBe('Deployed to staging environment');
    });

    it('should reject creating a status update on a closed workstream', async () => {
      const closedWorkstream = await createTestWorkstream(project.id, {
        name: 'Closed Workstream',
        state: 'closed',
      });

      const response = await request(app).post('/').send({
        workstreamId: closedWorkstream.id,
        status: 'Should not be added',
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Cannot add status updates to a closed workstream');

      const statusUpdateCount = await prisma.statusUpdate.count({
        where: { workstreamId: closedWorkstream.id },
      });
      expect(statusUpdateCount).toBe(0);
    });

    it('should return 400 when workstreamId is missing', async () => {
      const response = await request(app).post('/').send({
        status: 'Test status',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Workstream ID is required');
    });

    it('should return 400 when status is missing', async () => {
      const response = await request(app).post('/').send({
        workstreamId: workstream.id,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Status is required');
    });

    it('should return 400 when status is empty', async () => {
      const response = await request(app).post('/').send({
        workstreamId: workstream.id,
        status: '   ',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Status is required');
    });

    it('should return 400 when status exceeds 500 characters', async () => {
      const longStatus = 'a'.repeat(501);

      const response = await request(app).post('/').send({
        workstreamId: workstream.id,
        status: longStatus,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Status must be 500 characters or less');
    });

    it('should return 400 when note exceeds 2000 characters', async () => {
      const longNote = 'a'.repeat(2001);

      const response = await request(app).post('/').send({
        workstreamId: workstream.id,
        status: 'Test status',
        note: longNote,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Note must be 2000 characters or less');
    });

    it('should return 404 when workstream does not exist', async () => {
      const response = await request(app).post('/').send({
        workstreamId: '00000000-0000-0000-0000-000000000000',
        status: 'Test status',
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workstream not found');
    });

    it('should return 404 when workstream belongs to another user', async () => {
      // Create another user and workstream
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id, { name: 'Other Project' });
      const workstream2 = await createTestWorkstream(project2.id, { name: 'Other Workstream' });

      const response = await request(app).post('/').send({
        workstreamId: workstream2.id,
        status: 'Test status',
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workstream not found');
    });

    it('should trim status text', async () => {
      const response = await request(app).post('/').send({
        workstreamId: workstream.id,
        status: '  Trimmed Status  ',
      });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('Trimmed Status');
    });
  });

  describe('GET /workstreams/:workstreamId/status-updates', () => {
    it('should return empty array when no status updates exist', async () => {
      const response = await request(app).get(`/workstreams/${workstream.id}/status-updates`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all status updates for workstream', async () => {
      await createTestStatusUpdate(workstream.id, { status: 'First update' });
      await createTestStatusUpdate(workstream.id, { status: 'Second update' });
      await createTestStatusUpdate(workstream.id, { status: 'Third update' });

      const response = await request(app).get(`/workstreams/${workstream.id}/status-updates`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body[0].number).toBeDefined();
      expect(response.body[0].status).toBeDefined();
      expect(response.body[1].status).toBeDefined();
      expect(response.body[2].status).toBeDefined();
    });

    it('should return status updates when the workstream is addressed by public number', async () => {
      const statusUpdate = await createTestStatusUpdate(workstream.id, { status: 'Reference-friendly update' });

      const response = await request(app).get(`/workstreams/${workstream.number}/status-updates`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(statusUpdate.id);
      expect(response.body[0].number).toBe(statusUpdate.number);
    });

    it('should return status updates ordered by createdAt DESC', async () => {
      // Create updates with slight delay to ensure different timestamps
      const update1 = await createTestStatusUpdate(workstream.id, { status: 'First' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const update2 = await createTestStatusUpdate(workstream.id, { status: 'Second' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const update3 = await createTestStatusUpdate(workstream.id, { status: 'Third' });

      const response = await request(app).get(`/workstreams/${workstream.id}/status-updates`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      // Newest first
      expect(response.body[0].id).toBe(update3.id);
      expect(response.body[1].id).toBe(update2.id);
      expect(response.body[2].id).toBe(update1.id);
    });

    it('should return 404 when workstream does not exist', async () => {
      const response = await request(app).get('/workstreams/00000000-0000-0000-0000-000000000000/status-updates');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workstream not found');
    });

    it('should return 404 when workstream belongs to another user', async () => {
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id, { name: 'Other Project' });
      const workstream2 = await createTestWorkstream(project2.id, { name: 'Other Workstream' });
      await createTestStatusUpdate(workstream2.id, { status: 'Other update' });

      const response = await request(app).get(`/workstreams/${workstream2.id}/status-updates`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workstream not found');
    });
  });

  describe('PUT /status-updates/:id', () => {
    it('should update status text', async () => {
      const statusUpdate = await createTestStatusUpdate(workstream.id, { status: 'Old status' });

      const response = await request(app).put(`/${statusUpdate.id}`).send({
        workstreamId: workstream.id,
        status: 'New status',
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('New status');
    });

    it('should update note', async () => {
      const statusUpdate = await createTestStatusUpdate(workstream.id, { 
        status: 'Test status',
        note: 'Old note' 
      });

      const response = await request(app).put(`/${statusUpdate.id}`).send({
        workstreamId: workstream.id,
        note: 'New note',
      });

      expect(response.status).toBe(200);
      expect(response.body.note).toBe('New note');
    });

    it('should update both status and note', async () => {
      const statusUpdate = await createTestStatusUpdate(workstream.id, { 
        status: 'Old status',
        note: 'Old note' 
      });

      const response = await request(app).put(`/${statusUpdate.id}`).send({
        workstreamId: workstream.id,
        status: 'New status',
        note: 'New note',
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('New status');
      expect(response.body.note).toBe('New note');
    });

    it('should clear note by setting to null', async () => {
      const statusUpdate = await createTestStatusUpdate(workstream.id, { 
        status: 'Test status',
        note: 'Some note' 
      });

      const response = await request(app).put(`/${statusUpdate.id}`).send({
        workstreamId: workstream.id,
        note: null,
      });

      expect(response.status).toBe(200);
      expect(response.body.note).toBeNull();
    });

    it('should return 404 when status update does not exist', async () => {
      const response = await request(app)
        .put('/00000000-0000-0000-0000-000000000000')
        .send({
          workstreamId: workstream.id,
          status: 'Updated',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Status update not found');
    });

    it('should return 400 when workstreamId is missing', async () => {
      const statusUpdate = await createTestStatusUpdate(workstream.id);

      const response = await request(app).put(`/${statusUpdate.id}`).send({
        status: 'New status',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Workstream ID is required');
    });

    it('should return 400 when status is empty', async () => {
      const statusUpdate = await createTestStatusUpdate(workstream.id);

      const response = await request(app).put(`/${statusUpdate.id}`).send({
        workstreamId: workstream.id,
        status: '  ',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Status cannot be empty');
    });

    it('should return 400 when status exceeds 500 characters', async () => {
      const statusUpdate = await createTestStatusUpdate(workstream.id);

      const response = await request(app).put(`/${statusUpdate.id}`).send({
        workstreamId: workstream.id,
        status: 'a'.repeat(501),
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Status must be 500 characters or less');
    });

    it('should return 400 when note exceeds 2000 characters', async () => {
      const statusUpdate = await createTestStatusUpdate(workstream.id);

      const response = await request(app).put(`/${statusUpdate.id}`).send({
        workstreamId: workstream.id,
        note: 'a'.repeat(2001),
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Note must be 2000 characters or less');
    });

    it('should return 404 when status update belongs to another user', async () => {
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id, { name: 'Other Project' });
      const workstream2 = await createTestWorkstream(project2.id, { name: 'Other Workstream' });
      const statusUpdate2 = await createTestStatusUpdate(workstream2.id, { status: 'Other status' });

      const response = await request(app).put(`/${statusUpdate2.id}`).send({
        workstreamId: workstream2.id,
        status: 'Hacked!',
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Status update not found');
    });

    it('should trim updated status', async () => {
      const statusUpdate = await createTestStatusUpdate(workstream.id);

      const response = await request(app).put(`/${statusUpdate.id}`).send({
        workstreamId: workstream.id,
        status: '  Trimmed Update  ',
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('Trimmed Update');
    });
  });

  describe('DELETE /status-updates/:id', () => {
    it('should delete a status update', async () => {
      const statusUpdate = await createTestStatusUpdate(workstream.id, { status: 'To be deleted' });

      const response = await request(app).delete(`/${statusUpdate.id}`).send({
        workstreamId: workstream.id,
      });

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      // Verify it's deleted
      const getResponse = await request(app).get(`/workstreams/${workstream.id}/status-updates`);
      expect(getResponse.body.find((su: any) => su.id === statusUpdate.id)).toBeUndefined();
    });

    it('should not reuse public numbers after deleting the highest-numbered status update', async () => {
      const first = await createTestStatusUpdate(workstream.id, { status: 'First numbered update' });
      const second = await createTestStatusUpdate(workstream.id, { status: 'Second numbered update' });

      await request(app).delete(`/${second.id}`).send({ workstreamId: workstream.id }).expect(204);
      const response = await request(app).post('/').send({ workstreamId: workstream.id, status: 'Replacement update' });

      expect(response.status).toBe(201);
      expect(response.body.number).toBeGreaterThan(second.number);
      expect(response.body.number).not.toBe(first.number);
      expect(response.body.number).not.toBe(second.number);
    });

    it('should return 404 when status update does not exist', async () => {
      const response = await request(app)
        .delete('/00000000-0000-0000-0000-000000000000')
        .send({
          workstreamId: workstream.id,
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Status update not found');
    });

    it('should return 400 when workstreamId is missing', async () => {
      const statusUpdate = await createTestStatusUpdate(workstream.id);

      const response = await request(app).delete(`/${statusUpdate.id}`).send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Workstream ID is required');
    });

    it('should not delete status updates from another user', async () => {
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id, { name: 'Other Project' });
      const workstream2 = await createTestWorkstream(project2.id, { name: 'Other Workstream' });
      const statusUpdate2 = await createTestStatusUpdate(workstream2.id, { status: 'Other status' });

      const response = await request(app).delete(`/${statusUpdate2.id}`).send({
        workstreamId: workstream2.id,
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Status update not found');

      // Verify status update still exists
      const { getStatusUpdatesByWorkstream } = await import('../../src/services/statusUpdateService');
      const updates = await getStatusUpdatesByWorkstream(workstream2.id);
      expect(updates.find((su) => su.id === statusUpdate2.id)).toBeDefined();
    });
  });

  describe('Data Isolation', () => {
    it('should not access status updates from another user workstreams', async () => {
      // Create another user with workstream and status updates
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id, { name: 'Other Project' });
      const workstream2 = await createTestWorkstream(project2.id, { name: 'Other Workstream' });
      await createTestStatusUpdate(workstream2.id, { status: 'Other update 1' });
      await createTestStatusUpdate(workstream2.id, { status: 'Other update 2' });

      // Create status updates for current user
      await createTestStatusUpdate(workstream.id, { status: 'My update' });

      const response = await request(app).get(`/workstreams/${workstream.id}/status-updates`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('My update');
    });

    it('should not create status update for other user workstream', async () => {
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id, { name: 'Other Project' });
      const workstream2 = await createTestWorkstream(project2.id, { name: 'Other Workstream' });

      const response = await request(app).post('/').send({
        workstreamId: workstream2.id,
        status: 'Hacked status',
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workstream not found');

      // Verify no status update was created
      const { getStatusUpdatesByWorkstream } = await import('../../src/services/statusUpdateService');
      const updates = await getStatusUpdatesByWorkstream(workstream2.id);
      expect(updates).toHaveLength(0);
    });
  });
});
