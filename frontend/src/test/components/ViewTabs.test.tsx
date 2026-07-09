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
  it('uses Chrome-like fixed tabs that shrink inactive tabs equally without a horizontal scrollbar', () => {
    const views = Array.from({ length: 12 }, (_, index) =>
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

    const tabsPanel = screen.getByTestId('view-tabs-panel');
    expect(tabsPanel).toHaveClass('overflow-hidden');
    expect(tabsPanel).not.toHaveClass('overflow-x-auto');

    const tabsList = screen.getByTestId('view-tabs-list');
    expect(tabsList).toHaveClass('min-w-0');
    expect(tabsList).toHaveClass('flex-1');
    expect(tabsList).toHaveClass('overflow-hidden');
    expect(tabsList).toHaveClass('flex-nowrap');

    const activeTab = screen.getByTestId('view-tab-view-8');
    expect(activeTab).toHaveClass('basis-[150px]');
    expect(activeTab).toHaveClass('shrink-0');
    expect(activeTab).toHaveClass('bg-white');
    expect(activeTab).toHaveAttribute('aria-current', 'page');

    const inactiveTab = screen.getByTestId('view-tab-view-7');
    expect(inactiveTab).toHaveClass('basis-[150px]');
    expect(inactiveTab).toHaveClass('shrink');
    expect(inactiveTab).toHaveClass('min-w-12');
    expect(inactiveTab).not.toHaveAttribute('aria-current');

    expect(screen.getAllByTestId('view-tab-separator')).toHaveLength(11);
  });

  it('overlays edit controls on hover/focus so text truncates more without reserving empty button space', async () => {
    const user = userEvent.setup();
    const onViewRename = vi.fn();
    const onViewDelete = vi.fn();
    window.confirm = vi.fn(() => true);

    render(
      <ViewTabs
        views={[
          createView({ id: 'default', name: 'Default View', isDefault: true }),
          createView({
            id: 'custom',
            name: 'Custom View With A Very Long Name',
            isDefault: false,
          }),
        ]}
        activeViewId="custom"
        onViewChange={vi.fn()}
        onViewCreate={vi.fn()}
        onViewDelete={onViewDelete}
        onViewRename={onViewRename}
      />,
    );

    const customTab = screen.getByTestId('view-tab-custom');
    expect(customTab).toHaveClass('basis-[150px]');
    expect(customTab).toHaveClass('overflow-hidden');

    const label = screen.getByRole('button', { name: /custom view with a very long name/i });
    expect(label).toHaveClass('truncate');
    expect(label).toHaveClass('group-hover:pr-10');
    expect(label).toHaveAttribute('title', 'Custom View With A Very Long Name');

    const actions = screen.getByTestId('view-tab-custom-actions');
    expect(actions).toHaveClass('absolute');
    expect(actions).toHaveClass('right-2');
    expect(actions).toHaveClass('opacity-0');
    expect(actions).toHaveClass('group-hover:opacity-100');
    expect(actions).not.toHaveClass('w-10');
    expect(actions).not.toHaveClass('hidden');

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
