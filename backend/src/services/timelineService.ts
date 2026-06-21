import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { extractTags } from '../utils/tagExtractor';
import { getBreadcrumbForWorkstream } from './workstreamService';

const prisma = new PrismaClient();

export type TimelineEventType = 'status_update' | 'workstream_created' | 'workstream_closed' | 'parent_changed' | 'sub_stream_created';

export interface TimelineEntry {
  id: string;
  eventType: TimelineEventType;
  workstreamId: string;
  workstreamName: string;
  status?: string;
  note?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  category?: { id: string; name: string; color: string } | null;
  parentId?: string | null;
  parentName?: string | null;
  parentStreams?: { id: string; name: string; workstreamName?: string }[];
  parentStreamPath?: string;
  breadcrumb?: string;
  currentBreadcrumb?: string;
  oldParentId?: string | null;
  oldParentName?: string | null;
  newParentId?: string | null;
  newParentName?: string | null;
}

export interface TimelineFilters {
  projectId: string;
  startDate?: Date;
  endDate?: Date;
  categoryIds?: string[];
  tags?: string[];
  eventTypes?: TimelineEventType[];
  streamScope?: 'all' | 'top-level' | 'sub-streams' | 'under-parent';
  parentId?: string;
  includeSubstreams?: boolean;
}

function collectSubstreamIds(rootId: string, substreamsByParent: Map<string | null, { id: string }[]>, maxDepth = 5): string[] {
  const ids: string[] = [];
  const visited = new Set<string>([rootId]);
  const queue = (substreamsByParent.get(rootId) ?? []).map(substream => ({ id: substream.id, depth: 2 }));
  while (queue.length) {
    const item = queue.shift()!;
    if (item.depth > maxDepth || visited.has(item.id)) continue;
    visited.add(item.id);
    ids.push(item.id);
    for (const substream of substreamsByParent.get(item.id) ?? []) queue.push({ id: substream.id, depth: item.depth + 1 });
  }
  return ids;
}

async function streamScopeWorkstreamIdFilter(filters: TimelineFilters): Promise<string[] | undefined> {
  const scope = filters.streamScope ?? (filters.parentId ? 'under-parent' : 'all');
  if (scope === 'all') return undefined;
  const rows = await prisma.workstream.findMany({ where: { projectId: filters.projectId }, select: { id: true, parentId: true } });
  if (scope === 'top-level') return rows.filter(row => row.parentId === null).map(row => row.id);
  if (scope === 'sub-streams') return rows.filter(row => row.parentId !== null).map(row => row.id);
  if (!filters.parentId) return [];
  if (!rows.some(row => row.id === filters.parentId)) return [];
  if (!filters.includeSubstreams) return [filters.parentId];
  const substreamsByParent = new Map<string | null, { id: string }[]>();
  for (const row of rows) substreamsByParent.set(row.parentId, [...(substreamsByParent.get(row.parentId) ?? []), row]);
  return [filters.parentId, ...collectSubstreamIds(filters.parentId, substreamsByParent, 5)];
}

function dateWhere(filters: TimelineFilters) {
  const out: any = {};
  if (filters.startDate) out.gte = filters.startDate;
  if (filters.endDate) out.lte = filters.endDate;
  return out;
}

async function parentStreamMeta(projectId: string, workstreamId: string) {
  const breadcrumb = await getBreadcrumbForWorkstream(projectId, workstreamId);
  const self = breadcrumb[breadcrumb.length - 1];
  const parent = breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2] : null;
  const parentStreams = breadcrumb.slice(0, -1);
  const parentStreamPath = breadcrumb.map(item => item.name).join(' > ');
  return {
    parentId: self?.parentId ?? null,
    parentName: parent?.name ?? null,
    parentStreams,
    parentStreamPath,
    breadcrumb: parentStreamPath,
  };
}

export async function getTimeline(filters: TimelineFilters): Promise<TimelineEntry[]> {
  try {
    const requested = new Set(filters.eventTypes ?? ['status_update', 'workstream_created', 'workstream_closed', 'parent_changed', 'sub_stream_created']);
    const workstreamWhereClause: any = { projectId: filters.projectId };
    const createdAtFilter = dateWhere(filters);
    if (filters.categoryIds?.length) workstreamWhereClause.categoryId = { in: filters.categoryIds };
    const scopedWorkstreamIds = await streamScopeWorkstreamIdFilter(filters);
    if (scopedWorkstreamIds) workstreamWhereClause.id = { in: scopedWorkstreamIds };

    const timeline: any[] = [];

    if (requested.has('status_update')) {
      const statusUpdateWhereClause: any = { workstream: workstreamWhereClause };
      if (filters.startDate || filters.endDate) statusUpdateWhereClause.createdAt = createdAtFilter;
      const statusUpdates = await prisma.statusUpdate.findMany({
        where: statusUpdateWhereClause,
        include: {
          workstream: {
            select: {
              name: true,
              context: true,
              parentId: true,
              category: { select: { id: true, name: true, color: true, emoji: true } },
            },
          },
        },
      });
      for (const update of statusUpdates) {
        timeline.push({
          id: `status-${update.id}`,
          eventType: 'status_update',
          workstreamId: update.workstreamId,
          workstreamName: update.workstream.name,
          status: update.status,
          note: update.note,
          createdAt: update.createdAt,
          updatedAt: update.updatedAt,
          category: update.workstream.category,
          workstreamContext: update.workstream.context,
          ...(await parentStreamMeta(filters.projectId, update.workstreamId)),
        });
      }
    }

    if (requested.has('workstream_created')) {
      const where: any = { ...workstreamWhereClause };
      if (filters.startDate || filters.endDate) where.createdAt = createdAtFilter;
      const workstreamsCreated = await prisma.workstream.findMany({
        where,
        select: { id: true, name: true, context: true, createdAt: true, category: { select: { id: true, name: true, color: true, emoji: true } } },
      });
      for (const workstream of workstreamsCreated) {
        timeline.push({ id: `created-${workstream.id}`, eventType: 'workstream_created', workstreamId: workstream.id, workstreamName: workstream.name, createdAt: workstream.createdAt, category: workstream.category, workstreamContext: workstream.context, ...(await parentStreamMeta(filters.projectId, workstream.id)) });
      }
    }

    if (requested.has('workstream_closed')) {
      const where: any = { ...workstreamWhereClause, closedAt: { not: null } };
      if (filters.startDate || filters.endDate) where.closedAt = createdAtFilter;
      const workstreamsClosed = await prisma.workstream.findMany({
        where,
        select: { id: true, name: true, context: true, closedAt: true, category: { select: { id: true, name: true, color: true, emoji: true } } },
      });
      for (const workstream of workstreamsClosed) {
        timeline.push({ id: `closed-${workstream.id}`, eventType: 'workstream_closed', workstreamId: workstream.id, workstreamName: workstream.name, createdAt: workstream.closedAt!, category: workstream.category, workstreamContext: workstream.context, ...(await parentStreamMeta(filters.projectId, workstream.id)) });
      }
    }

    if (requested.has('parent_changed') || requested.has('sub_stream_created')) {
      const eventWhere: any = { eventType: { in: Array.from(requested).filter(type => type === 'parent_changed' || type === 'sub_stream_created') }, workstream: workstreamWhereClause };
      if (filters.startDate || filters.endDate) eventWhere.createdAt = createdAtFilter;
      const events = await prisma.workstreamEvent.findMany({ where: eventWhere, include: { workstream: { select: { id: true, name: true, context: true, category: { select: { id: true, name: true, color: true, emoji: true } } } } } });
      for (const event of events) {
        const metadata = event.metadata as any;
        const meta = await parentStreamMeta(filters.projectId, event.workstreamId);
        const eventParentBreadcrumb = metadata.newParentBreadcrumb ?? null;
        const eventBreadcrumb = eventParentBreadcrumb
          ? `${eventParentBreadcrumb} > ${event.workstream.name}`
          : event.workstream.name;
        timeline.push({
          id: `event-${event.id}`,
          eventType: event.eventType,
          workstreamId: event.workstreamId,
          workstreamName: event.workstream.name,
          createdAt: event.createdAt,
          category: event.workstream.category,
          workstreamContext: event.workstream.context,
          parentId: meta.parentId,
          parentName: meta.parentName,
          parentStreamPath: eventBreadcrumb,
          breadcrumb: eventBreadcrumb,
          currentBreadcrumb: meta.parentStreamPath,
          oldParentId: metadata.oldParentId ?? null,
          oldParentName: metadata.oldParentName ?? null,
          newParentId: metadata.newParentId ?? null,
          newParentName: metadata.newParentName ?? null,
        });
      }
    }

    let filteredTimeline = timeline;
    if (filters.tags?.length) {
      filteredTimeline = timeline.filter((entry: any) => {
        const textFields = [entry.workstreamContext, entry.status, entry.note].filter(Boolean);
        const entryTags = extractTags(textFields.join(' '));
        return filters.tags!.some(filterTag => entryTags.some(entryTag => entryTag.toLowerCase() === filterTag.toLowerCase()));
      });
    }

    const cleanedTimeline = filteredTimeline.map((entry: any) => {
      const rest = { ...entry };
      delete rest.workstreamContext;
      return rest as TimelineEntry;
    });
    cleanedTimeline.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return cleanedTimeline;
  } catch (error) {
    logger.error('Error getting timeline:', error);
    throw error;
  }
}
