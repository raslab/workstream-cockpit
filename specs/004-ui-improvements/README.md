# Specification 004: UI/UX Improvements - Categories, Settings & Markdown

**Status**: 📋 Planning
**Created**: 2026-01-06
**Estimated Duration**: 6-8 days

---

## Overview

This specification defines comprehensive UI/UX improvements to enhance user experience, correct terminology, add professional text formatting, and prepare the application architecture for future expansion.

### Key Features

1. **🏷️ Tag → Category Rename**: Complete terminology correction across the entire stack
2. **🎨 Visual Enhancement**: Distinct colors and emojis for default categories
3. **⚙️ Settings Panel**: New tabbed architecture for scalable settings
4. **📝 Markdown Support**: Rich text formatting for descriptions and notes
5. **🗑️ Delete Updates**: Ability to remove status updates

---

## Quick Links

- [📋 Implementation Plan](./plan.md) - Detailed 8-phase implementation strategy
- [✅ Task List](./tasks.md) - 57 actionable tasks with time estimates
- [📖 Specification](./spec.md) - Complete technical specification

---

## Problem Statement

### Current Pain Points

1. **Misleading Terminology**: Feature called "Tags" but behaves like "Categories"
2. **Visual Uniformity**: Default categories lack distinction
3. **Flat Navigation**: No room for future settings expansion
4. **Plain Text Only**: No formatting support for professional documentation
5. **No Delete**: Cannot remove erroneous status updates

### Proposed Solutions

1. **Rename Everything**: Database, API, UI, docs → "Categories"
2. **Apply Styling**: Emoji + color for each default category
3. **Settings Architecture**: Tabbed panel for current and future settings
4. **Markdown Rendering**: Full GFM support with secure rendering
5. **Delete Functionality**: Complete CRUD for status updates

---

## Implementation Summary

### Phase Breakdown

| Phase | Duration | Description |
|-------|----------|-------------|
| **Phase 1** | 1 day | Database migration (tags → categories) |
| **Phase 2** | 1-2 days | Backend API renaming and tests |
| **Phase 3** | 1 day | Frontend renaming and type updates |
| **Phase 4** | 1 day | Settings panel architecture |
| **Phase 5** | 1-2 days | Markdown rendering implementation |
| **Phase 6** | 1 day | Delete status updates feature |
| **Phase 7** | 1 day | Documentation and final testing |

**Total**: 6-8 days (48-64 hours)

---

## Breaking Changes

### API Endpoints
```
OLD: /api/tags/*
NEW: /api/categories/*
```
*Old endpoints will work with deprecation warnings until v3.0*

### Database Schema
```sql
-- Table rename
tags → categories

-- Column rename
workstreams.tag_id → workstreams.category_id
```

### TypeScript Types
```typescript
// OLD
interface Tag { ... }
workstream.tagId
workstream.tag

// NEW
interface Category { ... }
workstream.categoryId
workstream.category
```

---

## New Features

### 1. Enhanced Default Categories

| Name | Color | Emoji | Purpose |
|------|-------|-------|---------|
| project | #9EC3FF | 🎯 | Core project work |
| delegated | #DCB8FF | 👥 | Waiting on others |
| ongoing | #74D898 | 🔄 | Active maintenance |
| watching | #B5BAC5 | 👀 | Monitoring only |

### 2. Settings Panel

```
Settings
├── Categories (current TagManagement)
└── Future tabs:
    ├── Preferences
    ├── Integrations
    └── Account
```

### 3. Markdown Support

**Supported Features**:
- Headers (# ## ###)
- Bold (**text**) and italic (*text*)
- Links ([text](url))
- Lists (ordered and unordered)
- Code blocks (```code```)
- Blockquotes (> quote)
- Tables and task lists (GFM)

**Applied To**:
- Workstream context field
- Status update notes
- Timeline view

### 4. Delete Status Updates

- Delete button on each status update
- Confirmation required
- Optimistic UI updates
- Proper authorization checks

---

## Technical Details

### Dependencies Added

**Frontend**:
```json
{
  "react-markdown": "^9.0.1",
  "remark-gfm": "^4.0.0"
}
```

### Database Migrations

1. **rename_tags_to_categories**: Table/column renames
2. **update_default_category_styles**: Apply new colors/emojis

### File Changes Summary

**New Files**: 11
- Frontend: Settings.tsx, SettingsLayout, MarkdownRenderer, CategoriesTab
- Backend: categoryService.ts (renamed), categories.ts (renamed)
- Tests: Updated and renamed

**Modified Files**: 30+
- All files referencing tags/Tag
- WorkstreamDetail (markdown + delete)
- App.tsx (routing)
- Documentation

---

## Testing Strategy

### Coverage Requirements

- ✅ 100% integration test coverage maintained
- ✅ All unit tests updated and passing
- ✅ New delete endpoint fully tested
- ✅ Markdown XSS prevention verified
- ✅ Settings navigation flow tested

### Test Files

**Backend**:
- `categoryService.test.ts` (renamed + updated)
- `categories.test.ts` (renamed + updated)
- `statusUpdates.test.ts` (added delete tests)
- `personService.test.ts` (default categories)

**Frontend**:
- Component tests for Settings panel
- MarkdownRenderer snapshot tests
- Delete confirmation flow tests

---

## Success Criteria

### Functional

- [ ] All "tag" references renamed to "category"
- [ ] Default categories have emojis and colors
- [ ] Settings panel accessible and functional
- [ ] Markdown renders correctly and securely
- [ ] Status updates can be deleted
- [ ] All tests passing
- [ ] Zero data loss in migration

### Non-Functional

- [ ] <100ms markdown render time
- [ ] No XSS vulnerabilities
- [ ] Mobile responsive
- [ ] Backward compatible (1 release)
- [ ] Documentation complete

### User Experience

- [ ] Users understand "categories" terminology
- [ ] Visual scanning improved
- [ ] Settings easy to find
- [ ] Markdown improves documentation
- [ ] Delete prevents accidents (confirmation)

---

## Rollout Plan

### Pre-Deployment

1. ✅ Complete specifications
2. ⏳ Database migration testing
3. ⏳ Staging environment validation
4. ⏳ Production backup

### Deployment

1. Run database migrations
2. Deploy backend (with backward compatibility)
3. Deploy frontend
4. Verify all endpoints
5. Monitor for errors

### Post-Deployment

1. Update user documentation
2. Send changelog to users
3. Monitor adoption metrics
4. Collect feedback
5. Plan v3.0 (remove deprecated endpoints)

---

## Future Enhancements

### Short Term (Next 2-3 Months)

- WYSIWYG markdown editor
- Bulk delete operations
- Additional settings tabs

### Long Term (6+ Months)

- Nested categories
- Category-based workflows
- Soft delete with restore
- Advanced markdown features (diagrams, math)

---

## Resources

### Documentation

- [Implementation Plan](./plan.md) - Step-by-step guide
- [Task List](./tasks.md) - Detailed task breakdown
- [Specification](./spec.md) - Complete technical spec

### Related Specs

- [001-cockpit-core](../001-cockpit-core/) - Original implementation
- [002-enhancements-backups](../002-enhancements-backups/) - Tag reordering feature
- [003-test-coverage-completion](../003-test-coverage-completion/) - Testing standards

### External References

- [react-markdown](https://github.com/remarkjs/react-markdown) - Markdown rendering
- [remark-gfm](https://github.com/remarkjs/remark-gfm) - GitHub Flavored Markdown
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate) - Database migration guide

---

## Contact & Support

**Questions?** Review the detailed [specification](./spec.md) or [task list](./tasks.md).

**Issues?** Create a task in the project management system.

**Feedback?** All feedback welcome during planning phase.

---

## Changelog

### 2026-01-06 - Initial Specification

- Created plan, tasks, and spec documents
- Defined 5 major improvements
- Estimated 6-8 day timeline
- Identified 57 tasks across 8 phases

---

*End of README*
