# Specification 007: Timeline CSV Export

## Overview

This specification defines a CSV export feature for the Timeline view, allowing users to export filtered timeline data with a single click. The export button is positioned on the right side of the filter bar and generates a comprehensive CSV file containing all timeline entries currently displayed.

## Quick Links

- **[Full Specification](spec.md)** - Complete feature specification with requirements, design, and acceptance criteria
- **[Implementation Plan](plan.md)** - Detailed implementation phases, tasks, and testing strategy
- **[Tasks Checklist](tasks.md)** - Granular task breakdown with estimates and dependencies

## Key Information

- **Feature ID**: 007-timeline-csv-export
- **Status**: Planning
- **Created**: 2026-02-16
- **Estimated Duration**: 1-2 days (8-12 hours)
- **Complexity**: Low-Medium
- **Priority**: P0 (Must Have)

## Feature Summary

### What
A one-click CSV export button in the Timeline view that exports all currently filtered timeline entries to a downloadable CSV file.

### Why
- Enable reporting and analysis in external tools (Excel, Google Sheets, BI tools)
- Support project documentation and archival needs
- Share timeline snapshots with team members
- Eliminate manual copy/paste workflows

### How
- Export button positioned to the right of filter controls in Timeline header
- Client-side CSV generation (no backend changes)
- Exports exactly what the user sees (WYSIWYG - respects all active filters)
- Comprehensive data export (12 columns including project, workstream, category, tags, dates, status, notes)

## User Experience

### Visual Design

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

### Export Flow

1. User applies desired filters (date range, categories, tags)
2. User clicks "Export CSV" button
3. Browser immediately downloads CSV file
4. File named: `timeline-export-2026-02-16-143045.csv`
5. File opens in Excel/Sheets with all filtered data

## CSV Output

### Columns (12 total)

1. **Date** - YYYY-MM-DD (e.g., 2026-02-16)
2. **Time** - HH:mm 24-hour format (e.g., 14:45)
3. **Event Type** - Status Update, Workstream Created, Workstream Closed
4. **Workstream** - Workstream name
5. **Category** - Category name
6. **Status** - Status update text (markdown preserved)
7. **Note** - Additional note text (markdown preserved)
8. **Tags** - Semicolon-separated list of extracted tags
9. **Category Color** - Hex color code
10. **Category Emoji** - Category emoji
11. **Workstream ID** - UUID for reference
12. **Event ID** - Timeline entry ID

### Example Output

```csv
Date,Time,Event Type,Workstream,Category,Status,Note,Tags,Category Color,Category Emoji,Workstream ID,Event ID
2026-02-16,14:45,Status Update,Backend API Refactor,Project,"Completed migration","Need to update docs #backend, #auth",backend;auth,#3B82F6,🚀,550e8400...,status-123
2026-02-16,09:30,Workstream Created,Q1 Planning,Meeting,,,planning,#10B981,📅,650e8400...,created-456
```

## Technical Highlights

### Architecture
- **Frontend Only**: No backend changes required
- **Client-Side**: CSV generation in browser using Blob API
- **Zero Dependencies**: Uses existing project dependencies (date-fns)

### Implementation Components

1. **CSV Export Utility** (`frontend/src/utils/exportTimeline.ts`)
   - CSV field escaping (RFC 4180 compliant)
   - Tag extraction from text
   - Entry to CSV row conversion
   - File download trigger

2. **Export Button Component** (`frontend/src/components/Timeline/ExportButton.tsx`)
   - Visual states (enabled, disabled, exporting)
   - Error handling
   - Tooltip with entry count

3. **Timeline Integration**
   - Updated FilterBar to include export button
   - Button positioned to right with `ml-auto`
   - Passes filtered timeline entries

### Key Features

- **RFC 4180 Compliance**: Proper CSV escaping for commas, quotes, newlines
- **UTF-8 with BOM**: Ensures Excel compatibility on Windows
- **CSV Injection Protection**: Fields starting with =, +, -, @ are prefixed with single quote
- **Tag Extraction**: Automatically extracts #hashtags from text content
- **24-Hour Time Format**: HH:mm format for better sorting and international use
- **Semicolon Tag Separator**: Avoids CSV parsing issues with comma-separated tags
- **Timestamp in Filename**: Easy version tracking and sorting
- **Performance**: < 500ms for 1000 entries
- **Accessibility**: ARIA labels and keyboard navigation support

## Requirements Summary

### Must Have (P0)
- ✅ Export button in Timeline header (right side of filters)
- ✅ Export filtered timeline entries to CSV
- ✅ Comprehensive data (12 columns, optimized order)
- ✅ Proper CSV formatting (escaping, UTF-8 BOM)
- ✅ CSV injection protection (security)
- ✅ 24-hour time format (HH:mm)
- ✅ Semicolon-separated tags
- ✅ Timestamped filename
- ✅ Excel/Google Sheets compatibility
- ✅ Accessibility (ARIA labels, keyboard navigation)

### Should Have (P1)
- ✅ Visual feedback during export
- ✅ Disabled state when no entries
- ✅ Tooltip showing entry count
- ✅ Error handling and user feedback

### Nice to Have (P2 - Future)
- Export format options (JSON, Excel XLSX)
- Column selection
- Scheduled/automated exports
- Import from CSV

## Implementation Phases

### Phase 1: Core CSV Export Utility (3-4 hours)
- CSV field escaping
- Tag extraction
- Entry to row conversion
- CSV generation
- Download function
- Unit tests

### Phase 2: Export Button Component (2-3 hours)
- Component structure
- Icon and styling
- State management
- Error handling
- Component tests

### Phase 3: Timeline Integration (2-3 hours)
- Update FilterBar props
- Add export button to layout
- Update Timeline.tsx
- Integration tests

### Phase 4: Testing & Polish (1-2 hours)
- Excel testing
- Google Sheets testing
- Edge cases
- Browser compatibility
- Performance testing
- Documentation

## Testing Strategy

### Unit Tests
- CSV escaping scenarios
- Tag extraction patterns
- Entry conversion logic
- CSV generation
- Export function

### Component Tests
- Button states and interactions
- Error handling
- Tooltip behavior

### Integration Tests
- Filter state integration
- Data flow from Timeline → FilterBar → ExportButton

### Manual Tests
- Excel compatibility (Windows/Mac)
- Google Sheets import
- Special characters (emojis, quotes, commas)
- Edge cases (empty, large datasets)
- Browser compatibility (Chrome, Firefox, Safari, Edge)

## Success Metrics

### Adoption
- Export button click rate
- Number of exports per user
- Average entries per export

### Quality
- Export error rate < 0.1%
- Export time < 500ms for 1000 entries
- Zero CSV parsing errors in Excel/Sheets

### User Satisfaction
- Positive user feedback
- Reduced manual export requests
- Feature adoption rate

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| CSV formatting issues | High | Medium | RFC 4180 compliance, extensive testing |
| Large dataset performance | Medium | Low | 31-day limit (existing), chunked processing if needed |
| Browser compatibility | Medium | Low | Use well-supported APIs, test major browsers |
| Data privacy | Low | Low | Client-side only, no server storage |

## Dependencies

### External
- date-fns (already in project)

### Browser APIs
- Blob API
- Object URL API
- Download attribute

### Internal
- Timeline component and data structure
- useTimeline hook
- Filter state management

## Files Created/Modified

### New Files (3)
- `frontend/src/utils/exportTimeline.ts`
- `frontend/src/components/Timeline/ExportButton.tsx`
- `frontend/src/test/utils/exportTimeline.test.ts`
- `frontend/src/test/components/ExportButton.test.tsx`

### Modified Files (2)
- `frontend/src/components/Timeline/FilterBar.tsx`
- `frontend/src/pages/Timeline.tsx`

## Deployment

- **Type**: Frontend only
- **Rollback**: Easy (remove button component)
- **Database**: No migrations
- **API**: No changes
- **Monitoring**: Track export usage and errors

## Future Enhancements

### Phase 2 (Not in Current Scope)
1. Additional export formats (JSON, XLSX, PDF)
2. Column selection and customization
3. Export templates
4. Advanced formatting options
5. Import from CSV capability
6. Scheduled/automated exports

## Resources

### RFC 4180 - CSV Standard
https://datatracker.ietf.org/doc/html/rfc4180

### Browser APIs
- [Blob API](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- [Object URL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL)
- [Download Attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-download)

## Contact

For questions or clarifications on this specification, please contact the product or technical team.

---

**Status**: ✅ Ready for Implementation  
**Next Steps**: Begin Phase 1 - Core CSV Export Utility

---

*Last Updated: 2026-02-16*
