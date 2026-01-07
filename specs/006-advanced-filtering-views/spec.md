# Feature Specification: Advanced Filtering & View Management

**Feature ID**: 006-advanced-filtering-views
**Version**: 1.0
**Status**: Planning
**Created**: 2026-01-07
**Last Updated**: 2026-01-07

---

## Executive Summary

This specification defines a comprehensive view management system and advanced filtering capabilities inspired by modern project management tools like Notion and Asana. The system enables users to save, manage, and quickly switch between different perspectives of their workstreams while providing enhanced filtering options for both Cockpit and Timeline views.

**Key Improvements**:
1. **View Management**: Named, saveable filter/sort/group configurations
2. **Tag Search**: Real-time search in tag filter dropdowns
3. **Temporal Filtering**: "Not updated today" filter for workstream management
4. **Advanced Date Ranges**: Flexible timeline filtering with calendar selection

**Business Value**:
- **Productivity**: Instant switching between common view configurations
- **Scalability**: Usable with hundreds of tags through search
- **Focus**: Temporal filters highlight items needing attention
- **Flexibility**: Powerful date range options for historical analysis

---

## Problem Statement

### Current State

**1. No View Persistence**
- Users configure filter/sort/group settings each session
- Common configurations (e.g., "QA Team", "Old Items") must be recreated
- Switching perspectives requires multiple clicks
- No way to share or reuse configurations
- Lost productivity reconfiguring views

**2. Inadequate Tag Filtering**
- Tag dropdown shows all tags in single scrollable list
- No search or filtering within tag list
- With 20+ tags, finding specific tags is slow
- Users scroll through entire list repeatedly
- Poor UX at scale

**3. Missing Temporal Awareness**
- Cannot filter by "last updated" time
- No way to find stale workstreams
- "Not updated today" requires manual inspection
- Hard to identify items needing attention
- Time-based prioritization difficult

**4. Limited Timeline Date Ranges**
- Only 4 preset options (All, Today, This Week, Last 7 Days)
- No "current week" vs "previous week" distinction
- Cannot specify "last 14 days" or "last 30 days"
- No calendar widget for precise range selection
- No enforcement of maximum range limits

### Desired State

**1. Managed Views**
- Named views saved locally
- Default view: group by category, sort by updated desc
- Custom views with any filter/sort/group combination
- Quick switching via tab interface
- Save/Save As/Discard workflow

**2. Searchable Tags**
- Search input at top of tag dropdowns
- Real-time filtering of tag list
- Works in Cockpit and Timeline
- Preserves multi-select behavior
- Fast tag selection at any scale

**3. Temporal Filters**
- "Not updated today" filter option
- Combines with category/tag filters
- Clear visual indication when active
- Easy to toggle on/off

**4. Advanced Timeline Ranges**
- Current day/week/month presets
- Previous day/week/month presets
- "Last N days" with custom number input
- Calendar widget for absolute date ranges
- 31-day maximum range enforcement
- Clear range display in UI

---

## Requirements *(mandatory)*

### Functional Requirements

#### FR-001: View Management System

**FR-001.1**: System MUST provide a default view configuration:
- Group by: category
- Sort by: updatedAt
- Sort direction: descending
- No filters active

**FR-001.2**: System MUST allow users to create custom views with:
- Unique name (3-50 characters)
- Filter configuration (category, tags, temporal)
- Sort field and direction
- Group option

**FR-001.3**: System MUST persist views in browser localStorage

**FR-001.4**: System MUST display views as tabs in navigation area:
- Default view always first
- Custom views in creation order
- Active view highlighted
- Maximum 8 views visible (+ overflow menu)

**FR-001.5**: System MUST track view modification state:
- Detect when current filters/sort/group differ from saved view
- Show "unsaved changes" indicator
- Provide Save/Save As/Discard actions

**FR-001.6**: System MUST allow view deletion:
- Cannot delete default view
- Confirmation dialog for custom view deletion
- Switch to default view after deletion

**FR-001.7**: System MUST allow view renaming:
- In-place editing of view name
- Duplicate name validation
- Auto-save on blur

#### FR-002: Enhanced Tag Search

**FR-002.1**: System MUST add search input to tag filter dropdown in Cockpit:
- Input field at top of dropdown
- Placeholder text: "Search tags..."
- Real-time filtering as user types
- Case-insensitive search

**FR-002.2**: System MUST add search input to tag filter dropdown in Timeline:
- Same behavior as Cockpit implementation
- Shared component for consistency

**FR-002.3**: System MUST search tags by:
- Tag display name
- Tag name (without #)
- Partial matches
- Word boundaries preferred

**FR-002.4**: System MUST preserve existing tag dropdown behavior:
- Multi-select checkboxes
- Color indicators
- Selected count badge
- "Clear all" button

**FR-002.5**: System MUST show "No tags found" when search yields no results

**FR-002.6**: System MUST clear search on dropdown close

#### FR-003: Temporal Filtering

**FR-003.1**: System MUST add "Not Updated Today" filter option in Cockpit

**FR-003.2**: System MUST define "not updated today" as:
- Latest status update created before current day (00:00:00)
- OR no status updates exist
- Timezone-aware (user's local timezone)

**FR-003.3**: System MUST combine temporal filter with other filters:
- AND logic with category filters
- AND logic with tag filters
- Works with any group/sort configuration

**FR-003.4**: System MUST show visual indicator when temporal filter active:
- Badge on filter button
- Clear current state in filter panel
- One-click to toggle off

**FR-003.5**: System MUST update filter dynamically as day changes:
- Re-evaluate at midnight
- No page refresh required
- Automatic result update

#### FR-004: Advanced Timeline Date Ranges

**FR-004.1**: System MUST provide preset date range options:
- Current Day (today 00:00 - now)
- Current Week (Monday - now)
- Current Month (1st - now)
- Previous Day (yesterday 00:00 - 23:59)
- Previous Week (last Monday - Sunday)
- Previous Month (last month 1st - last day)

**FR-004.2**: System MUST provide "Last N Days" option:
- Default values: 1, 3, 7, 14, 30
- Custom input field for other values
- Range: 1-31 days
- Validation and error messaging

**FR-004.3**: System MUST provide calendar date range picker:
- From date selector
- To date selector
- Visual calendar widget
- Quick date selection
- Validation: from <= to

**FR-004.4**: System MUST enforce maximum 31-day range:
- Validate on selection
- Show error message if exceeded
- Prevent submission of invalid range

**FR-004.5**: System MUST display current date range clearly:
- Human-readable format
- Show absolute dates for custom ranges
- Update when range changes

**FR-004.6**: System MUST preserve existing Timeline filters:
- Category filter
- Tag filter
- Combine with date ranges

#### FR-005: View Navigation UI

**FR-005.1**: System MUST display two-row navigation in Cockpit:
- Row 1: View tabs (default + custom + new view button)
- Row 2: Action bar (New Workstream + filter/sort/group + save controls)

**FR-005.2**: System MUST style view tabs like Asana:
- Horizontal tab bar
- Active tab highlighted
- Hover states
- Click to switch views

**FR-005.3**: System MUST show filter/sort/group controls as dropdowns:
- Group button with current state
- Sort button with current state
- Filter button with active count badge
- Compact button design

**FR-005.4**: System MUST show save controls conditionally:
- Only when view has unsaved changes
- "Save" button - updates current view
- "Save as new view" button - creates copy
- "Discard" button - reverts to saved state

**FR-005.5**: System MUST position "New Workstream" button at left of row 2:
- Primary action prominence
- Consistent location
- Keyboard accessible

### Non-Functional Requirements

#### NFR-001: Performance

**NFR-001.1**: View switching MUST complete within 200ms
**NFR-001.2**: Tag search filtering MUST update within 50ms of keystroke
**NFR-001.3**: View save operation MUST complete within 100ms
**NFR-001.4**: Calendar widget MUST render within 150ms

#### NFR-002: Usability

**NFR-002.1**: View management MUST be intuitive without documentation
**NFR-002.2**: Tag search MUST have clear focus indication
**NFR-002.3**: Unsaved changes MUST be obvious to user
**NFR-002.4**: Date range selection MUST show preview before applying

#### NFR-003: Accessibility

**NFR-003.1**: All interactive elements MUST be keyboard accessible
**NFR-003.2**: View tabs MUST support arrow key navigation
**NFR-003.3**: Date picker MUST support keyboard date input
**NFR-003.4**: Screen readers MUST announce view changes

#### NFR-004: Data Management

**NFR-004.1**: localStorage MUST gracefully handle quota exceeded
**NFR-004.2**: View data MUST include version for future migrations
**NFR-004.3**: Invalid view data MUST fallback to default view
**NFR-004.4**: Maximum 50 saved views per user

---

## Technical Design

### Frontend Architecture

#### Component Structure

```
src/
├── components/
│   ├── ViewManagement/
│   │   ├── ViewTabs.tsx           # Tab navigation bar
│   │   ├── ViewTabItem.tsx        # Individual tab
│   │   ├── ViewControls.tsx       # Filter/sort/group buttons
│   │   ├── ViewSavePanel.tsx      # Save/Save As/Discard
│   │   ├── ViewCreateDialog.tsx   # New view dialog
│   │   └── ViewDeleteDialog.tsx   # Confirmation dialog
│   ├── Filter/
│   │   ├── FilterPanel.tsx        # Unified filter popup
│   │   ├── CategoryFilter.tsx     # Category selection
│   │   ├── TagFilterSearch.tsx    # Tag filter with search
│   │   ├── TemporalFilter.tsx     # Not updated today
│   │   └── DateRangeFilter.tsx    # Advanced date ranges
│   └── DatePicker/
│       ├── Calendar.tsx           # Calendar widget
│       ├── DateInput.tsx          # Date text input
│       └── RangeSelector.tsx      # From/To date pair
├── hooks/
│   ├── useViewManager.ts          # View CRUD operations
│   ├── useViewState.ts            # Current view state
│   ├── useTagSearch.ts            # Tag filtering logic
│   └── useDateRange.ts            # Date range calculations
└── types/
    ├── view.ts                    # ViewConfig interface
    └── filter.ts                  # Filter types

```

#### Data Types

```typescript
// View Configuration
interface ViewConfig {
  id: string;                      // UUID
  name: string;                    // Display name
  isDefault: boolean;              // System default flag
  createdAt: Date;                 // Creation timestamp
  updatedAt: Date;                 // Last modified
  config: {
    filters: FilterConfig;
    sort: SortConfig;
    group: GroupConfig;
  };
}

interface FilterConfig {
  categoryIds: string[];           // Selected category IDs
  tags: string[];                  // Selected tag names
  temporal: {
    notUpdatedToday: boolean;      // Temporal filter flag
  };
}

interface SortConfig {
  field: 'name' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

interface GroupConfig {
  by: 'none' | 'category';
}

// Timeline Date Range
interface DateRangeConfig {
  type: 'preset' | 'relative' | 'absolute';
  preset?: DatePreset;
  relative?: { days: number };
  absolute?: { from: Date; to: Date };
}

type DatePreset = 
  | 'current-day'
  | 'current-week'
  | 'current-month'
  | 'previous-day'
  | 'previous-week'
  | 'previous-month';

// View Storage
interface ViewStorage {
  version: number;                 // Schema version
  defaultViewId: string;           // Active default
  views: ViewConfig[];             // All saved views
  activeViewId: string;            // Currently active
}
```

#### State Management

```typescript
// useViewManager.ts
export function useViewManager() {
  const [views, setViews] = useState<ViewConfig[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load views from localStorage on mount
  useEffect(() => {
    const stored = loadViewsFromStorage();
    setViews(stored.views);
    setActiveViewId(stored.activeViewId);
  }, []);

  // Save views to localStorage on change
  useEffect(() => {
    saveViewsToStorage({ views, activeViewId });
  }, [views, activeViewId]);

  const createView = (name: string, config: ViewConfig['config']) => {
    const newView: ViewConfig = {
      id: generateUUID(),
      name,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      config,
    };
    setViews([...views, newView]);
    setActiveViewId(newView.id);
    setHasUnsavedChanges(false);
  };

  const updateView = (id: string, changes: Partial<ViewConfig>) => {
    setViews(views.map(v => 
      v.id === id 
        ? { ...v, ...changes, updatedAt: new Date() }
        : v
    ));
    setHasUnsavedChanges(false);
  };

  const deleteView = (id: string) => {
    setViews(views.filter(v => v.id !== id));
    if (activeViewId === id) {
      setActiveViewId(views.find(v => v.isDefault)?.id || '');
    }
  };

  const switchView = (id: string) => {
    if (hasUnsavedChanges) {
      // Show confirmation dialog
      return;
    }
    setActiveViewId(id);
  };

  const detectChanges = (currentConfig: ViewConfig['config']) => {
    const activeView = views.find(v => v.id === activeViewId);
    if (!activeView) return false;
    
    return !isEqual(activeView.config, currentConfig);
  };

  return {
    views,
    activeView: views.find(v => v.id === activeViewId),
    activeViewId,
    hasUnsavedChanges,
    createView,
    updateView,
    deleteView,
    switchView,
    detectChanges,
    discardChanges: () => setHasUnsavedChanges(false),
  };
}
```

#### Tag Search Implementation

```typescript
// TagFilterSearch.tsx
export function TagFilterSearch({ 
  selectedTags, 
  onTagsChange 
}: TagFilterProps) {
  const { data: tags } = useTags();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleDropdownClose = () => {
    setIsOpen(false);
    clearSearch();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} {...}>
        Tags
        {selectedTags.length > 0 && (
          <span className="badge">{selectedTags.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="dropdown">
          {/* Search Input */}
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-2 py-1 border rounded"
              autoFocus
            />
          </div>

          {/* Tag List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredTags.length === 0 ? (
              <p className="text-sm text-gray-500 p-2">No tags found</p>
            ) : (
              filteredTags.map(tag => (
                <TagCheckbox
                  key={tag.id}
                  tag={tag}
                  checked={selectedTags.includes(tag.name)}
                  onChange={() => toggleTag(tag.name)}
                />
              ))
            )}
          </div>

          {/* Clear All */}
          {selectedTags.length > 0 && (
            <div className="border-t p-2">
              <button onClick={clearAll}>Clear all</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

#### Temporal Filter Implementation

```typescript
// TemporalFilter.tsx
export function TemporalFilter({
  notUpdatedToday,
  onChange,
}: TemporalFilterProps) {
  const startOfToday = startOfDay(new Date());

  return (
    <div className="p-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={notUpdatedToday}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <span className="text-sm">Not updated today</span>
      </label>
      {notUpdatedToday && (
        <p className="text-xs text-gray-500 mt-1 ml-6">
          Showing workstreams last updated before {format(startOfToday, 'PP')}
        </p>
      )}
    </div>
  );
}

// Hook for temporal filtering
export function useTemporalFilter(
  workstreams: Workstream[],
  notUpdatedToday: boolean
) {
  return useMemo(() => {
    if (!notUpdatedToday) return workstreams;

    const startOfToday = startOfDay(new Date());
    
    return workstreams.filter(ws => {
      if (!ws.latestStatus) return true; // No updates = include
      
      const lastUpdate = parseISO(ws.latestStatus.updatedAt);
      return isBefore(lastUpdate, startOfToday);
    });
  }, [workstreams, notUpdatedToday]);
}
```

#### Advanced Date Range Implementation

```typescript
// DateRangeFilter.tsx
export function DateRangeFilter({
  value,
  onChange,
}: DateRangeFilterProps) {
  const [mode, setMode] = useState<'preset' | 'relative' | 'absolute'>('preset');
  const [customDays, setCustomDays] = useState(7);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const presets: { value: DatePreset; label: string }[] = [
    { value: 'current-day', label: 'Current Day' },
    { value: 'current-week', label: 'Current Week' },
    { value: 'current-month', label: 'Current Month' },
    { value: 'previous-day', label: 'Previous Day' },
    { value: 'previous-week', label: 'Previous Week' },
    { value: 'previous-month', label: 'Previous Month' },
  ];

  const relativeDays = [1, 3, 7, 14, 30];

  const validateRange = (from: Date, to: Date): boolean => {
    const daysDiff = differenceInDays(to, from);
    return daysDiff >= 0 && daysDiff <= 31;
  };

  const handleAbsoluteRangeChange = (from: Date, to: Date) => {
    if (!validateRange(from, to)) {
      // Show error
      return;
    }
    setFromDate(from);
    setToDate(to);
    onChange({ type: 'absolute', absolute: { from, to } });
  };

  return (
    <div className="w-80 p-4">
      {/* Mode Selector */}
      <div className="flex gap-2 mb-4 border-b pb-2">
        <button
          onClick={() => setMode('preset')}
          className={mode === 'preset' ? 'active' : ''}
        >
          Preset
        </button>
        <button
          onClick={() => setMode('relative')}
          className={mode === 'relative' ? 'active' : ''}
        >
          Last N Days
        </button>
        <button
          onClick={() => setMode('absolute')}
          className={mode === 'absolute' ? 'active' : ''}
        >
          Custom Range
        </button>
      </div>

      {/* Preset Mode */}
      {mode === 'preset' && (
        <div className="space-y-1">
          {presets.map(preset => (
            <button
              key={preset.value}
              onClick={() => onChange({ type: 'preset', preset: preset.value })}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Relative Mode */}
      {mode === 'relative' && (
        <div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {relativeDays.map(days => (
              <button
                key={days}
                onClick={() => {
                  setCustomDays(days);
                  onChange({ type: 'relative', relative: { days } });
                }}
                className={customDays === days ? 'active' : ''}
              >
                {days} days
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Custom:</label>
            <input
              type="number"
              min="1"
              max="31"
              value={customDays}
              onChange={(e) => {
                const days = parseInt(e.target.value);
                if (days >= 1 && days <= 31) {
                  setCustomDays(days);
                  onChange({ type: 'relative', relative: { days } });
                }
              }}
              className="w-20 px-2 py-1 border rounded"
            />
            <span className="text-sm">days</span>
          </div>
        </div>
      )}

      {/* Absolute Mode */}
      {mode === 'absolute' && (
        <div className="space-y-3">
          <Calendar
            fromDate={fromDate}
            toDate={toDate}
            onRangeChange={handleAbsoluteRangeChange}
            maxDays={31}
          />
          {fromDate && toDate && (
            <div className="text-xs text-gray-600 text-center">
              {format(fromDate, 'MMM d, yyyy')} - {format(toDate, 'MMM d, yyyy')}
              {' '}({differenceInDays(toDate, fromDate) + 1} days)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Date range calculation helpers
export function calculateDateRange(config: DateRangeConfig): { from: Date; to: Date } {
  const now = new Date();

  switch (config.type) {
    case 'preset':
      return getPresetRange(config.preset!, now);
    case 'relative':
      return {
        from: subDays(now, config.relative!.days - 1),
        to: now,
      };
    case 'absolute':
      return config.absolute!;
  }
}

function getPresetRange(preset: DatePreset, now: Date): { from: Date; to: Date } {
  switch (preset) {
    case 'current-day':
      return { from: startOfDay(now), to: now };
    case 'current-week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
    case 'current-month':
      return { from: startOfMonth(now), to: now };
    case 'previous-day':
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    case 'previous-week':
      const lastWeek = subWeeks(now, 1);
      return {
        from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      };
    case 'previous-month':
      const lastMonth = subMonths(now, 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
  }
}
```

### Backend API Changes

#### Workstreams Endpoint Enhancement

```typescript
// GET /api/workstreams
interface WorkstreamsQueryParams {
  state?: 'active' | 'closed';
  categoryIds?: string;        // Comma-separated
  tags?: string;               // Comma-separated
  notUpdatedToday?: boolean;   // NEW
}

// In workstreamService.ts
async function getWorkstreams(
  userId: string,
  filters: WorkstreamsQueryParams
): Promise<Workstream[]> {
  const where: Prisma.WorkstreamWhereInput = {
    userId,
    state: filters.state || 'active',
  };

  // Category filter
  if (filters.categoryIds) {
    where.categoryId = {
      in: filters.categoryIds.split(','),
    };
  }

  // Tag filter
  if (filters.tags) {
    where.tags = {
      some: {
        tag: {
          name: {
            in: filters.tags.split(','),
          },
        },
      },
    };
  }

  // Temporal filter - not updated today
  if (filters.notUpdatedToday) {
    const startOfToday = startOfDay(new Date());
    where.OR = [
      // No status updates
      {
        statusUpdates: {
          none: {},
        },
      },
      // Latest status before today
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

### LocalStorage Schema

```typescript
// Key: "workstream_cockpit_views"
interface StoredViews {
  version: number;              // Schema version = 1
  defaultViewId: string;        // ID of default view
  activeViewId: string;         // Currently active view
  views: ViewConfig[];          // All saved views
  lastModified: string;         // ISO timestamp
}

// Migration helper
function migrateViewStorage(stored: any): StoredViews {
  if (!stored || stored.version !== 1) {
    // Return default structure
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
        sort: {
          field: 'updatedAt',
          direction: 'desc',
        },
        group: {
          by: 'category',
        },
      },
    };

    return {
      version: 1,
      defaultViewId: 'default',
      activeViewId: 'default',
      views: [defaultView],
      lastModified: new Date().toISOString(),
    };
  }

  return stored;
}
```

---

## User Interface Design

### Cockpit View Navigation (Two Rows)

```
┌─────────────────────────────────────────────────────────────────┐
│ Active Workstreams                                              │
├─────────────────────────────────────────────────────────────────┤
│ Row 1: View Tabs                                                │
│ ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────┐                  │
│ │ Default │ │ Old Ones │ │ QA Team │ │ + New│                  │
│ └─────────┘ └──────────┘ └─────────┘ └──────┘                  │
├─────────────────────────────────────────────────────────────────┤
│ Row 2: Actions & Controls                                       │
│ ┌──────────────┐        ┌───────┐ ┌──────┐ ┌────────┐         │
│ │ New Workstream│        │Group▼ │ │Sort▼ │ │Filter▼│         │
│ └──────────────┘        └───────┘ └──────┘ └────────┘         │
│                                    ┌──────┐ ┌────────┐ ┌────┐  │
│                                    │ Save │ │Save As │ │Discard│ (if modified)
│                                    └──────┘ └────────┘ └────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Filter Panel Popup

```
┌─────────────────────────────────┐
│ Filters                         │
├─────────────────────────────────┤
│ Categories:                     │
│ ☐ Engineering                   │
│ ☑ QA                            │
│ ☐ Marketing                     │
│                                 │
│ Tags:                           │
│ ┌───────────────────────────┐   │
│ │ Search tags...         🔍 │   │
│ └───────────────────────────┘   │
│ ☐ urgent                        │
│ ☑ backend                       │
│ ☑ customer                      │
│                                 │
│ Other:                          │
│ ☑ Not updated today             │
│                                 │
│ ┌────────┐ ┌──────────┐         │
│ │ Clear  │ │  Apply   │         │
│ └────────┘ └──────────┘         │
└─────────────────────────────────┘
```

### Timeline Date Range Picker

```
┌─────────────────────────────────────────┐
│ Select Date Range                       │
├─────────────────────────────────────────┤
│ [Preset] [Last N Days] [Custom Range]   │
├─────────────────────────────────────────┤
│ PRESET MODE:                            │
│ • Current Day                           │
│ • Current Week                          │
│ • Current Month                         │
│ • Previous Day                          │
│ • Previous Week                         │
│ • Previous Month                        │
├─────────────────────────────────────────┤
│ LAST N DAYS MODE:                       │
│ [1] [3] [7] [14] [30]                   │
│ Custom: [__7__] days                    │
├─────────────────────────────────────────┤
│ CUSTOM RANGE MODE:                      │
│ From: [Jan 1, 2026  📅]                 │
│ To:   [Jan 7, 2026  📅]                 │
│                                         │
│ [    Calendar Widget    ]               │
│                                         │
│ Range: 7 days (max 31)                  │
└─────────────────────────────────────────┘
```

---

## Testing Strategy

### Unit Tests

**View Management**:
- [ ] Create view with valid configuration
- [ ] Create view with invalid name (too short/long)
- [ ] Update existing view
- [ ] Delete custom view
- [ ] Cannot delete default view
- [ ] Switch between views
- [ ] Detect unsaved changes
- [ ] Save changes to active view
- [ ] Discard changes

**Tag Search**:
- [ ] Filter tags by search query
- [ ] Case-insensitive matching
- [ ] Partial name matching
- [ ] Display name matching
- [ ] Empty results handling
- [ ] Clear search on dropdown close

**Temporal Filter**:
- [ ] Filter workstreams not updated today
- [ ] Handle workstreams with no updates
- [ ] Timezone-aware filtering
- [ ] Combine with other filters

**Date Range**:
- [ ] Calculate preset ranges correctly
- [ ] Validate relative day ranges (1-31)
- [ ] Validate absolute ranges (max 31 days)
- [ ] Reject invalid from/to dates
- [ ] Handle timezone correctly

### Integration Tests

**Cockpit View Management**:
- [ ] Load saved views on mount
- [ ] Create new view and persist
- [ ] Switch views and load configuration
- [ ] Modify filters and show save controls
- [ ] Save changes and hide controls
- [ ] Discard changes and revert

**Tag Search Flow**:
- [ ] Open tag dropdown
- [ ] Type search query
- [ ] Select filtered tag
- [ ] Clear search
- [ ] Close dropdown

**Temporal Filter Flow**:
- [ ] Enable "not updated today" filter
- [ ] Fetch workstreams with filter
- [ ] Combine with category filter
- [ ] Combine with tag filter
- [ ] Disable filter

**Timeline Date Range**:
- [ ] Select preset range
- [ ] Select relative range
- [ ] Select custom range with calendar
- [ ] Validate 31-day maximum
- [ ] Fetch timeline with range

### E2E Tests

**View Workflow**:
1. User navigates to Cockpit
2. Default view loads (grouped by category, sorted by updated desc)
3. User changes filters (select category, add tag)
4. Save controls appear
5. User clicks "Save as new view"
6. Names view "QA Team"
7. New view tab appears
8. User switches to default view
9. User switches back to "QA Team"
10. Saved filters restored correctly

**Tag Search Workflow**:
1. User opens tag filter dropdown
2. Sees 20+ tags
3. Types "back" in search
4. Sees only "backend" and "backend-critical"
5. Selects "backend"
6. Search clears
7. Dropdown closes
8. Filter applied

**Temporal Filter Workflow**:
1. User opens filter panel
2. Checks "Not updated today"
3. Applies filter
4. Only sees workstreams last updated yesterday or earlier
5. Creates new status update on one workstream
6. That workstream disappears from filtered list

**Timeline Range Workflow**:
1. User opens timeline
2. Selects "Previous Week"
3. Sees only last week's activity
4. Switches to "Last N Days"
5. Enters "14"
6. Sees last 14 days
7. Switches to "Custom Range"
8. Picks Jan 1 - Jan 7
9. Sees 7 days of activity
10. Tries Jan 1 - Feb 15 (45 days)
11. Sees error message

---

## Accessibility

### Keyboard Navigation

- **View Tabs**: Left/Right arrows to navigate, Enter to activate
- **Filter Dropdowns**: Tab to focus, Space to open, Escape to close
- **Tag Search**: Auto-focus on dropdown open, arrow keys to navigate results
- **Calendar**: Arrow keys for date navigation, Enter to select
- **Save Controls**: Tab order: Save → Save As → Discard

### Screen Reader Support

- **View Tab**: "Default View, active" / "QA Team, inactive"
- **Filter Button**: "Filters, 3 active"
- **Save Controls**: "Save changes to current view" / "Discard unsaved changes"
- **Tag Search**: "Search tags, 5 results found"
- **Date Range**: "Date range: January 1 to January 7, 2026, 7 days"

### Focus Management

- Opening filter dropdown focuses search input (if present)
- Closing dropdown returns focus to trigger button
- Creating new view focuses name input
- Saving view returns focus to view tab

---

## Migration & Rollout

### Phase 1: View Management (Days 1-3)

1. Implement ViewConfig types and localStorage
2. Build ViewTabs and ViewControls components
3. Add save/discard logic
4. Migrate existing filter state to default view
5. Test view switching and persistence

### Phase 2: Tag Search (Day 4)

1. Add search input to TagFilter component
2. Implement filtering logic
3. Update both Cockpit and Timeline usages
4. Test search performance with 50+ tags

### Phase 3: Temporal Filter (Day 5)

1. Add TemporalFilter component
2. Update workstreams API endpoint
3. Integrate with Cockpit filters
4. Test timezone edge cases

### Phase 4: Timeline Enhancements (Days 6-7)

1. Build DateRangeFilter component
2. Integrate calendar widget (react-day-picker)
3. Update timeline API to support new ranges
4. Test range validation

### Phase 5: Integration & Polish (Days 8-10)

1. End-to-end testing
2. Performance optimization
3. Accessibility audit
4. Documentation updates
5. User acceptance testing

---

## Metrics & Success Criteria

### Adoption Metrics

- **Week 1**: 40% of users create at least one custom view
- **Week 2**: 60% of users have 2+ custom views
- **Month 1**: Average 3.5 views per user

### Usage Metrics

- **Tag Search**: 70% of tag selections use search
- **Temporal Filter**: Used by 35% of users daily
- **Custom Ranges**: 20% of timeline sessions use custom ranges

### Performance Metrics

- **View Switch**: <200ms (p95)
- **Tag Search**: <50ms (p95)
- **Filter Apply**: <300ms (p95)

### Satisfaction Metrics

- **NPS**: +8 or higher
- **Feature Satisfaction**: 4.2/5 or higher
- **Task Completion**: 95% success rate for common workflows

---

## Future Enhancements

### Phase 2 Considerations

1. **View Sharing**: Export/import view configurations
2. **Team Views**: Share views across organization
3. **View Templates**: Predefined views for common use cases
4. **Smart Views**: Dynamic filters (e.g., "Assigned to me")
5. **View Analytics**: Track which views are most used
6. **Advanced Filters**: Custom filter expressions
7. **Saved Searches**: Quick access to common tag searches
8. **Multi-Select Dates**: Non-contiguous date ranges

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| localStorage quota exceeded | High | Low | Implement quota monitoring, limit to 50 views |
| Performance with many views | Medium | Medium | Virtual scrolling for view tabs, pagination |
| Complex filter combinations | Medium | Low | Clear filter preview, validation |
| Browser compatibility | Low | Low | Polyfills for date-fns, standard APIs only |
| User confusion with views | Medium | Low | Onboarding tour, helpful tooltips |

---

## Appendix

### Related Documentation

- [Spec 001: Core Functionality](../001-cockpit-core/spec.md)
- [Spec 004: UI Improvements](../004-ui-improvements/spec.md)
- [Spec 005: Tags Feature](../005-tags-feature/spec.md)

### Design References

- [Asana Views](https://asana.com/guide/help/premium/views)
- [Notion Databases](https://www.notion.so/help/intro-to-databases)
- [react-day-picker](https://react-day-picker.js.org/)

### Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-07 | Initial specification | System |

