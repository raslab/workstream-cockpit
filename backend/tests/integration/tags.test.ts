import request from 'supertest';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  createTestProject,
  createTestTag,
  createTestWorkstream,
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
  describe('GET /tags', () => {
    it('should return empty array when no tags exist', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all tags for user project', async () => {
      await createTestTag(project.id, { name: 'urgent', color: '#FF0000' });
      await createTestTag(project.id, { name: 'important', color: '#00FF00' });

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBeDefined();
      expect(response.body[1].name).toBeDefined();
    });

    it('should return tags ordered by sortOrder ascending', async () => {
      await createTestTag(project.id, { name: 'third', color: '#FF0000', sortOrder: 2 });
      await createTestTag(project.id, { name: 'first', color: '#00FF00', sortOrder: 0 });
      await createTestTag(project.id, { name: 'second', color: '#0000FF', sortOrder: 1 });

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body[0].name).toBe('first');
      expect(response.body[1].name).toBe('second');
      expect(response.body[2].name).toBe('third');
    });

    it('should include emoji when present', async () => {
      await createTestTag(project.id, { name: 'emoji-tag', color: '#FF0000' });
      const { prisma } = await import('../helpers/testDb');
      const tag = await createTestTag(project.id, { name: 'emoji-tag-2', color: '#00FF00' });
      await prisma.tag.update({
        where: { id: tag.id },
        data: { emoji: '🔥' },
      });

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      const emojiTag = response.body.find((t: any) => t.name === 'emoji-tag-2');
      expect(emojiTag.emoji).toBe('🔥');
    });
  });

  describe('POST /tags', () => {
    it('should create new tag with required fields only', async () => {
      const response = await request(app).post('/').send({
        name: 'New Tag',
        color: '#FF5733',
      });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('New Tag');
      expect(response.body.color).toBe('#FF5733');
      expect(response.body.projectId).toBe(project.id);
      expect(response.body.sortOrder).toBeDefined();
    });

    it('should create tag with emoji', async () => {
      const response = await request(app).post('/').send({
        name: 'Emoji Tag',
        color: '#00FF00',
        emoji: '🎯',
      });

      expect(response.status).toBe(201);
      expect(response.body.emoji).toBe('🎯');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app).post('/').send({
        color: '#FF0000',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tag name is required');
    });

    it('should return 400 when name is empty', async () => {
      const response = await request(app).post('/').send({
        name: '   ',
        color: '#FF0000',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tag name is required');
    });

    it('should return 400 when color is missing', async () => {
      const response = await request(app).post('/').send({
        name: 'Test Tag',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tag color is required');
    });

    it('should return 400 when color is invalid format', async () => {
      const invalidColors = ['red', '#GGG', '#12345', 'FF0000', '#GGGGGG'];

      for (const color of invalidColors) {
        const response = await request(app).post('/').send({
          name: 'Test Tag',
          color,
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Tag color must be a valid hex color (e.g., #FF5733)');
      }
    });

    it('should return 400 when name exceeds 100 characters', async () => {
      const longName = 'a'.repeat(101);

      const response = await request(app).post('/').send({
        name: longName,
        color: '#FF0000',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tag name must be 100 characters or less');
    });

    it('should trim tag name', async () => {
      const response = await request(app).post('/').send({
        name: '  Trimmed Tag  ',
        color: '#FF0000',
      });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Trimmed Tag');
    });

    it('should default sortOrder to 0 when not specified', async () => {
      const response = await request(app).post('/').send({
        name: 'Default Order Tag',
        color: '#0000FF',
      });

      expect(response.status).toBe(201);
      expect(response.body.sortOrder).toBe(0);
    });

    it('should convert color to uppercase', async () => {
      const response = await request(app).post('/').send({
        name: 'Test Tag',
        color: '#ff5733',
      });

      expect(response.status).toBe(201);
      expect(response.body.color).toBe('#FF5733');
    });
  });

  describe('PUT /tags/reorder', () => {
    it('should reorder tags with valid tag IDs', async () => {
      const tag1 = await createTestTag(project.id, { name: 'First', color: '#FF0000', sortOrder: 0 });
      const tag2 = await createTestTag(project.id, { name: 'Second', color: '#00FF00', sortOrder: 1 });
      const tag3 = await createTestTag(project.id, { name: 'Third', color: '#0000FF', sortOrder: 2 });

      const response = await request(app).put('/reorder').send({
        tagIds: [tag3.id, tag1.id, tag2.id],
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      
      // Verify new order
      const tag1Updated = response.body.find((t: any) => t.id === tag1.id);
      const tag2Updated = response.body.find((t: any) => t.id === tag2.id);
      const tag3Updated = response.body.find((t: any) => t.id === tag3.id);
      
      expect(tag3Updated.sortOrder).toBe(0);
      expect(tag1Updated.sortOrder).toBe(1);
      expect(tag2Updated.sortOrder).toBe(2);
    });

    it('should return 400 when tagIds is missing', async () => {
      const response = await request(app).put('/reorder').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tag IDs array is required');
    });

    it('should return 400 when tagIds is not an array', async () => {
      const response = await request(app).put('/reorder').send({
        tagIds: 'not-an-array',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tag IDs array is required');
    });

    it('should return 400 when tagIds is empty array', async () => {
      const response = await request(app).put('/reorder').send({
        tagIds: [],
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tag IDs array is required');
    });

    it('should return 404 when tag ID does not exist', async () => {
      const response = await request(app).put('/reorder').send({
        tagIds: ['00000000-0000-0000-0000-000000000000'],
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tag not found');
    });

    it('should return 404 when trying to reorder another user tags', async () => {
      // Create another user and their tags
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id, { name: 'Other Project' });
      const tag1 = await createTestTag(project2.id, { name: 'Other Tag 1', color: '#FF0000' });
      const tag2 = await createTestTag(project2.id, { name: 'Other Tag 2', color: '#00FF00' });

      const response = await request(app).put('/reorder').send({
        tagIds: [tag2.id, tag1.id],
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tag not found');
    });
  });

  describe('PUT /tags/:id', () => {
    it('should update tag name', async () => {
      const tag = await createTestTag(project.id, { name: 'Old Name', color: '#FF0000' });

      const response = await request(app).put(`/${tag.id}`).send({
        name: 'New Name',
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
      expect(response.body.color).toBe('#FF0000'); // Unchanged
    });

    it('should update tag color', async () => {
      const tag = await createTestTag(project.id, { name: 'Test Tag', color: '#FF0000' });

      const response = await request(app).put(`/${tag.id}`).send({
        color: '#00FF00',
      });

      expect(response.status).toBe(200);
      expect(response.body.color).toBe('#00FF00');
      expect(response.body.name).toBe('Test Tag'); // Unchanged
    });

    it('should update tag emoji', async () => {
      const tag = await createTestTag(project.id, { name: 'Test Tag', color: '#FF0000' });

      const response = await request(app).put(`/${tag.id}`).send({
        emoji: '🔥',
      });

      expect(response.status).toBe(200);
      expect(response.body.emoji).toBe('🔥');
    });

    it('should clear emoji by setting to null', async () => {
      const { prisma } = await import('../helpers/testDb');
      const tag = await createTestTag(project.id, { name: 'Test Tag', color: '#FF0000' });
      await prisma.tag.update({
        where: { id: tag.id },
        data: { emoji: '🔥' },
      });

      const response = await request(app).put(`/${tag.id}`).send({
        emoji: null,
      });

      expect(response.status).toBe(200);
      expect(response.body.emoji).toBeNull();
    });

    it('should update multiple fields at once', async () => {
      const tag = await createTestTag(project.id, { name: 'Old Name', color: '#FF0000' });

      const response = await request(app).put(`/${tag.id}`).send({
        name: 'New Name',
        color: '#00FF00',
        emoji: '🎯',
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
      expect(response.body.color).toBe('#00FF00');
      expect(response.body.emoji).toBe('🎯');
    });

    it('should return 404 when tag does not exist', async () => {
      const response = await request(app)
        .put('/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tag not found');
    });

    it('should return 400 when name is empty', async () => {
      const tag = await createTestTag(project.id, { name: 'Test Tag', color: '#FF0000' });

      const response = await request(app).put(`/${tag.id}`).send({
        name: '  ',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tag name cannot be empty');
    });

    it('should return 400 when color is invalid', async () => {
      const tag = await createTestTag(project.id, { name: 'Test Tag', color: '#FF0000' });

      const response = await request(app).put(`/${tag.id}`).send({
        color: 'invalid',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tag color must be a valid hex color (e.g., #FF5733)');
    });

    it('should trim updated name', async () => {
      const tag = await createTestTag(project.id, { name: 'Test Tag', color: '#FF0000' });

      const response = await request(app).put(`/${tag.id}`).send({
        name: '  Trimmed Name  ',
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Trimmed Name');
    });

    it('should convert updated color to uppercase', async () => {
      const tag = await createTestTag(project.id, { name: 'Test Tag', color: '#FF0000' });

      const response = await request(app).put(`/${tag.id}`).send({
        color: '#aabbcc',
      });

      expect(response.status).toBe(200);
      expect(response.body.color).toBe('#AABBCC');
    });
  });

  describe('DELETE /tags/:id', () => {
    it('should delete a tag', async () => {
      const tag = await createTestTag(project.id, { name: 'Test Tag', color: '#FF0000' });

      const response = await request(app).delete(`/${tag.id}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      // Verify it's deleted
      const getResponse = await request(app).get('/');
      expect(getResponse.body.find((t: any) => t.id === tag.id)).toBeUndefined();
    });

    it('should return 404 when tag does not exist', async () => {
      const response = await request(app).delete('/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tag not found');
    });

    it('should clear tagId from workstreams when tag deleted', async () => {
      const tag = await createTestTag(project.id, { name: 'Test Tag', color: '#FF0000' });
      const workstream = await createTestWorkstream(project.id, { 
        name: 'Test Workstream',
        tagId: tag.id 
      });

      const response = await request(app).delete(`/${tag.id}`);

      expect(response.status).toBe(204);

      // Verify workstream.tagId is now null
      const { getWorkstreamById } = await import('../../src/services/workstreamService');
      const updatedWorkstream = await getWorkstreamById(workstream.id, project.id);
      expect(updatedWorkstream?.tagId).toBeNull();
    });

    it('should not delete tags from another user', async () => {
      // Create another user and their tag
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id, { name: 'Other Project' });
      const tag2 = await createTestTag(project2.id, { name: 'Other Tag', color: '#FF0000' });

      const response = await request(app).delete(`/${tag2.id}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tag not found');

      // Verify tag still exists
      const { getTagsByProjectId } = await import('../../src/services/tagService');
      const tags = await getTagsByProjectId(project2.id);
      expect(tags.find((t) => t.id === tag2.id)).toBeDefined();
    });
  });

  describe('Data Isolation', () => {
    it('should not access tags from another user project', async () => {
      // Create another user with tags
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id, { name: 'Other Project' });
      await createTestTag(project2.id, { name: 'Other Tag 1', color: '#FF0000' });
      await createTestTag(project2.id, { name: 'Other Tag 2', color: '#00FF00' });

      // Create tags for current user
      await createTestTag(project.id, { name: 'My Tag', color: '#0000FF' });

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('My Tag');
    });

    it('should not update tags from another user', async () => {
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id, { name: 'Other Project' });
      const tag2 = await createTestTag(project2.id, { name: 'Other Tag', color: '#FF0000' });

      const response = await request(app).put(`/${tag2.id}`).send({
        name: 'Hacked!',
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tag not found');

      // Verify tag unchanged
      const { getTagsByProjectId } = await import('../../src/services/tagService');
      const tags = await getTagsByProjectId(project2.id);
      const unchangedTag = tags.find((t) => t.id === tag2.id);
      expect(unchangedTag?.name).toBe('Other Tag');
    });
  });
});
