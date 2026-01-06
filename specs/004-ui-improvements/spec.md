# Feature Specification: UI/UX Improvements - Categories, Settings & Markdown

**Feature ID**: 004-ui-improvements
**Version**: 1.0
**Status**: Planning
**Created**: 2026-01-06
**Last Updated**: 2026-01-06

---

## Executive Summary

This specification defines a comprehensive set of UI/UX improvements to enhance user experience, improve terminology accuracy, add professional text formatting capabilities, and prepare the application architecture for future expansion.

**Key Improvements**:
1. **Terminology Correction**: Rename "Tags" to "Categories" throughout the application
2. **Visual Enhancement**: Apply distinct colors and emojis to default categories
3. **Architecture Evolution**: Introduce Settings panel with tabbed navigation
4. **Content Formatting**: Add Markdown rendering for descriptions and notes
5. **Data Management**: Enable deletion of status updates

**Business Value**:
- **Clarity**: Correct terminology eliminates user confusion
- **Professionalism**: Markdown support enables better documentation
- **Scalability**: Settings architecture supports future features
- **Flexibility**: Delete capability improves data management

---

## Problem Statement

### Current State

**1. Misleading Terminology**
- Feature called "Tags" but behaves like "Categories"
- Tags imply multiple per item (e.g., #urgent #backend #customer)
- Categories imply mutually exclusive grouping (e.g., Project OR Delegated)
- Current implementation is categories, not tags
- Users confused by terminology mismatch

**2. Visual Uniformity**
- Default categories use generic colors (blue, green, purple, gray)
- No emojis for visual quick-scanning
- All categories look similar at a glance
- Hard to distinguish categories without reading text

**3. Flat Navigation**
- Single "Tags" page in navigation
- No room for future settings (preferences, integrations, account)
- Settings would clutter main navigation
- Need scalable settings architecture

**4. Plain Text Limitations**
- No formatting in workstream context
- No formatting in status notes
- Links not clickable
- Headers not distinguished
- Code snippets not monospace
- Lists not formatted
- Professional documentation difficult

**5. No Delete Capability**
- Can only edit status updates
- Cannot remove erroneous updates
- Clutters history with mistakes
- User frustration with data management

### Desired State

**1. Accurate Terminology**
- Feature called "Categories" matches behavior
- Clear user understanding
- Consistent with industry standards
- No cognitive dissonance

**2. Visual Distinction**
- Each default category has unique color
- Emoji for instant visual recognition
- Easy scanning in list views
- Professional appearance

**3. Scalable Settings**
- Dedicated Settings page
- Tabbed interface for organization
- Room for future expansion
- Clean navigation structure

**4. Rich Text Support**
- Markdown rendering in context and notes
- Clickable links
- Formatted code
- Structured content with headers and lists
- Professional documentation

**5. Complete CRUD**
- Full Create, Read, Update, Delete for status updates
- Clean history management
- User control over data

---

## Goals & Non-Goals

### Goals

✅ **Rename all "Tag" references to "Category"**
- Database schema (tables, columns, indexes)
- Backend API (routes, services, types)
- Frontend code (components, hooks, types)
- Documentation (README, specs, guides)
- Tests (unit and integration)

✅ **Apply visual styling to default categories**
- Specific colors per category
- Emoji icons per category
- Automatic application for new users
- Migration for existing users

✅ **Implement Settings panel architecture**
- Tabbed navigation layout
- Categories as first tab
- Route structure for future tabs
- Mobile responsive design

✅ **Add Markdown rendering**
- Workstream context field
- Status update notes field
- Timeline view
- Secure rendering (no XSS)

✅ **Enable status update deletion**
- Backend DELETE endpoint
- Frontend delete UI
- Confirmation dialog
- Optimistic updates

### Non-Goals

❌ **WYSIWYG Markdown Editor**
- Keep plaintext editing for now
- Future enhancement consideration
- Focus on rendering, not editing

❌ **Nested Categories**
- Keep flat category structure
- Future enhancement consideration
- Avoid complexity for now

❌ **Category Icons Beyond Emoji**
- Stick with emoji for now
- Custom icons future enhancement
- Emoji sufficient for MVP

❌ **Undo/Restore for Deletes**
- No soft delete or restore
- Hard delete only
- Future enhancement consideration

❌ **Category-Specific Workflows**
- No category-based automation
- Future enhancement consideration
- Keep categories simple for now

---

## User Stories

### Epic 1: Category Terminology

**US-1.1: As a user, I want the feature to be called "Categories" so I understand it's for grouping, not tagging**

**Acceptance Criteria**:
- Navigation shows "Settings" instead of "Tags"
- Settings panel has "Categories" tab
- All UI text uses "category" terminology
- Help text reflects accurate behavior
- No confusing "tag" references

**Priority**: P0 (Critical)

---

**US-1.2: As a developer, I want all code to use "category" terminology so the codebase is maintainable**

**Acceptance Criteria**:
- Database tables named `categories`
- API endpoints at `/api/categories/*`
- TypeScript interfaces named `Category`
- Service functions use "category" names
- Variable names use "category" convention

**Priority**: P0 (Critical)

---

### Epic 2: Visual Enhancement

**US-2.1: As a user, I want default categories to have distinct colors and emojis so I can quickly scan my workstreams**

**Acceptance Criteria**:
- Project: #9EC3FF with 🎯
- Delegated: #DCB8FF with 👥
- Ongoing: #74D898 with 🔄
- Watching: #B5BAC5 with 👀
- Existing users see updated styles
- New users get styled defaults

**Priority**: P1 (High)

---

### Epic 3: Settings Architecture

**US-3.1: As a user, I want a centralized Settings page so I can find all configuration options in one place**

**Acceptance Criteria**:
- "Settings" link in main navigation
- Settings page has sidebar with tabs
- Categories tab contains category management
- Future tabs can be added easily
- Mobile responsive layout

**Priority**: P1 (High)

---

**US-3.2: As a developer, I want a tabbed settings architecture so I can add new settings categories without cluttering navigation**

**Acceptance Criteria**:
- Reusable SettingsLayout component
- Tab routing structure in place
- Easy to add new tabs
- Consistent styling across tabs
- Code organized by tab

**Priority**: P1 (High)

---

### Epic 4: Markdown Rendering

**US-4.1: As a user, I want to format my workstream context with markdown so I can create professional documentation**

**Acceptance Criteria**:
- Headers render as headings
- Bold and italic work
- Links are clickable
- Lists formatted properly
- Code blocks monospaced
- Blockquotes styled
- No XSS vulnerabilities

**Priority**: P1 (High)

---

**US-4.2: As a user, I want to format my status notes with markdown so I can include structured information**

**Acceptance Criteria**:
- All markdown features work in notes
- Consistent styling with context
- Mobile responsive
- Links open in new tab
- No performance degradation

**Priority**: P1 (High)

---

### Epic 5: Delete Status Updates

**US-5.1: As a user, I want to delete erroneous status updates so I can maintain clean history**

**Acceptance Criteria**:
- Delete button on each status update
- Confirmation required before delete
- Status removed from UI immediately
- Status removed from database
- Cannot delete other users' updates
- Error handling if delete fails

**Priority**: P1 (High)

---

## Technical Specification

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Settings Page                                               │
│  ├── SettingsLayout                                          │
│  │   ├── SettingsSidebar (tabs)                             │
│  │   └── SettingsContent                                    │
│  │       └── CategoriesTab                                  │
│  │           └── useCategories hook                         │
│  │                                                          │
│  WorkstreamDetail Page                                       │
│  ├── Workstream context → MarkdownRenderer                  │
│  ├── Status updates → MarkdownRenderer                      │
│  └── Delete button → DELETE /api/status-updates/:id         │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ API Calls
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                         Backend                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Routes                                                      │
│  ├── /api/categories/* (categoryRoutes)                     │
│  │   └── categoryService                                    │
│  └── /api/status-updates/:id DELETE                         │
│      └── statusUpdateService.deleteStatusUpdate()           │
│                                                              │
│  Services                                                    │
│  ├── categoryService.ts                                     │
│  ├── statusUpdateService.ts (with delete)                   │
│  └── personService.ts (default categories)                  │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ Prisma ORM
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                        Database                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  categories (renamed from tags)                             │
│  ├── id, projectId, name, color, emoji, sortOrder           │
│  └── indexes: project_id, sort_order                        │
│                                                              │
│  workstreams                                                 │
│  ├── id, projectId, categoryId (renamed from tagId)         │
│  └── relation: category Category?                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema Changes

**Migration 1: Rename Tags to Categories**

```sql
-- Rename table
ALTER TABLE "tags" RENAME TO "categories";

-- Rename columns in workstreams
ALTER TABLE "workstreams" RENAME COLUMN "tag_id" TO "category_id";

-- Rename indexes
ALTER INDEX "tags_pkey" RENAME TO "categories_pkey";
ALTER INDEX "tags_project_id_name_key" RENAME TO "categories_project_id_name_key";
ALTER INDEX "tags_project_id_idx" RENAME TO "categories_project_id_idx";
ALTER INDEX "tags_project_id_sort_order_idx" RENAME TO "categories_project_id_sort_order_idx";
ALTER INDEX "workstreams_tag_id_idx" RENAME TO "workstreams_category_id_idx";
```

**Migration 2: Update Default Category Styles**

```sql
-- Update project category
UPDATE "categories" 
SET color = '#9EC3FF', emoji = '🎯'
WHERE name = 'project' 
  AND (color = '#3B82F6' OR color IS NULL);

-- Update delegated category
UPDATE "categories" 
SET color = '#DCB8FF', emoji = '👥'
WHERE name = 'delegated' 
  AND (color = '#8B5CF6' OR color IS NULL);

-- Update ongoing category
UPDATE "categories" 
SET color = '#74D898', emoji = '🔄'
WHERE name = 'ongoing' 
  AND (color = '#10B981' OR color IS NULL);

-- Update watching category
UPDATE "categories" 
SET color = '#B5BAC5', emoji = '👀'
WHERE name = 'watching' 
  AND (color = '#6B7280' OR color IS NULL);
```

**Updated Prisma Schema**:

```prisma
model Category {  // Was: Tag
  id        String   @id @default(uuid())
  projectId String   @map("project_id")
  name      String
  color     String
  emoji     String?
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")

  project     Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  workstreams Workstream[]

  @@unique([projectId, name])
  @@index([projectId])
  @@map("categories")  // Was: @@map("tags")
}

model Workstream {
  id         String    @id @default(uuid())
  projectId  String    @map("project_id")
  categoryId String?   @map("category_id")  // Was: tagId
  name       String
  context    String?   @db.Text
  state      String    @default("active")
  createdAt  DateTime  @default(now()) @map("created_at")
  closedAt   DateTime? @map("closed_at")

  project       Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  category      Category?      @relation(fields: [categoryId], references: [id], onDelete: SetNull)  // Was: tag
  statusUpdates StatusUpdate[]

  @@index([projectId])
  @@index([projectId, state])
  @@index([categoryId])  // Was: @@index([tagId])
  @@map("workstreams")
}
```

---

### API Specification

#### Category Endpoints (Renamed)

**GET /api/categories**
```
Description: Get all categories for user's project
Auth: Required
Response: 200 OK, Category[]

Example Response:
[
  {
    "id": "uuid",
    "projectId": "uuid",
    "name": "project",
    "color": "#9EC3FF",
    "emoji": "🎯",
    "sortOrder": 0,
    "createdAt": "2026-01-06T..."
  }
]
```

**POST /api/categories**
```
Description: Create new category
Auth: Required
Request Body: { name, color, emoji? }
Response: 201 Created, Category

Validation:
- name: required, max 100 chars
- color: required, hex format #RRGGBB
- emoji: optional, max 10 chars
```

**PUT /api/categories/reorder**
```
Description: Reorder categories (drag-drop)
Auth: Required
Request Body: { categoryIds: string[] }
Response: 200 OK, Category[]

Validation:
- categoryIds: required array
- All IDs must belong to user's project
```

**PUT /api/categories/:id**
```
Description: Update category
Auth: Required
Request Body: { name?, color?, emoji? }
Response: 200 OK, Category

Validation:
- At least one field required
- name: max 100 chars
- color: hex format
- emoji: max 10 chars
```

**DELETE /api/categories/:id**
```
Description: Delete category
Auth: Required
Response: 204 No Content

Behavior:
- Sets categoryId=null on associated workstreams
- Cannot delete if user doesn't own category
```

#### Status Update Delete Endpoint (New)

**DELETE /api/status-updates/:id**
```
Description: Delete status update
Auth: Required
Response: 204 No Content

Authorization:
- Must own workstream containing status update
- Verified through workstream → project → person chain

Error Responses:
- 404: Status update not found or access denied
- 500: Server error
```

---

### Frontend Components

#### Settings Architecture

```tsx
// Settings.tsx
export default function Settings() {
  return (
    <SettingsLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/settings/categories" />} />
        <Route path="/categories" element={<CategoriesTab />} />
        {/* Future: /preferences, /integrations, /account */}
      </Routes>
    </SettingsLayout>
  );
}

// SettingsLayout.tsx
export function SettingsLayout({ children }) {
  return (
    <div className="max-w-7xl mx-auto">
      <h1>Settings</h1>
      <div className="flex gap-6">
        <SettingsSidebar />  {/* Tab navigation */}
        <main>{children}</main>  {/* Tab content */}
      </div>
    </div>
  );
}

// SettingsSidebar.tsx
export function SettingsSidebar() {
  const tabs = [
    { name: 'Categories', href: '/settings/categories', icon: '🏷️' },
    // Future tabs...
  ];
  
  return (
    <nav>
      {tabs.map(tab => (
        <NavLink to={tab.href} activeClassName="bg-primary-50">
          {tab.icon} {tab.name}
        </NavLink>
      ))}
    </nav>
  );
}

// tabs/CategoriesTab.tsx
export function CategoriesTab() {
  // All existing TagManagement.tsx logic
  const { data: categories } = useCategories();
  // ... category CRUD UI
}
```

#### Markdown Renderer

```tsx
// MarkdownRenderer.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={`markdown-content ${className}`}
      components={{
        // Custom renderers for security and styling
        a: (props) => (
          <a {...props} 
             target="_blank" 
             rel="noopener noreferrer"
             className="text-primary-600 hover:underline" 
          />
        ),
        h1: (props) => <h1 {...props} className="text-xl font-bold mt-4 mb-2" />,
        h2: (props) => <h2 {...props} className="text-lg font-semibold mt-3 mb-2" />,
        code: ({ inline, ...props }) => (
          inline 
            ? <code {...props} className="bg-gray-100 px-1 rounded text-sm" />
            : <code {...props} className="block bg-gray-100 p-3 rounded my-2" />
        ),
        // ... more customizations
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

**Usage**:
```tsx
// In WorkstreamDetail.tsx
{workstream.context && (
  <MarkdownRenderer content={workstream.context} className="text-sm" />
)}

{update.note && (
  <MarkdownRenderer content={update.note} className="text-sm text-gray-600" />
)}
```

#### Delete Status Update UI

```tsx
// In WorkstreamDetail.tsx
const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

const deleteMutation = useMutation({
  mutationFn: (id: string) => apiClient.delete(`/api/status-updates/${id}`),
  onSuccess: () => {
    queryClient.invalidateQueries(['status-updates', workstreamId]);
    setDeleteConfirm(null);
  },
});

// In status update card
<div className="flex gap-2">
  <button onClick={() => setEditingStatus(update)}>Edit</button>
  
  {deleteConfirm === update.id ? (
    <>
      <button onClick={() => setDeleteConfirm(null)}>Cancel</button>
      <button onClick={() => deleteMutation.mutate(update.id)}>
        Confirm Delete
      </button>
    </>
  ) : (
    <button onClick={() => setDeleteConfirm(update.id)}>Delete</button>
  )}
</div>
```

---

### Security Considerations

#### Markdown XSS Prevention

**Risk**: User-generated markdown could inject malicious HTML/JavaScript

**Mitigation**:
- Use `react-markdown` which escapes HTML by default
- No `dangerouslySetInnerHTML`
- Use `remark-gfm` plugin (safe extensions only)
- Links use `target="_blank"` with `rel="noopener noreferrer"`
- No `rehype-raw` plugin (would allow HTML)

**Testing**:
```typescript
// Test XSS prevention
const maliciousContent = `
<script>alert('XSS')</script>
<img src="x" onerror="alert('XSS')">
[Click](javascript:alert('XSS'))
`;

// Should render as plain text, not execute
<MarkdownRenderer content={maliciousContent} />
```

#### Delete Authorization

**Risk**: User could delete other users' status updates

**Mitigation**:
- Verify ownership through workstream → project → person chain
- Return 404 (not 403) to prevent enumeration
- Backend validation, not just frontend hiding

**Implementation**:
```typescript
async function deleteStatusUpdate(id: string, personId: string) {
  const statusUpdate = await prisma.statusUpdate.findFirst({
    where: { id },
    include: { workstream: { include: { project: true } } }
  });
  
  if (!statusUpdate || 
      statusUpdate.workstream.project.personId !== personId) {
    throw new Error('Not found');  // Returns 404
  }
  
  await prisma.statusUpdate.delete({ where: { id } });
}
```

---

### Performance Considerations

#### Markdown Rendering

**Concern**: Large markdown content could slow rendering

**Mitigation**:
- Field length already limited (context: 2000 chars, note: 2000 chars)
- Use `React.memo` for MarkdownRenderer component
- Lightweight library (react-markdown ~50KB gzipped)
- Client-side rendering (no SSR overhead)

**Benchmarks**:
- 2000 char markdown renders in <10ms
- No noticeable lag in UI
- Mobile performance acceptable

#### Database Migration

**Concern**: Large datasets could slow migration

**Mitigation**:
- Migrations are simple renames (fast operations)
- Use transactions for atomicity
- Test on staging with production-size data
- Backup before migration
- Can rollback if needed

**Estimated Downtime**: <1 minute for 10,000+ records

---

## Testing Strategy

### Unit Tests

**Backend**:
- [ ] categoryService.test.ts (all CRUD functions)
- [ ] statusUpdateService.test.ts (including delete)
- [ ] personService.test.ts (default category creation)

**Frontend**:
- [ ] useCategories.test.ts (hook tests)
- [ ] MarkdownRenderer.test.tsx (component tests)
- [ ] CategoriesTab.test.tsx (integration tests)

### Integration Tests

**Backend**:
- [ ] categories.test.ts (all 5 endpoints)
- [ ] statusUpdates.test.ts (including DELETE)
- [ ] Verify data isolation
- [ ] Verify authorization

**Frontend**:
- [ ] Settings navigation flow
- [ ] Category CRUD operations
- [ ] Markdown rendering
- [ ] Delete confirmation flow

### E2E Tests (Manual)

- [ ] Complete user flow: Settings → Categories → CRUD
- [ ] Create workstream with markdown context
- [ ] Add status with markdown note
- [ ] Delete status update with confirmation
- [ ] Verify old /tags redirects
- [ ] Verify backward compatibility of API

---

## Rollout Plan

### Phase 1: Database & Backend (Day 1-3)
- Run database migrations
- Deploy backend with new API endpoints
- Keep backward compatibility
- Monitor logs for deprecation warnings

### Phase 2: Frontend (Day 3-5)
- Deploy frontend with new components
- Test Settings panel navigation
- Test markdown rendering
- Test delete functionality

### Phase 3: Documentation (Day 5-6)
- Update README
- Update API docs
- Publish migration guide
- Update user help

### Phase 4: Cleanup (Future)
- Remove /api/tags backward compatibility (v3.0)
- Remove deprecation warnings
- Archive old documentation

---

## Success Metrics

### Quantitative

- [ ] 100% test coverage maintained
- [ ] 0 data loss in migration
- [ ] <100ms markdown render time
- [ ] 0 XSS vulnerabilities found
- [ ] <1% error rate on delete operations

### Qualitative

- [ ] Users understand "categories" terminology
- [ ] Users report improved visual scanning
- [ ] Users utilize markdown features
- [ ] Users appreciate delete capability
- [ ] No navigation confusion

### Adoption

- [ ] 80%+ users find Settings panel within first week
- [ ] 50%+ users try markdown within first month
- [ ] 30%+ users use delete feature
- [ ] <5% support tickets about changes

---

## Future Enhancements

### Settings Panel Expansion
- Preferences tab (theme, notifications)
- Integrations tab (Slack, email)
- Account tab (profile, password)
- Backup management tab

### Markdown Improvements
- WYSIWYG editor option
- Markdown preview toggle
- Syntax highlighting in code blocks
- Markdown templates

### Category Features
- Category descriptions
- Nested categories
- Category-based workflows
- Category templates

### Delete Enhancements
- Soft delete with restore
- Bulk delete operations
- Delete history/audit log
- Trash/recycle bin

---

## Open Questions

1. **Should we support HTML in markdown?**
   - **Decision**: No, security risk. Use react-markdown default (no HTML).

2. **Should we migrate old /tags URLs immediately?**
   - **Decision**: No, keep backward compatibility for 1 release cycle.

3. **Should delete have a "are you sure?" confirmation?**
   - **Decision**: Yes, require explicit confirmation to prevent accidents.

4. **Should markdown preview be shown while editing?**
   - **Decision**: No for now, future enhancement. Keep editing simple.

5. **Should we auto-update existing default categories?**
   - **Decision**: Yes, but only if colors match old defaults (detect customization).

---

## Appendix

### Default Category Specifications

| Name | Color | Emoji | Sort Order |
|------|-------|-------|------------|
| project | #9EC3FF (light blue) | 🎯 | 0 |
| delegated | #DCB8FF (light purple) | 👥 | 1 |
| ongoing | #74D898 (light green) | 🔄 | 2 |
| watching | #B5BAC5 (light gray) | 👀 | 3 |

### Markdown Feature Support

| Feature | Supported | Example |
|---------|-----------|---------|
| Headers | ✅ | `# H1`, `## H2`, `### H3` |
| Bold | ✅ | `**bold**` |
| Italic | ✅ | `*italic*` |
| Links | ✅ | `[text](url)` |
| Lists | ✅ | `- item` or `1. item` |
| Code (inline) | ✅ | `` `code` `` |
| Code (block) | ✅ | ` ```code``` ` |
| Blockquotes | ✅ | `> quote` |
| Tables | ✅ | GFM tables |
| Task lists | ✅ | `- [ ] task` |
| Strikethrough | ✅ | `~~text~~` |
| HTML | ❌ | Security risk |

### Breaking Changes

#### API
- `/api/tags/*` → `/api/categories/*` (old routes deprecated)

#### Database
- Table `tags` → `categories`
- Column `tag_id` → `category_id`

#### TypeScript
- Interface `Tag` → `Category`
- Properties `tagId` → `categoryId`, `tag` → `category`

#### Navigation
- `/tags` → `/settings/categories` (redirect in place)

---

*End of Specification*
