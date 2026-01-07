import request from 'supertest';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  createTestProject,
} from '../helpers/testDb';
import { createTestApp } from '../helpers/testApp';
import viewsRoutes from '../../src/routes/views';

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
  app = createTestApp(viewsRoutes, person);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('Views API Integration Tests', () => {
  // Helper function to create a view
  const createView = async (name: string, config?: any) => {
    const defaultConfig = {
      filters: {
        categoryIds: [],
        tags: [],
        temporal: {
          notUpdatedToday: false,
        },
      },
      sort: {
        field: 'updatedAt',
        direction: 'desc',
      },
      group: {
        by: 'category',
      },
    };

    return await request(app)
      .post('/')
      .send({ 
        name, 
        config: config || defaultConfig,
        isDefault: false 
      });
  };

  describe('GET /', () => {
    it('should return empty array with default view when no views exist', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toMatchObject({
        name: 'Default View',
        isDefault: true,
        projectId: project.id,
      });
      expect(response.body[0].id).toBeDefined();
      expect(response.body[0].config).toBeDefined();
    });

    it('should return all views for the project', async () => {
      await createView('Custom View 1');
      await createView('Custom View 2');

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(3); // Default + 2 custom
      
      const viewNames = response.body.map((v: any) => v.name);
      expect(viewNames).toContain('Default View');
      expect(viewNames).toContain('Custom View 1');
      expect(viewNames).toContain('Custom View 2');
    });

    it('should order views with default first, then by updatedAt desc', async () => {
      await createView('View A');
      await createView('View B');

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body[0].isDefault).toBe(true);
      expect(response.body[0].name).toBe('Default View');
    });
  });

  describe('GET /:viewId', () => {
    it('should return a specific view by ID', async () => {
      const createResponse = await createView('My View');
      const viewId = createResponse.body.id;

      const response = await request(app).get(`/${viewId}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: viewId,
        name: 'My View',
        isDefault: false,
        projectId: project.id,
      });
    });

    it('should return 404 for non-existent view', async () => {
      const response = await request(app).get('/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('View not found');
    });

    it('should return 404 for view from different project', async () => {
      // Create another user and project
      const otherPerson = await createTestPerson({ 
        email: 'other@example.com', 
        name: 'Other User' 
      });
      await createTestProject(otherPerson.id, { 
        name: 'Other Project' 
      });
      
      // Create view in other project
      const otherApp = createTestApp(viewsRoutes, otherPerson);
      const createResponse = await request(otherApp)
        .post('/')
        .send({
          name: 'Other View',
          config: {
            filters: { categoryIds: [], tags: [], temporal: { notUpdatedToday: false } },
            sort: { field: 'updatedAt', direction: 'desc' },
            group: { by: 'category' },
          },
        });

      const otherViewId = createResponse.body.id;

      // Try to access from first user's context
      const response = await request(app).get(`/${otherViewId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('View not found');
    });
  });

  describe('POST /', () => {
    it('should create a new view with valid data', async () => {
      const viewConfig = {
        filters: {
          categoryIds: ['cat-1'],
          tags: ['tag1', 'tag2'],
          temporal: {
            notUpdatedToday: true,
          },
        },
        sort: {
          field: 'name',
          direction: 'asc',
        },
        group: {
          by: 'none',
        },
      };

      const response = await createView('Filtered View', viewConfig);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Filtered View',
        isDefault: false,
        projectId: project.id,
        config: viewConfig,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should create view with minimal config', async () => {
      const response = await createView('Simple View');

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Simple View');
      expect(response.body.config).toBeDefined();
    });

    it('should unset other default views when creating a new default view', async () => {
      // Get the default view
      const listResponse1 = await request(app).get('/');
      const defaultViewId = listResponse1.body[0].id;

      // Create a new default view
      const response = await request(app)
        .post('/')
        .send({
          name: 'New Default',
          isDefault: true,
          config: {
            filters: { categoryIds: [], tags: [], temporal: { notUpdatedToday: false } },
            sort: { field: 'updatedAt', direction: 'desc' },
            group: { by: 'category' },
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.isDefault).toBe(true);

      // Verify old default is no longer default
      const getOldDefault = await request(app).get(`/${defaultViewId}`);
      expect(getOldDefault.body.isDefault).toBe(false);
    });
  });

  describe('PUT /:viewId', () => {
    it('should update view name', async () => {
      const createResponse = await createView('Old Name');
      const viewId = createResponse.body.id;

      const response = await request(app)
        .put(`/${viewId}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
      expect(response.body.id).toBe(viewId);
    });

    it('should update view config', async () => {
      const createResponse = await createView('My View');
      const viewId = createResponse.body.id;

      const newConfig = {
        filters: {
          categoryIds: ['cat-1', 'cat-2'],
          tags: ['urgent'],
          temporal: {
            notUpdatedToday: true,
          },
        },
        sort: {
          field: 'createdAt',
          direction: 'asc',
        },
        group: {
          by: 'category',
        },
      };

      const response = await request(app)
        .put(`/${viewId}`)
        .send({ config: newConfig });

      expect(response.status).toBe(200);
      expect(response.body.config).toEqual(newConfig);
    });

    it('should set view as default and unset others', async () => {
      const createResponse = await createView('Custom View');
      const viewId = createResponse.body.id;

      const response = await request(app)
        .put(`/${viewId}`)
        .send({ isDefault: true });

      expect(response.status).toBe(200);
      expect(response.body.isDefault).toBe(true);

      // Verify no other view is default
      const allViews = await request(app).get('/');
      const defaultViews = allViews.body.filter((v: any) => v.isDefault);
      expect(defaultViews.length).toBe(1);
      expect(defaultViews[0].id).toBe(viewId);
    });

    it('should return 404 for non-existent view', async () => {
      const response = await request(app)
        .put('/00000000-0000-0000-0000-000000000000')
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('View not found');
    });

    it('should update updatedAt timestamp', async () => {
      const createResponse = await createView('My View');
      const viewId = createResponse.body.id;
      const originalUpdatedAt = createResponse.body.updatedAt;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .put(`/${viewId}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  describe('DELETE /:viewId', () => {
    it('should delete a custom view', async () => {
      const createResponse = await createView('View to Delete');
      const viewId = createResponse.body.id;

      const response = await request(app).delete(`/${viewId}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      // Verify view is deleted
      const getResponse = await request(app).get(`/${viewId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should not allow deleting default view', async () => {
      // Get default view
      const listResponse = await request(app).get('/');
      const defaultView = listResponse.body.find((v: any) => v.isDefault);

      const response = await request(app).delete(`/${defaultView.id}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot delete the default view');

      // Verify default view still exists
      const getResponse = await request(app).get(`/${defaultView.id}`);
      expect(getResponse.status).toBe(200);
    });

    it('should return 404 for non-existent view', async () => {
      const response = await request(app).delete('/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('View not found');
    });

    it('should remove view from list after deletion', async () => {
      const createResponse = await createView('Temporary View');
      const viewId = createResponse.body.id;

      const beforeDelete = await request(app).get('/');
      const countBefore = beforeDelete.body.length;

      await request(app).delete(`/${viewId}`);

      const afterDelete = await request(app).get('/');
      expect(afterDelete.body.length).toBe(countBefore - 1);
      expect(afterDelete.body.find((v: any) => v.id === viewId)).toBeUndefined();
    });
  });

  describe('View Config Validation', () => {
    it('should accept all valid sort fields', async () => {
      const fields = ['name', 'createdAt', 'updatedAt'];
      
      for (const field of fields) {
        const response = await createView(`View ${field}`, {
          filters: { categoryIds: [], tags: [], temporal: { notUpdatedToday: false } },
          sort: { field, direction: 'desc' },
          group: { by: 'category' },
        });
        
        expect(response.status).toBe(201);
        expect(response.body.config.sort.field).toBe(field);
      }
    });

    it('should accept all valid sort directions', async () => {
      const directions = ['asc', 'desc'];
      
      for (const direction of directions) {
        const response = await createView(`View ${direction}`, {
          filters: { categoryIds: [], tags: [], temporal: { notUpdatedToday: false } },
          sort: { field: 'name', direction },
          group: { by: 'category' },
        });
        
        expect(response.status).toBe(201);
        expect(response.body.config.sort.direction).toBe(direction);
      }
    });

    it('should accept all valid group options', async () => {
      const groupByOptions = ['none', 'category'];
      
      for (const groupBy of groupByOptions) {
        const response = await createView(`View ${groupBy}`, {
          filters: { categoryIds: [], tags: [], temporal: { notUpdatedToday: false } },
          sort: { field: 'name', direction: 'asc' },
          group: { by: groupBy },
        });
        
        expect(response.status).toBe(201);
        expect(response.body.config.group.by).toBe(groupBy);
      }
    });

    it('should store complex filter configurations', async () => {
      const complexConfig = {
        filters: {
          categoryIds: ['cat-1', 'cat-2', 'cat-3'],
          tags: ['urgent', 'backend', 'bug'],
          temporal: {
            notUpdatedToday: true,
          },
        },
        sort: {
          field: 'updatedAt',
          direction: 'desc',
        },
        group: {
          by: 'category',
        },
      };

      const response = await createView('Complex View', complexConfig);

      expect(response.status).toBe(201);
      expect(response.body.config).toEqual(complexConfig);
    });
  });

  describe('Default View Creation', () => {
    it('should auto-create default view on first GET request', async () => {
      // Don't create any views manually
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toMatchObject({
        name: 'Default View',
        isDefault: true,
      });
    });

    it('should not create duplicate default views', async () => {
      // Make multiple requests
      await request(app).get('/');
      await request(app).get('/');
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      const defaultViews = response.body.filter((v: any) => v.isDefault);
      expect(defaultViews.length).toBe(1);
    });

    it('should create default view with correct config', async () => {
      const response = await request(app).get('/');

      const defaultView = response.body[0];
      expect(defaultView.config).toEqual({
        filters: {
          categoryIds: [],
          tags: [],
          temporal: {
            notUpdatedToday: false,
          },
        },
        sort: {
          field: 'updatedAt',
          direction: 'desc',
        },
        group: {
          by: 'category',
        },
      });
    });
  });
});
