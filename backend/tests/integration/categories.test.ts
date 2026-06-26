import request from 'supertest';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  createTestProject,
  createTestCategory,
  createTestWorkstream,
} from '../helpers/testDb';
import { createTestApp } from '../helpers/testApp';
import categoriesRoutes from '../../src/routes/categories';

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
  app = createTestApp(categoriesRoutes, person);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('Categorys API Integration Tests', () => {
  describe('GET /categories', () => {
    it('should return empty array when no categories exist', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all categories for user project', async () => {
      await createTestCategory(project.id, { name: 'urgent', color: '#FF0000' });
      await createTestCategory(project.id, { name: 'important', color: '#00FF00' });

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBeDefined();
      expect(response.body[1].name).toBeDefined();
    });

    it('should return categories ordered by sortOrder ascending', async () => {
      await createTestCategory(project.id, { name: 'third', color: '#FF0000', sortOrder: 2 });
      await createTestCategory(project.id, { name: 'first', color: '#00FF00', sortOrder: 0 });
      await createTestCategory(project.id, { name: 'second', color: '#0000FF', sortOrder: 1 });

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body[0].name).toBe('first');
      expect(response.body[1].name).toBe('second');
      expect(response.body[2].name).toBe('third');
    });

    it('should include emoji when present', async () => {
      await createTestCategory(project.id, { name: 'emoji-category', color: '#FF0000' });
      const { prisma } = await import('../helpers/testDb');
      const category = await createTestCategory(project.id, {
        name: 'emoji-category-2',
        color: '#00FF00',
      });
      await prisma.category.update({
        where: { id: category.id },
        data: { emoji: '🔥' },
      });

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      const emojiCategory = response.body.find((t: any) => t.name === 'emoji-category-2');
      expect(emojiCategory.emoji).toBe('🔥');
    });
  });

  describe('POST /categories', () => {
    it('should create new category with required fields only', async () => {
      const response = await request(app).post('/').send({
        name: 'New Category',
        color: '#FF5733',
      });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('New Category');
      expect(response.body.color).toBe('#FF5733');
      expect(response.body.projectId).toBe(project.id);
      expect(response.body.sortOrder).toBeDefined();
    });

    it('should create category with emoji', async () => {
      const response = await request(app).post('/').send({
        name: 'Emoji Category',
        color: '#00FF00',
        emoji: '🎯',
      });

      expect(response.status).toBe(201);
      expect(response.body.emoji).toBe('🎯');
    });

    it('should create category with a human-readable description', async () => {
      const response = await request(app).post('/').send({
        name: 'Process',
        color: '#00FF00',
        description: 'Recurring operational work that needs periodic attention.',
      });

      expect(response.status).toBe(201);
      expect(response.body.description).toBe(
        'Recurring operational work that needs periodic attention.',
      );

      const getResponse = await request(app).get('/');
      const createdCategory = getResponse.body.find(
        (category: any) => category.id === response.body.id,
      );
      expect(createdCategory.description).toBe(
        'Recurring operational work that needs periodic attention.',
      );
    });

    it('should default category description to empty for existing create payloads', async () => {
      const response = await request(app).post('/').send({
        name: 'No Description',
        color: '#FF5733',
      });

      expect(response.status).toBe(201);
      expect(response.body.description).toBe('');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app).post('/').send({
        color: '#FF0000',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Category name is required');
    });

    it('should return 400 when name is empty', async () => {
      const response = await request(app).post('/').send({
        name: '   ',
        color: '#FF0000',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Category name is required');
    });

    it('should return 400 when color is missing', async () => {
      const response = await request(app).post('/').send({
        name: 'Test Category',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Category color is required');
    });

    it('should return 400 when color is invalid format', async () => {
      const invalidColors = ['red', '#GGG', '#12345', 'FF0000', '#GGGGGG'];

      for (const color of invalidColors) {
        const response = await request(app).post('/').send({
          name: 'Test Category',
          color,
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(
          'Category color must be a valid hex color (e.g., #FF5733)',
        );
      }
    });

    it('should return 400 when name exceeds 100 characters', async () => {
      const longName = 'a'.repeat(101);

      const response = await request(app).post('/').send({
        name: longName,
        color: '#FF0000',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Category name must be 100 characters or less');
    });

    it('should trim category name', async () => {
      const response = await request(app).post('/').send({
        name: '  Trimmed Category  ',
        color: '#FF0000',
      });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Trimmed Category');
    });

    it('should default sortOrder to 0 when not specified', async () => {
      const response = await request(app).post('/').send({
        name: 'Default Order Category',
        color: '#0000FF',
      });

      expect(response.status).toBe(201);
      expect(response.body.sortOrder).toBe(0);
    });

    it('should convert color to uppercase', async () => {
      const response = await request(app).post('/').send({
        name: 'Test Category',
        color: '#ff5733',
      });

      expect(response.status).toBe(201);
      expect(response.body.color).toBe('#FF5733');
    });
  });

  describe('PUT /categories/reorder', () => {
    it('should reorder categories with valid category IDs', async () => {
      const category1 = await createTestCategory(project.id, {
        name: 'First',
        color: '#FF0000',
        sortOrder: 0,
      });
      const category2 = await createTestCategory(project.id, {
        name: 'Second',
        color: '#00FF00',
        sortOrder: 1,
      });
      const category3 = await createTestCategory(project.id, {
        name: 'Third',
        color: '#0000FF',
        sortOrder: 2,
      });

      const response = await request(app)
        .put('/reorder')
        .send({
          categoryIds: [category3.id, category1.id, category2.id],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);

      // Verify new order
      const category1Updated = response.body.find((t: any) => t.id === category1.id);
      const category2Updated = response.body.find((t: any) => t.id === category2.id);
      const category3Updated = response.body.find((t: any) => t.id === category3.id);

      expect(category3Updated.sortOrder).toBe(0);
      expect(category1Updated.sortOrder).toBe(1);
      expect(category2Updated.sortOrder).toBe(2);
    });

    it('should return 400 when categoryIds is missing', async () => {
      const response = await request(app).put('/reorder').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Category IDs array is required');
    });

    it('should return 400 when categoryIds is not an array', async () => {
      const response = await request(app).put('/reorder').send({
        categoryIds: 'not-an-array',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Category IDs array is required');
    });

    it('should return 400 when categoryIds is empty array', async () => {
      const response = await request(app).put('/reorder').send({
        categoryIds: [],
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Category IDs array is required');
    });

    it('should return 404 when category ID does not exist', async () => {
      const response = await request(app)
        .put('/reorder')
        .send({
          categoryIds: ['00000000-0000-0000-0000-000000000000'],
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Category not found');
    });

    it('should return 404 when trying to reorder another user categories', async () => {
      // Create another user and their categories
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id, { name: 'Other Project' });
      const category1 = await createTestCategory(project2.id, {
        name: 'Other Category 1',
        color: '#FF0000',
      });
      const category2 = await createTestCategory(project2.id, {
        name: 'Other Category 2',
        color: '#00FF00',
      });

      const response = await request(app)
        .put('/reorder')
        .send({
          categoryIds: [category2.id, category1.id],
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Category not found');
    });
  });

  describe('PUT /categories/:id', () => {
    it('should update category name', async () => {
      const category = await createTestCategory(project.id, { name: 'Old Name', color: '#FF0000' });

      const response = await request(app).put(`/${category.id}`).send({
        name: 'New Name',
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
      expect(response.body.color).toBe('#FF0000'); // Unchanged
    });

    it('should update category color', async () => {
      const category = await createTestCategory(project.id, {
        name: 'Test Category',
        color: '#FF0000',
      });

      const response = await request(app).put(`/${category.id}`).send({
        color: '#00FF00',
      });

      expect(response.status).toBe(200);
      expect(response.body.color).toBe('#00FF00');
      expect(response.body.name).toBe('Test Category'); // Unchanged
    });

    it('should update category emoji', async () => {
      const category = await createTestCategory(project.id, {
        name: 'Test Category',
        color: '#FF0000',
      });

      const response = await request(app).put(`/${category.id}`).send({
        emoji: '🔥',
      });

      expect(response.status).toBe(200);
      expect(response.body.emoji).toBe('🔥');
    });

    it('should update and clear category description', async () => {
      const category = await createTestCategory(project.id, {
        name: 'Test Category',
        color: '#FF0000',
      });

      const updateResponse = await request(app).put(`/${category.id}`).send({
        description: 'Use for tracked initiatives with a bounded outcome.',
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.description).toBe(
        'Use for tracked initiatives with a bounded outcome.',
      );

      const clearResponse = await request(app).put(`/${category.id}`).send({
        description: '',
      });

      expect(clearResponse.status).toBe(200);
      expect(clearResponse.body.description).toBe('');
    });

    it('should clear emoji by setting to null', async () => {
      const { prisma } = await import('../helpers/testDb');
      const category = await createTestCategory(project.id, {
        name: 'Test Category',
        color: '#FF0000',
      });
      await prisma.category.update({
        where: { id: category.id },
        data: { emoji: '🔥' },
      });

      const response = await request(app).put(`/${category.id}`).send({
        emoji: null,
      });

      expect(response.status).toBe(200);
      expect(response.body.emoji).toBeNull();
    });

    it('should update multiple fields at once', async () => {
      const category = await createTestCategory(project.id, { name: 'Old Name', color: '#FF0000' });

      const response = await request(app).put(`/${category.id}`).send({
        name: 'New Name',
        color: '#00FF00',
        emoji: '🎯',
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
      expect(response.body.color).toBe('#00FF00');
      expect(response.body.emoji).toBe('🎯');
    });

    it('should return 404 when category does not exist', async () => {
      const response = await request(app)
        .put('/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Category not found');
    });

    it('should return 400 when name is empty', async () => {
      const category = await createTestCategory(project.id, {
        name: 'Test Category',
        color: '#FF0000',
      });

      const response = await request(app).put(`/${category.id}`).send({
        name: '  ',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Category name cannot be empty');
    });

    it('should return 400 when color is invalid', async () => {
      const category = await createTestCategory(project.id, {
        name: 'Test Category',
        color: '#FF0000',
      });

      const response = await request(app).put(`/${category.id}`).send({
        color: 'invalid',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Category color must be a valid hex color (e.g., #FF5733)');
    });

    it('should trim updated name', async () => {
      const category = await createTestCategory(project.id, {
        name: 'Test Category',
        color: '#FF0000',
      });

      const response = await request(app).put(`/${category.id}`).send({
        name: '  Trimmed Name  ',
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Trimmed Name');
    });

    it('should convert updated color to uppercase', async () => {
      const category = await createTestCategory(project.id, {
        name: 'Test Category',
        color: '#FF0000',
      });

      const response = await request(app).put(`/${category.id}`).send({
        color: '#aabbcc',
      });

      expect(response.status).toBe(200);
      expect(response.body.color).toBe('#AABBCC');
    });
  });

  describe('DELETE /categories/:id', () => {
    it('should delete a category', async () => {
      const category = await createTestCategory(project.id, {
        name: 'Test Category',
        color: '#FF0000',
      });

      const response = await request(app).delete(`/${category.id}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      // Verify it's deleted
      const getResponse = await request(app).get('/');
      expect(getResponse.body.find((t: any) => t.id === category.id)).toBeUndefined();
    });

    it('should return 404 when category does not exist', async () => {
      const response = await request(app).delete('/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Category not found');
    });

    it('should clear categoryId from workstreams when category deleted', async () => {
      const category = await createTestCategory(project.id, {
        name: 'Test Category',
        color: '#FF0000',
      });
      const workstream = await createTestWorkstream(project.id, {
        name: 'Test Workstream',
        categoryId: category.id,
      });

      const response = await request(app).delete(`/${category.id}`);

      expect(response.status).toBe(204);

      // Verify workstream.categoryId is now null
      const { getWorkstreamById } = await import('../../src/services/workstreamService');
      const updatedWorkstream = await getWorkstreamById(workstream.id, project.id);
      expect(updatedWorkstream?.categoryId).toBeNull();
    });

    it('should not delete categories from another user', async () => {
      // Create another user and their category
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id, { name: 'Other Project' });
      const category2 = await createTestCategory(project2.id, {
        name: 'Other Category',
        color: '#FF0000',
      });

      const response = await request(app).delete(`/${category2.id}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Category not found');

      // Verify category still exists
      const { getCategoriesByProjectId } = await import('../../src/services/categoryService');
      const categories = await getCategoriesByProjectId(project2.id);
      expect(categories.find((t) => t.id === category2.id)).toBeDefined();
    });
  });

  describe('Data Isolation', () => {
    it('should not access categories from another user project', async () => {
      // Create another user with categories
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id, { name: 'Other Project' });
      await createTestCategory(project2.id, { name: 'Other Category 1', color: '#FF0000' });
      await createTestCategory(project2.id, { name: 'Other Category 2', color: '#00FF00' });

      // Create categories for current user
      await createTestCategory(project.id, { name: 'My Category', color: '#0000FF' });

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('My Category');
    });

    it('should not update categories from another user', async () => {
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project2 = await createTestProject(person2.id, { name: 'Other Project' });
      const category2 = await createTestCategory(project2.id, {
        name: 'Other Category',
        color: '#FF0000',
      });

      const response = await request(app).put(`/${category2.id}`).send({
        name: 'Hacked!',
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Category not found');

      // Verify category unchanged
      const { getCategoriesByProjectId } = await import('../../src/services/categoryService');
      const categories = await getCategoriesByProjectId(project2.id);
      const unchangedCategory = categories.find((t) => t.id === category2.id);
      expect(unchangedCategory?.name).toBe('Other Category');
    });
  });
});
