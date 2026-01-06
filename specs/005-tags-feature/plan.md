# Implementation Plan: Tags System

**Feature**: 005-tags-feature
**Created**: 2026-01-06
**Estimated Duration**: 8 days

---

## Overview

This implementation plan delivers a comprehensive tagging system that enables users to create, manage, and use hashtags for cross-referencing people, projects, teams, and other entities across workstreams and status updates. Tags complement the existing category system by providing multi-dimensional organization and quick filtering capabilities.

**Key Deliverables**:
1. **Tag Management**: CRUD API and UI in Settings for tag configuration
2. **Tag Autocomplete**: Smart hashtag insertion with `#` trigger in text fields
3. **Tag Rendering**: Visual hashtags as colored, clickable links in markdown
4. **Tag Filtering**: Filter cockpit and timeline views by one or more tags
5. **Tag Display**: Show tags on workstream chips for quick scanning

The plan follows TDD principles, starting with backend infrastructure and tests, then frontend implementation with comprehensive test coverage.

---

## Constitution Check

*GATE: Must pass before implementation*

✅ **TDD Mandatory**: Integration tests written first for all API endpoints, unit tests for business logic
✅ **100% Test Coverage**: All tag service functions, API routes, and frontend utilities tested
✅ **Simplicity First**: Tags stored as simple configuration, references as plain text (no complex join tables)
✅ **Data Integrity**: Project-scoped tags, cascade delete on project removal
✅ **Backward Compatibility**: New feature, no breaking changes to existing functionality

**Performance Gates**: 
- Tag filtering optimized with regex caching
- Autocomplete debounced (200ms)
- Tag extraction limited to prevent UI blocking

**Security Gates**: 
- Tag name validation prevents injection
- Tags scoped to project (no cross-project access)
- Markdown rendering sanitized (existing react-markdown safety)

---

## Problem Statement

### Current Pain Points

1. **Single-Dimension Organization**: Categories provide only one axis of classification (Project, Delegated, Ongoing, Watching). Cannot organize by person, team, location, or custom dimensions.

2. **No Cross-Referencing**: Users manually type entity names in free text. No standardization leads to typos and fragmentation (e.g., "John", "john", "@john").

3. **No Quick Filtering**: Cannot quickly find "all workstreams involving John" or "all backend tasks". Must manually browse or search.

4. **Limited Visual Cues**: Important entities (people, teams) blend into text. Hard to scan for specific topics at a glance.

### Why Now

- Users frequently mention people, teams, and projects in workstream contexts
- Demand for "show me all my delegated tasks for John" type queries
- Twitter/social media has trained users to expect hashtag functionality
- Foundation (Settings panel, markdown rendering) already exists from spec 004

---

## Implementation Phases

### Phase 1: Database Schema & Migration (Day 1)

**Goal**: Create `tags` table with proper indexes and constraints

**Deliverables**:
- Prisma schema update with `Tag` model
- Migration script for database changes
- Project-scoped tags with unique name constraint

**Technical Details**:

**Schema Changes** (`backend/prisma/schema.prisma`):
```prisma
model Tag {
  id        String   @id @default(uuid())
  projectId String   @map("project_id")
  name      String   // lowercase, alphanumeric + hyphens/underscores
  color     String   // hex color code
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, name])
  @@index([projectId])
  @@map("tags")
}

// Add to Project model
model Project {
  // ... existing fields
  tags Tag[]  // Add this relation
}
```

**Migration Command**:
```bash
cd backend
npx prisma migrate dev --name add_tags_table
```

**Validation**:
- Run migration on local database
- Verify `tags` table created
- Verify unique constraint on `project_id + name`
- Verify cascade delete on project removal
- Generate Prisma client: `npx prisma generate`

**Time Estimate**: 2 hours

---

### Phase 2: Backend Tag Service (Day 1)

**Goal**: Implement core tag CRUD operations with business logic

**Deliverables**:
- `backend/src/services/tagService.ts` with full CRUD
- Input validation functions
- Error handling

**Functions to Implement**:

```typescript
// backend/src/services/tagService.ts

export interface CreateTagInput {
  projectId: string;
  name: string;
  color: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

// Create a new tag
export async function createTag(input: CreateTagInput): Promise<Tag>

// Get all tags for a project
export async function getTagsByProjectId(projectId: string): Promise<Tag[]>

// Get single tag by ID
export async function getTagById(id: string, projectId: string): Promise<Tag | null>

// Update tag
export async function updateTag(id: string, projectId: string, input: UpdateTagInput): Promise<Tag>

// Delete tag
export async function deleteTag(id: string, projectId: string): Promise<void>

// Validate tag name
export function validateTagName(name: string): boolean

// Normalize tag name (lowercase)
export function normalizeTagName(name: string): string
```

**Validation Rules**:
- Name: 1-50 chars, matches `/^[a-zA-Z0-9_-]+$/`
- Name: unique per project (case-insensitive)
- Color: valid hex format `#RRGGBB`

**Error Handling**:
- Duplicate name → 400 Bad Request
- Invalid format → 400 Bad Request
- Not found → 404 Not Found
- Wrong project → 403 Forbidden

**Time Estimate**: 3 hours

---

### Phase 3: Backend Tag API Routes (Day 1-2)

**Goal**: REST API endpoints for tag management

**Deliverables**:
- `backend/src/routes/tags.ts` with full CRUD routes
- Request validation middleware
- Error handling middleware integration

**Routes to Implement**:

```typescript
// backend/src/routes/tags.ts

import express from 'express';
import { requireAuth } from '../middleware/auth';
import * as tagService from '../services/tagService';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/tags - List all tags for current project
router.get('/', async (req, res) => { ... });

// POST /api/tags - Create new tag
router.post('/', async (req, res) => { ... });

// PATCH /api/tags/:id - Update tag
router.patch('/:id', async (req, res) => { ... });

// DELETE /api/tags/:id - Delete tag
router.delete('/:id', async (req, res) => { ... });

export default router;
```

**Integration**:
```typescript
// backend/src/server.ts
import tagRoutes from './routes/tags';
app.use('/api/tags', tagRoutes);
```

**Request/Response Formats**: See spec.md API Endpoints section

**Time Estimate**: 2 hours

---

### Phase 4: Backend Integration Tests (Day 2)

**Goal**: Comprehensive integration tests for tag API (positive and negative cases)

**Deliverables**:
- `backend/tests/integration/tags.test.ts` with full test suite
- Test helpers for tag creation
- 100% route coverage

**Test Structure**:

```typescript
// backend/tests/integration/tags.test.ts

describe('Tag Management API', () => {
  let authToken: string;
  let projectId: string;

  beforeAll(async () => {
    // Setup test app, auth, project
  });

  afterEach(async () => {
    // Clean up tags
  });

  describe('POST /api/tags', () => {
    it('creates tag with valid data', async () => { ... });
    it('returns 201 with tag object', async () => { ... });
    it('normalizes tag name to lowercase', async () => { ... });
    it('rejects duplicate tag name (case-insensitive)', async () => { ... });
    it('rejects invalid tag name with spaces', async () => { ... });
    it('rejects invalid tag name with special chars (!@#$)', async () => { ... });
    it('rejects empty tag name', async () => { ... });
    it('rejects tag name over 50 chars', async () => { ... });
    it('rejects invalid color format (not hex)', async () => { ... });
    it('rejects missing required fields', async () => { ... });
    it('rejects unauthorized requests (no auth token)', async () => { ... });
  });

  describe('GET /api/tags', () => {
    it('returns all tags for project', async () => { ... });
    it('returns empty array when no tags exist', async () => { ... });
    it('returns tags ordered by creation date', async () => { ... });
    it('does not return tags from other projects', async () => { ... });
    it('rejects unauthorized requests', async () => { ... });
  });

  describe('PATCH /api/tags/:id', () => {
    it('updates tag name', async () => { ... });
    it('updates tag color', async () => { ... });
    it('updates both name and color', async () => { ... });
    it('normalizes updated name to lowercase', async () => { ... });
    it('rejects duplicate name', async () => { ... });
    it('rejects invalid name format', async () => { ... });
    it('rejects invalid color format', async () => { ... });
    it('returns 404 for non-existent tag', async () => { ... });
    it('returns 403 for tag from different project', async () => { ... });
    it('rejects unauthorized requests', async () => { ... });
  });

  describe('DELETE /api/tags/:id', () => {
    it('deletes tag successfully', async () => { ... });
    it('returns 204 no content', async () => { ... });
    it('returns 404 for non-existent tag', async () => { ... });
    it('returns 403 for tag from different project', async () => { ... });
    it('allows GET after delete (tag not found)', async () => { ... });
    it('rejects unauthorized requests', async () => { ... });
  });
});
```

**Test Coverage Goal**: 100% of tag routes and service functions

**Time Estimate**: 4 hours

---

### Phase 5: Tag Extraction Utility (Day 2)

**Goal**: Backend utility to extract tags from text using regex

**Deliverables**:
- `backend/src/utils/tagExtractor.ts` with extraction logic
- Unit tests for edge cases

**Implementation**:

```typescript
// backend/src/utils/tagExtractor.ts

/**
 * Extract unique tag names from text
 * Pattern: #tagname (alphanumeric, hyphens, underscores)
 */
export function extractTags(text: string): string[] {
  if (!text) return [];
  
  const tagPattern = /\B#([a-zA-Z0-9_-]+)\b/g;
  const matches = text.matchAll(tagPattern);
  const tags = new Set<string>();
  
  for (const match of matches) {
    // Normalize to lowercase for consistency
    tags.add(match[1].toLowerCase());
  }
  
  return Array.from(tags);
}

/**
 * Extract tags from multiple text fields
 */
export function extractTagsFromFields(...fields: (string | null | undefined)[]): string[] {
  const allTags = new Set<string>();
  
  for (const field of fields) {
    if (field) {
      extractTags(field).forEach(tag => allTags.add(tag));
    }
  }
  
  return Array.from(allTags);
}
```

**Unit Tests**:
```typescript
// backend/tests/unit/tagExtractor.test.ts

describe('extractTags', () => {
  it('extracts single tag', () => { ... });
  it('extracts multiple tags', () => { ... });
  it('removes duplicates', () => { ... });
  it('normalizes to lowercase', () => { ... });
  it('handles tags with hyphens', () => { ... });
  it('handles tags with underscores', () => { ... });
  it('ignores tags in middle of words', () => { ... });
  it('ignores invalid characters', () => { ... });
  it('handles empty string', () => { ... });
  it('handles null/undefined', () => { ... });
});
```

**Time Estimate**: 2 hours

---

### Phase 6: Enhanced Workstream Filtering (Day 3)

**Goal**: Add tag filtering to workstream and timeline queries

**Deliverables**:
- Enhanced `workstreamService.getWorkstreams()` with tag filter
- Enhanced `timelineService.getTimeline()` with tag filter
- Integration tests for filtering

**Implementation**:

```typescript
// backend/src/services/workstreamService.ts

export interface GetWorkstreamsOptions {
  projectId: string;
  state?: 'active' | 'closed' | 'all';
  tags?: string[]; // NEW: filter by tags
}

export async function getWorkstreams(options: GetWorkstreamsOptions) {
  const { projectId, state = 'all', tags } = options;
  
  // Base query
  let workstreams = await prisma.workstream.findMany({
    where: {
      projectId,
      ...(state !== 'all' && { state }),
    },
    include: {
      category: true,
      statusUpdates: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  // Filter by tags if provided
  if (tags && tags.length > 0) {
    workstreams = workstreams.filter(ws => {
      // Extract tags from context and all status updates
      const wsTexts = [
        ws.context,
        ...ws.statusUpdates.map(su => su.note),
      ];
      const wsTags = extractTagsFromFields(...wsTexts);
      
      // Match if any tag overlaps (OR logic)
      return tags.some(tag => wsTags.includes(tag.toLowerCase()));
    });
  }
  
  return workstreams;
}
```

**Route Changes**:
```typescript
// backend/src/routes/workstreams.ts

router.get('/', async (req, res) => {
  const projectId = req.user!.activeProjectId;
  const state = req.query.state as string | undefined;
  const tagsQuery = req.query.tags as string | undefined;
  
  // Parse comma-separated tags
  const tags = tagsQuery ? tagsQuery.split(',').map(t => t.trim()) : undefined;
  
  const workstreams = await workstreamService.getWorkstreams({
    projectId,
    state,
    tags,
  });
  
  res.json({ workstreams });
});
```

**Integration Tests**:
```typescript
// backend/tests/integration/workstreams.test.ts

describe('GET /api/workstreams with tag filtering', () => {
  it('filters by single tag in context', async () => { ... });
  it('filters by tag in status update note', async () => { ... });
  it('filters by multiple tags (OR logic)', async () => { ... });
  it('returns empty array when no matches', async () => { ... });
  it('handles case-insensitive matching', async () => { ... });
  it('combines tag filter with state filter', async () => { ... });
});
```

**Performance Consideration**: For large datasets, consider adding a computed `tags` column to workstreams table in future optimization.

**Time Estimate**: 4 hours

---

### Phase 7: Frontend Tag API Client (Day 3)

**Goal**: API client functions for tag management

**Deliverables**:
- `frontend/src/api/tags.ts` with typed API functions
- Error handling

**Implementation**:

```typescript
// frontend/src/api/tags.ts

export interface Tag {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagRequest {
  name: string;
  color: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
}

// Get all tags
export async function getTags(): Promise<Tag[]> {
  const response = await fetch('/api/tags', {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  
  if (!response.ok) throw new Error('Failed to fetch tags');
  
  const data = await response.json();
  return data.tags;
}

// Create tag
export async function createTag(input: CreateTagRequest): Promise<Tag> {
  const response = await fetch('/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create tag');
  }
  
  const data = await response.json();
  return data.tag;
}

// Update tag
export async function updateTag(id: string, input: UpdateTagRequest): Promise<Tag> {
  const response = await fetch(`/api/tags/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update tag');
  }
  
  const data = await response.json();
  return data.tag;
}

// Delete tag
export async function deleteTag(id: string): Promise<void> {
  const response = await fetch(`/api/tags/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete tag');
  }
}
```

**Time Estimate**: 1 hour

---

### Phase 8: Settings Tags Tab UI (Day 4)

**Goal**: Tag management UI in Settings panel

**Deliverables**:
- Tags tab in Settings
- Tag list display
- Create/edit tag modal
- Delete confirmation
- Form validation

**Components to Create**:

```typescript
// frontend/src/pages/Settings/TagsTab.tsx
// - Main tags settings tab
// - Tag list table
// - + New Tag button

// frontend/src/components/TagModal.tsx
// - Create/Edit tag modal
// - Name input with validation
// - Color picker
// - Save/Cancel buttons

// frontend/src/components/DeleteTagModal.tsx
// - Confirmation dialog
// - Warning about existing references
// - Confirm/Cancel buttons
```

**UI Features**:
- Tag list shows: name, color preview, actions (edit, delete)
- Create button opens modal
- Edit icon opens modal with prefilled data
- Delete icon opens confirmation
- Form validation: real-time feedback
- Color picker: predefined palette + custom

**Validation**:
- Name required, 1-50 chars
- Name matches `/^[a-zA-Z0-9_-]+$/`
- Name unique (check against existing tags)
- Color required, valid hex

**Time Estimate**: 5 hours

---

### Phase 9: Tag Autocomplete Component (Day 5)

**Goal**: Hashtag autocomplete in text fields

**Deliverables**:
- `frontend/src/components/TagAutocomplete.tsx`
- Trigger on `#` character
- Dropdown with filtered tags
- Keyboard navigation
- Tag insertion

**Implementation Approach**:

```typescript
// frontend/src/components/TagAutocomplete.tsx

interface TagAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  tags: Tag[];
  placeholder?: string;
}

// Features:
// - Detect # character and position
// - Show dropdown below cursor
// - Filter tags by partial match
// - Keyboard: Arrow keys, Enter, Escape
// - Mouse: Click to select
// - Insert tag name at cursor position
```

**Technical Challenges**:
- Cursor position detection in textarea
- Dropdown absolute positioning
- Handling # in middle of text
- Preserving cursor position after insertion

**Libraries to Consider**:
- `@tiptap/react` (rich text editor with mention support)
- OR custom implementation with `textarea` + overlay

**Time Estimate**: 6 hours

---

### Phase 10: Tag Rendering in Markdown (Day 6)

**Goal**: Render `#tagname` as styled, clickable links in markdown

**Deliverables**:
- Custom markdown plugin for tag detection
- Tag link component
- Color application
- Click navigation

**Implementation**:

```typescript
// frontend/src/utils/tagRenderer.tsx

import { Tag } from '../api/tags';

// Convert hashtags to tag links in markdown
export function renderTagsInMarkdown(text: string, tags: Tag[]): string {
  const tagMap = new Map(tags.map(t => [t.name.toLowerCase(), t]));
  
  return text.replace(/\B#([a-zA-Z0-9_-]+)\b/g, (match, tagName) => {
    const tag = tagMap.get(tagName.toLowerCase());
    
    if (tag) {
      // Return markdown link with data attributes for styling
      return `[${match}](${getTagFilterUrl(tagName)}){.tag data-color="${tag.color}"}`;
    }
    
    return match; // Plain text for undefined tags
  });
}

// Or use React component approach
export function TaggedText({ text, tags }: { text: string; tags: Tag[] }) {
  // Parse text and render tags as clickable components
}
```

**Integration**:
```typescript
// Update markdown renderer in WorkstreamDetail, TimelineItem, etc.

import ReactMarkdown from 'react-markdown';
import { renderTagsInMarkdown } from '../utils/tagRenderer';

function WorkstreamDetail({ workstream, tags }) {
  const contextWithTags = renderTagsInMarkdown(workstream.context, tags);
  
  return (
    <ReactMarkdown>{contextWithTags}</ReactMarkdown>
  );
}
```

**Styling**:
```css
/* frontend/src/index.css or component CSS */

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: rgba(var(--tag-color-rgb), 0.2);
  color: rgb(var(--tag-color-rgb-dark));
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9em;
  transition: opacity 0.2s;
}

.tag:hover {
  opacity: 0.8;
}
```

**Time Estimate**: 4 hours

---

### Phase 11: Tag Filtering UI (Day 6)

**Goal**: Filter cockpit and timeline by tags with chip UI

**Deliverables**:
- Filter state management
- Filter chip component
- Apply filters to API calls
- URL query param sync

**Implementation**:

```typescript
// frontend/src/hooks/useTagFilter.ts

export function useTagFilter() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Sync with URL query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tagsParam = params.get('tags');
    if (tagsParam) {
      setSelectedTags(tagsParam.split(','));
    }
  }, [location.search]);
  
  const addTag = (tagName: string) => {
    const newTags = [...selectedTags, tagName];
    updateUrl(newTags);
  };
  
  const removeTag = (tagName: string) => {
    const newTags = selectedTags.filter(t => t !== tagName);
    updateUrl(newTags);
  };
  
  const clearAll = () => {
    updateUrl([]);
  };
  
  const updateUrl = (tags: string[]) => {
    const params = new URLSearchParams(location.search);
    if (tags.length > 0) {
      params.set('tags', tags.join(','));
    } else {
      params.delete('tags');
    }
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };
  
  return { selectedTags, addTag, removeTag, clearAll };
}
```

```typescript
// frontend/src/components/TagFilterChips.tsx

export function TagFilterChips({ selectedTags, onRemove, onClearAll, allTags }) {
  const tagMap = new Map(allTags.map(t => [t.name, t]));
  
  return (
    <div className="flex gap-2 items-center flex-wrap">
      <span className="text-sm text-gray-600">Filters:</span>
      {selectedTags.map(tagName => {
        const tag = tagMap.get(tagName);
        return (
          <div key={tagName} className="tag-chip" style={{ backgroundColor: tag?.color }}>
            #{tagName}
            <button onClick={() => onRemove(tagName)}>×</button>
          </div>
        );
      })}
      {selectedTags.length > 0 && (
        <button onClick={onClearAll} className="text-sm text-blue-600">
          Clear All
        </button>
      )}
    </div>
  );
}
```

**Integration in Cockpit**:
```typescript
// frontend/src/pages/Cockpit.tsx

export function Cockpit() {
  const { selectedTags, addTag, removeTag, clearAll } = useTagFilter();
  const { data: tags } = useQuery('tags', getTags);
  
  // Pass selectedTags to API
  const { data: workstreams } = useQuery(
    ['workstreams', selectedTags],
    () => getWorkstreams({ tags: selectedTags })
  );
  
  return (
    <>
      <TagFilterChips
        selectedTags={selectedTags}
        onRemove={removeTag}
        onClearAll={clearAll}
        allTags={tags || []}
      />
      {/* Workstream list */}
    </>
  );
}
```

**Time Estimate**: 4 hours

---

### Phase 12: Tags on Workstream Chips (Day 7)

**Goal**: Display aggregated tags on workstream chips

**Deliverables**:
- Backend: Include tags in workstream response
- Frontend: Tag display component for chips
- Limit to first 3 tags + "more" indicator

**Backend Enhancement**:

```typescript
// backend/src/services/workstreamService.ts

interface WorkstreamWithTags extends Workstream {
  tags: string[]; // Aggregated tag names
}

export async function getWorkstreams(options: GetWorkstreamsOptions): Promise<WorkstreamWithTags[]> {
  const workstreams = await prisma.workstream.findMany({
    // ... existing query
    include: {
      category: true,
      statusUpdates: true, // Get all updates for tag extraction
    },
  });
  
  // Add tags to each workstream
  return workstreams.map(ws => {
    const texts = [ws.context, ...ws.statusUpdates.map(su => su.note)];
    const tags = extractTagsFromFields(...texts);
    
    return {
      ...ws,
      tags,
    };
  });
}
```

**Frontend Component**:

```typescript
// frontend/src/components/WorkstreamChipTags.tsx

interface WorkstreamChipTagsProps {
  tags: string[];
  allTags: Tag[];
  onTagClick: (tagName: string) => void;
}

export function WorkstreamChipTags({ tags, allTags, onTagClick }: WorkstreamChipTagsProps) {
  const tagMap = new Map(allTags.map(t => [t.name, t]));
  const displayTags = tags.slice(0, 3);
  const hasMore = tags.length > 3;
  
  return (
    <div className="flex gap-1 flex-wrap mt-2">
      {displayTags.map(tagName => {
        const tag = tagMap.get(tagName);
        return (
          <button
            key={tagName}
            onClick={(e) => {
              e.stopPropagation();
              onTagClick(tagName);
            }}
            className="text-xs px-2 py-1 rounded-full"
            style={{
              backgroundColor: tag?.color ? `${tag.color}33` : '#e5e7eb',
              color: tag?.color || '#6b7280',
            }}
          >
            #{tagName}
          </button>
        );
      })}
      {hasMore && (
        <span className="text-xs text-gray-500 px-2 py-1">
          +{tags.length - 3} more
        </span>
      )}
    </div>
  );
}
```

**Integration in WorkstreamChip**:
```typescript
// frontend/src/components/WorkstreamChip.tsx

export function WorkstreamChip({ workstream, allTags, onTagClick }) {
  return (
    <div className="workstream-chip">
      {/* Existing content */}
      <h3>{workstream.name}</h3>
      <div>{workstream.category?.emoji} {workstream.category?.name}</div>
      
      {/* NEW: Tag line */}
      {workstream.tags.length > 0 && (
        <WorkstreamChipTags
          tags={workstream.tags}
          allTags={allTags}
          onTagClick={onTagClick}
        />
      )}
    </div>
  );
}
```

**Time Estimate**: 3 hours

---

### Phase 13: Testing & Polish (Day 8)

**Goal**: Comprehensive testing, bug fixes, and UX polish

**Deliverables**:
- Frontend unit tests for tag utilities
- Manual testing across all flows
- Bug fixes
- Performance optimization
- Documentation

**Testing Checklist**:

**Frontend Unit Tests**:
```typescript
// frontend/src/utils/tagExtractor.test.ts
// - Same tests as backend version

// frontend/src/components/TagModal.test.tsx
// - Form validation
// - Create/edit modes
// - Error handling

// frontend/src/hooks/useTagFilter.test.ts
// - URL sync
// - Add/remove tags
// - Clear all
```

**Manual Testing Flows**:
- [ ] Create tag in Settings
- [ ] Edit tag color
- [ ] Delete tag (with confirmation)
- [ ] Attempt duplicate name (validation error)
- [ ] Type `#` in context field → autocomplete appears
- [ ] Filter autocomplete by typing
- [ ] Select tag from autocomplete → inserts in text
- [ ] Save workstream → tags render as colored links
- [ ] Click tag link → navigates to filtered cockpit
- [ ] Filter shows correct workstreams
- [ ] Remove filter chip → returns to full list
- [ ] Tags appear on workstream chips
- [ ] Click tag on chip → applies filter
- [ ] Mobile: all interactions work with touch

**Performance Testing**:
- [ ] Autocomplete responds in <200ms
- [ ] Filtering responds in <500ms
- [ ] Tag extraction doesn't block UI
- [ ] Works with 50+ tags
- [ ] Works with 100+ workstreams

**Cross-browser Testing**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

**Bug Fixes**:
- Fix any issues found during testing
- Edge case handling
- UI polish

**Documentation**:
- Update README with tag feature
- Add screenshots to docs
- API documentation
- User guide

**Time Estimate**: 6 hours

---

## Technical Architecture

### Data Flow

**Tag Creation Flow**:
```
User (Settings) → TagModal → createTag API → TagService → Database → Response → UI Update
```

**Tag Autocomplete Flow**:
```
User types # → TagAutocomplete detects → Filters tag list → Shows dropdown → User selects → Inserts tag text
```

**Tag Rendering Flow**:
```
Workstream context → Markdown renderer → Tag regex detection → Match against tag list → Render as styled link
```

**Tag Filtering Flow**:
```
User clicks tag → addTag() → URL updated → API called with tags param → Backend filters → Results returned → UI updates
```

### State Management

**Tag List State**:
- Fetched on app load (or Settings open)
- Cached in React Query
- Invalidated on create/update/delete

**Filter State**:
- Managed in URL query params (source of truth)
- Synced to local state via hook
- Persists across navigation

**Autocomplete State**:
- Local component state
- Ephemeral (resets on blur)

### Performance Optimizations

**Tag Extraction Caching**:
```typescript
// Memoize tag extraction per workstream
const extractedTags = useMemo(
  () => extractTags(workstream.context),
  [workstream.context]
);
```

**Autocomplete Debouncing**:
```typescript
const debouncedSearch = useDebounce(searchTerm, 200);
```

**Tag Lookup Map**:
```typescript
const tagMap = useMemo(
  () => new Map(tags.map(t => [t.name, t])),
  [tags]
);
```

---

## Risk Mitigation

### Risk 1: Autocomplete Performance
**Risk**: Slow autocomplete response on large tag lists

**Mitigation**:
- Limit dropdown to 10 items
- Debounce search (200ms)
- Use fuzzy matching library if needed (fuse.js)

---

### Risk 2: Regex Performance
**Risk**: Tag extraction regex blocks UI on large text blocks

**Mitigation**:
- Extract tags in web worker (if needed)
- Limit text length processed
- Cache extraction results
- Consider full-text search in database for future

---

### Risk 3: Tag Rename Challenges
**Risk**: Users expect tag rename to update all references

**Mitigation**:
- Document that tags are text-based (not relational)
- Make rename clearly update settings only
- Consider future enhancement: find-and-replace utility

---

### Risk 4: Mobile Autocomplete UX
**Risk**: Dropdown positioning difficult on mobile keyboards

**Mitigation**:
- Test early on mobile devices
- Consider inline suggestion instead of dropdown
- Fallback to manual typing (always functional)

---

## Migration Strategy

### Database Migration

**Command**:
```bash
cd backend
npx prisma migrate dev --name add_tags_table
npx prisma generate
```

**Rollback**:
```bash
npx prisma migrate resolve --rolled-back <migration-name>
# Manually drop table if needed
```

**Zero Downtime**: New table, no changes to existing data

---

### Feature Rollout

**Phase 1: Backend Only** (Day 1-3)
- Deploy backend with tag API
- No user-facing changes yet
- Test API in isolation

**Phase 2: Settings UI** (Day 4)
- Deploy tag management UI
- Users can create tags
- No autocomplete/rendering yet
- Early adopters can prepare tags

**Phase 3: Full Feature** (Day 5-7)
- Deploy autocomplete, rendering, filtering
- Announce feature to users
- Monitor usage and feedback

**Phase 4: Iteration** (Day 8+)
- Bug fixes based on feedback
- UX improvements
- Performance tuning

---

## Success Criteria

### Functional Success
- [ ] Users can create, edit, delete tags in Settings
- [ ] Autocomplete works in context and note fields
- [ ] Tags render as colored, clickable links
- [ ] Filtering works in cockpit and timeline
- [ ] Tags appear on workstream chips

### Quality Success
- [ ] 100% backend integration test coverage
- [ ] All frontend utilities have unit tests
- [ ] No critical bugs in production
- [ ] Performance targets met (<200ms autocomplete, <500ms filtering)

### Adoption Success
- [ ] 50% of active users create at least one tag (Week 1)
- [ ] 25% of workstreams have tag references (Week 2)
- [ ] Tag filtering used in 10% of sessions (Week 4)

---

## Dependencies

**Required Before Start**:
- ✅ Settings panel with tab navigation (from spec 004)
- ✅ Markdown rendering infrastructure (from spec 004)
- ✅ Project context available in API requests

**Blocks**:
- None (fully independent feature)

**Blocked By**:
- None

---

## Resources

**Team**:
- 1 Full-stack developer (8 days)

**Tools & Libraries**:
- Prisma (database migrations)
- React Query (state management)
- React Markdown (markdown rendering)
- TailwindCSS (styling)

**External Resources**:
- Regex101.com (regex testing)
- Color contrast checker (accessibility)

---

## Timeline

| Day | Phase | Deliverable |
|-----|-------|-------------|
| 1 | DB + Backend Service | Schema, migrations, tag CRUD service |
| 2 | Backend API + Tests | REST routes, integration tests, tag extraction |
| 3 | Backend Filtering + API Client | Workstream/timeline filtering, frontend API |
| 4 | Settings UI | Tag management UI in Settings panel |
| 5 | Autocomplete | Hashtag autocomplete component |
| 6 | Rendering + Filtering UI | Tag links in markdown, filter chips |
| 7 | Chip Tags | Tags on workstream chips |
| 8 | Testing + Polish | Full testing, bug fixes, documentation |

**Total**: 8 days

---

## Future Enhancements

**Post-MVP Features** (not in scope):

1. **Tag Analytics**: Dashboard showing most-used tags, tag trends
2. **Tag Suggestions**: Auto-suggest tags based on text analysis
3. **Tag Hierarchies**: Parent-child tag relationships
4. **Tag Templates**: Predefined tag sets for common use cases
5. **Tag Permissions**: Admin-managed tags vs user tags
6. **Bulk Tag Operations**: Apply tags to multiple workstreams at once
7. **Tag Import/Export**: Share tag configurations

---

## Appendix

### A. API Examples

**Create Tag**:
```bash
curl -X POST http://localhost:3001/api/tags \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{"name": "backend", "color": "#1DA1F2"}'
```

**Get Tags**:
```bash
curl http://localhost:3001/api/tags \
  -H "Cookie: connect.sid=..."
```

**Filter Workstreams by Tags**:
```bash
curl "http://localhost:3001/api/workstreams?tags=backend,frontend" \
  -H "Cookie: connect.sid=..."
```

---

### B. Tag Name Validation Regex

**Pattern**: `/^[a-zA-Z0-9_-]+$/`

**Valid**:
- `backend`
- `Backend123`
- `api_v2`
- `team-alpha`

**Invalid**:
- `my tag` (space)
- `api@v2` (special char)
- `tag!` (special char)
- `` (empty)

---

### C. Color Palette

**Predefined Colors** (for UI color picker):
```typescript
const PRESET_COLORS = [
  '#1DA1F2', // Twitter blue (default)
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#F97316', // Orange
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#6B7280', // Gray
  '#EC4899', // Pink
];
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-06 | System | Initial implementation plan |

---

## Sign-off

- [ ] Specification reviewed and approved
- [ ] Architecture reviewed and approved
- [ ] Timeline and resources approved
- [ ] Ready to begin implementation

**Status**: Ready for Tasks Breakdown
