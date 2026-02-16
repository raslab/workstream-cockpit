# Implementation Plan: Timeline CSV Export

**Feature ID**: 007-timeline-csv-export
**Estimated Duration**: 1-2 days (8-12 hours)
**Complexity**: Low-Medium

---

## Overview

This plan outlines the implementation of a CSV export feature for the Timeline view. The feature allows users to export filtered timeline data with a single click, generating a comprehensive CSV file that can be opened in Excel, Google Sheets, or other spreadsheet applications.

**Key Implementation Points**:
- Client-side CSV generation (no backend changes)
- Export button in Timeline header (right side of filter bar)
- Comprehensive data export (all relevant fields)
- Proper CSV formatting with RFC 4180 compliance
- UTF-8 encoding with BOM for Excel compatibility

---

## Implementation Phases

### Phase 1: Core CSV Export Utility (3-4 hours)

**Objective**: Create the core CSV generation and download functionality.

**Tasks**:
1. Create `exportTimeline.ts` utility with CSV generation logic
2. Implement CSV field escaping (commas, quotes, newlines)
3. Implement tag extraction from timeline entries
4. Add UTF-8 BOM for Excel compatibility
5. Create download trigger mechanism
6. Write unit tests for CSV generation

**Deliverables**:
- `frontend/src/utils/exportTimeline.ts`
- `frontend/src/test/utils/exportTimeline.test.ts`

**Dependencies**: None

---

### Phase 2: Export Button Component (2-3 hours)

**Objective**: Create the export button UI component.

**Tasks**:
1. Create `ExportButton.tsx` component
2. Implement button states (enabled, disabled, exporting)
3. Add download icon SVG
4. Style button to match existing filter buttons
5. Add tooltip showing entry count
6. Handle export errors gracefully
7. Write component tests

**Deliverables**:
- `frontend/src/components/Timeline/ExportButton.tsx`
- `frontend/src/test/components/ExportButton.test.tsx`

**Dependencies**: Phase 1

---

### Phase 3: Timeline Integration (2-3 hours)

**Objective**: Integrate export button into Timeline view.

**Tasks**:
1. Update `FilterBar` to accept timeline entries prop
2. Add `ExportButton` to right side of `FilterBar`
3. Update `Timeline.tsx` to pass filtered entries to `FilterBar`
4. Ensure proper layout (button on right with `ml-auto`)
5. Test filter state changes reflect in exports
6. Integration testing

**Deliverables**:
- Modified `frontend/src/components/Timeline/FilterBar.tsx`
- Modified `frontend/src/pages/Timeline.tsx`
- Integration tests

**Dependencies**: Phase 2

---

### Phase 4: Testing & Polish (1-2 hours)

**Objective**: Comprehensive testing and refinement.

**Tasks**:
1. Test export in Excel (Windows/Mac)
2. Test export in Google Sheets
3. Test with special characters (emojis, quotes, commas)
4. Test with large datasets (100+ entries)
5. Test empty timeline state
6. Test various filter combinations
7. Performance testing
8. Browser compatibility testing
9. Fix any bugs found
10. Update documentation

**Deliverables**:
- Test results documentation
- Bug fixes
- Updated README or user guide (if exists)

**Dependencies**: Phase 3

---

## Detailed Task Breakdown

### Phase 1: Core CSV Export Utility

#### Task 1.1: Create CSV Escaping Function (30 min)
```typescript
function escapeCSVField(value: string | null | undefined): string {
  if (value == null || value === '') return '';
  
  let stringValue = String(value);
  
  // CSV Injection Protection: Prefix dangerous characters
  const dangerousChars = ['=', '+', '-', '@'];
  if (dangerousChars.some(char => stringValue.startsWith(char))) {
    stringValue = "'" + stringValue;
  }
  
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}
```

**Test Cases**:
- Normal text → unchanged
- Text with comma → quoted
- Text with quotes → quotes doubled and wrapped
- Text with newlines → quoted
- Null/undefined → empty string
- Text starting with = → prefixed with ' (CSV injection protection)
- Text starting with +, -, @ → prefixed with '

#### Task 1.2: Create Tag Extraction (30 min)
```typescript
export function extractTags(text: string): string[] {
  if (!text) return [];
  const hashtagPattern = /#([a-zA-Z0-9_-]+)/g;
  const matches = text.matchAll(hashtagPattern);
  const tags = Array.from(matches, m => m[1]);
  return Array.from(new Set(tags.map(tag => tag.toLowerCase())));
}
```

**Test Cases**:
- No tags → empty array
- Single tag → one tag
- Multiple tags → array of tags
- Duplicate tags → deduplicated
- Mixed case → normalized to lowercase

#### Task 1.3: Create Entry to CSV Row Converter (1 hour)
```typescript
function entryToCSVRow(entry: TimelineEntry): string {
  const date = parseISO(entry.createdAt);
  const tags = extractEntryTags(entry);
  
  const eventTypeLabels: Record<string, string> = {
    status_update: 'Status Update',
    workstream_created: 'Workstream Created',
    workstream_closed: 'Workstream Closed',
  };
  
  const columns = [
    eventTypeLabels[entry.eventType] || entry.eventType,
    format(date, 'yyyy-MM-dd'),
    format(date, 'h:mm a'),
    entry.workstreamName,
    entry.category?.name || '',
    entry.category?.color || '',
    entry.category?.emoji || '',
    entry.status || '',
    entry.note || '',
    tags.join(', '),
    entry.workstreamId,
    entry.id,
  ];
  
  return columns.map(escapeCSVField).join(',');
}
```

**Test Cases**:
- Complete entry with all fields
- Entry with missing optional fields
- Entry with special characters
- Entry with emojis
- Entry with tags

#### Task 1.4: Create CSV Generator (45 min)
```typescript
function generateCSV(entries: TimelineEntry[]): string {
  const headers = [
    'Date', 'Time', 'Event Type', 'Workstream',
    'Category', 'Status', 'Note', 'Tags',
    'Category Color', 'Category Emoji', 'Workstream ID', 'Event ID'
  ];
  
  const headerRow = headers.join(','); // Headers don't need escaping
  const dataRows = entries.map(entryToCSVRow);
  
  const BOM = '\ufeff'; // UTF-8 BOM for Excel
  return BOM + headerRow + '\n' + dataRows.join('\n');
}
```

**Test Cases**:
- Empty array → BOM + headers only
- Single entry → BOM + headers + 1 row
- Multiple entries → BOM + headers + N rows
- BOM present at file start
- Column order: Date, Time, Event Type, ... (optimized for sorting)

#### Task 1.5: Create Download Function (30 min)
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

**Test Cases**:
- Download triggers in browser
- Filename correct
- Content correct
- URL cleaned up

#### Task 1.6: Create Main Export Function (30 min)
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

**Test Cases**:
- Empty entries → error thrown
- Valid entries → CSV downloaded
- Filename includes timestamp
- Multiple calls work correctly

#### Task 1.7: Write Unit Tests (1 hour)
- Test all escaping scenarios
- Test tag extraction
- Test CSV generation
- Test download (mock DOM APIs)
- Test error handling

---

### Phase 2: Export Button Component

#### Task 2.1: Create Component Structure (45 min)
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
  
  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      title={disabled ? 'No entries to export' : `Export ${entries.length} entries`}
      className={/* ... */}
    >
      {/* Icon + Text */}
    </button>
  );
}
```

#### Task 2.2: Add Download Icon (15 min)
Use Heroicons download icon or similar SVG:
```tsx
<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
  />
</svg>
```

#### Task 2.3: Style Button States (30 min)
```tsx
const disabled = entries.length === 0 || isExporting;
const ariaLabel = disabled 
  ? 'Export timeline to CSV (no entries to export)' 
  : `Export ${entries.length} timeline entries to CSV`;

<button
  onClick={handleExport}
  disabled={disabled}
  aria-label={ariaLabel}
  title={disabled ? 'No entries to export' : `Export ${entries.length} entries`}
  className={`
    flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium
    ${disabled 
      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
    }
  `}
>
```

States to implement:
- Normal: white background
- Hover: gray background
- Disabled: grayed out
- Exporting: show "Exporting..." text
- Accessibility: aria-label for screen readers

#### Task 2.4: Add Error Handling (30 min)
- Try/catch around export
- Show user-friendly error message
- Log error to console for debugging
- Reset button state on error

#### Task 2.5: Write Component Tests (1 hour)
- Render with entries → enabled
- Render without entries → disabled
- Click triggers export
- Error handling works
- State transitions correct

---

### Phase 3: Timeline Integration

#### Task 3.1: Update FilterBar Props (30 min)
```typescript
interface FilterBarProps {
  // ... existing props ...
  timelineEntries?: TimelineEntry[];
}

export function FilterBar({
  // ... existing props ...
  timelineEntries = [],
}: FilterBarProps) {
  // ... existing code ...
  
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <DateRangeFilter ... />
      {/* ... other filters ... */}
      <TagFilter ... />
      
      {/* Export Button - pushed to right */}
      <div className="ml-auto">
        <ExportButton entries={timelineEntries} />
      </div>
    </div>
  );
}
```

#### Task 3.2: Update Timeline.tsx (30 min)
```typescript
export default function Timeline() {
  // ... existing state ...
  
  const { data: timeline, isLoading, error } = useTimeline({...});
  
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ... header ... */}
      
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
      
      {/* ... rest ... */}
    </div>
  );
}
```

#### Task 3.3: Test Filter Integration (1 hour)
- Change date filter → export reflects change
- Change category filter → export reflects change
- Change tag filter → export reflects change
- Multiple filters active → export correct
- Clear filters → export updates

#### Task 3.4: Layout Testing (30 min)
- Button appears on right side
- Responsive behavior on small screens
- Button doesn't overlap other elements
- Proper spacing and alignment

---

### Phase 4: Testing & Polish

#### Task 4.1: Excel Testing (30 min)
- Open exported CSV in Excel (Windows)
- Open exported CSV in Excel (Mac)
- Verify UTF-8 characters display correctly
- Verify emojis display correctly
- Verify no formatting issues
- Verify formulas don't auto-execute (security)

#### Task 4.2: Google Sheets Testing (15 min)
- Open exported CSV in Google Sheets
- Verify import works smoothly
- Verify all columns imported correctly
- Verify special characters work

#### Task 4.3: Edge Cases Testing (45 min)
- Empty timeline
- Timeline while loading
- Very large timeline (500+ entries)
- Entries with very long text
- Entries with all emojis
- Entries with mixed languages (UTF-8)
- Entries with markdown formatting

#### Task 4.4: Browser Testing (30 min)
- Chrome
- Firefox
- Safari
- Edge
- Mobile browsers (optional)

#### Task 4.5: Performance Testing (30 min)
- Measure export time for various sizes
- Check memory usage
- Verify no memory leaks on repeated exports
- Ensure UI doesn't freeze

#### Task 4.6: Documentation (30 min)
- Update README if needed
- Add JSDoc comments to functions
- Document CSV schema
- Create example CSV output

---

## Testing Checklist

### Functional Testing
- [ ] Export button appears in correct location
- [ ] Button disabled when timeline empty
- [ ] Button disabled while loading
- [ ] Button shows entry count on hover
- [ ] Click triggers immediate download
- [ ] Filename includes timestamp
- [ ] CSV structure correct (headers + rows)
- [ ] All columns present
- [ ] Data accurate for all fields

### Data Integrity Testing
- [ ] Event types mapped correctly
- [ ] Dates formatted correctly (YYYY-MM-DD)
- [ ] Times formatted correctly (h:mm AM/PM)
- [ ] Category data complete
- [ ] Tags extracted correctly
- [ ] IDs preserved correctly

### CSV Formatting Testing
- [ ] Commas in text don't break structure
- [ ] Quotes in text escaped correctly
- [ ] Newlines in text handled correctly
- [ ] Empty fields represented as empty strings
- [ ] UTF-8 encoding correct
- [ ] BOM present for Excel

### Application Testing
- [ ] Excel (Windows) opens correctly
- [ ] Excel (Mac) opens correctly
- [ ] Google Sheets imports correctly
- [ ] LibreOffice Calc works (optional)
- [ ] Emojis display correctly
- [ ] International characters work

### Filter Integration Testing
- [ ] Export reflects date filter
- [ ] Export reflects category filter
- [ ] Export reflects tag filter
- [ ] Export reflects combined filters
- [ ] Changing filters updates export

### Error Handling Testing
- [ ] Empty timeline shows disabled button
- [ ] Export failure shows error message
- [ ] Error doesn't break UI
- [ ] Button recovers from error state

### Performance Testing
- [ ] Export < 500ms for 100 entries
- [ ] Export < 1s for 1000 entries
- [ ] No UI freezing
- [ ] No memory leaks

### Browser Compatibility Testing
- [ ] Chrome works
- [ ] Firefox works
- [ ] Safari works
- [ ] Edge works

---

## File Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── Timeline/
│   │       ├── FilterBar.tsx (modified)
│   │       └── ExportButton.tsx (new)
│   ├── pages/
│   │   └── Timeline.tsx (modified)
│   ├── utils/
│   │   └── exportTimeline.ts (new)
│   └── test/
│       ├── components/
│       │   └── ExportButton.test.tsx (new)
│       └── utils/
│           └── exportTimeline.test.ts (new)
```

---

## Dependencies

### Required
- `date-fns` - Already in project (date formatting)
- React - Already in project
- TypeScript - Already in project

### No New Dependencies
All functionality can be implemented with existing dependencies and browser APIs.

---

## Rollout Plan

### Development
1. Create feature branch: `feature/timeline-csv-export`
2. Implement phases 1-4
3. Complete testing checklist
4. Code review

### Testing
1. QA testing in staging environment
2. User acceptance testing with sample data
3. Performance validation
4. Cross-browser testing

### Deployment
1. Merge to main branch
2. Deploy to production (frontend only)
3. Monitor for errors
4. Gather user feedback

### Post-Deployment
1. Monitor export usage metrics
2. Track error rates
3. Collect user feedback
4. Plan enhancements based on usage

---

## Rollback Plan

Since this is a client-side only feature with no backend changes:
- **Easy Rollback**: Remove export button component
- **No Data Impact**: No database changes to revert
- **No API Impact**: No backend changes to revert

If issues arise:
1. Hide export button via feature flag (if implemented)
2. Or remove ExportButton from FilterBar
3. Deploy hotfix
4. Investigate and fix issues
5. Redeploy

---

## Success Criteria

### Phase 1 Complete When:
- ✅ CSV generation works correctly
- ✅ All unit tests passing
- ✅ Edge cases handled (quotes, commas, newlines)
- ✅ Tag extraction working

### Phase 2 Complete When:
- ✅ Export button component created
- ✅ Button states working correctly
- ✅ Component tests passing
- ✅ Error handling implemented

### Phase 3 Complete When:
- ✅ Export button integrated into Timeline
- ✅ Button positioned correctly (right side)
- ✅ Filter state passed correctly
- ✅ Integration tests passing

### Phase 4 Complete When:
- ✅ All testing checklist items completed
- ✅ Excel import verified
- ✅ Google Sheets import verified
- ✅ Performance requirements met
- ✅ Documentation updated

### Feature Complete When:
- ✅ All phases complete
- ✅ Code reviewed and approved
- ✅ No critical bugs
- ✅ Deployed to production
- ✅ User feedback positive

---

## Risk Mitigation

### Technical Risks
1. **CSV formatting issues**: Mitigated by comprehensive escaping logic and testing
2. **Performance with large datasets**: Mitigated by limiting date range (existing constraint)
3. **Browser compatibility**: Mitigated by using well-supported APIs

### Process Risks
1. **Scope creep**: Clear scope definition, defer enhancements to phase 2
2. **Timeline slippage**: Built-in buffer in estimates, can be completed in 1-2 days
3. **Testing gaps**: Comprehensive testing checklist ensures coverage

---

## Notes

- This is a client-side only feature - no backend changes needed
- Export respects existing filter constraints (e.g., 31-day limit)
- CSV format follows RFC 4180 standard for maximum compatibility
- UTF-8 BOM ensures Excel compatibility on Windows
- Feature can be enhanced later with additional export formats

---

*End of Implementation Plan*
