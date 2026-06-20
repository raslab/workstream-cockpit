import type { StatusUpdate, Workstream, WorkstreamSummary } from '../types/workstream';
import type { HierarchyFilter, SortConfig } from '../types/view';

export interface ParentGroup {
  key: string;
  name: string;
  parent?: WorkstreamSummary | null;
  workstreams: Workstream[];
}

export function getBreadcrumbItems(workstream: Workstream): WorkstreamSummary[] {
  return [...(workstream.ancestors || []), { id: workstream.id, name: workstream.name, state: workstream.state, parentId: workstream.parentId, depth: workstream.depth }];
}

export function getWorkstreamName(workstream: WorkstreamSummary | Workstream | null | undefined): string {
  return workstream?.name || workstream?.workstreamName || 'Untitled stream';
}

export function getStatusUpdateSource(update: StatusUpdate): WorkstreamSummary | undefined {
  return update.sourceWorkstream || update.source || update.workstream;
}

export function getLatestSubstreamActivitySourceId(source: WorkstreamSummary | null | undefined): string | undefined {
  return source?.workstreamId || source?.id;
}

export function getLatestSubstreamActivityAt(workstream: Workstream | WorkstreamSummary): string | null | undefined {
  return workstream.lastSubstreamActivityAt || workstream.lastActivityAt || workstream.latestSubstreamActivitySource?.lastActivityAt || workstream.latestSubstreamActivitySource?.updatedAt;
}

export function getBreadcrumbLabel(workstream: Workstream): string {
  return getBreadcrumbItems(workstream).map((item) => getWorkstreamName(item)).join(' > ');
}

export function getDirectChildCount(workstream: Workstream): number {
  return workstream.directChildCount ?? workstream.childCount ?? workstream.children?.length ?? 0;
}

export function isObviousDescendant(candidate: Workstream, workstream: Workstream): boolean {
  if (candidate.id === workstream.id) return true;
  if ((candidate.ancestors || []).some((ancestor) => ancestor.id === workstream.id)) return true;
  if ((workstream.children || []).some((child) => child.id === candidate.id)) return true;
  return false;
}

export function applyHierarchyFilter(workstreams: Workstream[], filter: HierarchyFilter = 'all'): Workstream[] {
  switch (filter) {
    case 'top-level':
    case 'no-parent':
      return workstreams.filter((ws) => !ws.parentId);
    case 'sub-streams':
      return workstreams.filter((ws) => Boolean(ws.parentId));
    case 'has-substreams':
      return workstreams.filter((ws) => getDirectChildCount(ws) > 0);
    case 'all':
    default:
      return workstreams;
  }
}

export function getHierarchyTimestamp(workstream: Workstream, field: SortConfig['field']): number {
  let value: string | null | undefined;
  switch (field) {
    case 'lastDirectUpdateAt':
      value = workstream.lastDirectUpdateAt || workstream.latestStatus?.updatedAt;
      break;
    case 'lastSubstreamActivityAt':
      value = workstream.lastSubstreamActivityAt;
      break;
    case 'lastActivityAt':
      value = workstream.lastActivityAt || workstream.latestStatus?.updatedAt;
      break;
    case 'updatedAt':
      value = workstream.latestStatus?.updatedAt;
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

export function groupWorkstreamsByParent(workstreams: Workstream[]): ParentGroup[] {
  const byId = new Map(workstreams.map((ws) => [ws.id, ws]));
  const parentIds = new Set<string>();
  const topLevel: Workstream[] = [];

  workstreams.forEach((ws) => {
    if (ws.parentId && byId.has(ws.parentId)) {
      parentIds.add(ws.parentId);
    } else if (!ws.parentId || !byId.has(ws.parentId)) {
      topLevel.push(ws);
    }
  });

  const groups: ParentGroup[] = Array.from(parentIds).map((parentId) => {
    const parent = byId.get(parentId)!;
    return {
      key: parent.id,
      name: parent.name,
      parent,
      workstreams: [parent, ...workstreams.filter((ws) => ws.parentId === parent.id && ws.id !== parent.id)],
    };
  });

  const groupedIds = new Set(groups.flatMap((group) => group.workstreams.map((ws) => ws.id)));
  const ungroupedTopLevel = topLevel.filter((ws) => !groupedIds.has(ws.id));
  if (ungroupedTopLevel.length > 0) {
    groups.push({ key: 'top-level', name: 'Top level / no parent', parent: null, workstreams: ungroupedTopLevel });
  }

  return groups;
}

export const CLOSED_PARENT_SUBSTREAM_MESSAGE = 'Cannot create a sub-stream under a closed parent.';

export function hierarchyErrorMessage(error: unknown): string {
  const maybe = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
  const message = maybe.response?.data?.error || maybe.response?.data?.message || maybe.message || '';
  if (/closed parent/i.test(message)) return 'Cannot create or move a stream under a closed parent.';
  if (/depth/i.test(message)) return 'That parent would exceed the maximum hierarchy depth of 5.';
  if (/cycle|descendant|self/i.test(message)) return 'That parent relationship would create an invalid hierarchy.';
  return message || 'Hierarchy change failed. Please try again.';
}
