import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ViewConfig } from '../../types/view';
import type { Workstream } from '../../types/workstream';

const useWorkstreamsMock = vi.hoisted(() => vi.fn());
const useWorkstreamReferencesMock = vi.hoisted(() => vi.fn());
const useCategoriesMock = vi.hoisted(() => vi.fn());
const viewsApiMock = vi.hoisted(() => ({ getViews: vi.fn() }));

vi.mock('../../hooks/useWorkstreams', () => ({
  useWorkstreams: useWorkstreamsMock,
}));

vi.mock('../../hooks/useWorkstreamReferences', () => ({
  useWorkstreamReferences: useWorkstreamReferencesMock,
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
vi.mock('../../components/Workstream/WorkstreamSkeleton', () => ({
  WorkstreamSkeleton: () => <div />,
}));
vi.mock('../../components/Workstream/WorkstreamCreateDialog', () => ({
  WorkstreamCreateDialog: () => null,
}));
vi.mock('../../components/ViewManagement/ViewCreateDialog', () => ({
  ViewCreateDialog: () => null,
}));
vi.mock('../../components/ViewManagement/ViewControls', () => ({
  ViewControls: ({ config, onConfigChange, hasUnsavedChanges }: any) => (
    <div>
      <div data-testid="unsaved">{String(hasUnsavedChanges)}</div>
      <button
        onClick={() =>
          onConfigChange({ ...config, filters: { ...config.filters, tags: ['frontend'] } })
        }
      >
        Set frontend tag
      </button>
    </div>
  ),
}));
vi.mock('../../components/ViewManagement/ViewTabs', () => ({
  ViewTabs: ({ views, activeViewId, onViewChange }: any) => (
    <div>
      <div data-testid="active-view">{activeViewId}</div>
      {views.map((view: ViewConfig) => (
        <button key={view.id} onClick={() => onViewChange(view.id)}>
          {view.name}
        </button>
      ))}
    </div>
  ),
}));

import Cockpit from '../../pages/Cockpit';

const config = (tags: string[] = [], categoryIds: string[] = []): ViewConfig['config'] => ({
  filters: {
    categoryIds,
    tags,
    temporal: { notUpdatedToday: false },
    hierarchy: {
      mode: 'all',
      parentId: null,
      parentIds: [],
      includeSubstreams: false,
      timelineScope: 'all',
      includeStructuralEvents: true,
    },
  },
  sort: { field: 'lastActivityAt', direction: 'desc' },
  group: { by: 'category' },
});

const views: ViewConfig[] = [
  {
    id: 'view-default-id',
    name: 'Default View',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    config: config(),
  },
  {
    id: 'view-tagged-id',
    name: 'Tagged View',
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    config: config(['backend'], ['cat-1']),
  },
];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderCockpit(initialEntry: string) {
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
                <Cockpit />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Cockpit URL state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    viewsApiMock.getViews.mockResolvedValue(views);
    useWorkstreamsMock.mockReturnValue({ data: [], isLoading: false, error: null });
    useWorkstreamReferencesMock.mockReturnValue({ data: [], isLoading: false, error: null });
    useCategoriesMock.mockReturnValue({
      data: [{ id: 'cat-1', name: 'Platform Team', color: '#2563eb', sortOrder: 1 }],
    });
  });

  it('selects view from URL, applies query overrides, and writes clean view/custom filter URLs', async () => {
    renderCockpit('/?view=tagged-view&tags=frontend&categories=platform-team');

    await waitFor(() =>
      expect(screen.getByTestId('active-view')).toHaveTextContent('view-tagged-id'),
    );
    await waitFor(() =>
      expect(useWorkstreamsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ tags: ['frontend'], categoryIds: ['cat-1'] }),
      ),
    );
    expect(screen.getByTestId('unsaved')).toHaveTextContent('true');

    await userEvent.click(screen.getByRole('button', { name: 'Default View' }));
    expect(screen.getByTestId('location')).toHaveTextContent('?view=default-view');

    await userEvent.click(screen.getByRole('button', { name: 'Set frontend tag' }));
    expect(screen.getByTestId('location')).toHaveTextContent('?view=default-view&tags=frontend');
  });

  it('loads a saved view with only the scoped workstream request for that view', async () => {
    renderCockpit('/?view=tagged-view');

    await waitFor(() =>
      expect(screen.getByTestId('active-view')).toHaveTextContent('view-tagged-id'),
    );
    await waitFor(() =>
      expect(useWorkstreamsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'active',
          tags: ['backend'],
          categoryIds: ['cat-1'],
          notUpdatedToday: false,
          includeSubstreams: false,
        }),
      ),
    );

    const enabledWorkstreamCalls = useWorkstreamsMock.mock.calls
      .map(([options]) => options)
      .filter((options) => options.enabled !== false);

    expect(enabledWorkstreamCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          state: 'active',
          tags: ['backend'],
          categoryIds: ['cat-1'],
          notUpdatedToday: false,
          includeSubstreams: false,
        }),
      ]),
    );
    expect(enabledWorkstreamCalls).not.toContainEqual({ state: 'active' });
    expect(enabledWorkstreamCalls).not.toContainEqual(
      expect.objectContaining({ state: 'active', tags: undefined, categoryIds: undefined }),
    );
    const referenceCalls = useWorkstreamReferencesMock.mock.calls.map(([options]) => options);
    expect(referenceCalls).toEqual(
      expect.arrayContaining([expect.objectContaining({ state: 'active', enabled: false })]),
    );
  });

  it('shows the create-first empty state only when no active workstreams exist', async () => {
    useWorkstreamReferencesMock.mockReturnValue({ data: [], isLoading: false, error: null });

    renderCockpit('/');

    const emptyMessage = await screen.findByText('No workstreams yet. Create your first one!');
    expect(emptyMessage.closest('div')).toHaveClass('flex', 'items-center', 'justify-center');
    expect(screen.queryByText('No workstreams match this view.')).not.toBeInTheDocument();
  });

  it('shows a filter-specific centered empty state when existing workstreams are hidden by the current view', async () => {
    useWorkstreamReferencesMock.mockReturnValue({
      data: [{ id: 'stream-1', number: 1, name: 'Existing stream', state: 'active' }],
      isLoading: false,
      error: null,
    });

    renderCockpit('/?view=tagged-view');

    const emptyMessage = await screen.findByText('No workstreams match this view.');
    expect(emptyMessage.closest('div')).toHaveClass('flex', 'items-center', 'justify-center');
    expect(screen.queryByText('No workstreams yet. Create your first one!')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(useWorkstreamReferencesMock).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'active', enabled: true }),
      ),
    );
  });

  it('leaves missing view params omitted and removes invalid view params from the URL', async () => {
    const first = renderCockpit('/');

    await waitFor(() =>
      expect(screen.getByTestId('active-view')).toHaveTextContent('view-default-id'),
    );
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(''));
    expect(screen.getByTestId('location')).not.toHaveTextContent('view=');

    first.unmount();
    renderCockpit('/?view=missing-view&tags=frontend');

    await waitFor(() =>
      expect(screen.getByTestId('active-view')).toHaveTextContent('view-default-id'),
    );
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('?tags=frontend'));
    expect(screen.getByTestId('location')).not.toHaveTextContent('view=');
  });

  it('renders parent-group titles as parent links and excludes the parent stream card from the group', async () => {
    useWorkstreamsMock.mockReturnValue({
      data: [
        {
          id: 'parent-1',
          number: 7,
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
          number: 8,
          projectId: 'project-1',
          name: 'Sub-stream one',
          categoryId: null,
          context: null,
          state: 'active',
          createdAt: '2026-06-01T00:00:00Z',
          closedAt: null,
          allTags: [],
          parentId: 'parent-1',
          parent: { id: 'parent-1', number: 7, name: 'Parent stream' },
        },
      ] satisfies Workstream[],
      isLoading: false,
      error: null,
    });

    renderCockpit('/?group=parent');

    await waitFor(() =>
      expect(screen.getByRole('link', { name: '#7 Parent stream' })).toHaveAttribute(
        'href',
        '/workstreams/7',
      ),
    );
    expect(screen.getByText('(1)')).toBeInTheDocument();
    expect(screen.getAllByTestId('workstream-card')).toHaveLength(1);
    expect(screen.getByText(/Sub-stream one Parent: Parent stream/)).toBeInTheDocument();
    expect(screen.queryByTestId('workstream-card')).not.toHaveTextContent(/^Parent stream$/);
  });

  it('orders category groups by the Settings category list instead of first stream order', async () => {
    useCategoriesMock.mockReturnValue({
      data: [
        {
          id: 'cat-platform',
          name: 'platform',
          color: '#2563eb',
          sortOrder: 0,
        },
        {
          id: 'cat-assets',
          name: 'assets',
          color: '#16a34a',
          sortOrder: 1,
        },
      ],
    });
    useWorkstreamsMock.mockReturnValue({
      data: [
        {
          id: 'stream-assets',
          projectId: 'project-1',
          name: 'Assets stream',
          categoryId: 'cat-assets',
          context: null,
          state: 'active',
          createdAt: '2026-06-02T00:00:00Z',
          closedAt: null,
          allTags: [],
          category: {
            id: 'cat-assets',
            name: 'assets',
            color: '#16a34a',
            description: '',
            sortOrder: 0,
          },
        },
        {
          id: 'stream-platform',
          projectId: 'project-1',
          name: 'Platform stream',
          categoryId: 'cat-platform',
          context: null,
          state: 'active',
          createdAt: '2026-06-01T00:00:00Z',
          closedAt: null,
          allTags: [],
          category: {
            id: 'cat-platform',
            name: 'platform',
            color: '#2563eb',
            description: '',
            sortOrder: 0,
          },
        },
      ] satisfies Workstream[],
      isLoading: false,
      error: null,
    });

    renderCockpit('/');

    const categoryHeadings = await screen.findAllByRole('heading', { level: 2 });
    expect(categoryHeadings.map((heading) => heading.textContent)).toEqual(['platform', 'assets']);
  });

  it('filters cockpit streams under multiple selected parents and nested sub-streams', async () => {
    useWorkstreamsMock.mockReturnValue({
      data: [
        {
          id: 'substream-1',
          number: 11,
          projectId: 'project-1',
          name: 'Direct sub-stream',
          categoryId: null,
          context: null,
          state: 'active',
          createdAt: '2026-06-02T00:00:00Z',
          closedAt: null,
          allTags: [],
          parentId: 'parent-1',
          parent: { id: 'parent-1', number: 10, name: 'Parent one' },
        },
        {
          id: 'nested-substream',
          number: 12,
          projectId: 'project-1',
          name: 'Nested sub-stream',
          categoryId: null,
          context: null,
          state: 'active',
          createdAt: '2026-06-03T00:00:00Z',
          closedAt: null,
          allTags: [],
          parentId: 'substream-1',
          parent: { id: 'substream-1', number: 11, name: 'Direct sub-stream' },
          parentStreams: [
            { id: 'parent-1', number: 10, name: 'Parent one' },
            { id: 'substream-1', number: 11, name: 'Direct sub-stream' },
          ],
        },
      ] satisfies Workstream[],
      isLoading: false,
      error: null,
    });

    useWorkstreamReferencesMock.mockReturnValue({
      data: [{ id: 'parent-1', number: 10, name: 'Parent one', state: 'active' }],
      isLoading: false,
      error: null,
    });

    renderCockpit('/?hierarchy=under-parent&parentIds=10&includeSubstreams=1&group=none');

    await waitFor(() =>
      expect(useWorkstreamsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          hierarchy: 'under-parent',
          parentId: 'parent-1',
          parentIds: ['parent-1'],
          includeSubstreams: true,
        }),
      ),
    );
    await waitFor(() => expect(screen.getAllByTestId('workstream-card')).toHaveLength(2));
    const cardTexts = screen
      .getAllByTestId('workstream-card')
      .map((card) => card.textContent ?? '');
    const cardText = cardTexts.join(' | ');
    expect(cardTexts).not.toContain('Parent one');
    expect(cardText).toContain('Direct sub-stream Parent: Parent one');
    expect(cardText).toContain('Nested sub-stream Parent: Direct sub-stream');
    expect(cardText).not.toContain('Other sub-stream');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('parentIds=10'));
  });

  it('groups nested sub-streams under the selected parent when under-parent filter includes sub-streams', async () => {
    useWorkstreamsMock.mockReturnValue({
      data: [
        {
          id: 'stream-b',
          number: 11,
          projectId: 'project-1',
          name: 'B',
          categoryId: null,
          context: null,
          state: 'active',
          createdAt: '2026-06-02T00:00:00Z',
          closedAt: null,
          allTags: [],
          parentId: 'stream-a',
          parent: { id: 'stream-a', number: 10, name: 'A' },
          parentStreams: [{ id: 'stream-a', number: 10, name: 'A' }],
        },
        {
          id: 'stream-c',
          number: 12,
          projectId: 'project-1',
          name: 'C',
          categoryId: null,
          context: null,
          state: 'active',
          createdAt: '2026-06-03T00:00:00Z',
          closedAt: null,
          allTags: [],
          parentId: 'stream-b',
          parent: { id: 'stream-b', number: 11, name: 'B' },
          parentStreams: [
            { id: 'stream-a', number: 10, name: 'A' },
            { id: 'stream-b', number: 11, name: 'B' },
          ],
        },
      ] satisfies Workstream[],
      isLoading: false,
      error: null,
    });

    useWorkstreamReferencesMock.mockReturnValue({
      data: [{ id: 'stream-a', number: 10, name: 'A', state: 'active' }],
      isLoading: false,
      error: null,
    });

    renderCockpit('/?hierarchy=under-parent&parentIds=10&includeSubstreams=1&group=parent');

    await waitFor(() =>
      expect(useWorkstreamsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          hierarchy: 'under-parent',
          parentId: 'stream-a',
          parentIds: ['stream-a'],
          includeSubstreams: true,
        }),
      ),
    );
    expect(screen.getByRole('link', { name: '#10 A' })).toHaveAttribute('href', '/workstreams/10');
    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(screen.getAllByTestId('workstream-card')).toHaveLength(2);
    expect(screen.getByText(/B Parent: A/)).toBeInTheDocument();
    expect(screen.getByText(/C Parent: B/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '#11 B' })).not.toBeInTheDocument();
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

    await waitFor(() =>
      expect(useWorkstreamsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ notUpdatedToday: true }),
      ),
    );
    expect(screen.getByRole('heading', { name: 'Parent stream' })).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Top level / no parent' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Sub-stream one Parent: Parent stream/)).toBeInTheDocument();
    expect(screen.getByText(/Sub-stream two Parent: Parent stream/)).toBeInTheDocument();
  });
});
