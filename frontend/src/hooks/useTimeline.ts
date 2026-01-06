import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export type TimelineEventType = 'status_update' | 'workstream_created' | 'workstream_closed';

export interface TimelineEntry {
  id: string;
  eventType: TimelineEventType;
  workstreamId: string;
  workstreamName: string;
  status?: string;
  note?: string | null;
  createdAt: string;
  updatedAt?: string;
  category?: {
    id: string;
    name: string;
    color: string;
    emoji?: string | null;
  } | null;
}

interface UseTimelineOptions {
  startDate?: Date;
  endDate?: Date;
  categoryIds?: string[];
}

export function useTimeline(options: UseTimelineOptions = {}) {
  return useQuery<TimelineEntry[]>({
    queryKey: ['timeline', options.startDate, options.endDate, options.categoryIds],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (options.startDate) {
        params.set('startDate', options.startDate.toISOString());
      }
      if (options.endDate) {
        params.set('endDate', options.endDate.toISOString());
      }
      if (options.categoryIds && options.categoryIds.length > 0) {
        params.set('categoryIds', options.categoryIds.join(','));
      }
      
      const url = `/api/timeline${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    },
  });
}
