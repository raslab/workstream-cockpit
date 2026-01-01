# Tasks: Database Backups & UI Enhancements

**Feature**: 002-enhancements-backups
**Created**: 2026-01-01

---

## Phase 1: Backup Infrastructure (Days 1-2)

### Task 1.1: Setup GCP Infrastructure
**Estimated Time**: 2 hours
**Priority**: P1

**Steps**:
- [ ] Create GCP Cloud Storage bucket: `workstream-cockpit-backups`
- [ ] Create service account: `workstream-backup`
- [ ] Grant `Storage Object Admin` role to service account
- [ ] Generate JSON key file
- [ ] Test bucket access with service account
- [ ] Document GCP setup process

**Acceptance Criteria**:
- Service account can write to bucket
- JSON key file downloaded and secured
- Documentation complete

**Dependencies**: GCP account with billing enabled

---

### Task 1.2: Implement Backup Service
**Estimated Time**: 4 hours
**Priority**: P1

**Steps**:
- [ ] Install `@google-cloud/storage` dependency
- [ ] Create `backend/src/services/backupService.ts`
- [ ] Implement `createBackup()` function:
  - Generate timestamp filename
  - Execute `pg_dump` command
  - Compress with gzip
  - Upload to GCP bucket
  - Delete local temp file
- [ ] Implement `cleanupOldBackups()` function:
  - List backups in GCP bucket
  - Calculate cutoff date (30 days ago)
  - Delete backups older than cutoff
- [ ] Implement error handling and retry logic (3 attempts)
- [ ] Add comprehensive logging

**Acceptance Criteria**:
- Backup creates compressed SQL dump
- Backup uploads to GCP successfully
- Old backups deleted automatically
- Errors logged with details
- Retry logic works for transient failures

**Dependencies**: Task 1.1 complete

**Files Changed**:
- `backend/package.json`
- `backend/src/services/backupService.ts` (new)

---

### Task 1.3: Create Backup Scripts
**Estimated Time**: 2 hours
**Priority**: P1

**Steps**:
- [ ] Create `backend/scripts/backup-database.ts`
- [ ] Import and call `backupService.createBackup()`
- [ ] Add CLI argument parsing (optional: --force, --verbose)
- [ ] Add npm script: `"backup:manual": "ts-node scripts/backup-database.ts"`
- [ ] Test manual backup execution
- [ ] Create `backend/scripts/restore-database.ts` (basic version)
- [ ] Add npm script: `"restore": "ts-node scripts/restore-database.ts"`

**Acceptance Criteria**:
- `npm run backup:manual` creates backup successfully
- Script outputs progress information
- Exit codes correct (0 for success, 1 for error)

**Dependencies**: Task 1.2 complete

**Files Changed**:
- `backend/scripts/backup-database.ts` (new)
- `backend/scripts/restore-database.ts` (new)
- `backend/package.json`

---

### Task 1.4: Add Cron Scheduler
**Estimated Time**: 3 hours
**Priority**: P1

**Steps**:
- [ ] Install `node-cron` dependency
- [ ] Modify `backend/src/server.ts`:
  - Import `node-cron` and `backupService`
  - Check `BACKUP_ENABLED` environment variable
  - Schedule cron job with `BACKUP_SCHEDULE` (default: `0 2 * * *`)
  - Add startup log message
- [ ] Test cron scheduling (change to `* * * * *` for 1-minute testing)
- [ ] Verify backup runs automatically
- [ ] Restore schedule to `0 2 * * *`

**Acceptance Criteria**:
- Cron job schedules correctly on server startup
- Backup runs at scheduled time
- Can be disabled via environment variable
- Logs show scheduled backup execution

**Dependencies**: Task 1.2 complete

**Files Changed**:
- `backend/package.json`
- `backend/src/server.ts`

---

### Task 1.5: Environment Configuration
**Estimated Time**: 1 hour
**Priority**: P1

**Steps**:
- [ ] Add GCP environment variables to `.env.example`:
  ```
  GCP_PROJECT_ID=your-gcp-project-id
  GCP_BUCKET_NAME=workstream-cockpit-backups
  GCP_SERVICE_ACCOUNT_KEY_PATH=/app/config/gcp-service-account.json
  BACKUP_ENABLED=true
  BACKUP_SCHEDULE=0 2 * * *
  BACKUP_RETENTION_DAYS=30
  ```
- [ ] Update `docker-compose.yml`:
  - Add volume mount for GCP key file
  - Add environment variables
- [ ] Update `.gitignore`:
  - Add `backend/config/*.json`
  - Add `backend/config/gcp-service-account.json`
- [ ] Create `backend/config/.gitkeep`
- [ ] Copy GCP key file to `backend/config/gcp-service-account.json`

**Acceptance Criteria**:
- Docker container can access GCP key file
- Environment variables passed correctly
- Key file not committed to git

**Dependencies**: Task 1.1 complete

**Files Changed**:
- `.env.example`
- `docker-compose.yml`
- `.gitignore`
- `backend/config/.gitkeep` (new)

---

### Task 1.6: Backup Tests
**Estimated Time**: 3 hours
**Priority**: P2

**Steps**:
- [ ] Create `backend/tests/unit/backupService.test.ts`
- [ ] Mock `@google-cloud/storage` SDK
- [ ] Test `createBackup()`:
  - Test successful backup
  - Test GCP upload failure (retry logic)
  - Test pg_dump failure
  - Test filename generation
- [ ] Test `cleanupOldBackups()`:
  - Test with no old backups
  - Test with multiple old backups
  - Test with mixed old/new backups
- [ ] Test error handling
- [ ] Run tests: `npm test`

**Acceptance Criteria**:
- All tests pass
- Code coverage >80% for backupService.ts
- Edge cases covered

**Dependencies**: Task 1.2 complete

**Files Changed**:
- `backend/tests/unit/backupService.test.ts` (new)

---

### Task 1.7: Documentation - Backups
**Estimated Time**: 2 hours
**Priority**: P2

**Steps**:
- [ ] Create `docs/BACKUP_RESTORE.md`
- [ ] Document GCP setup procedure (step-by-step)
- [ ] Document backup configuration
- [ ] Document manual backup process
- [ ] Document restore process
- [ ] Add troubleshooting section
- [ ] Update `README.md`:
  - Add "Automated Backups" section
  - Link to BACKUP_RESTORE.md
  - List GCP environment variables

**Acceptance Criteria**:
- Documentation is clear and actionable
- Screenshots included for GCP setup
- Examples provided for common tasks

**Dependencies**: Task 1.4 complete

**Files Changed**:
- `docs/BACKUP_RESTORE.md` (new)
- `README.md`

---

## Phase 2: Tag Reordering (Days 3-4)

### Task 2.1: Database Migration
**Estimated Time**: 1 hour
**Priority**: P1

**Steps**:
- [ ] Create Prisma migration for tag sortOrder index:
  ```bash
  npx prisma migrate dev --name add_tag_sortorder_index
  ```
- [ ] Verify migration SQL:
  ```sql
  CREATE INDEX "tags_project_id_sort_order_idx" ON "tags"("project_id", "sort_order");
  ```
- [ ] Apply migration locally: `npx prisma migrate deploy`
- [ ] Verify index created in PostgreSQL

**Acceptance Criteria**:
- Migration file created
- Index exists in database
- No data loss or corruption

**Dependencies**: None

**Files Changed**:
- `backend/prisma/migrations/YYYYMMDDHHMMSS_add_tag_sortorder_index/migration.sql` (new)

---

### Task 2.2: Backend - Tag Reorder Service
**Estimated Time**: 3 hours
**Priority**: P1

**Steps**:
- [ ] Open `backend/src/services/tagService.ts`
- [ ] Add `reorderTags()` function:
  - Accept `projectId` and `tagIds` array
  - Validate all tagIds exist and belong to project
  - Use transaction to update sortOrder
  - Return updated tags in order
- [ ] Modify `getTagsByProjectId()`:
  - Add `orderBy: { sortOrder: 'asc' }`
- [ ] Add error handling for:
  - Invalid tag IDs
  - Mismatched tag count
  - Unauthorized access

**Acceptance Criteria**:
- Tags can be reordered via service function
- Tags returned in sortOrder
- Transaction ensures atomicity
- Errors thrown for invalid inputs

**Dependencies**: Task 2.1 complete

**Files Changed**:
- `backend/src/services/tagService.ts`

---

### Task 2.3: Backend - Tag Reorder API
**Estimated Time**: 2 hours
**Priority**: P1

**Steps**:
- [ ] Open `backend/src/routes/tags.ts`
- [ ] Add `PUT /api/tags/reorder` endpoint:
  - Require authentication (already have middleware)
  - Extract `tagIds` from request body
  - Validate `tagIds` is array of strings
  - Get user's projectId
  - Call `reorderTags(projectId, tagIds)`
  - Return updated tags
- [ ] Add input validation
- [ ] Add error responses (400, 404, 500)

**Acceptance Criteria**:
- Endpoint accessible at `PUT /api/tags/reorder`
- Returns 200 with updated tags on success
- Returns appropriate error codes
- Only user's own tags can be reordered

**Dependencies**: Task 2.2 complete

**Files Changed**:
- `backend/src/routes/tags.ts`

---

### Task 2.4: Backend Tests - Tag Reordering
**Estimated Time**: 3 hours
**Priority**: P2

**Steps**:
- [ ] Update `backend/tests/unit/tagService.test.ts`:
  - Test `reorderTags()` with valid IDs
  - Test with invalid IDs (expect error)
  - Test with partial tag list (expect error)
  - Test with tags from different project (expect error)
- [ ] Create `backend/tests/integration/tags.test.ts` (if not exists)
- [ ] Add reorder endpoint tests:
  - Test successful reorder
  - Test with missing tagIds (400)
  - Test with invalid tagIds (404)
  - Test unauthorized access
- [ ] Run tests: `npm test`

**Acceptance Criteria**:
- All tests pass
- Edge cases covered
- Code coverage maintained

**Dependencies**: Task 2.3 complete

**Files Changed**:
- `backend/tests/unit/tagService.test.ts`
- `backend/tests/integration/tags.test.ts`

---

### Task 2.5: Frontend - Drag-and-Drop Dependencies
**Estimated Time**: 1 hour
**Priority**: P1

**Steps**:
- [ ] Install `@dnd-kit` packages:
  ```bash
  npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
  ```
- [ ] Update `frontend/package.json`
- [ ] Verify build still works: `npm run build`

**Acceptance Criteria**:
- Packages installed without conflicts
- Build succeeds
- No type errors

**Dependencies**: None

**Files Changed**:
- `frontend/package.json`

---

### Task 2.6: Frontend - Draggable Tag Component
**Estimated Time**: 4 hours
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/pages/TagManagement.tsx`
- [ ] Import dnd-kit components:
  ```tsx
  import { DndContext, closestCenter, PointerSensor, useSensor } from '@dnd-kit/core';
  import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
  ```
- [ ] Create `SortableTag` component using `useSortable` hook
- [ ] Add drag handle icon (⋮⋮ or ≡)
- [ ] Style dragging state (opacity, transform)
- [ ] Wrap tag list in `<DndContext>` and `<SortableContext>`
- [ ] Implement `handleDragEnd()`:
  - Calculate new order with `arrayMove()`
  - Call reorder mutation
- [ ] Add visual feedback during drag

**Acceptance Criteria**:
- Tags can be dragged and dropped
- Visual feedback during drag (opacity, cursor)
- Drop shows preview of new position
- Drag handle clearly visible

**Dependencies**: Task 2.5 complete

**Files Changed**:
- `frontend/src/pages/TagManagement.tsx`

---

### Task 2.7: Frontend - Reorder API Integration
**Estimated Time**: 2 hours
**Priority**: P1

**Steps**:
- [ ] In `TagManagement.tsx`, add reorder mutation:
  ```tsx
  const reorderMutation = useMutation({
    mutationFn: async (tagIds: string[]) => {
      return await apiClient.put('/api/tags/reorder', { tagIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
    },
  });
  ```
- [ ] Call mutation in `handleDragEnd()`
- [ ] Add optimistic update (optional)
- [ ] Show loading state during mutation
- [ ] Handle errors (toast notification)

**Acceptance Criteria**:
- Mutation called with correct tag IDs
- Tags refetch on success
- Workstreams refetch (for cockpit update)
- Error handling works

**Dependencies**: Task 2.6 complete

**Files Changed**:
- `frontend/src/pages/TagManagement.tsx`

---

### Task 2.8: Frontend - Cockpit Group Ordering
**Estimated Time**: 2 hours
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/pages/Cockpit.tsx`
- [ ] Modify `groupedWorkstreams` memo:
  - Add `sortOrder` property to each group
  - Sort groups by `sortOrder` (lowest first)
  - Keep "Untagged" at end (sortOrder: 999999)
- [ ] Update group rendering to respect new order
- [ ] Test with reordered tags

**Acceptance Criteria**:
- Groups appear in tag sortOrder
- Reordering tags in tag management reorders cockpit groups
- Untagged always appears last

**Dependencies**: Task 2.7 complete

**Files Changed**:
- `frontend/src/pages/Cockpit.tsx`

---

## Phase 3: Cockpit UI Enhancements (Days 5-6)

### Task 3.1: Unified Cockpit Header
**Estimated Time**: 2 hours
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/pages/Cockpit.tsx`
- [ ] Merge title section and filter panel into single header:
  ```tsx
  <div className="mb-4 flex items-center justify-between border-b pb-3">
    <h2 className="text-xl font-bold">Cockpit</h2>
    <div className="flex items-center gap-3">
      <select className="text-sm">Sort</select>
      <select className="text-sm">Group</select>
      <button className="text-sm">New</button>
    </div>
  </div>
  ```
- [ ] Remove old separate panel
- [ ] Adjust spacing and sizing
- [ ] Test responsive wrapping on mobile

**Acceptance Criteria**:
- Single compact header
- All controls accessible
- Fits on one line on desktop
- Wraps gracefully on mobile

**Dependencies**: None

**Files Changed**:
- `frontend/src/pages/Cockpit.tsx`

---

### Task 3.2: Compact Workstream Cards
**Estimated Time**: 3 hours
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/components/Workstream/WorkstreamCard.tsx`
- [ ] Reduce spacing:
  - Card padding: `p-4` → `p-3`
  - Card margins: `space-y-4` → `space-y-2`
  - Title size: `text-lg` → `text-base`
  - Tag emoji: `h-6 w-6` → `h-5 w-5`
  - Status margin: `mt-2` → `mt-1`
  - Line heights: `leading-relaxed` → `leading-snug`
- [ ] Maintain font sizes (per user requirement)
- [ ] Test with 15+ workstreams
- [ ] Measure viewport coverage (target: 12-15 visible)

**Acceptance Criteria**:
- 12-15 workstreams visible on 1920x1080
- Text remains readable
- Interactive elements remain clickable
- No visual regressions

**Dependencies**: None

**Files Changed**:
- `frontend/src/components/Workstream/WorkstreamCard.tsx`

---

### Task 3.3: Compact Group Headers
**Estimated Time**: 1 hour
**Priority**: P1

**Steps**:
- [ ] In `Cockpit.tsx`, reduce group spacing:
  - Group margin: `space-y-6` → `space-y-4`
  - Group header margin: `mb-3` → `mb-2`
  - Group header text: `text-lg` → `text-base`
- [ ] Adjust tag emoji in group header: `h-6 w-6` → `h-5 w-5`
- [ ] Test visual hierarchy

**Acceptance Criteria**:
- Groups visually distinct but compact
- Group headers clearly separate groups
- Emoji badges sized consistently

**Dependencies**: None

**Files Changed**:
- `frontend/src/pages/Cockpit.tsx`

---

### Task 3.4: Responsive Adjustments
**Estimated Time**: 2 hours
**Priority**: P2

**Steps**:
- [ ] Add media query for mobile (< 768px):
  - Restore normal spacing on mobile
  - Increase touch target sizes
  - Ensure buttons remain tappable
- [ ] Test on:
  - Desktop (1920x1080)
  - Laptop (1366x768)
  - Tablet (768x1024)
  - Mobile (375x667)
- [ ] Fix any layout breaking

**Acceptance Criteria**:
- Compact on desktop
- Normal spacing on mobile/tablet
- No layout breaks on any screen size

**Dependencies**: Task 3.2 complete

**Files Changed**:
- `frontend/src/components/Workstream/WorkstreamCard.tsx`
- `frontend/src/pages/Cockpit.tsx`

---

### Task 3.5: Fix Sorting Within Groups
**Estimated Time**: 3 hours
**Priority**: P1

**Steps**:
- [ ] Open `frontend/src/pages/Cockpit.tsx`
- [ ] Refactor sorting logic:
  - Extract sort comparator to separate function
  - Apply sorting AFTER grouping, not before
  - Sort workstreams within each group
- [ ] Update `groupedWorkstreams` memo:
  ```tsx
  const result = Array.from(groups.entries()).map(([key, wsList]) => ({
    key,
    workstreams: wsList.sort(getSortComparator(sortBy)),
  }));
  ```
- [ ] Test all sort options with grouping enabled:
  - Last Updated
  - Created Date
  - Name
- [ ] Verify ungrouped sorting still works

**Acceptance Criteria**:
- Sorting applies within each group
- All sort options work correctly
- Ungrouped view unaffected
- No performance degradation

**Dependencies**: None

**Files Changed**:
- `frontend/src/pages/Cockpit.tsx`

---

### Task 3.6: UI Tests
**Estimated Time**: 2 hours
**Priority**: P2

**Steps**:
- [ ] Update `frontend/src/pages/__tests__/Cockpit.test.tsx`
- [ ] Test grouped + sorted workstreams
- [ ] Test group ordering by tag sortOrder
- [ ] Test ungrouped sorting
- [ ] Test compact styling (snapshot test)
- [ ] Run tests: `npm test`

**Acceptance Criteria**:
- All tests pass
- Sorting logic covered
- Grouping logic covered

**Dependencies**: Task 3.5 complete

**Files Changed**:
- `frontend/src/pages/__tests__/Cockpit.test.tsx`

---

## Phase 4: Status History Auto-Update (Day 7)

### Task 4.1: Status Update Mutation Enhancement
**Estimated Time**: 2 hours
**Priority**: P2

**Steps**:
- [ ] Open `frontend/src/pages/WorkstreamDetail.tsx`
- [ ] Find status update mutation
- [ ] Add cache invalidations:
  ```tsx
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['status-updates', workstreamId] });
    queryClient.invalidateQueries({ queryKey: ['workstream', workstreamId] });
    queryClient.invalidateQueries({ queryKey: ['workstreams'] });
  }
  ```
- [ ] Test that history refetches after adding status
- [ ] Test that latest status section updates
- [ ] Test that cockpit view updates

**Acceptance Criteria**:
- New status appears in history without refresh
- Latest status section updates
- Cockpit shows new update time
- No infinite re-renders

**Dependencies**: None

**Files Changed**:
- `frontend/src/pages/WorkstreamDetail.tsx`

---

### Task 4.2: Edit Status Mutation Enhancement
**Estimated Time**: 1 hour
**Priority**: P2

**Steps**:
- [ ] In `WorkstreamDetail.tsx`, find edit status mutation
- [ ] Add same cache invalidations as Task 4.1
- [ ] Test that edited status updates in list
- [ ] Test that "edited" indicator appears

**Acceptance Criteria**:
- Edited status updates without refresh
- Updated timestamp shown
- All views updated

**Dependencies**: Task 4.1 complete

**Files Changed**:
- `frontend/src/pages/WorkstreamDetail.tsx`

---

### Task 4.3: Status Dialog Optimization
**Estimated Time**: 1 hour
**Priority**: P3

**Steps**:
- [ ] Verify dialog closes after successful save
- [ ] Verify loading state during mutation
- [ ] Add optimistic update (optional):
  - Immediately add status to list
  - Roll back if mutation fails
- [ ] Test user experience flow

**Acceptance Criteria**:
- Dialog closes on success
- Loading state shown during save
- User sees immediate feedback

**Dependencies**: Task 4.1 complete

**Files Changed**:
- `frontend/src/components/StatusUpdate/StatusUpdateDialog.tsx`

---

## Phase 5: Testing & Deployment (Day 8)

### Task 5.1: Integration Testing
**Estimated Time**: 3 hours
**Priority**: P1

**Steps**:
- [ ] Run all backend tests: `cd backend && npm test`
- [ ] Run all frontend tests: `cd frontend && npm test`
- [ ] Manual end-to-end test:
  1. Create 3 tags
  2. Create 15 workstreams across tags
  3. Reorder tags
  4. Verify cockpit groups reordered
  5. Test sorting within groups
  6. Add status update
  7. Verify auto-update
  8. Trigger manual backup
  9. Verify backup in GCP
- [ ] Fix any failing tests
- [ ] Document test results

**Acceptance Criteria**:
- All automated tests pass
- Manual test checklist completed
- No regressions found

**Dependencies**: All previous tasks complete

**Files Changed**: None (test results documented)

---

### Task 5.2: GCP Production Setup
**Estimated Time**: 2 hours
**Priority**: P1

**Steps**:
- [ ] Create production GCP bucket
- [ ] Create production service account
- [ ] Grant permissions
- [ ] Generate production key file
- [ ] Test production backup manually
- [ ] Verify bucket access and permissions

**Acceptance Criteria**:
- Production bucket created
- Service account has correct permissions
- Test backup succeeds

**Dependencies**: Task 1.1 (dev setup) complete

**Files Changed**: None (infrastructure)

---

### Task 5.3: Staging Deployment
**Estimated Time**: 2 hours
**Priority**: P1

**Steps**:
- [ ] Update staging environment variables
- [ ] Upload GCP service account key to staging
- [ ] Build and deploy:
  ```bash
  git checkout 002-enhancements-backups
  docker-compose -f docker-compose.staging.yml build
  docker-compose -f docker-compose.staging.yml up -d
  ```
- [ ] Run database migration:
  ```bash
  docker-compose exec backend npx prisma migrate deploy
  ```
- [ ] Smoke test:
  - Login works
  - Tag reordering works
  - Cockpit displays correctly
  - Status update works
  - Backup runs successfully
- [ ] Monitor logs for errors

**Acceptance Criteria**:
- Staging deployment successful
- All features work in staging
- No errors in logs
- Backup runs at scheduled time

**Dependencies**: Task 5.2 complete

**Files Changed**: None (deployment)

---

### Task 5.4: Production Deployment
**Estimated Time**: 2 hours
**Priority**: P1

**Steps**:
- [ ] Backup current production database:
  ```bash
  pg_dump workstream_cockpit > pre-deployment-backup-$(date +%Y%m%d).sql
  ```
- [ ] Update production environment variables
- [ ] Upload GCP service account key to production
- [ ] Deploy:
  ```bash
  git checkout 002-enhancements-backups
  docker-compose pull
  docker-compose up -d
  ```
- [ ] Run migration:
  ```bash
  docker-compose exec backend npx prisma migrate deploy
  ```
- [ ] Verify deployment:
  - Application healthy
  - Features work
  - Backup scheduled correctly
- [ ] Monitor for 24 hours

**Acceptance Criteria**:
- Production deployment successful
- Zero downtime
- All features working
- Backups running as scheduled
- No errors in production logs

**Dependencies**: Task 5.3 complete

**Files Changed**: None (deployment)

---

### Task 5.5: Documentation Finalization
**Estimated Time**: 2 hours
**Priority**: P2

**Steps**:
- [ ] Review and update `README.md`:
  - Add automated backups section
  - Document new UI features
  - Update screenshots if needed
- [ ] Review `docs/BACKUP_RESTORE.md`
- [ ] Add deployment notes to `docs/DEVELOPMENT.md`
- [ ] Create release notes:
  - List all new features
  - Document breaking changes (none expected)
  - Provide upgrade instructions
- [ ] Update changelog

**Acceptance Criteria**:
- Documentation complete and accurate
- Release notes published
- Screenshots updated

**Dependencies**: Task 5.4 complete

**Files Changed**:
- `README.md`
- `docs/BACKUP_RESTORE.md`
- `docs/DEVELOPMENT.md`
- `CHANGELOG.md` (if exists)

---

### Task 5.6: Post-Deployment Monitoring
**Estimated Time**: Ongoing (first week)
**Priority**: P1

**Steps**:
- [ ] Monitor backup logs daily:
  ```bash
  docker-compose logs backend | grep backup
  ```
- [ ] Verify GCP bucket receives daily backups
- [ ] Check application error logs
- [ ] Monitor performance metrics:
  - Page load times
  - API response times
  - Database query performance
- [ ] Collect user feedback on UI changes
- [ ] Create issues for any bugs found

**Acceptance Criteria**:
- Backups running successfully for 7 days
- No critical errors
- User feedback collected
- Performance metrics stable

**Dependencies**: Task 5.4 complete

**Files Changed**: None (monitoring)

---

## Summary

### Total Tasks: 35
- **Phase 1 (Backup)**: 7 tasks
- **Phase 2 (Tag Reordering)**: 8 tasks
- **Phase 3 (Cockpit UI)**: 6 tasks
- **Phase 4 (Status History)**: 3 tasks
- **Phase 5 (Testing/Deployment)**: 6 tasks
- **Ongoing (Monitoring)**: 1 task

### Priority Breakdown
- **P1 (Must Have)**: 24 tasks
- **P2 (Should Have)**: 9 tasks
- **P3 (Nice to Have)**: 1 task

### Estimated Total Time
- **Development**: ~50 hours (~6-7 days)
- **Testing**: ~8 hours (1 day)
- **Deployment**: ~6 hours
- **Total**: ~64 hours (8 working days)

---

## Dependencies Graph

```
Phase 1 (Backup):
1.1 GCP Setup
  └─> 1.2 Backup Service
        └─> 1.3 Backup Scripts
        └─> 1.4 Cron Scheduler
        └─> 1.6 Tests
  └─> 1.5 Environment Config
  └─> 1.7 Documentation

Phase 2 (Tags):
2.1 DB Migration
  └─> 2.2 Tag Service
        └─> 2.3 API Endpoint
              └─> 2.4 Tests
2.5 Frontend Dependencies
  └─> 2.6 Draggable Component
        └─> 2.7 API Integration
              └─> 2.8 Cockpit Integration

Phase 3 (Cockpit):
3.1 Unified Header (independent)
3.2 Compact Cards (independent)
  └─> 3.4 Responsive Adjustments
3.3 Compact Groups (independent)
3.5 Fix Sorting (independent)
  └─> 3.6 Tests

Phase 4 (Status):
4.1 Mutation Enhancement
  └─> 4.2 Edit Enhancement
        └─> 4.3 Dialog Optimization

Phase 5 (Deploy):
5.1 Integration Testing (depends on all)
5.2 GCP Production Setup (depends on 1.1)
  └─> 5.3 Staging Deployment
        └─> 5.4 Production Deployment
              └─> 5.5 Documentation
              └─> 5.6 Monitoring
```

---

## Risk Mitigation

### High-Risk Tasks
1. **Task 1.2 (Backup Service)**: Complex GCP integration
   - Mitigation: Thorough testing, retry logic, detailed logging
   
2. **Task 2.6 (Drag-and-Drop)**: Browser compatibility issues
   - Mitigation: Use well-tested library (@dnd-kit), cross-browser testing

3. **Task 5.4 (Production Deployment)**: Potential downtime
   - Mitigation: Pre-deployment backup, rollback plan, staging validation

### Medium-Risk Tasks
1. **Task 3.2 (Compact Cards)**: May hurt readability
   - Mitigation: User testing, maintain minimum spacing standards

2. **Task 4.1 (Auto-Update)**: Potential infinite re-renders
   - Mitigation: Careful React Query configuration, performance monitoring

---

## Checklist

### Pre-Development
- [ ] GCP account setup
- [ ] Service account created
- [ ] Storage bucket created
- [ ] Development environment configured

### Development Complete
- [ ] All P1 tasks completed
- [ ] All P2 tasks completed
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated

### Pre-Deployment
- [ ] Staging tested successfully
- [ ] Production backup created
- [ ] Environment variables configured
- [ ] Team notified of deployment

### Post-Deployment
- [ ] Production verified healthy
- [ ] Backups running
- [ ] Monitoring in place
- [ ] User feedback collected
