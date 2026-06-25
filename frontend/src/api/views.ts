import { apiClient } from './client';
import type { FilterConfig, GroupConfig, SortConfig, ViewConfig } from '../types/view';

export const DEFAULT_VIEW_CONFIG: ViewConfig['config'] = {
  filters: {
    categoryIds: [],
    tags: [],
    temporal: { notUpdatedToday: false },
    hierarchy: {
      mode: 'all',
      parentId: null,
      parentIds: [],
      includeSubstreams: false,
      timelineScope: 'all',
      includeStructuralEvents: true,
    },
  },
  sort: { field: 'lastActivityAt', direction: 'desc' },
  group: { by: 'category' },
};

type LegacySortConfig = Partial<Omit<SortConfig, 'field'>> & { field?: SortConfig['field'] | 'updatedAt' };

type ApiViewConfig = Partial<{
  filters: Partial<Omit<FilterConfig, 'temporal' | 'hierarchy'>> & {
    temporal?: Partial<FilterConfig['temporal']>;
    hierarchy?: Partial<FilterConfig['hierarchy']>;
  };
  sort: LegacySortConfig;
  group: Partial<GroupConfig>;
}>;

function normalizeSort(sort?: LegacySortConfig | null): SortConfig {
  const field = sort?.field === 'updatedAt' ? 'lastActivityAt' : sort?.field;
  return {
    ...DEFAULT_VIEW_CONFIG.sort,
    ...sort,
    field: field || DEFAULT_VIEW_CONFIG.sort.field,
  };
}

export function normalizeViewConfig(config?: ApiViewConfig | null): ViewConfig['config'] {
  return {
    filters: {
      ...DEFAULT_VIEW_CONFIG.filters,
      ...config?.filters,
      temporal: {
        ...DEFAULT_VIEW_CONFIG.filters.temporal,
        ...config?.filters?.temporal,
      },
      hierarchy: {
        ...DEFAULT_VIEW_CONFIG.filters.hierarchy,
        ...config?.filters?.hierarchy,
        parentIds: config?.filters?.hierarchy?.parentIds ?? (config?.filters?.hierarchy?.parentId ? [config.filters.hierarchy.parentId] : []),
      },
    },
    sort: normalizeSort(config?.sort),
    group: {
      ...DEFAULT_VIEW_CONFIG.group,
      ...config?.group,
    },
  };
}

export interface ViewDTO {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
  config: ApiViewConfig;
  createdAt: string;
  updatedAt: string;
}

export interface CreateViewDTO {
  name: string;
  isDefault?: boolean;
  config: ViewConfig['config'];
}

export interface UpdateViewDTO {
  name?: string;
  isDefault?: boolean;
  config?: ViewConfig['config'];
}

/**
 * Convert ViewDTO from API to ViewConfig for frontend
 */
function dtoToViewConfig(dto: ViewDTO): ViewConfig {
  return {
    id: dto.id,
    name: dto.name,
    isDefault: dto.isDefault,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    config: normalizeViewConfig(dto.config),
  };
}

/**
 * Get all views for the user's project
 */
export async function getViews(): Promise<ViewConfig[]> {
  const response = await apiClient.get('/api/views');
  const dtos: ViewDTO[] = response.data;
  return dtos.map(dtoToViewConfig);
}

/**
 * Get a specific view
 */
export async function getView(viewId: string): Promise<ViewConfig> {
  const response = await apiClient.get(`/api/views/${viewId}`);
  const dto: ViewDTO = response.data;
  return dtoToViewConfig(dto);
}

/**
 * Create a new view
 */
export async function createView(input: CreateViewDTO): Promise<ViewConfig> {
  const response = await apiClient.post('/api/views', input);
  const dto: ViewDTO = response.data;
  return dtoToViewConfig(dto);
}

/**
 * Update an existing view
 */
export async function updateView(viewId: string, input: UpdateViewDTO): Promise<ViewConfig> {
  const response = await apiClient.put(`/api/views/${viewId}`, input);
  const dto: ViewDTO = response.data;
  return dtoToViewConfig(dto);
}

/**
 * Delete a view
 */
export async function deleteView(viewId: string): Promise<void> {
  await apiClient.delete(`/api/views/${viewId}`);
}
