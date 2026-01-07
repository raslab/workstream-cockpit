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
  const createTag = async (displayName: string, color: string = '#1DA1F2') => {
    return await request(app)
      .post('/')
      .send({ displayName, color });
  };

  describe('POST /', () => {
    it('should create tag with valid data', async () => {
      const response = await createTag('Backend');

      expect(response.status).toBe(201);
      expect(response.body.tag).toMatchObject({
        name: 'backend',  // Tag ID should be lowercase
        displayName: 'Backend',  // Display name as provided
        color: '#1DA1F2',
        projectId: project.id,
      });
      expect(response.body.tag.id).toBeDefined();
      expect(response.body.tag.createdAt).toBeDefined();
      expect(response.body.message).toContain('Tag created');
    });

    it('should generate tag ID from display name', async () => {
      const response = await createTag('Backend Team');

      expect(response.status).toBe(201);
      expect(response.body.tag.name).toBe('backend_team');  // ID with underscores
      expect(response.body.tag.displayName).toBe('Backend Team');  // Original display name
    });

    it('should accept tags with hyphens and underscores in display name', async () => {
      const response1 = await createTag('Backend-Team');
      const response2 = await createTag('API_v2');

      expect(response1.status).toBe(201);
      expect(response1.body.tag.name).toBe('backend-team');  // Lowercase ID
      expect(response2.status).toBe(201);
      expect(response2.body.tag.name).toBe('api_v2');  // Lowercase ID
    });

    it('should reject duplicate tag ID (case-insensitive)', async () => {
      await createTag('Backend Team');
      const response = await createTag('backend team');  // Same ID generated

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should accept display names with spaces', async () => {
      const response = await createTag('Tech Leads');

      expect(response.status).toBe(201);
      expect(response.body.tag.name).toBe('tech_leads');  // ID with underscores
      expect(response.body.tag.displayName).toBe('Tech Leads');  // Original with spaces
    });
    
    it('should accept display names with hyphens', async () => {
      const response = await createTag('Tech-Leads');

      expect(response.status).toBe(201);
      expect(response.body.tag.name).toBe('tech-leads');  // Hyphens preserved in ID
      expect(response.body.tag.displayName).toBe('Tech-Leads');
    });

    it('should reject display names starting with special chars', async () => {
      const response = await createTag('-Team');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid');
    });

    it('should reject display names ending with special chars', async () => {
      const response = await createTag('Team-');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid');
    });

    it('should reject empty display name', async () => {
      const response = await createTag('');

      expect(response.status).toBe(400);
    });

    it('should reject invalid color format (not hex)', async () => {
      const response = await createTag('Backend', 'blue');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid color');
    });

    it('should reject invalid color format (short hex)', async () => {
      const response = await createTag('Backend', '#1DA');

      expect(response.status).toBe(400);
    });

    it('should reject missing displayName', async () => {
      const response = await request(app)
        .post('/')
        .send({ color: '#1DA1F2' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should reject missing color', async () => {
      const response = await request(app)
        .post('/')
        .send({ displayName: 'Backend' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });
  });

  describe('GET /', () => {
    it('should return all tags for project', async () => {
      await createTag('Backend', '#1DA1F2');
      await createTag('Frontend', '#10B981');

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.tags).toHaveLength(2);
      expect(response.body.tags[0].name).toBe('backend');  // Tag IDs
      expect(response.body.tags[0].displayName).toBe('Backend');  // Display names
      expect(response.body.tags[1].name).toBe('frontend');
      expect(response.body.tags[1].displayName).toBe('Frontend');
    });

    it('should return empty array when no tags exist', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.tags).toEqual([]);
    });
  });

  describe('PATCH /:id', () => {
    it('should update tag display name', async () => {
      const createResponse = await createTag('Backend');
      const tagId = createResponse.body.tag.id;

      const response = await request(app)
        .patch(`/${tagId}`)
        .send({ displayName: 'Backend Team' });

      expect(response.status).toBe(200);
      expect(response.body.tag.name).toBe('backend_team');  // Updated ID
      expect(response.body.tag.displayName).toBe('Backend Team');  // Updated display name
    });

    it('should update tag color', async () => {
      const createResponse = await createTag('Backend');
      const tagId = createResponse.body.tag.id;

      const response = await request(app)
        .patch(`/${tagId}`)
        .send({ color: '#FF0000' });

      expect(response.status).toBe(200);
      expect(response.body.tag.color).toBe('#FF0000');
    });

    it('should update both display name and color', async () => {
      const createResponse = await createTag('Backend');
      const tagId = createResponse.body.tag.id;

      const response = await request(app)
        .patch(`/${tagId}`)
        .send({ displayName: 'Frontend Team', color: '#00FF00' });

      expect(response.status).toBe(200);
      expect(response.body.tag.name).toBe('frontend_team');  // New ID
      expect(response.body.tag.displayName).toBe('Frontend Team');  // New display name
      expect(response.body.tag.color).toBe('#00FF00');
    });

    it('should reject duplicate tag ID', async () => {
      await createTag('Backend');
      const createResponse = await createTag('Frontend');
      const tagId = createResponse.body.tag.id;

      const response = await request(app)
        .patch(`/${tagId}`)
        .send({ displayName: 'Backend' });  // Will generate same ID as existing tag

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await request(app)
        .patch('/non-existent-id')
        .send({ displayName: 'Backend' });

      expect(response.status).toBe(404);
    });

    it('should return 400 when no fields provided', async () => {
      const createResponse = await createTag('Backend');
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
