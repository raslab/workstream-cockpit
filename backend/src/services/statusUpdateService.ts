import { Prisma, PrismaClient, StatusUpdate } from '@prisma/client';
import { logger } from '../utils/logger';
import { getBreadcrumbForWorkstream, getSubstreamWorkstreamIds, isPublicNumberReference } from './workstreamService';

const prisma = new PrismaClient();
type PrismaTx = Prisma.TransactionClient;
type PrismaExecutor = PrismaClient | PrismaTx;

export interface CreateStatusUpdateInput {
  workstreamId: string;
  projectId?: string;
  status: string;
  note?: string;
}

export interface UpdateStatusUpdateInput {
  status?: string;
  note?: string | null;
}

export interface StatusUpdateListOptions {
  includeSubstreams?: boolean;
  projectId?: string;
}

export async function allocateStatusUpdateNumber(client: PrismaExecutor, projectId: string): Promise<number> {
  const project = await client.project.update({
    where: { id: projectId },
    data: { nextStatusUpdateNumber: { increment: 1 } },
    select: { nextStatusUpdateNumber: true },
  });
  return project.nextStatusUpdateNumber - 1;
}

async function resolveStatusUpdateReference(reference: string | number, projectId: string, client: PrismaExecutor = prisma): Promise<StatusUpdate | null> {
  const value = String(reference);
  if (isPublicNumberReference(value)) {
    return client.statusUpdate.findUnique({ where: { projectId_number: { projectId, number: Number(value) } } });
  }
  return client.statusUpdate.findFirst({ where: { id: value, projectId } });
}

export async function createStatusUpdate(input: CreateStatusUpdateInput): Promise<StatusUpdate> {
  try {
    const statusUpdate = await prisma.$transaction(async (tx) => {
      const workstream = await tx.workstream.findUnique({ where: { id: input.workstreamId }, select: { projectId: true } });
      if (!workstream) throw new Error('Workstream not found');
      if (input.projectId && input.projectId !== workstream.projectId) throw new Error('Workstream not found');
      const projectId = workstream.projectId;
      const number = await allocateStatusUpdateNumber(tx, projectId);
      return tx.statusUpdate.create({
        data: { projectId, number, workstreamId: input.workstreamId, status: input.status, note: input.note || null },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    logger.info(`Status update created: ${statusUpdate.id}`);
    return statusUpdate;
  } catch (error) {
    logger.error('Error creating status update:', error);
    throw error;
  }
}

export async function getStatusUpdatesByWorkstream(workstreamId: string, options: StatusUpdateListOptions = {}): Promise<any[]> {
  try {
    const workstreamIds = options.includeSubstreams && options.projectId
      ? [workstreamId, ...(await getSubstreamWorkstreamIds(options.projectId, workstreamId))]
      : [workstreamId];
    const updates = await prisma.statusUpdate.findMany({
      where: { workstreamId: { in: workstreamIds } },
      include: { workstream: { select: { id: true, number: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (!options.includeSubstreams || !options.projectId) {
      return updates.map(({ workstream: _workstream, ...update }) => update);
    }
    const breadcrumbByWorkstream = new Map<string, string>();
    for (const id of workstreamIds) {
      const breadcrumb = await getBreadcrumbForWorkstream(options.projectId, id);
      breadcrumbByWorkstream.set(id, breadcrumb.map(item => item.name).join(' > '));
    }
    return updates.map(({ workstream, ...update }) => ({
      ...update,
      source: { id: workstream.id, number: workstream.number, workstreamId: workstream.id, workstreamName: workstream.name, name: workstream.name },
      breadcrumb: breadcrumbByWorkstream.get(workstream.id) ?? workstream.name,
    }));
  } catch (error) {
    logger.error('Error getting status updates:', error);
    throw error;
  }
}

export async function updateStatusUpdate(statusUpdateReference: string | number, workstreamId: string, input: UpdateStatusUpdateInput, projectId?: string): Promise<StatusUpdate> {
  try {
    const existing = projectId
      ? await resolveStatusUpdateReference(statusUpdateReference, projectId)
      : await prisma.statusUpdate.findFirst({ where: { id: String(statusUpdateReference), workstreamId } });
    if (!existing || existing.workstreamId !== workstreamId) throw new Error('Status update not found or access denied');
    const updates: any = {};
    if (input.status !== undefined) updates.status = input.status;
    if (input.note !== undefined) updates.note = input.note;
    const statusUpdate = await prisma.statusUpdate.update({ where: { id: existing.id }, data: updates });
    logger.info(`Status update updated: ${statusUpdate.id}`);
    return statusUpdate;
  } catch (error) {
    logger.error('Error updating status update:', error);
    throw error;
  }
}

export async function deleteStatusUpdate(statusUpdateId: string, workstreamId: string): Promise<void> {
  try {
    const existing = await prisma.statusUpdate.findFirst({ where: { id: statusUpdateId, workstreamId } });
    if (!existing) throw new Error('Status update not found or access denied');
    await prisma.statusUpdate.delete({ where: { id: statusUpdateId } });
    logger.info(`Status update deleted: ${statusUpdateId}`);
  } catch (error) {
    logger.error('Error deleting status update:', error);
    throw error;
  }
}

export async function deleteStatusUpdateByReference(statusUpdateReference: string | number, workstreamId: string, projectId: string): Promise<void> {
  try {
    const existing = await resolveStatusUpdateReference(statusUpdateReference, projectId);
    if (!existing || existing.workstreamId !== workstreamId) throw new Error('Status update not found or access denied');
    await prisma.statusUpdate.delete({ where: { id: existing.id } });
    logger.info(`Status update deleted: ${existing.id}`);
  } catch (error) {
    logger.error('Error deleting status update:', error);
    throw error;
  }
}
