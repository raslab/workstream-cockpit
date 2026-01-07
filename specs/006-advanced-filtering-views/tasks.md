# Tasks: Advanced Filtering & View Management

**Feature ID**: 006-advanced-filtering-views
**Version**: 1.0
**Status**: Planning
**Created**: 2026-01-07

---

## Task Legend

- `[ ]` = Not started
- `[P]` = Priority task (blocking)
- `[US#]` = User Story reference
- Time estimates in hours

---

## Phase 1: View Management Foundation (Days 1-2, 9 hours)

### Type Definitions

- [ ] T001 [P] [US1] Create `frontend/src/types/view.ts` with ViewConfig interface (0.5h)
- [ ] T002 [P] [US1] Create `frontend/src/types/filter.ts` with FilterConfig types (0.5h)
- [ ] T003 [P] [US1] Add ViewStorage interface with version field (0.5h)
- [ ] T004 [P] [US1] Define SortConfig and GroupConfig types (0.5h)

### LocalStorage Implementation

- [ ] T005 [P] [US1] Create `frontend/src/utils/viewStorage.ts` (0.5h)
- [ ] T006 [P] [US1] Implement loadViewsFromStorage with error handling (1h)
- [ ] T007 [P] [US1] Implement saveViewsToStorage with quota exceeded handling (1h)
- [ ] T008 [P] [US1] Create getDefaultStorage function with default view (0.5h)
- [ ] T009 [P] [US1] Implement migrateViewStorage for schema versioning (0.5h)
- [ ] T010 [P] [US1] Add generateViewId utility function (0.25h)
- [ ] T011 [P] [US1] Enforce MAX_VIEWS limit (50 views) (0.5h)

### View Manager Hook

- [ ] T012 [P] [US1] Create `frontend/src/hooks/useViewManager.ts` (0.5h)
- [ ] T013 [P] [US1] Implement view state management with useState (0.5h)
- [ ] T014 [P] [US1] Add useEffect for loading views on mount (0.5h)
- [ ] T015 [P] [US1] Add useEffect for persisting views on change (0.5h)
- [ ] T016 [P] [US1] Implement createView function (0.5h)
- [ ] T017 [P] [US1] Implement updateView function (0.5h)
- [ ] T018 [P] [US1] Implement deleteView function with validation (0.5h)
- [ ] T019 [P] [US1] Implement switchView function (0.5h)
- [ ] T020 [P] [US1] Implement hasUnsavedChanges detection with isEqual (0.5h)
- [ ] T021 [P] [US1] Implement saveCurrentView function (0.25h)
- [ ] T022 [P] [US1] Implement discardChanges function (0.25h)
- [ ] T023 [P] [US1] Implement renameView function (0.25h)

### Unit Tests

- [ ] T024 [P] [US1] Create tests for viewStorage utilities (1h)
- [ ] T025 [P] [US1] Create tests for useViewManager hook (2h)
- [ ] T026 [US1] Test quota exceeded error handling (0.5h)
- [ ] T027 [US1] Test view CRUD operations (1h)
- [ ] T028 [US1] Test unsaved changes detection (0.5h)

---

## Phase 2: View Management UI (Days 3-5, 16 hours)

### View Tabs Component

- [ ] T029 [P] [US1] Create `frontend/src/components/ViewManagement/` directory (0.1h)
- [ ] T030 [P] [US1] Create ViewTabs.tsx component skeleton (0.5h)
- [ ] T031 [P] [US1] Implement view tabs rendering with map (0.5h)
- [ ] T032 [P] [US1] Add "New View" button with icon (0.25h)
- [ ] T033 [P] [US1] Style tabs with Asana-like design (1h)
- [ ] T034 [P] [US1] Add horizontal scrolling for overflow tabs (0.5h)
- [ ] T035 [US1] Implement tab overflow menu (1h)

### View Tab Item Component

- [ ] T036 [P] [US1] Create ViewTabItem.tsx component (0.5h)
- [ ] T037 [P] [US1] Implement active/inactive states (0.5h)
- [ ] T038 [P] [US1] Add hover actions (edit, delete) (0.5h)
- [ ] T039 [P] [US1] Implement inline edit mode (1h)
- [ ] T040 [P] [US1] Add keyboard shortcuts (Enter, Escape) (0.5h)
- [ ] T041 [US1] Add delete confirmation dialog (0.5h)
- [ ] T042 [US1] Prevent default view deletion (0.25h)

### View Create Dialog

- [ ] T043 [P] [US1] Create ViewCreateDialog.tsx component (0.5h)
- [ ] T044 [P] [US1] Add name input with validation (3-50 chars) (0.5h)
- [ ] T045 [P] [US1] Check for duplicate view names (0.5h)
- [ ] T046 [P] [US1] Implement save/cancel actions (0.5h)
- [ ] T047 [US1] Add keyboard navigation (Tab, Enter, Escape) (0.25h)

### View Controls Component

- [ ] T048 [P] [US1] Create ViewControls.tsx component (0.5h)
- [ ] T049 [P] [US1] Add "New Workstream" button at left (0.25h)
- [ ] T050 [P] [US1] Implement Group dropdown button (0.5h)
- [ ] T051 [P] [US1] Implement Sort dropdown button (0.5h)
- [ ] T052 [P] [US1] Implement Filter dropdown button (0.5h)
- [ ] T053 [P] [US1] Add active filter count badge (0.25h)
- [ ] T054 [P] [US1] Show save controls conditionally (0.5h)
- [ ] T055 [P] [US1] Implement Save button action (0.25h)
- [ ] T056 [P] [US1] Implement Save As button with dialog (0.5h)
- [ ] T057 [P] [US1] Implement Discard button action (0.25h)

### Sort Menu Component

- [ ] T058 [US1] Create SortMenu.tsx component (0.5h)
- [ ] T059 [US1] Add sort field options (Name, Created, Updated) (0.5h)
- [ ] T060 [US1] Add sort direction toggle (asc/desc) (0.5h)
- [ ] T061 [US1] Style with current selection highlight (0.25h)

### Filter Panel Component

- [ ] T062 [P] [US1] Create FilterPanel.tsx component (0.5h)
- [ ] T063 [P] [US1] Add Categories section with checkboxes (1h)
- [ ] T064 [P] [US1] Add Tags section (placeholder for Phase 3) (0.5h)
- [ ] T065 [P] [US1] Add Temporal section (placeholder for Phase 4) (0.5h)
- [ ] T066 [P] [US1] Implement local state for draft filters (0.5h)
- [ ] T067 [P] [US1] Add Apply button to commit changes (0.25h)
- [ ] T068 [P] [US1] Add Clear All button (0.25h)
- [ ] T069 [P] [US1] Add Cancel button (0.25h)
- [ ] T070 [US1] Style with max-height and scrolling (0.5h)

### Cockpit Integration

- [ ] T071 [P] [US1] Update Cockpit.tsx to import useViewManager (0.25h)
- [ ] T072 [P] [US1] Replace existing state with view config (1h)
- [ ] T073 [P] [US1] Add ViewTabs component to Cockpit (0.5h)
- [ ] T074 [P] [US1] Add ViewControls component to Cockpit (0.5h)
- [ ] T075 [P] [US1] Update useWorkstreams to use view filters (0.5h)
- [ ] T076 [P] [US1] Remove old filter/sort/group UI (0.5h)
- [ ] T077 [US1] Test view switching in Cockpit (1h)

### Component Tests

- [ ] T078 [P] [US1] Create tests for ViewTabs component (1h)
- [ ] T079 [P] [US1] Create tests for ViewTabItem component (1h)
- [ ] T080 [US1] Create tests for ViewCreateDialog component (0.5h)
- [ ] T081 [P] [US1] Create tests for ViewControls component (1h)
- [ ] T082 [P] [US1] Create tests for FilterPanel component (1h)
- [ ] T083 [US1] Integration test for Cockpit with views (2h)

---

## Phase 3: Tag Search Enhancement (Day 6, 5 hours)

### Tag Filter Updates

- [ ] T084 [P] [US2] Add searchQuery state to TagFilter.tsx (0.25h)
- [ ] T085 [P] [US2] Create search input in dropdown header (0.5h)
- [ ] T086 [P] [US2] Implement filteredTags useMemo with search logic (0.5h)
- [ ] T087 [P] [US2] Update tag list to use filteredTags (0.25h)
- [ ] T088 [P] [US2] Add "No tags found" empty state (0.25h)
- [ ] T089 [P] [US2] Auto-focus search input on dropdown open (0.25h)
- [ ] T090 [P] [US2] Clear search on dropdown close (0.25h)
- [ ] T091 [US2] Add search input ref for focus management (0.25h)
- [ ] T092 [US2] Style search input with border and padding (0.25h)

### Timeline Tag Filter

- [ ] T093 [P] [US2] Update FilterBar.tsx tag section (0.5h)
- [ ] T094 [P] [US2] Add search input to Timeline tag dropdown (0.5h)
- [ ] T095 [P] [US2] Implement same filtering logic (0.5h)
- [ ] T096 [US2] Ensure consistent styling (0.25h)

### Testing

- [ ] T097 [P] [US2] Create tests for tag search functionality (1h)
- [ ] T098 [US2] Test search with various queries (empty, partial, full) (0.5h)
- [ ] T099 [US2] Test keyboard navigation in search (0.5h)
- [ ] T100 [US2] Performance test with 50+ tags (0.5h)
- [ ] T101 [US2] Test search clearing on dropdown close (0.25h)

---

## Phase 4: Temporal Filter (Day 7, 5 hours)

### Backend Implementation

- [ ] T102 [P] [US3] Update workstreams route to accept notUpdatedToday param (0.5h)
- [ ] T103 [P] [US3] Update GetWorkstreamsFilters interface (0.25h)
- [ ] T104 [P] [US3] Implement temporal filter logic in workstreamService (1h)
- [ ] T105 [P] [US3] Handle workstreams with no status updates (0.5h)
- [ ] T106 [P] [US3] Use startOfDay for timezone-aware filtering (0.25h)

### Frontend Implementation

- [ ] T107 [P] [US3] Update useWorkstreams hook to accept notUpdatedToday (0.25h)
- [ ] T108 [P] [US3] Add notUpdatedToday to query params (0.25h)
- [ ] T109 [P] [US3] Update FilterConfig type to include temporal (0.25h)
- [ ] T110 [P] [US3] Add temporal checkbox to FilterPanel (0.5h)
- [ ] T111 [P] [US3] Show helper text when temporal filter active (0.25h)
- [ ] T112 [US3] Update filter count badge to include temporal (0.25h)

### Testing

- [ ] T113 [P] [US3] Create backend unit tests for temporal filter (1h)
- [ ] T114 [P] [US3] Create integration test for workstreams API (1h)
- [ ] T115 [US3] Create frontend tests for temporal filter (0.5h)
- [ ] T116 [US3] E2E test for temporal filter workflow (1h)
- [ ] T117 [US3] Test timezone edge cases (0.5h)

---

## Phase 5: Timeline Date Range Enhancements (Days 8-9, 10 hours)

### Type Definitions

- [ ] T118 [P] [US4] Create `frontend/src/types/dateRange.ts` (0.5h)
- [ ] T119 [P] [US4] Define DateRangeConfig interface (0.25h)
- [ ] T120 [P] [US4] Define DatePreset type (0.25h)
- [ ] T121 [US4] Add validation types for date ranges (0.25h)

### Date Range Utilities

- [ ] T122 [P] [US4] Create `frontend/src/utils/dateRangeCalculator.ts` (0.5h)
- [ ] T123 [P] [US4] Implement calculateDateRange function (1h)
- [ ] T124 [P] [US4] Implement getPresetRange for all presets (1h)
- [ ] T125 [P] [US4] Add date range validation (max 31 days) (0.5h)
- [ ] T126 [US4] Add timezone handling (0.5h)

### Calendar Component

- [ ] T127 [P] [US4] Install react-day-picker dependency (0.1h)
- [ ] T128 [P] [US4] Create `frontend/src/components/DatePicker/` directory (0.1h)
- [ ] T129 [P] [US4] Create Calendar.tsx component wrapper (1h)
- [ ] T130 [P] [US4] Implement date range selection (1h)
- [ ] T131 [P] [US4] Add validation for max 31-day range (0.5h)
- [ ] T132 [P] [US4] Style calendar widget (0.5h)
- [ ] T133 [US4] Add keyboard navigation (0.5h)

### Date Range Filter Component

- [ ] T134 [P] [US4] Create DateRangeFilter.tsx component (0.5h)
- [ ] T135 [P] [US4] Add mode selector tabs (Preset, Relative, Absolute) (0.5h)
- [ ] T136 [P] [US4] Implement Preset mode with buttons (1h)
- [ ] T137 [P] [US4] Implement Relative mode with day buttons (0.5h)
- [ ] T138 [P] [US4] Add custom days input field (0.5h)
- [ ] T139 [P] [US4] Implement Absolute mode with Calendar (0.5h)
- [ ] T140 [P] [US4] Add date range preview display (0.5h)
- [ ] T141 [P] [US4] Implement validation and error messages (0.5h)
- [ ] T142 [US4] Style component to match design (1h)

### Timeline Integration

- [ ] T143 [P] [US4] Update Timeline.tsx to use DateRangeFilter (0.5h)
- [ ] T144 [P] [US4] Replace preset buttons with new component (0.5h)
- [ ] T145 [P] [US4] Update FilterBar.tsx layout (0.5h)
- [ ] T146 [P] [US4] Update useTimeline hook for new date format (0.5h)
- [ ] T147 [P] [US4] Add current range display to Timeline header (0.5h)
- [ ] T148 [US4] Remove old preset logic (0.25h)

### Testing

- [ ] T149 [P] [US4] Create tests for dateRangeCalculator utilities (1h)
- [ ] T150 [P] [US4] Create tests for Calendar component (1h)
- [ ] T151 [P] [US4] Create tests for DateRangeFilter component (1.5h)
- [ ] T152 [US4] Test all preset calculations (0.5h)
- [ ] T153 [US4] Test relative day ranges (1-31) (0.5h)
- [ ] T154 [US4] Test absolute range validation (0.5h)
- [ ] T155 [US4] Test 31-day maximum enforcement (0.5h)
- [ ] T156 [US4] Integration test for Timeline with ranges (1h)

---

## Phase 6: Testing & Polish (Days 10-12, 16 hours)

### E2E Test Suite

- [ ] T157 [P] Create `frontend/tests/e2e/` directory structure (0.1h)
- [ ] T158 [P] Create viewManagement.spec.ts with test scenarios (2h)
- [ ] T159 [P] Test: Create custom view workflow (1h)
- [ ] T160 [P] Test: Switch between views (0.5h)
- [ ] T161 [P] Test: Rename view (0.5h)
- [ ] T162 [P] Test: Delete view (0.5h)
- [ ] T163 [P] Test: Unsaved changes handling (1h)
- [ ] T164 [P] Create tagSearch.spec.ts (1h)
- [ ] T165 [P] Test: Tag search with large dataset (0.5h)
- [ ] T166 [P] Test: Tag selection via search (0.5h)
- [ ] T167 Create temporalFilter.spec.ts (1h)
- [ ] T168 Test: Apply temporal filter (0.5h)
- [ ] T169 Test: Combine temporal with other filters (0.5h)
- [ ] T170 Create timelineRanges.spec.ts (1h)
- [ ] T171 Test: Select preset range (0.5h)
- [ ] T172 Test: Select relative range (0.5h)
- [ ] T173 Test: Select absolute range with calendar (0.5h)
- [ ] T174 Test: 31-day validation (0.5h)

### Performance Optimization

- [ ] T175 [P] Profile view switching performance (1h)
- [ ] T176 [P] Optimize tag search filtering with debounce (1h)
- [ ] T177 Implement virtual scrolling for large tag lists (2h)
- [ ] T178 Optimize localStorage read/write operations (1h)
- [ ] T179 Measure and optimize component render times (1h)
- [ ] T180 Add performance monitoring hooks (0.5h)

### Accessibility Audit

- [ ] T181 [P] Test keyboard navigation for view tabs (1h)
- [ ] T182 [P] Test keyboard navigation for filter controls (1h)
- [ ] T183 [P] Add ARIA labels to all interactive elements (1h)
- [ ] T184 [P] Implement focus management for modals (0.5h)
- [ ] T185 Test screen reader compatibility (1h)
- [ ] T186 Verify color contrast ratios (0.5h)
- [ ] T187 Add accessible form validation messages (0.5h)
- [ ] T188 Test with axe DevTools (0.5h)

### Documentation

- [ ] T189 [P] Create USER_GUIDE.md for view management (2h)
- [ ] T190 [P] Update main README with feature overview (0.5h)
- [ ] T191 Add JSDoc comments to all public functions (2h)
- [ ] T192 Create code examples for common use cases (1h)
- [ ] T193 Document localStorage schema (0.5h)
- [ ] T194 Create migration guide for existing users (0.5h)

### Final Review & Launch

- [ ] T195 [P] Code review with team (2h)
- [ ] T196 [P] QA testing session (2h)
- [ ] T197 [P] Fix reported bugs (4h)
- [ ] T198 Performance testing and optimization (2h)
- [ ] T199 Prepare release notes (1h)
- [ ] T200 Deploy to staging (0.5h)
- [ ] T201 User acceptance testing (2h)
- [ ] T202 Deploy to production (0.5h)

---

## Summary

**Total Tasks**: 202
**Total Estimated Time**: ~70 hours
**Estimated Duration**: 10-12 working days

### Breakdown by Phase

| Phase | Tasks | Hours | Days |
|-------|-------|-------|------|
| Phase 1: View Foundation | 28 | 9 | 1-2 |
| Phase 2: View UI | 55 | 16 | 3-5 |
| Phase 3: Tag Search | 18 | 5 | 6 |
| Phase 4: Temporal Filter | 16 | 5 | 7 |
| Phase 5: Timeline Ranges | 39 | 10 | 8-9 |
| Phase 6: Testing & Polish | 46 | 16 | 10-12 |

### Priority Tasks (Blocking)

**Phase 1**: T001-T023 (Core infrastructure)
**Phase 2**: T029-T077 (UI components)
**Phase 3**: T084-T096 (Tag search)
**Phase 4**: T102-T112 (Temporal filter)
**Phase 5**: T118-T148 (Timeline ranges)
**Phase 6**: T157-T202 (Quality assurance)

---

## Notes

- All times are estimates and may vary based on complexity
- Priority tasks ([P]) should be completed before moving to next phase
- Integration tests can run in parallel with component development
- E2E tests require completed features from all phases
- Documentation can be written incrementally during development

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-07 | 1.0 | Initial task breakdown |
