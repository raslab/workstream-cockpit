import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { WorkstreamSummary } from '../types/workstream';

export type TimelineEventType = 'status_update' | 'workstream_created' | 'workstream_closed' | 'parent_changed' | 'sub_stream_created';

export interface TimelineEntry {
  id: string;
  eventType: TimelineEventType;
  workstreamId: string;
  workstreamNumber?: number;
  workstreamName: string;
  statusUpdateNumber?: number;
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
  parentId?: string | null;
  parentNumber?: number | null;
  parent?: WorkstreamSummary | null;
  parentName?: string | null;
  parentStreams?: WorkstreamSummary[];
  parentStreamPath?: string;
  breadcrumb?: string;
  oldParentName?: string | null;
  newParentName?: string | null;
  oldParentId?: string | null;
  newParentId?: string | null;
  metadata?: {
    oldParentId?: string | null;
    oldParentName?: string | null;
    newParentId?: string | null;
    newParentName?: string | null;
    [key: string]: unknown;
  };
}

export interface TimelineResponse {
  events: TimelineEntry[];
  nextCursor?: string | null;
}

interface UseTimelineOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  cursor?: string;
  categoryIds?: string[];
  tags?: string[];
  streamScope?: 'all' | 'top-level' | 'sub-streams' | 'under-parent';
  parentId?: string | null;
  includeSubstreams?: boolean;
  includeStructuralEvents?: boolean;
  eventTypes?: TimelineEventType[];
}

export function useTimeline(options: UseTimelineOptions = {}) {
  return useQuery<TimelineResponse>({
    queryKey: ['timeline', options],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (options.startDate) {
        params.set('startDate', options.startDate.toISOString());
      }
      if (options.endDate) {
        params.set('endDate', options.endDate.toISOString());
      }
      if (options.limit) {
        params.set('limit', String(options.limit));
      }
      if (options.cursor) {
        params.set('cursor', options.cursor);
      }
      if (options.categoryIds && options.categoryIds.length > 0) {
        params.set('categoryIds', options.categoryIds.join(','));
      }
      if (options.tags && options.tags.length > 0) {
        params.set('tags', options.tags.join(','));
      }
      if (options.streamScope && options.streamScope !== 'all') {
        params.set('streamScope', options.streamScope);
      }
      if (options.parentId) {
        params.set('parentId', options.parentId);
      }
      if (options.includeSubstreams !== undefined) {
        params.set('includeSubstreams', String(options.includeSubstreams));
      }
      if (options.eventTypes && options.eventTypes.length > 0) {
        params.set('eventTypes', options.eventTypes.join(','));
      }

      const url = `/api/timeline${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return Array.isArray(response.data)
        ? { events: response.data, nextCursor: null }
        : response.data;
    },
  });
}
