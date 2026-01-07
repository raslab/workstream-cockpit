import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Workstream } from '../types/workstream';

interface UseWorkstreamsOptions {
  state?: 'active' | 'closed';
  tags?: string[];
  categoryIds?: string[];
  notUpdatedToday?: boolean;
}

export function useWorkstreams(options: UseWorkstreamsOptions = {}) {
  return useQuery<Workstream[]>({
    queryKey: ['workstreams', options.state, options.tags, options.categoryIds, options.notUpdatedToday],
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
      const url = `/api/workstreams${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    },
  });
}
