import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useWorkstreams } from '../hooks/useWorkstreams';
import { useViewManager } from '../hooks/useViewManager';
import { WorkstreamCard } from '../components/Workstream/WorkstreamCard';
import { WorkstreamSkeleton } from '../components/Workstream/WorkstreamSkeleton';
import { WorkstreamCreateDialog } from '../components/Workstream/WorkstreamCreateDialog';
import { ViewTabs } from '../components/ViewManagement/ViewTabs';
import { ViewControls } from '../components/ViewManagement/ViewControls';
import { ViewCreateDialog } from '../components/ViewManagement/ViewCreateDialog';
import { Workstream } from '../types/workstream';
import { applyHierarchyFilter, getHierarchyTimestamp, groupWorkstreamsByParent } from '../utils/hierarchy';

export default function Cockpit() {
  const location = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);

  // View management
  const {
    views,
    activeViewId,
    currentConfig,
    hasUnsavedChanges,
    setCurrentConfig,
    createView,
    deleteView,
    switchView,
    saveCurrentView,
    discardChanges,
    renameView,
  } = useViewManager();

  // Check if we have filterTags from navigation state (from clicking a tag chip)
  useEffect(() => {
    const state = location.state as { filterTags?: string[] } | null;
    if (state?.filterTags) {
      setCurrentConfig({
        ...currentConfig,
        filters: {
          ...currentConfig.filters,
          tags: state.filterTags,
        },
      });
      // Clear the state so it doesn't persist on page reload
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Fetch workstreams with current filter config
  const { data: workstreams, isLoading, error } = useWorkstreams({
    state: 'active',
    tags: currentConfig.filters.tags.length > 0 ? currentConfig.filters.tags : undefined,
    categoryIds: currentConfig.filters.categoryIds.length > 0 ? currentConfig.filters.categoryIds : undefined,
    notUpdatedToday: currentConfig.filters.temporal.notUpdatedToday,
    hierarchy: currentConfig.filters.hierarchy.mode,
    parentId: currentConfig.filters.hierarchy.parentId,
    includeSubstreams: currentConfig.filters.hierarchy.includeSubstreams,
  });

  // Helper function to get sort comparator
  const getSortComparator = (sortField: typeof currentConfig.sort.field, sortDir: typeof currentConfig.sort.direction) => {
    return (a: Workstream, b: Workstream) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'lastDirectUpdateAt':
        case 'lastActivityAt':
        case 'lastSubstreamActivityAt':
          comparison = getHierarchyTimestamp(a, sortField) - getHierarchyTimestamp(b, sortField);
          break;
        default: {
          comparison = getHierarchyTimestamp(a, 'lastActivityAt') - getHierarchyTimestamp(b, 'lastActivityAt');
          break;
        }
      }
      return sortDir === 'asc' ? comparison : -comparison;
    };
  };

  // Group workstreams by category and sort within each group
  const groupedWorkstreams = useMemo(() => {
    if (!workstreams) return [];
    const filteredWorkstreams = applyHierarchyFilter(workstreams, currentConfig.filters.hierarchy.mode);

    if (currentConfig.group.by === 'none') {
      // Sort all workstreams
      const sorted = [...filteredWorkstreams].sort(
        getSortComparator(currentConfig.sort.field, currentConfig.sort.direction)
      );
      return [{ key: 'all', name: null, color: null, emoji: null, sortOrder: 0, workstreams: sorted }];
    }

    if (currentConfig.group.by === 'parent') {
      return groupWorkstreamsByParent(filteredWorkstreams).map((group, index) => ({
        ...group,
        color: null,
        emoji: null,
        sortOrder: index,
        workstreams: group.workstreams.sort(getSortComparator(currentConfig.sort.field, currentConfig.sort.direction)),
      }));
    }

    // Group by category
    const groups = new Map<string, Workstream[]>();
    filteredWorkstreams.forEach((ws) => {
      const key = ws.category?.id || 'untagged';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(ws);
    });

    // Sort workstreams within each group and add sortOrder
    const result = Array.from(groups.entries()).map(([key, wsList]) => ({
      key,
      name: key === 'untagged' ? null : wsList[0].category?.name || null,
      color: key === 'untagged' ? null : wsList[0].category?.color || null,
      emoji: key === 'untagged' ? null : wsList[0].category?.emoji || null,
      sortOrder: key === 'untagged' ? 999999 : (wsList[0].category?.sortOrder ?? 999999),
      workstreams: wsList.sort(getSortComparator(currentConfig.sort.field, currentConfig.sort.direction)),
    }));

    // Sort groups by category sortOrder
    return result.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [workstreams, currentConfig.sort.field, currentConfig.sort.direction, currentConfig.group.by, currentConfig.filters.hierarchy.mode]);

  const handleSaveAs = () => {
    setShowSaveAsDialog(true);
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-2">
        {/* View Tabs with New Workstream button */}
        <ViewTabs
          views={views}
          activeViewId={activeViewId}
          onViewChange={switchView}
          onViewCreate={createView}
          onViewDelete={deleteView}
          onViewRename={renameView}
          onNewWorkstream={() => setShowCreateDialog(true)}
        />

        {/* View Controls */}
        <ViewControls
          config={currentConfig}
          onConfigChange={setCurrentConfig}
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={saveCurrentView}
          onSaveAs={handleSaveAs}
          onDiscard={discardChanges}
        />

        {/* Content */}
        <div className="py-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
              <p className="text-sm text-red-800 dark:text-red-200">
                Failed to load workstreams. Please try again.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              <WorkstreamSkeleton />
              <WorkstreamSkeleton />
              <WorkstreamSkeleton />
              <WorkstreamSkeleton />
            </div>
          )}

          {!isLoading && workstreams && workstreams.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">No workstreams yet. Create your first one!</p>
            </div>
          )}

          {!isLoading && workstreams && workstreams.length > 0 && (
            <div className="space-y-4">
              {groupedWorkstreams.map((group) => (
                <div key={group.key}>
                  {(currentConfig.group.by === 'category' || currentConfig.group.by === 'parent') && (
                    <div className="mb-2 flex items-center gap-2">
                      {group.color && (
                        <div
                          className="flex h-5 w-5 items-center justify-center rounded text-sm"
                          style={{ backgroundColor: group.color }}
                        >
                          {group.emoji}
                        </div>
                      )}
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {group.name || (currentConfig.group.by === 'category' ? 'Untagged' : 'Top level / no parent')}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({group.workstreams.length})
                      </span>
                    </div>
                  )}

                  {/* Two-column grid layout */}
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                    {group.workstreams.map((workstream) => (
                      <WorkstreamCard key={workstream.id} workstream={workstream} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <WorkstreamCreateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      {showSaveAsDialog && (
        <ViewCreateDialog
          onSave={(name) => {
            createView(name);
            setShowSaveAsDialog(false);
          }}
          onCancel={() => setShowSaveAsDialog(false)}
        />
      )}
    </>
  );
}
