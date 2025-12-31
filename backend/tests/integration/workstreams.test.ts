import request from 'supertest';
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
import { createTestApp } from '../helpers/testApp';
import workstreamsRoutes from '../../src/routes/workstreams';

let person: any;
let project: any;
let app: any;

beforeAll(async () => {
  await setupTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
  
  // Create test user and project
  person = await createTestPerson({ email: 'test@example.com', name: 'Test User' });
  project = await createTestProject(person.id, { name: 'Test Project' });
  
  // Create app with authenticated user
  app = createTestApp(workstreamsRoutes, person);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('Workstreams API Integration Tests', () => {
  describe('GET /workstreams', () => {
    it('should return empty array when no workstreams exist', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all workstreams for user project', async () => {
      await createTestWorkstream(project.id, { name: 'Workstream 1' });
      await createTestWorkstream(project.id, { name: 'Workstream 2' });

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBeDefined();
      expect(response.body[1].name).toBeDefined();
    });

    it('should filter active workstreams only', async () => {
      await createTestWorkstream(project.id, { name: 'Active', state: 'active' });
      await createTestWorkstream(project.id, { name: 'Closed', state: 'closed' });

      const response = await request(app).get('/?state=active');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].state).toBe('active');
    });

    it('should filter closed workstreams only', async () => {
      await createTestWorkstream(project.id, { name: 'Active', state: 'active' });
      await createTestWorkstream(project.id, { name: 'Closed', state: 'closed' });

      const response = await request(app).get('/?state=closed');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].state).toBe('closed');
    });

    it('should include tag information in workstream', async () => {
      const tag = await createTestTag(project.id, { name: 'urgent', color: '#FF0000' });
      await createTestWorkstream(project.id, { name: 'Tagged', tagId: tag.id });

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body[0].tag).toBeDefined();
      expect(response.body[0].tag.name).toBe('urgent');
      expect(response.body[0].tag.color).toBe('#FF0000');
    });

    it('should include latest status update', async () => {
      const workstream = await createTestWorkstream(project.id);
      await createTestStatusUpdate(workstream.id, { status: 'Latest status' });

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body[0].latestStatus).toBeDefined();
      expect(response.body[0].latestStatus.status).toBe('Latest status');
    });
  });

  describe('GET /workstreams/:id', () => {
    it('should return workstream by ID', async () => {
      const workstream = await createTestWorkstream(project.id, { name: 'Test Workstream' });

      const response = await request(app).get(`/${workstream.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(workstream.id);
      expect(response.body.name).toBe('Test Workstream');
    });

    it('should return 404 when workstream does not exist', async () => {
      const response = await request(app).get('/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Workstream not found' });
    });
  });

  describe('POST /workstreams', () => {
    it('should create new workstream with required fields only', async () => {
      const response = await request(app).post('/').send({
        name: 'New Workstream',
      });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('New Workstream');
      expect(response.body.state).toBe('active');
      expect(response.body.projectId).toBe(project.id);
    });

    it('should create workstream with all optional fields', async () => {
      const tag = await createTestTag(project.id);

      const response = await request(app).post('/').send({
        name: 'Full Workstream',
        tagId: tag.id,
        context: 'Background context',
        initialStatus: 'Starting work',
        initialNote: 'First note',
      });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Full Workstream');
      expect(response.body.tagId).toBe(tag.id);
      expect(response.body.context).toBe('Background context');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app).post('/').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Workstream name is required');
    });

    it('should return 400 when name is empty', async () => {
      const response = await request(app).post('/').send({ name: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Workstream name is required');
    });

    it('should return 400 when name exceeds 200 characters', async () => {
      const longName = 'a'.repeat(201);

      const response = await request(app).post('/').send({ name: longName });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Workstream name must be 200 characters or less');
    });

    it('should return 400 when context exceeds 2000 characters', async () => {
      const longContext = 'a'.repeat(2001);

      const response = await request(app).post('/').send({
        name: 'Test',
        context: longContext,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Context must be 2000 characters or less');
    });

    it('should return 400 when initialStatus exceeds 500 characters', async () => {
      const longStatus = 'a'.repeat(501);

      const response = await request(app).post('/').send({
        name: 'Test',
        initialStatus: longStatus,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Initial status must be 500 characters or less');
    });

    it('should return 400 when initialNote exceeds 2000 characters', async () => {
      const longNote = 'a'.repeat(2001);

      const response = await request(app).post('/').send({
        name: 'Test',
        initialNote: longNote,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Initial note must be 2000 characters or less');
    });

    it('should trim workstream name', async () => {
      const response = await request(app).post('/').send({
        name: '  Trimmed Name  ',
      });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Trimmed Name');
    });
  });

  describe('PUT /workstreams/:id', () => {
    it('should update workstream name', async () => {
      const workstream = await createTestWorkstream(project.id, { name: 'Old Name' });

      const response = await request(app).put(`/${workstream.id}`).send({
        name: 'New Name',
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
    });

    it('should update workstream tag', async () => {
      const tag = await createTestTag(project.id);
      const workstream = await createTestWorkstream(project.id);

      const response = await request(app).put(`/${workstream.id}`).send({
        tagId: tag.id,
      });

      expect(response.status).toBe(200);
      expect(response.body.tagId).toBe(tag.id);
    });

    it('should update workstream context', async () => {
      const workstream = await createTestWorkstream(project.id);

      const response = await request(app).put(`/${workstream.id}`).send({
        context: 'Updated context',
      });

      expect(response.status).toBe(200);
      expect(response.body.context).toBe('Updated context');
    });

    it('should clear tag by setting to null', async () => {
      const tag = await createTestTag(project.id);
      const workstream = await createTestWorkstream(project.id, { tagId: tag.id });

      const response = await request(app).put(`/${workstream.id}`).send({
        tagId: null,
      });

      expect(response.status).toBe(200);
      expect(response.body.tagId).toBeNull();
    });

    it('should return 404 when workstream does not exist', async () => {
      const response = await request(app)
        .put('/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workstream not found');
    });

    it('should return 400 when name is empty', async () => {
      const workstream = await createTestWorkstream(project.id);

      const response = await request(app).put(`/${workstream.id}`).send({
        name: '  ',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Workstream name cannot be empty');
    });

    it('should return 400 when name exceeds 200 characters', async () => {
      const workstream = await createTestWorkstream(project.id);

      const response = await request(app).put(`/${workstream.id}`).send({
        name: 'a'.repeat(201),
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Workstream name must be 200 characters or less');
    });

    it('should trim updated name', async () => {
      const workstream = await createTestWorkstream(project.id);

      const response = await request(app).put(`/${workstream.id}`).send({
        name: '  Trimmed Update  ',
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Trimmed Update');
    });
  });

  describe('PUT /workstreams/:id/close', () => {
    it('should close an active workstream', async () => {
      const workstream = await createTestWorkstream(project.id, { state: 'active' });

      const response = await request(app).put(`/${workstream.id}/close`);

      expect(response.status).toBe(200);
      expect(response.body.state).toBe('closed');
      expect(response.body.closedAt).toBeDefined();
    });

    it('should return 404 when workstream does not exist', async () => {
      const response = await request(app).put('/00000000-0000-0000-0000-000000000000/close');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workstream not found');
    });
  });

  describe('PUT /workstreams/:id/reopen', () => {
    it('should reopen a closed workstream', async () => {
      const { prisma } = await import('../helpers/testDb');
      const workstream = await createTestWorkstream(project.id, { state: 'active' });
      
      // Close it first
      await prisma.workstream.update({
        where: { id: workstream.id },
        data: { state: 'closed', closedAt: new Date() },
      });

      const response = await request(app).put(`/${workstream.id}/reopen`);

      expect(response.status).toBe(200);
      expect(response.body.state).toBe('active');
      expect(response.body.closedAt).toBeNull();
    });

    it('should return 404 when workstream does not exist', async () => {
      const response = await request(app).put('/00000000-0000-0000-0000-000000000000/reopen');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workstream not found');
    });
  });

  describe('DELETE /workstreams/:id', () => {
    it('should delete a workstream', async () => {
      const workstream = await createTestWorkstream(project.id);

      const response = await request(app).delete(`/${workstream.id}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      // Verify it's deleted
      const getResponse = await request(app).get(`/${workstream.id}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when workstream does not exist', async () => {
      const response = await request(app).delete('/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workstream not found');
    });
  });

  describe('Data Isolation', () => {
    it('should not access workstreams from another user', async () => {
      // Create another user and project
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id);
      const workstream2 = await createTestWorkstream(project2.id, { name: 'Other User WS' });

      // Try to access with first user's credentials
      const response = await request(app).get(`/${workstream2.id}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workstream not found');
    });

    it('should not update workstreams from another user', async () => {
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id);
      const workstream2 = await createTestWorkstream(project2.id);

      const response = await request(app)
        .put(`/${workstream2.id}`)
        .send({ name: 'Hacked!' });

      expect(response.status).toBe(404);
    });

    it('should not delete workstreams from another user', async () => {
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id);
      const workstream2 = await createTestWorkstream(project2.id);

      const response = await request(app).delete(`/${workstream2.id}`);

      expect(response.status).toBe(404);

      // Verify workstream still exists
      const { getWorkstreamById } = await import('../../src/services/workstreamService');
      const stillExists = await getWorkstreamById(workstream2.id, project2.id);
      expect(stillExists).toBeDefined();
    });
  });
});
