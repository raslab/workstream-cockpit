import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Workstream } from '../types/workstream';

interface UseWorkstreamsOptions {
  state?: 'active' | 'closed' | 'all';
  tags?: string[];
  categoryIds?: string[];
  notUpdatedToday?: boolean;
  hierarchy?: 'all' | 'top-level' | 'sub-streams' | 'no-parent' | 'has-substreams' | 'under-parent';
  parentId?: string | null;
  parentIds?: string[];
  includeSubstreams?: boolean;
}

export function useWorkstreams(options: UseWorkstreamsOptions = {}) {
  return useQuery<Workstream[]>({
    queryKey: ['workstreams', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.state) {
        params.set('state', options.state);
      }
      if (options.tags && options.tags.length > 0) {
        params.set('tags', options.tags.join(','));
      }
      if (options.categoryIds && options.categoryIds.length > 0) {
        params.set('categoryIds', options.categoryIds.join(','));
      }
      if (options.notUpdatedToday !== undefined) {
        params.set('notUpdatedToday', String(options.notUpdatedToday));
      }
      if (options.hierarchy && options.hierarchy !== 'all') {
        params.set('hierarchy', options.hierarchy);
      }
      if (options.parentId) {
        params.set('parentId', options.parentId);
      }
      if (options.parentIds && options.parentIds.length > 0) {
        params.set('parentIds', options.parentIds.join(','));
      }
      if (options.includeSubstreams !== undefined) {
        params.set('includeSubstreams', String(options.includeSubstreams));
      }
      const url = `/api/workstreams${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    },
  });
}
