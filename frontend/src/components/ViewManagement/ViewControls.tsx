import { useState } from 'react';
import type { ViewConfig } from '../../types/view';
import { FilterPanel, SortMenu, GroupMenu } from './FilterPanel';

interface ViewControlsProps {
  config: ViewConfig['config'];
  onConfigChange: (config: ViewConfig['config']) => void;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onSaveAs: () => void;
  onDiscard: () => void;
}

export function ViewControls({
  config,
  onConfigChange,
  hasUnsavedChanges,
  onSave,
  onSaveAs,
  onDiscard,
}: ViewControlsProps) {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  const activeFilterCount =
    config.filters.categoryIds.length +
    config.filters.tags.length +
    (config.filters.temporal.notUpdatedToday ? 1 : 0) +
    (config.filters.hierarchy.mode !== 'all' ? 1 : 0) +
    (config.filters.hierarchy.includeSubstreams ? 1 : 0);

  const getSortLabel = (): string => {
    const fieldLabels = {
      name: 'Name',
      createdAt: 'Created',
      lastDirectUpdateAt: 'Last direct update',
      lastActivityAt: 'Last activity',
      lastSubstreamActivityAt: 'Last sub-stream activity',
    };
    const field = fieldLabels[config.sort.field];
    const direction = config.sort.direction === 'asc' ? '↑' : '↓';
    return `${field} ${direction}`;
  };

  const getGroupLabel = (): string => {
    if (config.group.by === 'category') return 'Category';
    if (config.group.by === 'parent') return 'Parent';
    return 'None';
  };

  return (
    <div className="flex items-center justify-end gap-3 bg-white px-4 py-2 dark:bg-gray-800">
      {/* Group Control */}
      <div className="relative">
        <button
          onClick={() => setShowGroupMenu(!showGroupMenu)}
          className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <span>Group: {getGroupLabel()}</span>
          <span className="text-xs">▼</span>
        </button>

        {showGroupMenu && (
          <GroupMenu
            currentGroup={config.group}
            onGroupChange={(group) => {
              onConfigChange({ ...config, group });
              setShowGroupMenu(false);
            }}
            onClose={() => setShowGroupMenu(false)}
          />
        )}
      </div>

      {/* Sort Control */}
      <div className="relative">
        <button
          onClick={() => setShowSortMenu(!showSortMenu)}
          className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <span>Sort: {getSortLabel()}</span>
          <span className="text-xs">▼</span>
        </button>

        {showSortMenu && (
          <SortMenu
            currentSort={config.sort}
            onSortChange={(sort) => {
              onConfigChange({ ...config, sort });
              setShowSortMenu(false);
            }}
            onClose={() => setShowSortMenu(false)}
          />
        )}
      </div>

      {/* Filter Control */}
      <div className="relative">
        <button
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs text-white">
              {activeFilterCount}
            </span>
          )}
          <span className="text-xs">▼</span>
        </button>

        {showFilterPanel && (
          <FilterPanel
            filters={config.filters}
            onFiltersChange={(filters) => {
              onConfigChange({ ...config, filters });
            }}
            onClose={() => setShowFilterPanel(false)}
          />
        )}
      </div>

      {/* Save Controls (conditional) */}
      {hasUnsavedChanges && (
        <div className="flex items-center gap-2 border-l border-gray-300 pl-3 dark:border-gray-600">
          <button
            onClick={onSave}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
            title="Save changes to current view"
          >
            Save
          </button>
          <button
            onClick={onSaveAs}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Save as new view"
          >
            Save As
          </button>
          <button
            onClick={onDiscard}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Discard unsaved changes"
          >
            Discard
          </button>
        </div>
      )}
    </div>
  );
}
