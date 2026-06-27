import { NextStep, Prisma, PrismaClient, StatusUpdate } from '@prisma/client';
import { allocateStatusUpdateNumber } from './statusUpdateService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
type PrismaTx = Prisma.TransactionClient;
type PrismaExecutor = PrismaClient | PrismaTx;

export interface CreateNextStepInput {
  projectId: string;
  workstreamId: string;
  text: string;
}

export interface UpdateNextStepInput extends CreateNextStepInput {
  nextStepId: string;
}

export interface ReorderNextStepsInput {
  projectId: string;
  workstreamId: string;
  orderedIds: string[];
}

export interface ResolveNextStepInput {
  projectId: string;
  workstreamId: string;
  nextStepId: string;
}

export interface ResolvedNextStepResult {
  nextStep: NextStep;
  update: StatusUpdate;
}

function cleanText(text: string): string {
  const value = text.trim();
  if (!value) throw new Error('Next step text is required');
  if (value.length > 500) throw new Error('Next step text must be 500 characters or less');
  return value;
}

async function assertWorkstream(client: PrismaExecutor, projectId: string, workstreamId: string): Promise<void> {
  const workstream = await client.workstream.findFirst({ where: { id: workstreamId, projectId }, select: { id: true } });
  if (!workstream) throw new Error('Workstream not found');
}

async function nextSortOrder(client: PrismaExecutor, workstreamId: string): Promise<number> {
  const latest = await client.nextStep.findFirst({
    where: { workstreamId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  return latest ? latest.sortOrder + 1 : 0;
}

export async function listNextSteps(projectId: string, workstreamId: string): Promise<NextStep[]> {
  await assertWorkstream(prisma, projectId, workstreamId);
  return prisma.nextStep.findMany({
    where: { projectId, workstreamId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  });
}

export async function createNextStep(input: CreateNextStepInput): Promise<NextStep> {
  try {
    return await prisma.$transaction(async (tx) => {
      await assertWorkstream(tx, input.projectId, input.workstreamId);
      return tx.nextStep.create({
        data: {
          projectId: input.projectId,
          workstreamId: input.workstreamId,
          text: cleanText(input.text),
          sortOrder: await nextSortOrder(tx, input.workstreamId),
        },
      });
    });
  } catch (error) {
    logger.error('Error creating next step:', error);
    throw error;
  }
}

export async function updateNextStep(input: UpdateNextStepInput): Promise<NextStep> {
  try {
    return await prisma.$transaction(async (tx) => {
      await assertWorkstream(tx, input.projectId, input.workstreamId);
      const nextStep = await tx.nextStep.findFirst({
        where: { id: input.nextStepId, projectId: input.projectId, workstreamId: input.workstreamId },
      });
      if (!nextStep) throw new Error('Next step not found');
      return tx.nextStep.update({
        where: { id: input.nextStepId },
        data: { text: cleanText(input.text) },
      });
    });
  } catch (error) {
    logger.error('Error updating next step:', error);
    throw error;
  }
}

export async function reorderNextSteps(input: ReorderNextStepsInput): Promise<NextStep[]> {
  try {
    return await prisma.$transaction(async (tx) => {
      await assertWorkstream(tx, input.projectId, input.workstreamId);
      const existing = await tx.nextStep.findMany({
        where: { projectId: input.projectId, workstreamId: input.workstreamId },
        select: { id: true },
      });
      const existingIds = existing.map((step) => step.id).sort();
      const orderedIds = [...input.orderedIds].sort();
      if (existingIds.length !== orderedIds.length || existingIds.some((id, index) => id !== orderedIds[index])) {
        throw new Error('Reorder must include every open next step exactly once');
      }
      await Promise.all(
        input.orderedIds.map((id, sortOrder) =>
          tx.nextStep.update({ where: { id }, data: { sortOrder } }),
        ),
      );
      return tx.nextStep.findMany({
        where: { projectId: input.projectId, workstreamId: input.workstreamId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      });
    });
  } catch (error) {
    logger.error('Error reordering next steps:', error);
    throw error;
  }
}

async function resolveNextStep(input: ResolveNextStepInput, impact: 'active' | 'passive', statusPrefix: string): Promise<ResolvedNextStepResult> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        await assertWorkstream(tx, input.projectId, input.workstreamId);
        const nextStep = await tx.nextStep.findFirst({
          where: { id: input.nextStepId, projectId: input.projectId, workstreamId: input.workstreamId },
        });
        if (!nextStep) throw new Error('Next step not found');
        await tx.nextStep.delete({ where: { id: nextStep.id } });
        const update = await tx.statusUpdate.create({
          data: {
            projectId: input.projectId,
            number: await allocateStatusUpdateNumber(tx, input.projectId),
            workstreamId: input.workstreamId,
            status: `${statusPrefix}: ${nextStep.text}`,
            impact,
          },
        });
        return { nextStep, update };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    logger.error('Error resolving next step:', error);
    throw error;
  }
}

export async function solveNextStep(input: ResolveNextStepInput): Promise<StatusUpdate> {
  return (await resolveNextStep(input, 'active', 'Solved next step')).update;
}

export async function abandonNextStep(input: ResolveNextStepInput): Promise<StatusUpdate> {
  return (await resolveNextStep(input, 'passive', 'Abandoned next step')).update;
}

export async function solveNextStepWithDetails(input: ResolveNextStepInput): Promise<ResolvedNextStepResult> {
  return resolveNextStep(input, 'active', 'Solved next step');
}

export async function abandonNextStepWithDetails(input: ResolveNextStepInput): Promise<ResolvedNextStepResult> {
  return resolveNextStep(input, 'passive', 'Abandoned next step');
}

export async function deleteNextStep(input: ResolveNextStepInput): Promise<void> {
  await assertWorkstream(prisma, input.projectId, input.workstreamId);
  const deleted = await prisma.nextStep.deleteMany({
    where: { id: input.nextStepId, projectId: input.projectId, workstreamId: input.workstreamId },
  });
  if (deleted.count === 0) throw new Error('Next step not found');
}
