# Tags Feature Refactoring: Display Names vs Tag IDs

## Overview

This refactoring implements a sophisticated tag system where:
- **Tag Display Names**: User-friendly names with spaces (e.g., "Alan Awake", "Backend Team")
- **Tag IDs**: Lowercase with underscores for matching/extraction (e.g., "alan_awake", "backend_team")
- **Text Usage**: Users type tag IDs like `#alan_awake` in content
- **UI Display**: Tags render with display names but store IDs internally

## Changes Made

### 1. Database Schema (`backend/prisma/schema.prisma`)
- Added `displayName` field to `Tag` model
- `name` field now stores the ID (e.g., "alan_awake")
- `displayName` stores user-friendly name (e.g., "Alan Awake")
- Migration: `20260107000000_add_tag_display_name`

### 2. Backend Service (`backend/src/services/tagService.ts`)
**New Functions:**
- `generateTagId(displayName: string)`: Converts "Alan Awake" → "alan_awake"
- `validateTagDisplayName(displayName: string)`: Allows spaces, hyphens, underscores

**Updated Functions:**
- `createTag`: Accepts `displayName`, generates tag ID automatically
- `updateTag`: Updates both `displayName` and regenerates ID if name changes

**Validation:**
- Display names can contain spaces, hyphens, underscores
- Must start and end with alphanumeric characters
- Max length: 50 characters

### 3. Backend Routes (`backend/src/routes/tags.ts`)
**POST /api/tags:**
- Request: `{ displayName: string, color: string }`
- Response: `{ tag, message }` where message shows: "Tag created: #Alan Awake (ID: #alan_awake)"

**PATCH /api/tags/:id:**
- Request: `{ displayName?: string, color?: string }`
- Response: `{ tag, message }` with ID information

### 4. Frontend Types (`frontend/src/types/tag.ts`)
```typescript
export interface Tag {
  id: string;
  projectId: string;
  name: string;          // Tag ID: "alan_awake"
  displayName: string;   // Display name: "Alan Awake"
  color: string;
  createdAt: string;
  updatedAt: string;
}
```

### 5. Settings UI (`frontend/src/pages/TagManagement.tsx`)
**Create/Edit Tag Form:**
- Input field for display name (allows spaces)
- Real-time preview of generated tag ID
- Helper text explaining ID usage
- Example: "Use #alan_awake in text for autocompletion"

**Tag List Display:**
- Shows display name prominently: "#Alan Awake"
- Shows ID below: "ID: #alan_awake"
- Help section explains how to use tag IDs in text

### 6. Tag Autocomplete (`frontend/src/components/Tag/TagAutocomplete.tsx`)
**Behavior:**
- Triggers on `#` character
- Matches against both ID and display name
- Shows display name in dropdown (e.g., "Alan Awake")
- Also shows ID below for clarity
- **Inserts tag ID** when selected (e.g., `#alan_awake`)
- Single-word pattern matching only (no spaces in typed tags)

**Dropdown Display:**
```
┌──────────────────────────┐
│ 🟦 #Alan Awake          │
│    ID: #alan_awake       │
├──────────────────────────┤
│ 🟩 #Backend Team         │
│    ID: #backend_team     │
└──────────────────────────┘
```

### 7. Tag Chip Rendering (`frontend/src/components/Tag/TagChip.tsx`)
- Receives tag ID as prop (e.g., "alan_awake")
- Looks up tag in settings to get displayName
- Renders with display name: "#Alan Awake"
- Tooltip shows tag ID
- Clicking navigates to filtered view using tag ID

### 8. Markdown Renderer (`frontend/src/components/Markdown/MarkdownRenderer.tsx`)
- Extracts tag IDs from text (e.g., `#alan_awake`)
- Renders as colored pills with display names
- Clickable to filter by tag

## User Flow Examples

### Creating a Tag
1. User goes to Settings > Tags
2. Clicks "New Tag"
3. Types "Alan Awake" in display name field
4. Sees preview: "Tag ID: #alan_awake"
5. Sees helper text: "Use #alan_awake in text for autocompletion"
6. Clicks "Create Tag"
7. Success message: "Tag created: #Alan Awake (ID: #alan_awake)"

### Using a Tag in Content
1. User creates status update
2. Types `#` character
3. Autocomplete shows "Alan Awake" with "ID: #alan_awake"
4. Selects from dropdown
5. System inserts `#alan_awake` into text
6. Text in database: "Talking to #alan_awake about project"
7. UI displays: "Talking to #Alan Awake about project" (with colored pill)

### Tag Not Recognized
If user types `#Alan Awake` (with spaces):
- System does NOT recognize it as a tag
- Rendered as plain text
- Tag extraction regex only matches single-word patterns
- User must use correct ID: `#alan_awake`

## Technical Details

### Tag ID Generation
```typescript
function generateTagId(displayName: string): string {
  return displayName.trim().toLowerCase().replace(/\s+/g, '_');
}

// Examples:
"Alan Awake" → "alan_awake"
"Backend Team" → "backend_team"
"API v2" → "api_v2"
"Tech-Leads" → "tech-leads"  // Hyphens preserved
```

### Tag Extraction Regex
```typescript
// Unchanged - still matches single-word patterns only
const tagPattern = /\B#([a-zA-Z0-9_-]+)\b/g;

// Matches:
#alan_awake ✅
#backend_team ✅
#tech-leads ✅

// Does NOT match:
#Alan Awake ❌ (space breaks pattern)
#Backend Team ❌ (space breaks pattern)
```

### Display Name Validation
```typescript
// Allows: alphanumeric, spaces, hyphens, underscores
// Must start/end with alphanumeric
const pattern = /^[a-zA-Z0-9][a-zA-Z0-9_\s-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;

// Valid:
"Alan Awake" ✅
"Backend Team" ✅
"API v2" ✅
"Tech-Leads" ✅
"Tech_Leads" ✅

// Invalid:
" Alan" ❌ (starts with space)
"Alan " ❌ (ends with space)
"-Team" ❌ (starts with hyphen)
```

## Migration Path

For existing tags without displayName:
1. Migration copies `name` to `displayName`
2. Existing tags work as before
3. Users can edit tags to add proper display names
4. System regenerates IDs when display names are updated

## Benefits

1. **User-Friendly**: Tags can have descriptive names with spaces
2. **Backward Compatible**: Existing single-word tags work unchanged
3. **Clean Data**: Tag IDs in database are consistent, lowercase, no spaces
4. **Flexible UI**: Can show either ID or display name based on context
5. **Unambiguous**: Tag extraction remains simple and reliable

## Files Modified

**Backend:**
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260107000000_add_tag_display_name/migration.sql`
- `backend/src/services/tagService.ts`
- `backend/src/routes/tags.ts`

**Frontend:**
- `frontend/src/types/tag.ts`
- `frontend/src/pages/TagManagement.tsx`
- `frontend/src/components/Tag/TagAutocomplete.tsx`
- `frontend/src/components/Tag/TagChip.tsx`
- `frontend/src/components/Markdown/MarkdownRenderer.tsx`

## Testing Notes

Tests need to be updated to:
1. Use `displayName` when creating tags
2. Expect tag IDs (not display names) in extracted tags
3. Verify ID generation logic
4. Test display name validation
5. Ensure backward compatibility with existing data

## Next Steps

1. ✅ Database migration created
2. ✅ Backend service updated
3. ✅ Frontend types updated
4. ✅ Settings UI updated
5. ✅ Autocomplete updated
6. ✅ Chip rendering updated
7. ⏳ Update unit tests
8. ⏳ Update integration tests
9. ⏳ Run database migration in development
10. ⏳ Test full user flow
