# Implementation Plan: Advanced Filtering & View Management

**Feature ID**: 006-advanced-filtering-views
**Version**: 1.0
**Status**: Planning
**Created**: 2026-01-07

---

## Overview

This document outlines the detailed implementation plan for the Advanced Filtering & View Management feature, broken down into 6 phases over 10-12 days.

---

## Phase 1: View Management Foundation (Days 1-2)

### Objectives
- Establish view configuration data structures
- Implement localStorage persistence
- Create core view management hooks

### Tasks

#### 1.1: Type Definitions & Data Models
**Duration**: 2 hours

**Files to Create**:
- `frontend/src/types/view.ts`
- `frontend/src/types/filter.ts`

**Implementation**:
```typescript
// view.ts
export interface ViewConfig {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  config: {
    filters: FilterConfig;
    sort: SortConfig;
    group: GroupConfig;
  };
}

export interface FilterConfig {
  categoryIds: string[];
  tags: string[];
  temporal: {
    notUpdatedToday: boolean;
  };
}

export interface SortConfig {
  field: 'name' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

export interface GroupConfig {
  by: 'none' | 'category';
}

export interface ViewStorage {
  version: number;
  defaultViewId: string;
  activeViewId: string;
  views: ViewConfig[];
  lastModified: string;
}
```

#### 1.2: LocalStorage Utilities
**Duration**: 3 hours

**Files to Create**:
- `frontend/src/utils/viewStorage.ts`

**Implementation**:
```typescript
const STORAGE_KEY = 'workstream_cockpit_views';
const STORAGE_VERSION = 1;
const MAX_VIEWS = 50;

export function loadViewsFromStorage(): ViewStorage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultStorage();
    
    const parsed = JSON.parse(stored);
    return migrateViewStorage(parsed);
  } catch (error) {
    console.error('Failed to load views:', error);
    return getDefaultStorage();
  }
}

export function saveViewsToStorage(storage: ViewStorage): void {
  try {
    // Enforce max views limit
    if (storage.views.length > MAX_VIEWS) {
      storage.views = storage.views.slice(0, MAX_VIEWS);
    }
    
    storage.lastModified = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error('Failed to save views:', error);
    // Handle quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Remove oldest custom views
      const customViews = storage.views.filter(v => !v.isDefault);
      customViews.sort((a, b) => 
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      );
      storage.views = [
        ...storage.views.filter(v => v.isDefault),
        ...customViews.slice(10), // Keep only 10 oldest
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    }
  }
}

function getDefaultStorage(): ViewStorage {
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
      },
      sort: { field: 'updatedAt', direction: 'desc' },
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

function migrateViewStorage(stored: any): ViewStorage {
  if (!stored || stored.version !== STORAGE_VERSION) {
    return getDefaultStorage();
  }
  return stored;
}

export function generateViewId(): string {
  return `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

#### 1.3: View Manager Hook
**Duration**: 4 hours

**Files to Create**:
- `frontend/src/hooks/useViewManager.ts`

**Implementation**:
```typescript
import { useState, useEffect, useCallback } from 'react';
import { ViewConfig, ViewStorage } from '../types/view';
import { 
  loadViewsFromStorage, 
  saveViewsToStorage, 
  generateViewId 
} from '../utils/viewStorage';
import { isEqual } from 'lodash';

export function useViewManager() {
  const [storage, setStorage] = useState<ViewStorage>(() => loadViewsFromStorage());
  const [currentConfig, setCurrentConfig] = useState<ViewConfig['config']>(
    storage.views.find(v => v.id === storage.activeViewId)?.config || 
    storage.views[0].config
  );

  // Persist to localStorage on storage changes
  useEffect(() => {
    saveViewsToStorage(storage);
  }, [storage]);

  const activeView = storage.views.find(v => v.id === storage.activeViewId);
  
  const hasUnsavedChanges = useCallback(() => {
    if (!activeView) return false;
    return !isEqual(activeView.config, currentConfig);
  }, [activeView, currentConfig]);

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
  }, [currentConfig]);

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

  const deleteView = useCallback((id: string) => {
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
  }, []);

  const switchView = useCallback((id: string) => {
    const view = storage.views.find(v => v.id === id);
    if (!view) return;

    setStorage(prev => ({ ...prev, activeViewId: id }));
    setCurrentConfig(view.config);
  }, [storage.views]);

  const saveCurrentView = useCallback(() => {
    if (!activeView) return;
    
    updateView(activeView.id, { config: currentConfig });
  }, [activeView, currentConfig, updateView]);

  const discardChanges = useCallback(() => {
    if (!activeView) return;
    setCurrentConfig(activeView.config);
  }, [activeView]);

  const renameView = useCallback((id: string, newName: string) => {
    updateView(id, { name: newName });
  }, [updateView]);

  return {
    views: storage.views,
    activeView,
    activeViewId: storage.activeViewId,
    currentConfig,
    setCurrentConfig,
    hasUnsavedChanges: hasUnsavedChanges(),
    createView,
    updateView,
    deleteView,
    switchView,
    saveCurrentView,
    discardChanges,
    renameView,
  };
}
```

**Testing**:
- Unit tests for localStorage utilities
- Unit tests for view manager hook
- Test quota exceeded handling
- Test view CRUD operations

---

## Phase 2: View Management UI (Days 3-5)

### Objectives
- Build view tab navigation
- Implement filter/sort/group controls
- Create save/discard panel

### Tasks

#### 2.1: View Tabs Component
**Duration**: 4 hours

**Files to Create**:
- `frontend/src/components/ViewManagement/ViewTabs.tsx`
- `frontend/src/components/ViewManagement/ViewTabItem.tsx`

**Implementation**:
```tsx
// ViewTabs.tsx
export function ViewTabs({
  views,
  activeViewId,
  onViewChange,
  onViewCreate,
  onViewDelete,
  onViewRename,
}: ViewTabsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4">
      <div className="flex gap-1 overflow-x-auto py-2">
        {views.map(view => (
          <ViewTabItem
            key={view.id}
            view={view}
            isActive={view.id === activeViewId}
            isEditing={editingId === view.id}
            onClick={() => onViewChange(view.id)}
            onEdit={() => setEditingId(view.id)}
            onEditComplete={(newName) => {
              onViewRename(view.id, newName);
              setEditingId(null);
            }}
            onDelete={() => onViewDelete(view.id)}
          />
        ))}
        
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
          title="Create new view"
        >
          <span>+</span>
          <span>New View</span>
        </button>
      </div>

      {isCreating && (
        <ViewCreateDialog
          onSave={(name) => {
            onViewCreate(name);
            setIsCreating(false);
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}
    </div>
  );
}

// ViewTabItem.tsx
export function ViewTabItem({
  view,
  isActive,
  isEditing,
  onClick,
  onEdit,
  onEditComplete,
  onDelete,
}: ViewTabItemProps) {
  const [editName, setEditName] = useState(view.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onEditComplete(editName);
    } else if (e.key === 'Escape') {
      setEditName(view.name);
      onEditComplete(view.name);
    }
  };

  if (isEditing) {
    return (
      <div className="inline-flex items-center px-3 py-1.5">
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => onEditComplete(editName)}
          onKeyDown={handleKeyDown}
          className="w-32 border-b border-primary-600 bg-transparent text-sm outline-none"
        />
      </div>
    );
  }

  return (
    <div
      className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-t-md transition-colors ${
        isActive
          ? 'bg-white text-gray-900 border-t border-x border-gray-200'
          : 'bg-transparent text-gray-600 hover:bg-gray-100 cursor-pointer'
      }`}
    >
      <button
        onClick={onClick}
        className="text-sm font-medium"
      >
        {view.name}
      </button>

      {!view.isDefault && (
        <div className="hidden group-hover:flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-0.5 hover:bg-gray-200 rounded"
            title="Rename view"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-0.5 hover:bg-gray-200 rounded"
            title="Delete view"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}
```

#### 2.2: View Controls Component
**Duration**: 5 hours

**Files to Create**:
- `frontend/src/components/ViewManagement/ViewControls.tsx`
- `frontend/src/components/ViewManagement/FilterPanel.tsx`

**Implementation**:
```tsx
// ViewControls.tsx
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
    (config.filters.temporal.notUpdatedToday ? 1 : 0);

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
      {/* Left: Primary Action */}
      <button
        onClick={() => {/* Show create dialog */}}
        className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
      >
        New Workstream
      </button>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Group Control */}
        <div className="relative">
          <button
            onClick={() => setShowGroupMenu(!showGroupMenu)}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span>Group: {config.group.by === 'category' ? 'Category' : 'None'}</span>
            <span className="text-xs">▼</span>
          </button>

          {showGroupMenu && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border border-gray-200 bg-white shadow-lg">
              <button
                onClick={() => {
                  onConfigChange({ ...config, group: { by: 'none' } });
                  setShowGroupMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                None
              </button>
              <button
                onClick={() => {
                  onConfigChange({ ...config, group: { by: 'category' } });
                  setShowGroupMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                Category
              </button>
            </div>
          )}
        </div>

        {/* Sort Control */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span>Sort: {getSortLabel(config.sort)}</span>
            <span className="text-xs">▼</span>
          </button>

          {showSortMenu && (
            <SortMenu
              currentSort={config.sort}
              onSortChange={(sort) => {
                onConfigChange({ ...config, sort });
                setShowSortMenu(false);
              }}
            />
          )}
        </div>

        {/* Filter Control */}
        <div className="relative">
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
          <div className="flex items-center gap-2 border-l border-gray-300 pl-3">
            <button
              onClick={onSave}
              className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              Save
            </button>
            <button
              onClick={onSaveAs}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Save As
            </button>
            <button
              onClick={onDiscard}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Discard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getSortLabel(sort: SortConfig): string {
  const field = {
    name: 'Name',
    createdAt: 'Created',
    updatedAt: 'Updated',
  }[sort.field];
  
  const direction = sort.direction === 'asc' ? '↑' : '↓';
  
  return `${field} ${direction}`;
}
```

#### 2.3: Filter Panel Component
**Duration**: 4 hours

**Files to Create**:
- `frontend/src/components/ViewManagement/FilterPanel.tsx`

**Implementation**:
```tsx
export function FilterPanel({
  filters,
  onFiltersChange,
  onClose,
}: FilterPanelProps) {
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters: FilterConfig = {
      categoryIds: [],
      tags: [],
      temporal: { notUpdatedToday: false },
    };
    setLocalFilters(clearedFilters);
  };

  return (
    <div className="absolute right-0 top-full z-20 mt-1 w-80 rounded-md border border-gray-200 bg-white shadow-lg">
      <div className="max-h-96 overflow-y-auto">
        {/* Categories Section */}
        <div className="border-b border-gray-200 p-3">
          <h4 className="mb-2 text-sm font-medium text-gray-900">Categories</h4>
          <div className="space-y-1">
            {categories?.map(category => (
              <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.categoryIds.includes(category.id)}
                  onChange={(e) => {
                    setLocalFilters({
                      ...localFilters,
                      categoryIds: e.target.checked
                        ? [...localFilters.categoryIds, category.id]
                        : localFilters.categoryIds.filter(id => id !== category.id),
                    });
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm text-gray-700">{category.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Tags Section */}
        <div className="border-b border-gray-200 p-3">
          <h4 className="mb-2 text-sm font-medium text-gray-900">Tags</h4>
          <TagFilterSearch
            selectedTags={localFilters.tags}
            onTagsChange={(tags) => setLocalFilters({ ...localFilters, tags })}
            inline
          />
        </div>

        {/* Temporal Section */}
        <div className="border-b border-gray-200 p-3">
          <h4 className="mb-2 text-sm font-medium text-gray-900">Other</h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localFilters.temporal.notUpdatedToday}
              onChange={(e) => setLocalFilters({
                ...localFilters,
                temporal: { notUpdatedToday: e.target.checked },
              })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Not updated today</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-gray-200 p-3">
        <button
          onClick={handleClear}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Clear all
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 2.4: Integrate into Cockpit
**Duration**: 3 hours

**Files to Modify**:
- `frontend/src/pages/Cockpit.tsx`

**Changes**:
1. Import and use `useViewManager` hook
2. Replace existing filter/sort/group state with view config
3. Add ViewTabs and ViewControls components
4. Update workstreams query to use view filters

**Testing**:
- Component tests for ViewTabs
- Component tests for ViewControls
- Component tests for FilterPanel
- Integration test for Cockpit with view management

---

## Phase 3: Tag Search Enhancement (Day 6)

### Objectives
- Add search input to tag dropdowns
- Implement real-time filtering
- Update both Cockpit and Timeline

### Tasks

#### 3.1: Tag Filter Search Component
**Duration**: 3 hours

**Files to Modify**:
- `frontend/src/components/Tag/TagFilter.tsx`

**Implementation**:
```tsx
export function TagFilter({ selectedTags, onTagsChange }: TagFilterProps) {
  const { data: tags, isLoading } = useTags();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter tags by search query
  const filteredTags = useMemo(() => {
    if (!tags) return [];
    if (!searchQuery.trim()) return tags;

    const query = searchQuery.toLowerCase();
    return tags.filter(tag =>
      tag.displayName.toLowerCase().includes(query) ||
      tag.name.toLowerCase().includes(query)
    );
  }, [tags, searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  if (isLoading || !tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span>Tags</span>
        {selectedTags.length > 0 && (
          <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs text-white">
            {selectedTags.length}
          </span>
        )}
        <span className="text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-md border border-gray-200 bg-white shadow-lg">
          {/* Search Input */}
          <div className="border-b border-gray-200 p-2">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Tag List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredTags.length === 0 ? (
              <p className="p-2 text-center text-sm text-gray-500">No tags found</p>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600"
                    />
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1">#{tag.displayName}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Clear All */}
          {selectedTags.length > 0 && (
            <div className="border-t border-gray-200 p-2">
              <button
                onClick={() => {
                  onTagsChange([]);
                  setSearchQuery('');
                }}
                className="w-full rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

#### 3.2: Update Timeline Tag Filter
**Duration**: 2 hours

**Files to Modify**:
- `frontend/src/components/Timeline/FilterBar.tsx`

**Changes**:
1. Add search input to tag section
2. Implement same filtering logic
3. Ensure consistent behavior with Cockpit

**Testing**:
- Component tests for tag search
- Test search with various queries
- Test keyboard navigation
- Test performance with 50+ tags

---

## Phase 4: Temporal Filter (Day 7)

### Objectives
- Implement "not updated today" filter
- Update backend API
- Integrate with Cockpit view

### Tasks

#### 4.1: Backend API Enhancement
**Duration**: 2 hours

**Files to Modify**:
- `backend/src/routes/workstreams.ts`
- `backend/src/services/workstreamService.ts`

**Implementation**:
```typescript
// workstreams.ts
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const { 
      state, 
      categoryIds, 
      tags,
      notUpdatedToday // NEW
    } = req.query;

    const workstreams = await workstreamService.getWorkstreams(userId, {
      state: state as 'active' | 'closed' | undefined,
      categoryIds: categoryIds ? (categoryIds as string).split(',') : undefined,
      tags: tags ? (tags as string).split(',') : undefined,
      notUpdatedToday: notUpdatedToday === 'true', // NEW
    });

    res.json(workstreams);
  } catch (error) {
    next(error);
  }
});

// workstreamService.ts
interface GetWorkstreamsFilters {
  state?: 'active' | 'closed';
  categoryIds?: string[];
  tags?: string[];
  notUpdatedToday?: boolean; // NEW
}

export async function getWorkstreams(
  userId: string,
  filters: GetWorkstreamsFilters = {}
): Promise<Workstream[]> {
  const where: Prisma.WorkstreamWhereInput = {
    userId,
    state: filters.state || 'active',
  };

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    where.categoryId = { in: filters.categoryIds };
  }

  if (filters.tags && filters.tags.length > 0) {
    where.tags = {
      some: {
        tag: {
          name: { in: filters.tags },
        },
      },
    };
  }

  // NEW: Temporal filter
  if (filters.notUpdatedToday) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    where.OR = [
      // No status updates at all
      {
        statusUpdates: {
          none: {},
        },
      },
      // All status updates before today
      {
        statusUpdates: {
          every: {
            createdAt: {
              lt: startOfToday,
            },
          },
        },
      },
    ];
  }

  return prisma.workstream.findMany({
    where,
    include: {
      category: true,
      tags: { include: { tag: true } },
      statusUpdates: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}
```

#### 4.2: Frontend Integration
**Duration**: 2 hours

**Files to Modify**:
- `frontend/src/hooks/useWorkstreams.ts`

**Implementation**:
```typescript
interface UseWorkstreamsOptions {
  state?: 'active' | 'closed';
  tags?: string[];
  categoryIds?: string[];
  notUpdatedToday?: boolean; // NEW
}

export function useWorkstreams(options: UseWorkstreamsOptions = {}) {
  return useQuery({
    queryKey: ['workstreams', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (options.state) params.append('state', options.state);
      if (options.tags) params.append('tags', options.tags.join(','));
      if (options.categoryIds) params.append('categoryIds', options.categoryIds.join(','));
      if (options.notUpdatedToday) params.append('notUpdatedToday', 'true'); // NEW

      const response = await fetch(`/api/workstreams?${params}`);
      if (!response.ok) throw new Error('Failed to fetch workstreams');
      return response.json();
    },
  });
}
```

#### 4.3: Update Cockpit to Use Filter
**Duration**: 1 hour

**Files to Modify**:
- `frontend/src/pages/Cockpit.tsx`

**Changes**:
1. Pass `notUpdatedToday` from view config to useWorkstreams
2. Display filter indicator when active

**Testing**:
- Backend unit tests for temporal filter
- Integration tests for API endpoint
- Frontend tests for filter application
- E2E test for complete workflow

---

## Phase 5: Timeline Date Range Enhancements (Days 8-9)

### Objectives
- Build advanced date range component
- Add preset, relative, and absolute modes
- Integrate calendar widget

### Tasks

#### 5.1: Date Range Types & Utilities
**Duration**: 2 hours

**Files to Create**:
- `frontend/src/types/dateRange.ts`
- `frontend/src/utils/dateRangeCalculator.ts`

**Implementation**: (See spec.md for details)

#### 5.2: Date Range Filter Component
**Duration**: 5 hours

**Files to Create**:
- `frontend/src/components/DatePicker/DateRangeFilter.tsx`
- `frontend/src/components/DatePicker/Calendar.tsx`

**Dependencies**:
```bash
npm install react-day-picker
```

**Implementation**: (See spec.md for Calendar component)

#### 5.3: Integrate into Timeline
**Duration**: 3 hours

**Files to Modify**:
- `frontend/src/pages/Timeline.tsx`
- `frontend/src/components/Timeline/FilterBar.tsx`

**Changes**:
1. Replace preset buttons with DateRangeFilter
2. Update timeline query with new date range format
3. Display current range clearly

**Testing**:
- Component tests for DateRangeFilter
- Test all preset calculations
- Test relative day ranges
- Test absolute range validation
- Test 31-day maximum enforcement

---

## Phase 6: Testing & Polish (Days 10-12)

### Objectives
- Comprehensive E2E testing
- Performance optimization
- Accessibility audit
- Documentation

### Tasks

#### 6.1: E2E Test Suite
**Duration**: 6 hours

**Files to Create**:
- `frontend/tests/e2e/viewManagement.spec.ts`
- `frontend/tests/e2e/tagSearch.spec.ts`
- `frontend/tests/e2e/temporalFilter.spec.ts`
- `frontend/tests/e2e/timelineRanges.spec.ts`

**Test Scenarios**:
- Complete view management workflow
- Tag search with large dataset
- Temporal filter application
- Timeline date range selection
- Unsaved changes handling
- View switching with dirty state

#### 6.2: Performance Optimization
**Duration**: 4 hours

**Tasks**:
- Profile view switching performance
- Optimize tag search filtering
- Debounce search input
- Virtualize large tag lists (if needed)
- Optimize localStorage operations
- Measure and optimize render times

#### 6.3: Accessibility Audit
**Duration**: 3 hours

**Tasks**:
- Keyboard navigation testing
- Screen reader testing
- ARIA labels and roles
- Focus management
- Color contrast verification
- Form validation messages

#### 6.4: Documentation
**Duration**: 3 hours

**Files to Create/Update**:
- `docs/USER_GUIDE.md` - Add view management section
- `specs/006-advanced-filtering-views/USER_GUIDE.md`
- Code documentation (JSDoc comments)
- README updates

---

## Success Criteria

### Functionality
- ✅ Default view loads on first visit
- ✅ Users can create custom views
- ✅ Users can rename/delete views
- ✅ View switching works instantly
- ✅ Unsaved changes detected and saved
- ✅ Tag search filters in real-time
- ✅ "Not updated today" filter works correctly
- ✅ Timeline supports all date range modes
- ✅ 31-day maximum enforced

### Performance
- ✅ View switch < 200ms (p95)
- ✅ Tag search < 50ms (p95)
- ✅ Filter application < 300ms (p95)
- ✅ No layout shifts during interactions

### Quality
- ✅ 100% unit test coverage for new code
- ✅ Integration tests pass
- ✅ E2E tests pass
- ✅ Accessibility score ≥ 95
- ✅ No console errors or warnings

---

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|---------------------|
| localStorage quota | Implement quota monitoring, enforce 50-view limit |
| Performance with many views | Virtual scrolling, pagination, lazy loading |
| Complex state management | Thorough testing, clear state flow documentation |
| Browser compatibility | Polyfills, feature detection, progressive enhancement |
| User confusion | Clear UI hints, onboarding tooltips, documentation |

---

## Dependencies

### NPM Packages
- `react-day-picker` - Calendar widget (already in use via date-fns)
- `lodash` - Deep equality checks (already in dependencies)

### Existing Code
- Filter infrastructure (categories, tags)
- Workstream service and API
- Timeline component
- Date utilities (date-fns)

---

## Rollout Plan

### Phase 1: Beta Testing (Week 1)
- Deploy to staging
- Internal testing with team
- Gather feedback
- Iterate on UX

### Phase 2: Gradual Rollout (Week 2)
- Enable for 10% of users
- Monitor performance metrics
- Track adoption rates
- Fix any issues

### Phase 3: Full Release (Week 3)
- Enable for all users
- Announce feature
- Create tutorial content
- Monitor support requests

---

## Next Steps

1. **Approval**: Get stakeholder sign-off on specification
2. **Setup**: Create feature branch `feature/006-view-management`
3. **Phase 1**: Begin view management foundation
4. **Daily Standups**: Track progress, blockers
5. **Review**: Code review after each phase
6. **Merge**: Merge to main after Phase 6 completion
