import { Prisma, PrismaClient, Workstream, StatusUpdate } from '@prisma/client';
import { logger } from '../utils/logger';
import { extractTagsFromFields } from '../utils/tagExtractor';
import { logResourceChange } from './resourceChangeService';

const prisma = new PrismaClient();
const MAX_HIERARCHY_DEPTH = 5;
const POSITIVE_INTEGER_RE = /^[1-9]\d*$/;

type LatestSubstreamActivitySource = {
  id?: string;
  number?: number;
  workstreamId: string;
  workstreamName: string;
  name?: string;
  updateId?: string;
  eventId?: string;
  eventType?: string;
  createdAt: Date;
};
type ActivityMetadata = {
  lastDirectUpdateAt: Date | null;
  lastSubstreamActivityAt: Date | null;
  lastActivityAt: Date | null;
  latestSubstreamActivitySource: LatestSubstreamActivitySource | null;
};
type WorkstreamSummary = Pick<
  Workstream,
  'id' | 'number' | 'name' | 'state' | 'parentId' | 'createdAt' | 'closedAt'
> & { depth?: number } & Partial<ActivityMetadata>;
type PrismaTx = Prisma.TransactionClient;
type PrismaExecutor = PrismaClient | PrismaTx;

export function isPublicNumberReference(reference: string | number): boolean {
  return POSITIVE_INTEGER_RE.test(String(reference));
}

export async function allocateWorkstreamNumber(
  client: PrismaExecutor,
  projectId: string,
): Promise<number> {
  const project = await client.project.update({
    where: { id: projectId },
    data: { nextWorkstreamNumber: { increment: 1 } },
    select: { nextWorkstreamNumber: true },
  });
  return project.nextWorkstreamNumber - 1;
}

async function allocateStatusUpdateNumber(
  client: PrismaExecutor,
  projectId: string,
): Promise<number> {
  const project = await client.project.update({
    where: { id: projectId },
    data: { nextStatusUpdateNumber: { increment: 1 } },
    select: { nextStatusUpdateNumber: true },
  });
  return project.nextStatusUpdateNumber - 1;
}

export interface CreateWorkstreamInput {
  projectId: string;
  name: string;
  categoryId?: string | null;
  parentId?: string | null;
  context?: string;
  initialStatus?: string;
  initialNote?: string;
}

export interface UpdateWorkstreamInput {
  name?: string;
  categoryId?: string | null;
  parentId?: string | null;
  context?: string | null;
}

export interface WorkstreamWithLatestStatus extends Workstream {
  latestStatus?: StatusUpdate;
  category?: {
    id: string;
    name: string;
    color: string;
    emoji?: string | null;
  } | null;
  parent?: WorkstreamSummary | null;
  parentStreams?: WorkstreamSummary[];
  substreams?: WorkstreamSummary[];
  substreamCount?: number;
  directSubstreamCount?: number;
  activeSubstreamCount?: number;
  closedSubstreamCount?: number;
  nextStepCount?: number;
  depth?: number;
  lastDirectUpdateAt?: Date | null;
  lastSubstreamActivityAt?: Date | null;
  lastActivityAt?: Date | null;
  latestSubstreamActivitySource?: LatestSubstreamActivitySource | null;
}

export type WorkstreamHierarchyFilter =
  | 'all'
  | 'top-level'
  | 'sub-streams'
  | 'no-parent'
  | 'has-substreams'
  | 'under-parent';

export interface WorkstreamHierarchyOptions {
  mode?: WorkstreamHierarchyFilter;
  parentId?: string | null;
  parentIds?: string[];
  includeSubstreams?: boolean;
}

function publicParent(
  parent: Workstream | null | undefined,
  depth?: number,
  activity?: ActivityMetadata,
): WorkstreamSummary | null {
  if (!parent) return null;
  return {
    id: parent.id,
    number: parent.number,
    name: parent.name,
    state: parent.state,
    parentId: parent.parentId,
    createdAt: parent.createdAt,
    closedAt: parent.closedAt,
    depth,
    ...activity,
  };
}

function buildSubstreamsByParent(workstreams: Workstream[]): Map<string | null, Workstream[]> {
  const map = new Map<string | null, Workstream[]>();
  for (const ws of workstreams) {
    const key = ws.parentId ?? null;
    const list = map.get(key) ?? [];
    list.push(ws);
    map.set(key, list);
  }
  Array.from(map.values()).forEach((list) =>
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  );
  return map;
}

function computeDepth(workstream: Workstream, byId: Map<string, Workstream>): number {
  let depth = 1;
  let current = workstream;
  const seen = new Set<string>([workstream.id]);
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent || seen.has(parent.id)) break;
    depth += 1;
    seen.add(parent.id);
    current = parent;
  }
  return depth;
}

function computeParentStreams(workstream: Workstream, byId: Map<string, Workstream>): Workstream[] {
  const parentStreams: Workstream[] = [];
  let parentId = workstream.parentId;
  const seen = new Set<string>([workstream.id]);
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent || seen.has(parent.id)) break;
    parentStreams.unshift(parent);
    seen.add(parent.id);
    parentId = parent.parentId;
  }
  return parentStreams;
}

function substreamIds(
  workstreamId: string,
  substreamsByParent: Map<string | null, Workstream[]>,
): string[] {
  const ids: string[] = [];
  const visited = new Set<string>([workstreamId]);
  const stack = [...(substreamsByParent.get(workstreamId) ?? [])];
  while (stack.length) {
    const substream = stack.pop()!;
    if (visited.has(substream.id)) continue;
    visited.add(substream.id);
    ids.push(substream.id);
    stack.push(...(substreamsByParent.get(substream.id) ?? []));
  }
  return ids;
}

function scopedWorkstreamIds(
  parentIds: Set<string>,
  workstreams: Workstream[],
  recursive: boolean,
): Set<string> {
  const substreamsByParent = buildSubstreamsByParent(workstreams);
  const scopedIds = new Set<string>();
  const queue = Array.from(parentIds);
  while (queue.length) {
    const parentId = queue.shift()!;
    for (const substream of substreamsByParent.get(parentId) ?? []) {
      if (scopedIds.has(substream.id)) continue;
      scopedIds.add(substream.id);
      if (recursive) queue.push(substream.id);
    }
  }
  return scopedIds;
}

async function applyWorkstreamHierarchyFilter(
  projectId: string,
  workstreams: Workstream[],
  hierarchy?: WorkstreamHierarchyOptions,
): Promise<Workstream[]> {
  const mode = hierarchy?.mode ?? 'all';
  if (mode === 'all') return workstreams;
  if (mode === 'top-level' || mode === 'no-parent') return workstreams.filter((ws) => !ws.parentId);
  if (mode === 'sub-streams') return workstreams.filter((ws) => Boolean(ws.parentId));
  if (mode === 'has-substreams') {
    const allWorkstreams = await prisma.workstream.findMany({ where: { projectId } });
    const substreamsByParent = buildSubstreamsByParent(allWorkstreams);
    return workstreams.filter((ws) => (substreamsByParent.get(ws.id) ?? []).length > 0);
  }

  const selectedParentIds = hierarchy?.parentIds?.length
    ? hierarchy.parentIds
    : hierarchy?.parentId
      ? [hierarchy.parentId]
      : [];
  const parentIds = new Set(selectedParentIds.filter(Boolean));
  if (parentIds.size === 0) return [];

  const allWorkstreams = await prisma.workstream.findMany({ where: { projectId } });
  const includedIds = scopedWorkstreamIds(
    parentIds,
    allWorkstreams,
    Boolean(hierarchy?.includeSubstreams),
  );
  return workstreams.filter((ws) => includedIds.has(ws.id));
}

function extractWorkstreamTags(
  workstream: Pick<Workstream, 'context'> & { statusUpdates?: StatusUpdate[] },
  latestStatus?: StatusUpdate,
): string[] {
  const statusUpdates = workstream.statusUpdates ?? [];
  const statusSources = statusUpdates.length ? statusUpdates : latestStatus ? [latestStatus] : [];
  return extractTagsFromFields(
    workstream.context,
    ...statusSources.flatMap((statusUpdate) => [statusUpdate.status, statusUpdate.note]),
  );
}

function substreamTreeMaxRelativeDepth(
  workstreamId: string,
  substreamsByParent: Map<string | null, Workstream[]>,
): number {
  let maxDepth = 1;
  const visited = new Set<string>([workstreamId]);
  const stack = (substreamsByParent.get(workstreamId) ?? []).map((substream) => ({
    id: substream.id,
    depth: 2,
  }));
  while (stack.length) {
    const item = stack.pop()!;
    if (visited.has(item.id)) continue;
    visited.add(item.id);
    maxDepth = Math.max(maxDepth, item.depth);
    stack.push(
      ...(substreamsByParent.get(item.id) ?? []).map((substream) => ({
        id: substream.id,
        depth: item.depth + 1,
      })),
    );
  }
  return maxDepth;
}

async function enrichWorkstreams<
  T extends Workstream & { statusUpdates?: StatusUpdate[]; category?: any },
>(rows: T[], includeSubstreams = false): Promise<WorkstreamWithLatestStatus[]> {
  if (rows.length === 0) return [];
  const projectId = rows[0].projectId;
  const allWorkstreams = await prisma.workstream.findMany({ where: { projectId } });
  const byId = new Map(allWorkstreams.map((ws) => [ws.id, ws]));
  const substreamsByParent = buildSubstreamsByParent(allWorkstreams);
  const allIds = allWorkstreams.map((ws) => ws.id);
  const latestUpdates = await prisma.statusUpdate.findMany({
    where: { workstreamId: { in: allIds }, impact: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  const latestByWorkstream = new Map<string, StatusUpdate>();
  for (const update of latestUpdates)
    if (!latestByWorkstream.has(update.workstreamId))
      latestByWorkstream.set(update.workstreamId, update);
  const nextStepCounts = await prisma.nextStep.groupBy({
    by: ['workstreamId'],
    where: { workstreamId: { in: allIds } },
    _count: { _all: true },
  });
  const nextStepCountByWorkstream = new Map(
    nextStepCounts.map((row) => [row.workstreamId, row._count._all]),
  );
  const structuralEvents = await prisma.workstreamEvent.findMany({
    where: { workstreamId: { in: allIds } },
    orderBy: { createdAt: 'desc' },
  });
  const latestEventByWorkstream = new Map<string, any>();
  for (const event of structuralEvents)
    if (!latestEventByWorkstream.has(event.workstreamId))
      latestEventByWorkstream.set(event.workstreamId, event);

  const computeActivityMetadata = (
    workstreamId: string,
    directLatestOverride?: StatusUpdate,
  ): ActivityMetadata => {
    const directLatest = directLatestOverride ?? latestByWorkstream.get(workstreamId);
    const substreamWorkstreamIds = substreamIds(workstreamId, substreamsByParent);
    let latestSubstreamActivityAt: Date | null = null;
    let latestSubstreamActivitySource: LatestSubstreamActivitySource | null = null;
    for (const substreamId of substreamWorkstreamIds) {
      const update = latestByWorkstream.get(substreamId);
      const event = latestEventByWorkstream.get(substreamId);
      const candidate =
        update && (!event || update.createdAt >= event.createdAt)
          ? {
              at: update.createdAt,
              source: {
                id: substreamId,
                number: byId.get(substreamId)?.number,
                workstreamId: substreamId,
                workstreamName: byId.get(substreamId)?.name ?? '',
                name: byId.get(substreamId)?.name ?? '',
                updateId: update.id,
                createdAt: update.createdAt,
              },
            }
          : event
            ? {
                at: event.createdAt,
                source: {
                  id: substreamId,
                  number: byId.get(substreamId)?.number,
                  workstreamId: substreamId,
                  workstreamName: byId.get(substreamId)?.name ?? '',
                  name: byId.get(substreamId)?.name ?? '',
                  eventId: event.id,
                  eventType: event.eventType,
                  createdAt: event.createdAt,
                },
              }
            : null;
      if (candidate && (!latestSubstreamActivityAt || candidate.at > latestSubstreamActivityAt)) {
        latestSubstreamActivityAt = candidate.at;
        latestSubstreamActivitySource = candidate.source;
      }
    }
    const lastDirectUpdateAt = directLatest?.createdAt ?? null;
    const lastActivityAt = [lastDirectUpdateAt, latestSubstreamActivityAt]
      .filter(Boolean)
      .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as Date | undefined;

    return {
      lastDirectUpdateAt,
      lastSubstreamActivityAt: latestSubstreamActivityAt,
      lastActivityAt: lastActivityAt ?? null,
      latestSubstreamActivitySource,
    };
  };

  return rows.map((row: any) => {
    const statusUpdates: StatusUpdate[] = row.statusUpdates ?? [];
    const directLatest = statusUpdates[0] ?? latestByWorkstream.get(row.id);
    const activity = computeActivityMetadata(row.id, directLatest);
    const directSubstreams = substreamsByParent.get(row.id) ?? [];
    const depth = computeDepth(row, byId);
    const parentStreams = computeParentStreams(row, byId).map(
      (parentStream) => publicParent(parentStream, computeDepth(parentStream, byId))!,
    );
    const parent = publicParent(
      row.parentId ? byId.get(row.parentId) : null,
      row.parentId ? depth - 1 : undefined,
    );
    const workstreamData = { ...row } as any;
    delete workstreamData.statusUpdates;
    const latestStatus = directLatest || undefined;
    return {
      ...workstreamData,
      latestStatus,
      allTags: extractWorkstreamTags(row, latestStatus),
      parent,
      parentStreams,
      ...(includeSubstreams
        ? {
            substreams: directSubstreams.map((substream) =>
              publicParent(substream, depth + 1, computeActivityMetadata(substream.id)),
            ),
          }
        : {}),
      substreamCount: directSubstreams.length,
      directSubstreamCount: directSubstreams.length,
      activeSubstreamCount: directSubstreams.filter((substream) => substream.state === 'active')
        .length,
      closedSubstreamCount: directSubstreams.filter((substream) => substream.state === 'closed')
        .length,
      nextStepCount: nextStepCountByWorkstream.get(row.id) ?? 0,
      depth,
      ...activity,
    };
  });
}

async function collectDetailHierarchyRows(
  workstream: Workstream,
  projectId: string,
): Promise<Workstream[]> {
  const rowsById = new Map<string, Workstream>([[workstream.id, workstream]]);

  let parentId = workstream.parentId;
  const seenAncestorIds = new Set<string>([workstream.id]);
  while (parentId && !seenAncestorIds.has(parentId)) {
    const parent = await prisma.workstream.findFirst({ where: { id: parentId, projectId } });
    if (!parent) break;
    rowsById.set(parent.id, parent);
    seenAncestorIds.add(parent.id);
    parentId = parent.parentId;
  }

  let frontier = [workstream.id];
  const seenDescendantIds = new Set<string>(frontier);
  while (frontier.length > 0) {
    const children = await prisma.workstream.findMany({
      where: { projectId, parentId: { in: frontier } },
      orderBy: { createdAt: 'desc' },
    });
    frontier = [];
    for (const child of children) {
      if (seenDescendantIds.has(child.id)) continue;
      rowsById.set(child.id, child);
      seenDescendantIds.add(child.id);
      frontier.push(child.id);
    }
  }

  return Array.from(rowsById.values());
}

async function enrichWorkstreamDetail<
  T extends Workstream & { statusUpdates?: StatusUpdate[]; category?: any },
>(row: T): Promise<WorkstreamWithLatestStatus> {
  const projectId = row.projectId;
  const hierarchyRows = await collectDetailHierarchyRows(row, projectId);
  const byId = new Map(hierarchyRows.map((ws) => [ws.id, ws]));
  const substreamsByParent = buildSubstreamsByParent(hierarchyRows);
  const scopedIds = hierarchyRows.map((ws) => ws.id);

  const latestUpdates = await prisma.statusUpdate.findMany({
    where: { workstreamId: { in: scopedIds }, impact: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  const latestByWorkstream = new Map<string, StatusUpdate>();
  for (const update of latestUpdates)
    if (!latestByWorkstream.has(update.workstreamId))
      latestByWorkstream.set(update.workstreamId, update);

  const nextStepCounts = await prisma.nextStep.groupBy({
    by: ['workstreamId'],
    where: { workstreamId: { in: scopedIds } },
    _count: { _all: true },
  });
  const nextStepCountByWorkstream = new Map(
    nextStepCounts.map((count) => [count.workstreamId, count._count._all]),
  );

  const structuralEvents = await prisma.workstreamEvent.findMany({
    where: { workstreamId: { in: scopedIds } },
    orderBy: { createdAt: 'desc' },
  });
  const latestEventByWorkstream = new Map<string, any>();
  for (const event of structuralEvents)
    if (!latestEventByWorkstream.has(event.workstreamId))
      latestEventByWorkstream.set(event.workstreamId, event);

  const computeActivityMetadata = (
    workstreamId: string,
    directLatestOverride?: StatusUpdate,
  ): ActivityMetadata => {
    const directLatest = directLatestOverride ?? latestByWorkstream.get(workstreamId);
    const descendantIds = substreamIds(workstreamId, substreamsByParent);
    let latestSubstreamActivityAt: Date | null = null;
    let latestSubstreamActivitySource: LatestSubstreamActivitySource | null = null;
    for (const descendantId of descendantIds) {
      const update = latestByWorkstream.get(descendantId);
      const event = latestEventByWorkstream.get(descendantId);
      const sourceWorkstream = byId.get(descendantId);
      const candidate =
        update && (!event || update.createdAt >= event.createdAt)
          ? {
              at: update.createdAt,
              source: {
                id: descendantId,
                number: sourceWorkstream?.number,
                workstreamId: descendantId,
                workstreamName: sourceWorkstream?.name ?? '',
                name: sourceWorkstream?.name ?? '',
                updateId: update.id,
                createdAt: update.createdAt,
              },
            }
          : event
            ? {
                at: event.createdAt,
                source: {
                  id: descendantId,
                  number: sourceWorkstream?.number,
                  workstreamId: descendantId,
                  workstreamName: sourceWorkstream?.name ?? '',
                  name: sourceWorkstream?.name ?? '',
                  eventId: event.id,
                  eventType: event.eventType,
                  createdAt: event.createdAt,
                },
              }
            : null;
      if (candidate && (!latestSubstreamActivityAt || candidate.at > latestSubstreamActivityAt)) {
        latestSubstreamActivityAt = candidate.at;
        latestSubstreamActivitySource = candidate.source;
      }
    }
    const lastDirectUpdateAt = directLatest?.createdAt ?? null;
    const lastActivityAt = [lastDirectUpdateAt, latestSubstreamActivityAt]
      .filter(Boolean)
      .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as Date | undefined;
    return {
      lastDirectUpdateAt,
      lastSubstreamActivityAt: latestSubstreamActivityAt,
      lastActivityAt: lastActivityAt ?? null,
      latestSubstreamActivitySource,
    };
  };

  const statusUpdates: StatusUpdate[] = row.statusUpdates ?? [];
  const directLatest = statusUpdates[0] ?? latestByWorkstream.get(row.id);
  const activity = computeActivityMetadata(row.id, directLatest);
  const directSubstreams = substreamsByParent.get(row.id) ?? [];
  const depth = computeDepth(row, byId);
  const parentStreams = computeParentStreams(row, byId).map(
    (parentStream) => publicParent(parentStream, computeDepth(parentStream, byId))!,
  );
  const parent = publicParent(
    row.parentId ? byId.get(row.parentId) : null,
    row.parentId ? depth - 1 : undefined,
  );
  const workstreamData = { ...row } as any;
  delete workstreamData.statusUpdates;
  const latestStatus = directLatest || undefined;

  return {
    ...workstreamData,
    latestStatus,
    allTags: extractWorkstreamTags(row, latestStatus),
    parent,
    parentStreams,
    substreams: directSubstreams.map(
      (substream) => publicParent(substream, depth + 1, computeActivityMetadata(substream.id))!,
    ),
    substreamCount: directSubstreams.length,
    directSubstreamCount: directSubstreams.length,
    activeSubstreamCount: directSubstreams.filter((substream) => substream.state === 'active')
      .length,
    closedSubstreamCount: directSubstreams.filter((substream) => substream.state === 'closed')
      .length,
    nextStepCount: nextStepCountByWorkstream.get(row.id) ?? 0,
    depth,
    ...activity,
  };
}

async function assertCategoryBelongsToProject(
  client: PrismaExecutor,
  categoryId: string | null | undefined,
  projectId: string,
): Promise<void> {
  if (categoryId === undefined || categoryId === null) return;
  const category = await client.category.findFirst({
    where: { id: categoryId, projectId },
    select: { id: true },
  });
  if (!category) throw new Error('Category not found');
}

async function assertValidParent(
  client: PrismaExecutor,
  projectId: string,
  workstreamId: string | undefined,
  parentId: string | null | undefined,
): Promise<void> {
  if (parentId === undefined || parentId === null) return;
  if (workstreamId && parentId === workstreamId)
    throw new Error('A workstream cannot be its own parent');
  const parent = await client.workstream.findFirst({ where: { id: parentId, projectId } });
  if (!parent) throw new Error('Parent workstream not found');
  if (parent.state === 'closed') throw new Error('Cannot move under a closed parent');

  const allWorkstreams = await client.workstream.findMany({ where: { projectId } });
  const byId = new Map(allWorkstreams.map((ws) => [ws.id, ws]));
  const substreamsByParent = buildSubstreamsByParent(allWorkstreams);
  if (workstreamId && substreamIds(workstreamId, substreamsByParent).includes(parentId))
    throw new Error(
      'Cannot move a workstream under its sub-stream because that would create a cycle',
    );
  const parentDepth = computeDepth(parent, byId);
  const relativeDepth = workstreamId
    ? substreamTreeMaxRelativeDepth(workstreamId, substreamsByParent)
    : 1;
  if (parentDepth + relativeDepth > MAX_HIERARCHY_DEPTH)
    throw new Error(`Parent stream depth cannot exceed ${MAX_HIERARCHY_DEPTH} levels`);
}

export async function resolveWorkstreamReference(
  reference: string | number,
  projectId: string,
  client: PrismaExecutor = prisma,
): Promise<Workstream | null> {
  const value = String(reference);
  if (isPublicNumberReference(value)) {
    return client.workstream.findUnique({
      where: { projectId_number: { projectId, number: Number(value) } },
    });
  }
  return client.workstream.findFirst({ where: { id: value, projectId } });
}

export async function resolveWorkstreamId(
  reference: string | number | null | undefined,
  projectId: string,
  client: PrismaExecutor = prisma,
): Promise<string | null | undefined> {
  if (reference === undefined) return undefined;
  if (reference === null) return null;
  const workstream = await resolveWorkstreamReference(reference, projectId, client);
  return workstream?.id ?? null;
}

async function hierarchyTransaction<T>(fn: (tx: PrismaTx) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function getWorkstreams(
  projectId: string,
  state?: 'active' | 'closed' | 'all',
  tags?: string[],
  categoryIds?: string[],
  notUpdatedToday?: boolean,
  hierarchy?: WorkstreamHierarchyOptions,
): Promise<WorkstreamWithLatestStatus[]> {
  try {
    const whereClause: any = { projectId };
    if (state && state !== 'all') whereClause.state = state;
    if (categoryIds?.length) whereClause.categoryId = { in: categoryIds };
    let workstreams: any[] = await prisma.workstream.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true, color: true, emoji: true, sortOrder: true } },
        statusUpdates: { where: { impact: 'active' }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (tags?.length) {
      const normalizedFilterTags = tags.map((t) => t.toLowerCase());
      workstreams = workstreams.filter((ws) => {
        const wsTags = extractWorkstreamTags(ws);
        return normalizedFilterTags.some((filterTag) => wsTags.includes(filterTag));
      });
    }
    if (notUpdatedToday) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      workstreams = workstreams.filter(
        (ws) =>
          ws.statusUpdates.length === 0 || new Date(ws.statusUpdates[0].createdAt) < startOfToday,
      );
    }
    workstreams = await applyWorkstreamHierarchyFilter(projectId, workstreams, hierarchy);
    return enrichWorkstreams(workstreams, false);
  } catch (error) {
    logger.error('Error getting workstreams:', error);
    throw error;
  }
}

export async function getWorkstreamReferences(
  projectId: string,
  state?: 'active' | 'closed' | 'all',
): Promise<WorkstreamSummary[]> {
  const whereClause: Prisma.WorkstreamWhereInput = { projectId };
  if (state && state !== 'all') whereClause.state = state;

  const workstreams = await prisma.workstream.findMany({
    where: whereClause,
    select: {
      id: true,
      number: true,
      name: true,
      state: true,
      parentId: true,
      createdAt: true,
      closedAt: true,
      projectId: true,
    },
    orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
  });
  if (workstreams.length === 0) return [];

  const allWorkstreams = await prisma.workstream.findMany({ where: { projectId } });
  const byId = new Map(allWorkstreams.map((ws) => [ws.id, ws]));
  return workstreams.map((workstream) => ({
    id: workstream.id,
    number: workstream.number,
    name: workstream.name,
    state: workstream.state,
    parentId: workstream.parentId,
    parentStreams: computeParentStreams(workstream as Workstream, byId).map((parentStream) => ({
      id: parentStream.id,
      number: parentStream.number,
      name: parentStream.name,
      state: parentStream.state,
      parentId: parentStream.parentId,
      depth: computeDepth(parentStream, byId),
    })),
    createdAt: workstream.createdAt,
    closedAt: workstream.closedAt,
    depth: computeDepth(workstream as Workstream, byId),
  }));
}

export async function getWorkstreamById(
  workstreamId: string,
  projectId: string,
): Promise<WorkstreamWithLatestStatus | null> {
  try {
    const workstream: any = await prisma.workstream.findFirst({
      where: { id: workstreamId, projectId },
      include: {
        category: { select: { id: true, name: true, color: true, emoji: true, sortOrder: true } },
        statusUpdates: { where: { impact: 'active' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!workstream) return null;
    return enrichWorkstreamDetail(workstream);
  } catch (error) {
    logger.error('Error getting workstream by ID:', error);
    throw error;
  }
}

export async function getWorkstreamByReference(
  workstreamReference: string | number,
  projectId: string,
): Promise<WorkstreamWithLatestStatus | null> {
  const workstream = await resolveWorkstreamReference(workstreamReference, projectId);
  if (!workstream) return null;
  return getWorkstreamById(workstream.id, projectId);
}

export async function createWorkstream(
  input: CreateWorkstreamInput,
): Promise<WorkstreamWithLatestStatus> {
  try {
    logger.info(`Creating new workstream: ${input.name} for project ${input.projectId}`);
    const result = await hierarchyTransaction(async (tx) => {
      await assertCategoryBelongsToProject(tx, input.categoryId, input.projectId);
      await assertValidParent(tx, input.projectId, undefined, input.parentId);
      const parent = input.parentId
        ? await tx.workstream.findUnique({ where: { id: input.parentId } })
        : null;
      const number = await allocateWorkstreamNumber(tx, input.projectId);
      const workstream = await tx.workstream.create({
        data: {
          projectId: input.projectId,
          number,
          name: input.name,
          categoryId: input.categoryId,
          parentId: input.parentId ?? null,
          context: input.context,
          state: 'active',
        },
      });
      let initialStatusUpdate: StatusUpdate | null = null;
      if (input.initialStatus) {
        initialStatusUpdate = await tx.statusUpdate.create({
          data: {
            projectId: input.projectId,
            number: await allocateStatusUpdateNumber(tx, input.projectId),
            workstreamId: workstream.id,
            status: input.initialStatus,
            note: input.initialNote,
          },
        });
      }
      await logResourceChange(
        {
          projectId: input.projectId,
          resourceType: 'workstream',
          resourceId: workstream.id,
          resourceLabel: workstream.name,
          operation: 'created',
          workstreamId: workstream.id,
        },
        tx,
      );
      if (input.initialStatus) {
        await logResourceChange(
          {
            projectId: input.projectId,
            resourceType: 'status_update',
            resourceId: initialStatusUpdate?.id ?? null,
            resourceLabel: input.initialStatus,
            operation: 'created',
            workstreamId: workstream.id,
          },
          tx,
        );
      }
      if (input.parentId) {
        const allWorkstreams = await tx.workstream.findMany({
          where: { projectId: input.projectId },
        });
        const byId = new Map(allWorkstreams.map((ws) => [ws.id, ws]));
        const parentBreadcrumb = parent
          ? [...computeParentStreams(parent, byId), parent].map((ws) => ws.name).join(' > ')
          : null;
        await tx.workstreamEvent.create({
          data: {
            workstreamId: workstream.id,
            eventType: 'sub_stream_created',
            metadata: {
              oldParentId: null,
              oldParentName: null,
              oldParentBreadcrumb: null,
              newParentId: input.parentId,
              newParentName: parent?.name ?? null,
              newParentBreadcrumb: parentBreadcrumb,
            },
          },
        });
      }
      return workstream;
    });
    logger.info(`Workstream created successfully: ${result.id}`);
    return (await getWorkstreamById(result.id, input.projectId))!;
  } catch (error) {
    logger.error('Error creating workstream:', error);
    throw error;
  }
}

export async function updateWorkstream(
  workstreamId: string,
  projectId: string,
  updates: UpdateWorkstreamInput,
): Promise<WorkstreamWithLatestStatus> {
  try {
    const result = await hierarchyTransaction(async (tx) => {
      const existing = await tx.workstream.findFirst({ where: { id: workstreamId, projectId } });
      if (!existing) throw new Error('Workstream not found or access denied');
      await assertCategoryBelongsToProject(tx, updates.categoryId, projectId);
      if (Object.prototype.hasOwnProperty.call(updates, 'parentId'))
        await assertValidParent(tx, projectId, workstreamId, updates.parentId);
      const data: any = { ...updates };
      const parentChanged =
        Object.prototype.hasOwnProperty.call(updates, 'parentId') &&
        existing.parentId !== (updates.parentId ?? null);
      const oldParent = existing.parentId
        ? await tx.workstream.findUnique({ where: { id: existing.parentId } })
        : null;
      const newParent = updates.parentId
        ? await tx.workstream.findUnique({ where: { id: updates.parentId } })
        : null;
      const allWorkstreams = parentChanged
        ? await tx.workstream.findMany({ where: { projectId } })
        : [];
      const byId = new Map(allWorkstreams.map((ws) => [ws.id, ws]));
      const oldParentBreadcrumb = oldParent
        ? [...computeParentStreams(oldParent, byId), oldParent].map((ws) => ws.name).join(' > ')
        : null;
      const newParentBreadcrumb = newParent
        ? [...computeParentStreams(newParent, byId), newParent].map((ws) => ws.name).join(' > ')
        : null;
      const updated = await tx.workstream.update({ where: { id: workstreamId }, data });
      await logResourceChange(
        {
          projectId,
          resourceType: 'workstream',
          resourceId: updated.id,
          resourceLabel: updated.name,
          operation: 'updated',
          workstreamId: updated.id,
        },
        tx,
      );
      if (parentChanged) {
        await tx.workstreamEvent.create({
          data: {
            workstreamId,
            eventType: 'parent_changed',
            metadata: {
              oldParentId: existing.parentId,
              oldParentName: oldParent?.name ?? null,
              oldParentBreadcrumb,
              newParentId: updates.parentId ?? null,
              newParentName: newParent?.name ?? null,
              newParentBreadcrumb,
            },
          },
        });
      }
      return updated;
    });
    return (await getWorkstreamById(result.id, projectId))!;
  } catch (error) {
    logger.error('Error updating workstream:', error);
    throw error;
  }
}

export async function closeWorkstream(
  workstreamId: string,
  projectId: string,
): Promise<WorkstreamWithLatestStatus> {
  try {
    const updated = await hierarchyTransaction(async (tx) => {
      const workstream = await tx.workstream.findFirst({ where: { id: workstreamId, projectId } });
      if (!workstream) throw new Error('Workstream not found or access denied');
      const allWorkstreams = await tx.workstream.findMany({ where: { projectId } });
      const byId = new Map(allWorkstreams.map((ws) => [ws.id, ws]));
      const activeSubstreams = substreamIds(
        workstreamId,
        buildSubstreamsByParent(allWorkstreams),
      ).filter((id) => byId.get(id)?.state === 'active');
      if (activeSubstreams.length)
        throw new Error('Cannot close a workstream with active sub-streams');
      const updated = await tx.workstream.update({
        where: { id: workstreamId },
        data: { state: 'closed', closedAt: new Date() },
      });
      await logResourceChange(
        {
          projectId,
          resourceType: 'workstream',
          resourceId: updated.id,
          resourceLabel: updated.name,
          operation: 'closed',
          workstreamId: updated.id,
        },
        tx,
      );
      return updated;
    });
    return (await getWorkstreamById(updated.id, projectId))!;
  } catch (error) {
    logger.error('Error closing workstream:', error);
    throw error;
  }
}

export async function reopenWorkstream(
  workstreamId: string,
  projectId: string,
): Promise<WorkstreamWithLatestStatus> {
  try {
    const updated = await hierarchyTransaction(async (tx) => {
      const workstream = await tx.workstream.findFirst({ where: { id: workstreamId, projectId } });
      if (!workstream) throw new Error('Workstream not found or access denied');
      if (workstream.parentId) {
        const parent = await tx.workstream.findFirst({
          where: { id: workstream.parentId, projectId },
        });
        if (parent?.state === 'closed')
          throw new Error('Cannot reopen a workstream while its parent is closed');
      }
      const updated = await tx.workstream.update({
        where: { id: workstreamId },
        data: { state: 'active', closedAt: null },
      });
      await logResourceChange(
        {
          projectId,
          resourceType: 'workstream',
          resourceId: updated.id,
          resourceLabel: updated.name,
          operation: 'reopened',
          workstreamId: updated.id,
        },
        tx,
      );
      return updated;
    });
    return (await getWorkstreamById(updated.id, projectId))!;
  } catch (error) {
    logger.error('Error reopening workstream:', error);
    throw error;
  }
}

export async function deleteWorkstream(workstreamId: string, projectId: string): Promise<void> {
  try {
    const workstream = await getWorkstreamById(workstreamId, projectId);
    if (!workstream) throw new Error('Workstream not found or access denied');
    const allWorkstreams = await prisma.workstream.findMany({ where: { projectId } });
    const relatedSubstreamIds = substreamIds(workstreamId, buildSubstreamsByParent(allWorkstreams));
    if (relatedSubstreamIds.length) throw new Error('Cannot delete a workstream with sub-streams');
    await prisma.$transaction(async (tx) => {
      await tx.workstream.delete({ where: { id: workstreamId } });
      await logResourceChange(
        {
          projectId,
          resourceType: 'workstream',
          resourceId: workstreamId,
          resourceLabel: workstream.name,
          operation: 'deleted',
          workstreamId,
        },
        tx,
      );
    });
    logger.info(`Workstream deleted successfully: ${workstreamId}`);
  } catch (error) {
    logger.error('Error deleting workstream:', error);
    throw error;
  }
}

export async function getSubstreamWorkstreamIds(
  projectId: string,
  workstreamId: string,
): Promise<string[]> {
  const workstreams = await prisma.workstream.findMany({ where: { projectId } });
  return substreamIds(workstreamId, buildSubstreamsByParent(workstreams));
}

export async function getBreadcrumbForWorkstream(
  projectId: string,
  workstreamId: string,
): Promise<WorkstreamSummary[]> {
  const workstreams = await prisma.workstream.findMany({ where: { projectId } });
  const byId = new Map(workstreams.map((ws) => [ws.id, ws]));
  const ws = byId.get(workstreamId);
  if (!ws) return [];
  return [...computeParentStreams(ws, byId), ws].map(
    (item) => publicParent(item, computeDepth(item, byId))!,
  );
}
