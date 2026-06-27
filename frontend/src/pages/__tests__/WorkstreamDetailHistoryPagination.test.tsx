import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { StatusUpdate, Workstream } from '../../types/workstream';

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

vi.mock('../../components/Workstream/ParentSelectorDialog', () => ({
  ParentSelectorDialog: () => null,
}));

import WorkstreamDetail from '../WorkstreamDetail';

const workstream: Workstream = {
  id: 'stream-1',
  projectId: 'project-1',
  name: 'Launch plan',
  categoryId: null,
  context: null,
  state: 'active',
  createdAt: '2026-06-01T00:00:00Z',
  closedAt: null,
  substreams: [],
};

function update(id: string): StatusUpdate {
  return {
    id,
    workstreamId: 'stream-1',
    status: `Status ${id}`,
    note: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  };
}

function renderDetail() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/workstreams/${workstream.id}`]}>
        <Routes>
          <Route path="/workstreams/:id" element={<WorkstreamDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

type ObserverCallback = IntersectionObserverCallback;
let observerCallback: ObserverCallback | undefined;
let observedElement: Element | undefined;

class MockIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];

  constructor(callback: ObserverCallback) {
    observerCallback = callback;
  }

  observe(element: Element) {
    observedElement = element;
  }

  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = () => [];
}

describe('WorkstreamDetail history pagination', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiGetMock.mockResolvedValue({ data: workstream });
    useStatusHistoryMock.mockReset();
    observerCallback = undefined;
    observedElement = undefined;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    window.IntersectionObserver = MockIntersectionObserver as typeof IntersectionObserver;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes the detail history page size to the status history hook', async () => {
    useStatusHistoryMock.mockReturnValue({
      data: [update('first')],
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });

    renderDetail();

    await screen.findByTestId('status-update-first');
    expect(useStatusHistoryMock).toHaveBeenLastCalledWith('stream-1', {
      includeSubstreams: false,
      pageSize: 50,
    });
  });

  it('fetches the next history page when the sentinel intersects near the end', async () => {
    const fetchNextPage = vi.fn();
    useStatusHistoryMock.mockReturnValue({
      data: [update('first')],
      isLoading: false,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });

    renderDetail();

    await screen.findByTestId('status-update-first');
    await waitFor(() =>
      expect(observedElement).toHaveAttribute('data-testid', 'status-history-load-more-sentinel'),
    );

    observerCallback?.(
      [{ isIntersecting: true, target: observedElement } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    await waitFor(() => expect(fetchNextPage).toHaveBeenCalledTimes(1));
  });

  it('shows loading and no-more pagination states without fetching after the last page', async () => {
    const fetchNextPage = vi.fn();
    useStatusHistoryMock.mockReturnValue({
      data: [update('first')],
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: true,
      fetchNextPage,
    });

    const { unmount } = renderDetail();

    await screen.findByText('Loading more status updates...');
    unmount();

    useStatusHistoryMock.mockReturnValue({
      data: [update('first')],
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage,
    });
    renderDetail();

    await screen.findByText('All status updates loaded.');
    observerCallback?.(
      [{ isIntersecting: true, target: observedElement } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(fetchNextPage).not.toHaveBeenCalled();
  });
});
