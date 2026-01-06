import request from 'supertest';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  createTestProject,
} from '../helpers/testDb';
import { createTestApp } from '../helpers/testApp';
import tagsRoutes from '../../src/routes/tags';

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
  app = createTestApp(tagsRoutes, person);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('Tags API Integration Tests', () => {
  // Helper function to create a tag
  const createTag = async (name: string, color: string = '#1DA1F2') => {
    return await request(app)
      .post('/')
      .send({ name, color });
  };

  describe('POST /', () => {
    it('should create tag with valid data', async () => {
      const response = await createTag('backend', '#1DA1F2');

      expect(response.status).toBe(201);
      expect(response.body.tag).toMatchObject({
        name: 'backend',
        color: '#1DA1F2',
        projectId: project.id,
      });
      expect(response.body.tag.id).toBeDefined();
      expect(response.body.tag.createdAt).toBeDefined();
    });

    it('should normalize tag name to lowercase', async () => {
      const response = await createTag('Backend');

      expect(response.status).toBe(201);
      expect(response.body.tag.name).toBe('backend');
    });

    it('should accept tags with hyphens and underscores', async () => {
      const response1 = await createTag('backend-team');
      const response2 = await createTag('api_v2');

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
    });

    it('should reject duplicate tag name (case-insensitive)', async () => {
      await createTag('backend');
      const response = await createTag('Backend');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should reject invalid tag name with spaces', async () => {
      const response = await createTag('my tag');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid tag name');
    });

    it('should reject invalid tag name with special chars', async () => {
      const response = await createTag('my@tag');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid tag name');
    });

    it('should reject empty tag name', async () => {
      const response = await createTag('');

      expect(response.status).toBe(400);
    });

    it('should reject invalid color format (not hex)', async () => {
      const response = await createTag('backend', 'blue');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid color');
    });

    it('should reject invalid color format (short hex)', async () => {
      const response = await createTag('backend', '#1DA');

      expect(response.status).toBe(400);
    });

    it('should reject missing name', async () => {
      const response = await request(app)
        .post('/')
        .send({ color: '#1DA1F2' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should reject missing color', async () => {
      const response = await request(app)
        .post('/')
        .send({ name: 'backend' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });
  });

  describe('GET /', () => {
    it('should return all tags for project', async () => {
      await createTag('backend', '#1DA1F2');
      await createTag('frontend', '#10B981');

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.tags).toHaveLength(2);
      expect(response.body.tags[0].name).toBe('backend');
      expect(response.body.tags[1].name).toBe('frontend');
    });

    it('should return empty array when no tags exist', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.tags).toEqual([]);
    });
  });

  describe('PATCH /:id', () => {
    it('should update tag name', async () => {
      const createResponse = await createTag('backend');
      const tagId = createResponse.body.tag.id;

      const response = await request(app)
        .patch(`/${tagId}`)
        .send({ name: 'backend-team' });

      expect(response.status).toBe(200);
      expect(response.body.tag.name).toBe('backend-team');
    });

    it('should update tag color', async () => {
      const createResponse = await createTag('backend');
      const tagId = createResponse.body.tag.id;

      const response = await request(app)
        .patch(`/${tagId}`)
        .send({ color: '#FF0000' });

      expect(response.status).toBe(200);
      expect(response.body.tag.color).toBe('#FF0000');
    });

    it('should update both name and color', async () => {
      const createResponse = await createTag('backend');
      const tagId = createResponse.body.tag.id;

      const response = await request(app)
        .patch(`/${tagId}`)
        .send({ name: 'frontend', color: '#00FF00' });

      expect(response.status).toBe(200);
      expect(response.body.tag.name).toBe('frontend');
      expect(response.body.tag.color).toBe('#00FF00');
    });

    it('should reject duplicate name', async () => {
      await createTag('backend');
      const createResponse = await createTag('frontend');
      const tagId = createResponse.body.tag.id;

      const response = await request(app)
        .patch(`/${tagId}`)
        .send({ name: 'backend' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await request(app)
        .patch('/non-existent-id')
        .send({ name: 'backend' });

      expect(response.status).toBe(404);
    });

    it('should return 400 when no fields provided', async () => {
      const createResponse = await createTag('backend');
      const tagId = createResponse.body.tag.id;

      const response = await request(app)
        .patch(`/${tagId}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /:id', () => {
    it('should delete tag successfully', async () => {
      const createResponse = await createTag('backend');
      const tagId = createResponse.body.tag.id;

      const response = await request(app).delete(`/${tagId}`);

      expect(response.status).toBe(204);
    });

    it('should not find tag after delete', async () => {
      const createResponse = await createTag('backend');
      const tagId = createResponse.body.tag.id;

      await request(app).delete(`/${tagId}`);

      // Verify tag is gone
      const getResponse = await request(app).get('/');
      expect(getResponse.body.tags).toHaveLength(0);
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await request(app).delete('/non-existent-id');

      expect(response.status).toBe(404);
    });
  });
});
