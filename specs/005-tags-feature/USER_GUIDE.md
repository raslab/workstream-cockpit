# Tags Feature - User Guide

## What are Tags?

Tags are hashtags (like `#backend` or `#urgent`) that you can use anywhere in your status updates. They help you:
- Organize work across multiple workstreams
- Filter and find related updates quickly
- Visualize common themes with colored pills

## Quick Start

### 1. Configure Tags in Settings

1. Click **Settings** in the navigation
2. Select **Tags** tab
3. Click **Add Tag**
4. Enter a name (e.g., "backend") and choose a color
5. Click **Save**

### 2. Use Hashtags in Status Updates

When adding or updating a workstream status, type hashtags:

```
Working on #backend API improvements - need #review
```

The hashtags will automatically:
- Render as colored pills in the text
- Appear as chips on the workstream card
- Be available for filtering

### 3. Filter by Tags

**In Cockpit:**
- Look for "Filter by tags:" above the workstream list
- Click any tag pill to filter
- Click multiple tags to show workstreams with ANY of those tags
- Click "Clear all" to reset

**In Timeline:**
- Tag filter appears below the date range selector
- Same behavior as Cockpit - multi-select with OR logic

## Features

### Tag Management
- **Create**: Add new tags with custom colors
- **Edit**: Change tag names and colors anytime
- **Delete**: Remove unused tags (with confirmation)
- **Colors**: Full color picker for visual distinction

### Hashtag Detection
Tags are automatically detected when you:
- Type `#tagname` in status field
- Type `#tagname` in notes field
- Use alphanumeric characters, hyphens, or underscores: `#tag-name_123`

**Case-insensitive**: `#Backend`, `#backend`, and `#BACKEND` all match the same tag.

### Visual Rendering
- **Inline pills**: Hashtags render as colored pills in markdown
- **Card chips**: Extracted tags appear as chips on workstream cards
- **Consistent colors**: Colors match your Settings configuration
- **Default color**: Unconfigured tags show in blue (#1DA1F2)

### Filtering Logic
- **OR logic**: Multiple tags = show items with ANY selected tag
- **Cross-field**: Searches both status and notes
- **Real-time**: Filter updates immediately on selection
- **Persistent**: Filters stay active while navigating

## Best Practices

### Naming Tags
- ✅ **Short names**: `backend`, `urgent`, `review`
- ✅ **Lowercase**: Easier to type consistently
- ✅ **Hyphens for multi-word**: `code-review`, `security-audit`
- ❌ **Avoid**: Spaces, special characters (except `-` and `_`)

### Using Colors
- **Red** (#EF4444): Urgent, blocked, critical
- **Amber** (#F59E0B): Needs attention, review needed
- **Blue** (#3B82F6): In progress, backend work
- **Green** (#10B981): Complete, tested, ready
- **Purple** (#8B5CF6): Frontend, design, UX

### Common Workflows

**Priority Tracking:**
```
Status: Implemented feature - needs #review
Note: Tests passing, ready for #code-review
```

**Area of Work:**
```
Status: Working on #backend #api improvements
Note: Updated #database schema for better performance
```

**Cross-Cutting Concerns:**
```
Status: #security audit complete - found #urgent issues
Note: Need to apply fixes across #frontend and #backend
```

## Examples

### Example 1: Backend Work
```
Settings > Tags:
- Name: "backend", Color: Blue (#3B82F6)

Workstream:
- Status: "Refactoring #backend services"
- Result: "backend" appears as blue pill, visible in tag filter
```

### Example 2: Urgent Review
```
Settings > Tags:
- Name: "urgent", Color: Red (#EF4444)
- Name: "review", Color: Amber (#F59E0B)

Workstream:
- Status: "#urgent - need #review before deploy"
- Result: Two colored pills, both tags on card chip
```

### Example 3: Filtering
```
Cockpit with 10 workstreams:
- 3 have #backend
- 2 have #frontend  
- 1 has both #backend and #frontend

Filter: Click "backend" → Shows 4 workstreams (3 + 1)
Filter: Click "frontend" too → Shows 5 workstreams (3 + 2, no duplicates)
```

## Technical Notes

### Tag Extraction
- **Regex pattern**: `/\B#([a-zA-Z0-9_-]+)\b/g`
- **Word boundaries**: `#tag` matches, `test#tag` doesn't
- **Extracted on**: Every status update save
- **Stored**: Text-based, not relational (flexible, simple)

### Filtering
- **Backend**: OR logic in `workstreamService.ts`
- **Frontend**: Multi-select pills with React Query
- **Query params**: `?tags=backend,frontend`
- **Case handling**: Normalized to lowercase

### Rendering
- **Markdown preprocessing**: Converts `#tag` to placeholder
- **React components**: Placeholders become `<HashtagSpan>` components
- **Color lookup**: Real-time from Settings > Tags
- **Fallback**: Default blue for unconfigured tags

## Troubleshooting

**Q: My hashtag isn't rendering as a pill**
- Check if it starts with `#` and has no spaces
- Must use alphanumeric, hyphens, or underscores only
- Try `#backend` not `#back end`

**Q: Tag filter doesn't show any results**
- Make sure workstreams actually use that hashtag in status/notes
- Check spelling - filters are case-insensitive but must match
- Try typing the hashtag in a status update first

**Q: Tag color not updating**
- Colors update immediately after save in Settings
- Refresh the page if needed
- Check Settings > Tags to verify color saved

**Q: Can't delete a tag**
- Deletion requires confirmation
- Tags can be deleted even if used in workstreams
- Hashtags will render with default color after deletion

**Q: How do I filter by multiple tags?**
- Click multiple tag pills in the filter
- Shows workstreams with ANY of the selected tags (OR logic)
- Click "Clear all" to reset filter

## Integration with Other Features

### With Categories
- **Categories**: Top-level organization (Project, Operations, People)
- **Tags**: Cross-cutting themes (backend, urgent, review)
- **Use together**: Category = "Project", Tags = `#backend #urgent`

### With Timeline
- Tag filter works on Timeline page
- Shows all status updates across workstreams with selected tags
- Great for cross-workstream reporting

### With Markdown
- Hashtags work everywhere markdown is supported
- Status field, notes field, context field
- Renders consistently in all views

## Summary

Tags provide lightweight, flexible organization:
- 🏷️ Configure tags in Settings with colors
- #️⃣ Use hashtags anywhere in status updates
- 🔍 Filter Cockpit and Timeline by tags
- 🎨 Visual pills and chips for quick scanning
- ⚡ Real-time updates, no manual tagging needed

Start simple with 3-5 core tags, add more as patterns emerge!
