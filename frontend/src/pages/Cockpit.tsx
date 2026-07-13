import { useState, useMemo, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useWorkstreams } from '../hooks/useWorkstreams';
import { useWorkstreamReferences } from '../hooks/useWorkstreamReferences';
import { useCategories } from '../hooks/useCategories';
import { useViewManager } from '../hooks/useViewManager';
import { WorkstreamCard } from '../components/Workstream/WorkstreamCard';
import { WorkstreamSkeleton } from '../components/Workstream/WorkstreamSkeleton';
import { WorkstreamCreateDialog } from '../components/Workstream/WorkstreamCreateDialog';
import { ViewTabs } from '../components/ViewManagement/ViewTabs';
import { ViewControls } from '../components/ViewManagement/ViewControls';
import { ViewCreateDialog } from '../components/ViewManagement/ViewCreateDialog';
import { Workstream } from '../types/workstream';
import { getHierarchyTimestamp, groupWorkstreamsByParent } from '../utils/hierarchy';
import {
  applyCockpitSearchToConfig,
  resolveEntityParam,
  serializeCockpitConfigSearch,
  viewUrlValue,
} from '../utils/urlState';
import { WorkstreamLink } from '../components/Workstream/WorkstreamReference';
import {
  useDirtyResourceEditor,
  useResourceChangeScreen,
} from '../components/Notifications/ResourceChangeNotificationProvider';
import { useDocumentTitle } from '../components/DocumentTitle';

function softCategoryColor(color?: string | null) {
  if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) return '#c5dae4';

  const red = parseInt(color.slice(1, 3), 16);
  const green = parseInt(color.slice(3, 5), 16);
  const blue = parseInt(color.slice(5, 7), 16);
  const mix = (channel: number) => Math.round(channel * 0.28 + 255 * 0.72);

  return `rgb(${mix(red)}, ${mix(green)}, ${mix(blue)})`;
}

export default function Cockpit() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  // View management
  const {
    views,
    activeView,
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
  } = useViewManager({ preferredViewValue: searchParams.get('view') });
  useDirtyResourceEditor('cockpit-view-config', hasUnsavedChanges);
  useDocumentTitle(activeView ? `${activeView.name}${hasUnsavedChanges ? '*' : ''}` : 'Cockpit');

  const urlViewParam = searchParams.get('view');
  const resolvedUrlViewId = resolveEntityParam(urlViewParam, views);
  const hasInvalidViewParam = searchParams.has('view') && !resolvedUrlViewId;
  const viewSelectionReady =
    views.length > 0 &&
    (!searchParams.has('view') || hasInvalidViewParam || resolvedUrlViewId === activeViewId);
  const needsWorkstreamReferences = searchParams.has('parentId') || searchParams.has('parentIds');

  // Fetch workstreams with current filter config
  const {
    data: workstreams,
    isLoading,
    error,
  } = useWorkstreams({
    state: 'active',
    tags: currentConfig.filters.tags.length > 0 ? currentConfig.filters.tags : undefined,
    categoryIds:
      currentConfig.filters.categoryIds.length > 0 ? currentConfig.filters.categoryIds : undefined,
    notUpdatedToday: currentConfig.filters.temporal.notUpdatedToday,
    hierarchy: currentConfig.filters.hierarchy.mode,
    parentId: currentConfig.filters.hierarchy.parentId,
    parentIds: currentConfig.filters.hierarchy.parentIds,
    includeSubstreams: currentConfig.filters.hierarchy.includeSubstreams,
    enabled: viewSelectionReady,
  });
  const visibleWorkstreamsEmpty =
    viewSelectionReady &&
    !isLoading &&
    !error &&
    workstreams !== undefined &&
    workstreams.length === 0;
  // Keep an unfiltered active reference list so URL state can resolve and serialize public stream
  // numbers even when the visible list is scoped under parent streams and excludes those parents.
  const { data: referenceWorkstreams } = useWorkstreamReferences({
    state: 'active',
    enabled: needsWorkstreamReferences,
  });

  // A strict active view can be empty even when Cockpit has closed streams. Check all lightweight
  // references before deciding whether this is an empty database or only an empty current view.
  const { data: allWorkstreamReferences, isLoading: allWorkstreamReferencesLoading } =
    useWorkstreamReferences({
      state: 'all',
      enabled: visibleWorkstreamsEmpty,
    });
  const hasAnyKnownWorkstreams =
    (workstreams?.length ?? 0) > 0 || (allWorkstreamReferences?.length ?? 0) > 0;
  const emptyStateReferenceCheckComplete =
    !visibleWorkstreamsEmpty || allWorkstreamReferences !== undefined;
  const showEmptyState =
    visibleWorkstreamsEmpty && emptyStateReferenceCheckComplete && !allWorkstreamReferencesLoading;
  const emptyStateMessage = hasAnyKnownWorkstreams
    ? 'No workstreams match this view.'
    : 'No workstreams yet. Create your first one!';
  useResourceChangeScreen({
    screen: 'cockpit',
    workstreamNumbers: workstreams?.flatMap((workstream) =>
      workstream.number === undefined ? [] : [workstream.number],
    ),
  });

  // Apply URL view selection and filter overrides, then canonicalize the URL to the actual screen state.
  useEffect(() => {
    if (views.length === 0) return;
    if (searchParams.has('categories') && categoriesLoading) return;
    const resolvedViewId = resolvedUrlViewId;
    const view =
      (resolvedViewId && views.find((candidate) => candidate.id === resolvedViewId)) ||
      views.find((candidate) => candidate.id === activeViewId) ||
      views.find((candidate) => candidate.isDefault) ||
      views[0];
    if (!view) return;

    const urlWorkstreams = referenceWorkstreams ?? workstreams;
    const nextConfig = applyCockpitSearchToConfig(view.config, searchParams, {
      categories,
      workstreams: urlWorkstreams,
    });
    const validUrlView = Boolean(resolvedViewId);
    const canonicalParams = serializeCockpitConfigSearch(
      validUrlView ? view.id : null,
      nextConfig,
      view.config,
      {
        viewValue: validUrlView ? viewUrlValue(view) : null,
        categories,
        workstreams: urlWorkstreams,
      },
    );

    if (canonicalParams.toString() !== searchParams.toString()) {
      setSearchParams(canonicalParams, { replace: true });
    }
    if (view.id !== activeViewId) switchView(view.id);
    setCurrentConfig(nextConfig);
  }, [
    views,
    activeViewId,
    searchParams,
    setSearchParams,
    switchView,
    setCurrentConfig,
    categories,
    categoriesLoading,
    workstreams,
    referenceWorkstreams,
    resolvedUrlViewId,
  ]);

  const categoryGroupOrder = useMemo(() => {
    return new Map(categories.map((category, index) => [category.id, index]));
  }, [categories]);
  const detailNavigationState = {
    from: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      label: 'Cockpit',
    },
  };

  const handleViewChange = (id: string) => {
    if (switchView(id)) {
      const nextView = views.find((view) => view.id === id);
      const params = new URLSearchParams();
      const value = viewUrlValue(nextView);
      if (value) params.set('view', value);
      setSearchParams(params, { replace: false });
    }
  };

  const handleCreateView = async (name: string) => {
    const id = await createView(name);
    if (id) {
      const nextView = views.find((view) => view.id === id);
      const params = new URLSearchParams();
      const value = viewUrlValue(nextView);
      if (value) params.set('view', value);
      setSearchParams(params, { replace: false });
    }
  };

  const handleConfigChange = (nextConfig: typeof currentConfig) => {
    setCurrentConfig(nextConfig);
    setSearchParams(
      serializeCockpitConfigSearch(activeViewId, nextConfig, activeView?.config, {
        viewValue: viewUrlValue(activeView),
        categories,
        workstreams: referenceWorkstreams ?? workstreams,
      }),
      { replace: true },
    );
  };

  const handleSaveCurrentView = async () => {
    await saveCurrentView();
    if (activeViewId) {
      const params = new URLSearchParams();
      const value = viewUrlValue(activeView);
      if (value) params.set('view', value);
      setSearchParams(params, { replace: true });
    }
  };

  const handleDiscardChanges = () => {
    discardChanges();
    if (activeViewId) {
      const params = new URLSearchParams();
      const value = viewUrlValue(activeView);
      if (value) params.set('view', value);
      setSearchParams(params, { replace: true });
    }
  };

  // Helper function to get sort comparator
  const getSortComparator = (
    sortField: typeof currentConfig.sort.field,
    sortDir: typeof currentConfig.sort.direction,
  ) => {
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
          comparison =
            getHierarchyTimestamp(a, 'lastActivityAt') - getHierarchyTimestamp(b, 'lastActivityAt');
          break;
        }
      }
      return sortDir === 'asc' ? comparison : -comparison;
    };
  };

  // Group workstreams by category and sort within each group
  const groupedWorkstreams = useMemo(() => {
    if (!workstreams) return [];
    if (currentConfig.group.by === 'none') {
      // Sort all workstreams returned by the API. The API owns category/tag/hierarchy filtering;
      // reapplying hierarchy client-side can drop nested sub-streams when intermediate rows are filtered out.
      const sorted = [...workstreams].sort(
        getSortComparator(currentConfig.sort.field, currentConfig.sort.direction),
      );
      return [
        {
          key: 'all',
          name: null,
          color: null,
          emoji: null,
          sortOrder: 0,
          parent: null,
          workstreams: sorted,
        },
      ];
    }

    if (currentConfig.group.by === 'parent') {
      const scopedParentIds =
        currentConfig.filters.hierarchy.mode === 'under-parent'
          ? (currentConfig.filters.hierarchy.parentIds ??
            (currentConfig.filters.hierarchy.parentId
              ? [currentConfig.filters.hierarchy.parentId]
              : []))
          : [];
      return groupWorkstreamsByParent(workstreams, { scopedParentIds }).map((group, index) => ({
        ...group,
        color: null,
        emoji: null,
        sortOrder: index,
        workstreams: group.workstreams.sort(
          getSortComparator(currentConfig.sort.field, currentConfig.sort.direction),
        ),
      }));
    }

    // Group by category
    const groups = new Map<string, Workstream[]>();
    workstreams.forEach((ws) => {
      const key = ws.category?.id || 'untagged';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(ws);
    });

    // Sort workstreams within each group and add category order from the Settings category list.
    const result = Array.from(groups.entries()).map(([key, wsList]) => ({
      key,
      name: key === 'untagged' ? null : wsList[0].category?.name || null,
      color: key === 'untagged' ? null : wsList[0].category?.color || null,
      emoji: key === 'untagged' ? null : wsList[0].category?.emoji || null,
      sortOrder:
        key === 'untagged'
          ? Number.MAX_SAFE_INTEGER
          : (categoryGroupOrder.get(key) ?? wsList[0].category?.sortOrder ?? 999999),
      parent: null,
      workstreams: wsList.sort(
        getSortComparator(currentConfig.sort.field, currentConfig.sort.direction),
      ),
    }));

    // Sort groups by the same category order used in Settings, with stable fallbacks for stale rows.
    return result.sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
  }, [
    workstreams,
    categoryGroupOrder,
    currentConfig.sort.field,
    currentConfig.sort.direction,
    currentConfig.group.by,
    currentConfig.filters.hierarchy,
  ]);

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
          onViewChange={handleViewChange}
          onViewCreate={handleCreateView}
          onViewDelete={deleteView}
          onViewRename={renameView}
          onNewWorkstream={() => setShowCreateDialog(true)}
        />

        {/* View Controls */}
        <ViewControls
          config={currentConfig}
          onConfigChange={handleConfigChange}
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={handleSaveCurrentView}
          onSaveAs={handleSaveAs}
          onDiscard={handleDiscardChanges}
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

          {showEmptyState && (
            <div className="flex min-h-[18rem] items-center justify-center rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">{emptyStateMessage}</p>
            </div>
          )}

          {!isLoading && workstreams && workstreams.length > 0 && (
            <div className="space-y-5">
              {groupedWorkstreams.map((group) => (
                <div key={group.key}>
                  {(currentConfig.group.by === 'category' ||
                    currentConfig.group.by === 'parent') && (
                    <div className="mb-2 flex min-h-8 items-center gap-2">
                      <div
                        className="grid h-6 w-6 flex-none place-items-center rounded-md text-sm shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]"
                        style={{ backgroundColor: softCategoryColor(group.color) }}
                      >
                        {group.emoji || (currentConfig.group.by === 'category' ? '🏷️' : '↳')}
                      </div>
                      <h2 className="text-xl font-bold leading-none text-gray-900 dark:text-gray-100">
                        {currentConfig.group.by === 'parent' && group.parent ? (
                          <WorkstreamLink
                            workstream={group.parent}
                            state={detailNavigationState}
                            className="hover:text-primary-600 dark:hover:text-primary-400"
                          />
                        ) : (
                          group.name ||
                          (currentConfig.group.by === 'category'
                            ? 'Untagged'
                            : 'Top level / no parent')
                        )}
                      </h2>
                      <span className="text-base font-medium text-gray-500 dark:text-gray-400">
                        ({group.workstreams.length})
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 items-stretch gap-x-5 gap-y-3.5 lg:grid-cols-2">
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
          onSave={async (name) => {
            await handleCreateView(name);
            setShowSaveAsDialog(false);
          }}
          onCancel={() => setShowSaveAsDialog(false)}
        />
      )}
    </>
  );
}
