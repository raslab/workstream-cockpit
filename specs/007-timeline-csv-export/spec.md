# Feature Specification: Timeline CSV Export

**Feature ID**: 007-timeline-csv-export
**Version**: 1.0
**Status**: Planning
**Created**: 2026-02-16
**Last Updated**: 2026-02-16

---

## Executive Summary

This specification defines a CSV export capability for the Timeline view that allows users to export all timeline entries currently displayed based on active filters (date range, categories, tags). The export button will be positioned on the right side of the filter bar in the Timeline view header, providing quick access to download filtered timeline data for reporting, analysis, or archival purposes.

**Key Capabilities**:
1. **Filtered Export**: Export only entries matching current filter criteria
2. **Comprehensive Data**: Include all relevant information (project, workstream, category, tags, dates, status, notes)
3. **One-Click Export**: Simple button trigger for immediate CSV download
4. **Client-Side Generation**: Fast CSV generation in the browser

**Business Value**:
- **Reporting**: Generate reports for management reviews and stakeholder updates
- **Analysis**: Export data for external analysis in Excel, Google Sheets, or BI tools
- **Documentation**: Archive timeline snapshots for project documentation
- **Sharing**: Share filtered timeline data with team members

---

## Problem Statement

### Current State

**No Export Capability**
- Users cannot export timeline data
- Must manually copy/paste entries for reports
- No way to analyze trends in external tools
- Time-consuming to share timeline snapshots
- Cannot archive historical views

**Manual Workarounds**
- Screenshot timeline view (loses data fidelity)
- Manually transcribe entries into spreadsheets
- Copy/paste text from UI (loses structure)
- Export not respecting filter state

### Desired State

**One-Click Export**
- Export button visible in Timeline header
- Positioned to the right of filter controls
- Downloads CSV file immediately
- Filename includes date/time for versioning

**Filtered Export**
- Respects active date range filter
- Respects selected categories
- Respects selected tags
- Exports exactly what user sees (WYSIWYG)

**Comprehensive Data**
- All timeline entry fields included
- Structured format for easy import
- Human-readable and machine-parsable
- Preserves markdown formatting where appropriate

---

## Requirements

### Functional Requirements

#### FR-1: Export Button Placement
**Priority**: P0 (Must Have)

**Description**: Export button positioned in Timeline header filter bar.

**User Stories**:
- As a user, I can see an "Export CSV" button in the Timeline view
- As a user, the export button is on the right side of the filter controls
- As a user, the button is clearly identifiable with an export/download icon

**Acceptance Criteria**:
- Export button appears to the right of TagFilter component in FilterBar
- Button includes download icon (⬇ or similar)
- Button styled consistently with other filter buttons
- Button has hover state for visual feedback
- Button shows "Export CSV" label with icon

**Technical Notes**:
- Add button to FilterBar component after tag filter
- Use Tailwind classes matching existing filter button styles
- Position using `ml-auto` to push to right side of flex container

---

#### FR-2: CSV Export Functionality
**Priority**: P0 (Must Have)

**Description**: Generate and download CSV file with filtered timeline data.

**User Stories**:
- As a user, when I click Export CSV, a file downloads immediately
- As a user, the CSV contains all timeline entries matching my current filters
- As a user, the filename includes timestamp for easy version tracking
- As a user, the CSV opens correctly in Excel and Google Sheets

**Acceptance Criteria**:
- Clicking export button triggers CSV download
- Only entries currently displayed (after filters) are exported
- Filename format: `timeline-export-YYYY-MM-DD-HHMMSS.csv`
- CSV uses standard comma-separated format
- Special characters (commas, quotes, newlines) properly escaped
- UTF-8 encoding for international characters
- BOM (Byte Order Mark) included for Excel compatibility

**Technical Notes**:
- Use browser Blob API for file generation
- Create download link with `download` attribute
- Auto-click link to trigger download
- Clean up object URL after download
- Handle empty timeline gracefully (still generate CSV with headers)
- Filename format: `timeline-export-YYYY-MM-DD-HHmmss.csv`
- Consider adding filter info to filename for better organization

---

#### FR-3: CSV Data Schema
**Priority**: P0 (Must Have)

**Description**: Define comprehensive CSV columns for timeline data.

**CSV Columns** (in order):
1. `Date` - Date of event (YYYY-MM-DD format)
2. `Time` - Time of event (HH:mm 24-hour format)
3. `Event Type` - Type of event (Status Update, Workstream Created, Workstream Closed)
4. `Workstream` - Name of workstream
5. `Category` - Category name
6. `Status` - Status update text (markdown preserved)
7. `Note` - Additional note text (markdown preserved)
8. `Tags` - Semicolon-separated list of tags extracted from content
9. `Category Color` - Category color (hex code)
10. `Category Emoji` - Category emoji
11. `Workstream ID` - UUID for reference
12. `Event ID` - Timeline entry ID for reference

**Acceptance Criteria**:
- CSV header row matches column names above
- All columns present in every row (empty string for missing values)
- Event Type values: "Status Update", "Workstream Created", "Workstream Closed"
- Dates formatted as YYYY-MM-DD (e.g., "2026-02-16")
- Times formatted as 24-hour HH:mm (e.g., "14:45")
- Markdown preserved in Status and Note fields (not converted to HTML)
- Tags extracted from status and note fields
- Tags separated by semicolons to avoid CSV comma conflicts
- Empty cells represented as empty strings, not "null" or "undefined"
- CSV injection protection: fields starting with =, +, -, @ prefixed with single quote

**Technical Notes**:
- Use date-fns `format()` for date/time formatting
- Date format: `yyyy-MM-dd`
- Time format: `HH:mm` (24-hour)
- Extract tags using tag extraction utility
- Preserve newlines in markdown fields (will be quoted in CSV)
- Handle null/undefined values gracefully
- Column order optimized: date/time first for sorting, then event details, metadata last
- Semicolon separator for tags prevents CSV parsing issues
- CSV injection protection for security

---

#### FR-4: Export Button State Management
**Priority**: P1 (Should Have)

**Description**: Provide visual feedback during export process.

**User Stories**:
- As a user, I see visual feedback when export is in progress
- As a user, I can see if there's no data to export
- As a user, the button is disabled while export processes

**Acceptance Criteria**:
- Button shows "Exporting..." text during generation (brief)
- Button disabled if timeline is empty or loading
- Button shows count of entries to be exported on hover (tooltip)
- No multiple simultaneous exports possible
- Button has proper aria-label for accessibility
- Button keyboard accessible (can be triggered via Enter/Space)

**Technical Notes**:
- Add `disabled` state while export in progress
- Check `timeline?.length > 0` before enabling
- Add title/tooltip showing entry count
- Use loading state (optional spinner)
- Add `aria-label` for screen readers
- Ensure keyboard navigation works (button element with onClick)

---

### Non-Functional Requirements

#### NFR-1: Performance
**Priority**: P0 (Must Have)

**Requirements**:
- CSV generation completes in < 500ms for 1000 entries
- No UI blocking during export
- Minimal memory footprint
- Browser download starts within 1 second of click

**Technical Notes**:
- Use efficient string concatenation
- Consider chunked processing for very large datasets (future)
- Test with realistic data volumes

---

#### NFR-2: Compatibility
**Priority**: P0 (Must Have)

**Requirements**:
- CSV opens correctly in Microsoft Excel (Windows/Mac)
- CSV opens correctly in Google Sheets
- CSV opens correctly in LibreOffice Calc
- UTF-8 characters display correctly
- Newlines in fields handled properly

**Technical Notes**:
- Use RFC 4180 CSV standard
- Include UTF-8 BOM for Excel
- Properly escape quotes and commas
- Test with international characters

---

#### NFR-3: Usability
**Priority**: P0 (Must Have)

**Requirements**:
- Export button discoverable without training
- Single click to export (no configuration dialogs)
- Filename meaningful and sortable
- CSV format requires no post-processing for common use cases
- Accessible to keyboard and screen reader users

**Technical Notes**:
- Clear button labeling
- Intuitive icon choice
- Timestamp in filename for easy sorting
- Standard column names
- ARIA labels for accessibility
- Keyboard navigation support

---

#### NFR-4: Security
**Priority**: P0 (Must Have)

**Requirements**:
- Protection against CSV injection attacks
- Prevent formula execution in Excel/Sheets
- No exposure of sensitive system data
- Client-side processing only (no data sent to server)

**Technical Notes**:
- Prefix fields starting with `=`, `+`, `-`, `@` with single quote
- This prevents formula injection when CSV opened in Excel
- Example: `=1+1` becomes `'=1+1` (displayed as text)
- Apply to all text fields (Status, Note, Workstream name)
- No risk of server-side attacks (client-side only feature)

---

## User Experience

### UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Timeline                                                       │
│  Review recent activity across all workstreams                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌───────────┐ ┌────────┐          ┌──────────┐ │
│  │Last 7 Days▼│ │Categories▼│ │ Tags ▼ │          │Export CSV│ │
│  └────────────┘ └───────────┘ └────────┘          └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Export Button Design

**Visual Style**:
- Border: `border border-gray-300`
- Background: `bg-white hover:bg-gray-50`
- Text: `text-sm font-medium text-gray-700`
- Padding: `px-3 py-1.5`
- Border radius: `rounded-md`
- Icon: Download arrow (⬇) or export icon
- Gap between icon and text: `gap-2`

**States**:
- Default: White background, gray text
- Hover: Light gray background
- Disabled: Grayed out, cursor not-allowed
- Active/Exporting: Slight darkening, "Exporting..." text

### Export Flow

1. **User clicks "Export CSV"**
   - Button shows "Exporting..." briefly
   - Button disabled during process

2. **CSV generation**
   - Filter timeline entries (already filtered by React state)
   - Transform entries to CSV rows
   - Generate CSV string
   - Create Blob and download URL

3. **Download triggers**
   - Browser download dialog appears (if configured)
   - File saves with timestamp in name
   - Button returns to normal state

4. **Success**
   - File appears in downloads folder
   - Can be opened immediately in spreadsheet app

### Error Handling

**Empty Timeline**:
- Button disabled when no entries
- Tooltip: "No entries to export"

**Export Failure**:
- Show error message if Blob creation fails
- Log error to console for debugging
- Button returns to enabled state

---

## Technical Design

### Component Architecture

```
FilterBar (modified)
├── DateRangeFilter
├── CategoryFilter  
├── TagFilter
└── ExportButton (new)
```

### Implementation Details

#### 1. Update FilterBar Component

**File**: `frontend/src/components/Timeline/FilterBar.tsx`

Add ExportButton to the right side of filter controls:

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
  timelineEntries?: TimelineEntry[]; // Add this for export
}

export function FilterBar({
  selectedCategoryIds,
  onCategoryIdsChange,
  selectedTags,
  onTagsChange,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
  timelineEntries = [], // Add this
}: FilterBarProps) {
  // ... existing code ...

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <DateRangeFilter ... />
      
      {categories && categories.length > 0 && (
        <div className="relative">...</div>
      )}

      <TagFilter ... />

      {/* Export Button - positioned to right */}
      <div className="ml-auto">
        <ExportButton entries={timelineEntries} />
      </div>
    </div>
  );
}
```

#### 2. Create ExportButton Component

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

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      title={disabled ? 'No entries to export' : `Export ${entries.length} entries`}
      className={`
        flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium
        ${disabled 
          ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }
      `}
    >
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
      <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
    </button>
  );
}
```

#### 3. Create CSV Export Utility

**File**: `frontend/src/utils/exportTimeline.ts`

```typescript
import { TimelineEntry } from '../hooks/useTimeline';
import { format, parseISO } from 'date-fns';
import { extractTags } from './tagExtractor';

/**
 * Escape CSV field value (handle commas, quotes, newlines, CSV injection)
 */
function escapeCSVField(value: string | null | undefined): string {
  if (value == null || value === '') return '';
  
  let stringValue = String(value);
  
  // CSV Injection Protection: Prefix dangerous characters
  // Prevents formula execution in Excel/Google Sheets
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

/**
 * Extract tags from timeline entry text content
 */
function extractEntryTags(entry: TimelineEntry): string[] {
  const textFields = [
    entry.status,
    entry.note,
  ].filter(Boolean);
  
  if (textFields.length === 0) return [];
  
  return extractTags(textFields.join(' '));
}

/**
 * Convert TimelineEntry to CSV row
 */
function entryToCSVRow(entry: TimelineEntry): string {
  const date = parseISO(entry.createdAt);
  const tags = extractEntryTags(entry);
  
  // Map event type to readable label
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

/**
 * Generate CSV content from timeline entries
 */
function generateCSV(entries: TimelineEntry[]): string {
  const headers = [
    'Event Type',
    'Date',
    'Time',
    'Workstream',
    'Category',
    'Category Color',
    'Category Emoji',
    'Status',
    'Note',
    'Tags',
    'Workstream ID',
    'Event ID',
  ];
  
  const headerRow = headers.map(escapeCSVField).join(',');
  const dataRows = entries.map(entryToCSVRow);
  
  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\ufeff';
  
  return BOM + headerRow + '\n' + dataRows.join('\n');
}

/**
 * Download CSV file
 */
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
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Export timeline entries to CSV file
 */
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

#### 4. Create Tag Extractor Utility (if not exists)

**File**: `frontend/src/utils/tagExtractor.ts`

```typescript
/**
 * Extract hashtags from text content
 * Matches #word, #word-with-hyphens, #word_with_underscores
 */
export function extractTags(text: string): string[] {
  if (!text) return [];
  
  const hashtagPattern = /#([a-zA-Z0-9_-]+)/g;
  const matches = text.matchAll(hashtagPattern);
  
  const tags = Array.from(matches, m => m[1]);
  
  // Remove duplicates (case-insensitive)
  const uniqueTags = Array.from(
    new Set(tags.map(tag => tag.toLowerCase()))
  );
  
  return uniqueTags;
}
```

#### 5. Update Timeline Page

**File**: `frontend/src/pages/Timeline.tsx`

Pass timeline entries to FilterBar:

```typescript
export default function Timeline() {
  // ... existing state ...

  const { data: timeline, isLoading, error } = useTimeline({
    startDate: customStartDate,
    endDate: customEndDate,
    categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  });

  // ... existing code ...

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
        timelineEntries={timeline} // Add this
      />

      {/* ... rest of timeline ... */}
    </div>
  );
}
```

---

## Data Model

No database changes required. Export operates on in-memory timeline data.

---

## API Changes

No backend API changes required. Export is client-side only.

---

## Testing Strategy

### Unit Tests

**File**: `frontend/src/test/utils/exportTimeline.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { exportTimelineToCSV } from '../../utils/exportTimeline';
import { TimelineEntry } from '../../hooks/useTimeline';

describe('exportTimeline', () => {
  it('generates valid CSV with headers', async () => {
    const entries: TimelineEntry[] = [{
      id: 'test-1',
      eventType: 'status_update',
      workstreamId: 'ws-1',
      workstreamName: 'Test Workstream',
      status: 'Making progress',
      note: null,
      createdAt: '2026-02-16T14:30:00Z',
      category: {
        id: 'cat-1',
        name: 'Project',
        color: '#3B82F6',
        emoji: '🚀',
      },
    }];

    // Test would verify CSV structure
    // (actual test implementation depends on testing strategy)
  });

  it('escapes commas in fields', () => {
    // Test CSV field escaping
  });

  it('escapes quotes in fields', () => {
    // Test quote escaping
  });

  it('handles empty timeline', () => {
    // Test error handling
  });

  it('extracts tags from status and notes', () => {
    // Test tag extraction
  });
});
```

### Integration Tests

**File**: `frontend/src/test/components/ExportButton.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportButton } from '../../components/Timeline/ExportButton';

describe('ExportButton', () => {
  it('renders enabled with entries', () => {
    const entries = [/* mock entries */];
    render(<ExportButton entries={entries} />);
    
    const button = screen.getByText('Export CSV');
    expect(button).not.toBeDisabled();
  });

  it('renders disabled without entries', () => {
    render(<ExportButton entries={[]} />);
    
    const button = screen.getByText('Export CSV');
    expect(button).toBeDisabled();
  });

  it('shows exporting state when clicked', async () => {
    const entries = [/* mock entries */];
    render(<ExportButton entries={entries} />);
    
    const button = screen.getByText('Export CSV');
    fireEvent.click(button);
    
    expect(screen.getByText('Exporting...')).toBeInTheDocument();
  });
});
```

### Manual Testing Checklist

- [ ] Export button appears to the right of filter controls
- [ ] Button disabled when timeline is empty
- [ ] Button disabled while loading
- [ ] Button shows entry count on hover
- [ ] Click triggers immediate download
- [ ] Filename includes timestamp
- [ ] CSV opens correctly in Excel
- [ ] CSV opens correctly in Google Sheets
- [ ] Special characters display correctly (emojis, accents)
- [ ] Commas in text fields don't break CSV structure
- [ ] Quotes in text fields don't break CSV structure
- [ ] Newlines in markdown preserved and escaped
- [ ] Tags extracted correctly from status and notes
- [ ] Export reflects current filter state
- [ ] Changing filters updates what gets exported
- [ ] Multiple exports work correctly (no memory leaks)

---

## Deployment Considerations

### Frontend Changes Only

- No backend deployment required
- No database migrations
- No API version changes
- Pure frontend feature

### Browser Compatibility

- Blob API: All modern browsers (IE10+)
- Object URL: All modern browsers (IE10+)
- Download attribute: All modern browsers (IE13+/Edge)
- UTF-8 BOM: Required for Excel, safe in all browsers

### Performance Impact

- Minimal: CSV generation is synchronous but fast
- Memory usage: ~1KB per entry in memory during generation
- No network requests during export
- No impact on server

---

## Future Enhancements

### Phase 2 (Not in Scope)

1. **Export Format Options**
   - JSON export option
   - Excel (XLSX) format
   - PDF export with formatting

2. **Column Selection**
   - Choose which columns to export
   - Reorder columns
   - Save export templates

3. **Advanced Options**
   - Date format customization
   - Markdown to plain text conversion option
   - Include/exclude closed workstreams toggle

4. **Batch Export**
   - Export multiple date ranges
   - Schedule automated exports
   - Email export capability

5. **Import**
   - Import CSV to create workstreams
   - Bulk status updates from CSV

---

## Success Metrics

### Adoption Metrics

- **Export Usage**: Track export button clicks
- **Export Frequency**: How often users export
- **Export Volume**: Average entries per export
- **File Opens**: Track if files are actually opened (browser analytics)

### Quality Metrics

- **Error Rate**: Export failures (< 0.1%)
- **Performance**: Export time (< 500ms for 1000 entries)
- **Format Errors**: CSV parsing errors in Excel/Sheets (0%)

### User Satisfaction

- **User Feedback**: Positive feedback on export feature
- **Support Tickets**: Reduce manual export requests
- **Feature Requests**: Requests for additional export formats

---

## Dependencies

### External Libraries

- **date-fns**: Already in project (date formatting)
- No new dependencies required

### Internal Dependencies

- Timeline component and data structure
- Tag extraction utility (may need to create)
- Filter state management (already implemented)

### Browser APIs

- Blob API
- Object URL API
- Download attribute
- UTF-8 encoding support

---

## Risks and Mitigations

### Risk 1: Large Dataset Performance

**Risk**: Slow export for thousands of entries
**Impact**: Medium
**Likelihood**: Low
**Mitigation**: 
- Limit date range to 31 days (already enforced)
- Monitor performance with realistic data
- Consider chunked processing if needed
- Show progress indicator for large exports

### Risk 2: CSV Formatting Issues

**Risk**: Special characters break CSV structure
**Impact**: High
**Likelihood**: Medium
**Mitigation**:
- Comprehensive escaping logic
- Test with edge cases (quotes, commas, newlines, emojis)
- Follow RFC 4180 standard strictly
- Include UTF-8 BOM for Excel

### Risk 3: Browser Compatibility

**Risk**: Download doesn't work in some browsers
**Impact**: Medium
**Likelihood**: Low
**Mitigation**:
- Use well-supported APIs (Blob, Object URL)
- Test in major browsers (Chrome, Firefox, Safari, Edge)
- Provide fallback for unsupported browsers (rare)

### Risk 4: Data Privacy

**Risk**: Sensitive data exported unencrypted
**Impact**: Low (client-side only)
**Likelihood**: Low
**Mitigation**:
- File stays local to user's device
- User controls where file is saved
- No server-side storage
- Document data handling in privacy policy

---

## Open Questions

1. **Tag Extraction**: Should we extract tags from workstream context field?
   - **Decision**: No, only from status and note (context not visible in timeline)

2. **Date Range Limit**: Should exports respect the 31-day limit?
   - **Decision**: Yes, export what's displayed (filters already enforce limits)

3. **Closed Workstreams**: Should closed workstream events be included?
   - **Decision**: Yes, include all events matching filters

4. **Emoji Support**: How to handle emojis in CSV?
   - **Decision**: Use UTF-8 encoding with BOM, emojis work in modern tools

5. **Column Order**: Should column order match visual layout?
   - **Decision**: Use logical order (type, date/time, workstream, category, content, metadata)

---

## Appendix

### Example CSV Output

```csv
Date,Time,Event Type,Workstream,Category,Status,Note,Tags,Category Color,Category Emoji,Workstream ID,Event ID
2026-02-16,14:45,Status Update,Backend API Refactor,Project,"Completed migration to new auth system","Need to update docs #backend, #auth",backend;auth,#3B82F6,🚀,550e8400-e29b-41d4-a716-446655440000,status-123
2026-02-16,09:30,Workstream Created,Q1 Planning,Meeting,,,planning,#10B981,📅,650e8400-e29b-41d4-a716-446655440000,created-456
2026-02-15,16:15,Status Update,Review PRs,Delegated,"Reviewed 3 PRs, 2 approved",One needs changes #review,review,#F59E0B,👤,750e8400-e29b-41d4-a716-446655440000,status-789
```

### CSV Escaping Examples

**Input**: `Status with "quotes" inside`
**Output**: `"Status with ""quotes"" inside"`

**Input**: `Status with, comma inside`
**Output**: `"Status with, comma inside"`

**Input**: `Status with\nnewline`
**Output**: `"Status with\nnewline"`

**Input**: `Normal status`
**Output**: `Normal status`

**Input**: `=1+1` (CSV injection attempt)
**Output**: `'=1+1`

**Input**: `@SUM(A1:A10)` (CSV injection attempt)
**Output**: `'@SUM(A1:A10)`

---

## Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 1.0     | 2026-02-16 | System | Initial specification            |

---

## Approval

**Product Owner**: _Pending_
**Tech Lead**: _Pending_
**QA Lead**: _Pending_

---

*End of Specification*
