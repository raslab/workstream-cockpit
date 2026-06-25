// View configuration types for saved views feature

export type HierarchyFilter = 'all' | 'top-level' | 'sub-streams' | 'no-parent' | 'has-substreams' | 'under-parent';
export type TimelineHierarchyScope = 'all' | 'top-level' | 'sub-streams' | 'under-parent';

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
  hierarchy: {
    mode: HierarchyFilter;
    parentId: string | null;
    parentIds?: string[];
    includeSubstreams: boolean;
    timelineScope?: TimelineHierarchyScope;
    includeStructuralEvents?: boolean;
  };
}

export interface SortConfig {
  field: 'name' | 'createdAt' | 'lastDirectUpdateAt' | 'lastActivityAt' | 'lastSubstreamActivityAt';
  direction: 'asc' | 'desc';
}

export interface GroupConfig {
  by: 'none' | 'category' | 'parent';
}

export interface ViewStorage {
  version: number;
  defaultViewId: string;
  activeViewId: string;
  views: ViewConfig[];
  lastModified: string;
}

// Serialized version for localStorage (dates as strings)
export interface SerializedViewConfig {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  config: {
    filters: FilterConfig;
    sort: SortConfig;
    group: GroupConfig;
  };
}

export interface SerializedViewStorage {
  version: number;
  defaultViewId: string;
  activeViewId: string;
  views: SerializedViewConfig[];
  lastModified: string;
}
