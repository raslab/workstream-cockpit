import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export type TimelineEventType = 'status_update' | 'workstream_created' | 'workstream_closed';

export interface TimelineEntry {
  id: string;
  eventType: TimelineEventType;
  workstreamId: string;
  workstreamName: string;
  status?: string;
  note?: string | null;
  createdAt: Date;
  updatedAt?: Date;
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
 * Get timeline of status updates and workstream events with filters
 */
export async function getTimeline(filters: TimelineFilters): Promise<TimelineEntry[]> {
  try {
    const workstreamWhereClause: any = {
      projectId: filters.projectId,
    };

    const dateFilter: any = {};
    if (filters.startDate) {
      dateFilter.gte = filters.startDate;
    }
    if (filters.endDate) {
      dateFilter.lte = filters.endDate;
    }

    if (filters.tagIds && filters.tagIds.length > 0) {
      workstreamWhereClause.tagId = {
        in: filters.tagIds,
      };
    }

    // Fetch status updates
    const statusUpdateWhereClause: any = {
      workstream: workstreamWhereClause,
    };

    if (filters.startDate || filters.endDate) {
      statusUpdateWhereClause.createdAt = dateFilter;
    }

    const statusUpdates = await prisma.statusUpdate.findMany({
      where: statusUpdateWhereClause,
      include: {
        workstream: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                emoji: true,
              },
            },
          },
        },
      },
    });

    // Fetch workstream creation events
    const workstreamCreationWhereClause: any = {
      ...workstreamWhereClause,
    };

    if (filters.startDate || filters.endDate) {
      workstreamCreationWhereClause.createdAt = dateFilter;
    }

    const workstreamsCreated = await prisma.workstream.findMany({
      where: workstreamCreationWhereClause,
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            color: true,
            emoji: true,
          },
        },
      },
    });

    // Fetch workstream closure events
    const workstreamClosureWhereClause: any = {
      ...workstreamWhereClause,
      closedAt: {
        not: null,
      },
    };

    if (filters.startDate || filters.endDate) {
      workstreamClosureWhereClause.closedAt = dateFilter;
    }

    const workstreamsClosed = await prisma.workstream.findMany({
      where: workstreamClosureWhereClause,
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            color: true,
            emoji: true,
          },
        },
      },
    });

    // Combine all events into timeline
    const timeline: TimelineEntry[] = [
      // Status updates
      ...statusUpdates.map((update) => ({
        id: `status-${update.id}`,
        eventType: 'status_update' as TimelineEventType,
        workstreamId: update.workstreamId,
        workstreamName: update.workstream.name,
        status: update.status,
        note: update.note,
        createdAt: update.createdAt,
        updatedAt: update.updatedAt,
        tag: update.workstream.tag,
      })),
      // Workstream creation events
      ...workstreamsCreated.map((workstream) => ({
        id: `created-${workstream.id}`,
        eventType: 'workstream_created' as TimelineEventType,
        workstreamId: workstream.id,
        workstreamName: workstream.name,
        createdAt: workstream.createdAt,
        tag: workstream.tag,
      })),
      // Workstream closure events
      ...workstreamsClosed.map((workstream) => ({
        id: `closed-${workstream.id}`,
        eventType: 'workstream_closed' as TimelineEventType,
        workstreamId: workstream.id,
        workstreamName: workstream.name,
        createdAt: workstream.closedAt!,
        tag: workstream.tag,
      })),
    ];

    // Sort by date descending
    timeline.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return timeline;
  } catch (error) {
    logger.error('Error getting timeline:', error);
    throw error;
  }
}
