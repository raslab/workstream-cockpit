import request from 'supertest';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  createTestProject,
} from '../helpers/testDb';
import { createTestApp } from '../helpers/testApp';
import workstreamsRoutes from '../../src/routes/workstreams';
import categoriesRoutes from '../../src/routes/categories';
import tagsRoutes from '../../src/routes/tags';
import statusUpdatesRoutes from '../../src/routes/statusUpdates';
import viewsRoutes from '../../src/routes/views';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let alicePerson: any;
let aliceProject: any;
let aliceApp: any;

let bobPerson: any;
let bobProject: any;
let bobApp: any;

beforeAll(async () => {
  await setupTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
  
  // Create Alice (legitimate user)
  alicePerson = await createTestPerson({ email: 'alice@example.com', name: 'Alice' });
  aliceProject = await createTestProject(alicePerson.id, { name: 'Alice Project' });
  
  // Create Bob (attacker trying to access Alice's resources)
  bobPerson = await createTestPerson({ email: 'bob@example.com', name: 'Bob' });
  bobProject = await createTestProject(bobPerson.id, { name: 'Bob Project' });
  
  // Note: test apps will be created in each describe block with appropriate routes
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('Authorization & Project Isolation Tests', () => {
  describe('Workstreams Authorization', () => {
    let aliceWorkstream: any;

    beforeEach(async () => {
      aliceApp = createTestApp(workstreamsRoutes, alicePerson);
      bobApp = createTestApp(workstreamsRoutes, bobPerson);

      // Create a workstream in Alice's project
      const response = await request(aliceApp)
        .post('/')
        .send({ name: 'Alice Workstream', categoryId: null });
      
      if (response.status !== 201) {
        console.error('Failed to create Alice workstream:', response.status, response.body);
      }
      
      aliceWorkstream = response.body;
      
      // Verify it was created
      expect(aliceWorkstream.id).toBeDefined();
      expect(aliceWorkstream.name).toBe('Alice Workstream');
    });

    it('should prevent Bob from listing Alice\'s workstreams', async () => {
      const response = await request(bobApp).get('/');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Bob should see empty list or only his workstreams, not Alice's
      const hasAliceWorkstream = response.body.some((ws: any) => ws.id === aliceWorkstream.id);
      expect(hasAliceWorkstream).toBe(false);
    });

    it('should prevent Bob from reading Alice\'s workstream by ID', async () => {
      const response = await request(bobApp).get(`/${aliceWorkstream.id}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should prevent Bob from updating Alice\'s workstream', async () => {
      const response = await request(bobApp)
        .put(`/${aliceWorkstream.id}`)
        .send({ expectedVersion: aliceWorkstream.version, name: 'Hacked Workstream' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');

      // Verify Alice's workstream is unchanged
      const aliceCheck = await request(aliceApp).get(`/${aliceWorkstream.id}`);
      
      if (aliceCheck.status !== 200) {
        console.error('Alice cannot read her own workstream:', aliceCheck.status, aliceCheck.body);
        console.error('Workstream ID:', aliceWorkstream.id);
        console.error('Alice Person ID:', alicePerson.id);
        console.error('Alice Project ID:', aliceProject.id);
      }
      
      expect(aliceCheck.status).toBe(200);
      expect(aliceCheck.body.name).toBe('Alice Workstream');
    });

    it('should prevent Bob from closing Alice\'s workstream', async () => {
      const response = await request(bobApp)
        .post(`/${aliceWorkstream.id}/close`)
        .send({});

      expect(response.status).toBe(404);
      // Close endpoint may return empty body on 404

      // Verify Alice's workstream is still active
      const aliceCheck = await request(aliceApp).get(`/${aliceWorkstream.id}`);
      expect(aliceCheck.body.state).toBe('active');
    });

    it('should prevent Bob from deleting Alice\'s workstream', async () => {
      const response = await request(bobApp).delete(`/${aliceWorkstream.id}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');

      // Verify Alice's workstream still exists
      const aliceCheck = await request(aliceApp).get(`/${aliceWorkstream.id}`);
      expect(aliceCheck.status).toBe(200);
    });
  });

  describe('Categories Authorization', () => {
    let aliceCategory: any;

    beforeEach(async () => {
      aliceApp = createTestApp(categoriesRoutes, alicePerson);
      bobApp = createTestApp(categoriesRoutes, bobPerson);

      // Create a category in Alice's project  
      const response = await request(aliceApp)
        .post('/')
        .send({ name: 'Alice Category', color: '#FF0000' });
      
      if (response.status !== 201) {
        console.error('Failed to create Alice category:', response.status, response.body);
        console.error('Alice Person:', alicePerson);
        console.error('Alice Project:', aliceProject);
      }
      
      aliceCategory = response.body;
      expect(aliceCategory.id).toBeDefined();
    });

    it('should prevent Bob from listing Alice\'s categories', async () => {
      const response = await request(bobApp).get('/');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Bob should not see Alice's categories
      const hasAliceCategory = response.body.some((cat: any) => cat.id === aliceCategory.id);
      expect(hasAliceCategory).toBe(false);
    });

    it('should prevent Bob from updating Alice\'s category', async () => {
      const response = await request(bobApp)
        .put(`/${aliceCategory.id}`)
        .send({ name: 'Hacked Category' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
      
      // Verify Alice's category is unchanged by listing all categories
      const aliceCheck = await request(aliceApp).get('/');
      const aliceCategoryCheck = aliceCheck.body.find((cat: any) => cat.id === aliceCategory.id);
      expect(aliceCategoryCheck).toBeDefined();
      expect(aliceCategoryCheck.name).toBe('Alice Category');
    });

    it('should prevent Bob from deleting Alice\'s category', async () => {
      const response = await request(bobApp).delete(`/${aliceCategory.id}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');

      // Verify Alice's category still exists by listing all categories
      const aliceCheck = await request(aliceApp).get('/');
      const aliceCategoryCheck = aliceCheck.body.find((cat: any) => cat.id === aliceCategory.id);
      expect(aliceCategoryCheck).toBeDefined();
    });

    it('should prevent Bob from reordering Alice\'s categories', async () => {
      // Create another category for Alice
      const response2 = await request(aliceApp)
        .post('/')
        .send({ name: 'Alice Category 2', color: '#00FF00', emoji: '🟢' });
      const aliceCategory2 = response2.body;

      const response = await request(bobApp)
        .put('/reorder')
        .send({ categoryIds: [aliceCategory2.id, aliceCategory.id] });

      // Should fail because Bob doesn't own these categories
      expect(response.status).not.toBe(200);
    });
  });

  describe('Tags Authorization', () => {
    let aliceTag: any;

    beforeEach(async () => {
      aliceApp = createTestApp(tagsRoutes, alicePerson);
      bobApp = createTestApp(tagsRoutes, bobPerson);

      // Create a tag in Alice's project
      const response = await request(aliceApp)
        .post('/')
        .send({ displayName: 'Alice Tag', color: '#FF0000' });
      aliceTag = response.body.tag;
    });

    it('should prevent Bob from listing Alice\'s tags', async () => {
      const response = await request(bobApp).get('/');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.tags)).toBe(true);
      
      // Bob should not see Alice's tags
      const hasAliceTag = response.body.tags.some((tag: any) => tag.id === aliceTag.id);
      expect(hasAliceTag).toBe(false);
    });

    it('should prevent Bob from updating Alice\'s tag', async () => {
      const response = await request(bobApp)
        .patch(`/${aliceTag.id}`)
        .send({ displayName: 'Hacked Tag' });

      expect(response.status).toBe(404);

      // Verify Alice's tag is unchanged by listing all tags
      const aliceCheck = await request(aliceApp).get('/');
      const aliceTagCheck = aliceCheck.body.tags.find((tag: any) => tag.id === aliceTag.id);
      expect(aliceTagCheck).toBeDefined();
      expect(aliceTagCheck.displayName).toBe('Alice Tag');
    });

    it('should prevent Bob from deleting Alice\'s tag', async () => {
      const response = await request(bobApp).delete(`/${aliceTag.id}`);

      expect(response.status).toBe(404);

      // Verify Alice's tag still exists by listing all tags
      const aliceCheck = await request(aliceApp).get('/');
      const aliceTagCheck = aliceCheck.body.tags.find((tag: any) => tag.id === aliceTag.id);
      expect(aliceTagCheck).toBeDefined();
    });
  });

  describe('Status Updates Authorization', () => {
    let aliceWorkstream: any;
    let aliceStatusUpdate: any;

    beforeEach(async () => {
      // Create workstream for Alice
      const workstreamApp = createTestApp(workstreamsRoutes, alicePerson);
      const wsResponse = await request(workstreamApp)
        .post('/')
        .send({ name: 'Alice Workstream', categoryId: null });
      aliceWorkstream = wsResponse.body;

      aliceApp = createTestApp(statusUpdatesRoutes, alicePerson);
      bobApp = createTestApp(statusUpdatesRoutes, bobPerson);

      // Create a status update in Alice's workstream
      const response = await request(aliceApp)
        .post('/')
        .send({ 
          workstreamId: aliceWorkstream.id, 
          status: 'in-progress',
          note: 'Alice status update'
        });
      aliceStatusUpdate = response.body;
    });

    it('should prevent Bob from creating status update in Alice\'s workstream', async () => {
      const response = await request(bobApp)
        .post('/')
        .send({ 
          workstreamId: aliceWorkstream.id, 
          status: 'blocked',
          note: 'Malicious status update'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should prevent Bob from updating Alice\'s status update', async () => {
      const response = await request(bobApp)
        .put(`/${aliceStatusUpdate.id}`)
        .send({
          workstreamId: aliceWorkstream.id,
          expectedVersion: aliceStatusUpdate.version,
          note: 'Hacked note',
        });

      expect([400, 404]).toContain(response.status);

      // Verify Alice's status update exists and is unchanged
      // (Access via workstream endpoint since there's no GET /:id for status updates)
      const workstreamApp = createTestApp(statusUpdatesRoutes, alicePerson);
      const aliceCheck = await request(workstreamApp).get(`/workstreams/${aliceWorkstream.id}/status-updates`);
      expect(aliceCheck.status).toBe(200);
      const statusUpdate = aliceCheck.body.updates.find((su: any) => su.id === aliceStatusUpdate.id);
      expect(statusUpdate).toBeDefined();
      expect(statusUpdate.note).toBe('Alice status update');
    });

    it('should prevent Bob from deleting Alice\'s status update', async () => {
      const response = await request(bobApp).delete(`/${aliceStatusUpdate.id}`);

      expect([400, 404]).toContain(response.status);

      // Verify Alice's status update still exists
      const workstreamApp = createTestApp(statusUpdatesRoutes, alicePerson);
      const aliceCheck = await request(workstreamApp).get(`/workstreams/${aliceWorkstream.id}/status-updates`);
      expect(aliceCheck.status).toBe(200);
      const statusUpdate = aliceCheck.body.updates.find((su: any) => su.id === aliceStatusUpdate.id);
      expect(statusUpdate).toBeDefined();
    });
  });

  describe('Views Authorization', () => {
    let aliceView: any;

    beforeEach(async () => {
      aliceApp = createTestApp(viewsRoutes, alicePerson);
      bobApp = createTestApp(viewsRoutes, bobPerson);

      // Create a view in Alice's project
      const response = await request(aliceApp)
        .post('/')
        .send({ 
          name: 'Alice View',
          config: {
            filters: { categoryIds: [], tags: [], temporal: { notUpdatedToday: false } },
            sort: { field: 'updatedAt', direction: 'desc' },
            group: { by: 'category' },
          }
        });
      aliceView = response.body;
    });

    it('should prevent Bob from listing Alice\'s views', async () => {
      const response = await request(bobApp).get('/');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Bob should not see Alice's views
      const hasAliceView = response.body.some((view: any) => view.id === aliceView.id);
      expect(hasAliceView).toBe(false);
    });

    it('should prevent Bob from reading Alice\'s view by ID', async () => {
      const response = await request(bobApp).get(`/${aliceView.id}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('View not found');
    });

    it('should prevent Bob from updating Alice\'s view', async () => {
      const response = await request(bobApp)
        .put(`/${aliceView.id}`)
        .send({ name: 'Hacked View' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('View not found');

      // Verify Alice's view is unchanged
      const aliceCheck = await request(aliceApp).get(`/${aliceView.id}`);
      expect(aliceCheck.body.name).toBe('Alice View');
    });

    it('should prevent Bob from deleting Alice\'s view', async () => {
      const response = await request(bobApp).delete(`/${aliceView.id}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('View not found');

      // Verify Alice's view still exists
      const aliceCheck = await request(aliceApp).get(`/${aliceView.id}`);
      expect(aliceCheck.status).toBe(200);
    });
  });

  describe('Database-Level Isolation Verification', () => {
    it('should ensure workstreams belong to the correct project', async () => {
      const aliceApp = createTestApp(workstreamsRoutes, alicePerson);
      
      // Create workstream for Alice
      const response = await request(aliceApp)
        .post('/')
        .send({ name: 'Test Workstream', categoryId: null });

      // Verify in database
      const workstream = await prisma.workstream.findUnique({
        where: { id: response.body.id },
      });

      expect(workstream?.projectId).toBe(aliceProject.id);
      expect(workstream?.projectId).not.toBe(bobProject.id);
    });

    it('should ensure categories belong to the correct project', async () => {
      const aliceApp = createTestApp(categoriesRoutes, alicePerson);
      
      const response = await request(aliceApp)
        .post('/')
        .send({ name: 'Test Category', color: '#FF0000', emoji: '🔴' });

      const category = await prisma.category.findUnique({
        where: { id: response.body.id },
      });

      expect(category?.projectId).toBe(aliceProject.id);
      expect(category?.projectId).not.toBe(bobProject.id);
    });

    it('should ensure tags belong to the correct project', async () => {
      const aliceApp = createTestApp(tagsRoutes, alicePerson);
      
      const response = await request(aliceApp)
        .post('/')
        .send({ displayName: 'Test Tag', color: '#FF0000' });

      const tag = await prisma.tag.findUnique({
        where: { id: response.body.tag.id },
      });

      expect(tag?.projectId).toBe(aliceProject.id);
      expect(tag?.projectId).not.toBe(bobProject.id);
    });

    it('should ensure views belong to the correct project', async () => {
      const aliceApp = createTestApp(viewsRoutes, alicePerson);
      
      const response = await request(aliceApp)
        .post('/')
        .send({ 
          name: 'Test View',
          config: {
            filters: { categoryIds: [], tags: [], temporal: { notUpdatedToday: false } },
            sort: { field: 'updatedAt', direction: 'desc' },
            group: { by: 'category' },
          }
        });

      const view = await prisma.view.findUnique({
        where: { id: response.body.id },
      });

      expect(view?.projectId).toBe(aliceProject.id);
      expect(view?.projectId).not.toBe(bobProject.id);
    });

    it('should ensure status updates belong to workstreams in correct project', async () => {
      // Create workstream for Alice
      const workstreamApp = createTestApp(workstreamsRoutes, alicePerson);
      const wsResponse = await request(workstreamApp)
        .post('/')
        .send({ name: 'Test Workstream', categoryId: null });

      // Create status update
      const statusApp = createTestApp(statusUpdatesRoutes, alicePerson);
      const response = await request(statusApp)
        .post('/')
        .send({ 
          workstreamId: wsResponse.body.id, 
          status: 'in-progress',
          note: 'Test note'
        });

      // Verify workstream belongs to Alice's project
      const workstream = await prisma.workstream.findUnique({
        where: { id: wsResponse.body.id },
      });

      const statusUpdate = await prisma.statusUpdate.findUnique({
        where: { id: response.body.id },
      });

      expect(workstream?.projectId).toBe(aliceProject.id);
      expect(statusUpdate?.workstreamId).toBe(wsResponse.body.id);
    });
  });

  describe('Cross-Project Resource Reference Prevention', () => {
    it('should prevent Bob from assigning Alice\'s category to his workstream', async () => {
      // Create category in Alice's project
      const aliceCategoryApp = createTestApp(categoriesRoutes, alicePerson);
      const catResponse = await request(aliceCategoryApp)
        .post('/')
        .send({ name: 'Alice Category', color: '#FF0000', emoji: '🔴' });
      const aliceCategoryId = catResponse.body.id;

      // Try to create Bob's workstream with Alice's category
      const bobWorkstreamApp = createTestApp(workstreamsRoutes, bobPerson);
      const response = await request(bobWorkstreamApp)
        .post('/')
        .send({ name: 'Bob Workstream', categoryId: aliceCategoryId });

      // Should either fail or ignore the invalid categoryId
      expect(response.status).not.toBe(500); // Should handle gracefully
      
      if (response.status === 201) {
        // If created, verify category is null or a valid category from Bob's project
        expect(response.body.category?.id).not.toBe(aliceCategoryId);
      }
    });

    it('should prevent creating status update in another user\'s workstream via direct API manipulation', async () => {
      // Create Alice's workstream
      const aliceWsApp = createTestApp(workstreamsRoutes, alicePerson);
      const wsResponse = await request(aliceWsApp)
        .post('/')
        .send({ name: 'Alice Workstream', categoryId: null });

      // Bob tries to create status update in Alice's workstream
      const bobStatusApp = createTestApp(statusUpdatesRoutes, bobPerson);
      const response = await request(bobStatusApp)
        .post('/')
        .send({ 
          workstreamId: wsResponse.body.id, 
          status: 'blocked',
          note: 'Malicious update'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Unauthenticated Access Prevention', () => {
    it('should prevent unauthenticated access to workstreams', async () => {
      // Create app without authenticated user
      const unauthApp = createTestApp(workstreamsRoutes, undefined);
      
      const response = await request(unauthApp).get('/');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should prevent unauthenticated access to categories', async () => {
      const unauthApp = createTestApp(categoriesRoutes, undefined);
      
      const response = await request(unauthApp).get('/');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should prevent unauthenticated access to tags', async () => {
      const unauthApp = createTestApp(tagsRoutes, undefined);
      
      const response = await request(unauthApp).get('/');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should prevent unauthenticated access to views', async () => {
      const unauthApp = createTestApp(viewsRoutes, undefined);
      
      const response = await request(unauthApp).get('/');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should prevent unauthenticated access to status updates', async () => {
      const unauthApp = createTestApp(statusUpdatesRoutes, undefined);
      
      const response = await request(unauthApp).get('/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication required');
    });
  });
});
