import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ViewConfig } from '../types/view';
import * as viewsApi from '../api/views';

// Deep equality check for view configs
function isEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useViewManager() {
  const queryClient = useQueryClient();

  // Local state for active view and current config
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<ViewConfig['config'] | null>(null);

  // Fetch all views
  const {
    data: views = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['views'],
    queryFn: () => viewsApi.getViews(),
  });

  // Get active view
  const activeView = useMemo(
    () => views.find(v => v.id === activeViewId) || views.find(v => v.isDefault) || views[0],
    [views, activeViewId]
  );

  // Initialize active view and current config when views are loaded
  useEffect(() => {
    if (views.length > 0 && !activeViewId) {
      const defaultView = views.find(v => v.isDefault) || views[0];
      setActiveViewId(defaultView.id);
      setCurrentConfig(defaultView.config);
    }
  }, [views, activeViewId]);

  // Check if current config differs from saved view config
  const hasUnsavedChanges = useMemo(() => {
    if (!activeView || !currentConfig) return false;
    return !isEqual(activeView.config, currentConfig);
  }, [activeView, currentConfig]);

  // Create view mutation
  const createViewMutation = useMutation({
    mutationFn: (input: viewsApi.CreateViewDTO) => viewsApi.createView(input),
    onSuccess: (newView) => {
      queryClient.invalidateQueries({ queryKey: ['views'] });
      setActiveViewId(newView.id);
      setCurrentConfig(newView.config);
    },
  });

  // Update view mutation
  const updateViewMutation = useMutation({
    mutationFn: ({ viewId, input }: { viewId: string; input: viewsApi.UpdateViewDTO }) =>
      viewsApi.updateView(viewId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['views'] });
    },
  });

  // Delete view mutation
  const deleteViewMutation = useMutation({
    mutationFn: (viewId: string) => viewsApi.deleteView(viewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['views'] });
    },
  });

  /**
   * Create a new view with the given name and current config
   */
  const createView = useCallback(
    async (name: string) => {
      if (!currentConfig) return;

      const result = await createViewMutation.mutateAsync({
        name,
        isDefault: false,
        config: currentConfig,
      });

      return result.id;
    },
    [currentConfig, createViewMutation]
  );

  /**
   * Update an existing view
   */
  const updateView = useCallback(
    async (id: string, updates: Partial<Pick<ViewConfig, 'name' | 'isDefault' | 'config'>>) => {
      await updateViewMutation.mutateAsync({
        viewId: id,
        input: updates,
      });
    },
    [updateViewMutation]
  );

  /**
   * Delete a view (cannot delete default view)
   */
  const deleteView = useCallback(
    async (id: string) => {
      const viewToDelete = views.find(v => v.id === id);
      if (viewToDelete?.isDefault) {
        console.warn('Cannot delete default view');
        return false;
      }

      try {
        await deleteViewMutation.mutateAsync(id);

        // If we deleted the active view, switch to default
        if (activeViewId === id) {
          const defaultView = views.find(v => v.isDefault);
          if (defaultView) {
            setActiveViewId(defaultView.id);
            setCurrentConfig(defaultView.config);
          }
        }

        return true;
      } catch (error) {
        console.error('Failed to delete view:', error);
        return false;
      }
    },
    [views, activeViewId, deleteViewMutation]
  );

  /**
   * Switch to a different view
   */
  const switchView = useCallback(
    (id: string) => {
      const view = views.find(v => v.id === id);
      if (!view) {
        console.warn(`View ${id} not found`);
        return false;
      }

      setActiveViewId(id);
      setCurrentConfig(view.config);
      return true;
    },
    [views]
  );

  /**
   * Save current config to active view
   */
  const saveCurrentView = useCallback(async () => {
    if (!activeView || !currentConfig) return;

    await updateView(activeView.id, { config: currentConfig });
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
  const renameView = useCallback(
    async (id: string, newName: string) => {
      // Validate name
      if (!newName || newName.length < 3 || newName.length > 50) {
        console.warn('View name must be 3-50 characters');
        return false;
      }

      // Check for duplicate names
      const duplicate = views.find(v => v.id !== id && v.name.toLowerCase() === newName.toLowerCase());
      if (duplicate) {
        console.warn('A view with this name already exists');
        return false;
      }

      try {
        await updateView(id, { name: newName });
        return true;
      } catch (error) {
        console.error('Failed to rename view:', error);
        return false;
      }
    },
    [views, updateView]
  );

  return {
    // State
    views,
    activeView,
    activeViewId: activeViewId || '',
    currentConfig: currentConfig || {
      filters: { categoryIds: [], tags: [], temporal: { notUpdatedToday: false } },
      sort: { field: 'updatedAt' as const, direction: 'desc' as const },
      group: { by: 'category' as const },
    },
    hasUnsavedChanges,
    isLoading,
    error,

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
