import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { StatusUpdate } from '../types/workstream';

export function useStatusHistory(workstreamId: string) {
  return useQuery<StatusUpdate[]>({
    queryKey: ['status-updates', workstreamId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/workstreams/${workstreamId}/status-updates`);
      return response.data;
    },
    enabled: !!workstreamId,
  });
}
