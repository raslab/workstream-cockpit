import request from 'supertest';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  createTestProject,
  prisma,
} from '../helpers/testDb';
import { createTestApp } from '../helpers/testApp';
import resourceChangesRoutes from '../../src/routes/resourceChanges';
import {
  closeWorkstream,
  createWorkstream,
  deleteWorkstream,
  reopenWorkstream,
  updateWorkstream,
} from '../../src/services/workstreamService';
import {
  createStatusUpdate,
  deleteStatusUpdate,
  updateStatusUpdate,
} from '../../src/services/statusUpdateService';
import {
  abandonNextStepWithDetails,
  createNextStep,
  deleteNextStep,
  reorderNextSteps,
  solveNextStepWithDetails,
  updateNextStep,
} from '../../src/services/nextStepService';
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
} from '../../src/services/categoryService';
import { createTag, deleteTag, updateTag } from '../../src/services/tagService';
import { viewService } from '../../src/services/viewService';
import {
  listResourceChanges,
  logResourceChange,
  resetResourceChangeSubscribersForTest,
  subscribeToResourceChanges,
} from '../../src/services/resourceChangeService';
import type { ResourceChangePayload } from '../../src/services/resourceChangeService';

let person: any;
let project: any;
let app: any;

const defaultViewConfig = {
  filters: { categoryIds: [], tags: [], temporal: { notUpdatedToday: false } },
  sort: { field: 'updatedAt' as const, direction: 'desc' as const },
  group: { by: 'category' as const },
};

beforeAll(async () => {
  await setupTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
  resetResourceChangeSubscribersForTest();
  person = await createTestPerson({ email: 'resource-changes@example.com', name: 'Resource User' });
  project = await createTestProject(person.id, { name: 'Resource Change Project' });
  app = createTestApp(resourceChangesRoutes, person);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('resource change notifications', () => {
  it('exposes parent stream references by public number without hierarchy UUIDs', async () => {
    const parentStream = await createWorkstream({
      projectId: project.id,
      name: 'Parent stream',
    });
    const published: ResourceChangePayload[] = [];
    const unsubscribe = subscribeToResourceChanges(project.id, (change) => published.push(change));
    const substream = await createWorkstream({
      projectId: project.id,
      name: 'Sub-stream',
      parentId: parentStream.id,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    unsubscribe();

    const response = await request(app).get('/?limit=50').expect(200);
    const substreamCreated = response.body.changes.find(
      (change: { resourceType: string; resourceLabel: string; operation: string }) =>
        change.resourceType === 'workstream' &&
        change.resourceLabel === 'Sub-stream' &&
        change.operation === 'created',
    );

    expect(substreamCreated).toBeDefined();
    expect(substreamCreated).toMatchObject({
      resourceId: null,
      workstreamNumber: expect.any(Number),
    });
    expect(substreamCreated).not.toHaveProperty('projectId');
    expect(substreamCreated).not.toHaveProperty('workstreamId');
    expect(substreamCreated.metadata).toEqual({
      parentStreamNumbers: [parentStream.number],
    });
    expect(JSON.stringify(substreamCreated)).not.toContain(parentStream.id);

    const publishedSubstream = published.find(
      (change) => change.resourceLabel === 'Sub-stream' && change.operation === 'created',
    );
    expect(JSON.parse(JSON.stringify(publishedSubstream))).toEqual(substreamCreated);
    expect(JSON.stringify(publishedSubstream)).not.toContain(parentStream.id);
    expect(JSON.stringify(publishedSubstream)).not.toContain(substream.id);
  });

  it('keeps deleted sub-streams addressable by public number and previous parent chain', async () => {
    const parentStream = await createWorkstream({
      projectId: project.id,
      name: 'Deletion parent stream',
    });
    const substream = await createWorkstream({
      projectId: project.id,
      name: 'Deleted public sub-stream',
      parentId: parentStream.id,
    });
    await deleteWorkstream(substream.id, project.id);

    const response = await request(app).get('/?limit=50').expect(200);
    const deleted = response.body.changes.find(
      (change: { resourceType: string; resourceLabel: string; operation: string }) =>
        change.resourceType === 'workstream' &&
        change.resourceLabel === 'Deleted public sub-stream' &&
        change.operation === 'deleted',
    );

    expect(deleted).toMatchObject({
      resourceId: null,
      workstreamNumber: substream.number,
      metadata: { parentStreamNumbers: [parentStream.number] },
    });
    expect(deleted).not.toHaveProperty('projectId');
    expect(deleted).not.toHaveProperty('workstreamId');
    expect(JSON.stringify(deleted)).not.toContain(parentStream.id);
    expect(JSON.stringify(deleted)).not.toContain(substream.id);
  });

  it('does not publish a deletion event when the workstream deletion rolls back', async () => {
    const workstream = await createWorkstream({ projectId: project.id, name: 'Rollback stream' });
    const published: ResourceChangePayload[] = [];
    const unsubscribe = subscribeToResourceChanges(project.id, (change) => published.push(change));

    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION reject_test_workstream_delete() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced deletion rollback';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER reject_test_workstream_delete
      BEFORE DELETE ON workstreams
      FOR EACH ROW EXECUTE FUNCTION reject_test_workstream_delete();
    `);

    try {
      await expect(deleteWorkstream(workstream.id, project.id)).rejects.toThrow(
        'forced deletion rollback',
      );
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(published).toEqual([]);
      await expect(
        prisma.workstream.findUnique({ where: { id: workstream.id } }),
      ).resolves.not.toBeNull();
    } finally {
      unsubscribe();
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS reject_test_workstream_delete ON workstreams',
      );
      await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS reject_test_workstream_delete()');
    }
  });

  it('records all rendered mutable resource types and exposes recent source-neutral changes', async () => {
    const category = await createCategory({
      projectId: project.id,
      name: 'process',
      color: '#00FF00',
    });
    await updateCategory(category.id, project.id, { description: 'Recurring work' });
    await reorderCategories(project.id, [category.id]);

    const tag = await createTag({
      projectId: project.id,
      displayName: 'Platform',
      color: '#123456',
    });
    await updateTag(tag.id, project.id, { color: '#654321' });

    const view = await viewService.createView(project.id, {
      name: 'Ops view',
      config: defaultViewConfig,
      isDefault: false,
    });
    await viewService.updateView(view.id, project.id, { name: 'Ops review' });

    const stream = await createWorkstream({
      projectId: project.id,
      name: 'English fluency practice',
      categoryId: category.id,
      context: 'Practice speaking',
      initialStatus: 'Started practice',
    });
    await updateWorkstream(stream.id, project.id, {
      expectedVersion: 1,
      context: 'Practice speaking daily',
    });
    await closeWorkstream(stream.id, project.id);
    await reopenWorkstream(stream.id, project.id);

    const status = await createStatusUpdate({ workstreamId: stream.id, status: 'Practiced today' });
    await updateStatusUpdate(status.id, stream.id, { expectedVersion: 1, note: 'Added detail' });

    const firstStep = await createNextStep({
      projectId: project.id,
      workstreamId: stream.id,
      text: 'Schedule practice',
    });
    const secondStep = await createNextStep({
      projectId: project.id,
      workstreamId: stream.id,
      text: 'Review vocabulary',
    });
    await updateNextStep({
      projectId: project.id,
      workstreamId: stream.id,
      nextStepId: firstStep.id,
      text: 'Schedule speaking practice',
    });
    await reorderNextSteps({
      projectId: project.id,
      workstreamId: stream.id,
      orderedIds: [secondStep.id, firstStep.id],
    });
    await solveNextStepWithDetails({
      projectId: project.id,
      workstreamId: stream.id,
      nextStepId: firstStep.id,
    });
    await abandonNextStepWithDetails({
      projectId: project.id,
      workstreamId: stream.id,
      nextStepId: secondStep.id,
    });

    const deleteStep = await createNextStep({
      projectId: project.id,
      workstreamId: stream.id,
      text: 'Delete me',
    });
    await deleteNextStep({
      projectId: project.id,
      workstreamId: stream.id,
      nextStepId: deleteStep.id,
    });
    await deleteStatusUpdate(status.id, stream.id);

    const deletableStream = await createWorkstream({
      projectId: project.id,
      name: 'Temporary stream',
    });
    await deleteWorkstream(deletableStream.id, project.id);
    await viewService.deleteView(view.id, project.id);
    await deleteTag(tag.id, project.id);
    await deleteCategory(category.id, project.id);

    const changes = await prisma.resourceChange.findMany({
      where: { projectId: project.id },
      orderBy: [{ changedAt: 'asc' }, { id: 'asc' }],
    });

    expect(new Set(changes.map((change) => change.resourceType))).toEqual(
      new Set(['workstream', 'status_update', 'next_step', 'view', 'category', 'tag']),
    );
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceType: 'workstream',
          operation: 'created',
          resourceLabel: 'English fluency practice',
        }),
        expect.objectContaining({ resourceType: 'workstream', operation: 'updated' }),
        expect.objectContaining({ resourceType: 'workstream', operation: 'closed' }),
        expect.objectContaining({ resourceType: 'workstream', operation: 'reopened' }),
        expect.objectContaining({
          resourceType: 'workstream',
          operation: 'deleted',
          resourceLabel: 'Temporary stream',
        }),
        expect.objectContaining({ resourceType: 'status_update', operation: 'created' }),
        expect.objectContaining({ resourceType: 'status_update', operation: 'updated' }),
        expect.objectContaining({ resourceType: 'status_update', operation: 'deleted' }),
        expect.objectContaining({ resourceType: 'next_step', operation: 'created' }),
        expect.objectContaining({ resourceType: 'next_step', operation: 'updated' }),
        expect.objectContaining({ resourceType: 'next_step', operation: 'reordered' }),
        expect.objectContaining({ resourceType: 'next_step', operation: 'solved' }),
        expect.objectContaining({ resourceType: 'next_step', operation: 'abandoned' }),
        expect.objectContaining({ resourceType: 'next_step', operation: 'deleted' }),
        expect.objectContaining({
          resourceType: 'view',
          operation: 'created',
          resourceLabel: 'Ops view',
        }),
        expect.objectContaining({
          resourceType: 'view',
          operation: 'updated',
          resourceLabel: 'Ops review',
        }),
        expect.objectContaining({
          resourceType: 'view',
          operation: 'deleted',
          resourceLabel: 'Ops review',
        }),
        expect.objectContaining({
          resourceType: 'category',
          operation: 'created',
          resourceLabel: 'process',
        }),
        expect.objectContaining({
          resourceType: 'category',
          operation: 'updated',
          resourceLabel: 'process',
        }),
        expect.objectContaining({ resourceType: 'category', operation: 'reordered' }),
        expect.objectContaining({
          resourceType: 'category',
          operation: 'deleted',
          resourceLabel: 'process',
        }),
        expect.objectContaining({
          resourceType: 'tag',
          operation: 'created',
          resourceLabel: 'Platform',
        }),
        expect.objectContaining({
          resourceType: 'tag',
          operation: 'updated',
          resourceLabel: 'Platform',
        }),
        expect.objectContaining({
          resourceType: 'tag',
          operation: 'deleted',
          resourceLabel: 'Platform',
        }),
      ]),
    );

    const response = await request(app).get('/?limit=10').expect(200);
    expect(response.body.cursor).toBe(changes[changes.length - 1].id);
    expect(response.body.changes).toHaveLength(10);
    expect(response.body.changes[0]).toMatchObject({
      resourceType: 'category',
      operation: 'deleted',
      resourceLabel: 'process',
    });
    expect(response.body.changes[0]).not.toHaveProperty('source');
  });

  it('returns later changes only from the first application project', async () => {
    const first = await createCategory({ projectId: project.id, name: 'first', color: '#111111' });
    const cursor = await prisma.resourceChange.findFirstOrThrow({
      where: { resourceId: first.id },
    });
    const second = await createCategory({
      projectId: project.id,
      name: 'second',
      color: '#222222',
    });

    const sameUserSecondProject = await createTestProject(person.id, {
      name: 'Same User Second Project',
    });
    const sameUserSecondProjectCategory = await createCategory({
      projectId: sameUserSecondProject.id,
      name: 'same-user-project',
      color: '#224466',
    });

    const otherPerson = await createTestPerson({ email: 'other-resource-changes@example.com' });
    const otherProject = await createTestProject(otherPerson.id, { name: 'Other Project' });
    await createCategory({ projectId: otherProject.id, name: 'foreign', color: '#333333' });

    const response = await request(app).get(`/?after=${cursor.id}&limit=10`).expect(200);

    expect(response.body.cursor).toBeDefined();
    expect(response.body.changes).toEqual([
      expect.objectContaining({
        resourceId: second.id,
        resourceType: 'category',
        operation: 'created',
        resourceLabel: 'second',
      }),
    ]);
    expect(response.body.changes).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resourceId: sameUserSecondProjectCategory.id }),
      ]),
    );
  });

  it('publishes persisted changes to project-scoped realtime subscribers', async () => {
    const published: any[] = [];
    const unsubscribe = subscribeToResourceChanges(project.id, (change) => published.push(change));

    const category = await createCategory({
      projectId: project.id,
      name: 'realtime',
      color: '#444444',
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    unsubscribe();

    expect(published).toEqual([
      expect.objectContaining({
        resourceId: category.id,
        resourceType: 'category',
        operation: 'created',
      }),
    ]);
    expect(published[0]).not.toHaveProperty('projectId');
    expect(published[0]).not.toHaveProperty('workstreamId');
    expect(published[0]).toHaveProperty('workstreamNumber', null);
  });

  it('uses monotonic cursor order for changes sharing the same timestamp', async () => {
    const first = await logResourceChange({
      projectId: project.id,
      resourceType: 'category',
      resourceId: 'first',
      resourceLabel: 'first',
      operation: 'created',
    });
    const second = await logResourceChange({
      projectId: project.id,
      resourceType: 'category',
      resourceId: 'second',
      resourceLabel: 'second',
      operation: 'created',
    });
    await prisma.resourceChange.updateMany({
      where: { id: { in: [first.id, second.id] } },
      data: { changedAt: first.changedAt },
    });

    const afterFirst = await listResourceChanges(project.id, first.id, 10);

    expect(afterFirst.changes.map((change) => change.resourceId)).toEqual(['second']);
  });
});
