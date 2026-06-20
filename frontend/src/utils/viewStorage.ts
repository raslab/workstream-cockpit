import type { ViewConfig, ViewStorage, SerializedViewStorage } from '../types/view';

const STORAGE_KEY = 'workstream_cockpit_views';
const STORAGE_VERSION = 1;
const MAX_VIEWS = 50;

const DEFAULT_HIERARCHY_FILTER = {
  mode: 'all' as const,
  parentId: null,
  includeSubstreams: false,
  timelineScope: 'all' as const,
  includeStructuralEvents: true,
};

/**
 * Get the default view storage structure
 */
export function getDefaultStorage(): ViewStorage {
  const defaultView: ViewConfig = {
    id: 'default',
    name: 'Default View',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    config: {
      filters: {
        categoryIds: [],
        tags: [],
        temporal: { notUpdatedToday: false },
        hierarchy: { ...DEFAULT_HIERARCHY_FILTER },
      },
      sort: { field: 'lastActivityAt', direction: 'desc' },
      group: { by: 'category' },
    },
  };

  return {
    version: STORAGE_VERSION,
    defaultViewId: 'default',
    activeViewId: 'default',
    views: [defaultView],
    lastModified: new Date().toISOString(),
  };
}

/**
 * Serialize view storage for localStorage (convert Dates to strings)
 */
function serializeStorage(storage: ViewStorage): SerializedViewStorage {
  return {
    ...storage,
    views: storage.views.map(view => ({
      ...view,
      createdAt: view.createdAt.toISOString(),
      updatedAt: view.updatedAt.toISOString(),
    })),
  };
}

/**
 * Deserialize view storage from localStorage (convert strings to Dates)
 */
function deserializeStorage(serialized: SerializedViewStorage): ViewStorage {
  return {
    ...serialized,
    views: serialized.views.map(view => ({
      ...view,
      config: {
        ...view.config,
        filters: {
          ...view.config.filters,
          hierarchy: {
            ...DEFAULT_HIERARCHY_FILTER,
            ...view.config.filters.hierarchy,
          },
        },
        sort: view.config.sort || { field: 'lastActivityAt', direction: 'desc' },
        group: view.config.group || { by: 'category' },
      },
      createdAt: new Date(view.createdAt),
      updatedAt: new Date(view.updatedAt),
    })),
  };
}

/**
 * Migrate view storage to current version
 */
function migrateViewStorage(stored: any): ViewStorage {
  if (!stored || stored.version !== STORAGE_VERSION) {
    console.info('Creating default view storage (no valid storage found)');
    return getDefaultStorage();
  }

  try {
    return deserializeStorage(stored);
  } catch (error) {
    console.error('Failed to deserialize view storage:', error);
    return getDefaultStorage();
  }
}

/**
 * Load views from localStorage
 */
export function loadViewsFromStorage(): ViewStorage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.info('No stored views found, using defaults');
      return getDefaultStorage();
    }

    const parsed = JSON.parse(stored);
    return migrateViewStorage(parsed);
  } catch (error) {
    console.error('Failed to load views from storage:', error);
    return getDefaultStorage();
  }
}

/**
 * Save views to localStorage
 */
export function saveViewsToStorage(storage: ViewStorage): void {
  try {
    // Enforce max views limit
    let viewsToSave = storage.views;
    if (viewsToSave.length > MAX_VIEWS) {
      console.warn(`View limit exceeded (${viewsToSave.length}/${MAX_VIEWS}), keeping only ${MAX_VIEWS} views`);
      
      // Keep default view and most recently updated custom views
      const defaultViews = viewsToSave.filter(v => v.isDefault);
      const customViews = viewsToSave
        .filter(v => !v.isDefault)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, MAX_VIEWS - defaultViews.length);
      
      viewsToSave = [...defaultViews, ...customViews];
    }

    const storageToSave: ViewStorage = {
      ...storage,
      views: viewsToSave,
      lastModified: new Date().toISOString(),
    };

    const serialized = serializeStorage(storageToSave);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error('Failed to save views to storage:', error);

    // Handle quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, removing oldest views');
      
      // Keep only default view and 10 most recent custom views
      const defaultViews = storage.views.filter(v => v.isDefault);
      const customViews = storage.views
        .filter(v => !v.isDefault)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 10);

      const reducedStorage: ViewStorage = {
        ...storage,
        views: [...defaultViews, ...customViews],
        lastModified: new Date().toISOString(),
      };

      try {
        const serialized = serializeStorage(reducedStorage);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
        console.info('Successfully saved reduced view set');
      } catch (retryError) {
        console.error('Failed to save even reduced view set:', retryError);
      }
    }
  }
}

/**
 * Generate a unique view ID
 */
export function generateViewId(): string {
  return `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clear all stored views (for debugging/testing)
 */
export function clearViewStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.info('View storage cleared');
  } catch (error) {
    console.error('Failed to clear view storage:', error);
  }
}
