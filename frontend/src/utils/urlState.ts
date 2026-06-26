import type { TimelineEventType } from '../hooks/useTimeline';
import type { HierarchyFilter, SortConfig, ViewConfig } from '../types/view';
import type { Category, Workstream } from '../types/workstream';

const hierarchyModes = new Set<HierarchyFilter>(['all', 'top-level', 'sub-streams', 'no-parent', 'has-substreams', 'under-parent']);
const timelineScopes = new Set(['all', 'top-level', 'sub-streams', 'under-parent'] as const);
const timelineQuickPresets = new Set(['last-7-days', 'last-14-days', 'last-30-days', 'last-60-days', 'this-month', 'last-month', 'this-quarter', 'last-quarter'] as const);
const activityTypes = new Set<TimelineEventType>(['status_update', 'workstream_created', 'workstream_closed', 'parent_changed', 'sub_stream_created']);
const sortFields = new Set<SortConfig['field']>(['name', 'createdAt', 'lastDirectUpdateAt', 'lastActivityAt', 'lastSubstreamActivityAt']);
const sortDirections = new Set<SortConfig['direction']>(['asc', 'desc']);
const groupBy = new Set(['none', 'category', 'parent'] as const);

function splitList(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((part) => part.trim()).filter(Boolean);
}

function stableList(values: string[]): string {
  return [...values].sort((a, b) => a.localeCompare(b)).join(',');
}

export function slugifyUrlPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugForEntity(entity: { id: string; name: string }): string {
  return slugifyUrlPart(entity.name) || entity.id;
}

function slugById(entities: Array<{ id: string; name: string }> = []): Map<string, string> {
  const counts = new Map<string, number>();
  const result = new Map<string, string>();
  for (const entity of entities) {
    const base = slugForEntity(entity);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    result.set(entity.id, count === 0 ? base : `${base}-${count + 1}`);
  }
  return result;
}

function idBySlug(entities: Array<{ id: string; name: string }> = []): Map<string, string> {
  const byId = slugById(entities);
  return new Map(Array.from(byId.entries()).map(([id, slug]) => [slug, id]));
}

export function resolveEntityParam(value: string | null | undefined, entities: Array<{ id: string; name: string }> = []): string | undefined {
  if (!value) return undefined;
  return entities.find((entity) => entity.id === value)?.id ?? idBySlug(entities).get(value);
}

function resolveCategoryValues(values: string[], categories: Category[] = []): string[] {
  return values
    .map((value) => categories.find((category) => category.id === value)?.id ?? idBySlug(categories).get(value))
    .filter((value): value is string => Boolean(value));
}

function categoryValuesFromSearch(searchParams: URLSearchParams, categories: Category[] = []): string[] {
  if (searchParams.has('categories')) return resolveCategoryValues(splitList(searchParams.get('categories')), categories);
  if (searchParams.has('categoryIds')) {
    const values = splitList(searchParams.get('categoryIds'));
    return categories.length > 0 ? resolveCategoryValues(values, categories) : values;
  }
  return [];
}

function categorySearchValue(categoryIds: string[], categories: Category[] = []): string {
  const slugs = slugById(categories);
  return stableList(categoryIds.map((id) => slugs.get(id) ?? id));
}

function setCategoryListIfDifferent(params: URLSearchParams, current: string[], base: string[], categories: Category[] = []) {
  if (stableList(current) !== stableList(base)) {
    params.set('categories', categorySearchValue(current, categories));
  }
}

function resolveWorkstreamValues(values: string[], workstreams: Workstream[] = []): string[] {
  return values
    .map((value) => workstreams.find((workstream) => workstream.id === value || String(workstream.number) === value)?.id ?? value)
    .filter(Boolean);
}

function workstreamSearchValue(parentIds: string[], workstreams: Workstream[] = []): string {
  return stableList(parentIds.map((id) => {
    const workstream = workstreams.find((candidate) => candidate.id === id);
    return workstream?.number !== undefined ? String(workstream.number) : id;
  }));
}

export function viewUrlValue(view: Pick<ViewConfig, 'id' | 'name'> | null | undefined): string | null {
  return view ? slugForEntity(view) : null;
}

function isTrue(value: string | null): boolean {
  return value === '1' || value === 'true';
}

function parseUrlDate(value: string | null): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? value : undefined;
}

function booleanParam(value: boolean): string {
  return value ? '1' : '0';
}

function setListIfDifferent(params: URLSearchParams, key: string, current: string[], base: string[]) {
  if (stableList(current) !== stableList(base)) {
    params.set(key, stableList(current));
  }
}

export function applyCockpitSearchToConfig(
  baseConfig: ViewConfig['config'],
  searchParams: URLSearchParams,
  options: { categories?: Category[]; workstreams?: Workstream[] } = {}
): ViewConfig['config'] {
  const next: ViewConfig['config'] = structuredClone(baseConfig);
  const tags = splitList(searchParams.get('tags'));
  const categoryIds = categoryValuesFromSearch(searchParams, options.categories);
  const hierarchy = searchParams.get('hierarchy');
  const sort = searchParams.get('sort');
  const group = searchParams.get('group');
  const parentId = searchParams.get('parentId');
  const parentIds = resolveWorkstreamValues(splitList(searchParams.get('parentIds')), options.workstreams);

  if (searchParams.has('tags')) next.filters.tags = tags;
  if (searchParams.has('categories') || searchParams.has('categoryIds')) next.filters.categoryIds = categoryIds;
  if (searchParams.has('notUpdatedToday')) next.filters.temporal.notUpdatedToday = isTrue(searchParams.get('notUpdatedToday'));
  if (hierarchyModes.has(hierarchy as HierarchyFilter)) next.filters.hierarchy.mode = hierarchy as HierarchyFilter;
  if (searchParams.has('includeSubstreams')) next.filters.hierarchy.includeSubstreams = isTrue(searchParams.get('includeSubstreams'));
  if (searchParams.has('parentIds')) {
    next.filters.hierarchy.parentIds = parentIds;
    next.filters.hierarchy.parentId = parentIds[0] || null;
  } else if (searchParams.has('parentId')) {
    const resolvedParentIds = resolveWorkstreamValues(parentId ? [parentId] : [], options.workstreams);
    next.filters.hierarchy.parentId = resolvedParentIds[0] || parentId || null;
    next.filters.hierarchy.parentIds = resolvedParentIds.length > 0 ? resolvedParentIds : (parentId ? [parentId] : []);
  }

  if (sort) {
    const [field, direction] = sort.split(':');
    if (sortFields.has(field as SortConfig['field']) && sortDirections.has(direction as SortConfig['direction'])) {
      next.sort = { field: field as SortConfig['field'], direction: direction as SortConfig['direction'] };
    }
  }

  if (groupBy.has(group as ViewConfig['config']['group']['by'])) {
    next.group = { by: group as ViewConfig['config']['group']['by'] };
  }

  return next;
}

export function serializeCockpitConfigSearch(
  viewId: string | null | undefined,
  currentConfig: ViewConfig['config'],
  baseConfig?: ViewConfig['config'],
  options: { viewValue?: string | null; categories?: Category[]; workstreams?: Workstream[] } = {}
): URLSearchParams {
  const params = new URLSearchParams();
  const viewValue = options.viewValue ?? viewId;
  if (viewValue) params.set('view', viewValue);

  const base = baseConfig ?? {
    filters: {
      categoryIds: [],
      tags: [],
      temporal: { notUpdatedToday: false },
      hierarchy: { mode: 'all', parentId: null, parentIds: [], includeSubstreams: false },
    },
    sort: { field: 'lastActivityAt', direction: 'desc' },
    group: { by: 'category' },
  } as ViewConfig['config'];

  setListIfDifferent(params, 'tags', currentConfig.filters.tags, base.filters.tags);
  setCategoryListIfDifferent(params, currentConfig.filters.categoryIds, base.filters.categoryIds, options.categories);
  if (currentConfig.filters.temporal.notUpdatedToday !== base.filters.temporal.notUpdatedToday) {
    params.set('notUpdatedToday', booleanParam(currentConfig.filters.temporal.notUpdatedToday));
  }
  if (currentConfig.filters.hierarchy.mode !== base.filters.hierarchy.mode) params.set('hierarchy', currentConfig.filters.hierarchy.mode);
  const currentParentIds = currentConfig.filters.hierarchy.parentIds ?? (currentConfig.filters.hierarchy.parentId ? [currentConfig.filters.hierarchy.parentId] : []);
  const baseParentIds = base.filters.hierarchy.parentIds ?? (base.filters.hierarchy.parentId ? [base.filters.hierarchy.parentId] : []);
  if (stableList(currentParentIds) !== stableList(baseParentIds)) {
    params.set('parentIds', workstreamSearchValue(currentParentIds, options.workstreams));
  }
  if (currentConfig.filters.hierarchy.includeSubstreams !== base.filters.hierarchy.includeSubstreams) {
    params.set('includeSubstreams', booleanParam(currentConfig.filters.hierarchy.includeSubstreams));
  }
  if (currentConfig.sort.field !== base.sort.field || currentConfig.sort.direction !== base.sort.direction) {
    params.set('sort', `${currentConfig.sort.field}:${currentConfig.sort.direction}`);
  }
  if (currentConfig.group.by !== base.group.by) params.set('group', currentConfig.group.by);
  return params;
}

export type TimelineQuickPreset = typeof timelineQuickPresets extends Set<infer Preset> ? Preset : never;

export interface TimelineUrlState {
  tags: string[];
  categoryIds: string[];
  quickPreset?: TimelineQuickPreset;
  startDate?: string;
  endDate?: string;
  streamScope: 'all' | 'top-level' | 'sub-streams' | 'under-parent';
  parentId?: string;
  includeSubstreams: boolean;
  activity: 'all' | TimelineEventType;
}

export function parseTimelineSearch(searchParams: URLSearchParams, options: { categories?: Category[] } = {}): TimelineUrlState {
  const scope = searchParams.get('scope');
  const activity = searchParams.get('activity');
  const range = searchParams.get('range');
  const startDate = parseUrlDate(searchParams.get('startDate'));
  const endDate = parseUrlDate(searchParams.get('endDate'));
  const quickPreset = startDate || endDate
    ? undefined
    : timelineQuickPresets.has(range as TimelineQuickPreset)
      ? range as TimelineQuickPreset
      : 'last-7-days';

  return {
    tags: splitList(searchParams.get('tags')),
    categoryIds: categoryValuesFromSearch(searchParams, options.categories),
    quickPreset,
    startDate,
    endDate,
    streamScope: timelineScopes.has(scope as TimelineUrlState['streamScope']) ? scope as TimelineUrlState['streamScope'] : 'all',
    parentId: searchParams.get('parentId') || undefined,
    includeSubstreams: isTrue(searchParams.get('includeSubstreams')),
    activity: activityTypes.has(activity as TimelineEventType) ? activity as TimelineEventType : 'all',
  };
}

export function serializeTimelineSearch(state: TimelineUrlState, options: { categories?: Category[] } = {}): URLSearchParams {
  const params = new URLSearchParams();
  if (state.tags.length > 0) params.set('tags', stableList(state.tags));
  if (state.categoryIds.length > 0) params.set('categories', categorySearchValue(state.categoryIds, options.categories));
  if (state.quickPreset && state.quickPreset !== 'last-7-days') {
    params.set('range', state.quickPreset);
  } else if (!state.quickPreset) {
    if (state.startDate) params.set('startDate', state.startDate);
    if (state.endDate) params.set('endDate', state.endDate);
  }
  if (state.streamScope !== 'all') params.set('scope', state.streamScope);
  if (state.streamScope === 'under-parent' && state.parentId) params.set('parentId', state.parentId);
  if (state.includeSubstreams) params.set('includeSubstreams', '1');
  if (state.activity !== 'all') params.set('activity', state.activity);
  return params;
}

export function dateToUrlDate(date: Date | undefined): string | undefined {
  if (!date || Number.isNaN(date.getTime())) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function urlDateToDate(value: string | undefined): Date | undefined {
  const parsed = parseUrlDate(value ?? null);
  if (!parsed) return undefined;
  const [year, month, day] = parsed.split('-').map(Number);
  return new Date(year, month - 1, day);
}
