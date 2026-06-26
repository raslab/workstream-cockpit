import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ViewConfig } from '../../types/view';
import type { Workstream } from '../../types/workstream';

const useWorkstreamsMock = vi.hoisted(() => vi.fn());
const useCategoriesMock = vi.hoisted(() => vi.fn());
const viewsApiMock = vi.hoisted(() => ({ getViews: vi.fn() }));

vi.mock('../../hooks/useWorkstreams', () => ({
  useWorkstreams: useWorkstreamsMock,
}));

vi.mock('../../hooks/useCategories', () => ({
  useCategories: useCategoriesMock,
}));

vi.mock('../../api/views', () => ({
  getViews: viewsApiMock.getViews,
  createView: vi.fn(),
  updateView: vi.fn(),
  deleteView: vi.fn(),
}));

vi.mock('../../components/Workstream/WorkstreamCard', () => ({
  WorkstreamCard: ({ workstream }: { workstream: Workstream }) => (
    <article data-testid="workstream-card">
      {workstream.name}
      {workstream.parent ? ` Parent: ${workstream.parent.name}` : ''}
    </article>
  ),
}));
vi.mock('../../components/Workstream/WorkstreamSkeleton', () => ({ WorkstreamSkeleton: () => <div /> }));
vi.mock('../../components/Workstream/WorkstreamCreateDialog', () => ({ WorkstreamCreateDialog: () => null }));
vi.mock('../../components/ViewManagement/ViewCreateDialog', () => ({ ViewCreateDialog: () => null }));
vi.mock('../../components/ViewManagement/ViewControls', () => ({
  ViewControls: ({ config, onConfigChange, hasUnsavedChanges }: any) => (
    <div>
      <div data-testid="unsaved">{String(hasUnsavedChanges)}</div>
      <button onClick={() => onConfigChange({ ...config, filters: { ...config.filters, tags: ['frontend'] } })}>Set frontend tag</button>
    </div>
  ),
}));
vi.mock('../../components/ViewManagement/ViewTabs', () => ({
  ViewTabs: ({ views, activeViewId, onViewChange }: any) => (
    <div>
      <div data-testid="active-view">{activeViewId}</div>
      {views.map((view: ViewConfig) => <button key={view.id} onClick={() => onViewChange(view.id)}>{view.name}</button>)}
    </div>
  ),
}));

import Cockpit from '../../pages/Cockpit';

const config = (tags: string[] = [], categoryIds: string[] = []): ViewConfig['config'] => ({
  filters: {
    categoryIds,
    tags,
    temporal: { notUpdatedToday: false },
    hierarchy: { mode: 'all', parentId: null, parentIds: [], includeSubstreams: false, timelineScope: 'all', includeStructuralEvents: true },
  },
  sort: { field: 'lastActivityAt', direction: 'desc' },
  group: { by: 'category' },
});

const views: ViewConfig[] = [
  { id: 'view-default-id', name: 'Default View', isDefault: true, createdAt: new Date(), updatedAt: new Date(), config: config() },
  { id: 'view-tagged-id', name: 'Tagged View', isDefault: false, createdAt: new Date(), updatedAt: new Date(), config: config(['backend'], ['cat-1']) },
];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderCockpit(initialEntry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes><Route path="/" element={<><Cockpit /><LocationProbe /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Cockpit URL state', () => {
  beforeEach(() => {
    viewsApiMock.getViews.mockResolvedValue(views);
    useWorkstreamsMock.mockReturnValue({ data: [], isLoading: false, error: null });
    useCategoriesMock.mockReturnValue({ data: [{ id: 'cat-1', name: 'Platform Team', color: '#2563eb', sortOrder: 1 }] });
  });

  it('selects view from URL, applies query overrides, and writes clean view/custom filter URLs', async () => {
    renderCockpit('/?view=tagged-view&tags=frontend&categories=platform-team');

    await waitFor(() => expect(screen.getByTestId('active-view')).toHaveTextContent('view-tagged-id'));
    await waitFor(() => expect(useWorkstreamsMock).toHaveBeenLastCalledWith(expect.objectContaining({ tags: ['frontend'], categoryIds: ['cat-1'] })));
    expect(screen.getByTestId('unsaved')).toHaveTextContent('true');

    await userEvent.click(screen.getByRole('button', { name: 'Default View' }));
    expect(screen.getByTestId('location')).toHaveTextContent('?view=default-view');

    await userEvent.click(screen.getByRole('button', { name: 'Set frontend tag' }));
    expect(screen.getByTestId('location')).toHaveTextContent('?view=default-view&tags=frontend');
  });

  it('leaves missing view params omitted and removes invalid view params from the URL', async () => {
    const first = renderCockpit('/');

    await waitFor(() => expect(screen.getByTestId('active-view')).toHaveTextContent('view-default-id'));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(''));
    expect(screen.getByTestId('location')).not.toHaveTextContent('view=');

    first.unmount();
    renderCockpit('/?view=missing-view&tags=frontend');

    await waitFor(() => expect(screen.getByTestId('active-view')).toHaveTextContent('view-default-id'));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('?tags=frontend'));
    expect(screen.getByTestId('location')).not.toHaveTextContent('view=');
  });

  it('renders parent-group titles as parent links and excludes the parent stream card from the group', async () => {
    useWorkstreamsMock.mockReturnValue({
      data: [
        {
          id: 'parent-1',
          projectId: 'project-1',
          name: 'Parent stream',
          categoryId: null,
          context: null,
          state: 'active',
          createdAt: '2026-05-31T00:00:00Z',
          closedAt: null,
          allTags: [],
          parentId: null,
        },
        {
          id: 'substream-1',
          projectId: 'project-1',
          name: 'Sub-stream one',
          categoryId: null,
          context: null,
          state: 'active',
          createdAt: '2026-06-01T00:00:00Z',
          closedAt: null,
          allTags: [],
          parentId: 'parent-1',
          parent: { id: 'parent-1', name: 'Parent stream' },
        },
      ] satisfies Workstream[],
      isLoading: false,
      error: null,
    });

    renderCockpit('/?group=parent');

    await waitFor(() => expect(screen.getByRole('link', { name: 'Parent stream' })).toHaveAttribute('href', '/workstreams/parent-1'));
    expect(screen.getByText('(1)')).toBeInTheDocument();
    expect(screen.getAllByTestId('workstream-card')).toHaveLength(1);
    expect(screen.getByText(/Sub-stream one Parent: Parent stream/)).toBeInTheDocument();
    expect(screen.queryByTestId('workstream-card')).not.toHaveTextContent(/^Parent stream$/);
  });

  it('filters cockpit streams under multiple selected parents and nested sub-streams', async () => {
    useWorkstreamsMock.mockReturnValue({
      data: [
        { id: 'parent-1', projectId: 'project-1', name: 'Parent one', categoryId: null, context: null, state: 'active', createdAt: '2026-06-01T00:00:00Z', closedAt: null, allTags: [], parentId: null },
        { id: 'substream-1', projectId: 'project-1', name: 'Direct sub-stream', categoryId: null, context: null, state: 'active', createdAt: '2026-06-02T00:00:00Z', closedAt: null, allTags: [], parentId: 'parent-1', parent: { id: 'parent-1', name: 'Parent one' } },
        { id: 'nested-substream', projectId: 'project-1', name: 'Nested sub-stream', categoryId: null, context: null, state: 'active', createdAt: '2026-06-03T00:00:00Z', closedAt: null, allTags: [], parentId: 'substream-1', parent: { id: 'substream-1', name: 'Direct sub-stream' }, parentStreams: [{ id: 'parent-1', name: 'Parent one' }, { id: 'substream-1', name: 'Direct sub-stream' }] },
        { id: 'other-substream', projectId: 'project-1', name: 'Other sub-stream', categoryId: null, context: null, state: 'active', createdAt: '2026-06-04T00:00:00Z', closedAt: null, allTags: [], parentId: 'parent-2', parent: { id: 'parent-2', name: 'Parent two' } },
      ] satisfies Workstream[],
      isLoading: false,
      error: null,
    });

    renderCockpit('/?hierarchy=under-parent&parentIds=parent-1&includeSubstreams=1&group=none');

    await waitFor(() => expect(useWorkstreamsMock).toHaveBeenLastCalledWith(expect.objectContaining({
      hierarchy: 'under-parent',
      parentId: 'parent-1',
      parentIds: ['parent-1'],
      includeSubstreams: true,
    })));
    await waitFor(() => expect(screen.getAllByTestId('workstream-card')).toHaveLength(3));
    const cardText = screen.getAllByTestId('workstream-card').map((card) => card.textContent).join(' | ');
    expect(cardText).toContain('Parent one');
    expect(cardText).toContain('Direct sub-stream Parent: Parent one');
    expect(cardText).toContain('Nested sub-stream Parent: Direct sub-stream');
    expect(cardText).not.toContain('Other sub-stream');
  });

  it('keeps parent grouping when not-updated-today filtering returns sub-streams without their parent row', async () => {
    useWorkstreamsMock.mockReturnValue({
      data: [
        {
          id: 'substream-1',
          projectId: 'project-1',
          name: 'Sub-stream one',
          categoryId: null,
          context: null,
          state: 'active',
          createdAt: '2026-06-01T00:00:00Z',
          closedAt: null,
          allTags: [],
          parentId: 'parent-1',
          parent: { id: 'parent-1', name: 'Parent stream' },
        },
        {
          id: 'substream-2',
          projectId: 'project-1',
          name: 'Sub-stream two',
          categoryId: null,
          context: null,
          state: 'active',
          createdAt: '2026-06-02T00:00:00Z',
          closedAt: null,
          allTags: [],
          parentId: 'parent-1',
          parent: { id: 'parent-1', name: 'Parent stream' },
        },
      ] satisfies Workstream[],
      isLoading: false,
      error: null,
    });

    renderCockpit('/?notUpdatedToday=1&group=parent');

    await waitFor(() => expect(useWorkstreamsMock).toHaveBeenLastCalledWith(expect.objectContaining({ notUpdatedToday: true })));
    expect(screen.getByRole('heading', { name: 'Parent stream' })).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Top level / no parent' })).not.toBeInTheDocument();
    expect(screen.getByText(/Sub-stream one Parent: Parent stream/)).toBeInTheDocument();
    expect(screen.getByText(/Sub-stream two Parent: Parent stream/)).toBeInTheDocument();
  });
});
