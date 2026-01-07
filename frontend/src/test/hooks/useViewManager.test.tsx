import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewManager } from '../../hooks/useViewManager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useViewManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default view', () => {
    const { result } = renderHook(() => useViewManager());

    expect(result.current.views.length).toBeGreaterThan(0);
    expect(result.current.activeViewId).toBeDefined();
    expect(result.current.currentConfig).toBeDefined();
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should create a new view', () => {
    const { result } = renderHook(() => useViewManager());
    const initialViewCount = result.current.views.length;

    act(() => {
      result.current.createView('My Custom View');
    });

    expect(result.current.views.length).toBe(initialViewCount + 1);
    expect(result.current.views[result.current.views.length - 1].name).toBe('My Custom View');
  });

  it('should switch between views', () => {
    const { result } = renderHook(() => useViewManager());
    
    act(() => {
      result.current.createView('View 1');
      result.current.createView('View 2');
    });

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

  it('should delete a view', () => {
    const { result } = renderHook(() => useViewManager());
    
    act(() => {
      result.current.createView('View to Delete');
    });

    const viewId = result.current.views.find(v => v.name === 'View to Delete')?.id;
    const initialCount = result.current.views.length;

    act(() => {
      result.current.deleteView(viewId!);
    });

    expect(result.current.views.length).toBe(initialCount - 1);
    expect(result.current.views.find(v => v.id === viewId)).toBeUndefined();
  });

  it('should detect unsaved changes', () => {
    const { result } = renderHook(() => useViewManager());

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

  it('should save current view', () => {
    const { result } = renderHook(() => useViewManager());

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
      result.current.saveCurrentView();
    });

    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should discard changes', () => {
    const { result } = renderHook(() => useViewManager());
    const originalConfig = { ...result.current.currentConfig };

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
    expect(result.current.currentConfig.filters.tags).toEqual(originalConfig.filters.tags);
  });

  it('should rename a view', () => {
    const { result } = renderHook(() => useViewManager());
    
    act(() => {
      result.current.createView('Old Name');
    });

    const viewId = result.current.views.find(v => v.name === 'Old Name')?.id;

    act(() => {
      result.current.renameView(viewId!, 'New Name');
    });

    const renamedView = result.current.views.find(v => v.id === viewId);
    expect(renamedView?.name).toBe('New Name');
  });

  it('should persist to localStorage', () => {
    const { result } = renderHook(() => useViewManager());

    act(() => {
      result.current.createView('Persisted View');
    });

    // Check localStorage
    const stored = localStorage.getItem('workstream_views');
    expect(stored).toBeDefined();
    
    const parsed = JSON.parse(stored!);
    expect(parsed.views.some((v: any) => v.name === 'Persisted View')).toBe(true);
  });

  it('should load from localStorage on init', () => {
    // Pre-populate localStorage
    const testViews = {
      version: 1,
      views: [
        {
          id: 'test-view-1',
          name: 'Loaded View',
          config: {
            filters: { categoryIds: [], tags: [], temporal: { notUpdatedToday: false } },
            sort: { field: 'updatedAt', direction: 'desc' },
            group: { by: 'none' },
          },
        },
      ],
      activeViewId: 'test-view-1',
    };
    localStorage.setItem('workstream_views', JSON.stringify(testViews));

    const { result } = renderHook(() => useViewManager());

    expect(result.current.views.some(v => v.name === 'Loaded View')).toBe(true);
  });

  it('should enforce max 50 views limit', () => {
    const { result } = renderHook(() => useViewManager());

    // Create 50 views
    act(() => {
      for (let i = 0; i < 50; i++) {
        result.current.createView(`View ${i}`);
      }
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Attempt to create 51st view
    act(() => {
      result.current.createView('View 51');
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Maximum number of views (50) reached')
    );
    expect(result.current.views.length).toBeLessThanOrEqual(50);

    consoleWarnSpy.mockRestore();
  });
});
