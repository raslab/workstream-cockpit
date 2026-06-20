import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  MarkdownRenderer: ({ content, className }: { content: string; className?: string }) => <div className={className}>{content}</div>,
}));

import WorkstreamDetail from '../WorkstreamDetail';

const workstream: Workstream = {
  id: 'current-stream',
  projectId: 'project-1',
  name: 'Payments latency regression follow-up',
  categoryId: 'cat-1',
  context: 'Goal: track mitigation work after checkout p95 latency crossed the SLO twice last week. #Customers #Latency #Observability',
  state: 'active',
  createdAt: '2026-06-06T16:30:00Z',
  closedAt: null,
  category: {
    id: 'cat-1',
    name: 'Customers',
    color: '#0f9f8f',
    emoji: '🚀',
    sortOrder: 0,
  },
  ancestors: [
    { id: 'ancestor-1', name: 'Platform Ops' },
    { id: 'ancestor-2', name: 'Reliability' },
    { id: 'ancestor-3', name: 'Checkout' },
    { id: 'ancestor-4', name: 'Team Payments' },
  ],
  children: [
    {
      id: 'child-1',
      name: 'run CoE',
      state: 'active',
      lastActivityAt: '2026-06-20T10:15:00Z',
    },
    {
      id: 'child-2',
      name: 'Checkout tracing cleanup',
      state: 'closed',
      lastActivityAt: '2026-06-19T08:00:00Z',
    },
  ],
  directChildCount: 2,
  activeChildCount: 1,
  closedChildCount: 1,
  lastDirectUpdateAt: '2026-06-18T11:00:00Z',
  lastSubstreamActivityAt: '2026-06-20T10:15:00Z',
  latestSubstreamActivitySource: { id: 'child-1', name: 'run CoE', lastActivityAt: '2026-06-20T10:15:00Z' },
  allTags: ['Customers', 'Latency', 'Observability'],
};

const updates: StatusUpdate[] = [
  {
    id: 'child-update',
    workstreamId: 'child-1',
    status: 'Replica lag alert stayed green after the queue worker limit was reduced. #Production',
    note: null,
    createdAt: '2026-06-20T10:15:00Z',
    updatedAt: '2026-06-20T10:15:00Z',
    sourceWorkstream: { id: 'child-1', name: 'run CoE' },
  },
  {
    id: 'self-update',
    workstreamId: 'current-stream',
    status: 'One more production sample is needed before closing the regression.',
    note: 'Need one more canary window.',
    createdAt: '2026-06-18T11:00:00Z',
    updatedAt: '2026-06-18T11:00:00Z',
    sourceWorkstream: { id: 'current-stream', name: 'Payments latency regression follow-up' },
  },
];

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

describe('WorkstreamDetail reference redesign', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiGetMock.mockResolvedValue({ data: workstream });
    useStatusHistoryMock.mockReset();
    useStatusHistoryMock.mockReturnValue({ data: updates, isLoading: false });
  });

  it('renders the reference detail shell with category rail, icon band, deep breadcrumbs, title, context, and tags', async () => {
    renderDetail();

    expect(await screen.findByTestId('workstream-detail-shell')).toBeInTheDocument();
    expect(screen.getByTestId('workstream-category-rail')).toBeInTheDocument();
    expect(screen.getByTestId('workstream-category-icon-band')).toHaveTextContent('🚀');
    expect(screen.getByRole('button', { name: /back to cockpit/i })).toBeInTheDocument();

    const breadcrumbs = screen.getByLabelText('Workstream hierarchy breadcrumbs');
    expect(within(breadcrumbs).getByText('Platform Ops')).toBeInTheDocument();
    expect(within(breadcrumbs).getByText('Reliability')).toBeInTheDocument();
    expect(within(breadcrumbs).getByText('Checkout')).toBeInTheDocument();
    expect(within(breadcrumbs).getByText('Team Payments')).toBeInTheDocument();
    expect(within(breadcrumbs).getByText('Payments latency regression follow-up')).toHaveAttribute('aria-current', 'page');

    expect(screen.getByRole('heading', { level: 1, name: workstream.name })).toBeInTheDocument();
    expect(screen.getByText(/Goal: track mitigation work/)).toBeInTheDocument();
    expect(screen.getByText('#Customers')).toBeInTheDocument();
    expect(screen.getByText('#Latency')).toBeInTheDocument();
  });

  it('keeps primary actions reachable as a right-side stack and exposes the include-substreams control', async () => {
    renderDetail();
    await screen.findByTestId('workstream-detail-shell');

    const actions = screen.getByTestId('workstream-detail-actions');
    expect(within(actions).getByRole('button', { name: 'Add Update' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'Create sub-stream' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'Set parent' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'Close stream' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 2, name: 'Status History' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /include sub-stream updates/i })).toBeInTheDocument();
  });

  it('marks sub-stream updates with source and open-child affordance while own updates retain edit/delete actions', async () => {
    renderDetail();
    await screen.findByTestId('workstream-detail-shell');

    const childUpdate = screen.getByTestId('status-update-child-update');
    expect(childUpdate).toHaveAttribute('data-source', 'sub-stream');
    expect(within(childUpdate).getByText('Sub-stream: run CoE')).toBeInTheDocument();
    expect(within(childUpdate).getByRole('link', { name: 'Open child' })).toHaveAttribute('href', '/workstreams/child-1');

    const ownUpdate = screen.getByTestId('status-update-self-update');
    expect(ownUpdate).toHaveAttribute('data-source', 'self');
    expect(within(ownUpdate).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(ownUpdate).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('renders sidebar direct sub-streams and metadata without sibling hierarchy', async () => {
    renderDetail();
    await screen.findByTestId('workstream-detail-shell');

    const sidebar = screen.getByTestId('workstream-detail-sidebar');
    expect(within(sidebar).getByRole('heading', { name: /Sub-streams/ })).toHaveTextContent('2');
    expect(within(sidebar).getByText('Direct children of this stream. No sibling or neighbor hierarchy shown here.')).toBeInTheDocument();
    expect(within(sidebar).getByText('run CoE')).toBeInTheDocument();
    expect(within(sidebar).getByText('Checkout tracing cleanup')).toBeInTheDocument();
    expect(within(sidebar).queryByText('Latest update: No updates yet')).not.toBeInTheDocument();

    expect(within(sidebar).getByText('Metadata')).toBeInTheDocument();
    expect(within(sidebar).getByText('Category')).toBeInTheDocument();
    expect(within(sidebar).getByText('Customers')).toBeInTheDocument();
    expect(within(sidebar).getByText('Latest self update')).toBeInTheDocument();
    expect(within(sidebar).getByText('Latest child update')).toBeInTheDocument();
  });

  it('uses latestStatus.updatedAt as the metadata fallback for latest self update', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        ...workstream,
        lastDirectUpdateAt: null,
        latestStatus: {
          id: 'edited-self-update',
          workstreamId: workstream.id,
          status: 'Edited self status',
          note: null,
          createdAt: '2026-06-01T08:00:00Z',
          updatedAt: '2026-06-19T12:30:00Z',
        },
      },
    });

    renderDetail();
    await screen.findByTestId('workstream-detail-shell');

    const sidebar = screen.getByTestId('workstream-detail-sidebar');
    expect(within(sidebar).getByText('Jun 19, 2026 • 12:30 PM')).toBeInTheDocument();
    expect(within(sidebar).queryByText('Jun 1, 2026 • 8:00 AM')).not.toBeInTheDocument();
  });
});
