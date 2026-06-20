import { Prisma, PrismaClient, Workstream, StatusUpdate } from '@prisma/client';
import { logger } from '../utils/logger';
import { extractTagsFromFields } from '../utils/tagExtractor';

const prisma = new PrismaClient();
const MAX_HIERARCHY_DEPTH = 5;

type LatestSubstreamActivitySource = { workstreamId: string; workstreamName: string; name?: string; updateId?: string; eventId?: string; eventType?: string; createdAt: Date };
type ActivityMetadata = {
  lastDirectUpdateAt: Date | null;
  lastSubstreamActivityAt: Date | null;
  lastActivityAt: Date | null;
  latestSubstreamActivitySource: LatestSubstreamActivitySource | null;
};
type WorkstreamSummary = Pick<Workstream, 'id' | 'name' | 'state' | 'parentId' | 'createdAt' | 'closedAt'> & { depth?: number } & Partial<ActivityMetadata>;
type PrismaTx = Prisma.TransactionClient;
type PrismaExecutor = PrismaClient | PrismaTx;

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
  ancestors?: WorkstreamSummary[];
  children?: WorkstreamSummary[];
  childCount?: number;
  directChildCount?: number;
  activeChildCount?: number;
  closedChildCount?: number;
  depth?: number;
  lastDirectUpdateAt?: Date | null;
  lastSubstreamActivityAt?: Date | null;
  lastActivityAt?: Date | null;
  latestSubstreamActivitySource?: LatestSubstreamActivitySource | null;
}

function publicParent(parent: Workstream | null | undefined, depth?: number, activity?: ActivityMetadata): WorkstreamSummary | null {
  if (!parent) return null;
  return { id: parent.id, name: parent.name, state: parent.state, parentId: parent.parentId, createdAt: parent.createdAt, closedAt: parent.closedAt, depth, ...activity };
}

function buildChildrenMap(workstreams: Workstream[]): Map<string | null, Workstream[]> {
  const map = new Map<string | null, Workstream[]>();
  for (const ws of workstreams) {
    const key = ws.parentId ?? null;
    const list = map.get(key) ?? [];
    list.push(ws);
    map.set(key, list);
  }
  Array.from(map.values()).forEach(list => list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
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

function computeAncestors(workstream: Workstream, byId: Map<string, Workstream>): Workstream[] {
  const ancestors: Workstream[] = [];
  let parentId = workstream.parentId;
  const seen = new Set<string>([workstream.id]);
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent || seen.has(parent.id)) break;
    ancestors.unshift(parent);
    seen.add(parent.id);
    parentId = parent.parentId;
  }
  return ancestors;
}

function descendantIds(workstreamId: string, childrenMap: Map<string | null, Workstream[]>): string[] {
  const ids: string[] = [];
  const visited = new Set<string>([workstreamId]);
  const stack = [...(childrenMap.get(workstreamId) ?? [])];
  while (stack.length) {
    const child = stack.pop()!;
    if (visited.has(child.id)) continue;
    visited.add(child.id);
    ids.push(child.id);
    stack.push(...(childrenMap.get(child.id) ?? []));
  }
  return ids;
}

function subtreeMaxRelativeDepth(workstreamId: string, childrenMap: Map<string | null, Workstream[]>): number {
  let maxDepth = 1;
  const visited = new Set<string>([workstreamId]);
  const stack = (childrenMap.get(workstreamId) ?? []).map(child => ({ id: child.id, depth: 2 }));
  while (stack.length) {
    const item = stack.pop()!;
    if (visited.has(item.id)) continue;
    visited.add(item.id);
    maxDepth = Math.max(maxDepth, item.depth);
    stack.push(...(childrenMap.get(item.id) ?? []).map(child => ({ id: child.id, depth: item.depth + 1 })));
  }
  return maxDepth;
}

async function enrichWorkstreams<T extends Workstream & { statusUpdates?: StatusUpdate[]; category?: any }>(rows: T[], includeChildren = false): Promise<WorkstreamWithLatestStatus[]> {
  if (rows.length === 0) return [];
  const projectId = rows[0].projectId;
  const allWorkstreams = await prisma.workstream.findMany({ where: { projectId } });
  const byId = new Map(allWorkstreams.map(ws => [ws.id, ws]));
  const childrenMap = buildChildrenMap(allWorkstreams);
  const allIds = allWorkstreams.map(ws => ws.id);
  const latestUpdates = await prisma.statusUpdate.findMany({ where: { workstreamId: { in: allIds } }, orderBy: { createdAt: 'desc' } });
  const latestByWorkstream = new Map<string, StatusUpdate>();
  for (const update of latestUpdates) if (!latestByWorkstream.has(update.workstreamId)) latestByWorkstream.set(update.workstreamId, update);
  const structuralEvents = await prisma.workstreamEvent.findMany({ where: { workstreamId: { in: allIds } }, orderBy: { createdAt: 'desc' } });
  const latestEventByWorkstream = new Map<string, any>();
  for (const event of structuralEvents) if (!latestEventByWorkstream.has(event.workstreamId)) latestEventByWorkstream.set(event.workstreamId, event);

  const computeActivityMetadata = (workstreamId: string, directLatestOverride?: StatusUpdate): ActivityMetadata => {
    const directLatest = directLatestOverride ?? latestByWorkstream.get(workstreamId);
    const descendants = descendantIds(workstreamId, childrenMap);
    let latestSubstreamActivityAt: Date | null = null;
    let latestSubstreamActivitySource: LatestSubstreamActivitySource | null = null;
    for (const descendantId of descendants) {
      const update = latestByWorkstream.get(descendantId);
      const event = latestEventByWorkstream.get(descendantId);
      const candidate = update && (!event || update.createdAt >= event.createdAt)
        ? { at: update.createdAt, source: { workstreamId: descendantId, workstreamName: byId.get(descendantId)?.name ?? '', name: byId.get(descendantId)?.name ?? '', updateId: update.id, createdAt: update.createdAt } }
        : event
          ? { at: event.createdAt, source: { workstreamId: descendantId, workstreamName: byId.get(descendantId)?.name ?? '', name: byId.get(descendantId)?.name ?? '', eventId: event.id, eventType: event.eventType, createdAt: event.createdAt } }
          : null;
      if (candidate && (!latestSubstreamActivityAt || candidate.at > latestSubstreamActivityAt)) {
        latestSubstreamActivityAt = candidate.at;
        latestSubstreamActivitySource = candidate.source;
      }
    }
    const lastDirectUpdateAt = directLatest?.createdAt ?? null;
    const lastActivityAt = [lastDirectUpdateAt, latestSubstreamActivityAt].filter(Boolean).sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as Date | undefined;

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
    const directChildren = childrenMap.get(row.id) ?? [];
    const depth = computeDepth(row, byId);
    const ancestors = computeAncestors(row, byId).map(a => publicParent(a, computeDepth(a, byId))!);
    const parent = publicParent(row.parentId ? byId.get(row.parentId) : null, row.parentId ? depth - 1 : undefined);
    const workstreamData = { ...row } as any;
    delete workstreamData.statusUpdates;
    const latestStatus = directLatest || undefined;
    const texts = [row.context, ...(statusUpdates.length ? statusUpdates : latestStatus ? [latestStatus] : []).flatMap(su => [su.status, su.note])];
    return {
      ...workstreamData,
      latestStatus,
      allTags: extractTagsFromFields(...texts),
      parent,
      ancestors,
      ...(includeChildren ? { children: directChildren.map(child => publicParent(child, depth + 1, computeActivityMetadata(child.id))) } : {}),
      childCount: directChildren.length,
      directChildCount: directChildren.length,
      activeChildCount: directChildren.filter(child => child.state === 'active').length,
      closedChildCount: directChildren.filter(child => child.state === 'closed').length,
      depth,
      ...activity,
    };
  });
}

async function assertCategoryBelongsToProject(client: PrismaExecutor, categoryId: string | null | undefined, projectId: string): Promise<void> {
  if (categoryId === undefined || categoryId === null) return;
  const category = await client.category.findFirst({ where: { id: categoryId, projectId }, select: { id: true } });
  if (!category) throw new Error('Category not found');
}

async function assertValidParent(client: PrismaExecutor, projectId: string, workstreamId: string | undefined, parentId: string | null | undefined): Promise<void> {
  if (parentId === undefined || parentId === null) return;
  if (workstreamId && parentId === workstreamId) throw new Error('A workstream cannot be its own parent');
  const parent = await client.workstream.findFirst({ where: { id: parentId, projectId } });
  if (!parent) throw new Error('Parent workstream not found');
  if (parent.state === 'closed') throw new Error('Cannot move under a closed parent');

  const allWorkstreams = await client.workstream.findMany({ where: { projectId } });
  const byId = new Map(allWorkstreams.map(ws => [ws.id, ws]));
  const childrenMap = buildChildrenMap(allWorkstreams);
  if (workstreamId && descendantIds(workstreamId, childrenMap).includes(parentId)) throw new Error('Cannot move a workstream under its descendant because that would create a cycle');
  const parentDepth = computeDepth(parent, byId);
  const relativeDepth = workstreamId ? subtreeMaxRelativeDepth(workstreamId, childrenMap) : 1;
  if (parentDepth + relativeDepth > MAX_HIERARCHY_DEPTH) throw new Error(`Hierarchy depth cannot exceed ${MAX_HIERARCHY_DEPTH} levels`);
}

async function hierarchyTransaction<T>(fn: (tx: PrismaTx) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function getWorkstreams(projectId: string, state?: 'active' | 'closed' | 'all', tags?: string[], categoryIds?: string[], notUpdatedToday?: boolean): Promise<WorkstreamWithLatestStatus[]> {
  try {
    const whereClause: any = { projectId };
    if (state && state !== 'all') whereClause.state = state;
    if (categoryIds?.length) whereClause.categoryId = { in: categoryIds };
    let workstreams: any[] = await prisma.workstream.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true, color: true, emoji: true, sortOrder: true } },
        statusUpdates: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (tags?.length) {
      const normalizedFilterTags = tags.map(t => t.toLowerCase());
      workstreams = workstreams.filter(ws => {
        const texts = [ws.context, ...ws.statusUpdates.flatMap((su: StatusUpdate) => [su.status, su.note])];
        const wsTags = extractTagsFromFields(...texts);
        return normalizedFilterTags.some(filterTag => wsTags.includes(filterTag));
      });
    }
    if (notUpdatedToday) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      workstreams = workstreams.filter(ws => ws.statusUpdates.length === 0 || new Date(ws.statusUpdates[0].updatedAt) < startOfToday);
    }
    return enrichWorkstreams(workstreams, false);
  } catch (error) {
    logger.error('Error getting workstreams:', error);
    throw error;
  }
}

export async function getWorkstreamById(workstreamId: string, projectId: string): Promise<WorkstreamWithLatestStatus | null> {
  try {
    const workstream: any = await prisma.workstream.findFirst({
      where: { id: workstreamId, projectId },
      include: {
        category: { select: { id: true, name: true, color: true, emoji: true, sortOrder: true } },
        statusUpdates: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!workstream) return null;
    return (await enrichWorkstreams([workstream], true))[0];
  } catch (error) {
    logger.error('Error getting workstream by ID:', error);
    throw error;
  }
}

export async function createWorkstream(input: CreateWorkstreamInput): Promise<WorkstreamWithLatestStatus> {
  try {
    logger.info(`Creating new workstream: ${input.name} for project ${input.projectId}`);
    const result = await hierarchyTransaction(async (tx) => {
      await assertCategoryBelongsToProject(tx, input.categoryId, input.projectId);
      await assertValidParent(tx, input.projectId, undefined, input.parentId);
      const parent = input.parentId ? await tx.workstream.findUnique({ where: { id: input.parentId } }) : null;
      const workstream = await tx.workstream.create({
        data: { projectId: input.projectId, name: input.name, categoryId: input.categoryId, parentId: input.parentId ?? null, context: input.context, state: 'active' },
      });
      if (input.initialStatus) await tx.statusUpdate.create({ data: { workstreamId: workstream.id, status: input.initialStatus, note: input.initialNote } });
      if (input.parentId) {
        const allWorkstreams = await tx.workstream.findMany({ where: { projectId: input.projectId } });
        const byId = new Map(allWorkstreams.map(ws => [ws.id, ws]));
        const parentBreadcrumb = parent ? [...computeAncestors(parent, byId), parent].map(ws => ws.name).join(' > ') : null;
        await tx.workstreamEvent.create({
          data: {
            workstreamId: workstream.id,
            eventType: 'sub_stream_created',
            metadata: { oldParentId: null, oldParentName: null, oldParentBreadcrumb: null, newParentId: input.parentId, newParentName: parent?.name ?? null, newParentBreadcrumb: parentBreadcrumb },
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

export async function updateWorkstream(workstreamId: string, projectId: string, updates: UpdateWorkstreamInput): Promise<WorkstreamWithLatestStatus> {
  try {
    const result = await hierarchyTransaction(async (tx) => {
      const existing = await tx.workstream.findFirst({ where: { id: workstreamId, projectId } });
      if (!existing) throw new Error('Workstream not found or access denied');
      await assertCategoryBelongsToProject(tx, updates.categoryId, projectId);
      if (Object.prototype.hasOwnProperty.call(updates, 'parentId')) await assertValidParent(tx, projectId, workstreamId, updates.parentId);
      const data: any = { ...updates };
      const parentChanged = Object.prototype.hasOwnProperty.call(updates, 'parentId') && existing.parentId !== (updates.parentId ?? null);
      const oldParent = existing.parentId ? await tx.workstream.findUnique({ where: { id: existing.parentId } }) : null;
      const newParent = updates.parentId ? await tx.workstream.findUnique({ where: { id: updates.parentId } }) : null;
      const allWorkstreams = parentChanged ? await tx.workstream.findMany({ where: { projectId } }) : [];
      const byId = new Map(allWorkstreams.map(ws => [ws.id, ws]));
      const oldParentBreadcrumb = oldParent ? [...computeAncestors(oldParent, byId), oldParent].map(ws => ws.name).join(' > ') : null;
      const newParentBreadcrumb = newParent ? [...computeAncestors(newParent, byId), newParent].map(ws => ws.name).join(' > ') : null;
      const updated = await tx.workstream.update({ where: { id: workstreamId }, data });
      if (parentChanged) {
        await tx.workstreamEvent.create({
          data: {
            workstreamId,
            eventType: 'parent_changed',
            metadata: { oldParentId: existing.parentId, oldParentName: oldParent?.name ?? null, oldParentBreadcrumb, newParentId: updates.parentId ?? null, newParentName: newParent?.name ?? null, newParentBreadcrumb },
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

export async function closeWorkstream(workstreamId: string, projectId: string): Promise<WorkstreamWithLatestStatus> {
  try {
    const updated = await hierarchyTransaction(async (tx) => {
      const workstream = await tx.workstream.findFirst({ where: { id: workstreamId, projectId } });
      if (!workstream) throw new Error('Workstream not found or access denied');
      const allWorkstreams = await tx.workstream.findMany({ where: { projectId } });
      const byId = new Map(allWorkstreams.map(ws => [ws.id, ws]));
      const activeDescendants = descendantIds(workstreamId, buildChildrenMap(allWorkstreams)).filter(id => byId.get(id)?.state === 'active');
      if (activeDescendants.length) throw new Error('Cannot close a workstream with active descendants');
      return tx.workstream.update({ where: { id: workstreamId }, data: { state: 'closed', closedAt: new Date() } });
    });
    return (await getWorkstreamById(updated.id, projectId))!;
  } catch (error) {
    logger.error('Error closing workstream:', error);
    throw error;
  }
}

export async function reopenWorkstream(workstreamId: string, projectId: string): Promise<WorkstreamWithLatestStatus> {
  try {
    const updated = await hierarchyTransaction(async (tx) => {
      const workstream = await tx.workstream.findFirst({ where: { id: workstreamId, projectId } });
      if (!workstream) throw new Error('Workstream not found or access denied');
      if (workstream.parentId) {
        const parent = await tx.workstream.findFirst({ where: { id: workstream.parentId, projectId } });
        if (parent?.state === 'closed') throw new Error('Cannot reopen a workstream while its parent is closed');
      }
      return tx.workstream.update({ where: { id: workstreamId }, data: { state: 'active', closedAt: null } });
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
    const descendants = descendantIds(workstreamId, buildChildrenMap(allWorkstreams));
    if (descendants.length) throw new Error('Cannot delete a workstream with descendants');
    await prisma.workstream.delete({ where: { id: workstreamId } });
    logger.info(`Workstream deleted successfully: ${workstreamId}`);
  } catch (error) {
    logger.error('Error deleting workstream:', error);
    throw error;
  }
}

export async function getDescendantWorkstreamIds(projectId: string, workstreamId: string): Promise<string[]> {
  const workstreams = await prisma.workstream.findMany({ where: { projectId } });
  return descendantIds(workstreamId, buildChildrenMap(workstreams));
}

export async function getBreadcrumbForWorkstream(projectId: string, workstreamId: string): Promise<WorkstreamSummary[]> {
  const workstreams = await prisma.workstream.findMany({ where: { projectId } });
  const byId = new Map(workstreams.map(ws => [ws.id, ws]));
  const ws = byId.get(workstreamId);
  if (!ws) return [];
  return [...computeAncestors(ws, byId), ws].map(item => publicParent(item, computeDepth(item, byId))!);
}
