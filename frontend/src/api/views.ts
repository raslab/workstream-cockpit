import { apiClient } from './client';
import type { ViewConfig } from '../types/view';

export interface ViewDTO {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
  config: {
    filters: {
      categoryIds: string[];
      tags: string[];
      temporal: {
        notUpdatedToday: boolean;
      };
    };
    sort: {
      field: 'name' | 'createdAt' | 'updatedAt';
      direction: 'asc' | 'desc';
    };
    group: {
      by: 'none' | 'category';
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateViewDTO {
  name: string;
  isDefault?: boolean;
  config: {
    filters: {
      categoryIds: string[];
      tags: string[];
      temporal: {
        notUpdatedToday: boolean;
      };
    };
    sort: {
      field: 'name' | 'createdAt' | 'updatedAt';
      direction: 'asc' | 'desc';
    };
    group: {
      by: 'none' | 'category';
    };
  };
}

export interface UpdateViewDTO {
  name?: string;
  isDefault?: boolean;
  config?: {
    filters?: {
      categoryIds?: string[];
      tags?: string[];
      temporal?: {
        notUpdatedToday?: boolean;
      };
    };
    sort?: {
      field?: 'name' | 'createdAt' | 'updatedAt';
      direction?: 'asc' | 'desc';
    };
    group?: {
      by?: 'none' | 'category';
    };
  };
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
    config: dto.config,
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
