# Feature Specification: Tags System

**Feature ID**: 005-tags-feature
**Version**: 1.0
**Status**: Planning
**Created**: 2026-01-06
**Last Updated**: 2026-01-06

---

## Executive Summary

This specification defines a comprehensive tagging system that enables users to create reusable, color-coded hashtags for cross-referencing entities (people, projects, places, teams) within workstream contexts and status update notes. Tags provide quick filtering and visual organization beyond the existing category system.

**Key Capabilities**:
1. **Tag Management**: Create and configure tags in Settings with custom names and colors
2. **Tag Insertion**: Quick hashtag insertion (#tagname) in text fields using autocomplete
3. **Tag Recognition**: Automatic detection and rendering of hashtags in markdown content
4. **Tag Filtering**: Filter cockpit and timeline views by selected tags
5. **Tag Display**: Show tags on workstream chips for quick visual scanning

**Business Value**:
- **Cross-referencing**: Link workstreams by people, teams, projects, or any custom dimension
- **Quick Navigation**: Click tags to filter views instantly
- **Visual Organization**: Color-coded tags for rapid scanning
- **Flexibility**: User-defined taxonomy beyond fixed categories

---

## Problem Statement

### Current State

**Limited Organization**
- Categories provide one-dimensional grouping (Project, Delegated, Ongoing, Watching)
- Cannot cross-reference workstreams by person, team, location, or custom dimensions
- No way to see "all workstreams mentioning @john" or "#backend-team"
- Cannot track themes across different categories

**Manual Cross-referencing**
- Users manually write person names in free text
- No standardization of entity references
- Cannot filter by these references
- Typos create fragmentation

**Missing Navigation**
- No quick way to find related workstreams
- Must manually search or browse all items
- Time wasted on context switching

### Desired State

**Multi-dimensional Organization**
- Tags complement categories (categories = type, tags = cross-cutting concerns)
- Predefined tags for people, teams, projects, locations
- Standardized naming prevents fragmentation
- Visual distinction through colors

**Smart References**
- Type `#` to see autocomplete of available tags
- Tags rendered as colored, clickable hashtags
- Click tag to filter all related workstreams
- Consistent naming across the application

**Efficient Navigation**
- Quick filtering from any view
- Tags visible on workstream chips
- See at a glance which tags are referenced
- Jump to filtered view with one click

---

## Requirements

### Functional Requirements

#### FR-1: Tag Management in Settings
**Priority**: P0 (Must Have)

**Description**: Users can create, edit, and delete tags in the Settings panel.

**User Stories**:
- As a user, I can navigate to Settings > Tags to manage my tags
- As a user, I can create a new tag with a name and color
- As a user, I can edit existing tag names and colors
- As a user, I can delete tags (with confirmation if in use)
- As a user, I can see a list of all my tags with their colors and usage count

**Acceptance Criteria**:
- Settings panel has a "Tags" tab alongside existing tabs
- Tag creation form validates unique names (case-insensitive)
- Tag names must follow hashtag rules: alphanumeric, hyphens, underscores
- Color picker provides predefined palette plus custom colors
- Default color is `#1DA1F2` (Twitter blue)
- Delete button shows warning if tag is used in workstreams
- Tag list shows usage count (number of workstreams/updates referencing it)

**Technical Notes**:
- Tag names stored lowercase for consistency
- Display names preserve original case in UI
- Validation regex: `/^[a-zA-Z0-9_-]+$/`

---

#### FR-2: Tag Insertion with Autocomplete
**Priority**: P0 (Must Have)

**Description**: Users can type `#` followed by characters to trigger tag autocomplete in workstream context and status update notes.

**User Stories**:
- As a user, typing `#` shows me a dropdown of available tags
- As a user, typing `#bac` filters to tags containing "bac" (e.g., #backend)
- As a user, I can select a tag from dropdown with keyboard or mouse
- As a user, selected tags are inserted as `#tagname` in the text

**Acceptance Criteria**:
- Autocomplete triggers on `#` character
- Dropdown appears below cursor position
- Dropdown filters tags by partial match (case-insensitive)
- Arrow keys navigate dropdown
- Enter/Tab selects highlighted tag
- Click selects tag
- Escape closes dropdown
- Dropdown shows tag name and color preview
- Works in both workstream context and status note fields

**Technical Notes**:
- Use contenteditable or textarea with overlay for positioning
- Debounce search for performance (200ms)
- Show max 10 tags in dropdown
- Match against tag name

---

#### FR-3: Tag Rendering in Markdown
**Priority**: P0 (Must Have)

**Description**: Tags written as `#tagname` are automatically detected in markdown content and rendered as styled, clickable links.

**User Stories**:
- As a user, `#backend` in my text appears as a blue rounded bubble
- As a user, tags use the custom color I configured in settings
- As a user, clicking a tag navigates to cockpit with that tag filter active
- As a user, undefined tags (not in settings) render as plain text

**Acceptance Criteria**:
- Hashtag pattern `/\B#([a-zA-Z0-9_-]+)\b/g` detected in rendered markdown
- Matching tags rendered with:
  - Rounded background using tag color (opacity 0.2)
  - Text color using tag color (darker variant)
  - Hash symbol prefix visible
  - Clickable as link
- Non-matching hashtags render as plain text (no special styling)
- Rendering works in workstream context and status note displays
- Mobile: tags are tappable with appropriate touch target size

**Technical Notes**:
- Extend markdown renderer with custom tag plugin
- Tag lookup must be fast (consider caching tag list)
- Render as `<a>` element with `href` to cockpit filter
- Prevent XSS: validate tag names server-side

---

#### FR-4: Tag Filtering
**Priority**: P0 (Must Have)

**Description**: Users can filter cockpit and timeline views to show only workstreams/updates containing specific tags.

**User Stories**:
- As a user, I can click a tag to filter the current view
- As a user, I can select multiple tags to filter by (OR logic)
- As a user, I can see active tag filters as chips above the list
- As a user, I can clear individual tag filters
- As a user, I can clear all filters at once

**Acceptance Criteria**:
- Clicking a tag adds it to active filters
- Filter chips appear in header area
- Filter chips show tag color
- Clicking X on chip removes that filter
- "Clear all" button appears when filters active
- Filtering applies to:
  - Cockpit: workstreams with tags in context or any status update
  - Timeline: status updates with tags in notes
- Multiple tags use OR logic (match any tag)
- Filtered views persist in URL query params for sharing
- Navigation preserves filters when appropriate

**Technical Notes**:
- Query param format: `?tags=backend,frontend`
- Backend API supports `tags` query parameter
- Frontend extracts tags from markdown before filtering
- Cache extracted tags to avoid repeated regex matching

---

#### FR-5: Tag Display on Workstream Chips
**Priority**: P1 (Should Have)

**Description**: Workstream chips in cockpit and timeline views show a summary of tags mentioned in the workstream or its updates.

**User Stories**:
- As a user, I can see tags on a workstream chip without opening it
- As a user, I see the first 3 tags with `...` if more exist
- As a user, tags on chips are clickable to filter
- As a user, I can distinguish tagged workstreams at a glance

**Acceptance Criteria**:
- Workstream chips show tag line below other metadata
- Tag line displays max 3 tags as small colored bubbles
- If more than 3 tags, show "+ N more" or "..."
- Tags extracted from:
  - Workstream context field
  - All status update notes
- Duplicates removed (show each tag once)
- Tags ordered by first appearance
- Clicking tag applies filter
- Mobile: tags are tappable
- Status update chips DO NOT show tags (only workstream chips)

**Technical Notes**:
- Backend returns aggregated tags with workstream data
- Consider performance: pre-compute tags or cache
- Frontend displays compact tag bubbles (smaller than full renders)

---

### Non-Functional Requirements

#### NFR-1: Performance
- Tag autocomplete responds within 200ms
- Tag filtering updates view within 500ms
- Tag extraction doesn't block UI rendering
- Support up to 100 tags per project without degradation

#### NFR-2: Usability
- Tag colors provide sufficient contrast (WCAG AA)
- Tag names are readable at small sizes
- Mobile: touch targets at least 44x44px
- Keyboard navigation fully supported

#### NFR-3: Data Integrity
- Tags are project-scoped (not shared across projects)
- Deleting a tag doesn't delete text (tag becomes plain text)
- Tag renames don't affect existing references (use ID internally if needed, or keep as text)
- No orphaned data

#### NFR-4: Testing
- Integration tests for all tag API endpoints (positive and negative cases)
- Unit tests for tag extraction and rendering logic
- E2E tests for tag autocomplete and filtering flows

---

## Data Model

### Tag Table Schema

```prisma
model Tag {
  id        String   @id @default(uuid())
  projectId String   @map("project_id")
  name      String   // lowercase, unique per project
  color     String   // hex color code
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, name])
  @@index([projectId])
  @@map("tags")
}
```

**Design Decision**: Tags are stored as configuration, not relationships. Tag references in text remain as plain text (`#tagname`). This approach:
- ✅ Simplifies data model (no join tables)
- ✅ Allows organic tag usage without strict enforcement
- ✅ Persists tag references even if tag deleted from settings
- ❌ Requires regex parsing to extract tags (mitigated with caching)
- ❌ Renaming tag doesn't update existing text (acceptable tradeoff)

---

## API Endpoints

### Tag Management Endpoints

#### `GET /api/tags`
**Description**: Get all tags for current project

**Request**:
```
GET /api/tags
Authorization: Bearer {token}
```

**Response** (200):
```json
{
  "tags": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "name": "backend",
      "color": "#1DA1F2",
      "createdAt": "2026-01-06T10:00:00Z",
      "updatedAt": "2026-01-06T10:00:00Z"
    }
  ]
}
```

**Error Cases**:
- 401: Unauthorized
- 404: Project not found

---

#### `POST /api/tags`
**Description**: Create a new tag

**Request**:
```json
{
  "name": "backend",
  "color": "#1DA1F2"
}
```

**Validation**:
- `name`: required, 1-50 chars, matches `/^[a-zA-Z0-9_-]+$/`
- `color`: required, valid hex color

**Response** (201):
```json
{
  "tag": {
    "id": "uuid",
    "projectId": "uuid",
    "name": "backend",
    "color": "#1DA1F2",
    "createdAt": "2026-01-06T10:00:00Z",
    "updatedAt": "2026-01-06T10:00:00Z"
  }
}
```

**Error Cases**:
- 400: Invalid input (name format, color format, duplicate name)
- 401: Unauthorized
- 404: Project not found

---

#### `PATCH /api/tags/:id`
**Description**: Update an existing tag

**Request**:
```json
{
  "name": "backend-team",
  "color": "#0E76A8"
}
```

**Validation**: Same as POST

**Response** (200):
```json
{
  "tag": { /* updated tag */ }
}
```

**Error Cases**:
- 400: Invalid input
- 401: Unauthorized
- 404: Tag not found
- 403: Tag belongs to different project

---

#### `DELETE /api/tags/:id`
**Description**: Delete a tag

**Request**:
```
DELETE /api/tags/{id}
Authorization: Bearer {token}
```

**Response** (204): No content

**Error Cases**:
- 401: Unauthorized
- 404: Tag not found
- 403: Tag belongs to different project

**Note**: Deletion removes tag from settings but doesn't affect existing text references.

---

### Enhanced Endpoints

#### `GET /api/workstreams`
**Enhanced**: Add `tags` query parameter for filtering

**Request**:
```
GET /api/workstreams?tags=backend,frontend
```

**Response**: Workstreams containing any of the specified tags

**Implementation**:
- Extract tags from `workstreams.context` and `statusUpdates.note`
- Filter where extracted tags intersect with requested tags
- Performance: consider full-text search or pre-computed tag columns

---

#### `GET /api/timeline`
**Enhanced**: Add `tags` query parameter for filtering

**Request**:
```
GET /api/timeline?tags=backend
```

**Response**: Status updates containing any of the specified tags

---

## User Interface

### Settings > Tags Tab

**Layout**:
```
┌─────────────────────────────────────────┐
│ Settings                                │
├─────────────────────────────────────────┤
│ [General] [Categories] [Tags]           │  ← Tabs
├─────────────────────────────────────────┤
│                                         │
│ Tags                                    │
│ ─────────────────────────────────────── │
│                                         │
│ Create tags to reference people,       │
│ teams, projects, or any other entity    │
│ across your workstreams.                │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Name          Color      Actions    │ │
│ ├─────────────────────────────────────┤ │
│ │ #backend      [🔵]       [✏️] [🗑️]  │ │
│ │ #frontend     [🟢]       [✏️] [🗑️]  │ │
│ │ #john         [🟡]       [✏️] [🗑️]  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [+ New Tag]                             │
│                                         │
└─────────────────────────────────────────┘
```

**New Tag Modal**:
```
┌─────────────────────────────────────────┐
│ Create New Tag                     [×]  │
├─────────────────────────────────────────┤
│                                         │
│ Tag Name                                │
│ ┌─────────────────────────────────────┐ │
│ │ backend                             │ │
│ └─────────────────────────────────────┘ │
│ Letters, numbers, hyphens, underscores  │
│                                         │
│ Color                                   │
│ [🔵][🟢][🟡][🟠][🔴][🟣][⚫][⚪]         │
│ Custom: [#______]                       │
│                                         │
│              [Cancel]  [Create Tag]     │
└─────────────────────────────────────────┘
```

---

### Tag Autocomplete

**Appearance** (while typing in textarea):
```
Context: We need to update the #bac█

           ┌───────────────────┐
           │ #backend      🔵  │  ← highlighted
           │ #backend-team 🟢  │
           └───────────────────┘
```

**Behavior**:
- Triggers on `#` character
- Filters as user types
- Position dropdown below cursor
- Keyboard: ↑↓ navigate, Enter selects, Esc closes
- Mouse: click to select

---

### Tag Rendering

**In Markdown Content**:
```
Working with #backend team to resolve #api-issues...
             ─────────                  ──────────
             colored bubble             colored bubble
```

**Rendered HTML** (conceptual):
```html
Working with <a href="/cockpit?tags=backend" class="tag" style="background: rgba(29,161,242,0.2); color: #0c7cd5;">#backend</a> team...
```

**CSS** (example):
```css
.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.9em;
  text-decoration: none;
  font-weight: 500;
}

.tag:hover {
  opacity: 0.8;
}
```

---

### Workstream Chip with Tags

**Cockpit View**:
```
┌──────────────────────────────────────────────┐
│ 🎯 Implement user authentication             │
│ Active • Updated 2h ago                      │
│ #backend #security #john ...                 │  ← Tag line
└──────────────────────────────────────────────┘
```

**Tag Line Specs**:
- Max 3 tags shown
- Small size (0.8em font)
- Clickable
- "+ N more" if >3 tags
- Gray text color, tag colors on bubbles

---

### Tag Filter UI

**Cockpit Header with Active Filters**:
```
┌──────────────────────────────────────────────┐
│ Cockpit                                      │
├──────────────────────────────────────────────┤
│ Filters:  #backend ×  #john ×  [Clear All]   │  ← Filter chips
├──────────────────────────────────────────────┤
│ [Active] [Closed] [All]                      │
│                                              │
│ Workstreams matching filters...              │
└──────────────────────────────────────────────┘
```

**Filter Chip Specs**:
- Rounded pill shape
- Tag color background (opacity 0.3)
- × button to remove
- Hover effect
- "Clear All" button when >1 filter

---

## User Flows

### Flow 1: Create and Use a Tag

1. User navigates to Settings > Tags
2. User clicks "+ New Tag"
3. User enters name "backend" and selects blue color
4. User clicks "Create Tag"
5. Tag appears in tag list
6. User navigates to Cockpit
7. User opens a workstream
8. User types `#b` in context field
9. Autocomplete shows "#backend"
10. User selects tag (Enter or click)
11. Tag inserted as "#backend" in text
12. User saves workstream
13. Tag renders as blue clickable bubble

**Success Criteria**: Tag created, inserted, and rendered correctly

---

### Flow 2: Filter by Tag

1. User viewing Cockpit with multiple workstreams
2. User sees "#backend" tag on a workstream chip
3. User clicks the "#backend" tag
4. View filters to show only workstreams with #backend
5. Filter chip appears in header: "#backend ×"
6. User clicks "×" on filter chip
7. Filter removed, all workstreams shown

**Success Criteria**: Filtering works correctly, can be added and removed

---

### Flow 3: Delete a Tag

1. User navigates to Settings > Tags
2. User sees "backend" tag with usage count "3"
3. User clicks delete (🗑️) on "backend" tag
4. Warning modal: "This tag is used in 3 workstreams. Delete anyway?"
5. User confirms
6. Tag removed from tag list
7. Existing "#backend" references in text remain (as plain text)
8. New "#backend" typed won't have autocomplete or special rendering

**Success Criteria**: Tag deleted from settings, existing text preserved

---

## Edge Cases & Error Handling

### Edge Case 1: Tag Name Conflicts
**Scenario**: User tries to create tag "Backend" when "backend" exists

**Handling**:
- Validation error: "Tag 'backend' already exists (case-insensitive)"
- Show existing tag in error message
- Suggest editing existing tag instead

---

### Edge Case 2: Invalid Tag Characters
**Scenario**: User tries to create tag "my tag" (with space)

**Handling**:
- Validation error: "Tag names can only contain letters, numbers, hyphens, and underscores"
- Show validation hint below input field
- Real-time validation on input

---

### Edge Case 3: Tag in Middle of Word
**Scenario**: Text contains "email#john@example.com"

**Handling**:
- Regex uses word boundary: `\B#` (preceded by non-word char)
- "email#john" won't match (# preceded by letter)
- Only matches when # starts after space, punctuation, or line start

---

### Edge Case 4: Undefined Tag in Text
**Scenario**: Text contains "#nonexistent" tag not in settings

**Handling**:
- Rendered as plain text (no special styling)
- Not clickable
- Allows organic tag usage before formal definition

---

### Edge Case 5: Tag Deleted But Referenced
**Scenario**: Tag deleted from settings but still appears in old workstreams

**Handling**:
- Text remains unchanged
- Renders as plain text (no tag styling)
- User can still read historical references
- Can re-create tag with same name to restore styling

---

### Edge Case 6: Many Tags on One Workstream
**Scenario**: Workstream has 15 different tags

**Handling**:
- Chip shows first 3 + "+ 12 more"
- Clicking "+ 12 more" expands to show all (modal or inline)
- All tags still filterable
- Performance: limit extraction to first 20 unique tags

---

## Testing Strategy

### Backend Integration Tests

**Tag API Tests** (`backend/tests/integration/tags.test.ts`):

```typescript
describe('Tag Management API', () => {
  describe('POST /api/tags', () => {
    it('creates tag with valid data', async () => {
      // Test: 201 created with valid name and color
    });

    it('rejects duplicate tag name (case-insensitive)', async () => {
      // Test: 400 error when creating "Backend" if "backend" exists
    });

    it('rejects invalid tag name with spaces', async () => {
      // Test: 400 error for "my tag"
    });

    it('rejects invalid tag name with special chars', async () => {
      // Test: 400 error for "my@tag"
    });

    it('rejects invalid color format', async () => {
      // Test: 400 error for color "blue" (not hex)
    });

    it('rejects unauthorized requests', async () => {
      // Test: 401 without auth token
    });
  });

  describe('GET /api/tags', () => {
    it('returns all tags for project', async () => {
      // Test: 200 with array of tags
    });

    it('returns empty array when no tags', async () => {
      // Test: 200 with []
    });

    it('rejects unauthorized requests', async () => {
      // Test: 401 without auth token
    });
  });

  describe('PATCH /api/tags/:id', () => {
    it('updates tag name and color', async () => {
      // Test: 200 with updated tag
    });

    it('rejects duplicate name', async () => {
      // Test: 400 when renaming to existing tag
    });

    it('rejects tag from different project', async () => {
      // Test: 403 when editing other project's tag
    });

    it('rejects non-existent tag', async () => {
      // Test: 404 for invalid tag ID
    });
  });

  describe('DELETE /api/tags/:id', () => {
    it('deletes tag successfully', async () => {
      // Test: 204 no content
    });

    it('rejects tag from different project', async () => {
      // Test: 403
    });

    it('rejects non-existent tag', async () => {
      // Test: 404
    });
  });
});
```

**Workstream Filtering Tests** (`backend/tests/integration/workstreams.test.ts`):

```typescript
describe('GET /api/workstreams with tag filtering', () => {
  it('filters workstreams by single tag in context', async () => {
    // Create workstream with "#backend" in context
    // GET /api/workstreams?tags=backend
    // Assert: returns matching workstream
  });

  it('filters workstreams by tag in status update', async () => {
    // Create workstream with "#backend" in status note
    // GET /api/workstreams?tags=backend
    // Assert: returns matching workstream
  });

  it('filters by multiple tags (OR logic)', async () => {
    // Create workstreams with different tags
    // GET /api/workstreams?tags=backend,frontend
    // Assert: returns workstreams with either tag
  });

  it('returns empty array when no matches', async () => {
    // GET /api/workstreams?tags=nonexistent
    // Assert: returns []
  });

  it('handles tag case-insensitively', async () => {
    // Create workstream with "#Backend"
    // GET /api/workstreams?tags=backend
    // Assert: returns matching workstream
  });
});
```

---

### Frontend Unit Tests

**Tag Extraction Tests** (`frontend/src/utils/tagExtractor.test.ts`):

```typescript
describe('extractTags', () => {
  it('extracts single tag', () => {
    expect(extractTags('Working on #backend')).toEqual(['backend']);
  });

  it('extracts multiple tags', () => {
    expect(extractTags('#backend #frontend #api')).toEqual(['backend', 'frontend', 'api']);
  });

  it('removes duplicates', () => {
    expect(extractTags('#backend and #backend')).toEqual(['backend']);
  });

  it('handles tags with hyphens and underscores', () => {
    expect(extractTags('#backend-team #api_v2')).toEqual(['backend-team', 'api_v2']);
  });

  it('ignores invalid tags with spaces', () => {
    expect(extractTags('#my tag')).toEqual(['my']);
  });

  it('ignores tags in middle of words', () => {
    expect(extractTags('email#john@test')).toEqual([]);
  });

  it('handles empty string', () => {
    expect(extractTags('')).toEqual([]);
  });

  it('handles text without tags', () => {
    expect(extractTags('No tags here')).toEqual([]);
  });
});
```

**Tag Renderer Tests** (`frontend/src/components/TagRenderer.test.tsx`):

```typescript
describe('TagRenderer', () => {
  it('renders tag as styled link', () => {
    const tags = [{ name: 'backend', color: '#1DA1F2' }];
    render(<TagRenderer text="Working on #backend" tags={tags} />);
    
    const link = screen.getByRole('link', { name: /#backend/ });
    expect(link).toHaveAttribute('href', '/cockpit?tags=backend');
  });

  it('renders undefined tags as plain text', () => {
    const tags = [];
    render(<TagRenderer text="Working on #backend" tags={tags} />);
    
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(/Working on #backend/)).toBeInTheDocument();
  });

  it('applies tag color to styled tags', () => {
    const tags = [{ name: 'backend', color: '#FF0000' }];
    render(<TagRenderer text="#backend" tags={tags} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveStyle({ color: expect.stringContaining('255, 0, 0') });
  });
});
```

---

### E2E Testing Considerations

**Not required for MVP** but recommended for future:
- Tag autocomplete flow (type `#`, select tag, verify insertion)
- Click tag to filter flow (click tag, verify URL update, verify filtered results)
- Create tag in settings flow (open modal, fill form, verify tag appears)

---

## Implementation Phases

### Phase 1: Backend Foundation (Days 1-2)
1. Database migration: Create `tags` table
2. Tag service: CRUD operations
3. Tag routes: REST API endpoints
4. Integration tests: Tag management
5. Tag extraction utility: Regex-based tag finder
6. Enhanced workstream/timeline services: Tag filtering
7. Integration tests: Filtering by tags

**Deliverable**: Working backend API for tag management and filtering

---

### Phase 2: Frontend Settings (Day 3)
1. Tags settings tab component
2. Tag list display
3. Tag create/edit modal
4. Tag delete with confirmation
5. API integration for tag CRUD
6. Form validation

**Deliverable**: Functional tag management UI in Settings

---

### Phase 3: Tag Autocomplete (Day 4)
1. Autocomplete component
2. Trigger detection on `#` character
3. Dropdown positioning
4. Tag filtering logic
5. Keyboard navigation
6. Tag insertion on selection
7. Integration with context and note fields

**Deliverable**: Working autocomplete in text fields

---

### Phase 4: Tag Rendering (Day 5)
1. Markdown plugin for tag detection
2. Tag styling component
3. Click handler for filter navigation
4. Tag color application
5. Undefined tag handling
6. Integration with existing markdown renderer

**Deliverable**: Tags render as styled, clickable links

---

### Phase 5: Tag Filtering (Day 6)
1. Filter state management
2. Filter chip component
3. Filter application to workstream list
4. Filter application to timeline
5. URL query param sync
6. Clear filter actions

**Deliverable**: Working filter UI and functionality

---

### Phase 6: Tag Display on Chips (Day 7)
1. Tag aggregation in workstream data
2. Tag line component for chips
3. Tag limit (first 3 + more indicator)
4. Clickable tags on chips
5. Mobile responsiveness

**Deliverable**: Tags visible on workstream chips

---

### Phase 7: Polish & Testing (Day 8)
1. Cross-browser testing
2. Mobile testing
3. Performance optimization
4. Documentation updates
5. Bug fixes

**Deliverable**: Production-ready feature

---

## Migration & Deployment

### Database Migration

**Migration File**: `backend/prisma/migrations/YYYYMMDDHHMMSS_add_tags/migration.sql`

```sql
-- Create tags table
CREATE TABLE "tags" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "project_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "tags_project_id_fkey" FOREIGN KEY ("project_id") 
    REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique index on project_id + name
CREATE UNIQUE INDEX "tags_project_id_name_key" ON "tags"("project_id", "name");

-- Create index on project_id for faster lookups
CREATE INDEX "tags_project_id_idx" ON "tags"("project_id");
```

**Rollback Plan**:
```sql
DROP INDEX "tags_project_id_idx";
DROP INDEX "tags_project_id_name_key";
DROP TABLE "tags";
```

**Zero Downtime**: No data migration needed (new table, no changes to existing schema)

---

### Deployment Checklist

- [ ] Database migration tested locally
- [ ] Database migration tested on staging
- [ ] Backend integration tests passing
- [ ] Frontend unit tests passing
- [ ] API documentation updated
- [ ] User documentation created
- [ ] Performance testing completed
- [ ] Security review completed
- [ ] Accessibility testing completed
- [ ] Mobile testing completed
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Feature flag ready (if using)

---

## Success Metrics

### Adoption Metrics
- **Tag Creation Rate**: Number of tags created per user
- **Tag Usage Rate**: Percentage of workstreams with tag references
- **Filter Usage**: Number of times tag filters applied per session

### Engagement Metrics
- **Click-through Rate**: Percentage of rendered tags that are clicked
- **Autocomplete Usage**: Percentage of tags inserted via autocomplete vs manual typing
- **Tags per Workstream**: Average number of unique tags per workstream

### Quality Metrics
- **Tag Standardization**: Reduction in typos/variants for common entities
- **Cross-reference Discovery**: Increase in related workstream discoveries
- **Time to Filter**: Average time from tag click to filtered view

### Technical Metrics
- **API Response Time**: Tag filtering endpoint <500ms p95
- **Autocomplete Latency**: <200ms from keystroke to dropdown
- **Tag Extraction Performance**: <50ms for typical workstream

---

## Future Enhancements

### Phase 2 Features (Post-MVP)

**Tag Suggestions**
- Analyze text to suggest relevant tags
- ML-based entity recognition (person names, project names)
- Auto-create tags from suggestions

**Tag Hierarchies**
- Parent-child tag relationships
- E.g., #backend > #backend-api > #backend-auth
- Filtering includes child tags

**Tag Analytics**
- Most used tags dashboard
- Tag co-occurrence analysis
- Tag trends over time

**Tag Permissions**
- Admin-managed tags vs user-created tags
- Tag approval workflow
- Tag templates for teams

**Bulk Tag Operations**
- Apply tag to multiple workstreams at once
- Find and replace tags
- Merge duplicate tags

**Tag Import/Export**
- Export tag configuration
- Import tags from templates
- Share tags across projects

---

## Appendix

### A. Tag Regex Explained

**Pattern**: `/\B#([a-zA-Z0-9_-]+)\b/g`

**Breakdown**:
- `\B`: Non-word boundary (prevents matching mid-word)
- `#`: Literal hash character
- `([a-zA-Z0-9_-]+)`: Capture group for tag name
  - `a-zA-Z`: Letters
  - `0-9`: Numbers
  - `_-`: Underscore and hyphen
  - `+`: One or more characters
- `\b`: Word boundary (tag ends at non-word char)
- `g`: Global flag (find all matches)

**Examples**:
- ✅ Matches: `#backend`, `#john`, `#api-v2`, `#team_alpha`
- ❌ No match: `email#john` (word boundary), `#my tag` (space breaks match)

---

### B. Color Palette Recommendations

**Predefined Colors** (for color picker):
- Blue: `#1DA1F2` (default, Twitter blue)
- Green: `#10B981` (success green)
- Yellow: `#F59E0B` (warning yellow)
- Orange: `#F97316` (orange)
- Red: `#EF4444` (red)
- Purple: `#8B5CF6` (purple)
- Gray: `#6B7280` (neutral gray)
- Pink: `#EC4899` (pink)

**Contrast Requirements**: All colors tested for WCAG AA contrast against white background.

---

### C. Example Tag Configurations

**People Tags**:
- #john (blue)
- #sarah (green)
- #mike (orange)

**Team Tags**:
- #backend-team (purple)
- #frontend-team (yellow)
- #design-team (pink)

**Project Tags**:
- #project-alpha (red)
- #project-beta (blue)
- #project-gamma (green)

**Location Tags**:
- #sf-office (gray)
- #ny-office (gray)
- #remote (gray)

**Technology Tags**:
- #api (blue)
- #database (purple)
- #infrastructure (orange)

---

### D. Comparison with Categories

**Categories vs Tags**:

| Aspect | Categories | Tags |
|--------|-----------|------|
| Purpose | Classify workstream type | Cross-reference entities |
| Cardinality | One per workstream | Many per workstream |
| Scope | Workstream-level | Text-level (in context/notes) |
| Mutability | Can change | Embedded in text |
| Examples | Project, Delegated, Ongoing | #john, #backend, #api |
| Use Case | "What type is this?" | "Who/what is involved?" |

**Both are needed**: Categories for primary classification, tags for secondary dimensions.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-06 | System | Initial specification created |

---

## Approval

- [ ] Product Owner
- [ ] Tech Lead
- [ ] UX Designer
- [ ] QA Lead

**Status**: Draft - Ready for Review
