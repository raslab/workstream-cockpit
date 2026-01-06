import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Category } from '../types/workstream';

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get('/api/categories');
      return response.data;
    },
  });
}
