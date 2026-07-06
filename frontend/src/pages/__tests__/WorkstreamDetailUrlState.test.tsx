import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Workstream } from '../../types/workstream';

const useStatusHistoryMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useStatusHistory', () => ({
  useStatusHistory: useStatusHistoryMock,
}));

vi.mock('../../api/client', () => ({
  apiClient: {
    get: apiGetMock,
    put: vi.fn(),
    delete: vi.fn(),
  },
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

import WorkstreamDetail from '../../pages/WorkstreamDetail';
import { WorkstreamCard } from '../../components/Workstream/WorkstreamCard';

function LocationProbe() {
  const location = useLocation();
  return (
    <>
      <div data-testid="location">{location.search}</div>
      <div data-testid="pathname">{location.pathname}</div>
    </>
  );
}

function renderDetail(initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/" element={<LocationProbe />} />
          <Route
            path="/workstreams/:id"
            element={
              <>
                <WorkstreamDetail />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderCardToDetail(initialEntry: string, workstream: Workstream) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <WorkstreamCard workstream={workstream} />
                <LocationProbe />
              </>
            }
          />
          <Route
            path="/workstreams/:id"
            element={
              <>
                <WorkstreamDetail />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const cardWorkstream: Workstream = {
  id: 'stream-1',
  number: 42,
  projectId: 'project-1',
  name: 'Launch plan',
  categoryId: null,
  context: null,
  state: 'active',
  createdAt: '2026-06-01T00:00:00Z',
  closedAt: null,
  latestStatus: {
    id: 'status-1',
    workstreamId: 'stream-1',
    status: 'Ready for launch review',
    note: null,
    createdAt: '2026-06-02T00:00:00Z',
    updatedAt: '2026-06-02T00:00:00Z',
  },
  allTags: ['frontend'],
};

const parentWorkstream: Workstream = {
  id: 'parent-1',
  number: 7,
  projectId: 'project-1',
  name: 'Parent stream',
  categoryId: null,
  context: null,
  state: 'active',
  createdAt: '2026-06-01T00:00:00Z',
  closedAt: null,
  allTags: [],
  substreams: [
    {
      id: 'substream-1',
      number: 8,
      projectId: 'project-1',
      name: 'Execution sub-stream',
      categoryId: null,
      context: null,
      state: 'active',
      createdAt: '2026-06-02T00:00:00Z',
      closedAt: null,
      parentId: 'parent-1',
      allTags: [],
    },
  ],
};

const substreamWorkstream: Workstream = {
  id: 'substream-1',
  number: 8,
  projectId: 'project-1',
  name: 'Execution sub-stream',
  categoryId: null,
  context: null,
  state: 'active',
  createdAt: '2026-06-02T00:00:00Z',
  closedAt: null,
  parentId: 'parent-1',
  parent: { id: 'parent-1', number: 7, name: 'Parent stream', state: 'active' },
  allTags: [],
  substreams: [],
};

describe('WorkstreamDetail URL state', () => {
  beforeEach(() => {
    useStatusHistoryMock.mockReset();
    useStatusHistoryMock.mockReturnValue({ data: [], isLoading: false });
    apiGetMock.mockReset();
    apiGetMock.mockResolvedValue({
      data: {
        id: 'stream-1',
        name: 'Launch plan',
        status: 'active',
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
        tags: [],
        substreams: [],
      },
    });
  });

  it('initializes includeSubstreams from URL and toggles it back into the URL', async () => {
    renderDetail('/workstreams/stream-1?includeSubstreams=1');

    const checkbox = await screen.findByRole('checkbox', { name: /Include sub-stream updates/ });
    expect(checkbox).toBeChecked();
    expect(useStatusHistoryMock).toHaveBeenLastCalledWith('stream-1', {
      includeSubstreams: true,
      pageSize: 10,
    });

    fireEvent.click(checkbox);

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(''));
    expect(useStatusHistoryMock).toHaveBeenLastCalledWith('stream-1', {
      includeSubstreams: false,
      pageSize: 10,
    });
  });

  it('returns from a cockpit stream tile to the originating view and filter URL state', async () => {
    renderCardToDetail('/?view=platform-review&tags=frontend&group=parent', cardWorkstream);

    await userEvent.click(screen.getByRole('link', { name: '#42 Launch plan' }));

    await screen.findByRole('heading', { name: 'Launch plan' });
    expect(screen.getByTestId('location')).toHaveTextContent('');

    await userEvent.click(screen.getByRole('button', { name: /Back to Cockpit/ }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '?view=platform-review&tags=frontend&group=parent',
      ),
    );
  });

  it('uses native history and labels Back with the previous stream when opening a sub-stream from detail', async () => {
    apiGetMock.mockImplementation(async (url: string) => ({
      data: url.endsWith('/8') ? substreamWorkstream : parentWorkstream,
    }));

    renderDetail('/workstreams/7');

    await screen.findByRole('heading', { name: 'Parent stream' });
    await userEvent.click(screen.getByRole('link', { name: /#8 Execution sub-stream/ }));

    await screen.findByRole('heading', { name: 'Execution sub-stream' });
    expect(screen.getByRole('button', { name: '← Back to #7 Parent stream' })).toBeInTheDocument();
    expect(screen.getByTestId('pathname')).toHaveTextContent('/workstreams/8');

    await userEvent.click(screen.getByRole('button', { name: '← Back to #7 Parent stream' }));

    await waitFor(() => expect(screen.getByTestId('pathname')).toHaveTextContent('/workstreams/7'));
    await screen.findByRole('heading', { name: 'Parent stream' });
  });

  it('falls back to cockpit when a detail page is opened directly', async () => {
    renderDetail('/workstreams/stream-1');

    await screen.findByRole('heading', { name: 'Launch plan' });
    await userEvent.click(screen.getByRole('button', { name: /Back to Cockpit/ }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(''));
  });
});
