import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FilterPanel } from '../../components/ViewManagement/FilterPanel';
import { ViewControls } from '../../components/ViewManagement/ViewControls';
import type { ViewConfig } from '../../types/view';

vi.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    data: [
      { id: 'cat-1', name: 'Product', color: '#ef4444', emoji: '🚀', sortOrder: 0 },
    ],
  }),
}));

vi.mock('../../hooks/useWorkstreams', () => ({
  useWorkstreams: () => ({
    data: [
      { id: 'parent-1', projectId: 'project-1', name: 'Parent Alpha', categoryId: null, context: null, state: 'active', createdAt: '2026-01-01T00:00:00Z', closedAt: null, allTags: [] },
      { id: 'parent-2', projectId: 'project-1', name: 'Ops Beta', categoryId: null, context: null, state: 'active', createdAt: '2026-01-02T00:00:00Z', closedAt: null, allTags: [] },
    ],
  }),
}));

vi.mock('../../api/tags', () => ({
  useTags: () => ({
    data: [
      {
        id: 'tag-1',
        projectId: 'project-1',
        name: 'urgent',
        displayName: 'Urgent',
        color: '#f97316',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
  }),
}));

const baseConfig: ViewConfig['config'] = {
  filters: {
    categoryIds: [],
    tags: [],
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
};

describe('ViewControls', () => {
  it('creates a high stacking context so dropdowns overlay workstream cards', () => {
    render(
      <ViewControls
        config={baseConfig}
        onConfigChange={vi.fn()}
        hasUnsavedChanges={false}
        onSave={vi.fn()}
        onSaveAs={vi.fn()}
        onDiscard={vi.fn()}
      />
    );

    const controlsBar = screen.getByTestId('view-controls-bar');
    expect(controlsBar).toHaveClass('relative');
    expect(controlsBar).toHaveClass('z-40');
  });
});

describe('FilterPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function renderFilterPanel() {
    const onFiltersChange = vi.fn();
    const onClose = vi.fn();

    const result = render(
      <FilterPanel
        filters={baseConfig.filters}
        onFiltersChange={onFiltersChange}
        onClose={onClose}
      />
    );

    return { ...result, onFiltersChange, onClose };
  }

  it('opens with Categories expanded and Tags, Other, and Parent/sub-streams collapsed', () => {
    renderFilterPanel();

    expect(screen.getByRole('button', { name: /categories/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /tags/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /other/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /parent\/sub-streams/i })).toHaveAttribute('aria-expanded', 'false');

    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.queryByText('#Urgent')).not.toBeInTheDocument();
    expect(screen.queryByText('Not updated today')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /all streams/i })).not.toBeInTheDocument();
  });

  it('uses an auto-fitting scroll container capped at half the viewport instead of fixed max-h-96', () => {
    renderFilterPanel();

    const scrollContainer = screen.getByTestId('filter-panel-scroll-container');
    expect(scrollContainer).toHaveClass('max-h-[50vh]');
    expect(scrollContainer).toHaveClass('overflow-y-auto');
    expect(scrollContainer).not.toHaveClass('max-h-96');
  });

  it('remembers expanded filter sections after the panel is reopened', async () => {
    const user = userEvent.setup();
    const firstRender = renderFilterPanel();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /categories/i }));
      await user.click(screen.getByRole('button', { name: /tags/i }));
      await user.click(screen.getByRole('button', { name: /parent\/sub-streams/i }));
    });

    expect(screen.getByRole('button', { name: /categories/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /tags/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /parent\/sub-streams/i })).toHaveAttribute('aria-expanded', 'true');

    firstRender.unmount();
    renderFilterPanel();

    expect(screen.getByRole('button', { name: /categories/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /tags/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /other/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /parent\/sub-streams/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByText('Product')).not.toBeInTheDocument();
    expect(screen.getByText('#Urgent')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /all streams/i })).toBeInTheDocument();
  });

  it('shows inline Parent/sub-streams radios without a nested dropdown and applies selected mode', async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilterPanel();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /parent\/sub-streams/i }));
    });

    expect(screen.getByRole('radio', { name: /all streams/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /sub-streams only/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /no parent/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /has sub-streams/i })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /top-level only/i })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /include sub-streams in scoped results/i })).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /all streams/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('listbox', { name: /parent\/sub-streams/i })).not.toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('radio', { name: /has sub-streams/i }));
    });
    expect(screen.getByRole('radio', { name: /has sub-streams/i })).toBeChecked();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /apply/i }));
    });
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...baseConfig.filters,
      hierarchy: { ...baseConfig.filters.hierarchy, mode: 'has-substreams' },
    });
  });

  it('selects multiple under-parent filters with fuzzy parent search', async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilterPanel();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /parent\/sub-streams/i }));
    });
    await waitFor(() => expect(screen.getByRole('radio', { name: /under the parent/i })).toBeInTheDocument());
    await act(async () => {
      await user.click(screen.getByRole('radio', { name: /under the parent/i }));
    });

    expect(screen.getByLabelText(/search parent streams/i)).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: /parent streams/i })).toBeInTheDocument();

    await act(async () => {
      await user.type(screen.getByLabelText(/search parent streams/i), 'alpha');
    });
    expect(screen.getByText('Parent Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Ops Beta')).not.toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('checkbox', { name: /parent alpha/i }));
      await user.clear(screen.getByLabelText(/search parent streams/i));
      await user.type(screen.getByLabelText(/search parent streams/i), 'beta');
      await user.click(screen.getByRole('checkbox', { name: /ops beta/i }));
      await user.click(screen.getByRole('checkbox', { name: /include sub-streams in scoped results/i }));
      await user.click(screen.getByRole('button', { name: /apply/i }));
    });

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...baseConfig.filters,
      hierarchy: {
        ...baseConfig.filters.hierarchy,
        mode: 'under-parent',
        parentId: 'parent-1',
        parentIds: ['parent-1', 'parent-2'],
        includeSubstreams: true,
      },
    });
  });
});
