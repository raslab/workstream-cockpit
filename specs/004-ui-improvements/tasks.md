# Tasks: UI/UX Improvements - Categories, Settings & Markdown

**Feature**: 004-ui-improvements
**Status**: Planning
**Created**: 2026-01-06

---

## Task Overview

This document provides detailed, actionable tasks for implementing the UI/UX improvements specified in the implementation plan. Tasks are organized by phase and include time estimates, priorities, and acceptance criteria.

**Total Estimated Time**: 6-8 days (48-64 hours)

---

## Phase 1: Database Migration - Tag → Category Rename (Day 1)

### Task 1.1: Create Prisma Schema Update
**Estimated Time**: 1 hour
**Priority**: P0 (Blocker)

**Steps**:
- [ ] Open `backend/prisma/schema.prisma`
- [ ] Rename model `Tag` to `Category`
- [ ] Update `@@map("tags")` to `@@map("categories")`
- [ ] In `Workstream` model, rename `tagId` to `categoryId`
- [ ] In `Workstream` model, rename `tag Tag?` to `category Category?`
- [ ] Update relation `@relation(fields: [tagId]` to `@relation(fields: [categoryId]`
- [ ] Save file

**Expected Changes**:
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
  // ...
  categoryId String? @map("category_id")  // Was: tagId
  // ...
  category Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)  // Was: tag
  @@index([categoryId])  // Was: @@index([tagId])
}
```

**Acceptance Criteria**:
- Schema compiles without errors
- All relations preserved
- Database mapping updated

**Dependencies**: None

---

### Task 1.2: Generate Migration Script
**Estimated Time**: 30 minutes
**Priority**: P0 (Blocker)

**Steps**:
- [ ] Run `npx prisma migrate dev --name rename_tags_to_categories`
- [ ] Review generated migration SQL
- [ ] Verify it includes:
  - Table rename
  - Column renames
  - Index renames
  - Foreign key updates
- [ ] Test migration on local database copy
- [ ] Verify all data intact after migration

**Acceptance Criteria**:
- Migration script generated
- Test migration successful
- No data loss in test
- All relationships preserved

**Dependencies**: Task 1.1

---

### Task 1.3: Update Default Category Styles Migration
**Estimated Time**: 1 hour
**Priority**: P1

**Steps**:
- [ ] Create new migration: `npx prisma migrate create update_default_category_styles`
- [ ] Add SQL to update default categories:
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
- [ ] Test migration on local copy
- [ ] Verify only default categories updated
- [ ] Verify custom categories untouched

**Acceptance Criteria**:
- Migration script created
- Only default categories updated
- Custom categories preserved
- Emojis and colors match specification

**Dependencies**: Task 1.2

---

## Phase 2: Backend API Renaming (Days 2-3)

### Task 2.1: Rename Tag Service File
**Estimated Time**: 30 minutes
**Priority**: P0 (Blocker)

**Steps**:
- [ ] Rename `backend/src/services/tagService.ts` to `categoryService.ts`
- [ ] Update all function names:
  - `getTagsByProjectId` → `getCategoriesByProjectId`
  - `createTag` → `createCategory`
  - `updateTag` → `updateCategory`
  - `deleteTag` → `deleteCategory`
  - `reorderTags` → `reorderCategories`
- [ ] Update all variable names: `tag` → `category`, `tags` → `categories`
- [ ] Update all type imports: `Tag` → `Category`
- [ ] Update Prisma model references: `prisma.tag` → `prisma.category`

**Acceptance Criteria**:
- File renamed successfully
- All functions renamed
- TypeScript compiles without errors
- No references to old Tag model

**Dependencies**: Task 1.2 (Prisma client regenerated)

---

### Task 2.2: Update Category Service Routes
**Estimated Time**: 1 hour
**Priority**: P0 (Blocker)

**Steps**:
- [ ] Rename `backend/src/routes/tags.ts` to `categories.ts`
- [ ] Update route path comments: `/api/tags` → `/api/categories`
- [ ] Update service imports:
```typescript
import {
  getCategoriesByProjectId,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../services/categoryService';
```
- [ ] Update route handlers to use new function names
- [ ] Update error messages to say "category" instead of "tag"
- [ ] Update validation error messages

**Acceptance Criteria**:
- Routes file renamed
- All imports updated
- All function calls updated
- Error messages updated

**Dependencies**: Task 2.1

---

### Task 2.3: Register Category Routes in Server
**Estimated Time**: 15 minutes
**Priority**: P0 (Blocker)

**Steps**:
- [ ] Open `backend/src/server.ts`
- [ ] Update import: `import tagRoutes from './routes/tags';` → `import categoryRoutes from './routes/categories';`
- [ ] Update route registration: `app.use('/api/tags', tagRoutes);` → `app.use('/api/categories', categoryRoutes);`
- [ ] Add backward compatibility (temporary):
```typescript
// Backward compatibility (deprecated, remove in v3.0)
app.use('/api/tags', (req, res, next) => {
  logger.warn('DEPRECATED: /api/tags is deprecated, use /api/categories instead');
  next();
}, categoryRoutes);
```

**Acceptance Criteria**:
- New routes registered at `/api/categories`
- Old routes still work at `/api/tags` (with deprecation warning)
- Server starts without errors

**Dependencies**: Task 2.2

---

### Task 2.4: Update Workstream Service References
**Estimated Time**: 30 minutes
**Priority**: P0 (Blocker)

**Steps**:
- [ ] Open `backend/src/services/workstreamService.ts`
- [ ] Find all references to `tag`/`Tag` and rename to `category`/`Category`
- [ ] Update Prisma include statements:
```typescript
include: {
  category: {  // Was: tag
    select: {
      id: true,
      name: true,
      color: true,
      emoji: true,
      sortOrder: true,
    },
  },
}
```
- [ ] Update function parameters: `tagId` → `categoryId`
- [ ] Update variable names throughout

**Acceptance Criteria**:
- All tag references renamed
- TypeScript compiles without errors
- Service functions work correctly

**Dependencies**: Task 2.1

---

### Task 2.5: Update Person Service Default Categories
**Estimated Time**: 30 minutes
**Priority**: P1

**Steps**:
- [ ] Open `backend/src/services/personService.ts`
- [ ] Find the `createPerson` function
- [ ] Update default category creation:
```typescript
const categories = await prisma.category.createMany({  // Was: tag
  data: [
    { projectId: project.id, name: 'project',   color: '#9EC3FF', emoji: '🎯', sortOrder: 0 },
    { projectId: project.id, name: 'delegated', color: '#DCB8FF', emoji: '👥', sortOrder: 1 },
    { projectId: project.id, name: 'ongoing',   color: '#74D898', emoji: '🔄', sortOrder: 2 },
    { projectId: project.id, name: 'watching',  color: '#B5BAC5', emoji: '👀', sortOrder: 3 },
  ],
});
```

**Acceptance Criteria**:
- Default categories use new colors and emojis
- Model reference updated to `category`
- New users get styled default categories

**Dependencies**: Task 2.1

---

### Task 2.6: Rename Unit Test File
**Estimated Time**: 1 hour
**Priority**: P1

**Steps**:
- [ ] Rename `backend/tests/unit/tagService.test.ts` to `categoryService.test.ts`
- [ ] Update imports: `tagService` → `categoryService`
- [ ] Update function names in tests: `createTag` → `createCategory`, etc.
- [ ] Update variable names: `tag` → `category`, `tags` → `categories`
- [ ] Update test descriptions: "Tag" → "Category"
- [ ] Update test data factory names
- [ ] Run tests to verify all pass

**Acceptance Criteria**:
- Test file renamed
- All test names updated
- All tests passing
- 100% coverage maintained

**Dependencies**: Task 2.1

---

### Task 2.7: Rename Integration Test File
**Estimated Time**: 1.5 hours
**Priority**: P1

**Steps**:
- [ ] Rename `backend/tests/integration/tags.test.ts` to `categories.test.ts`
- [ ] Update API endpoint calls: `/api/tags` → `/api/categories`
- [ ] Update variable names: `tag` → `category`, `tags` → `categories`
- [ ] Update test descriptions
- [ ] Update test data
- [ ] Run tests to verify all pass

**Acceptance Criteria**:
- Test file renamed
- All endpoint calls updated
- All tests passing
- Covers all 5 category endpoints

**Dependencies**: Task 2.3

---

### Task 2.8: Update Workstream Integration Tests
**Estimated Time**: 30 minutes
**Priority**: P1

**Steps**:
- [ ] Open `backend/tests/integration/workstreams.test.ts`
- [ ] Update variable names: `tag` → `category`, `tagId` → `categoryId`
- [ ] Update test descriptions mentioning tags
- [ ] Update test data factory calls
- [ ] Run tests to verify all pass

**Acceptance Criteria**:
- All tag references renamed
- All tests passing
- Test coverage maintained

**Dependencies**: Task 2.1

---

## Phase 3: Frontend Renaming & Type Updates (Day 3)

### Task 3.1: Update TypeScript Interfaces
**Estimated Time**: 30 minutes
**Priority**: P0 (Blocker)

**Steps**:
- [ ] Open `frontend/src/types/workstream.ts`
- [ ] Rename interface `Tag` to `Category`
- [ ] In `Workstream` interface, update:
  - `tagId: string | null;` → `categoryId: string | null;`
  - `tag?: Tag | null;` → `category?: Category | null;`
- [ ] Save file

**Expected Changes**:
```typescript
export interface Category {  // Was: Tag
  id: string;
  name: string;
  color: string;
  emoji?: string | null;
  sortOrder: number;
}

export interface Workstream {
  id: string;
  projectId: string;
  name: string;
  categoryId: string | null;  // Was: tagId
  context: string | null;
  state: 'active' | 'closed';
  createdAt: string;
  closedAt: string | null;
  category?: Category | null;  // Was: tag
  latestStatus?: StatusUpdate;
}
```

**Acceptance Criteria**:
- Interfaces renamed
- TypeScript compiles (with errors expected until other files updated)
- No duplicate interfaces

**Dependencies**: None (can be done in parallel with backend)

---

### Task 3.2: Rename Hooks File
**Estimated Time**: 30 minutes
**Priority**: P0 (Blocker)

**Steps**:
- [ ] Rename `frontend/src/hooks/useTags.ts` to `useCategories.ts`
- [ ] Update function name: `export function useTags()` → `export function useCategories()`
- [ ] Update query key: `queryKey: ['tags']` → `queryKey: ['categories']`
- [ ] Update API endpoint: `/api/tags` → `/api/categories`
- [ ] Update type import: `Tag` → `Category`

**Expected Changes**:
```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Category } from '../types/workstream';  // Was: Tag

export function useCategories() {  // Was: useTags
  return useQuery<Category[]>({  // Was: Tag[]
    queryKey: ['categories'],  // Was: ['tags']
    queryFn: async () => {
      const response = await apiClient.get('/api/categories');  // Was: /api/tags
      return response.data;
    },
  });
}
```

**Acceptance Criteria**:
- Hook renamed
- API endpoint updated
- Type updated

**Dependencies**: Task 3.1

---

### Task 3.3: Update Cockpit Page
**Estimated Time**: 45 minutes
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/pages/Cockpit.tsx`
- [ ] Update imports: `Tag` → `Category`, `useTags` → `useCategories`
- [ ] Rename all variables: `tag` → `category`, `tags` → `categories`, `tagId` → `categoryId`
- [ ] Update grouping logic references
- [ ] Update filter logic references
- [ ] Test page loads without errors

**Variable Renaming Checklist**:
- [ ] State variables
- [ ] Function parameters
- [ ] JSX props
- [ ] Comments

**Acceptance Criteria**:
- All tag references renamed
- Page compiles without errors
- Grouping and filtering still work
- UI displays correctly

**Dependencies**: Task 3.2

---

### Task 3.4: Update WorkstreamDetail Page
**Estimated Time**: 30 minutes
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/pages/WorkstreamDetail.tsx`
- [ ] Update imports: `Tag` → `Category`
- [ ] Rename variables: `tag` → `category`
- [ ] Update JSX rendering
- [ ] Test page loads without errors

**Acceptance Criteria**:
- All tag references renamed
- Page compiles without errors
- Workstream details display correctly

**Dependencies**: Task 3.1

---

### Task 3.5: Update WorkstreamCard Component
**Estimated Time**: 30 minutes
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/components/Workstream/WorkstreamCard.tsx`
- [ ] Update destructuring: `const { name, tag, latestStatus } = workstream;` → `const { name, category, latestStatus } = workstream;`
- [ ] Update JSX: `{tag && ...}` → `{category && ...}`
- [ ] Update all tag references
- [ ] Test component renders correctly

**Acceptance Criteria**:
- All tag references renamed
- Component compiles without errors
- Category badge displays correctly

**Dependencies**: Task 3.1

---

### Task 3.6: Update WorkstreamCreateDialog Component
**Estimated Time**: 45 minutes
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/components/Workstream/WorkstreamCreateDialog.tsx`
- [ ] Update imports: `useTags` → `useCategories`, `Tag` → `Category`
- [ ] Rename state: `const [tagId, setTagId] = useState<string>('');` → `const [categoryId, setCategoryId] = useState<string>('');`
- [ ] Update API call: `tagId` → `categoryId`
- [ ] Update JSX form field labels and placeholders
- [ ] Update tag selection dropdown to category selection

**Expected Changes**:
```typescript
const { data: categories, isLoading: categoriesLoading } = useCategories();  // Was: tags, tagsLoading

const [categoryId, setCategoryId] = useState<string>('');  // Was: tagId, setTagId

// In form
<label>Category</label>  {/* Was: Tag */}
<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
  {categories?.map(category => ...)}  {/* Was: tags, tag */}
</select>
```

**Acceptance Criteria**:
- All tag references renamed
- Form field labels updated
- Create workstream with category works

**Dependencies**: Task 3.2

---

### Task 3.7: Update WorkstreamEditDialog Component
**Estimated Time**: 45 minutes
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/components/Workstream/WorkstreamEditDialog.tsx`
- [ ] Update imports: `useTags` → `useCategories`, `Tag` → `Category`
- [ ] Rename state: `tagId` → `categoryId`
- [ ] Update mutation function
- [ ] Update JSX labels and dropdowns
- [ ] Test edit functionality

**Acceptance Criteria**:
- All tag references renamed
- Form labels updated
- Edit workstream category works

**Dependencies**: Task 3.2

---

### Task 3.8: Update Timeline Page
**Estimated Time**: 30 minutes
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/pages/Timeline.tsx`
- [ ] Update imports: `Tag` → `Category`, `useTags` → `useCategories`
- [ ] Rename filter state: `selectedTag` → `selectedCategory`
- [ ] Update filter dropdown
- [ ] Update timeline item rendering
- [ ] Test timeline filtering

**Acceptance Criteria**:
- All tag references renamed
- Filter dropdown updated
- Timeline filtering works

**Dependencies**: Task 3.2

---

### Task 3.9: Update Navigation Component
**Estimated Time**: 15 minutes
**Priority**: P2

**Steps**:
- [ ] Open `frontend/src/components/Layout/Navigation.tsx`
- [ ] Update link text (will be changed to "Settings" in Phase 5)
- [ ] For now, just update internal comments
- [ ] Prepare for Settings panel migration

**Acceptance Criteria**:
- Navigation compiles
- Links work correctly

**Dependencies**: None

---

## Phase 4: Settings Panel Architecture (Day 5)

### Task 4.1: Create Settings Page Structure
**Estimated Time**: 1 hour
**Priority**: P1

**Steps**:
- [ ] Create `frontend/src/pages/Settings.tsx`
- [ ] Set up React Router nested routes for tabs
- [ ] Create layout with sidebar and content area
- [ ] Add redirect from `/settings` to `/settings/categories`

**File Content**:
```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { SettingsLayout } from '../components/Settings/SettingsLayout';
import { CategoriesTab } from '../components/Settings/tabs/CategoriesTab';

export default function Settings() {
  return (
    <SettingsLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/settings/categories" replace />} />
        <Route path="/categories" element={<CategoriesTab />} />
        {/* Future tabs: */}
        {/* <Route path="/preferences" element={<PreferencesTab />} /> */}
        {/* <Route path="/integrations" element={<IntegrationsTab />} /> */}
      </Routes>
    </SettingsLayout>
  );
}
```

**Acceptance Criteria**:
- Settings page created
- Routing structure established
- Default redirect works

**Dependencies**: None

---

### Task 4.2: Create SettingsLayout Component
**Estimated Time**: 1.5 hours
**Priority**: P1

**Steps**:
- [ ] Create `frontend/src/components/Settings/SettingsLayout.tsx`
- [ ] Implement two-column layout (sidebar + content)
- [ ] Create responsive design (stacked on mobile)
- [ ] Add active tab highlighting

**File Content**:
```tsx
import { ReactNode } from 'react';
import { SettingsSidebar } from './SettingsSidebar';

interface SettingsLayoutProps {
  children: ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your workspace configuration
        </p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="w-full md:w-64">
          <SettingsSidebar />
        </aside>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- Layout component created
- Responsive design works
- Sidebar and content areas properly sized

**Dependencies**: None

---

### Task 4.3: Create SettingsSidebar Component
**Estimated Time**: 1 hour
**Priority**: P1

**Steps**:
- [ ] Create `frontend/src/components/Settings/SettingsSidebar.tsx`
- [ ] Implement tab list with active state
- [ ] Add icons for each tab
- [ ] Style active/inactive states

**File Content**:
```tsx
import { NavLink } from 'react-router-dom';

const tabs = [
  { name: 'Categories', href: '/settings/categories', icon: '🏷️' },
  // Future tabs:
  // { name: 'Preferences', href: '/settings/preferences', icon: '⚙️' },
  // { name: 'Integrations', href: '/settings/integrations', icon: '🔌' },
  // { name: 'Account', href: '/settings/account', icon: '👤' },
];

export function SettingsSidebar() {
  return (
    <nav className="space-y-1">
      {tabs.map((tab) => (
        <NavLink
          key={tab.name}
          to={tab.href}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`
          }
        >
          <span className="text-lg">{tab.icon}</span>
          {tab.name}
        </NavLink>
      ))}
    </nav>
  );
}
```

**Acceptance Criteria**:
- Sidebar component created
- Active tab highlighted
- Hover states work
- Icons display correctly

**Dependencies**: None

---

### Task 4.4: Create CategoriesTab Component
**Estimated Time**: 30 minutes
**Priority**: P1

**Steps**:
- [ ] Create `frontend/src/components/Settings/tabs/CategoriesTab.tsx`
- [ ] Move all content from `TagManagement.tsx` to this file
- [ ] Update imports and exports
- [ ] Remove page wrapper (handled by SettingsLayout)

**File Content**:
```tsx
// Copy entire content from TagManagement.tsx
// Remove outer page wrapper div
// Keep all category management logic
export function CategoriesTab() {
  // ... all the existing TagManagement logic
  
  return (
    <div>
      {/* Category management UI without outer page wrapper */}
    </div>
  );
}
```

**Acceptance Criteria**:
- CategoriesTab component created
- All category management functionality preserved
- No page wrapper duplication

**Dependencies**: Task 3.2 (useCategories hook)

---

### Task 4.5: Update App.tsx Routes
**Estimated Time**: 30 minutes
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/App.tsx`
- [ ] Remove TagManagement import
- [ ] Import Settings page
- [ ] Update route: `/tags` → `/settings/*`
- [ ] Add redirect from `/tags` to `/settings/categories`

**Expected Changes**:
```tsx
import Settings from '@/pages/Settings';  // Was: TagManagement

// In Routes:
<Route
  path="/settings/*"
  element={
    <ProtectedRoute>
      <Layout>
        <Settings />
      </Layout>
    </ProtectedRoute>
  }
/>

{/* Backward compatibility redirect */}
<Route path="/tags" element={<Navigate to="/settings/categories" replace />} />
```

**Acceptance Criteria**:
- Settings route registered
- Redirect from /tags works
- Nested routes work

**Dependencies**: Task 4.1

---

### Task 4.6: Update Navigation Links
**Estimated Time**: 15 minutes
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/components/Layout/Navigation.tsx`
- [ ] Update link: `<Link to="/tags">Tags</Link>` → `<Link to="/settings">Settings</Link>`
- [ ] Update icon/label
- [ ] Test navigation

**Expected Changes**:
```tsx
<NavLink 
  to="/settings"  // Was: /tags
  className={...}
>
  <SettingsIcon />  {/* Was: TagIcon */}
  Settings  {/* Was: Tags */}
</NavLink>
```

**Acceptance Criteria**:
- Navigation link updated
- Link goes to Settings page
- Icon/label updated

**Dependencies**: Task 4.5

---

## Phase 5: Markdown Rendering Support (Days 6-7)

### Task 5.1: Install Markdown Dependencies
**Estimated Time**: 15 minutes
**Priority**: P0 (Blocker)

**Steps**:
- [ ] Open terminal in `frontend/` directory
- [ ] Run `npm install react-markdown@^9.0.1 remark-gfm@^4.0.0`
- [ ] Verify installation in package.json
- [ ] Run `npm install` to ensure lockfile updated

**Acceptance Criteria**:
- Packages installed
- No dependency conflicts
- package.json and package-lock.json updated

**Dependencies**: None

---

### Task 5.2: Create MarkdownRenderer Component
**Estimated Time**: 2 hours
**Priority**: P1

**Steps**:
- [ ] Create `frontend/src/components/Markdown/MarkdownRenderer.tsx`
- [ ] Implement component with react-markdown
- [ ] Add remark-gfm plugin
- [ ] Customize component renderers for styling
- [ ] Add link security (target="_blank", rel="noopener noreferrer")

**File Content**:
```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={`markdown-content ${className}`}
      components={{
        // Links - open in new tab with security
        a: ({ node, ...props }) => (
          <a
            {...props}
            className="text-primary-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          />
        ),
        // Headings
        h1: ({ node, ...props }) => (
          <h1 {...props} className="text-xl font-bold mt-4 mb-2 text-gray-900" />
        ),
        h2: ({ node, ...props }) => (
          <h2 {...props} className="text-lg font-semibold mt-3 mb-2 text-gray-900" />
        ),
        h3: ({ node, ...props }) => (
          <h3 {...props} className="text-base font-semibold mt-2 mb-1 text-gray-900" />
        ),
        // Lists
        ul: ({ node, ...props }) => (
          <ul {...props} className="list-disc ml-4 my-2 space-y-1" />
        ),
        ol: ({ node, ...props }) => (
          <ol {...props} className="list-decimal ml-4 my-2 space-y-1" />
        ),
        // Code
        code: ({ node, inline, ...props }) =>
          inline ? (
            <code {...props} className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" />
          ) : (
            <code {...props} className="block bg-gray-100 p-3 rounded-md my-2 overflow-x-auto text-sm font-mono" />
          ),
        // Blockquotes
        blockquote: ({ node, ...props }) => (
          <blockquote {...props} className="border-l-4 border-gray-300 pl-4 italic my-2 text-gray-700" />
        ),
        // Paragraphs
        p: ({ node, ...props }) => (
          <p {...props} className="my-2 leading-relaxed" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

**Acceptance Criteria**:
- Component created
- All markdown features render correctly
- Links open in new tab securely
- Styling matches design system
- No XSS vulnerabilities

**Dependencies**: Task 5.1

---

### Task 5.3: Create Markdown Styles
**Estimated Time**: 30 minutes
**Priority**: P1

**Steps**:
- [ ] Create `frontend/src/components/Markdown/markdown.css`
- [ ] Add global markdown styles
- [ ] Import in main App or index.css
- [ ] Test styling across all markdown elements

**File Content**:
```css
/* Markdown content styles */
.markdown-content {
  @apply text-gray-700 text-sm;
}

.markdown-content > *:first-child {
  @apply mt-0;
}

.markdown-content > *:last-child {
  @apply mb-0;
}

/* Ensure proper spacing */
.markdown-content p + p {
  @apply mt-3;
}

.markdown-content ul, 
.markdown-content ol {
  @apply text-sm;
}

.markdown-content li {
  @apply leading-relaxed;
}

/* Code blocks */
.markdown-content pre {
  @apply text-xs;
}

/* Tables (GFM) */
.markdown-content table {
  @apply w-full border-collapse my-4;
}

.markdown-content th {
  @apply bg-gray-50 font-semibold text-left p-2 border border-gray-200;
}

.markdown-content td {
  @apply p-2 border border-gray-200;
}

/* Horizontal rules */
.markdown-content hr {
  @apply border-gray-200 my-4;
}
```

**Acceptance Criteria**:
- CSS file created
- Styles imported globally
- All elements properly styled
- Responsive on mobile

**Dependencies**: None

---

### Task 5.4: Add Markdown to Workstream Context
**Estimated Time**: 30 minutes
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/pages/WorkstreamDetail.tsx`
- [ ] Import MarkdownRenderer
- [ ] Find workstream context rendering (around line 189)
- [ ] Replace plain text with MarkdownRenderer:

**Expected Changes**:
```tsx
import { MarkdownRenderer } from '../components/Markdown/MarkdownRenderer';

// In JSX, replace:
{workstream.context && (
  <p className="mt-2 text-sm text-gray-600">{workstream.context}</p>
)}

// With:
{workstream.context && (
  <div className="mt-2">
    <MarkdownRenderer content={workstream.context} className="text-sm text-gray-600" />
  </div>
)}
```

**Acceptance Criteria**:
- Markdown renders in workstream context
- Formatting preserved
- Links clickable
- No layout breaks

**Dependencies**: Task 5.2

---

### Task 5.5: Add Markdown to Status Update Notes
**Estimated Time**: 45 minutes
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/pages/WorkstreamDetail.tsx`
- [ ] Find status update notes rendering (around line 237)
- [ ] Replace plain text with MarkdownRenderer:

**Expected Changes**:
```tsx
// In status update card, replace:
{update.note && (
  <p className="mt-2 text-sm text-gray-600 italic">{update.note}</p>
)}

// With:
{update.note && (
  <div className="mt-2">
    <MarkdownRenderer content={update.note} className="text-sm text-gray-600" />
  </div>
)}
```

**Acceptance Criteria**:
- Markdown renders in status notes
- All markdown features work
- Consistent styling with context
- No performance issues

**Dependencies**: Task 5.2

---

### Task 5.6: Add Markdown to Timeline View
**Estimated Time**: 30 minutes
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/pages/Timeline.tsx`
- [ ] Import MarkdownRenderer
- [ ] Find status note rendering in timeline items
- [ ] Replace plain text with MarkdownRenderer
- [ ] Test timeline rendering

**Acceptance Criteria**:
- Markdown renders in timeline
- Compact view still readable
- No layout breaks

**Dependencies**: Task 5.2

---

### Task 5.7: Test Markdown Edge Cases
**Estimated Time**: 1 hour
**Priority**: P1

**Steps**:
- [ ] Test with empty content
- [ ] Test with very long content
- [ ] Test with all markdown features:
  - Headers (# ## ###)
  - Bold (**text**)
  - Italic (*text*)
  - Links ([text](url))
  - Lists (ordered and unordered)
  - Code blocks (```code```)
  - Inline code (`code`)
  - Blockquotes (> quote)
  - Line breaks
- [ ] Test XSS prevention (try injecting HTML/JS)
- [ ] Test mobile responsiveness

**Acceptance Criteria**:
- All markdown features work
- No XSS vulnerabilities
- No layout breaks
- Mobile responsive
- Performance acceptable

**Dependencies**: Tasks 5.4, 5.5, 5.6

---

## Phase 6: Delete Status Updates Feature (Day 7)

### Task 6.1: Add Delete Service Function
**Estimated Time**: 45 minutes
**Priority**: P1

**Steps**:
- [ ] Open `backend/src/services/statusUpdateService.ts`
- [ ] Add `deleteStatusUpdate` function
- [ ] Implement ownership verification
- [ ] Add error handling

**File Content**:
```typescript
/**
 * Delete a status update (with access control)
 */
export async function deleteStatusUpdate(
  statusUpdateId: string,
  personId: string
): Promise<void> {
  try {
    // Verify ownership through workstream → project → person chain
    const statusUpdate = await prisma.statusUpdate.findFirst({
      where: { id: statusUpdateId },
      include: {
        workstream: {
          include: { project: true }
        }
      }
    });
    
    if (!statusUpdate) {
      throw new Error('Status update not found');
    }
    
    if (statusUpdate.workstream.project.personId !== personId) {
      throw new Error('Access denied');
    }
    
    await prisma.statusUpdate.delete({
      where: { id: statusUpdateId }
    });
    
    logger.info('Status update deleted:', { statusUpdateId, personId });
  } catch (error) {
    logger.error('Error deleting status update:', error);
    throw error;
  }
}
```

**Acceptance Criteria**:
- Function created
- Ownership verification works
- Error handling proper
- Logging implemented

**Dependencies**: None

---

### Task 6.2: Add Delete Route
**Estimated Time**: 30 minutes
**Priority**: P1

**Steps**:
- [ ] Open `backend/src/routes/statusUpdates.ts`
- [ ] Import deleteStatusUpdate from service
- [ ] Add DELETE /:id route

**File Content**:
```typescript
import { deleteStatusUpdate } from '../services/statusUpdateService';

/**
 * DELETE /api/status-updates/:id
 * Delete a status update
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const personId = req.userContext!.personId;
    
    await deleteStatusUpdate(id, personId);
    
    res.status(204).send();
  } catch (error: any) {
    logger.error('Error in DELETE /status-updates/:id:', error);
    
    if (error.message === 'Status update not found' || error.message === 'Access denied') {
      res.status(404).json({ error: 'Status update not found' });
      return;
    }
    
    res.status(500).json({ error: 'Failed to delete status update' });
  }
});
```

**Acceptance Criteria**:
- Route created
- Returns 204 on success
- Returns 404 if not found
- Returns 500 on error

**Dependencies**: Task 6.1

---

### Task 6.3: Add Integration Tests for Delete
**Estimated Time**: 1 hour
**Priority**: P1

**Steps**:
- [ ] Open `backend/tests/integration/statusUpdates.test.ts`
- [ ] Add test suite for DELETE endpoint
- [ ] Test cases:
  - Successfully delete own status update
  - Cannot delete another user's status update
  - Cannot delete non-existent status update
  - Verify status update removed from database

**Test Content**:
```typescript
describe('DELETE /api/status-updates/:id', () => {
  it('should delete own status update', async () => {
    const { person, project, workstream } = await setupTestData();
    const statusUpdate = await createTestStatusUpdate(workstream.id);
    
    const app = await createAuthenticatedApp(person.id);
    const response = await request(app)
      .delete(`/api/status-updates/${statusUpdate.id}`)
      .expect(204);
    
    // Verify deleted from database
    const deleted = await prisma.statusUpdate.findUnique({
      where: { id: statusUpdate.id }
    });
    expect(deleted).toBeNull();
  });

  it('should not delete another user\'s status update', async () => {
    const { person, project, workstream } = await setupTestData();
    const otherPerson = await createTestPerson();
    const statusUpdate = await createTestStatusUpdate(workstream.id);
    
    const app = await createAuthenticatedApp(otherPerson.id);
    await request(app)
      .delete(`/api/status-updates/${statusUpdate.id}`)
      .expect(404);
    
    // Verify still exists
    const exists = await prisma.statusUpdate.findUnique({
      where: { id: statusUpdate.id }
    });
    expect(exists).not.toBeNull();
  });

  it('should return 404 for non-existent status update', async () => {
    const { person } = await setupTestData();
    const app = await createAuthenticatedApp(person.id);
    
    await request(app)
      .delete(`/api/status-updates/00000000-0000-0000-0000-000000000000`)
      .expect(404);
  });
});
```

**Acceptance Criteria**:
- All delete tests pass
- Access control verified
- Data isolation tested

**Dependencies**: Task 6.2

---

### Task 6.4: Add Delete UI to WorkstreamDetail
**Estimated Time**: 1.5 hours
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/pages/WorkstreamDetail.tsx`
- [ ] Add state for delete confirmation: `const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);`
- [ ] Add delete mutation
- [ ] Add delete button to each status update
- [ ] Add confirmation dialog
- [ ] Test delete functionality

**File Content**:
```tsx
const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

const deleteMutation = useMutation({
  mutationFn: async (statusUpdateId: string) => {
    await apiClient.delete(`/api/status-updates/${statusUpdateId}`);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['status-updates', id] });
    queryClient.invalidateQueries({ queryKey: ['workstreams'] });
    queryClient.invalidateQueries({ queryKey: ['timeline'] });
    setDeleteConfirm(null);
  },
});

// In status update card, add delete button next to Edit:
<div className="flex gap-2">
  <button
    onClick={() => setEditingStatus(update)}
    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
  >
    Edit
  </button>
  
  {deleteConfirm === update.id ? (
    <>
      <button
        onClick={() => setDeleteConfirm(null)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Cancel
      </button>
      <button
        onClick={() => deleteMutation.mutate(update.id)}
        disabled={deleteMutation.isPending}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
      </button>
    </>
  ) : (
    <button
      onClick={() => setDeleteConfirm(update.id)}
      className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
    >
      Delete
    </button>
  )}
</div>
```

**Acceptance Criteria**:
- Delete button appears on each update
- Confirmation required before delete
- Optimistic UI update
- Error handling
- Cache invalidation works

**Dependencies**: Task 6.2

---

### Task 6.5: Add Delete Error Handling
**Estimated Time**: 30 minutes
**Priority**: P1

**Steps**:
- [ ] Add error state to delete mutation
- [ ] Display error message if delete fails
- [ ] Add toast notification (optional)
- [ ] Test error scenarios

**File Content**:
```tsx
const deleteMutation = useMutation({
  mutationFn: async (statusUpdateId: string) => {
    await apiClient.delete(`/api/status-updates/${statusUpdateId}`);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['status-updates', id] });
    queryClient.invalidateQueries({ queryKey: ['workstreams'] });
    setDeleteConfirm(null);
  },
  onError: (error: any) => {
    console.error('Failed to delete status update:', error);
    // Error will be displayed via mutation.isError
  },
});

// In JSX, show error:
{deleteMutation.isError && deleteConfirm && (
  <div className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
    Failed to delete status update. Please try again.
  </div>
)}
```

**Acceptance Criteria**:
- Error message displays
- User can retry delete
- Error state clears on success

**Dependencies**: Task 6.4

---

## Phase 7: Documentation & Testing (Day 8)

### Task 7.1: Update README.md
**Estimated Time**: 1 hour
**Priority**: P1

**Steps**:
- [ ] Open `README.md`
- [ ] Find/replace all "Tag" → "Category"
- [ ] Find/replace all "tag" → "category"
- [ ] Update feature descriptions
- [ ] Update screenshots section (note markdown support)
- [ ] Update usage examples

**Key Sections to Update**:
- Features table
- Usage guide
- Tag Organization → Category Organization
- API Endpoints list
- Database Schema

**Acceptance Criteria**:
- All tag references updated
- Markdown feature documented
- Settings panel documented
- Delete feature documented

**Dependencies**: None

---

### Task 7.2: Update DEVELOPMENT.md
**Estimated Time**: 45 minutes
**Priority**: P1

**Steps**:
- [ ] Open `docs/DEVELOPMENT.md`
- [ ] Update API endpoint documentation
- [ ] Update database schema documentation
- [ ] Update terminology throughout
- [ ] Add markdown rendering notes

**Acceptance Criteria**:
- Documentation accurate
- All endpoints documented
- Schema reflects categories

**Dependencies**: None

---

### Task 7.3: Update Requirements Document
**Estimated Time**: 30 minutes
**Priority**: P2

**Steps**:
- [ ] Open `docs/Workstream Cockpit - Requirements Document.md`
- [ ] Update data model section
- [ ] Update functional requirements
- [ ] Update entity descriptions
- [ ] Update terminology

**Acceptance Criteria**:
- Requirements reflect categories
- Data model updated
- Functional requirements accurate

**Dependencies**: None

---

### Task 7.4: Create Migration Guide
**Estimated Time**: 1 hour
**Priority**: P1

**Steps**:
- [ ] Create `docs/MIGRATION_V2.md`
- [ ] Document breaking changes
- [ ] Provide migration steps for API clients
- [ ] Document new features
- [ ] Add FAQ section

**File Content**:
```markdown
# Migration Guide: v2.0 - UI/UX Improvements

## Breaking Changes

### API Endpoints Renamed
All `/api/tags/*` endpoints are now `/api/categories/*`:

| Old Endpoint | New Endpoint |
|--------------|--------------|
| GET /api/tags | GET /api/categories |
| POST /api/tags | POST /api/categories |
| PUT /api/tags/reorder | PUT /api/categories/reorder |
| PUT /api/tags/:id | PUT /api/categories/:id |
| DELETE /api/tags/:id | DELETE /api/categories/:id |

**Backward Compatibility**: Old endpoints will continue to work for v2.x releases with deprecation warnings. They will be removed in v3.0.

### Database Schema Changes
- Table `tags` renamed to `categories`
- Column `tag_id` renamed to `category_id` in workstreams table
- All indexes updated accordingly

**Migration**: Automatic via `npm run db:migrate`. No manual intervention required.

### TypeScript Interface Changes
```typescript
// Before
interface Tag { ... }
workstream.tagId
workstream.tag

// After
interface Category { ... }
workstream.categoryId
workstream.category
```

## New Features

### 1. Markdown Rendering
Workstream context and status notes now support markdown formatting:
- Headers (# ## ###)
- Bold (**text**) and italic (*text*)
- Links ([text](url))
- Lists (ordered and unordered)
- Code blocks
- And more!

### 2. Settings Panel
Navigation item "Tags" replaced with "Settings":
- Categories tab (formerly Tags page)
- Future tabs: Preferences, Integrations, Account

### 3. Delete Status Updates
You can now delete status updates from the workstream detail view.

### 4. Improved Default Categories
Default categories now have distinct colors and emojis:
- 🎯 Project (#9EC3FF)
- 👥 Delegated (#DCB8FF)
- 🔄 Ongoing (#74D898)
- 👀 Watching (#B5BAC5)

## Migration Steps

### For Users
1. Update browser cache (hard refresh: Cmd+Shift+R / Ctrl+Shift+R)
2. Navigate to "Settings" instead of "Tags"
3. Start using markdown in context and notes!

### For API Clients
1. Update endpoint URLs: `/api/tags` → `/api/categories`
2. Update TypeScript types: `Tag` → `Category`
3. Update property names: `tagId` → `categoryId`

### For Developers
1. Pull latest code
2. Run database migration: `npm run db:migrate`
3. Install dependencies: `npm install`
4. Update imports and types
5. Run tests: `npm test`

## FAQ

**Q: Will my existing data be lost?**
A: No! All data is preserved during migration.

**Q: Do I need to update my categories?**
A: No, existing categories work as-is. Default categories will be automatically updated.

**Q: Can I still use old API endpoints?**
A: Yes, temporarily. Old endpoints work in v2.x but will be removed in v3.0.

**Q: Is markdown required?**
A: No, plain text still works perfectly fine.

**Q: Can I undo a deleted status update?**
A: No, deletions are permanent. A confirmation is required to prevent accidents.
```

**Acceptance Criteria**:
- Migration guide complete
- Breaking changes documented
- Migration steps clear
- FAQ helpful

**Dependencies**: All previous phases

---

### Task 7.5: Run Full Test Suite
**Estimated Time**: 30 minutes
**Priority**: P0 (Blocker)

**Steps**:
- [ ] Run backend unit tests: `cd backend && npm test`
- [ ] Run backend integration tests: `cd backend && npm run test:integration`
- [ ] Run frontend tests: `cd frontend && npm test`
- [ ] Verify all tests pass
- [ ] Check test coverage (should be 100% for integration)

**Acceptance Criteria**:
- All tests pass
- No regressions
- Coverage maintained
- No console errors

**Dependencies**: All previous phases

---

### Task 7.6: Manual Testing Checklist
**Estimated Time**: 2 hours
**Priority**: P0 (Blocker)

**Manual Test Cases**:

**Category Management**:
- [ ] List categories
- [ ] Create new category
- [ ] Edit category name, color, emoji
- [ ] Delete category (with/without workstreams)
- [ ] Reorder categories (drag-drop)
- [ ] Verify new API endpoints work
- [ ] Verify old endpoints still work (with warnings)

**Settings Panel**:
- [ ] Navigate to Settings from menu
- [ ] Categories tab loads
- [ ] Tab navigation works
- [ ] Redirect from /tags works
- [ ] Mobile responsive

**Markdown Rendering**:
- [ ] Create workstream with markdown in context
- [ ] Add status update with markdown in note
- [ ] Verify headers render
- [ ] Verify links work (open new tab)
- [ ] Verify lists render
- [ ] Verify code blocks render
- [ ] Verify blockquotes render
- [ ] Test on mobile

**Delete Status Updates**:
- [ ] Delete button appears on updates
- [ ] Confirmation required
- [ ] Delete works
- [ ] Optimistic UI update
- [ ] Error handling works
- [ ] Cannot delete other user's updates

**Default Categories**:
- [ ] Create new user account
- [ ] Verify default categories have emojis/colors
- [ ] Verify existing users unchanged

**General**:
- [ ] No console errors
- [ ] No layout breaks
- [ ] Mobile responsive
- [ ] Performance acceptable

**Acceptance Criteria**:
- All manual tests pass
- No critical bugs
- UX smooth

**Dependencies**: All previous phases

---

### Task 7.7: Update CHANGELOG
**Estimated Time**: 30 minutes
**Priority**: P1

**Steps**:
- [ ] Create `docs/CHANGELOG-004.md`
- [ ] Document all changes
- [ ] List new features
- [ ] List breaking changes
- [ ] List bug fixes (if any)

**File Content**:
```markdown
# Changelog - Specification 004: UI/UX Improvements

**Version**: 2.0.0
**Date**: 2026-01-XX
**Status**: Released

## Summary

This release includes major UI/UX improvements:
- Renamed "Tags" to "Categories" (more accurate terminology)
- New Settings panel with tabbed navigation
- Markdown support for context and notes
- Ability to delete status updates
- Improved default category styling

## Breaking Changes

### API Endpoints
- `/api/tags/*` → `/api/categories/*`
- Old endpoints still work with deprecation warnings (remove in v3.0)

### Database Schema
- Table `tags` → `categories`
- Column `tag_id` → `category_id`
- Automatic migration handles all changes

### TypeScript Types
- Interface `Tag` → `Category`
- Property `tagId` → `categoryId`
- Property `tag` → `category`

## New Features

### 1. Categories Terminology
- Renamed throughout entire application
- More accurate for how feature is used
- Better user understanding

### 2. Settings Panel
- New tabbed layout for settings
- Categories tab (formerly Tags page)
- Prepared for future settings tabs
- Better navigation scalability

### 3. Markdown Rendering
- Full markdown support in workstream context
- Full markdown support in status notes
- GitHub Flavored Markdown (tables, task lists, etc.)
- Secure rendering (no XSS)

### 4. Delete Status Updates
- Delete button on each status update
- Confirmation required
- Optimistic UI updates
- Proper error handling

### 5. Improved Default Categories
- 🎯 Project (#9EC3FF)
- 👥 Delegated (#DCB8FF)
- 🔄 Ongoing (#74D898)
- 👀 Watching (#B5BAC5)

## Technical Changes

### Backend
- Renamed `tagService.ts` → `categoryService.ts`
- Renamed `routes/tags.ts` → `routes/categories.ts`
- Added `deleteStatusUpdate` function
- Added DELETE `/api/status-updates/:id` endpoint
- Updated all tests to use category terminology

### Frontend
- Renamed `useTags` hook → `useCategories`
- Created Settings page architecture
- Created MarkdownRenderer component
- Added delete UI to WorkstreamDetail
- Updated all components to use category terminology

### Database
- Migration: rename tags → categories
- Migration: update default category styles
- Zero data loss

## Dependencies Added

### Frontend
- `react-markdown@^9.0.1` - Markdown rendering
- `remark-gfm@^4.0.0` - GitHub Flavored Markdown

## Testing

- ✅ All unit tests updated and passing
- ✅ All integration tests updated and passing
- ✅ New delete endpoint fully tested
- ✅ Markdown rendering tested
- ✅ Settings panel navigation tested

## Migration Guide

See [MIGRATION_V2.md](./MIGRATION_V2.md) for detailed migration instructions.

## Known Issues

None at release.

## Contributors

- Development team

---

*End of Changelog*
```

**Acceptance Criteria**:
- Changelog complete
- All changes documented
- Breaking changes highlighted
- Migration guide referenced

**Dependencies**: All previous phases

---

## Summary

**Total Tasks**: 57
**Total Estimated Time**: 48-64 hours (6-8 days)

### Phase Breakdown
- Phase 1 (Database): 3 tasks, 2.5 hours
- Phase 2 (Backend): 8 tasks, 6.5 hours
- Phase 3 (Frontend): 9 tasks, 6 hours
- Phase 4 (Settings): 6 tasks, 4.5 hours
- Phase 5 (Markdown): 7 tasks, 6.5 hours
- Phase 6 (Delete): 5 tasks, 4.5 hours
- Phase 7 (Docs/Testing): 7 tasks, 6 hours

### Critical Path
1. Database migration (Phase 1) → Backend renaming (Phase 2) → Frontend renaming (Phase 3)
2. Settings panel (Phase 4) depends on Phase 3
3. Markdown (Phase 5) depends on Phase 3
4. Delete (Phase 6) depends on Phase 2
5. Documentation (Phase 7) depends on all phases

### Parallelization Opportunities
- Phase 4 and Phase 5 can be done in parallel after Phase 3
- Phase 6 can start after Phase 2
- Phase 1 can be prepared while planning other phases

---

*End of Tasks Document*
