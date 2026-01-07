# Specification 006: Advanced Filtering & View Management

**Status**: 📋 Planning
**Created**: 2026-01-07
**Estimated Duration**: 10-12 days

---

## Overview

This specification defines advanced filtering capabilities and a comprehensive view management system inspired by modern project management tools (Notion, Asana). It introduces saved views, enhanced tag search, temporal filters, and flexible date range selection.

### Key Features

1. **🎯 View Management System**: Asana-style saved views with filter/sort/group presets
2. **🔍 Tag Search**: Fast tag filtering with search input for large tag collections
3. **⏰ Temporal Filters**: "Not updated today" and advanced date range options
4. **📅 Enhanced Timeline Filtering**: Current/previous periods, custom ranges up to 31 days

---

## Quick Links

- [📋 Implementation Plan](./plan.md) - Detailed phase-by-phase implementation strategy
- [✅ Task List](./tasks.md) - Comprehensive task breakdown
- [📖 Specification](./spec.md) - Complete technical specification

---

## Problem Statement

### Current Pain Points

1. **No View Persistence**: Users must reconfigure filters/sort/group settings every session
2. **Limited Tag Filtering**: No search capability - unusable with dozens of tags
3. **Missing Temporal Filters**: Cannot filter workstreams by update recency
4. **Basic Timeline Filters**: Limited date range options, no calendar picker

### Proposed Solutions

1. **Saved Views**: Named presets (default + custom) for filter/sort/group combinations
2. **Tag Search Input**: Real-time search in tag dropdown menus
3. **"Not Updated Today"**: Quickly find stale workstreams needing attention
4. **Advanced Date Ranges**: Calendar widget, relative periods, custom ranges

---

## User Stories

### US1: Saved Views Management
**As a** project manager  
**I want to** save my filter/sort/group configurations as named views  
**So that** I can quickly switch between different perspectives without reconfiguring

**Acceptance Criteria**:
- Default view: grouped by category, sorted by updated (newest first)
- Can create custom views with any filter/sort/group combination
- Views appear as tabs in navigation bar
- Changes to active view show save/discard options

### US2: Fast Tag Filtering
**As a** user with many tags  
**I want to** search for tags by name in filter dropdowns  
**So that** I can quickly find and select relevant tags without scrolling

**Acceptance Criteria**:
- Search input at top of tag dropdown
- Real-time filtering of tag list
- Works in both Cockpit and Timeline views
- Preserves existing multi-select behavior

### US3: Temporal Activity Filter
**As a** manager reviewing stale workstreams  
**I want to** filter for items not updated today  
**So that** I can identify workstreams needing attention

**Acceptance Criteria**:
- "Not updated today" filter option in Cockpit
- Shows workstreams with latest update before today
- Combines with other filters (category, tags)
- Clear indication when filter is active

### US4: Advanced Timeline Date Ranges
**As a** user reviewing historical activity  
**I want to** flexible date range options including calendar selection  
**So that** I can analyze activity across various time periods

**Acceptance Criteria**:
- Preset options: current/previous day/week/month
- Custom "last N days" with configurable number
- Calendar widget for selecting date ranges
- Maximum 31-day range enforcement
- Clear date range display

---

## Technical Overview

### Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Cockpit View                           │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │  View Tabs: [Default] [Old Ones] [QA Team] [+ New]   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [New Workstream] ... [Group ▼] [Sort ▼] [Filter ▼]  │  │
│  │                                    [Save] [Discard]   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Timeline View                           │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [Today] [This Week] [Custom ▼]                       │  │
│  │  [Categories ▼] [Tags ▼]                              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Models

**View Configuration**:
```typescript
interface ViewConfig {
  id: string;
  name: string;
  isDefault: boolean;
  filters: {
    categoryIds?: string[];
    tags?: string[];
    notUpdatedToday?: boolean;
  };
  sort: {
    field: 'name' | 'createdAt' | 'updatedAt';
    direction: 'asc' | 'desc';
  };
  group: 'none' | 'category';
}
```

**Timeline Date Range**:
```typescript
interface DateRangeConfig {
  type: 'preset' | 'relative' | 'absolute';
  preset?: 'current-day' | 'current-week' | 'current-month' 
          | 'previous-day' | 'previous-week' | 'previous-month';
  relative?: { days: number };
  absolute?: { from: Date; to: Date };
}
```

---

## Success Metrics

- **View Usage**: >70% of users create at least one custom view within 2 weeks
- **Tag Search**: Average tag selection time reduced by 60%
- **Temporal Filter**: "Not updated today" used daily by >40% of users
- **Timeline Ranges**: Custom date ranges used in >25% of timeline sessions

---

## Dependencies

- Existing filter infrastructure (categories, tags)
- LocalStorage API for view persistence
- Date picker library (date-fns already in use)
- React state management patterns

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. View System Backend | 2 days | View CRUD API, persistence |
| 2. View Management UI | 3 days | Tab navigation, save/discard |
| 3. Tag Search | 1.5 days | Search input in dropdowns |
| 4. Temporal Filter | 1.5 days | "Not updated today" filter |
| 5. Timeline Enhancements | 2 days | Advanced date ranges |
| 6. Testing & Polish | 2 days | E2E tests, refinements |

**Total**: 10-12 days

---

## Next Steps

1. Review and approve specification
2. Create detailed implementation plan
3. Generate task breakdown
4. Begin Phase 1 development
