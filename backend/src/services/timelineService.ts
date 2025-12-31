import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface TimelineEntry {
  id: string;
  workstreamId: string;
  workstreamName: string;
  status: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  tag?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

export interface TimelineFilters {
  projectId: string;
  startDate?: Date;
  endDate?: Date;
  tagIds?: string[];
}

/**
 * Get timeline of status updates with filters
 */
export async function getTimeline(filters: TimelineFilters): Promise<TimelineEntry[]> {
  try {
    const whereClause: any = {
      workstream: {
        projectId: filters.projectId,
      },
    };

    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.createdAt.lte = filters.endDate;
      }
    }

    if (filters.tagIds && filters.tagIds.length > 0) {
      whereClause.workstream.tagId = {
        in: filters.tagIds,
      };
    }

    const statusUpdates = await prisma.statusUpdate.findMany({
      where: whereClause,
      include: {
        workstream: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return statusUpdates.map((update) => ({
      id: update.id,
      workstreamId: update.workstreamId,
      workstreamName: update.workstream.name,
      status: update.status,
      note: update.note,
      createdAt: update.createdAt,
      updatedAt: update.updatedAt,
      tag: update.workstream.tag,
    }));
  } catch (error) {
    logger.error('Error getting timeline:', error);
    throw error;
  }
}
