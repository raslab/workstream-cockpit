# Tasks: Timeline CSV Export

**Feature ID**: 007-timeline-csv-export  
**Total Estimated Time**: 8-12 hours  
**Target Completion**: 1-2 days

---

## Task Summary

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| Phase 1: CSV Utility | 7 tasks | 3-4 hours | P0 |
| Phase 2: Export Button | 5 tasks | 2-3 hours | P0 |
| Phase 3: Integration | 4 tasks | 2-3 hours | P0 |
| Phase 4: Testing & Polish | 6 tasks | 1-2 hours | P0 |
| **Total** | **22 tasks** | **8-12 hours** | - |

---

## Phase 1: Core CSV Export Utility (3-4 hours)

### T001 [P0] Create CSV field escaping function
**Estimate**: 30 minutes  
**Description**: Implement RFC 4180 compliant CSV field escaping with CSV injection protection  
**Acceptance Criteria**:
- Function handles null/undefined → empty string
- Escapes fields containing commas by wrapping in quotes
- Escapes fields containing quotes by doubling quotes
- Escapes fields containing newlines by wrapping in quotes
- Leaves normal text unchanged
- **CSV Injection Protection**: Prefixes fields starting with =, +, -, @ with single quote

**File**: `frontend/src/utils/exportTimeline.ts`

```typescript
function escapeCSVField(value: string | null | undefined): string {
  if (value == null || value === '') return '';
  
  let stringValue = String(value);
  
  // CSV Injection Protection
  const dangerousChars = ['=', '+', '-', '@'];
  if (dangerousChars.some(char => stringValue.startsWith(char))) {
    stringValue = "'" + stringValue;
  }
  
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}
```

**Tests Required**:
- Normal text → unchanged
- Text with comma → `"text, with comma"`
- Text with quote → `"text with ""quote"""`
- Text with newline → `"text\nwith newline"`
- Null → `""`
- Undefined → `""`
- Text starting with = → `'=formula`
- Text starting with + → `'+formula`
- Text starting with - → `'-formula`
- Text starting with @ → `'@formula`

---

### T002 [P0] Create tag extraction utility
**Estimate**: 30 minutes  
**Description**: Extract hashtags from text content  
**Acceptance Criteria**:
- Matches hashtag pattern: `#word`, `#word-hyphen`, `#word_underscore`
- Returns array of tag names (without #)
- Removes duplicates (case-insensitive)
- Handles empty/null input gracefully

**File**: `frontend/src/utils/exportTimeline.ts`

```typescript
function extractTags(text: string): string[] {
  if (!text) return [];
  const hashtagPattern = /#([a-zA-Z0-9_-]+)/g;
  const matches = text.matchAll(hashtagPattern);
  const tags = Array.from(matches, m => m[1]);
  return Array.from(new Set(tags.map(tag => tag.toLowerCase())));
}
```

**Tests Required**:
- Empty string → `[]`
- No tags → `[]`
- Single tag `#test` → `['test']`
- Multiple tags `#tag1 #tag2` → `['tag1', 'tag2']`
- Duplicate tags `#test #TEST` → `['test']`
- Special chars `#test-name #test_name` → `['test-name', 'test_name']`

---

### T003 [P0] Create tag extraction from timeline entry
**Estimate**: 15 minutes  
**Description**: Extract tags from entry's status and note fields  
**Acceptance Criteria**:
- Extracts from entry.status
- Extracts from entry.note
- Combines and deduplicates tags
- Handles missing fields

**File**: `frontend/src/utils/exportTimeline.ts`

```typescript
function extractEntryTags(entry: TimelineEntry): string[] {
  const textFields = [entry.status, entry.note].filter(Boolean);
  if (textFields.length === 0) return [];
  return extractTags(textFields.join(' '));
}
```

---

### T004 [P0] Create timeline entry to CSV row converter
**Estimate**: 1 hour  
**Description**: Convert TimelineEntry object to CSV row string  
**Acceptance Criteria**:
- Maps event types to readable labels
- Formats dates as YYYY-MM-DD
- Formats times as HH:mm (24-hour format)
- Handles missing optional fields (category, note)
- Extracts and joins tags with semicolons
- Returns comma-separated string
- Column order optimized for analysis (date/time first)

**File**: `frontend/src/utils/exportTimeline.ts`

**Columns** (12 total):
1. Date (YYYY-MM-DD)
2. Time (HH:mm - 24-hour)
3. Event Type (Status Update, Workstream Created, Workstream Closed)
4. Workstream Name
5. Category Name
6. Status Text
7. Note Text
8. Tags (semicolon-separated)
9. Category Color (hex)
10. Category Emoji
11. Workstream ID
12. Event ID

**Tests Required**:
- Complete entry with all fields
- Entry missing category
- Entry missing note
- Entry with special characters
- Entry with tags in status/note
- Time is 24-hour format (14:45 not 2:45 PM)
- Tags separated by semicolons (not commas)

---

### T005 [P0] Create CSV content generator
**Estimate**: 45 minutes  
**Description**: Generate complete CSV content with headers and data rows  
**Acceptance Criteria**:
- Includes header row with column names
- Includes BOM (\ufeff) for Excel compatibility
- Converts all entries to CSV rows
- Handles empty entries array (headers only)
- Returns valid CSV string

**File**: `frontend/src/utils/exportTimeline.ts`

```typescript
function generateCSV(entries: TimelineEntry[]): string {
  const headers = [
    'Event Type', 'Date', 'Time', 'Workstream',
    'Category', 'Category Color', 'Category Emoji',
    'Status', 'Note', 'Tags', 'Workstream ID', 'Event ID'
  ];
  
  const headerRow = headers.join(',');
  const dataRows = entries.map(entryToCSVRow);
  
  const BOM = '\ufeff';
  return BOM + headerRow + '\n' + dataRows.join('\n');
}
```

**Tests Required**:
- Empty array → BOM + headers only
- Single entry → BOM + headers + 1 row
- Multiple entries → BOM + headers + N rows
- BOM present at file start

---

### T006 [P0] Create CSV download function
**Estimate**: 30 minutes  
**Description**: Trigger browser download of CSV file  
**Acceptance Criteria**:
- Creates Blob with correct MIME type
- Creates object URL
- Creates and clicks download link
- Cleans up object URL after download
- Uses provided filename

**File**: `frontend/src/utils/exportTimeline.ts`

```typescript
function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
```

**Tests Required** (mock DOM):
- Blob created with correct type
- Link created and clicked
- Link removed from DOM
- URL revoked after delay

---

### T007 [P0] Create main export function
**Estimate**: 30 minutes  
**Description**: Main exported function to trigger CSV export  
**Acceptance Criteria**:
- Validates entries not empty
- Generates CSV content
- Creates timestamped filename
- Triggers download
- Returns Promise (for async handling)
- Throws error if no entries

**File**: `frontend/src/utils/exportTimeline.ts`

```typescript
export async function exportTimelineToCSV(entries: TimelineEntry[]): Promise<void> {
  if (entries.length === 0) {
    throw new Error('No entries to export');
  }
  
  const csv = generateCSV(entries);
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
  const filename = `timeline-export-${timestamp}.csv`;
  
  downloadCSV(csv, filename);
}
```

**Filename format**: `timeline-export-2026-02-16-143045.csv`

**Tests Required**:
- Empty array → throws error
- Valid entries → downloads file
- Filename includes timestamp
- Multiple calls create different filenames

---

### T008 [P0] Write unit tests for CSV utility
**Estimate**: 1 hour  
**Description**: Comprehensive unit tests for all CSV functions  
**File**: `frontend/src/test/utils/exportTimeline.test.ts`

**Test Coverage**:
- `escapeCSVField()` - all escaping scenarios
- `extractTags()` - tag extraction patterns
- `extractEntryTags()` - entry-specific extraction
- `entryToCSVRow()` - row conversion
- `generateCSV()` - CSV generation
- `exportTimelineToCSV()` - main export (mock download)

**Dependencies**: Vitest

---

## Phase 2: Export Button Component (2-3 hours)

### T009 [P0] Create ExportButton component structure
**Estimate**: 45 minutes  
**Description**: Create basic component with props and state  
**Acceptance Criteria**:
- Accepts `entries: TimelineEntry[]` prop
- Has `isExporting` state
- Has `handleExport` async function
- Calculates `disabled` state based on entries and isExporting
- Renders button element

**File**: `frontend/src/components/Timeline/ExportButton.tsx`

```typescript
import { useState } from 'react';
import { TimelineEntry } from '../../hooks/useTimeline';
import { exportTimelineToCSV } from '../../utils/exportTimeline';

interface ExportButtonProps {
  entries: TimelineEntry[];
}

export function ExportButton({ entries }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async () => {
    if (entries.length === 0) return;
    
    setIsExporting(true);
    try {
      await exportTimelineToCSV(entries);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export timeline. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  const disabled = entries.length === 0 || isExporting;
  
  return <button>Export CSV</button>; // Basic for now
}
```

---

### T010 [P0] Add download icon to ExportButton
**Estimate**: 15 minutes  
**Description**: Add SVG download icon to button  
**Acceptance Criteria**:
- Icon renders to left of text
- Icon size: h-4 w-4
- Icon inherits text color
- Icon from Heroicons or similar

**SVG to use**:
```tsx
<svg 
  className="h-4 w-4" 
  fill="none" 
  stroke="currentColor" 
  viewBox="0 0 24 24"
>
  <path 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    strokeWidth={2} 
    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
  />
</svg>
```

---

### T011 [P0] Style ExportButton states
**Estimate**: 30 minutes  
**Description**: Apply Tailwind styles matching FilterBar buttons with accessibility  
**Acceptance Criteria**:
- Matches style of DateRangeFilter, CategoryFilter buttons
- Normal state: white bg, gray border, gray text
- Hover state: light gray bg
- Disabled state: lighter colors, not-allowed cursor
- Flex layout with gap between icon and text
- aria-label for screen readers
- Keyboard accessible

**Styles**:
```tsx
const ariaLabel = disabled 
  ? 'Export timeline to CSV (no entries to export)' 
  : `Export ${entries.length} timeline entries to CSV`;

className={`
  flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium
  ${disabled 
    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
  }
`}
aria-label={ariaLabel}
```

**States to test**:
- Normal: white background
- Hover: gray-50 background
- Disabled: gray-50 background, gray-400 text
- Exporting: shows "Exporting..." text
- Accessibility: aria-label updates with count
- Keyboard: can be activated via Enter/Space

---

### T012 [P0] Add tooltip to ExportButton
**Estimate**: 15 minutes  
**Description**: Add title attribute with dynamic content  
**Acceptance Criteria**:
- Shows "No entries to export" when disabled
- Shows "Export N entries" when enabled (where N = entry count)
- Updates when entry count changes

**Implementation**:
```tsx
<button
  title={disabled ? 'No entries to export' : `Export ${entries.length} entries`}
  // ... other props
>
```

---

### T013 [P0] Write component tests for ExportButton
**Estimate**: 1 hour  
**Description**: Unit tests for ExportButton component  
**File**: `frontend/src/test/components/ExportButton.test.tsx`

**Test Cases**:
- Renders with entries → button enabled
- Renders without entries → button disabled
- Click triggers export function
- Shows "Exporting..." during export
- Shows error alert on export failure
- Disabled state prevents click
- Tooltip shows entry count
- Tooltip shows "No entries" when empty

**Dependencies**: Vitest, React Testing Library, mock `exportTimelineToCSV`

---

## Phase 3: Timeline Integration (2-3 hours)

### T014 [P0] Update FilterBar to accept timeline entries
**Estimate**: 30 minutes  
**Description**: Add timelineEntries prop to FilterBar  
**Acceptance Criteria**:
- Add `timelineEntries?: TimelineEntry[]` to FilterBarProps
- Default to empty array
- Pass to ExportButton component

**File**: `frontend/src/components/Timeline/FilterBar.tsx`

**Changes**:
```typescript
interface FilterBarProps {
  selectedCategoryIds: string[];
  onCategoryIdsChange: (categoryIds: string[]) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  customStartDate?: Date;
  customEndDate?: Date;
  onCustomStartDateChange: (date: Date | undefined) => void;
  onCustomEndDateChange: (date: Date | undefined) => void;
  timelineEntries?: TimelineEntry[]; // ADD THIS
}

export function FilterBar({
  // ... existing props
  timelineEntries = [], // ADD THIS
}: FilterBarProps) {
  // ... existing code
}
```

---

### T015 [P0] Add ExportButton to FilterBar layout
**Estimate**: 30 minutes  
**Description**: Add ExportButton to right side of FilterBar  
**Acceptance Criteria**:
- Import ExportButton component
- Add after TagFilter component
- Wrap in div with `ml-auto` to push right
- Button appears on same line as filters (flex layout)
- Responsive: wraps on small screens

**File**: `frontend/src/components/Timeline/FilterBar.tsx`

**Layout**:
```tsx
return (
  <div className="mb-6 flex flex-wrap items-center gap-4">
    <DateRangeFilter ... />
    
    {categories && categories.length > 0 && (
      <div className="relative">...</div>
    )}
    
    <TagFilter ... />
    
    {/* Export Button - pushed to right */}
    <div className="ml-auto">
      <ExportButton entries={timelineEntries} />
    </div>
  </div>
);
```

---

### T016 [P0] Update Timeline.tsx to pass entries to FilterBar
**Estimate**: 15 minutes  
**Description**: Pass timeline data to FilterBar component  
**Acceptance Criteria**:
- Add `timelineEntries={timeline}` prop to FilterBar
- Timeline data flows from useTimeline hook → FilterBar → ExportButton
- Export reflects filtered timeline state

**File**: `frontend/src/pages/Timeline.tsx`

**Changes**:
```tsx
export default function Timeline() {
  // ... existing state
  
  const { data: timeline, isLoading, error } = useTimeline({...});
  
  // ... existing code
  
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">...</div>
      
      <FilterBar
        selectedCategoryIds={selectedCategoryIds}
        onCategoryIdsChange={setSelectedCategoryIds}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
        timelineEntries={timeline} // ADD THIS
      />
      
      {/* ... rest of component */}
    </div>
  );
}
```

---

### T017 [P0] Test filter integration
**Estimate**: 1 hour  
**Description**: Integration tests for filter state and export  
**Acceptance Criteria**:
- Changing date filter updates export data
- Changing category filter updates export data
- Changing tag filter updates export data
- Combining filters works correctly
- Clearing filters updates export

**Test Approach**:
- Use React Testing Library
- Mock useTimeline hook
- Simulate filter changes
- Verify ExportButton receives correct entries
- Verify export contains expected data

**File**: `frontend/src/test/integration/TimelineExport.test.tsx` (new)

---

## Phase 4: Testing & Polish (1-2 hours)

### T018 [P0] Test CSV in Excel
**Estimate**: 30 minutes  
**Description**: Manual testing in Microsoft Excel  
**Platforms**: Windows and/or Mac  
**Test Cases**:
- [ ] File opens without errors
- [ ] UTF-8 characters display correctly
- [ ] Emojis display correctly (in emoji column)
- [ ] Commas in text don't create extra columns
- [ ] Quotes in text display correctly
- [ ] Newlines in cells work correctly
- [ ] Columns align with headers
- [ ] No formula injection issues (=, +, -, @ prefixed with ')
- [ ] Time displayed in 24-hour format
- [ ] Tags separated by semicolons (not commas)
- [ ] Date/Time columns sort correctly

**Sample Data to Test**:
- Entry with comma in status: `"Working on tasks, including review"`
- Entry with quote: `She said "hello" today`
- Entry with newline: `Line 1\nLine 2`
- Entry with emoji: 🚀📅👤
- Entry with international chars: café, naïve, 日本語
- Entry with formula attempt: `=1+1` or `@SUM(A1:A10)`
- Entry with multiple tags: `#tag1 #tag2 #tag3`

---

### T019 [P0] Test CSV in Google Sheets
**Estimate**: 15 minutes  
**Description**: Manual testing in Google Sheets  
**Test Cases**:
- [ ] Import CSV works smoothly
- [ ] All columns imported correctly
- [ ] Special characters work
- [ ] Emojis display
- [ ] Formatting preserved

---

### T020 [P0] Test edge cases
**Estimate**: 45 minutes  
**Description**: Test unusual scenarios  
**Test Cases**:
- [ ] Empty timeline → button disabled
- [ ] Timeline while loading → button disabled
- [ ] Very large timeline (500+ entries) → performance OK
- [ ] Entry with very long text (1000+ chars) → works
- [ ] Entry with only emojis → works
- [ ] Entry with mixed languages → works
- [ ] Entry with markdown formatting → preserved
- [ ] Multiple rapid exports → no errors
- [ ] Export, change filter, export again → correct data

---

### T021 [P0] Browser compatibility testing
**Estimate**: 30 minutes  
**Description**: Test in major browsers  
**Browsers**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Test**: Click export, verify download works, verify filename correct

---

### T022 [P0] Performance testing
**Estimate**: 30 minutes  
**Description**: Measure export performance  
**Metrics**:
- Time to generate CSV for 100 entries: < 100ms
- Time to generate CSV for 1000 entries: < 500ms
- Memory usage: reasonable (< 10MB)
- UI blocking: none (should be instant)

**Tools**: Browser DevTools Performance tab

**Test Cases**:
- Generate timeline with 100 entries → measure time
- Generate timeline with 1000 entries → measure time
- Multiple exports in succession → check for memory leaks
- Export while scrolling → verify no UI freeze

---

### T023 [P0] Update documentation
**Estimate**: 30 minutes  
**Description**: Document the export feature  
**Updates Needed**:
- Add JSDoc comments to all exported functions
- Add inline comments for complex logic
- Update README if user-facing docs exist
- Create example CSV output in spec/plan

**Files to Update**:
- `frontend/src/utils/exportTimeline.ts` - JSDoc
- `frontend/src/components/Timeline/ExportButton.tsx` - JSDoc
- `specs/007-timeline-csv-export/README.md` - Create if needed

---

## Task Dependencies

```
Phase 1: CSV Utility (can be done in parallel)
├── T001: CSV escaping
├── T002: Tag extraction
├── T003: Entry tag extraction (depends on T002)
├── T004: Entry to CSV row (depends on T001, T003)
├── T005: CSV generator (depends on T004)
├── T006: Download function
├── T007: Main export (depends on T005, T006)
└── T008: Unit tests (depends on T001-T007)

Phase 2: Export Button (depends on Phase 1)
├── T009: Component structure (depends on T007)
├── T010: Add icon
├── T011: Styling
├── T012: Tooltip
└── T013: Component tests (depends on T009-T012)

Phase 3: Integration (depends on Phase 2)
├── T014: Update FilterBar props
├── T015: Add button to FilterBar (depends on T014, T009)
├── T016: Update Timeline.tsx (depends on T015)
└── T017: Integration tests (depends on T016)

Phase 4: Testing (depends on Phase 3)
├── T018: Excel testing (depends on T017)
├── T019: Google Sheets testing (depends on T017)
├── T020: Edge cases (depends on T017)
├── T021: Browser testing (depends on T017)
├── T022: Performance testing (depends on T017)
└── T023: Documentation (can be done anytime)
```

---

## Progress Tracking

### Phase 1: CSV Utility
- [ ] T001 - CSV escaping function
- [ ] T002 - Tag extraction
- [ ] T003 - Entry tag extraction
- [ ] T004 - Entry to CSV row
- [ ] T005 - CSV generator
- [ ] T006 - Download function
- [ ] T007 - Main export function
- [ ] T008 - Unit tests

### Phase 2: Export Button
- [ ] T009 - Component structure
- [ ] T010 - Download icon
- [ ] T011 - Button styling
- [ ] T012 - Tooltip
- [ ] T013 - Component tests

### Phase 3: Integration
- [ ] T014 - FilterBar props
- [ ] T015 - Add to FilterBar
- [ ] T016 - Update Timeline.tsx
- [ ] T017 - Integration tests

### Phase 4: Testing & Polish
- [ ] T018 - Excel testing
- [ ] T019 - Google Sheets testing
- [ ] T020 - Edge cases
- [ ] T021 - Browser compatibility
- [ ] T022 - Performance testing
- [ ] T023 - Documentation

---

## Notes

- All tasks are P0 (required for MVP)
- Total time: 8-12 hours over 1-2 days
- No backend changes required
- No database migrations required
- Feature can be deployed independently
- Easy to rollback (remove button from UI)

---

*End of Tasks*
