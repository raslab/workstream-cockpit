import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Tag } from '../types/workstream';

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await apiClient.get('/api/tags');
      return response.data;
    },
  });
}
