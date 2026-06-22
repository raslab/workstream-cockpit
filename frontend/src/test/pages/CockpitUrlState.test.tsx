import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ViewConfig } from '../../types/view';

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

vi.mock('../../components/Workstream/WorkstreamCard', () => ({ WorkstreamCard: () => <div /> }));
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
    hierarchy: { mode: 'all', parentId: null, includeSubstreams: false, timelineScope: 'all', includeStructuralEvents: true },
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
});
