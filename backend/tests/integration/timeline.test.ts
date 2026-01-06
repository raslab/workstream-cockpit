import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  createTestProject,
  createTestTag,
  createTestWorkstream,
  createTestStatusUpdate,
  prisma,
} from '../helpers/testDb';
import timelineRoutes from '../../src/routes/timeline';

let person: any;
let project: any;
let app: any;

beforeAll(async () => {
  await setupTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
  
  // Create test user and project
  person = await createTestPerson({ email: 'timeline@test.com', name: 'Timeline User' });
  project = await createTestProject(person.id, { name: 'Test Project' });
  
  // Create app with authenticated user
  app = createTestApp(timelineRoutes, person);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('Timeline API Integration Tests', () => {

  describe('GET /api/timeline', () => {
    it('should return empty array when user has no projects', async () => {
      // Delete the project created in beforeEach
      await prisma.project.deleteMany({ where: { personId: person.id } });

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return timeline with status updates, workstream creations, and closures', async () => {
      // Create tag
      const tag = await createTestTag(project.id, {
        name: 'Feature',
        color: '#FF0000',
      });

      await prisma.tag.update({
        where: { id: tag.id },
        data: { emoji: '🚀' },
      });

      // Create workstream
      const workstream = await createTestWorkstream(project.id, {
        name: 'Test Workstream',
        tagId: tag.id,
      });

      // Create status update
      await createTestStatusUpdate(workstream.id, {
        status: 'In Progress',
        note: 'Working on it',
      });

      // Close workstream (creates closure event)
      await prisma.workstream.update({
        where: { id: workstream.id },
        data: { closedAt: new Date() },
      });

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3); // creation + status update + closure

      // Should be sorted by date descending (newest first)
      const eventTypes = res.body.map((e: any) => e.eventType);
      expect(eventTypes).toContain('status_update');
      expect(eventTypes).toContain('workstream_created');
      expect(eventTypes).toContain('workstream_closed');

      // Verify structure
      const statusUpdateEvent = res.body.find((e: any) => e.eventType === 'status_update');
      expect(statusUpdateEvent).toMatchObject({
        eventType: 'status_update',
        workstreamId: workstream.id,
        workstreamName: 'Test Workstream',
        status: 'In Progress',
        note: 'Working on it',
        tag: {
          id: tag.id,
          name: 'Feature',
          color: '#FF0000',
          emoji: '🚀',
        },
      });
      expect(statusUpdateEvent).toHaveProperty('createdAt');
      expect(statusUpdateEvent).toHaveProperty('id');
      expect(statusUpdateEvent.id).toMatch(/^status-/);
    });

    it('should filter timeline by startDate', async () => {
      const workstream = await prisma.workstream.create({
        data: {
          name: 'Test Workstream',
          projectId: project.id,
          createdAt: new Date('2024-01-01'),
        },
      });

      // Old status update
      await prisma.statusUpdate.create({
        data: {
          status: 'Old Status',
          workstreamId: workstream.id,
          createdAt: new Date('2024-01-01'),
        },
      });

      // Recent status update
      await prisma.statusUpdate.create({
        data: {
          status: 'Recent Status',
          workstreamId: workstream.id,
          createdAt: new Date('2024-06-01'),
        },
      });

      const res = await request(app)
        .get('/')
        .query({ startDate: '2024-05-01' });

      expect(res.status).toBe(200);
      const statuses = res.body
        .filter((e: any) => e.eventType === 'status_update')
        .map((e: any) => e.status);

      expect(statuses).toContain('Recent Status');
      expect(statuses).not.toContain('Old Status');
    });

    it('should filter timeline by endDate', async () => {
      const workstream = await prisma.workstream.create({
        data: {
          name: 'Test Workstream',
          projectId: project.id,
          createdAt: new Date('2024-01-01'),
        },
      });

      // Old status update
      await prisma.statusUpdate.create({
        data: {
          status: 'Old Status',
          workstreamId: workstream.id,
          createdAt: new Date('2024-01-15'),
        },
      });

      // Recent status update
      await prisma.statusUpdate.create({
        data: {
          status: 'Recent Status',
          workstreamId: workstream.id,
          createdAt: new Date('2024-06-01'),
        },
      });

      const res = await request(app)
        .get('/')
        .query({ endDate: '2024-02-01' });

      expect(res.status).toBe(200);
      const statuses = res.body
        .filter((e: any) => e.eventType === 'status_update')
        .map((e: any) => e.status);

      expect(statuses).toContain('Old Status');
      expect(statuses).not.toContain('Recent Status');
    });

    it('should filter timeline by date range', async () => {
      const workstream = await prisma.workstream.create({
        data: {
          name: 'Test Workstream',
          projectId: project.id,
          createdAt: new Date('2024-01-01'),
        },
      });

      // Before range
      await prisma.statusUpdate.create({
        data: {
          status: 'Too Early',
          workstreamId: workstream.id,
          createdAt: new Date('2024-01-01'),
        },
      });

      // Within range
      await prisma.statusUpdate.create({
        data: {
          status: 'In Range',
          workstreamId: workstream.id,
          createdAt: new Date('2024-03-15'),
        },
      });

      // After range
      await prisma.statusUpdate.create({
        data: {
          status: 'Too Late',
          workstreamId: workstream.id,
          createdAt: new Date('2024-06-01'),
        },
      });

      const res = await request(app)
        .get('/')
        .query({ startDate: '2024-03-01', endDate: '2024-04-01' });

      expect(res.status).toBe(200);
      const statuses = res.body
        .filter((e: any) => e.eventType === 'status_update')
        .map((e: any) => e.status);

      expect(statuses).toEqual(['In Range']);
    });

    it('should filter timeline by single tag', async () => {
      const tag1 = await createTestTag(project.id, {
        name: 'Feature',
        color: '#FF0000',
        sortOrder: 0,
      });

      const tag2 = await createTestTag(project.id, {
        name: 'Bug',
        color: '#00FF00',
        sortOrder: 1,
      });

      const workstream1 = await createTestWorkstream(project.id, {
        name: 'Feature Workstream',
        tagId: tag1.id,
      });

      const workstream2 = await createTestWorkstream(project.id, {
        name: 'Bug Workstream',
        tagId: tag2.id,
      });

      await createTestStatusUpdate(workstream1.id, {
        status: 'Feature Status',
      });

      await createTestStatusUpdate(workstream2.id, {
        status: 'Bug Status',
      });

      const res = await request(app)
        .get('/')
        .query({ tagIds: tag1.id });

      expect(res.status).toBe(200);
      const workstreamNames = res.body.map((e: any) => e.workstreamName);
      expect(workstreamNames).toContain('Feature Workstream');
      expect(workstreamNames).not.toContain('Bug Workstream');
    });

    it('should filter timeline by multiple tags', async () => {
      const tag1 = await createTestTag(project.id, {
        name: 'Feature',
        color: '#FF0000',
        sortOrder: 0,
      });

      const tag2 = await createTestTag(project.id, {
        name: 'Bug',
        color: '#00FF00',
        sortOrder: 1,
      });

      const tag3 = await createTestTag(project.id, {
        name: 'Documentation',
        color: '#0000FF',
        sortOrder: 2,
      });

      const workstream1 = await createTestWorkstream(project.id, {
        name: 'Feature Workstream',
        tagId: tag1.id,
      });

      const workstream2 = await createTestWorkstream(project.id, {
        name: 'Bug Workstream',
        tagId: tag2.id,
      });

      const workstream3 = await createTestWorkstream(project.id, {
        name: 'Docs Workstream',
        tagId: tag3.id,
      });

      await createTestStatusUpdate(workstream1.id, {
        status: 'Feature Status',
      });

      await createTestStatusUpdate(workstream2.id, {
        status: 'Bug Status',
      });

      await createTestStatusUpdate(workstream3.id, {
        status: 'Docs Status',
      });

      const res = await request(app)
        .get('/')
        .query({ tagIds: `${tag1.id},${tag2.id}` });

      expect(res.status).toBe(200);
      const workstreamNames = res.body.map((e: any) => e.workstreamName);
      expect(workstreamNames).toContain('Feature Workstream');
      expect(workstreamNames).toContain('Bug Workstream');
      expect(workstreamNames).not.toContain('Docs Workstream');
    });

    it('should combine date and tag filters', async () => {
      const tag1 = await createTestTag(project.id, {
        name: 'Feature',
        color: '#FF0000',
        sortOrder: 0,
      });

      const tag2 = await createTestTag(project.id, {
        name: 'Bug',
        color: '#00FF00',
        sortOrder: 1,
      });

      const workstream1 = await prisma.workstream.create({
        data: {
          name: 'Old Feature',
          projectId: project.id,
          tagId: tag1.id,
          createdAt: new Date('2024-01-01'),
        },
      });

      const workstream2 = await prisma.workstream.create({
        data: {
          name: 'Recent Feature',
          projectId: project.id,
          tagId: tag1.id,
          createdAt: new Date('2024-05-01'),
        },
      });

      const workstream3 = await prisma.workstream.create({
        data: {
          name: 'Recent Bug',
          projectId: project.id,
          tagId: tag2.id,
          createdAt: new Date('2024-05-15'),
        },
      });

      await prisma.statusUpdate.create({
        data: {
          status: 'Old Feature Status',
          workstreamId: workstream1.id,
          createdAt: new Date('2024-01-15'),
        },
      });

      await prisma.statusUpdate.create({
        data: {
          status: 'Recent Feature Status',
          workstreamId: workstream2.id,
          createdAt: new Date('2024-05-10'),
        },
      });

      await prisma.statusUpdate.create({
        data: {
          status: 'Recent Bug Status',
          workstreamId: workstream3.id,
          createdAt: new Date('2024-05-20'),
        },
      });

      // Filter for tag1 (Feature) after May 1st
      const res = await request(app)
        .get('/')
        .query({ tagIds: tag1.id, startDate: '2024-05-01' });

      expect(res.status).toBe(200);
      const workstreamNames = res.body.map((e: any) => e.workstreamName);
      expect(workstreamNames).toContain('Recent Feature');
      expect(workstreamNames).not.toContain('Old Feature');
      expect(workstreamNames).not.toContain('Recent Bug');
    });

    it('should return 400 for invalid startDate format', async () => {
      const res = await request(app)
        .get('/')
        .query({ startDate: 'invalid-date' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid startDate format');
    });

    it('should return 400 for invalid endDate format', async () => {
      const res = await request(app)
        .get('/')
        .query({ endDate: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid endDate format');
    });

    it('should handle empty tagIds gracefully', async () => {
      const workstream = await createTestWorkstream(project.id, {
        name: 'Test Workstream',
      });

      await createTestStatusUpdate(workstream.id, {
        status: 'Test Status',
      });

      const res = await request(app)
        .get('/')
        .query({ tagIds: '' });

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should sort timeline events by date descending (newest first)', async () => {
      const workstream = await prisma.workstream.create({
        data: {
          name: 'Test Workstream',
          projectId: project.id,
          createdAt: new Date('2024-01-01'),
        },
      });

      await prisma.statusUpdate.create({
        data: {
          status: 'First',
          workstreamId: workstream.id,
          createdAt: new Date('2024-01-01'),
        },
      });

      await prisma.statusUpdate.create({
        data: {
          status: 'Third',
          workstreamId: workstream.id,
          createdAt: new Date('2024-03-01'),
        },
      });

      await prisma.statusUpdate.create({
        data: {
          status: 'Second',
          workstreamId: workstream.id,
          createdAt: new Date('2024-02-01'),
        },
      });

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      const statuses = res.body
        .filter((e: any) => e.eventType === 'status_update')
        .map((e: any) => e.status);

      expect(statuses).toEqual(['Third', 'Second', 'First']);
    });
  });

  describe('Data Isolation', () => {
    it('should only show timeline for authenticated user\'s projects', async () => {
      // Create another user
      const otherUser = await createTestPerson({
        email: 'other@test.com',
        name: 'Other User',
      });

      // Create project for other user
      const otherProject = await createTestProject(otherUser.id, {
        name: 'Other Project',
      });

      const otherWorkstream = await createTestWorkstream(otherProject.id, {
        name: 'Other Workstream',
      });

      await createTestStatusUpdate(otherWorkstream.id, {
        status: 'Other Status',
      });

      // Create workstream for test user's project
      const workstream = await createTestWorkstream(project.id, {
        name: 'Test Workstream',
      });

      await createTestStatusUpdate(workstream.id, {
        status: 'Test Status',
      });

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      const workstreamNames = res.body.map((e: any) => e.workstreamName);
      expect(workstreamNames).toContain('Test Workstream');
      expect(workstreamNames).not.toContain('Other Workstream');
    });
  });
});
