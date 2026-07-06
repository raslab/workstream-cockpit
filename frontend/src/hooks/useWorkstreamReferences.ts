import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { WorkstreamSummary } from '../types/workstream';

interface UseWorkstreamReferencesOptions {
  state?: 'active' | 'closed' | 'all';
  enabled?: boolean;
}

export function useWorkstreamReferences(options: UseWorkstreamReferencesOptions = {}) {
  const queryOptions = { state: options.state };

  return useQuery<WorkstreamSummary[]>({
    queryKey: ['workstream-references', queryOptions],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.state) params.set('state', options.state);
      const url = `/api/workstreams/references${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    },
    enabled: options.enabled ?? true,
  });
}
