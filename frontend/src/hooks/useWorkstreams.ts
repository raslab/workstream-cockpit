import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Workstream } from '../types/workstream';

interface UseWorkstreamsOptions {
  state?: 'active' | 'closed';
  tags?: string[];
}

export function useWorkstreams(options: UseWorkstreamsOptions = {}) {
  return useQuery<Workstream[]>({
    queryKey: ['workstreams', options.state, options.tags],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.state) {
        params.set('state', options.state);
      }
      if (options.tags && options.tags.length > 0) {
        params.set('tags', options.tags.join(','));
      }
      const url = `/api/workstreams${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    },
  });
}
