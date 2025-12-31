import { PrismaClient, StatusUpdate } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface CreateStatusUpdateInput {
  workstreamId: string;
  status: string;
  note?: string;
}

export interface UpdateStatusUpdateInput {
  status?: string;
  note?: string;
}

/**
 * Create a new status update
 */
export async function createStatusUpdate(
  input: CreateStatusUpdateInput
): Promise<StatusUpdate> {
  try {
    const statusUpdate = await prisma.statusUpdate.create({
      data: {
        workstreamId: input.workstreamId,
        status: input.status,
        note: input.note || null,
      },
    });

    logger.info(`Status update created: ${statusUpdate.id}`);
    return statusUpdate;
  } catch (error) {
    logger.error('Error creating status update:', error);
    throw error;
  }
}

/**
 * Get all status updates for a workstream
 */
export async function getStatusUpdatesByWorkstream(
  workstreamId: string
): Promise<StatusUpdate[]> {
  try {
    return await prisma.statusUpdate.findMany({
      where: { workstreamId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    logger.error('Error getting status updates:', error);
    throw error;
  }
}

/**
 * Update a status update
 */
export async function updateStatusUpdate(
  statusUpdateId: string,
  workstreamId: string,
  input: UpdateStatusUpdateInput
): Promise<StatusUpdate> {
  try {
    // Verify the status update belongs to the workstream
    const existing = await prisma.statusUpdate.findFirst({
      where: {
        id: statusUpdateId,
        workstreamId,
      },
    });

    if (!existing) {
      throw new Error('Status update not found or access denied');
    }

    const updates: any = {};
    if (input.status !== undefined) updates.status = input.status;
    if (input.note !== undefined) updates.note = input.note;

    const statusUpdate = await prisma.statusUpdate.update({
      where: { id: statusUpdateId },
      data: updates,
    });

    logger.info(`Status update updated: ${statusUpdate.id}`);
    return statusUpdate;
  } catch (error) {
    logger.error('Error updating status update:', error);
    throw error;
  }
}

/**
 * Delete a status update
 */
export async function deleteStatusUpdate(
  statusUpdateId: string,
  workstreamId: string
): Promise<void> {
  try {
    // Verify the status update belongs to the workstream
    const existing = await prisma.statusUpdate.findFirst({
      where: {
        id: statusUpdateId,
        workstreamId,
      },
    });

    if (!existing) {
      throw new Error('Status update not found or access denied');
    }

    await prisma.statusUpdate.delete({
      where: { id: statusUpdateId },
    });

    logger.info(`Status update deleted: ${statusUpdateId}`);
  } catch (error) {
    logger.error('Error deleting status update:', error);
    throw error;
  }
}
