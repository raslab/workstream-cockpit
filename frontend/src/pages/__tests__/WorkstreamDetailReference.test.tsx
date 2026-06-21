import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StatusUpdate, Workstream } from '../../types/workstream';
import { getCategoryIconBandBackground } from '../../utils/categoryColor';

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
  parentStreams: [
    { id: 'parent-stream-1', name: 'Platform Ops' },
    { id: 'parent-stream-2', name: 'Reliability' },
    { id: 'parent-stream-3', name: 'Checkout' },
    { id: 'parent-stream-4', name: 'Team Payments' },
  ],
  substreams: [
    {
      id: 'substream-1',
      name: 'run CoE',
      state: 'active',
      lastActivityAt: '2026-06-20T10:15:00Z',
    },
    {
      id: 'substream-2',
      name: 'Checkout tracing cleanup',
      state: 'closed',
      lastActivityAt: '2026-06-19T08:00:00Z',
    },
  ],
  directSubstreamCount: 2,
  activeSubstreamCount: 1,
  closedSubstreamCount: 1,
  lastDirectUpdateAt: '2026-06-18T11:00:00Z',
  lastSubstreamActivityAt: '2026-06-20T10:15:00Z',
  latestSubstreamActivitySource: { id: 'substream-1', name: 'run CoE', lastActivityAt: '2026-06-20T10:15:00Z' },
  allTags: ['Customers', 'Latency', 'Observability'],
  parentId: 'parent-stream-4',
  parent: { id: 'parent-stream-4', name: 'Team Payments' },
};

const updates: StatusUpdate[] = [
  {
    id: 'substream-update',
    workstreamId: 'substream-1',
    status: 'Replica lag alert stayed green after the queue worker limit was reduced. #Production',
    note: null,
    createdAt: '2026-06-20T10:15:00Z',
    updatedAt: '2026-06-20T10:15:00Z',
    sourceWorkstream: { id: 'substream-1', name: 'run CoE' },
  },
  {
    id: 'self-update',
    workstreamId: 'current-stream',
    status: 'One more production sample is needed before closing the regression. #Production',
    note: 'Need one more canary window. #Canary',
    createdAt: '2026-06-18T11:00:00Z',
    updatedAt: '2026-06-18T11:00:00Z',
    sourceWorkstream: { id: 'current-stream', name: 'Payments latency regression follow-up' },
  },
];

function renderDetail(detailWorkstream: Workstream = workstream) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/workstreams/${detailWorkstream.id}`]}>
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

  it('renders the reference detail shell with category rail, icon band, deep breadcrumbs, title, and inline context hashtags without duplicated tag pills', async () => {
    renderDetail();

    expect(await screen.findByTestId('workstream-detail-shell')).toBeInTheDocument();
    expect(screen.getByTestId('workstream-category-rail')).toBeInTheDocument();
    const expectedCategoryBandBackground = getCategoryIconBandBackground(workstream.category?.color);
    const iconBand = screen.getByTestId('workstream-category-icon-band');
    expect(iconBand).toHaveTextContent('🚀');
    expect(iconBand).toHaveStyle({ backgroundColor: expectedCategoryBandBackground });
    expect(iconBand.firstElementChild).toHaveStyle({ backgroundColor: expectedCategoryBandBackground });
    expect(screen.getByRole('button', { name: /back to cockpit/i })).toBeInTheDocument();

    const breadcrumbs = screen.getByLabelText('Workstream parent-stream breadcrumbs');
    expect(within(breadcrumbs).getByText('Platform Ops')).toBeInTheDocument();
    expect(within(breadcrumbs).getByText('Reliability')).toBeInTheDocument();
    expect(within(breadcrumbs).getByText('Checkout')).toBeInTheDocument();
    expect(within(breadcrumbs).getByText('Team Payments')).toBeInTheDocument();
    expect(within(breadcrumbs).getByText('Payments latency regression follow-up')).toHaveAttribute('aria-current', 'page');

    expect(screen.getByRole('heading', { level: 1, name: workstream.name })).toBeInTheDocument();
    expect(screen.getByText(/Goal: track mitigation work/)).toHaveTextContent('#Customers #Latency #Observability');
    expect(screen.queryByLabelText('Workstream tags')).not.toBeInTheDocument();
    expect(screen.queryByText(/^#Customers$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^#Latency$/)).not.toBeInTheDocument();
  });

  it('uses the cockpit card fallback category icon and color for uncategorized streams', async () => {
    const uncategorizedWorkstream: Workstream = {
      ...workstream,
      categoryId: null,
      category: null,
    };
    apiGetMock.mockResolvedValueOnce({ data: uncategorizedWorkstream });

    renderDetail(uncategorizedWorkstream);
    await screen.findByTestId('workstream-detail-shell');

    const expectedFallbackColor = '#5b8ca0';
    const expectedCategoryBandBackground = getCategoryIconBandBackground(expectedFallbackColor, expectedFallbackColor);
    const rail = screen.getByTestId('workstream-category-rail');
    const iconBand = screen.getByTestId('workstream-category-icon-band');

    expect(rail).toHaveStyle({ backgroundColor: expectedFallbackColor });
    expect(iconBand).toHaveTextContent('🏷️');
    expect(iconBand).toHaveStyle({ backgroundColor: expectedCategoryBandBackground });
    expect(iconBand.firstElementChild).toHaveStyle({ backgroundColor: expectedCategoryBandBackground });
  });

  it('keeps primary actions reachable as a right-side stack and exposes the include-substreams control', async () => {
    renderDetail();
    await screen.findByTestId('workstream-detail-shell');

    const actions = screen.getByTestId('workstream-detail-actions');
    expect(within(actions).getByRole('button', { name: 'Add Update' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'Create sub-stream' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'Change parent' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'Close stream' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 2, name: 'Status History' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /include sub-stream updates/i })).toBeInTheDocument();
  });

  it('does not expose Add Update when the stream is closed', async () => {
    const closedWorkstream = { ...workstream, state: 'closed' as const, closedAt: '2026-06-20T11:00:00Z' };
    apiGetMock.mockResolvedValueOnce({ data: closedWorkstream });

    renderDetail(closedWorkstream);
    await screen.findByTestId('workstream-detail-shell');

    const actions = screen.getByTestId('workstream-detail-actions');
    expect(within(actions).queryByRole('button', { name: 'Add Update' })).not.toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'Reopen stream' })).toBeInTheDocument();
  });

  it('marks sub-stream updates with source and open-sub-stream affordance while own updates retain edit/delete actions and inline hashtags stay unduplicated', async () => {
    renderDetail();
    await screen.findByTestId('workstream-detail-shell');

    const substreamUpdate = screen.getByTestId('status-update-substream-update');
    expect(substreamUpdate).toHaveAttribute('data-source', 'sub-stream');
    expect(within(substreamUpdate).getByRole('link', { name: 'Sub-stream: run CoE' })).toHaveAttribute('href', '/workstreams/substream-1');
    expect(within(substreamUpdate).getByRole('link', { name: 'Open sub-stream' })).toHaveAttribute('href', '/workstreams/substream-1');
    expect(substreamUpdate).toHaveTextContent('#Production');
    expect(within(substreamUpdate).queryByText(/^#Production$/)).not.toBeInTheDocument();

    const ownUpdate = screen.getByTestId('status-update-self-update');
    expect(ownUpdate).toHaveAttribute('data-source', 'self');
    expect(within(ownUpdate).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(ownUpdate).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(ownUpdate).toHaveTextContent('#Production');
    expect(ownUpdate).toHaveTextContent('#Canary');
    expect(within(ownUpdate).queryByText(/^#Production$/)).not.toBeInTheDocument();
    expect(within(ownUpdate).queryByText(/^#Canary$/)).not.toBeInTheDocument();
  });

  it('renders sidebar direct sub-streams and metadata without sibling parent-stream paths', async () => {
    renderDetail();
    await screen.findByTestId('workstream-detail-shell');

    const sidebar = screen.getByTestId('workstream-detail-sidebar');
    expect(within(sidebar).getByRole('heading', { name: /Sub-streams/ })).toHaveTextContent('2');
    expect(within(sidebar).getByText('Direct sub-streams of this stream. No sibling or neighbor parent-stream path shown here.')).toBeInTheDocument();
    expect(within(sidebar).getAllByText('run CoE').length).toBeGreaterThan(0);
    expect(within(sidebar).getByText('Checkout tracing cleanup')).toBeInTheDocument();
    expect(within(sidebar).queryByText('Latest update: No updates yet')).not.toBeInTheDocument();

    expect(within(sidebar).getByText('Metadata')).toBeInTheDocument();
    expect(within(sidebar).getByText('Category')).toBeInTheDocument();
    expect(within(sidebar).getByText('Customers')).toBeInTheDocument();
    expect(within(sidebar).getByText('Latest self update')).toBeInTheDocument();
    expect(within(sidebar).getByText('Latest sub-stream update')).toBeInTheDocument();
    expect(within(sidebar).getByText('Parent stream')).toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: 'Team Payments' })).toHaveAttribute('href', '/workstreams/parent-stream-4');
    expect(within(sidebar).getByRole('link', { name: 'run CoE' })).toHaveAttribute('href', '/workstreams/substream-1');
  });

  it('uses relative dates with exact date-time hover titles in metadata and history', async () => {
    const aboutTwelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    useStatusHistoryMock.mockReturnValue({
      data: [
        { ...updates[0], createdAt: aboutTwelveHoursAgo, updatedAt: aboutTwelveHoursAgo },
        updates[1],
      ],
      isLoading: false,
    });

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
    const latestSelfTime = within(sidebar).getByTitle('Jun 19, 2026 • 12:30 PM');
    expect(latestSelfTime).toHaveTextContent(/ago$/);
    expect(within(sidebar).queryByText('Jun 1, 2026 • 8:00 AM')).not.toBeInTheDocument();

    const substreamUpdate = screen.getByTestId('status-update-substream-update');
    const childTime = within(substreamUpdate).getByText('12 hours ago');
    expect(childTime.tagName).toBe('TIME');
    expect(childTime).not.toHaveTextContent(/^about /);

    const ownUpdate = screen.getByTestId('status-update-self-update');
    const ownTime = within(ownUpdate).getByTitle('Jun 18, 2026 • 11:00 AM');
    expect(ownTime).toHaveTextContent(/ago$/);
  });
});
