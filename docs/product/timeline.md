# Timeline

The timeline is the cross-stream activity log. It answers what moved recently, where it moved, and which stream or sub-stream created the activity.

## Event types

Timeline entries can include:

- `status_update` — narrative stream update.
- `workstream_created` — stream creation.
- `workstream_closed` — stream closure/archive.
- `parent_changed` — stream moved under a different parent stream or detached to top level.
- `sub_stream_created` — sub-stream creation under a parent stream.

## Filters

Timeline filters include:

- stream type/category
- tag
- event type
- date range
- stream scope: all, top-level, sub-streams, or under a selected parent stream
- include sub-streams when filtering under a parent stream

Date presets include today, recent ranges such as last 7 or 30 days, this month, and custom start/end dates where the UI exposes them.

## Parent stream context

Timeline entries include parent stream metadata when relevant, including parent id/name, parent stream path, and structural movement metadata for parent changes.

## CSV export

The timeline can export the currently loaded timeline entries to CSV from the filter bar. Export is disabled when there are no entries.

CSV behavior:

- Client-side generation.
- Filename format: `timeline-export-YYYY-MM-DD-HHmmss.csv`.
- UTF-8 BOM is included for Excel compatibility.
- Fields are escaped according to RFC 4180-style CSV rules.
- Spreadsheet formula injection is mitigated by prefixing values that start with `=`, `+`, `-`, or `@`.

Current CSV columns:

1. Date
2. Time
3. Event Type
4. Workstream
5. Category
6. Status
7. Note
8. Tags
9. Parent ID
10. Parent Workstream
11. Parent Streams Path
12. Parent Stream Path
13. old_parent_id
14. new_parent_id
15. Old Parent
16. New Parent
17. Category Color
18. Category Emoji
19. Workstream ID
20. Event ID

Product prose should refer to stream types, but the CSV keeps `Category` column names for compatibility with the current implementation.
