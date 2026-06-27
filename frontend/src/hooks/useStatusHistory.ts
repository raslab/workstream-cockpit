import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { StatusUpdate } from '../types/workstream';

interface StatusHistoryPage {
  updates: StatusUpdate[];
  nextCursor: string | null;
}

interface StatusHistoryOptions {
  includeSubstreams?: boolean;
  pageSize?: number;
}

function normalizeStatusHistoryPage(data: StatusUpdate[] | StatusHistoryPage): StatusHistoryPage {
  if (Array.isArray(data)) {
    return { updates: data, nextCursor: null };
  }

  return {
    updates: data.updates || [],
    nextCursor: data.nextCursor || null,
  };
}

export function useStatusHistory(workstreamId: string, options: StatusHistoryOptions = {}) {
  const query = useInfiniteQuery<StatusHistoryPage>({
    queryKey: ['status-updates', workstreamId, options.includeSubstreams, options.pageSize],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (options.includeSubstreams !== undefined) {
        params.set('includeSubstreams', String(options.includeSubstreams));
      }
      if (options.pageSize !== undefined) {
        params.set('limit', String(options.pageSize));
      }
      if (pageParam) {
        params.set('cursor', String(pageParam));
      }
      const response = await apiClient.get(
        `/api/workstreams/${workstreamId}/status-updates${params.toString() ? `?${params.toString()}` : ''}`,
      );
      return normalizeStatusHistoryPage(response.data);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: !!workstreamId,
  });

  const statusUpdates = useMemo(
    () => query.data?.pages.flatMap((page) => page.updates),
    [query.data],
  );

  return {
    ...query,
    data: statusUpdates,
  };
}
