import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
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
import timelineRoutes from '../../src/routes/timeline';

let person: any;
let project: any;
let app: any;
let directWorkstreamNumber = 1000;
let directStatusUpdateNumber = 1000;

const eventsOf = (res: any) => res.body.events;

beforeAll(async () => {
  await setupTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
  directWorkstreamNumber = 1000;
  directStatusUpdateNumber = 1000;
  
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
      expect(res.body).toEqual({ events: [], nextCursor: null });
    });

    it('should return timeline with status updates, workstream creations, and closures', async () => {
      // Create tag
      const category = await createTestCategory(project.id, {
        name: 'Feature',
        color: '#FF0000',
      });

      await prisma.category.update({
        where: { id: category.id },
        data: { emoji: '🚀' },
      });

      // Create workstream
      const workstream = await createTestWorkstream(project.id, {
        name: 'Test Workstream',
        categoryId: category.id,
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
      expect(Array.isArray(eventsOf(res))).toBe(true);
      expect(eventsOf(res).length).toBe(3); // creation + status update + closure

      // Should be sorted by date descending (newest first)
      const eventTypes = eventsOf(res).map((e: any) => e.eventType);
      expect(eventTypes).toContain('status_update');
      expect(eventTypes).toContain('workstream_created');
      expect(eventTypes).toContain('workstream_closed');

      // Verify structure
      const statusUpdateEvent = eventsOf(res).find((e: any) => e.eventType === 'status_update');
      expect(statusUpdateEvent).toMatchObject({
        eventType: 'status_update',
        workstreamId: workstream.id,
        workstreamName: 'Test Workstream',
        status: 'In Progress',
        note: 'Working on it',
        category: {
          id: category.id,
          name: 'Feature',
          color: '#FF0000',
          emoji: '🚀',
        },
      });
      expect(statusUpdateEvent).toHaveProperty('createdAt');
      expect(statusUpdateEvent).toHaveProperty('id');
      expect(statusUpdateEvent.id).toMatch(/^status-/);
    });

    it('should return each status update impact for timeline badges', async () => {
      const workstream = await createTestWorkstream(project.id, {
        name: 'Impact Workstream',
      });

      await createTestStatusUpdate(workstream.id, {
        status: 'Active movement',
        impact: 'active',
      });
      await createTestStatusUpdate(workstream.id, {
        status: 'Passive note',
        impact: 'info',
      });
      await createTestStatusUpdate(workstream.id, {
        status: 'Creation context',
        impact: 'initial',
      });

      const res = await request(app).get('/').query({ eventTypes: 'status_update' });

      expect(res.status).toBe(200);
      const impactsByStatus = Object.fromEntries(
        eventsOf(res).map((event: any) => [event.status, event.impact]),
      );
      expect(impactsByStatus).toMatchObject({
        'Active movement': 'active',
        'Passive note': 'info',
        'Creation context': 'initial',
      });
    });

    it('should filter timeline by startDate', async () => {
      const workstream = await prisma.workstream.create({
        data: {
          name: 'Test Workstream',
          projectId: project.id,
          number: directWorkstreamNumber++,
          createdAt: new Date('2024-01-01'),
        },
      });

      // Old status update
      await prisma.statusUpdate.create({
        data: {
          status: 'Old Status',
          workstreamId: workstream.id,
          projectId: project.id,
          number: directStatusUpdateNumber++,
          createdAt: new Date('2024-01-01'),
        },
      });

      // Recent status update
      await prisma.statusUpdate.create({
        data: {
          status: 'Recent Status',
          workstreamId: workstream.id,
          projectId: project.id,
          number: directStatusUpdateNumber++,
          createdAt: new Date('2024-06-01'),
        },
      });

      const res = await request(app)
        .get('/')
        .query({ startDate: '2024-05-01' });

      expect(res.status).toBe(200);
      const statuses = eventsOf(res)
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
          number: directWorkstreamNumber++,
          createdAt: new Date('2024-01-01'),
        },
      });

      // Old status update
      await prisma.statusUpdate.create({
        data: {
          status: 'Old Status',
          workstreamId: workstream.id,
          projectId: project.id,
          number: directStatusUpdateNumber++,
          createdAt: new Date('2024-01-15'),
        },
      });

      // Recent status update
      await prisma.statusUpdate.create({
        data: {
          status: 'Recent Status',
          workstreamId: workstream.id,
          projectId: project.id,
          number: directStatusUpdateNumber++,
          createdAt: new Date('2024-06-01'),
        },
      });

      const res = await request(app)
        .get('/')
        .query({ endDate: '2024-02-01' });

      expect(res.status).toBe(200);
      const statuses = eventsOf(res)
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
          number: directWorkstreamNumber++,
          createdAt: new Date('2024-01-01'),
        },
      });

      // Before range
      await prisma.statusUpdate.create({
        data: {
          status: 'Too Early',
          workstreamId: workstream.id,
          projectId: project.id,
          number: directStatusUpdateNumber++,
          createdAt: new Date('2024-01-01'),
        },
      });

      // Within range
      await prisma.statusUpdate.create({
        data: {
          status: 'In Range',
          workstreamId: workstream.id,
          projectId: project.id,
          number: directStatusUpdateNumber++,
          createdAt: new Date('2024-03-15'),
        },
      });

      // After range
      await prisma.statusUpdate.create({
        data: {
          status: 'Too Late',
          workstreamId: workstream.id,
          projectId: project.id,
          number: directStatusUpdateNumber++,
          createdAt: new Date('2024-06-01'),
        },
      });

      const res = await request(app)
        .get('/')
        .query({ startDate: '2024-03-01', endDate: '2024-04-01' });

      expect(res.status).toBe(200);
      const statuses = eventsOf(res)
        .filter((e: any) => e.eventType === 'status_update')
        .map((e: any) => e.status);

      expect(statuses).toEqual(['In Range']);
    });

    it('should filter timeline by single tag', async () => {
      const category1 = await createTestCategory(project.id, {
        name: 'Feature',
        color: '#FF0000',
        sortOrder: 0,
      });

      const category2 = await createTestCategory(project.id, {
        name: 'Bug',
        color: '#00FF00',
        sortOrder: 1,
      });

      const workstream1 = await createTestWorkstream(project.id, {
        name: 'Feature Workstream',
        categoryId: category1.id,
      });

      const workstream2 = await createTestWorkstream(project.id, {
        name: 'Bug Workstream',
        categoryId: category2.id,
      });

      await createTestStatusUpdate(workstream1.id, {
        status: 'Feature Status',
      });

      await createTestStatusUpdate(workstream2.id, {
        status: 'Bug Status',
      });

      const res = await request(app)
        .get('/')
        .query({ categoryIds: category1.id });

      expect(res.status).toBe(200);
      const workstreamNames = eventsOf(res).map((e: any) => e.workstreamName);
      expect(workstreamNames).toContain('Feature Workstream');
      expect(workstreamNames).not.toContain('Bug Workstream');
    });

    it('should filter timeline by multiple tags', async () => {
      const category1 = await createTestCategory(project.id, {
        name: 'Feature',
        color: '#FF0000',
        sortOrder: 0,
      });

      const category2 = await createTestCategory(project.id, {
        name: 'Bug',
        color: '#00FF00',
        sortOrder: 1,
      });

      const category3 = await createTestCategory(project.id, {
        name: 'Documentation',
        color: '#0000FF',
        sortOrder: 2,
      });

      const workstream1 = await createTestWorkstream(project.id, {
        name: 'Feature Workstream',
        categoryId: category1.id,
      });

      const workstream2 = await createTestWorkstream(project.id, {
        name: 'Bug Workstream',
        categoryId: category2.id,
      });

      const workstream3 = await createTestWorkstream(project.id, {
        name: 'Docs Workstream',
        categoryId: category3.id,
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
        .query({ categoryIds: `${category1.id},${category2.id}` });

      expect(res.status).toBe(200);
      const workstreamNames = eventsOf(res).map((e: any) => e.workstreamName);
      expect(workstreamNames).toContain('Feature Workstream');
      expect(workstreamNames).toContain('Bug Workstream');
      expect(workstreamNames).not.toContain('Docs Workstream');
    });

    it('should combine date and tag filters', async () => {
      const category1 = await createTestCategory(project.id, {
        name: 'Feature',
        color: '#FF0000',
        sortOrder: 0,
      });

      const category2 = await createTestCategory(project.id, {
        name: 'Bug',
        color: '#00FF00',
        sortOrder: 1,
      });

      const workstream1 = await prisma.workstream.create({
        data: {
          name: 'Old Feature',
          projectId: project.id,
          number: directWorkstreamNumber++,
          categoryId: category1.id,
          createdAt: new Date('2024-01-01'),
        },
      });

      const workstream2 = await prisma.workstream.create({
        data: {
          name: 'Recent Feature',
          projectId: project.id,
          number: directWorkstreamNumber++,
          categoryId: category1.id,
          createdAt: new Date('2024-05-01'),
        },
      });

      const workstream3 = await prisma.workstream.create({
        data: {
          name: 'Recent Bug',
          projectId: project.id,
          number: directWorkstreamNumber++,
          categoryId: category2.id,
          createdAt: new Date('2024-05-15'),
        },
      });

      await prisma.statusUpdate.create({
        data: {
          status: 'Old Feature Status',
          workstreamId: workstream1.id,
          projectId: project.id,
          number: directStatusUpdateNumber++,
          createdAt: new Date('2024-01-15'),
        },
      });

      await prisma.statusUpdate.create({
        data: {
          status: 'Recent Feature Status',
          workstreamId: workstream2.id,
          projectId: project.id,
          number: directStatusUpdateNumber++,
          createdAt: new Date('2024-05-10'),
        },
      });

      await prisma.statusUpdate.create({
        data: {
          status: 'Recent Bug Status',
          workstreamId: workstream3.id,
          projectId: project.id,
          number: directStatusUpdateNumber++,
          createdAt: new Date('2024-05-20'),
        },
      });

      // Filter for category1 (Feature) after May 1st
      const res = await request(app)
        .get('/')
        .query({ categoryIds: category1.id, startDate: '2024-05-01' });

      expect(res.status).toBe(200);
      const workstreamNames = eventsOf(res).map((e: any) => e.workstreamName);
      expect(workstreamNames).toContain('Recent Feature');
      expect(workstreamNames).not.toContain('Old Feature');
      expect(workstreamNames).not.toContain('Recent Bug');
    });

    it('should default to the last 7 days when no date filters are provided', async () => {
      const workstream = await prisma.workstream.create({
        data: {
          name: 'Default Range Workstream',
          projectId: project.id,
          number: directWorkstreamNumber++,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.statusUpdate.create({
        data: {
          status: 'Too Old',
          workstreamId: workstream.id,
          projectId: project.id,
          number: directStatusUpdateNumber++,
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.statusUpdate.create({
        data: {
          status: 'Recent Enough',
          workstreamId: workstream.id,
          projectId: project.id,
          number: directStatusUpdateNumber++,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      });

      const res = await request(app).get('/').query({ eventTypes: 'status_update' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('events');
      expect(res.body).toHaveProperty('nextCursor');
      const statuses = eventsOf(res).map((e: any) => e.status);
      expect(statuses).toContain('Recent Enough');
      expect(statuses).not.toContain('Too Old');
    });

    it('should reject startDate after endDate', async () => {
      const res = await request(app)
        .get('/')
        .query({ startDate: '2024-02-01', endDate: '2024-01-01' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'startDate must be before or equal to endDate');
    });

    it('should reject explicit date ranges longer than 366 days', async () => {
      const res = await request(app)
        .get('/')
        .query({ startDate: '2024-01-01', endDate: '2025-01-02' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Date range must not exceed 366 days');
    });

    it('should reject loose date parsing', async () => {
      const res = await request(app)
        .get('/')
        .query({ startDate: '2024-1-1' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid startDate format');
    });

    it('should paginate timeline events with a cursor', async () => {
      const workstream = await createTestWorkstream(project.id, { name: 'Paginated Workstream' });
      for (let i = 0; i < 3; i += 1) {
        await prisma.statusUpdate.create({
          data: {
            status: `Page Status ${i}`,
            workstreamId: workstream.id,
            projectId: project.id,
            number: directStatusUpdateNumber++,
            createdAt: new Date(`2024-06-0${i + 1}T00:00:00.000Z`),
          },
        });
      }

      const first = await request(app)
        .get('/')
        .query({ startDate: '2024-06-01', endDate: '2024-06-30', eventTypes: 'status_update', limit: '2' });

      expect(first.status).toBe(200);
      expect(eventsOf(first).map((e: any) => e.status)).toEqual(['Page Status 2', 'Page Status 1']);
      expect(first.body.nextCursor).toEqual(expect.any(String));

      const second = await request(app)
        .get('/')
        .query({ startDate: '2024-06-01', endDate: '2024-06-30', eventTypes: 'status_update', limit: '2', cursor: first.body.nextCursor });

      expect(second.status).toBe(200);
      expect(eventsOf(second).map((e: any) => e.status)).toEqual(['Page Status 0']);
      expect(second.body.nextCursor).toBeNull();
    });

    it('should paginate all events when many share the same timestamp', async () => {
      const workstream = await createTestWorkstream(project.id, { name: 'Same Timestamp Workstream' });
      const sharedCreatedAt = new Date('2024-06-15T12:00:00.000Z');
      for (let i = 0; i < 5; i += 1) {
        await prisma.statusUpdate.create({
          data: {
            status: `Same Timestamp ${i}`,
            workstreamId: workstream.id,
            projectId: project.id,
            number: directStatusUpdateNumber++,
            createdAt: sharedCreatedAt,
          },
        });
      }

      const baseQuery = { startDate: '2024-06-01', endDate: '2024-06-30', eventTypes: 'status_update' };
      const all = await request(app).get('/').query({ ...baseQuery, limit: '10' });
      expect(all.status).toBe(200);
      const expectedStatuses = eventsOf(all).map((e: any) => e.status);
      expect(expectedStatuses).toHaveLength(5);

      const first = await request(app).get('/').query({ ...baseQuery, limit: '2' });
      expect(first.status).toBe(200);
      expect(first.body.nextCursor).toEqual(expect.any(String));

      const second = await request(app).get('/').query({ ...baseQuery, limit: '2', cursor: first.body.nextCursor });
      expect(second.status).toBe(200);
      expect(second.body.nextCursor).toEqual(expect.any(String));

      const third = await request(app).get('/').query({ ...baseQuery, limit: '2', cursor: second.body.nextCursor });
      expect(third.status).toBe(200);
      expect(third.body.nextCursor).toBeNull();

      const pagedStatuses = [...eventsOf(first), ...eventsOf(second), ...eventsOf(third)].map((e: any) => e.status);
      expect(pagedStatuses).toEqual(expectedStatuses);
    });

    it('should bound single-sided startDate filters to 366 days', async () => {
      const workstream = await createTestWorkstream(project.id, { name: 'Bounded Start Workstream' });
      await prisma.statusUpdate.create({ data: { status: 'Inside bounded range', workstreamId: workstream.id, projectId: project.id, number: directStatusUpdateNumber++, createdAt: new Date('2024-06-01T00:00:00.000Z') } });
      await prisma.statusUpdate.create({ data: { status: 'Outside bounded range', workstreamId: workstream.id, projectId: project.id, number: directStatusUpdateNumber++, createdAt: new Date('2025-02-01T00:00:00.000Z') } });

      const res = await request(app)
        .get('/')
        .query({ startDate: '2024-01-01', eventTypes: 'status_update', limit: '10' });

      expect(res.status).toBe(200);
      const statuses = eventsOf(res).map((e: any) => e.status);
      expect(statuses).toContain('Inside bounded range');
      expect(statuses).not.toContain('Outside bounded range');
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

    it('should handle empty categoryIds gracefully', async () => {
      const workstream = await createTestWorkstream(project.id, {
        name: 'Test Workstream',
      });

      await createTestStatusUpdate(workstream.id, {
        status: 'Test Status',
      });

      const res = await request(app)
        .get('/')
        .query({ categoryIds: '' });

      expect(res.status).toBe(200);
      expect(eventsOf(res).length).toBeGreaterThan(0);
    });

    it('should sort timeline events by date descending (newest first)', async () => {
      const workstream = await prisma.workstream.create({
        data: {
          name: 'Test Workstream',
          projectId: project.id,
          number: directWorkstreamNumber++,
          createdAt: new Date('2024-01-01'),
        },
      });

      await prisma.statusUpdate.create({
        data: {
          status: 'First',
          workstreamId: workstream.id,
          projectId: project.id,
          number: directStatusUpdateNumber++,
          createdAt: new Date('2024-01-01'),
        },
      });

      await prisma.statusUpdate.create({
        data: {
          status: 'Third',
          workstreamId: workstream.id,
          projectId: project.id,
          number: directStatusUpdateNumber++,
          createdAt: new Date('2024-03-01'),
        },
      });

      await prisma.statusUpdate.create({
        data: {
          status: 'Second',
          workstreamId: workstream.id,
          projectId: project.id,
          number: directStatusUpdateNumber++,
          createdAt: new Date('2024-02-01'),
        },
      });

      const res = await request(app)
        .get('/')
        .query({ startDate: '2024-01-01', endDate: '2024-03-31' });

      expect(res.status).toBe(200);
      const statuses = eventsOf(res)
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
      const workstreamNames = eventsOf(res).map((e: any) => e.workstreamName);
      expect(workstreamNames).toContain('Test Workstream');
      expect(workstreamNames).not.toContain('Other Workstream');
    });
  });
});

