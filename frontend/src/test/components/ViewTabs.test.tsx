import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ViewTabs } from '../../components/ViewManagement/ViewTabs';
import type { ViewConfig } from '../../types/view';

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

const createView = (overrides: Partial<ViewConfig> = {}): ViewConfig => ({
  id: 'view-1',
  name: 'Default View',
  isDefault: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  config: baseConfig,
  ...overrides,
});

describe('ViewTabs', () => {
  it('keeps many view tabs on one horizontally scrollable row without wrapping', () => {
    const views = Array.from({ length: 16 }, (_, index) =>
      createView({
        id: `view-${index}`,
        name: `Long operational planning view ${index + 1}`,
        isDefault: index === 0,
      }),
    );

    render(
      <ViewTabs
        views={views}
        activeViewId="view-8"
        onViewChange={vi.fn()}
        onViewCreate={vi.fn()}
        onViewDelete={vi.fn()}
        onViewRename={vi.fn()}
        onNewWorkstream={vi.fn()}
      />,
    );

    const tabsScroller = screen.getByTestId('view-tabs-scroll-container');
    expect(tabsScroller).toHaveClass('min-w-0');
    expect(tabsScroller).toHaveClass('flex-1');
    expect(tabsScroller).toHaveClass('overflow-x-auto');
    expect(tabsScroller).toHaveClass('whitespace-nowrap');
    expect(tabsScroller).not.toHaveClass('flex-wrap');

    const tabsList = screen.getByTestId('view-tabs-list');
    expect(tabsList).toHaveClass('flex-nowrap');
    expect(tabsList).toHaveClass('w-max');

    const activeTab = screen.getByTestId('view-tab-view-8');
    expect(activeTab).toHaveClass('shrink-0');
    expect(activeTab).toHaveClass('bg-white');
    expect(activeTab).toHaveAttribute('aria-current', 'page');
  });

  it('reserves edit controls space so hover controls do not shift or wrap tabs', async () => {
    const user = userEvent.setup();
    const onViewRename = vi.fn();
    const onViewDelete = vi.fn();
    window.confirm = vi.fn(() => true);

    render(
      <ViewTabs
        views={[
          createView({ id: 'default', name: 'Default View', isDefault: true }),
          createView({ id: 'custom', name: 'Custom View', isDefault: false }),
        ]}
        activeViewId="custom"
        onViewChange={vi.fn()}
        onViewCreate={vi.fn()}
        onViewDelete={onViewDelete}
        onViewRename={onViewRename}
      />,
    );

    const customTab = screen.getByTestId('view-tab-custom');
    expect(customTab).toHaveClass('shrink-0');
    expect(customTab).toHaveClass('whitespace-nowrap');

    const actions = screen.getByTestId('view-tab-custom-actions');
    expect(actions).toHaveClass('flex');
    expect(actions).toHaveClass('w-10');
    expect(actions).toHaveClass('opacity-100');
    expect(actions).toHaveClass('group-hover:opacity-100');
    expect(actions).not.toHaveClass('hidden');
    expect(actions).not.toHaveClass('group-hover:flex');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /rename view/i }));
    });
    const renameInput = await screen.findByRole('textbox');
    await act(async () => {
      await user.clear(renameInput);
      await user.type(renameInput, 'Renamed View{Enter}');
    });
    expect(onViewRename).toHaveBeenCalledWith('custom', 'Renamed View');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /delete view/i })).toBeInTheDocument(),
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /delete view/i }));
    });
    expect(onViewDelete).toHaveBeenCalledWith('custom');
  });
});
