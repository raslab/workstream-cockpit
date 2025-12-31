import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Workstream } from '../types/workstream';

interface UseWorkstreamsOptions {
  state?: 'active' | 'closed';
}

export function useWorkstreams(options: UseWorkstreamsOptions = {}) {
  return useQuery<Workstream[]>({
    queryKey: ['workstreams', options.state],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.state) {
        params.set('state', options.state);
      }
      const url = `/api/workstreams${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    },
  });
}
