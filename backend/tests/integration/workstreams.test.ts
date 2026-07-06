import request from 'supertest';
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

    it('should return lightweight active workstream references without list enrichment payloads', async () => {
      const active = await createTestWorkstream(project.id, {
        name: 'Active Ref',
        state: 'active',
      });
      const closed = await createTestWorkstream(project.id, {
        name: 'Closed Ref',
        state: 'closed',
      });
      const substream = await createTestWorkstream(project.id, {
        name: 'Nested Ref',
        parentId: active.id,
        state: 'active',
      });

      const response = await request(app).get('/references?state=active');

      expect(response.status).toBe(200);
      expect(response.body.map((workstream: any) => workstream.id).sort()).toEqual(
        [active.id, substream.id].sort(),
      );
      expect(response.body.map((workstream: any) => workstream.id)).not.toContain(closed.id);
      expect(response.body.find((workstream: any) => workstream.id === substream.id)).toMatchObject(
        {
          name: 'Nested Ref',
          state: 'active',
          parentId: active.id,
          depth: 2,
          parentStreams: [expect.objectContaining({ id: active.id, name: 'Active Ref', depth: 1 })],
        },
      );
      expect(response.body[0]).not.toHaveProperty('latestStatus');
      expect(response.body[0]).not.toHaveProperty('statusUpdates');
      expect(response.body[0]).not.toHaveProperty('allTags');
    });

    it('should include tag information in workstream', async () => {
      const category = await createTestCategory(project.id, { name: 'urgent', color: '#FF0000' });
      await createTestWorkstream(project.id, { name: 'Tagged', categoryId: category.id });

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body[0].category).toBeDefined();
      expect(response.body[0].category.name).toBe('urgent');
      expect(response.body[0].category.color).toBe('#FF0000');
    });

    it('should include latest status update', async () => {
      const workstream = await createTestWorkstream(project.id);
      await createTestStatusUpdate(workstream.id, { status: 'Latest status' });

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body[0].latestStatus).toBeDefined();
      expect(response.body[0].latestStatus.status).toBe('Latest status');
    });

    it('should preserve parent metadata when not-updated-today filters out the parent row', async () => {
      const parent = await createTestWorkstream(project.id, { name: 'Parent stream' });
      const substream = await createTestWorkstream(project.id, {
        name: 'Sub-stream',
        parentId: parent.id,
      });
      const parentStatus = await createTestStatusUpdate(parent.id, { status: 'Updated today' });
      const substreamStatus = await createTestStatusUpdate(substream.id, {
        status: 'Not updated today',
      });
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      await prisma.statusUpdate.update({
        where: { id: parentStatus.id },
        data: { createdAt: new Date(), updatedAt: new Date() },
      });
      await prisma.statusUpdate.update({
        where: { id: substreamStatus.id },
        data: { createdAt: yesterday, updatedAt: yesterday },
      });

      const response = await request(app).get('/?notUpdatedToday=true');

      expect(response.status).toBe(200);
      expect(response.body.map((workstream: any) => workstream.id)).toEqual([substream.id]);
      expect(response.body[0].parentId).toBe(parent.id);
      expect(response.body[0].parent).toMatchObject({ id: parent.id, name: 'Parent stream' });
      expect(response.body[0].parentStreams).toEqual([
        expect.objectContaining({
          id: parent.id,
          name: 'Parent stream',
          state: 'active',
          parentId: null,
          depth: 1,
        }),
      ]);
    });

    it('scopes parent views to matching sub-streams without returning the selected parent', async () => {
      const ktlo = await createTestCategory(project.id, { name: 'KTLO', color: '#00AA00' });
      const selectedParent = await createTestWorkstream(project.id, { name: 'Selected parent' });
      const matchingDirectSubstream = await createTestWorkstream(project.id, {
        name: 'Matching direct sub-stream',
        parentId: selectedParent.id,
        categoryId: ktlo.id,
      });
      const nonMatchingDirectSubstream = await createTestWorkstream(project.id, {
        name: 'Non-matching direct sub-stream',
        parentId: selectedParent.id,
      });
      const intermediateSubstream = await createTestWorkstream(project.id, {
        name: 'Intermediate sub-stream',
        parentId: selectedParent.id,
      });
      const matchingLeafSubstream = await createTestWorkstream(project.id, {
        name: 'Matching leaf sub-stream',
        parentId: intermediateSubstream.id,
        categoryId: ktlo.id,
      });
      const otherParent = await createTestWorkstream(project.id, { name: 'Other parent' });
      const otherSubstream = await createTestWorkstream(project.id, {
        name: 'Other parent sub-stream',
        parentId: otherParent.id,
        categoryId: ktlo.id,
      });

      const directResponse = await request(app).get(
        `/?state=active&categoryIds=${ktlo.id}&hierarchy=under-parent&parentId=${selectedParent.id}&includeSubstreams=false`,
      );

      expect(directResponse.status).toBe(200);
      expect(directResponse.body.map((workstream: any) => workstream.id)).toEqual([
        matchingDirectSubstream.id,
      ]);

      const recursiveResponse = await request(app).get(
        `/?state=active&categoryIds=${ktlo.id}&hierarchy=under-parent&parentId=${selectedParent.id}&includeSubstreams=true`,
      );

      expect(recursiveResponse.status).toBe(200);
      expect(recursiveResponse.body.map((workstream: any) => workstream.id)).toEqual([
        matchingLeafSubstream.id,
        matchingDirectSubstream.id,
      ]);
      expect(recursiveResponse.body.map((workstream: any) => workstream.id)).not.toContain(
        selectedParent.id,
      );
      expect(recursiveResponse.body.map((workstream: any) => workstream.id)).not.toContain(
        nonMatchingDirectSubstream.id,
      );
      expect(recursiveResponse.body.map((workstream: any) => workstream.id)).not.toContain(
        intermediateSubstream.id,
      );
      expect(recursiveResponse.body.map((workstream: any) => workstream.id)).not.toContain(
        otherSubstream.id,
      );

      const leafResponse = await request(app).get(
        `/?state=active&hierarchy=under-parent&parentId=${matchingLeafSubstream.id}&includeSubstreams=true`,
      );

      expect(leafResponse.status).toBe(200);
      expect(leafResponse.body.map((workstream: any) => workstream.id)).toEqual([]);
    });

    it('returns direct and nested sub-streams for overlapping selected parents', async () => {
      const streamA = await createTestWorkstream(project.id, { name: 'A' });
      const streamB = await createTestWorkstream(project.id, { name: 'B', parentId: streamA.id });
      const streamC = await createTestWorkstream(project.id, { name: 'C', parentId: streamB.id });

      const directResponse = await request(app).get(
        `/?state=active&hierarchy=under-parent&parentId=${streamA.id}&includeSubstreams=false`,
      );

      expect(directResponse.status).toBe(200);
      expect(directResponse.body.map((workstream: any) => workstream.id)).toEqual([streamB.id]);

      const recursiveResponse = await request(app).get(
        `/?state=active&hierarchy=under-parent&parentId=${streamA.id}&includeSubstreams=true`,
      );

      expect(recursiveResponse.status).toBe(200);
      expect(recursiveResponse.body.map((workstream: any) => workstream.id)).toEqual([
        streamC.id,
        streamB.id,
      ]);
      const nestedFromApi = recursiveResponse.body.find(
        (workstream: any) => workstream.id === streamC.id,
      );
      expect(nestedFromApi.parent).toMatchObject({ id: streamB.id, name: 'B' });
      expect(nestedFromApi.parentStreams).toEqual([
        expect.objectContaining({ id: streamA.id, name: 'A' }),
        expect.objectContaining({ id: streamB.id, name: 'B' }),
      ]);

      const overlappingParentsResponse = await request(app).get(
        `/?state=active&hierarchy=under-parent&parentIds=${streamA.id},${streamB.id}&includeSubstreams=false`,
      );

      expect(overlappingParentsResponse.status).toBe(200);
      expect(overlappingParentsResponse.body.map((workstream: any) => workstream.id)).toEqual([
        streamC.id,
        streamB.id,
      ]);

      const browserUrlStyleResponse = await request(app)
        .get('/')
        .query({
          state: 'active',
          hierarchy: 'under-parent',
          parentIds: [streamA.id, streamB.id],
          includeSubstreams: '1',
        });

      expect(browserUrlStyleResponse.status).toBe(200);
      expect(browserUrlStyleResponse.body.map((workstream: any) => workstream.id)).toEqual([
        streamC.id,
        streamB.id,
      ]);
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

    it('should expose stable public numbers and return workstream by public number', async () => {
      const first = await createTestWorkstream(project.id, { name: 'First Workstream' });
      const second = await createTestWorkstream(project.id, { name: 'Second Workstream' });
      const otherPerson = await createTestPerson({
        email: 'numbers-other@example.com',
        name: 'Other User',
      });
      const otherProject = await createTestProject(otherPerson.id, { name: 'Other Project' });
      await createTestWorkstream(otherProject.id, { name: 'Other project first' });

      expect(first.number).toBe(1);
      expect(second.number).toBe(2);

      const response = await request(app).get(`/${second.number}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(second.id);
      expect(response.body.number).toBe(2);
      expect(response.body.name).toBe('Second Workstream');
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
      const category = await createTestCategory(project.id);

      const response = await request(app).post('/').send({
        name: 'Full Workstream',
        categoryId: category.id,
        context: 'Background context',
        initialStatus: 'Starting work',
        initialNote: 'First note',
      });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Full Workstream');
      expect(response.body.categoryId).toBe(category.id);
      expect(response.body.context).toBe('Background context');
    });

    it('should return 404 and not create when categoryId belongs to another project', async () => {
      const otherPerson = await createTestPerson({
        email: 'other@example.com',
        name: 'Other User',
      });
      const otherProject = await createTestProject(otherPerson.id, { name: 'Other Project' });
      const otherCategory = await createTestCategory(otherProject.id, { name: 'other-category' });

      const response = await request(app).post('/').send({
        name: 'Cross Project Category',
        categoryId: otherCategory.id,
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Category not found');

      const workstreamCount = await prisma.workstream.count({
        where: { projectId: project.id, name: 'Cross Project Category' },
      });
      expect(workstreamCount).toBe(0);
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
      const category = await createTestCategory(project.id);
      const workstream = await createTestWorkstream(project.id);

      const response = await request(app).put(`/${workstream.id}`).send({
        categoryId: category.id,
      });

      expect(response.status).toBe(200);
      expect(response.body.categoryId).toBe(category.id);
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
      const category = await createTestCategory(project.id);
      const workstream = await createTestWorkstream(project.id, { categoryId: category.id });

      const response = await request(app).put(`/${workstream.id}`).send({
        categoryId: null,
      });

      expect(response.status).toBe(200);
      expect(response.body.categoryId).toBeNull();
    });

    it('should return 404 and not update when categoryId belongs to another project', async () => {
      const category = await createTestCategory(project.id, { name: 'current-category' });
      const workstream = await createTestWorkstream(project.id, { categoryId: category.id });
      const otherPerson = await createTestPerson({
        email: 'other@example.com',
        name: 'Other User',
      });
      const otherProject = await createTestProject(otherPerson.id, { name: 'Other Project' });
      const otherCategory = await createTestCategory(otherProject.id, { name: 'other-category' });

      const response = await request(app).put(`/${workstream.id}`).send({
        categoryId: otherCategory.id,
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Category not found');

      const unchangedWorkstream = await prisma.workstream.findUnique({
        where: { id: workstream.id },
      });
      expect(unchangedWorkstream?.categoryId).toBe(category.id);
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

      const response = await request(app)
        .put(`/${workstream.id}`)
        .send({
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

    it('should not reuse public numbers after deleting the highest-numbered workstream', async () => {
      const first = await createTestWorkstream(project.id, { name: 'First numbered stream' });
      const second = await createTestWorkstream(project.id, { name: 'Second numbered stream' });

      await request(app).delete(`/${second.id}`).expect(204);
      const response = await request(app).post('/').send({ name: 'Replacement stream' });

      expect(response.status).toBe(201);
      expect(response.body.number).toBeGreaterThan(second.number);
      expect(response.body.number).not.toBe(first.number);
      expect(response.body.number).not.toBe(second.number);
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

      const response = await request(app).put(`/${workstream2.id}`).send({ name: 'Hacked!' });

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

  describe('Tag Filtering', () => {
    it('should filter workstreams by single tag in context', async () => {
      await createTestWorkstream(project.id, {
        name: 'Backend WS',
        context: 'Working on #backend', // Single-word tag
      });
      await createTestWorkstream(project.id, {
        name: 'Frontend WS',
        context: 'Building #frontend', // Single-word tag
      });

      const response = await request(app).get('/?tags=backend');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Backend WS');
    });

    it('should filter workstreams by multiple tags (OR logic)', async () => {
      await createTestWorkstream(project.id, {
        name: 'Backend WS',
        context: 'Working on #backend', // Single-word tag
      });
      await createTestWorkstream(project.id, {
        name: 'Frontend WS',
        context: 'Building #frontend', // Single-word tag
      });
      await createTestWorkstream(project.id, {
        name: 'Database WS',
        context: 'Setting up #database',
      });

      const response = await request(app).get('/?tags=backend,frontend');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      const names = response.body.map((ws: any) => ws.name);
      expect(names).toContain('Backend WS');
      expect(names).toContain('Frontend WS');
      expect(names).not.toContain('Database WS');
    });

    it('should filter workstreams by tags in status updates', async () => {
      const ws1 = await createTestWorkstream(project.id, { name: 'WS1' });
      const ws2 = await createTestWorkstream(project.id, { name: 'WS2' });

      await createTestStatusUpdate(ws1.id, {
        status: 'Working on #backend',
        note: 'Making progress',
      });
      await createTestStatusUpdate(ws2.id, {
        status: 'Working on #frontend',
        note: 'Building UI',
      });

      const response = await request(app).get('/?tags=backend');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('WS1');
    });

    it('should filter by tags in both context and status updates', async () => {
      // Create workstream with tag in context
      await createTestWorkstream(project.id, {
        name: 'WS1',
        context: 'Project #backend', // Single-word tag
      });

      // Create workstream with tag in status update
      const ws2 = await createTestWorkstream(project.id, { name: 'WS2' });

      await createTestStatusUpdate(ws2.id, {
        status: 'Update',
        note: 'Working on #backend', // Single-word tag
      });

      const response = await request(app).get('/?tags=backend');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should be case-insensitive when filtering tags', async () => {
      await createTestWorkstream(project.id, {
        name: 'WS1',
        context: 'Working on #Backend', // Single-word tag, test case-insensitivity
      });

      const response = await request(app).get('/?tags=backend');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('should return empty array when no workstreams match tags', async () => {
      await createTestWorkstream(project.id, {
        name: 'WS1',
        context: 'No tags here',
      });

      const response = await request(app).get('/?tags=backend');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should combine state and tag filters', async () => {
      await createTestWorkstream(project.id, {
        name: 'Active Backend',
        context: '#backend', // Single-word tag
        state: 'active',
      });
      await createTestWorkstream(project.id, {
        name: 'Closed Backend',
        context: '#backend', // Single-word tag
        state: 'closed',
      });
      await createTestWorkstream(project.id, {
        name: 'Active Frontend',
        context: '#frontend', // Single-word tag
        state: 'active',
      });

      const response = await request(app).get('/?state=active&tags=backend');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Active Backend');
    });

    it('should handle tags with hyphens and underscores', async () => {
      await createTestWorkstream(project.id, {
        name: 'WS1',
        context: 'Working on #backend-api, #team_alpha', // Tags separated by comma to avoid "and" word
      });

      const response1 = await request(app).get('/?tags=backend-api');
      const response2 = await request(app).get('/?tags=team_alpha');

      expect(response1.status).toBe(200);
      expect(response1.body).toHaveLength(1);
      expect(response2.status).toBe(200);
      expect(response2.body).toHaveLength(1);
    });

    it('should handle whitespace in tags query parameter', async () => {
      await createTestWorkstream(project.id, {
        name: 'WS1',
        context: '#backend', // Single-word tag
      });

      const response = await request(app).get('/?tags= backend , frontend ');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });
});
