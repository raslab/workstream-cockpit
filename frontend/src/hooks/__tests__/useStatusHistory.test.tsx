import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../../api/client';
import { useStatusHistory } from '../useStatusHistory';

vi.mock('../../api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const apiGetMock = vi.mocked(apiClient.get);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function update(id: string) {
  return {
    id,
    workstreamId: 'stream-1',
    status: `Status ${id}`,
    note: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  };
}

describe('useStatusHistory pagination', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it('requests the newest page with includeSubstreams and page size params', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: { updates: [update('first')], nextCursor: 'cursor-2' },
    });

    const { result } = renderHook(
      () => useStatusHistory('stream-1', { includeSubstreams: true, pageSize: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toHaveLength(1));

    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/workstreams/stream-1/status-updates?includeSubstreams=true&limit=10',
    );
    expect(result.current.hasNextPage).toBe(true);
  });

  it('uses nextCursor as the cursor param when fetching another page and appends updates', async () => {
    apiGetMock
      .mockResolvedValueOnce({ data: { updates: [update('first')], nextCursor: 'cursor-2' } })
      .mockResolvedValueOnce({ data: { updates: [update('second')], nextCursor: null } });

    const { result } = renderHook(() => useStatusHistory('stream-1', { pageSize: 10 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data?.map((item) => item.id)).toEqual(['first']));

    result.current.fetchNextPage();

    await waitFor(() =>
      expect(result.current.data?.map((item) => item.id)).toEqual(['first', 'second']),
    );

    expect(apiGetMock).toHaveBeenLastCalledWith(
      '/api/workstreams/stream-1/status-updates?limit=10&cursor=cursor-2',
    );
    expect(result.current.hasNextPage).toBe(false);
  });

  it('treats legacy array responses as a complete page with no next cursor', async () => {
    apiGetMock.mockResolvedValueOnce({ data: [update('legacy')] });

    const { result } = renderHook(() => useStatusHistory('stream-1'), { wrapper });

    await waitFor(() => expect(result.current.data?.map((item) => item.id)).toEqual(['legacy']));
    expect(result.current.hasNextPage).toBe(false);
  });
});
