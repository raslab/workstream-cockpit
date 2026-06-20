import { PrismaClient, StatusUpdate } from '@prisma/client';
import { logger } from '../utils/logger';
import { getBreadcrumbForWorkstream, getSubstreamWorkstreamIds } from './workstreamService';

const prisma = new PrismaClient();

export interface CreateStatusUpdateInput {
  workstreamId: string;
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

export async function createStatusUpdate(input: CreateStatusUpdateInput): Promise<StatusUpdate> {
  try {
    const statusUpdate = await prisma.statusUpdate.create({
      data: { workstreamId: input.workstreamId, status: input.status, note: input.note || null },
    });
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
      include: { workstream: { select: { id: true, name: true } } },
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
      source: { workstreamId: workstream.id, workstreamName: workstream.name },
      breadcrumb: breadcrumbByWorkstream.get(workstream.id) ?? workstream.name,
    }));
  } catch (error) {
    logger.error('Error getting status updates:', error);
    throw error;
  }
}

export async function updateStatusUpdate(statusUpdateId: string, workstreamId: string, input: UpdateStatusUpdateInput): Promise<StatusUpdate> {
  try {
    const existing = await prisma.statusUpdate.findFirst({ where: { id: statusUpdateId, workstreamId } });
    if (!existing) throw new Error('Status update not found or access denied');
    const updates: any = {};
    if (input.status !== undefined) updates.status = input.status;
    if (input.note !== undefined) updates.note = input.note;
    const statusUpdate = await prisma.statusUpdate.update({ where: { id: statusUpdateId }, data: updates });
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
