import { PrismaClient, Workstream, StatusUpdate } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface CreateWorkstreamInput {
  projectId: string;
  name: string;
  tagId?: string;
  context?: string;
  initialStatus?: string;
  initialNote?: string;
}

export interface UpdateWorkstreamInput {
  name?: string;
  tagId?: string | null;
  context?: string;
}

export interface WorkstreamWithLatestStatus extends Workstream {
  latestStatus?: StatusUpdate;
  tag?: {
    id: string;
    name: string;
    color: string;
    emoji?: string | null;
  } | null;
}

/**
 * Get all workstreams for a project (with optional state filter)
 */
export async function getWorkstreams(
  projectId: string,
  state?: 'active' | 'closed'
): Promise<WorkstreamWithLatestStatus[]> {
  try {
    const whereClause: any = { projectId };
    if (state) {
      whereClause.state = state;
    }

    const workstreams = await prisma.workstream.findMany({
      where: whereClause,
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            color: true,
            emoji: true,
          },
        },
        statusUpdates: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to include latestStatus
    return workstreams.map((ws) => {
      const { statusUpdates, ...workstream } = ws;
      return {
        ...workstream,
        latestStatus: statusUpdates[0] || undefined,
      };
    });
  } catch (error) {
    logger.error('Error getting workstreams:', error);
    throw error;
  }
}

/**
 * Get a single workstream by ID (with access check)
 */
export async function getWorkstreamById(
  workstreamId: string,
  projectId: string
): Promise<WorkstreamWithLatestStatus | null> {
  try {
    const workstream = await prisma.workstream.findFirst({
      where: {
        id: workstreamId,
        projectId,
      },
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            color: true,
            emoji: true,
          },
        },
        statusUpdates: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!workstream) {
      return null;
    }

    const { statusUpdates, ...workstreamData } = workstream;
    return {
      ...workstreamData,
      latestStatus: statusUpdates[0] || undefined,
    };
  } catch (error) {
    logger.error('Error getting workstream by ID:', error);
    throw error;
  }
}

/**
 * Create a new workstream
 */
export async function createWorkstream(input: CreateWorkstreamInput): Promise<Workstream> {
  try {
    logger.info(`Creating new workstream: ${input.name} for project ${input.projectId}`);

    // Create workstream and optionally initial status update in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const workstream = await tx.workstream.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          tagId: input.tagId,
          context: input.context,
          state: 'active',
        },
      });

      // Create initial status update if provided
      if (input.initialStatus) {
        await tx.statusUpdate.create({
          data: {
            workstreamId: workstream.id,
            status: input.initialStatus,
            note: input.initialNote,
          },
        });
      }

      return workstream;
    });

    logger.info(`Workstream created successfully: ${result.id}`);
    return result;
  } catch (error) {
    logger.error('Error creating workstream:', error);
    throw error;
  }
}

/**
 * Update a workstream
 */
export async function updateWorkstream(
  workstreamId: string,
  projectId: string,
  updates: UpdateWorkstreamInput
): Promise<Workstream> {
  try {
    // Verify access first
    const workstream = await getWorkstreamById(workstreamId, projectId);
    if (!workstream) {
      throw new Error('Workstream not found or access denied');
    }

    return await prisma.workstream.update({
      where: { id: workstreamId },
      data: updates,
    });
  } catch (error) {
    logger.error('Error updating workstream:', error);
    throw error;
  }
}

/**
 * Close a workstream
 */
export async function closeWorkstream(workstreamId: string, projectId: string): Promise<Workstream> {
  try {
    // Verify access first
    const workstream = await getWorkstreamById(workstreamId, projectId);
    if (!workstream) {
      throw new Error('Workstream not found or access denied');
    }

    return await prisma.workstream.update({
      where: { id: workstreamId },
      data: {
        state: 'closed',
        closedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error closing workstream:', error);
    throw error;
  }
}

/**
 * Reopen a closed workstream
 */
export async function reopenWorkstream(
  workstreamId: string,
  projectId: string
): Promise<Workstream> {
  try {
    // Verify access first
    const workstream = await getWorkstreamById(workstreamId, projectId);
    if (!workstream) {
      throw new Error('Workstream not found or access denied');
    }

    return await prisma.workstream.update({
      where: { id: workstreamId },
      data: {
        state: 'active',
        closedAt: null,
      },
    });
  } catch (error) {
    logger.error('Error reopening workstream:', error);
    throw error;
  }
}

/**
 * Delete a workstream
 */
export async function deleteWorkstream(workstreamId: string, projectId: string): Promise<void> {
  try {
    // Verify access first
    const workstream = await getWorkstreamById(workstreamId, projectId);
    if (!workstream) {
      throw new Error('Workstream not found or access denied');
    }

    // The onDelete: Cascade will handle deleting status updates
    await prisma.workstream.delete({
      where: { id: workstreamId },
    });

    logger.info(`Workstream deleted successfully: ${workstreamId}`);
  } catch (error) {
    logger.error('Error deleting workstream:', error);
    throw error;
  }
}
