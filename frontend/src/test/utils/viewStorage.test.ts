import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDefaultStorage, loadViewsFromStorage, saveViewsToStorage } from '../../utils/viewStorage';
import type { ViewStorage } from '../../types/view';

const STORAGE_KEY = 'workstream_cockpit_views';

describe('viewStorage hierarchy config', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should include default hierarchy filters in default storage', () => {
    const storage = getDefaultStorage();

    expect(storage.views[0].config.filters.hierarchy).toEqual({
      mode: 'all',
      parentId: null,
      includeSubstreams: false,
      timelineScope: 'all',
      includeStructuralEvents: true,
    });
  });

  it('should preserve hierarchy config fields when saving and loading views', () => {
    const storage: ViewStorage = {
      ...getDefaultStorage(),
      activeViewId: 'hierarchy-view',
      views: [
        getDefaultStorage().views[0],
        {
          id: 'hierarchy-view',
          name: 'Hierarchy View',
          isDefault: false,
          createdAt: new Date('2026-02-16T10:00:00Z'),
          updatedAt: new Date('2026-02-16T11:00:00Z'),
          config: {
            filters: {
              categoryIds: ['cat-1'],
              tags: ['backend'],
              temporal: { notUpdatedToday: true },
              hierarchy: {
                mode: 'sub-streams',
                parentId: 'parent-1',
                includeSubstreams: true,
                timelineScope: 'under-parent',
                includeStructuralEvents: false,
              },
            },
            sort: { field: 'lastSubstreamActivityAt', direction: 'desc' },
            group: { by: 'parent' },
          },
        },
      ],
    };

    saveViewsToStorage(storage);
    const loaded = loadViewsFromStorage();
    const loadedView = loaded.views.find(view => view.id === 'hierarchy-view');

    expect(loadedView?.config.filters.hierarchy).toEqual({
      mode: 'sub-streams',
      parentId: 'parent-1',
      includeSubstreams: true,
      timelineScope: 'under-parent',
      includeStructuralEvents: false,
    });
    expect(loadedView?.config.sort).toEqual({ field: 'lastSubstreamActivityAt', direction: 'desc' });
    expect(loadedView?.config.group).toEqual({ by: 'parent' });
  });

  it('should normalize missing hierarchy fields without dropping existing hierarchy filters', () => {
    const base = getDefaultStorage();
    const serialized = {
      ...base,
      views: [
        {
          ...base.views[0],
          createdAt: base.views[0].createdAt.toISOString(),
          updatedAt: base.views[0].updatedAt.toISOString(),
          config: {
            ...base.views[0].config,
            filters: {
              ...base.views[0].config.filters,
              hierarchy: {
                mode: 'sub-streams',
                parentId: 'parent-1',
                includeSubstreams: true,
              },
            },
          },
        },
      ],
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));

    const loaded = loadViewsFromStorage();

    expect(loaded.views[0].config.filters.hierarchy).toEqual({
      mode: 'sub-streams',
      parentId: 'parent-1',
      includeSubstreams: true,
      timelineScope: 'all',
      includeStructuralEvents: true,
    });
  });
});
