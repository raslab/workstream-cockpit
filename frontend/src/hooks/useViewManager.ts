import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ViewConfig, ViewStorage } from '../types/view';
import {
  loadViewsFromStorage,
  saveViewsToStorage,
  generateViewId,
} from '../utils/viewStorage';

// Deep equality check for view configs
function isEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useViewManager() {
  const [storage, setStorage] = useState<ViewStorage>(() => loadViewsFromStorage());
  const [currentConfig, setCurrentConfig] = useState<ViewConfig['config']>(() => {
    const activeView = storage.views.find(v => v.id === storage.activeViewId);
    return activeView?.config || storage.views[0].config;
  });

  // Persist to localStorage whenever storage changes
  useEffect(() => {
    saveViewsToStorage(storage);
  }, [storage]);

  // Get active view
  const activeView = useMemo(
    () => storage.views.find(v => v.id === storage.activeViewId),
    [storage.views, storage.activeViewId]
  );

  // Check if current config differs from saved view config
  const hasUnsavedChanges = useMemo(() => {
    if (!activeView) return false;
    return !isEqual(activeView.config, currentConfig);
  }, [activeView, currentConfig]);

  /**
   * Create a new view with the given name and current config
   */
  const createView = useCallback((name: string) => {
    const newView: ViewConfig = {
      id: generateViewId(),
      name,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      config: { ...currentConfig },
    };

    setStorage(prev => ({
      ...prev,
      views: [...prev.views, newView],
      activeViewId: newView.id,
    }));

    return newView.id;
  }, [currentConfig]);

  /**
   * Update an existing view
   */
  const updateView = useCallback((id: string, updates: Partial<ViewConfig>) => {
    setStorage(prev => ({
      ...prev,
      views: prev.views.map(v =>
        v.id === id
          ? { ...v, ...updates, updatedAt: new Date() }
          : v
      ),
    }));
  }, []);

  /**
   * Delete a view (cannot delete default view)
   */
  const deleteView = useCallback((id: string) => {
    // Prevent deleting default view
    const viewToDelete = storage.views.find(v => v.id === id);
    if (viewToDelete?.isDefault) {
      console.warn('Cannot delete default view');
      return false;
    }

    setStorage(prev => {
      const newViews = prev.views.filter(v => v.id !== id);
      const newActiveId = prev.activeViewId === id
        ? prev.defaultViewId
        : prev.activeViewId;

      return {
        ...prev,
        views: newViews,
        activeViewId: newActiveId,
      };
    });

    // Update current config if we switched views
    if (storage.activeViewId === id) {
      const defaultView = storage.views.find(v => v.id === storage.defaultViewId);
      if (defaultView) {
        setCurrentConfig(defaultView.config);
      }
    }

    return true;
  }, [storage.views, storage.activeViewId, storage.defaultViewId]);

  /**
   * Switch to a different view
   */
  const switchView = useCallback((id: string) => {
    const view = storage.views.find(v => v.id === id);
    if (!view) {
      console.warn(`View ${id} not found`);
      return false;
    }

    setStorage(prev => ({ ...prev, activeViewId: id }));
    setCurrentConfig(view.config);
    return true;
  }, [storage.views]);

  /**
   * Save current config to active view
   */
  const saveCurrentView = useCallback(() => {
    if (!activeView) return;

    updateView(activeView.id, { config: currentConfig });
  }, [activeView, currentConfig, updateView]);

  /**
   * Discard changes and revert to saved view config
   */
  const discardChanges = useCallback(() => {
    if (!activeView) return;
    setCurrentConfig(activeView.config);
  }, [activeView]);

  /**
   * Rename a view
   */
  const renameView = useCallback((id: string, newName: string) => {
    // Validate name
    if (!newName || newName.length < 3 || newName.length > 50) {
      console.warn('View name must be 3-50 characters');
      return false;
    }

    // Check for duplicate names
    const duplicate = storage.views.find(
      v => v.id !== id && v.name.toLowerCase() === newName.toLowerCase()
    );
    if (duplicate) {
      console.warn('A view with this name already exists');
      return false;
    }

    updateView(id, { name: newName });
    return true;
  }, [storage.views, updateView]);

  return {
    // State
    views: storage.views,
    activeView,
    activeViewId: storage.activeViewId,
    currentConfig,
    hasUnsavedChanges,

    // Actions
    setCurrentConfig,
    createView,
    updateView,
    deleteView,
    switchView,
    saveCurrentView,
    discardChanges,
    renameView,
  };
}
