import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Workstream } from '../../types/workstream';

const apiGetMock = vi.hoisted(() => vi.fn());
const useStatusHistoryMock = vi.hoisted(() => vi.fn());

vi.mock('../../api/client', () => ({
  apiClient: {
    get: apiGetMock,
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../hooks/useStatusHistory', () => ({
  useStatusHistory: useStatusHistoryMock,
}));

vi.mock('../../components/Markdown/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <span>{content}</span>,
}));

vi.mock('../../components/Tag/TagAutocomplete', () => ({
  TagAutocomplete: () => null,
}));

import WorkstreamDetail from '../WorkstreamDetail';

const workstream: Workstream = {
  id: 'stream-1',
  projectId: 'project-1',
  name: 'Scoped detail request stream',
  categoryId: null,
  context: null,
  state: 'active',
  createdAt: '2026-06-01T00:00:00Z',
  closedAt: null,
  parentId: null,
  parentStreams: [],
  substreams: [],
};

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/workstreams/${workstream.id}`]}>
        <Routes>
          <Route path="/workstreams/:id" element={<WorkstreamDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('WorkstreamDetail request scope', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiGetMock.mockImplementation((url: string) => {
      if (url === '/api/workstreams/stream-1') return Promise.resolve({ data: workstream });
      if (url === '/api/workstreams/stream-1/next-steps') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    useStatusHistoryMock.mockReset();
    useStatusHistoryMock.mockReturnValue({ data: [], isLoading: false });
  });

  it('does not fetch broad stream/category lists while rendering the closed detail dialogs', async () => {
    renderDetail();

    expect(
      await screen.findByRole('heading', { level: 1, name: workstream.name }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith('/api/workstreams/stream-1');
      expect(apiGetMock).toHaveBeenCalledWith('/api/workstreams/stream-1/next-steps');
    });

    expect(apiGetMock).not.toHaveBeenCalledWith('/api/workstreams?state=active');
    expect(apiGetMock).not.toHaveBeenCalledWith('/api/categories');
    expect(apiGetMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/workstreams/stream-1',
      '/api/workstreams/stream-1/next-steps',
    ]);
  });
});
