# Implementation Plan: UI/UX Improvements - Categories, Settings & Markdown

**Feature**: 004-ui-improvements
**Created**: 2026-01-06
**Estimated Duration**: 6-8 days

---

## Overview

This implementation plan addresses five major UI/UX improvements to enhance the user experience and prepare for future expansion:

1. **Tag → Category Renaming**: Comprehensive rename across entire codebase (backend, frontend, database, docs)
2. **Default Category Styling**: Apply specific emojis and colors to default categories
3. **Settings Panel Architecture**: Replace Tags page with Settings panel featuring tabbed navigation
4. **Markdown Rendering**: Add markdown support for descriptions and notes throughout the app
5. **Delete Updates Feature**: Add ability to delete status updates from workstream detail view

The plan is structured to deliver value incrementally, starting with database migrations and backend changes, followed by frontend updates that users will interact with.

---

## Constitution Check

*GATE: Must pass before implementation*

✅ **TDD Mandatory**: Tests will be updated first to reflect new naming, verified to fail, then code updated
✅ **100% Test Coverage**: All existing tests will be updated to maintain coverage
✅ **Simplicity First**: Using existing patterns and proven libraries (react-markdown)
✅ **Data Integrity**: Database migration ensures no data loss during rename
✅ **Backward Compatibility**: Migration preserves all existing data and relationships

**Performance Gates**: Markdown rendering uses optimized react-markdown (lightweight)
**Security Gates**: Markdown rendering uses safe defaults (no HTML injection)

---

## Problem Statement

### Current Pain Points

1. **Misleading Terminology**: "Tags" are actually used as categories (mutually exclusive, hierarchical), not tags (multiple per item)
2. **Limited Customization**: Default categories lack visual distinction with uniform styling
3. **Navigation Scalability**: Current flat navigation doesn't support future settings expansion (preferences, integrations, etc.)
4. **Text Formatting**: Users cannot format context/notes with markdown (links, headers, lists break readability)
5. **Update Management**: No way to delete erroneous status updates, only edit them

### Why Now

- Users are actively confused by "tags" terminology when they work like categories
- Markdown support is needed for professional documentation in workstream contexts
- Settings panel architecture is required before adding planned features (user preferences, backup management)
- Delete functionality is frequently requested for managing status history

---

## Implementation Phases

### Phase 1: Database Migration - Tag → Category Rename (Day 1)
**Goal**: Rename all database tables, columns, and indexes from "tag" to "category"

**Deliverables**:
- Prisma schema update (Tag → Category model)
- Migration script for safe data transition
- Updated database indexes
- Zero data loss, zero downtime

**Migration Strategy**:
```sql
-- Rename table
ALTER TABLE "tags" RENAME TO "categories";

-- Rename columns in workstreams table
ALTER TABLE "workstreams" RENAME COLUMN "tag_id" TO "category_id";

-- Rename indexes
ALTER INDEX "tags_pkey" RENAME TO "categories_pkey";
ALTER INDEX "tags_project_id_name_key" RENAME TO "categories_project_id_name_key";
ALTER INDEX "tags_project_id_idx" RENAME TO "categories_project_id_idx";
ALTER INDEX "tags_project_id_sort_order_idx" RENAME TO "categories_project_id_sort_order_idx";
ALTER INDEX "workstreams_tag_id_idx" RENAME TO "workstreams_category_id_idx";
```

**Risk**: Database migration complexity
**Mitigation**: Test migration on local copy first, backup before production deployment

---

### Phase 2: Backend API Renaming (Days 2-3)
**Goal**: Update all backend code to use "category" terminology

**Deliverables**:
- Rename `tagService.ts` → `categoryService.ts`
- Rename `/api/tags` routes → `/api/categories`
- Update all service function names
- Update test files to use new naming
- Maintain backward compatibility with old route (deprecated)

**Files to Update**:
- `backend/src/services/tagService.ts` → `categoryService.ts`
- `backend/src/routes/tags.ts` → `categories.ts`
- `backend/tests/unit/tagService.test.ts` → `categoryService.test.ts`
- `backend/tests/integration/tags.test.ts` → `categories.test.ts`
- `backend/src/server.ts` (route registration)

**API Changes**:
```
OLD                          NEW
GET    /api/tags            GET    /api/categories
POST   /api/tags            POST   /api/categories
PUT    /api/tags/reorder    PUT    /api/categories/reorder
PUT    /api/tags/:id        PUT    /api/categories/:id
DELETE /api/tags/:id        DELETE /api/categories/:id
```

**Backward Compatibility** (temporary, 1 release):
- Keep `/api/tags` as alias to `/api/categories`
- Add deprecation warning in logs
- Remove in next major version

**Risk**: Breaking existing API clients
**Mitigation**: Maintain both routes temporarily, add console warnings

---

### Phase 3: Frontend Renaming & Type Updates (Day 3)
**Goal**: Update all frontend code to use "category" terminology

**Deliverables**:
- Update TypeScript interfaces (Tag → Category)
- Rename hooks (`useTags` → `useCategories`)
- Update all API client calls
- Update component props and state variables

**Files to Update**:
- `frontend/src/types/workstream.ts` (Tag interface → Category)
- `frontend/src/hooks/useTags.ts` → `useCategories.ts`
- `frontend/src/api/client.ts` (update endpoints)
- All component files referencing tags
- All page files referencing tags

**Variable Renaming Pattern**:
```typescript
// Before
tag: Tag
tagId: string
tags: Tag[]
useTags()

// After
category: Category
categoryId: string
categories: Category[]
useCategories()
```

**Risk**: Missing variable references
**Mitigation**: Use IDE refactoring tools, grep search for remaining "tag" references

---

### Phase 4: Default Category Styling (Day 4)
**Goal**: Apply specific colors and emojis to default categories

**Deliverables**:
- Update category creation in `personService.ts`
- Data migration for existing default categories
- Visual consistency across UI

**Default Category Styles**:
```typescript
{
  { name: 'project',   color: '#9EC3FF', emoji: '🎯' },
  { name: 'delegated', color: '#DCB8FF', emoji: '👥' },
  { name: 'ongoing',   color: '#74D898', emoji: '🔄' },
  { name: 'watching',  color: '#B5BAC5', emoji: '👀' }
}
```

**Migration Script**:
```typescript
// Update existing default categories
await prisma.category.updateMany({
  where: { name: 'project' },
  data: { color: '#9EC3FF', emoji: '🎯' }
});
// ... repeat for other defaults
```

**Files to Update**:
- `backend/src/services/personService.ts` (createPerson function)
- `backend/prisma/migrations/YYYYMMDD_update_default_category_styles.sql`

**Risk**: Existing users have different colors
**Mitigation**: Only update if color matches old default (blue, green, purple, gray)

---

### Phase 5: Settings Panel Architecture (Day 5)
**Goal**: Replace Tags navigation item with Settings panel featuring tabbed layout

**Deliverables**:
- New Settings page with tab navigation
- Categories tab (replaces old Tags page)
- Reusable tab component for future expansion
- Updated navigation

**Page Structure**:
```
/settings
├── /settings/categories (default)
└── (future tabs: /settings/preferences, /settings/integrations, etc.)
```

**Component Architecture**:
```
Settings.tsx
├── SettingsLayout.tsx
│   ├── SettingsSidebar.tsx (tab list)
│   └── SettingsContent.tsx (tab content area)
└── tabs/
    ├── CategoriesTab.tsx (current TagManagement.tsx content)
    └── (future: PreferencesTab.tsx, IntegrationsTab.tsx, etc.)
```

**Files to Create**:
- `frontend/src/pages/Settings.tsx`
- `frontend/src/components/Settings/SettingsLayout.tsx`
- `frontend/src/components/Settings/SettingsSidebar.tsx`
- `frontend/src/components/Settings/tabs/CategoriesTab.tsx`

**Files to Update**:
- `frontend/src/App.tsx` (route: `/tags` → `/settings`)
- `frontend/src/components/Layout/Navigation.tsx`
- Move `TagManagement.tsx` content to `CategoriesTab.tsx`

**Navigation Update**:
```tsx
// Before
<Link to="/tags">Tags</Link>

// After
<Link to="/settings">Settings</Link>
```

**Risk**: Users expect Tags in old location
**Mitigation**: Add redirect from `/tags` → `/settings/categories`

---

### Phase 6: Markdown Rendering Support (Days 6-7)
**Goal**: Add markdown rendering for all text fields (context, notes, descriptions)

**Deliverables**:
- Markdown rendering components
- Apply to workstream context
- Apply to status update notes
- Preserve plaintext editing (no WYSIWYG)

**Library**: `react-markdown` (lightweight, secure, widely used)

**Dependencies**:
```json
{
  "react-markdown": "^9.0.1",
  "remark-gfm": "^4.0.0"
}
```

**Markdown Features Supported**:
- Headers (# ## ###)
- Bold (**text**) and italic (*text*)
- Links ([text](url))
- Lists (ordered and unordered)
- Code blocks (```code```)
- Blockquotes (> quote)
- Line breaks (double space or \n)

**Component Implementation**:
```tsx
// frontend/src/components/Markdown/MarkdownRenderer.tsx
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
      className={className}
      components={{
        // Custom styling for markdown elements
        a: ({node, ...props}) => (
          <a {...props} className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer" />
        ),
        // ... other component overrides
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

**Files to Create**:
- `frontend/src/components/Markdown/MarkdownRenderer.tsx`
- `frontend/src/components/Markdown/markdown.css` (styling)

**Files to Update** (replace plain text with MarkdownRenderer):
- `frontend/src/pages/WorkstreamDetail.tsx`
  - Workstream context (line ~189)
  - Status update notes (line ~237)
- `frontend/src/components/Workstream/WorkstreamCard.tsx`
  - Potentially add truncated markdown preview
- Timeline view for status notes

**Styling Strategy**:
```css
/* Markdown-specific styles */
.markdown-content {
  /* Headers */
  & h1 { @apply text-xl font-bold mt-4 mb-2; }
  & h2 { @apply text-lg font-semibold mt-3 mb-2; }
  & h3 { @apply text-base font-semibold mt-2 mb-1; }
  
  /* Lists */
  & ul { @apply list-disc ml-4 my-2; }
  & ol { @apply list-decimal ml-4 my-2; }
  
  /* Code */
  & code { @apply bg-gray-100 px-1 py-0.5 rounded text-sm; }
  & pre { @apply bg-gray-100 p-3 rounded-md my-2 overflow-x-auto; }
  
  /* Links */
  & a { @apply text-primary-600 hover:underline; }
  
  /* Blockquotes */
  & blockquote { @apply border-l-4 border-gray-300 pl-4 italic my-2; }
}
```

**Risk**: XSS vulnerabilities from user-generated markdown
**Mitigation**: react-markdown escapes HTML by default, use `remarkGfm` for safe extensions only

**Risk**: Performance with large markdown content
**Mitigation**: Limit context to 2000 chars (already enforced), use React.memo for MarkdownRenderer

---

### Phase 7: Delete Status Updates Feature (Day 7)
**Goal**: Add ability to delete status updates from workstream detail view

**Deliverables**:
- DELETE endpoint for status updates
- Delete button in UI with confirmation
- Optimistic UI updates
- Tests for delete functionality

**Backend Implementation**:

**Route**: `DELETE /api/status-updates/:id`

```typescript
// backend/src/routes/statusUpdates.ts
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const personId = req.userContext!.personId;
    
    await deleteStatusUpdate(id, personId);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting status update:', error);
    res.status(500).json({ error: 'Failed to delete status update' });
  }
});
```

**Service Function**:
```typescript
// backend/src/services/statusUpdateService.ts
export async function deleteStatusUpdate(
  statusUpdateId: string,
  personId: string
): Promise<void> {
  // Verify ownership through workstream → project → person chain
  const statusUpdate = await prisma.statusUpdate.findFirst({
    where: { id: statusUpdateId },
    include: {
      workstream: {
        include: { project: true }
      }
    }
  });
  
  if (!statusUpdate || statusUpdate.workstream.project.personId !== personId) {
    throw new Error('Status update not found or access denied');
  }
  
  await prisma.statusUpdate.delete({
    where: { id: statusUpdateId }
  });
}
```

**Frontend Implementation**:

```tsx
// frontend/src/pages/WorkstreamDetail.tsx
const deleteMutation = useMutation({
  mutationFn: async (statusUpdateId: string) => {
    await apiClient.delete(`/api/status-updates/${statusUpdateId}`);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['status-updates', id] });
    queryClient.invalidateQueries({ queryKey: ['workstreams'] });
    setDeleteConfirm(null);
  },
});

// In status update card
<button
  onClick={() => setDeleteConfirm(update.id)}
  className="text-red-600 hover:text-red-700"
>
  Delete
</button>

{deleteConfirm === update.id && (
  <div className="mt-2 flex gap-2">
    <button onClick={() => deleteMutation.mutate(update.id)}>
      Confirm Delete
    </button>
    <button onClick={() => setDeleteConfirm(null)}>
      Cancel
    </button>
  </div>
)}
```

**Files to Update**:
- `backend/src/routes/statusUpdates.ts` (add DELETE route)
- `backend/src/services/statusUpdateService.ts` (add deleteStatusUpdate)
- `backend/tests/integration/statusUpdates.test.ts` (add delete tests)
- `frontend/src/pages/WorkstreamDetail.tsx` (add delete UI)

**Risk**: Accidental deletion of important updates
**Mitigation**: Require explicit confirmation, use optimistic updates for instant feedback

---

### Phase 8: Documentation & Testing (Day 8)
**Goal**: Update all documentation and ensure complete test coverage

**Deliverables**:
- Updated README with "Categories" terminology
- Updated API documentation
- Migration guide for users
- All tests passing with new naming
- Integration tests for new DELETE endpoint

**Documentation Updates**:
- `README.md` (replace "Tags" with "Categories")
- `docs/DEVELOPMENT.md`
- `docs/Workstream Cockpit - Requirements Document.md`
- API endpoint documentation

**Test Updates**:
- Update all test descriptions
- Update test data variable names
- Add integration tests for DELETE status update
- Add tests for markdown rendering (snapshot tests)

**Migration Guide**:
```markdown
# Migration Guide: v2.0 - Tags → Categories

## What Changed
- "Tags" have been renamed to "Categories" throughout the application
- API endpoints: `/api/tags/*` → `/api/categories/*`
- Default categories now have distinct colors and emojis
- New Settings panel with tabbed navigation

## Action Required
- **Users**: Navigation item "Tags" is now "Settings → Categories"
- **API Clients**: Update endpoints (old `/api/tags` will work for 1 release)
- **No data migration needed**: All your data is preserved

## New Features
- Markdown rendering in workstream context and notes
- Delete status updates
- Improved Settings organization for future features
```

---

## Technical Dependencies

### NPM Packages

**Frontend**:
- `react-markdown@^9.0.1` - Markdown rendering
- `remark-gfm@^4.0.0` - GitHub Flavored Markdown support

**Backend**:
- No new dependencies (using existing Prisma, Express)

### Database Changes

**Migration 1**: Rename tags → categories
**Migration 2**: Update default category styles

---

## File Structure

### New Files

```
frontend/
  src/
    pages/
      Settings.tsx                          # Settings page wrapper
    components/
      Settings/
        SettingsLayout.tsx                  # Tab layout container
        SettingsSidebar.tsx                 # Tab navigation sidebar
        tabs/
          CategoriesTab.tsx                 # Moved from TagManagement
      Markdown/
        MarkdownRenderer.tsx                # Markdown rendering component
        markdown.css                        # Markdown styling

backend/
  src/
    services/
      categoryService.ts                    # Renamed from tagService.ts
    routes/
      categories.ts                         # Renamed from tags.ts
  tests/
    unit/
      categoryService.test.ts               # Renamed from tagService.test.ts
    integration/
      categories.test.ts                    # Renamed from tags.test.ts
  prisma/
    migrations/
      YYYYMMDD_rename_tags_to_categories/
        migration.sql
      YYYYMMDD_update_default_category_styles/
        migration.sql

docs/
  MIGRATION_V2.md                           # Migration guide
```

### Modified Files

```
frontend/
  src/
    App.tsx                                 # Route updates
    types/workstream.ts                     # Tag → Category interface
    hooks/
      useCategories.ts                      # Renamed from useTags.ts
    pages/
      Cockpit.tsx                           # Variable renaming
      WorkstreamDetail.tsx                  # Add markdown + delete
      Timeline.tsx                          # Variable renaming
    components/
      Layout/
        Navigation.tsx                      # Settings link
      Workstream/
        WorkstreamCard.tsx                  # Variable renaming
        WorkstreamCreateDialog.tsx          # Variable renaming
        WorkstreamEditDialog.tsx            # Variable renaming

backend/
  src/
    server.ts                               # Route registration
    services/
      workstreamService.ts                  # Variable renaming
      personService.ts                      # Update default categories
      statusUpdateService.ts                # Add delete function
    routes/
      statusUpdates.ts                      # Add DELETE endpoint
      workstreams.ts                        # Variable renaming
  prisma/
    schema.prisma                           # Tag → Category model
  tests/
    unit/
      workstreamService.test.ts             # Variable renaming
      personService.test.ts                 # Test default categories
    integration/
      workstreams.test.ts                   # Variable renaming
      statusUpdates.test.ts                 # Add delete tests

docs/
  README.md                                 # Tag → Category terminology
  DEVELOPMENT.md                            # Updated documentation
  Workstream Cockpit - Requirements Document.md  # Updated terminology
```

---

## Testing Strategy

### Unit Tests

**Updated Tests**:
- `categoryService.test.ts` (renamed, updated)
- `personService.test.ts` (verify default category styles)
- `workstreamService.test.ts` (variable renaming)

**New Tests**:
- `statusUpdateService.test.ts` - Test deleteStatusUpdate function

### Integration Tests

**Updated Tests**:
- `categories.test.ts` (renamed from tags.test.ts)
- `workstreams.test.ts` (variable renaming)

**New Tests**:
- `statusUpdates.test.ts` - Add DELETE endpoint test

### Frontend Tests

**Updated Tests**:
- Component tests using "category" terminology
- Update test data factories

**New Tests**:
- MarkdownRenderer component tests
- Settings layout navigation tests
- Delete confirmation flow tests

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing locally
- [ ] Database migration tested on local copy
- [ ] Backup production database
- [ ] Review migration SQL scripts
- [ ] Update environment variables (if needed)

### Deployment Steps

1. **Database Migration**
   ```bash
   # Run migrations
   npm run db:migrate
   
   # Verify migration
   npm run db:studio
   ```

2. **Backend Deployment**
   ```bash
   cd backend
   npm install
   npm run build
   npm test
   ```

3. **Frontend Deployment**
   ```bash
   cd frontend
   npm install
   npm run build
   npm run test
   ```

4. **Verification**
   - Test category CRUD operations
   - Test markdown rendering
   - Test status update deletion
   - Verify old `/api/tags` routes still work (backward compatibility)

### Post-Deployment

- [ ] Monitor logs for errors
- [ ] Verify default category styles applied
- [ ] Test markdown rendering in production
- [ ] Verify delete functionality works
- [ ] Update user documentation
- [ ] Send changelog to users

---

## Risk Assessment & Mitigation

### High Risk

**Risk**: Database migration fails or loses data
- **Mitigation**: Full backup before migration, test on staging, use transaction-based migration
- **Rollback**: Keep backup, reverse migration script prepared

**Risk**: Breaking changes to API clients
- **Mitigation**: Maintain `/api/tags` alias for 1 release, add deprecation warnings
- **Rollback**: Quick revert to old routes if needed

### Medium Risk

**Risk**: Markdown XSS vulnerabilities
- **Mitigation**: Use react-markdown with safe defaults, no HTML allowed
- **Rollback**: Disable markdown rendering if vulnerability found

**Risk**: Missing "tag" references in code
- **Mitigation**: Comprehensive grep search, IDE refactoring tools
- **Rollback**: Revert to old naming if critical bugs found

### Low Risk

**Risk**: UI confusion with Settings panel
- **Mitigation**: Clear navigation labels, redirect from `/tags`
- **Rollback**: Restore old navigation structure if users confused

---

## Success Criteria

### Functional Requirements

- [ ] All database tables/columns renamed to "category"
- [ ] All API endpoints use `/api/categories`
- [ ] All frontend code uses Category interface
- [ ] Default categories have correct colors and emojis
- [ ] Settings panel accessible with Categories tab
- [ ] Markdown renders correctly in context and notes
- [ ] Status updates can be deleted with confirmation
- [ ] All tests passing with new naming

### Non-Functional Requirements

- [ ] Zero data loss during migration
- [ ] No performance degradation with markdown rendering
- [ ] Backward compatibility for 1 release
- [ ] All documentation updated
- [ ] Migration guide published

### User Experience

- [ ] Users find Settings panel intuitive
- [ ] Category colors/emojis improve visual scanning
- [ ] Markdown formatting improves readability
- [ ] Delete confirmation prevents accidents
- [ ] No disruption to existing workflows

---

## Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 1. Database Migration | 1 day | None |
| 2. Backend Renaming | 1-2 days | Phase 1 |
| 3. Frontend Renaming | 1 day | Phase 2 |
| 4. Default Styling | 1 day | Phase 1 |
| 5. Settings Panel | 1 day | Phase 3 |
| 6. Markdown Rendering | 1-2 days | Phase 3 |
| 7. Delete Updates | 1 day | Phase 2 |
| 8. Documentation & Testing | 1 day | All phases |
| **Total** | **6-8 days** | Sequential with some parallelism |

**Parallelism Opportunities**:
- Phases 4 and 5 can run in parallel
- Phase 6 can start once Phase 3 is complete
- Phase 7 can start once Phase 2 is complete

---

## Notes

### Future Considerations

1. **Additional Settings Tabs**: 
   - User Preferences (theme, notifications)
   - Backup Management (view/restore backups)
   - Integrations (Slack, email)
   - Account Settings

2. **Markdown Editor Enhancement**:
   - Optional WYSIWYG markdown editor
   - Preview mode toggle
   - Markdown syntax help panel

3. **Category Enhancements**:
   - Category descriptions
   - Category icons beyond emoji
   - Nested categories
   - Category-specific workflows

4. **Bulk Operations**:
   - Bulk delete status updates
   - Bulk category assignment
   - Export/import categories

### Lessons Learned

- Plan comprehensive refactoring early (terminology matters!)
- Settings architecture enables future growth
- Markdown support is table stakes for professional tools
- Delete functionality should be standard, not afterthought

---

*End of Implementation Plan*
