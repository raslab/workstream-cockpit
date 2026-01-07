# Visual Diagrams: Advanced Filtering & View Management

**Feature ID**: 006-advanced-filtering-views  
**Created**: 2026-01-07

---

## Component Architecture

### High-Level Component Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                          Cockpit Page                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                        ViewTabs                           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │  │
│  │  │ Default  │ │ Old Ones │ │ QA Team  │ │ + New    │     │  │
│  │  │   (✓)    │ │          │ │          │ │  View    │     │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     ViewControls                          │  │
│  │                                                           │  │
│  │  ┌─────────────┐        ┌──────┐ ┌──────┐ ┌────────┐     │  │
│  │  │    New      │        │Group │ │Sort  │ │Filter  │     │  │
│  │  │ Workstream  │        │  ▼   │ │  ▼   │ │  ▼ (3) │     │  │
│  │  └─────────────┘        └──────┘ └──────┘ └────────┘     │  │
│  │                                                           │  │
│  │  (If modified)                                            │  │
│  │  ┌──────┐ ┌──────────┐ ┌─────────┐                        │  │
│  │  │ Save │ │ Save As  │ │ Discard │                        │  │
│  │  └──────┘ └──────────┘ └─────────┘                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Workstream Groups                         │  │
│  │  (Rendered based on active view configuration)            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### View Management State Flow

```
┌──────────────────┐
│  User Action     │
│  (Click View)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐      ┌──────────────────┐
│  ViewTabs        │─────▶│ useViewManager   │
│  Component       │      │  Hook            │
└──────────────────┘      └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  localStorage    │
                          │  Load views      │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  ViewConfig      │
                          │  State           │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  Cockpit Page    │
                          │  Re-render       │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  API Query       │
                          │  (with filters)  │
                          └──────────────────┘
```

### Filter Application Flow

```
┌──────────────────┐
│  User Opens      │
│  Filter Panel    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  FilterPanel     │
│  (Local State)   │
└────────┬─────────┘
         │
         │ User modifies:
         │ • Select category
         │ • Search & select tag
         │ • Check "Not updated today"
         │
         ▼
┌──────────────────┐
│  User Clicks     │
│  "Apply"         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐      ┌──────────────────┐
│  Update          │─────▶│  Detect          │
│  View Config     │      │  Changes         │
└──────────────────┘      └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  Show Save       │
                          │  Controls        │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  Re-fetch        │
                          │  Workstreams     │
                          └──────────────────┘
```

---

## UI Layout Diagrams

### Cockpit View - Default State

```
┌─────────────────────────────────────────────────────────────────┐
│                       Workstream Cockpit                        │
│                                                                 │
│  [Cockpit] [Timeline] [Archive] [Settings]            [User ▼] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Active Workstreams                                             │
├─────────────────────────────────────────────────────────────────┤
│  View Tabs:                                                     │
│  ┌───────────┬─────────────┬──────────┬────────┐                │
│  │  Default  │  Old Ones   │ QA Team  │ + New  │                │
│  │    ✓      │             │          │  View  │                │
│  └───────────┴─────────────┴──────────┴────────┘                │
├─────────────────────────────────────────────────────────────────┤
│  Controls:                                                      │
│  ┌───────────────┐      ┌─────────────────────────────────────┐ │
│  │ New Workstream│      │ Group: Category ▼ │ Sort: Updated ▼ │ │
│  └───────────────┘      │ Filter ▼                            │ │
│                         └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  🟢 Engineering (5)                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │ Workstream Card 1   │  │ Workstream Card 2   │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                 │
│  🔵 QA (3)                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │ Workstream Card 3   │  │ Workstream Card 4   │              │
│  └─────────────────────┘  └─────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Cockpit View - Unsaved Changes

```
┌─────────────────────────────────────────────────────────────────┐
│  Active Workstreams                                             │
├─────────────────────────────────────────────────────────────────┤
│  View Tabs:                                                     │
│  ┌───────────┬─────────────┬──────────┬────────┐                │
│  │  Default* │  Old Ones   │ QA Team  │ + New  │   * = modified│
│  │    ✓      │             │          │  View  │                │
│  └───────────┴─────────────┴──────────┴────────┘                │
├─────────────────────────────────────────────────────────────────┤
│  Controls:                                                      │
│  ┌───────────────┐      ┌─────────────────────────────────────┐ │
│  │ New Workstream│      │ Group: None ▼ │ Sort: Created ▼    │ │
│  └───────────────┘      │ Filter (2) ▼                        │ │
│                         └─────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Changes detected:                                         │ │
│  │  ┌──────┐  ┌───────────────┐  ┌──────────┐                 │ │
│  │  │ Save │  │ Save as new   │  │ Discard  │                 │ │
│  │  └──────┘  │     view      │  └──────────┘                 │ │
│  │            └───────────────┘                                │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Filter Panel - Expanded

```
                         ┌────────────────────────────────┐
                         │  Filters                       │
                         ├────────────────────────────────┤
                         │  Categories:                   │
                         │  ┌──────────────────────────┐  │
                         │  │ ☑ Engineering            │  │
                         │  │ ☐ QA                     │  │
                         │  │ ☐ Marketing              │  │
                         │  │ ☐ Support                │  │
                         │  └──────────────────────────┘  │
                         │                                │
                         │  Tags:                         │
                         │  ┌──────────────────────────┐  │
                         │  │ Search tags...        🔍 │  │  ← NEW!
                         │  └──────────────────────────┘  │
                         │  ┌──────────────────────────┐  │
                         │  │ ☑ #backend               │  │
                         │  │ ☐ #frontend              │  │
                         │  │ ☐ #urgent                │  │
                         │  │ ☐ #customer              │  │
                         │  └──────────────────────────┘  │
                         │                                │
                         │  Other:                        │
                         │  ┌──────────────────────────┐  │
                         │  │ ☑ Not updated today      │  │  ← NEW!
                         │  └──────────────────────────┘  │
                         │                                │
                         │  ┌───────┐ ┌────────┐ ┌─────┐ │
                         │  │ Clear │ │ Cancel │ │Apply│ │
                         │  └───────┘ └────────┘ └─────┘ │
                         └────────────────────────────────┘
```

### Tag Search - In Action

```
                         ┌────────────────────────────────┐
                         │  Tags               (3 selected)│
                         ├────────────────────────────────┤
                         │  ┌──────────────────────────┐  │
                         │  │ back_____________     🔍 │  │  ← User typing
                         │  └──────────────────────────┘  │
                         │                                │
                         │  Filtered Results:             │
                         │  ┌──────────────────────────┐  │
                         │  │ ☑ 🔴 #backend            │  │
                         │  │ ☐ 🟠 #backend-critical   │  │
                         │  └──────────────────────────┘  │
                         │                                │
                         │  (2 of 47 tags shown)          │
                         │                                │
                         │  ┌──────────────────────────┐  │
                         │  │      Clear all           │  │
                         │  └──────────────────────────┘  │
                         └────────────────────────────────┘
```

---

## Timeline View Diagrams

### Timeline - Date Range Filter

```
┌─────────────────────────────────────────────────────────────────┐
│                          Timeline                               │
│                                                                 │
│  [Cockpit] [Timeline] [Archive] [Settings]            [User ▼] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Timeline                                                       │
│  Review recent activity across all workstreams                  │
├─────────────────────────────────────────────────────────────────┤
│  Filters:                                                       │
│  ┌────────────┐ ┌─────────────┐ ┌────────┐                      │
│  │ Last 7 Days│ │ Categories ▼│ │ Tags ▼ │                      │
│  │     ▼      │ │             │ │        │                      │
│  └────────────┘ └─────────────┘ └────────┘                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  January 7, 2026 (Today)                                        │
│  • Update 1                                                     │
│  • Update 2                                                     │
│                                                                 │
│  January 6, 2026                                                │
│  • Update 3                                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Date Range Picker - All Modes

```
┌─────────────────────────────────────────────────────────────────┐
│  Select Date Range                                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐                      │
│  │ Preset  │ │ Last N   │ │ Custom Range │                      │
│  │   ✓     │ │  Days    │ │              │                      │
│  └─────────┘ └──────────┘ └──────────────┘                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PRESET MODE:                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ○ Current Day                                            │  │
│  │  ○ Current Week                                           │  │
│  │  ○ Current Month                                          │  │
│  │  ○ Previous Day                                           │  │
│  │  ● Previous Week                                          │  │
│  │  ○ Previous Month                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Showing: Dec 30, 2025 - Jan 5, 2026 (7 days)                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  LAST N DAYS MODE:                                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Quick Select:                                            │  │
│  │  ┌───┐ ┌───┐ ┌───┐ ┌────┐ ┌────┐                          │  │
│  │  │ 1 │ │ 3 │ │ 7 │ │ 14 │ │ 30 │                          │  │
│  │  └───┘ └───┘ └───┘ └────┘ └────┘                          │  │
│  │                                                            │  │
│  │  Custom:                                                   │  │
│  │  Last ┌─────┐ days   (1-31)                                │  │
│  │       │  7  │                                              │  │
│  │       └─────┘                                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Showing: Jan 1 - Jan 7, 2026 (7 days)                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  CUSTOM RANGE MODE:                                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  From: ┌──────────────┐    To: ┌──────────────┐           │  │
│  │        │ Jan 1, 2026  │        │ Jan 7, 2026  │           │  │
│  │        └──────────────┘        └──────────────┘           │  │
│  │                                                            │  │
│  │        January 2026                                        │  │
│  │    Su Mo Tu We Th Fr Sa                                    │  │
│  │              1  2  3  4                                    │  │
│  │     5  6 [7] 8  9 10 11   ← Today                          │  │
│  │    12 13 14 15 16 17 18                                    │  │
│  │    19 20 21 22 23 24 25                                    │  │
│  │    26 27 28 29 30 31                                       │  │
│  │                                                            │  │
│  │  [Selected: Jan 1 - Jan 7]                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ✓ Range: 7 days (max 31 days)                                  │
│                                                                 │
│  ⚠ Error: Range exceeds 31 days (if > 31)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Machine Diagrams

### View State Transitions

```
┌─────────────┐
│   Initial   │
│   Load      │
└──────┬──────┘
       │
       ▼
┌─────────────┐      User clicks view tab
│   Default   │──────────────────────────────┐
│   View      │                              │
│   Active    │                              ▼
└──────┬──────┘                      ┌──────────────┐
       │                             │   Custom     │
       │ User modifies               │   View       │
       │ filters/sort/group          │   Active     │
       ▼                             └──────┬───────┘
┌─────────────┐                             │
│  Modified   │◀────────────────────────────┘
│   State     │    User modifies
│ (unsaved)   │
└──────┬──────┘
       │
       │ User clicks:
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│   Save      │   │   Discard   │
│   Changes   │   │   Changes   │
└──────┬──────┘   └──────┬──────┘
       │                 │
       └────────┬────────┘
                ▼
         ┌─────────────┐
         │   Return    │
         │   to Saved  │
         │   State     │
         └─────────────┘
```

### Filter Application State

```
┌─────────────┐
│   Filters   │
│   Closed    │
└──────┬──────┘
       │ User clicks Filter button
       ▼
┌─────────────┐
│   Filter    │
│   Panel     │
│   Open      │
└──────┬──────┘
       │
       │ User makes changes
       ▼
┌─────────────┐      User clicks Cancel
│   Local     │───────────────────────────┐
│   Draft     │                           │
│   State     │                           │
└──────┬──────┘                           │
       │                                  │
       │ User clicks Apply                │
       ▼                                  │
┌─────────────┐                           │
│   Apply     │                           │
│   Filters   │                           │
└──────┬──────┘                           │
       │                                  │
       ├──────────────────────────────────┤
       │                                  │
       ▼                                  ▼
┌─────────────┐                   ┌─────────────┐
│   Update    │                   │   Discard   │
│   View      │                   │   Changes   │
│   Config    │                   └──────┬──────┘
└──────┬──────┘                          │
       │                                 │
       └────────────┬────────────────────┘
                    ▼
             ┌─────────────┐
             │   Close     │
             │   Panel     │
             └─────────────┘
```

---

## Interaction Flows

### Creating a New View

```
1. User clicks "New View" button
   ↓
2. Dialog opens with name input
   ↓
3. User types view name (e.g., "QA Team")
   ↓
4. Validation: 3-50 characters, unique name
   ↓
5. User clicks "Create"
   ↓
6. New view created with current config
   ↓
7. New tab appears in view tabs
   ↓
8. View becomes active
   ↓
9. Saved to localStorage
```

### Modifying and Saving a View

```
1. User is on "Default" view
   ↓
2. User opens Filter panel
   ↓
3. User selects "QA" category
   ↓
4. User searches for "#qa" tag and selects it
   ↓
5. User checks "Not updated today"
   ↓
6. User clicks "Apply"
   ↓
7. Filters applied, results update
   ↓
8. Save controls appear (unsaved changes detected)
   ↓
9. User clicks "Save As"
   ↓
10. Dialog: "Save as new view"
    ↓
11. User names it "QA Team"
    ↓
12. New view created and activated
    ↓
13. "QA Team" tab now visible
```

### Using Tag Search

```
1. User opens "Tags" dropdown
   ↓
2. Dropdown shows all 47 tags
   ↓
3. Search input is auto-focused
   ↓
4. User types "back"
   ↓
5. List filters to show:
   - #backend
   - #backend-critical
   ↓
6. User clicks checkbox for #backend
   ↓
7. Tag selected
   ↓
8. Search clears (optional)
   ↓
9. User can continue selecting or close dropdown
```

### Selecting Date Range in Timeline

```
1. User clicks date range dropdown
   ↓
2. Picker opens in "Preset" mode
   ↓
3. User clicks "Custom Range" tab
   ↓
4. Calendar widget appears
   ↓
5. User clicks Jan 1 (from date)
   ↓
6. User clicks Jan 31 (to date)
   ↓
7. Validation runs: 31 days ✓
   ↓
8. Range display shows: "Jan 1 - Jan 31, 2026 (31 days)"
   ↓
9. User clicks Apply
   ↓
10. Timeline updates with data from range
```

---

## Data Persistence Diagram

### localStorage Structure

```
localStorage
├── "workstream_cockpit_views" ─────┐
│                                    │
│   {                                │
│     version: 1,                    │
│     defaultViewId: "default",      │
│     activeViewId: "custom_1",      │
│     lastModified: "2026-01-07...", │
│     views: [                       │
│       {                            │
│         id: "default",             │
│         name: "Default View",      │
│         isDefault: true,           │
│         createdAt: "...",          │
│         updatedAt: "...",          │
│         config: {                  │
│           filters: {               │
│             categoryIds: [],       │
│             tags: [],              │
│             temporal: {            │
│               notUpdatedToday: false
│             }                      │
│           },                       │
│           sort: {                  │
│             field: "updatedAt",    │
│             direction: "desc"      │
│           },                       │
│           group: {                 │
│             by: "category"         │
│           }                        │
│         }                          │
│       },                           │
│       {                            │
│         id: "custom_1",            │
│         name: "QA Team",           │
│         isDefault: false,          │
│         config: { ... }            │
│       }                            │
│     ]                              │
│   }                                │
│                                    │
└────────────────────────────────────┘
```

---

## Error States & Edge Cases

### View Management Errors

```
┌─────────────────────────────────────┐
│  Cannot create view                 │
├─────────────────────────────────────┤
│  ⚠ View name too short (< 3 chars)  │
│  ⚠ View name too long (> 50 chars)  │
│  ⚠ Duplicate view name              │
│  ⚠ Maximum 50 views reached         │
│  ⚠ localStorage quota exceeded      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Unsaved changes warning            │
├─────────────────────────────────────┤
│  You have unsaved changes.          │
│  Do you want to:                    │
│                                     │
│  [Save] [Discard] [Cancel]          │
└─────────────────────────────────────┘
```

### Tag Search Edge Cases

```
┌─────────────────────────────────────┐
│  No tags found                      │
├─────────────────────────────────────┤
│  🔍 "xyz"                            │
│                                     │
│  No tags match your search.         │
│                                     │
│  Try a different search term.       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  No tags available                  │
├─────────────────────────────────────┤
│  No tags have been created yet.     │
│                                     │
│  Create tags in Settings.           │
└─────────────────────────────────────┘
```

### Date Range Errors

```
┌─────────────────────────────────────┐
│  Invalid date range                 │
├─────────────────────────────────────┤
│  ⚠ Range exceeds 31 days            │
│                                     │
│  Selected: 45 days                  │
│  Maximum: 31 days                   │
│                                     │
│  Please select a shorter range.     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Invalid from/to dates              │
├─────────────────────────────────────┤
│  ⚠ From date must be before To date │
│                                     │
│  From: Jan 10, 2026                 │
│  To:   Jan 1, 2026                  │
└─────────────────────────────────────┘
```

---

## Responsive Layouts

### Mobile View (< 768px)

```
┌─────────────────────┐
│  Workstream Cockpit │
├─────────────────────┤
│  ☰ Menu             │
└─────────────────────┘

┌─────────────────────┐
│  Views:             │
│  ┌────────────────┐ │
│  │ Default ▼      │ │
│  └────────────────┘ │
│  (Dropdown select)  │
└─────────────────────┘

┌─────────────────────┐
│  ┌────────────────┐ │
│  │ New Workstream │ │
│  └────────────────┘ │
│  ┌────────────────┐ │
│  │ Filters (3) ▼  │ │
│  └────────────────┘ │
│  (Stacked buttons)  │
└─────────────────────┘

┌─────────────────────┐
│  🟢 Engineering     │
│  ┌────────────────┐ │
│  │  Workstream 1  │ │
│  └────────────────┘ │
│  (Single column)    │
└─────────────────────┘
```

### Tablet View (768px - 1024px)

```
┌──────────────────────────────────┐
│  Active Workstreams              │
├──────────────────────────────────┤
│  [Default] [Old Ones] [QA] [+]   │
├──────────────────────────────────┤
│  [New] [Group▼] [Sort▼] [Filter▼]│
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  🟢 Engineering                   │
│  ┌─────────────┐ ┌─────────────┐ │
│  │ Workstream  │ │ Workstream  │ │
│  └─────────────┘ └─────────────┘ │
│  (Two columns)                    │
└──────────────────────────────────┘
```

---

## Accessibility Annotations

### ARIA Labels

```tsx
// View Tab
<button
  role="tab"
  aria-selected={isActive}
  aria-label="Default view, 5 workstreams"
>
  Default
</button>

// Filter Button
<button
  aria-label="Open filters, 3 active filters"
  aria-expanded={isOpen}
  aria-controls="filter-panel"
>
  Filter (3)
</button>

// Tag Search Input
<input
  type="text"
  role="searchbox"
  aria-label="Search tags"
  aria-describedby="search-results-count"
/>
<span id="search-results-count" role="status" aria-live="polite">
  5 tags found
</span>

// Date Range
<div
  role="group"
  aria-label="Date range selector"
>
  <button aria-label="Current day">Current Day</button>
  <button aria-label="Current week">Current Week</button>
</div>
```

### Keyboard Navigation

```
View Tabs:
  Left Arrow  → Previous view
  Right Arrow → Next view
  Enter       → Activate view
  Delete      → Delete custom view (with confirmation)

Filter Panel:
  Tab         → Next control
  Shift+Tab   → Previous control
  Space       → Toggle checkbox
  Escape      → Close panel (discard changes)

Tag Search:
  Type        → Filter tags
  ArrowDown   → Next tag
  ArrowUp     → Previous tag
  Space       → Toggle selection
  Escape      → Clear search

Calendar:
  ArrowKeys   → Navigate dates
  Enter       → Select date
  PageUp/Down → Previous/Next month
  Home        → First day of month
  End         → Last day of month
```

---

This completes the visual diagrams documentation!
