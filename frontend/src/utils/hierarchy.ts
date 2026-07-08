import type { StatusUpdate, Workstream, WorkstreamSummary } from '../types/workstream';
import type { HierarchyFilter, SortConfig } from '../types/view';
import { workstreamReferenceText } from './workstreamReference';

export interface ParentGroup {
  key: string;
  name: string;
  parent?: WorkstreamSummary | null;
  workstreams: Workstream[];
}

interface ParentGroupingOptions {
  scopedParentIds?: string[];
}

export function getBreadcrumbItems(
  workstream: Workstream | WorkstreamSummary,
): WorkstreamSummary[] {
  return [
    ...(workstream.parentStreams || []),
    {
      id: workstream.id,
      number: workstream.number,
      name: workstream.name,
      state: workstream.state,
      parentId: workstream.parentId,
      depth: workstream.depth,
    },
  ];
}

export function getWorkstreamName(
  workstream: WorkstreamSummary | Workstream | null | undefined,
): string {
  return workstream?.name || workstream?.workstreamName || 'Untitled stream';
}

export function getStatusUpdateSource(update: StatusUpdate): WorkstreamSummary | undefined {
  return update.sourceWorkstream || update.source || update.workstream;
}

export function getLatestSubstreamActivitySourceId(
  source: WorkstreamSummary | null | undefined,
): string | undefined {
  return source?.workstreamId || source?.id;
}

export function getLatestSubstreamActivityAt(
  workstream: Workstream | WorkstreamSummary,
): string | null | undefined {
  return (
    workstream.lastSubstreamActivityAt ||
    workstream.lastActivityAt ||
    workstream.latestSubstreamActivitySource?.lastActivityAt ||
    workstream.latestSubstreamActivitySource?.updatedAt
  );
}

export function getBreadcrumbLabel(workstream: Workstream | WorkstreamSummary): string {
  return getBreadcrumbItems(workstream)
    .map((item) => workstreamReferenceText(item))
    .join(' > ');
}

export function getDirectSubstreamCount(workstream: Workstream): number {
  return (
    workstream.directSubstreamCount ??
    workstream.substreamCount ??
    workstream.substreams?.length ??
    0
  );
}

export function isObviousSubstream(
  candidate: Workstream | WorkstreamSummary,
  workstream: Workstream,
): boolean {
  if (candidate.id === workstream.id) return true;
  if ((candidate.parentStreams || []).some((parentStream) => parentStream.id === workstream.id))
    return true;
  return false;
}

export function applyHierarchyFilter(
  workstreams: Workstream[],
  filter: HierarchyFilter = 'all',
): Workstream[] {
  switch (filter) {
    case 'top-level':
    case 'no-parent':
      return workstreams.filter((ws) => !ws.parentId);
    case 'sub-streams':
      return workstreams.filter((ws) => Boolean(ws.parentId));
    case 'has-substreams':
      return workstreams.filter((ws) => getDirectSubstreamCount(ws) > 0);
    case 'all':
    default:
      return workstreams;
  }
}

function collectSubstreamIds(
  parentIds: Set<string>,
  workstreams: Workstream[],
  recursive: boolean,
): Set<string> {
  const childrenByParentId = new Map<string, Workstream[]>();
  workstreams.forEach((workstream) => {
    if (!workstream.parentId) return;
    const children = childrenByParentId.get(workstream.parentId) ?? [];
    children.push(workstream);
    childrenByParentId.set(workstream.parentId, children);
  });

  const scopedIds = new Set<string>();
  const queue = Array.from(parentIds);
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for (const child of childrenByParentId.get(parentId) ?? []) {
      if (scopedIds.has(child.id)) continue;
      scopedIds.add(child.id);
      if (recursive) queue.push(child.id);
    }
  }
  return scopedIds;
}

export function applyCockpitHierarchyFilter(
  workstreams: Workstream[],
  hierarchy: {
    mode: HierarchyFilter;
    parentId?: string | null;
    parentIds?: string[];
    includeSubstreams?: boolean;
  },
): Workstream[] {
  if (hierarchy.mode !== 'under-parent') return applyHierarchyFilter(workstreams, hierarchy.mode);

  const selectedParentIds = hierarchy.parentIds?.length
    ? hierarchy.parentIds
    : hierarchy.parentId
      ? [hierarchy.parentId]
      : [];
  const parentIds = new Set(selectedParentIds.filter(Boolean));
  if (parentIds.size === 0) return [];

  const scopedIds = collectSubstreamIds(
    parentIds,
    workstreams,
    Boolean(hierarchy.includeSubstreams),
  );
  return workstreams.filter((workstream) => scopedIds.has(workstream.id));
}

export function getHierarchyTimestamp(workstream: Workstream, field: SortConfig['field']): number {
  let value: string | null | undefined;
  switch (field) {
    case 'lastDirectUpdateAt':
      value = workstream.lastDirectUpdateAt || workstream.latestStatus?.createdAt;
      break;
    case 'lastSubstreamActivityAt':
      value = workstream.lastSubstreamActivityAt;
      break;
    case 'lastActivityAt':
      value = workstream.lastActivityAt || workstream.latestStatus?.createdAt;
      break;
    case 'createdAt':
      value = workstream.createdAt;
      break;
    case 'name':
    default:
      value = workstream.createdAt;
      break;
  }

  return value ? new Date(value).getTime() : new Date(workstream.createdAt).getTime();
}

function selectedAncestorForGrouping(
  ws: Workstream,
  selectedParentIds: Set<string>,
): WorkstreamSummary | null {
  if (selectedParentIds.size === 0 || !ws.parentId) return null;

  const ancestors = [...(ws.parentStreams || [])];
  if (ws.parent && !ancestors.some((ancestor) => ancestor.id === ws.parent?.id)) {
    ancestors.push(ws.parent);
  }

  for (const ancestor of ancestors.slice().reverse()) {
    if (selectedParentIds.has(ancestor.id)) return ancestor;
  }

  return null;
}

export function groupWorkstreamsByParent(
  workstreams: Workstream[],
  options: ParentGroupingOptions = {},
): ParentGroup[] {
  const byId = new Map(workstreams.map((ws) => [ws.id, ws]));
  const scopedParentIds = new Set(options.scopedParentIds?.filter(Boolean) ?? []);
  const parentsById = new Map<string, Workstream | WorkstreamSummary>();
  const substreamsByParentId = new Map<string, Workstream[]>();
  const topLevel: Workstream[] = [];

  workstreams.forEach((ws) => {
    if (!ws.parentId) {
      topLevel.push(ws);
      return;
    }

    const scopedParent = selectedAncestorForGrouping(ws, scopedParentIds);
    const groupParentId = scopedParent?.id ?? ws.parentId;
    const parent = scopedParent || byId.get(groupParentId) || ws.parent;
    if (parent) {
      if (!parentsById.has(groupParentId)) parentsById.set(groupParentId, parent);
      if (!substreamsByParentId.has(groupParentId)) substreamsByParentId.set(groupParentId, []);
      substreamsByParentId.get(groupParentId)!.push(ws);
    } else {
      topLevel.push(ws);
    }
  });

  const groups: ParentGroup[] = Array.from(parentsById.entries()).map(([parentId, parent]) => {
    const substreams = (substreamsByParentId.get(parentId) ?? []).filter(
      (ws) => ws.id !== parentId,
    );
    return {
      key: parentId,
      name: workstreamReferenceText(parent),
      parent,
      workstreams: substreams,
    };
  });

  const groupedIds = new Set(
    groups.flatMap((group) => [group.key, ...group.workstreams.map((ws) => ws.id)]),
  );
  const ungroupedTopLevel = topLevel.filter((ws) => !groupedIds.has(ws.id));
  if (ungroupedTopLevel.length > 0) {
    groups.push({
      key: 'top-level',
      name: 'Top level / no parent',
      parent: null,
      workstreams: ungroupedTopLevel,
    });
  }

  return groups;
}

export const CLOSED_PARENT_SUBSTREAM_MESSAGE = 'Cannot create a sub-stream under a closed parent.';

export function hierarchyErrorMessage(error: unknown): string {
  const maybe = error as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  };
  const message =
    maybe.response?.data?.error || maybe.response?.data?.message || maybe.message || '';
  if (/closed parent/i.test(message))
    return 'Cannot create or move a stream under a closed parent.';
  if (/depth/i.test(message)) return 'That parent stream would exceed the maximum depth of 5.';
  if (/cycle|sub-stream|self/i.test(message))
    return 'That parent stream relationship would create an invalid cycle.';
  return message || 'Parent stream change failed. Please try again.';
}
