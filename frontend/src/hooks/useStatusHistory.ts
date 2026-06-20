import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { StatusUpdate } from '../types/workstream';

export function useStatusHistory(workstreamId: string, options: { includeSubstreams?: boolean } = {}) {
  return useQuery<StatusUpdate[]>({
    queryKey: ['status-updates', workstreamId, options.includeSubstreams],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.includeSubstreams !== undefined) {
        params.set('includeSubstreams', String(options.includeSubstreams));
      }
      const response = await apiClient.get(`/api/workstreams/${workstreamId}/status-updates${params.toString() ? `?${params.toString()}` : ''}`);
      return response.data;
    },
    enabled: !!workstreamId,
  });
}
