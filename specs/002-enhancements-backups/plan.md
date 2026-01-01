# Implementation Plan: Database Backups & UI Enhancements

**Feature**: 002-enhancements-backups
**Created**: 2026-01-01
**Estimated Duration**: 8 days

---

## Overview

This implementation plan addresses six user stories across two main themes:
1. **Data Protection**: Automated GCP Cloud Storage backups
2. **UI/UX Improvements**: Compact cockpit, tag reordering, better sorting, auto-updating status history

The plan is structured to deliver value incrementally, with backup infrastructure first (critical for data safety), followed by UI enhancements that improve daily usability.

---

## Implementation Phases

### Phase 1: Backup Infrastructure (Days 1-2)
**Goal**: Establish automated daily database backups to GCP Cloud Storage

**Deliverables**:
- GCP Cloud Storage integration
- Automated pg_dump backup script
- Cron-based scheduling
- 30-day retention policy
- Error logging and retry logic

**Risk**: GCP authentication complexity
**Mitigation**: Test GCP credentials and permissions before full implementation

---

### Phase 2: Tag Reordering (Days 3-4)
**Goal**: Enable drag-and-drop tag reordering that affects cockpit group ordering

**Deliverables**:
- Database index for efficient tag ordering
- Backend API for tag reordering
- Frontend drag-and-drop UI
- Cockpit respects tag sortOrder

**Risk**: Drag-and-drop UX complexity
**Mitigation**: Use well-tested @dnd-kit library, implement clear visual feedback

---

### Phase 3: Cockpit UI Enhancements (Days 5-6)
**Goal**: Make cockpit more compact and merge panels to show 12-15 items at once

**Deliverables**:
- Unified header combining sorting, grouping, and actions
- Compact card styling (reduced padding/margins)
- Sorting works within tag groups
- Groups ordered by tag sortOrder

**Risk**: Responsive design breaking on mobile
**Mitigation**: Test on multiple screen sizes, maintain mobile-first approach

---

### Phase 4: Status History Auto-Update (Day 7)
**Goal**: Status history updates automatically when new status added

**Deliverables**:
- React Query cache invalidation on mutation
- Real-time UI update without page reload

**Risk**: Infinite re-render loops
**Mitigation**: Careful dependency management in React Query, thorough testing

---

### Phase 5: Testing & Deployment (Day 8)
**Goal**: Comprehensive testing and production deployment

**Deliverables**:
- Full test coverage (unit + integration)
- GCP setup documentation
- Deployment checklist
- Staging validation
- Production deployment

**Risk**: Unexpected production issues
**Mitigation**: Deploy to staging first, maintain rollback plan

---

## Technical Dependencies

### External Services
- Google Cloud Platform (GCP)
  - Cloud Storage bucket
  - Service account with Storage Admin role
  - JSON key file

### NPM Packages
**Backend**:
- `@google-cloud/storage@^7.7.0` - GCP Cloud Storage SDK
- `node-cron@^3.0.3` - Cron job scheduling

**Frontend**:
- `@dnd-kit/core@^6.1.0` - Drag-and-drop core
- `@dnd-kit/sortable@^8.0.0` - Sortable list utilities
- `@dnd-kit/utilities@^3.2.2` - Helper utilities

### System Dependencies
- `pg_dump` (available in postgres Docker image)
- `gzip` (available in Node.js base image)

---

## Database Changes

### Migration: Add Tag SortOrder Index

**File**: `backend/prisma/migrations/YYYYMMDDHHMMSS_add_tag_sortorder_index/migration.sql`

```sql
-- Add index for efficient tag ordering queries
CREATE INDEX "tags_project_id_sort_order_idx" ON "tags"("project_id", "sort_order");
```

**Impact**: Minimal, improves query performance for tag fetching
**Rollback**: Drop index if needed (non-breaking)

---

## Environment Configuration

### Required Environment Variables

**`.env` additions**:
```bash
# GCP Backup Configuration
GCP_PROJECT_ID=your-gcp-project-id
GCP_BUCKET_NAME=workstream-cockpit-backups
GCP_SERVICE_ACCOUNT_KEY_PATH=/app/config/gcp-service-account.json
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30

# Database for pg_dump
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=workstream_cockpit
```

### GCP Setup Checklist

1. Create GCP project (if not exists)
2. Enable Cloud Storage API
3. Create storage bucket: `workstream-cockpit-backups`
4. Create service account: `workstream-backup`
5. Grant service account `Storage Object Admin` role
6. Generate JSON key file
7. Place key file in `backend/config/gcp-service-account.json`
8. Add `backend/config/` to `.gitignore`
9. Mount key file in Docker Compose

---

## File Structure

### New Files

```
backend/
  src/
    services/
      backupService.ts          # Backup orchestration logic
  scripts/
    backup-database.ts          # Manual backup trigger script
    restore-database.ts         # Manual restore script (future)
  config/
    .gitkeep                    # Ensure directory exists
    gcp-service-account.json    # GCP credentials (gitignored)

frontend/
  src/
    components/
      TagManagement/
        DraggableTag.tsx        # Sortable tag component
        
docs/
  BACKUP_RESTORE.md             # Backup/restore documentation
```

### Modified Files

```
backend/
  package.json                  # Add backup dependencies
  src/
    server.ts                   # Initialize cron scheduler
    routes/
      tags.ts                   # Add reorder endpoint
    services/
      tagService.ts             # Add reorderTags function
  prisma/
    schema.prisma               # Add index (via migration)

frontend/
  package.json                  # Add drag-and-drop dependencies
  src/
    pages/
      Cockpit.tsx               # Unified header, compact styling, fixed sorting
      TagManagement.tsx         # Drag-and-drop reordering
      WorkstreamDetail.tsx      # Auto-update status history
    components/
      Workstream/
        WorkstreamCard.tsx      # Compact styling

docker-compose.yml              # Mount GCP key file, add env vars
.gitignore                      # Exclude backend/config/*.json
README.md                       # Document backup feature
```

---

## Testing Strategy

### Unit Tests (Backend)

**`backend/tests/unit/backupService.test.ts`**:
- Test backup filename generation
- Test GCP upload (mocked SDK)
- Test old backup cleanup logic
- Test error handling and retry

**`backend/tests/unit/tagService.test.ts`**:
- Test `reorderTags()` with valid IDs
- Test `reorderTags()` with invalid IDs (expect error)
- Test `reorderTags()` with unauthorized tags (expect error)
- Test `getTagsByProjectId()` returns ordered tags

### Unit Tests (Frontend)

**`frontend/src/pages/__tests__/Cockpit.test.tsx`**:
- Test grouped workstreams are sorted within groups
- Test group ordering matches tag sortOrder
- Test ungrouped view still sorts correctly
- Test compact UI renders with reduced spacing

**`frontend/src/pages/__tests__/TagManagement.test.tsx`**:
- Test drag-and-drop initiates correctly
- Test reorder mutation called with correct tag IDs
- Test visual feedback during drag

### Integration Tests

**`backend/tests/integration/tags.test.ts`**:
- POST /api/tags/reorder with valid data
- Verify tags updated in database
- GET /api/tags returns new order
- Test with unauthorized project (expect 404)

**End-to-End Flow**:
1. Create 3 tags: Project, Ongoing, Delegated
2. Create workstreams tagged with each
3. Reorder tags via drag-and-drop: Delegated, Project, Ongoing
4. Verify cockpit groups appear in new order
5. Verify sorting works within each group

### Manual Testing

**Backup System**:
- [ ] Manual backup trigger creates file
- [ ] File uploaded to GCP bucket
- [ ] File is compressed and timestamped
- [ ] Scheduled backup runs at 2 AM UTC
- [ ] Old backups deleted after 30 days
- [ ] Restore from backup succeeds

**Tag Reordering**:
- [ ] Drag handle visible on tag rows
- [ ] Drag shows visual feedback
- [ ] Drop updates order immediately
- [ ] Order persists on page reload
- [ ] Cockpit groups match tag order

**Cockpit UI**:
- [ ] 12-15 workstreams visible on 1920x1080
- [ ] Unified header fits on one line
- [ ] Sorting dropdown works
- [ ] Grouping dropdown works
- [ ] "New Workstream" button accessible
- [ ] Mobile layout doesn't break

**Status History**:
- [ ] New status appears without refresh
- [ ] Edited status updates immediately
- [ ] Timestamp shows "a few seconds ago"
- [ ] Latest status section also updates

---

## Deployment Sequence

### Pre-Deployment (Local)

1. **Setup GCP**:
   ```bash
   # Create bucket
   gsutil mb -p PROJECT_ID gs://workstream-cockpit-backups
   
   # Create service account
   gcloud iam service-accounts create workstream-backup
   
   # Grant permissions
   gsutil iam ch serviceAccount:workstream-backup@PROJECT_ID.iam.gserviceaccount.com:objectAdmin \
     gs://workstream-cockpit-backups
   
   # Generate key
   gcloud iam service-accounts keys create gcp-service-account.json \
     --iam-account=workstream-backup@PROJECT_ID.iam.gserviceaccount.com
   ```

2. **Local Testing**:
   ```bash
   # Copy key file
   cp gcp-service-account.json backend/config/
   
   # Update .env
   # Add GCP_* variables
   
   # Test backup
   cd backend
   npm run backup:manual
   
   # Verify in GCP console
   gsutil ls gs://workstream-cockpit-backups/
   ```

### Staging Deployment

1. **Update Environment**:
   - Add GCP environment variables to staging
   - Upload service account key to staging server

2. **Deploy Code**:
   ```bash
   git checkout 002-enhancements-backups
   docker-compose -f docker-compose.staging.yml build
   docker-compose -f docker-compose.staging.yml up -d
   ```

3. **Verify**:
   - Check backup runs successfully
   - Test tag reordering UI
   - Test cockpit compactness
   - Test status history auto-update

### Production Deployment

1. **Backup Current Database**:
   ```bash
   pg_dump workstream_cockpit > pre-deployment-backup.sql
   ```

2. **Deploy**:
   ```bash
   git checkout 002-enhancements-backups
   docker-compose pull
   docker-compose up -d
   ```

3. **Run Migration**:
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

4. **Verify**:
   - Check application health
   - Verify backup scheduled correctly
   - Test all user-facing features

5. **Monitor**:
   - Watch logs for backup execution
   - Monitor GCP bucket for new backups
   - Check error logs for issues

---

## Rollback Plan

### If Backup System Fails

**Immediate Action**:
```bash
# Disable backups
docker-compose exec backend sh -c 'echo "BACKUP_ENABLED=false" >> .env'
docker-compose restart backend
```

**Investigation**:
- Check GCP credentials validity
- Verify bucket permissions
- Review error logs
- Test manual backup

### If UI Issues Occur

**Frontend Rollback**:
```bash
git revert <commit-hash>
docker-compose build frontend
docker-compose up -d frontend
```

**Backend Tag API** (if needed):
```bash
# Frontend can work without reorder API
# Just remove drag-and-drop UI, keep alphabetical tag order
```

### If Database Migration Fails

**Rollback Migration**:
```bash
docker-compose exec backend npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

**Drop Index** (manual):
```sql
DROP INDEX IF EXISTS "tags_project_id_sort_order_idx";
```

---

## Monitoring & Alerts

### Metrics to Monitor

1. **Backup Success Rate**:
   - Track daily backup completion
   - Alert if backup fails 2 days in a row

2. **GCP Storage Usage**:
   - Monitor bucket size growth
   - Alert if approaching quota

3. **Application Performance**:
   - Cockpit page load time
   - Tag reorder API latency
   - React Query cache hit rate

### Log Queries

**Backup Success**:
```bash
docker-compose logs backend | grep "Backup completed successfully"
```

**Backup Failures**:
```bash
docker-compose logs backend | grep "ERROR.*backup"
```

**Tag Reordering**:
```bash
docker-compose logs backend | grep "PUT /api/tags/reorder"
```

---

## Documentation Updates

### Files to Update

1. **README.md**:
   - Add "Automated Backups" section
   - Document GCP setup requirements
   - List new environment variables

2. **DEVELOPMENT.md**:
   - Add local backup testing instructions
   - Document drag-and-drop development

3. **New: BACKUP_RESTORE.md**:
   - Detailed backup/restore procedures
   - GCP setup step-by-step
   - Troubleshooting guide

4. **.env.example**:
   - Add GCP_* variables with example values
   - Document backup configuration

---

## Risk Assessment

### High Risk Items

1. **GCP Authentication Issues**:
   - **Risk**: Service account permissions incorrect, causing backup failures
   - **Mitigation**: Test thoroughly in staging, document setup process
   - **Fallback**: Manual backups until resolved

2. **Drag-and-Drop Browser Compatibility**:
   - **Risk**: @dnd-kit may not work in older browsers
   - **Mitigation**: Test in Chrome, Firefox, Safari, Edge
   - **Fallback**: Provide up/down arrow buttons as alternative

### Medium Risk Items

1. **Compact UI Readability**:
   - **Risk**: Reduced spacing may hurt usability
   - **Mitigation**: User testing, A/B comparison
   - **Fallback**: Add user preference toggle

2. **Mobile Responsive Breakage**:
   - **Risk**: Desktop optimizations break mobile layout
   - **Mitigation**: Test on real devices, use responsive CSS
   - **Fallback**: Media queries to revert to normal spacing on mobile

### Low Risk Items

1. **Tag Reorder Performance**:
   - **Risk**: Database transaction may be slow with many tags
   - **Mitigation**: Tags typically <20 per user, transaction is small
   - **Fallback**: None needed

2. **Status History Auto-Update**:
   - **Risk**: React Query cache invalidation may cause re-renders
   - **Mitigation**: Use React.memo, optimize dependencies
   - **Fallback**: Manual refresh still works

---

## Success Criteria

### Phase 1 Success (Backups)
- [ ] Automated backup runs daily at 2 AM UTC
- [ ] Backup file appears in GCP bucket within 5 minutes
- [ ] Backup file is compressed (size <50% of raw dump)
- [ ] Backups older than 30 days are deleted
- [ ] Manual restore test succeeds

### Phase 2 Success (Tag Reordering)
- [ ] Drag-and-drop works smoothly (no lag, clear feedback)
- [ ] Tag order persists across browser sessions
- [ ] Cockpit groups appear in tag order
- [ ] API returns ordered tags consistently

### Phase 3 Success (Cockpit UI)
- [ ] 12-15 workstreams visible without scrolling (1920x1080)
- [ ] Sorting works within groups
- [ ] Unified header fits on one line
- [ ] Mobile layout remains functional

### Phase 4 Success (Status History)
- [ ] New status appears immediately after save
- [ ] No page reload required
- [ ] No console errors or warnings

### Overall Success
- [ ] All automated tests pass
- [ ] Manual testing checklist completed
- [ ] Documentation updated
- [ ] Staging deployment successful
- [ ] Production deployment successful
- [ ] Zero data loss incidents
- [ ] User can perform all workflows without issues

---

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Backup Infrastructure | 2 days | Day 1 | Day 2 |
| Phase 2: Tag Reordering | 2 days | Day 3 | Day 4 |
| Phase 3: Cockpit UI | 2 days | Day 5 | Day 6 |
| Phase 4: Status History | 1 day | Day 7 | Day 7 |
| Phase 5: Testing & Deployment | 1 day | Day 8 | Day 8 |
| **Total** | **8 days** | | |

---

## Resource Requirements

### Development Team
- 1 Full-stack Developer (all phases)

### Infrastructure
- GCP account with billing enabled
- Cloud Storage API enabled
- Service account with appropriate permissions

### Tools
- Docker & Docker Compose
- Node.js 18+
- PostgreSQL 15
- Modern browser for testing (Chrome, Firefox, Safari, Edge)

---

## Post-Deployment

### Week 1 Monitoring
- Check backup logs daily
- Monitor GCP storage usage
- Collect user feedback on UI changes
- Watch for error spikes

### Week 2+ Maintenance
- Review backup success rate
- Optimize backup schedule if needed
- Consider user preference for UI density
- Plan future enhancements based on feedback

---

## Future Considerations

1. **Backup Enhancements**:
   - Point-in-time recovery with WAL archiving
   - Encrypted backups
   - Email/Slack notifications
   - Backup restore UI in admin panel

2. **Tag Management**:
   - Tag analytics (usage stats)
   - Tag templates/presets
   - Tag descriptions

3. **Cockpit Features**:
   - Saved views (filter/sort presets)
   - Keyboard shortcuts
   - Multi-select bulk operations
   - Custom dashboard layouts

4. **Performance**:
   - Virtual scrolling for 50+ workstreams
   - Advanced search/filter
   - Client-side caching improvements
