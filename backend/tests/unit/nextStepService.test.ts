import {
  abandonNextStep,
  createNextStep,
  listNextSteps,
  reorderNextSteps,
  solveNextStep,
  updateNextStep,
} from '../../src/services/nextStepService';
import { getWorkstreamById } from '../../src/services/workstreamService';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  createTestProject,
  createTestWorkstream,
  prisma,
} from '../helpers/testDb';

beforeAll(async () => {
  await setupTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('NextStepService', () => {
  async function seedStream() {
    const person = await createTestPerson();
    const project = await createTestProject(person.id);
    const workstream = await createTestWorkstream(project.id, { name: 'Ship beta' });
    return { project, workstream };
  }

  it('creates, edits, lists, and reorders stream-local next steps without changing activity freshness', async () => {
    const { project, workstream } = await seedStream();
    const before = await getWorkstreamById(workstream.id, project.id);

    const first = await createNextStep({
      projectId: project.id,
      workstreamId: workstream.id,
      text: 'Draft launch note',
    });
    const second = await createNextStep({
      projectId: project.id,
      workstreamId: workstream.id,
      text: 'Book review slot',
    });

    await updateNextStep({
      projectId: project.id,
      workstreamId: workstream.id,
      nextStepId: second.id,
      text: 'Book product review slot',
    });
    await reorderNextSteps({
      projectId: project.id,
      workstreamId: workstream.id,
      orderedIds: [second.id, first.id],
    });

    const steps = await listNextSteps(project.id, workstream.id);
    expect(steps.map((step) => step.text)).toEqual([
      'Book product review slot',
      'Draft launch note',
    ]);
    expect(steps.map((step) => step.sortOrder)).toEqual([0, 1]);

    const after = await getWorkstreamById(workstream.id, project.id);
    expect(after?.lastDirectUpdateAt).toEqual(before?.lastDirectUpdateAt ?? null);
    expect(after?.nextStepCount).toBe(2);
  });

  it('solves a next step atomically by removing it and creating an active update', async () => {
    const { project, workstream } = await seedStream();
    const step = await createNextStep({
      projectId: project.id,
      workstreamId: workstream.id,
      text: 'Buy sealant',
    });

    const update = await solveNextStep({
      projectId: project.id,
      workstreamId: workstream.id,
      nextStepId: step.id,
    });

    expect(update.status).toBe('Solved next step: Buy sealant');
    expect(update.impact).toBe('active');
    await expect(prisma.nextStep.findUnique({ where: { id: step.id } })).resolves.toBeNull();
    await expect(listNextSteps(project.id, workstream.id)).resolves.toEqual([]);

    const refreshed = await getWorkstreamById(workstream.id, project.id);
    expect(refreshed?.latestStatus?.id).toBe(update.id);
    expect(refreshed?.lastDirectUpdateAt?.toISOString()).toBe(update.createdAt.toISOString());
    expect(refreshed?.nextStepCount).toBe(0);
  });

  it('abandons a next step atomically by removing it and creating an info update that does not refresh activity', async () => {
    const { project, workstream } = await seedStream();
    const activeUpdate = await prisma.statusUpdate.create({
      data: {
        projectId: project.id,
        number: 4000,
        workstreamId: workstream.id,
        status: 'Real movement',
        impact: 'active',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    });
    const step = await createNextStep({
      projectId: project.id,
      workstreamId: workstream.id,
      text: 'Buy sealant',
    });

    const infoUpdate = await abandonNextStep({
      projectId: project.id,
      workstreamId: workstream.id,
      nextStepId: step.id,
    });

    expect(infoUpdate.status).toBe('Abandoned next step: Buy sealant');
    expect(infoUpdate.impact).toBe('info');
    await expect(prisma.nextStep.findUnique({ where: { id: step.id } })).resolves.toBeNull();

    const refreshed = await getWorkstreamById(workstream.id, project.id);
    expect(refreshed?.latestStatus?.id).toBe(activeUpdate.id);
    expect(refreshed?.lastDirectUpdateAt?.toISOString()).toBe(activeUpdate.createdAt.toISOString());
  });
});
