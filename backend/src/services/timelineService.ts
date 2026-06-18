import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { extractTags } from '../utils/tagExtractor';

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
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

export interface TimelineFilters {
  projectId: string;
  startDate?: Date;
  endDate?: Date;
  categoryIds?: string[];
  tags?: string[];
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

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      workstreamWhereClause.categoryId = {
        in: filters.categoryIds,
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
          select: {
            name: true,
            context: true,
            category: {
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
      select: {
        id: true,
        name: true,
        context: true,
        createdAt: true,
        category: {
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
      select: {
        id: true,
        name: true,
        context: true,
        closedAt: true,
        category: {
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
        category: update.workstream.category,
        workstreamContext: update.workstream.context,
      })),
      // Workstream creation events
      ...workstreamsCreated.map((workstream) => ({
        id: `created-${workstream.id}`,
        eventType: 'workstream_created' as TimelineEventType,
        workstreamId: workstream.id,
        workstreamName: workstream.name,
        createdAt: workstream.createdAt,
        category: workstream.category,
        workstreamContext: workstream.context,
      })),
      // Workstream closure events
      ...workstreamsClosed.map((workstream) => ({
        id: `closed-${workstream.id}`,
        eventType: 'workstream_closed' as TimelineEventType,
        workstreamId: workstream.id,
        workstreamName: workstream.name,
        createdAt: workstream.closedAt!,
        category: workstream.category,
        workstreamContext: workstream.context,
      })),
    ];

    // Filter by tags if specified
    let filteredTimeline = timeline;
    if (filters.tags && filters.tags.length > 0) {
      filteredTimeline = timeline.filter((entry: any) => {
        // Extract tags from all relevant text fields
        const textFields = [
          entry.workstreamContext,
          entry.status,
          entry.note,
        ].filter(Boolean);
        
        const entryTags = extractTags(textFields.join(' '));
        
        // Check if any of the filter tags are in the entry's tags
        return filters.tags!.some(filterTag => 
          entryTags.some(entryTag => entryTag.toLowerCase() === filterTag.toLowerCase())
        );
      });
    }

    // Remove temporary workstreamContext field before returning
    const cleanedTimeline = filteredTimeline.map((entry: any) => {
      const rest = { ...entry };
      delete rest.workstreamContext;
      return rest as TimelineEntry;
    });

    // Sort by date descending
    cleanedTimeline.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return cleanedTimeline;
  } catch (error) {
    logger.error('Error getting timeline:', error);
    throw error;
  }
}
