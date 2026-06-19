import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useViewManager } from '../../hooks/useViewManager';
import type { ViewConfig } from '../../types/view';

const defaultConfig: ViewConfig['config'] = {
  filters: { categoryIds: [], tags: [], temporal: { notUpdatedToday: false } },
  sort: { field: 'updatedAt', direction: 'desc' },
  group: { by: 'none' },
};

const createTestView = (overrides: Partial<ViewConfig> = {}): ViewConfig => ({
  id: 'default-view',
  name: 'Default View',
  isDefault: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  config: defaultConfig,
  ...overrides,
});

const viewApiMock = vi.hoisted(() => {
  let views: ViewConfig[] = [];
  let nextId = 1;

  return {
    reset: (initialViews: ViewConfig[]) => {
      views = initialViews.map((view) => ({ ...view, config: structuredClone(view.config) }));
      nextId = 1;
    },
    getViews: vi.fn(async () => views.map((view) => ({ ...view, config: structuredClone(view.config) }))),
    createView: vi.fn(async (input: { name: string; isDefault?: boolean; config: ViewConfig['config'] }) => {
      const now = new Date('2026-01-02T00:00:00Z');
      const view = createTestView({
        id: `created-view-${nextId++}`,
        name: input.name,
        isDefault: input.isDefault ?? false,
        createdAt: now,
        updatedAt: now,
        config: structuredClone(input.config),
      });
      views.push(view);
      return { ...view, config: structuredClone(view.config) };
    }),
    updateView: vi.fn(async (viewId: string, input: Partial<Pick<ViewConfig, 'name' | 'isDefault' | 'config'>>) => {
      const index = views.findIndex((view) => view.id === viewId);
      if (index === -1) {
        throw new Error(`View ${viewId} not found`);
      }
      views[index] = {
        ...views[index],
        ...input,
        config: input.config ? { ...views[index].config, ...input.config } : views[index].config,
        updatedAt: new Date('2026-01-03T00:00:00Z'),
      };
      return { ...views[index], config: structuredClone(views[index].config) };
    }),
    deleteView: vi.fn(async (viewId: string) => {
      views = views.filter((view) => view.id !== viewId);
    }),
  };
});

vi.mock('../../api/views', () => ({
  getViews: viewApiMock.getViews,
  createView: viewApiMock.createView,
  updateView: viewApiMock.updateView,
  deleteView: viewApiMock.deleteView,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const renderUseViewManager = async () => {
  const rendered = renderHook(() => useViewManager(), { wrapper: createWrapper() });
  await waitFor(() => expect(rendered.result.current.views.length).toBeGreaterThan(0));
  return rendered;
};

describe('useViewManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    viewApiMock.reset([createTestView()]);
  });

  it('should initialize with default view', async () => {
    const { result } = await renderUseViewManager();

    expect(result.current.views.length).toBeGreaterThan(0);
    expect(result.current.activeViewId).toBe('default-view');
    expect(result.current.currentConfig).toEqual(defaultConfig);
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should create a new view', async () => {
    const { result } = await renderUseViewManager();
    const initialViewCount = result.current.views.length;

    await act(async () => {
      await result.current.createView('My Custom View');
    });

    await waitFor(() => expect(result.current.views.length).toBe(initialViewCount + 1));
    expect(result.current.views[result.current.views.length - 1].name).toBe('My Custom View');
  });

  it('should switch between views', async () => {
    const { result } = await renderUseViewManager();

    await act(async () => {
      await result.current.createView('View 1');
      await result.current.createView('View 2');
    });

    await waitFor(() => expect(result.current.views.some((view) => view.name === 'View 2')).toBe(true));
    const view1Id = result.current.views.find(v => v.name === 'View 1')?.id;
    const view2Id = result.current.views.find(v => v.name === 'View 2')?.id;

    act(() => {
      result.current.switchView(view1Id!);
    });
    expect(result.current.activeViewId).toBe(view1Id);

    act(() => {
      result.current.switchView(view2Id!);
    });
    expect(result.current.activeViewId).toBe(view2Id);
  });

  it('should delete a view', async () => {
    const { result } = await renderUseViewManager();

    await act(async () => {
      await result.current.createView('View to Delete');
    });

    await waitFor(() => expect(result.current.views.some((view) => view.name === 'View to Delete')).toBe(true));
    const viewId = result.current.views.find(v => v.name === 'View to Delete')?.id;
    const initialCount = result.current.views.length;

    await act(async () => {
      await result.current.deleteView(viewId!);
    });

    await waitFor(() => expect(result.current.views.length).toBe(initialCount - 1));
    expect(result.current.views.find(v => v.id === viewId)).toBeUndefined();
  });

  it('should detect unsaved changes', async () => {
    const { result } = await renderUseViewManager();

    expect(result.current.hasUnsavedChanges).toBe(false);

    act(() => {
      result.current.setCurrentConfig({
        ...result.current.currentConfig,
        filters: {
          ...result.current.currentConfig.filters,
          tags: ['test-tag'],
        },
      });
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('should save current view', async () => {
    const { result } = await renderUseViewManager();

    act(() => {
      result.current.setCurrentConfig({
        ...result.current.currentConfig,
        filters: {
          ...result.current.currentConfig.filters,
          tags: ['test-tag'],
        },
      });
    });

    expect(result.current.hasUnsavedChanges).toBe(true);

    await act(async () => {
      await result.current.saveCurrentView();
    });

    await waitFor(() => expect(result.current.hasUnsavedChanges).toBe(false));
  });

  it('should discard changes', async () => {
    const { result } = await renderUseViewManager();
    const originalTags = result.current.currentConfig.filters.tags;

    act(() => {
      result.current.setCurrentConfig({
        ...result.current.currentConfig,
        filters: {
          ...result.current.currentConfig.filters,
          tags: ['test-tag'],
        },
      });
    });

    expect(result.current.hasUnsavedChanges).toBe(true);

    act(() => {
      result.current.discardChanges();
    });

    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.currentConfig.filters.tags).toEqual(originalTags);
  });

  it('should rename a view', async () => {
    const { result } = await renderUseViewManager();

    await act(async () => {
      await result.current.createView('Old Name');
    });

    await waitFor(() => expect(result.current.views.some((view) => view.name === 'Old Name')).toBe(true));
    const viewId = result.current.views.find(v => v.name === 'Old Name')?.id;

    await act(async () => {
      await result.current.renameView(viewId!, 'New Name');
    });

    await waitFor(() => expect(result.current.views.find(v => v.id === viewId)?.name).toBe('New Name'));
  });

  it('should refetch views from the API after creating a view', async () => {
    const { result } = await renderUseViewManager();

    await act(async () => {
      await result.current.createView('Persisted View');
    });

    await waitFor(() => expect(result.current.views.some((v) => v.name === 'Persisted View')).toBe(true));
    expect(viewApiMock.createView).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Persisted View' })
    );
  });

  it('should load views returned by the API on init', async () => {
    viewApiMock.reset([
      createTestView({
        id: 'test-view-1',
        name: 'Loaded View',
        config: defaultConfig,
      }),
    ]);

    const { result } = await renderUseViewManager();

    expect(result.current.views.some(v => v.name === 'Loaded View')).toBe(true);
    expect(result.current.activeViewId).toBe('test-view-1');
  });

  it('should enforce max 50 views limit', async () => {
    const { result } = await renderUseViewManager();

    await act(async () => {
      for (let i = 0; i < 49; i++) {
        await result.current.createView(`View ${i}`);
      }
    });

    await waitFor(() => expect(result.current.views.length).toBe(50));
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await act(async () => {
      await result.current.createView('View 51');
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Maximum number of views (50) reached')
    );
    expect(result.current.views.length).toBeLessThanOrEqual(50);

    consoleWarnSpy.mockRestore();
  });
});
