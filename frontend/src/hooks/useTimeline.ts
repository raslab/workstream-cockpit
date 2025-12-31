import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface TimelineEntry {
  id: string;
  workstreamId: string;
  workstreamName: string;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  tag?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface UseTimelineOptions {
  startDate?: Date;
  endDate?: Date;
  tagIds?: string[];
}

export function useTimeline(options: UseTimelineOptions = {}) {
  return useQuery<TimelineEntry[]>({
    queryKey: ['timeline', options.startDate, options.endDate, options.tagIds],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (options.startDate) {
        params.set('startDate', options.startDate.toISOString());
      }
      if (options.endDate) {
        params.set('endDate', options.endDate.toISOString());
      }
      if (options.tagIds && options.tagIds.length > 0) {
        params.set('tagIds', options.tagIds.join(','));
      }
      
      const url = `/api/timeline${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    },
  });
}
