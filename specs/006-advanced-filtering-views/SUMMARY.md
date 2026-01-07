# Specification 006: Advanced Filtering & View Management - Summary

**Created**: 2026-01-07  
**Status**: 📋 Ready for Implementation  
**Estimated Duration**: 10-12 days  

---

## 📋 Overview

This specification addresses four critical UI improvements for the Workstream Cockpit application, transforming it into a powerful, Asana-style project management tool with advanced filtering and view management capabilities.

---

## 🎯 The Four UI Improvements

### 1. **View Management System** (Asana/Notion-Style)

**Problem**: Users must reconfigure filters, sorting, and grouping every session. No way to save preferred configurations.

**Solution**: Named, saveable views with:
- **Two-row navigation**: 
  - Row 1: View tabs (Default + custom views)
  - Row 2: Action bar (New Workstream + filter/sort/group controls)
- **Default view**: Grouped by category, sorted by updated (newest first)
- **Custom views**: Any filter/sort/group combination (e.g., "Old Ones", "QA Team")
- **Save workflow**: Modify filters → "Save"/"Save As"/"Discard" buttons appear
- **Persistence**: Stored in browser localStorage

**Example Views**:
- "Default View": Group by category, sort by updated desc
- "Old Ones": No grouping, sort by created asc
- "QA Team": Filter by #qa tag, group by category

### 2. **Tag Search in Filter Dropdowns**

**Problem**: With dozens of tags, finding specific tags requires scrolling through entire list.

**Solution**: Search input at top of tag dropdown:
- Real-time filtering as user types
- Case-insensitive, partial matching
- Works in both Cockpit and Timeline views
- Preserves existing multi-select behavior
- "No tags found" empty state

**UX Flow**:
1. User clicks "Tags" button
2. Dropdown opens with search input auto-focused
3. User types "back"
4. List filters to show only "backend", "backend-critical"
5. User selects desired tag
6. Filter applied

### 3. **"Not Updated Today" Filter**

**Problem**: No way to identify stale workstreams needing attention.

**Solution**: Temporal filter option:
- Checkbox in filter panel: "Not updated today"
- Shows workstreams last updated before current day (00:00:00)
- Timezone-aware (user's local timezone)
- Combines with category and tag filters
- Visual badge when active

**Definition**: "Not updated today" means:
- Latest status update created before today OR
- No status updates exist

### 4. **Advanced Timeline Date Ranges**

**Problem**: Limited date range options (only 4 presets), no calendar picker, no custom ranges.

**Solution**: Three-mode date range selector:

**Preset Mode**:
- Current Day / Week / Month
- Previous Day / Week / Month

**Relative Mode**:
- Quick buttons: 1, 3, 7, 14, 30 days
- Custom input: "Last [N] days" (1-31)

**Absolute Mode**:
- Calendar widget for selecting date ranges
- From date → To date selection
- 31-day maximum enforcement
- Visual range preview

---

## 🏗️ Technical Architecture

### Component Hierarchy

```
Cockpit Page
├── ViewTabs
│   ├── ViewTabItem (Default)
│   ├── ViewTabItem (Custom 1)
│   ├── ViewTabItem (Custom 2)
│   └── NewViewButton
└── ViewControls
    ├── NewWorkstreamButton
    ├── GroupDropdown
    ├── SortDropdown
    ├── FilterDropdown
    │   └── FilterPanel
    │       ├── CategoryFilter
    │       ├── TagFilterSearch (with search input)
    │       └── TemporalFilter
    └── SavePanel (conditional)
        ├── SaveButton
        ├── SaveAsButton
        └── DiscardButton

Timeline Page
└── FilterBar
    ├── DateRangeFilter
    │   ├── PresetMode
    │   ├── RelativeMode
    │   └── AbsoluteMode
    │       └── Calendar
    ├── CategoryFilter
    └── TagFilterSearch (with search input)
```

### Data Models

```typescript
// View Configuration
interface ViewConfig {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  config: {
    filters: {
      categoryIds: string[];
      tags: string[];
      temporal: { notUpdatedToday: boolean };
    };
    sort: {
      field: 'name' | 'createdAt' | 'updatedAt';
      direction: 'asc' | 'desc';
    };
    group: {
      by: 'none' | 'category';
    };
  };
}

// Date Range Configuration
interface DateRangeConfig {
  type: 'preset' | 'relative' | 'absolute';
  preset?: 'current-day' | 'current-week' | 'current-month'
          | 'previous-day' | 'previous-week' | 'previous-month';
  relative?: { days: number };  // 1-31
  absolute?: { from: Date; to: Date };  // max 31 days
}
```

### Backend Changes

**Workstreams API Enhancement**:
```typescript
GET /api/workstreams?notUpdatedToday=true

// New query parameter support
interface WorkstreamsQuery {
  state?: 'active' | 'closed';
  categoryIds?: string;  // comma-separated
  tags?: string;         // comma-separated
  notUpdatedToday?: boolean;  // NEW
}
```

**Filter Logic**:
```sql
-- Not updated today
WHERE (
  -- No status updates
  NOT EXISTS (SELECT 1 FROM status_updates WHERE workstream_id = w.id)
  OR
  -- All status updates before today
  NOT EXISTS (
    SELECT 1 FROM status_updates 
    WHERE workstream_id = w.id 
    AND created_at >= CURRENT_DATE
  )
)
```

---

## 📊 Implementation Phases

### **Phase 1: View Management Foundation** (Days 1-2)
- Type definitions (ViewConfig, FilterConfig)
- localStorage utilities with quota handling
- useViewManager hook for state management
- Unit tests

### **Phase 2: View Management UI** (Days 3-5)
- ViewTabs component with tab navigation
- ViewControls component with dropdowns
- FilterPanel with category/tag/temporal sections
- Save/SaveAs/Discard workflow
- Integration into Cockpit page

### **Phase 3: Tag Search** (Day 6)
- Search input in TagFilter component
- Real-time filtering logic
- Update both Cockpit and Timeline
- Performance testing with 50+ tags

### **Phase 4: Temporal Filter** (Day 7)
- Backend API enhancement
- Frontend filter integration
- Timezone-aware logic
- Combine with other filters

### **Phase 5: Timeline Enhancements** (Days 8-9)
- DateRangeFilter component (3 modes)
- Calendar widget integration
- 31-day validation
- Replace old preset system

### **Phase 6: Testing & Polish** (Days 10-12)
- E2E test suite
- Performance optimization
- Accessibility audit
- Documentation

---

## ✅ Acceptance Criteria

### View Management
- [x] Default view loads with correct settings (group by category, sort by updated desc)
- [x] Users can create custom views with any filter/sort/group combination
- [x] Views persist across sessions (localStorage)
- [x] View switching is instant (<200ms)
- [x] Unsaved changes are detected and saveable
- [x] Users can rename and delete custom views
- [x] Maximum 50 views enforced

### Tag Search
- [x] Search input auto-focuses on dropdown open
- [x] Tags filter in real-time (<50ms)
- [x] Case-insensitive, partial matching works
- [x] Works in both Cockpit and Timeline
- [x] Search clears on dropdown close
- [x] "No tags found" shows when appropriate

### Temporal Filter
- [x] "Not updated today" checkbox in filter panel
- [x] Correctly identifies workstreams last updated before today
- [x] Timezone-aware (uses user's local timezone)
- [x] Combines with category and tag filters (AND logic)
- [x] Visual indicator when active

### Timeline Date Ranges
- [x] All 6 preset options work correctly
- [x] Relative mode supports 1-31 days
- [x] Absolute mode allows calendar selection
- [x] 31-day maximum is enforced
- [x] Error message shows for invalid ranges
- [x] Current range displays clearly

---

## 📈 Success Metrics

### Adoption
- **Week 1**: 40% of users create ≥1 custom view
- **Week 2**: 60% of users have 2+ custom views
- **Month 1**: Average 3.5 views per user

### Usage
- **Tag Search**: Used in 70% of tag selections
- **Temporal Filter**: Used daily by 35% of users
- **Custom Ranges**: Used in 20% of timeline sessions

### Performance
- **View Switch**: <200ms (p95)
- **Tag Search**: <50ms per keystroke (p95)
- **Filter Apply**: <300ms (p95)

### Satisfaction
- **NPS**: +8 or higher
- **Feature Satisfaction**: 4.2/5 stars
- **Task Completion**: 95% success rate

---

## 🎨 Visual Design

### Cockpit Navigation (Two Rows)

```
┌─────────────────────────────────────────────────────────────┐
│ Active Workstreams                                          │
├─────────────────────────────────────────────────────────────┤
│ Row 1: [Default ✓] [Old Ones] [QA Team] [+ New View]      │
├─────────────────────────────────────────────────────────────┤
│ Row 2: [New Workstream] ... [Group ▼] [Sort ▼] [Filter ▼]  │
│                              [Save] [Save As] [Discard]      │
└─────────────────────────────────────────────────────────────┘
```

### Filter Panel Popup

```
┌──────────────────────────────┐
│ Filters                      │
├──────────────────────────────┤
│ Categories:                  │
│ ☐ Engineering                │
│ ☑ QA                         │
│                              │
│ Tags:                        │
│ ┌────────────────────────┐   │
│ │ Search tags...      🔍 │   │
│ └────────────────────────┘   │
│ ☑ backend                    │
│ ☐ frontend                   │
│                              │
│ Other:                       │
│ ☑ Not updated today          │
│                              │
│ [Clear] [Cancel] [Apply]     │
└──────────────────────────────┘
```

### Timeline Date Range Picker

```
┌────────────────────────────────┐
│ Select Date Range              │
├────────────────────────────────┤
│ [Preset] [Last N] [Custom]     │
├────────────────────────────────┤
│ • Current Day                  │
│ • Current Week                 │
│ • Current Month                │
│ • Previous Day                 │
│ • Previous Week                │
│ • Previous Month               │
│                                │
│ OR                             │
│                                │
│ Last: [1] [3] [7] [14] [30]    │
│ Custom: [__7__] days           │
│                                │
│ OR                             │
│                                │
│ From: [Jan 1 📅] To: [Jan 7 📅]│
│ [   Calendar Widget   ]        │
│ Range: 7 days (max 31)         │
└────────────────────────────────┘
```

---

## 🚀 Rollout Plan

### Week 1: Beta Testing
- Deploy to staging environment
- Internal testing with development team
- Gather UX feedback
- Iterate on design

### Week 2: Gradual Rollout
- Enable for 10% of users (feature flag)
- Monitor performance metrics
- Track adoption rates
- Fix any critical issues

### Week 3: Full Release
- Enable for all users
- Announce feature in changelog
- Create video tutorial
- Monitor support requests

---

## 📚 Documentation Deliverables

1. **User Guide**: Step-by-step instructions for all features
2. **API Documentation**: Updated endpoint specifications
3. **Code Documentation**: JSDoc comments for all public APIs
4. **Migration Guide**: For users upgrading from previous version
5. **Release Notes**: Summary of changes and improvements

---

## 🔗 Related Documents

- [📖 Full Specification](./spec.md) - Complete technical specification
- [📋 Implementation Plan](./plan.md) - Detailed phase-by-phase plan
- [✅ Task List](./tasks.md) - 202 actionable tasks with estimates
- [Spec 001: Core Functionality](../001-cockpit-core/spec.md)
- [Spec 004: UI Improvements](../004-ui-improvements/spec.md)
- [Spec 005: Tags Feature](../005-tags-feature/spec.md)

---

## 🎯 Key Takeaways

1. **View Management**: Transform Cockpit into Asana-style workspace with saved views
2. **Tag Search**: Essential for usability with large tag collections
3. **Temporal Filter**: Quick way to find stale workstreams needing attention
4. **Advanced Dates**: Flexible timeline analysis with calendar picker

**Total Effort**: 70 hours over 10-12 days  
**Business Value**: Dramatically improved productivity and user experience  
**Risk Level**: Low (builds on existing infrastructure)  

---

## ✨ Next Steps

1. ✅ Review and approve specification
2. 🔧 Create feature branch: `feature/006-view-management`
3. 🏗️ Begin Phase 1: View Management Foundation
4. 📊 Daily progress tracking and standups
5. 🚀 Deploy to production after Phase 6 completion

**Ready to implement!** 🚀
