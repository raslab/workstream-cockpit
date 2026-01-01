# Spec 002: Database Backups & UI Enhancements

**Status**: Ready for Implementation  
**Created**: 2026-01-01  
**Estimated Duration**: 8 days  
**Priority**: P1

---

## Overview

This specification addresses six critical improvements to the Workstream Cockpit system:

1. **Automated Database Backups** - Daily backups to GCP Cloud Storage with 30-day retention
2. **Unified Cockpit UI** - Merge panels for more compact view
3. **Tag Reordering** - Drag-and-drop tag management affecting cockpit group order
4. **Smart Sorting** - Sorting applies within tag groups, not just globally
5. **Compact Design** - Show 12-15 workstreams instead of 5-6
6. **Auto-Update Status** - Status history updates without page refresh

---

## Quick Links

- **[spec.md](./spec.md)** - Full technical specification with user stories, data models, API changes, and implementation details
- **[plan.md](./plan.md)** - Implementation plan with phases, dependencies, testing strategy, and deployment sequence
- **[tasks.md](./tasks.md)** - Detailed task breakdown with 35 actionable tasks, time estimates, and acceptance criteria
- **[checklists/requirements.md](./checklists/requirements.md)** - Requirements checklist mapping user needs to implementation

---

## User Stories Summary

### P1 - Must Have

1. **Automated Database Backups** - Daily GCP backups for data protection
2. **Unified Cockpit Panel** - Single compact header for better information density
3. **Compact Cockpit UI** - 12-15 visible workstreams instead of 5-6
4. **Sorting Within Groups** - Sort applies to each tag group independently

### P2 - Should Have

5. **Tag Reordering** - Drag-and-drop tag management
6. **Auto-Update Status History** - Real-time updates without page refresh

---

## Key Metrics

### Success Criteria
- ✅ 12-15 workstreams visible on desktop (vs current 5-6)
- ✅ Daily automated backups running 100% successfully
- ✅ Tags reorderable via drag-and-drop
- ✅ Cockpit groups match tag order
- ✅ Sorting works within each tag group
- ✅ Status updates appear without refresh

### Quality Gates
- Backend test coverage: >80%
- Frontend test coverage: >70%
- Backup completion time: <5 minutes
- Tag reorder API latency: <500ms
- Zero data loss incidents

---

## Technology Stack

### Backend
- **New Dependencies**:
  - `@google-cloud/storage@^7.7.0` - GCP Cloud Storage SDK
  - `node-cron@^3.0.3` - Cron job scheduling
- **Database**: PostgreSQL 15 with new index for tag ordering
- **Backup**: pg_dump + gzip

### Frontend
- **New Dependencies**:
  - `@dnd-kit/core@^6.1.0` - Drag-and-drop core
  - `@dnd-kit/sortable@^8.0.0` - Sortable lists
  - `@dnd-kit/utilities@^3.2.2` - DnD utilities
- **State Management**: React Query (existing, enhanced for auto-updates)

### Infrastructure
- **GCP Cloud Storage** - Backup storage
- **Docker Compose** - Container orchestration
- **Cron Scheduler** - Daily backup execution

---

## Implementation Phases

### Phase 1: Backup Infrastructure (Days 1-2)
- Setup GCP Cloud Storage integration
- Implement backup service with compression and upload
- Add cron scheduling for daily 2 AM UTC backups
- Implement 30-day retention policy

### Phase 2: Tag Reordering (Days 3-4)
- Add database index for efficient tag ordering
- Implement backend API for tag reordering
- Build drag-and-drop UI in tag management
- Connect cockpit to respect tag order

### Phase 3: Cockpit UI Enhancements (Days 5-6)
- Merge panels into unified compact header
- Apply compact styling to cards and groups
- Fix sorting to work within tag groups
- Ensure responsive behavior on mobile

### Phase 4: Status History Auto-Update (Day 7)
- Enhance React Query cache invalidation
- Implement auto-refresh for status history
- Add optimistic updates

### Phase 5: Testing & Deployment (Day 8)
- Comprehensive integration testing
- GCP production setup
- Staging deployment and validation
- Production deployment with monitoring

---

## Risk Assessment

### High Risk
- **GCP Authentication** - Mitigation: Detailed testing, clear documentation
- **Drag-and-Drop UX** - Mitigation: Use proven @dnd-kit library

### Medium Risk
- **Compact UI Readability** - Mitigation: User testing, responsive design
- **Mobile Layout** - Mitigation: Media queries, device testing

### Low Risk
- **Tag Reorder Performance** - Small transaction size, indexed queries
- **Status Auto-Update** - Standard React Query pattern

---

## Dependencies

### External Services
- Google Cloud Platform account with billing enabled
- Cloud Storage API enabled
- Service account with Storage Admin role

### Environment Variables
```bash
# GCP Backup Configuration
GCP_PROJECT_ID=your-gcp-project-id
GCP_BUCKET_NAME=workstream-cockpit-backups
GCP_SERVICE_ACCOUNT_KEY_PATH=/app/config/gcp-service-account.json
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
```

---

## Database Changes

### Migration: Add Tag SortOrder Index
```sql
CREATE INDEX "tags_project_id_sort_order_idx" 
ON "tags"("project_id", "sort_order");
```

**Impact**: Minimal, improves tag query performance  
**Rollback**: Drop index (non-breaking)

---

## API Changes

### New Endpoint: Tag Reordering
```
PUT /api/tags/reorder
Body: { "tagIds": ["uuid1", "uuid2", "uuid3"] }
Response: 200 OK with updated tags array
```

### Modified Endpoint: Get Tags
```
GET /api/tags
Response: Tags sorted by sortOrder ASC (previously unsorted)
```

---

## File Structure

### New Files
```
backend/
  src/services/backupService.ts
  scripts/backup-database.ts
  scripts/restore-database.ts
  config/gcp-service-account.json (gitignored)
  tests/unit/backupService.test.ts

docs/
  BACKUP_RESTORE.md

specs/
  002-enhancements-backups/
    spec.md
    plan.md
    tasks.md
    checklists/requirements.md
```

### Modified Files
```
backend/
  package.json (add backup dependencies)
  src/server.ts (add cron scheduler)
  src/routes/tags.ts (add reorder endpoint)
  src/services/tagService.ts (add reorderTags function)
  prisma/schema.prisma (add index via migration)

frontend/
  package.json (add dnd-kit dependencies)
  src/pages/Cockpit.tsx (unified header, compact styling, fixed sorting)
  src/pages/TagManagement.tsx (drag-and-drop)
  src/pages/WorkstreamDetail.tsx (auto-update)
  src/components/Workstream/WorkstreamCard.tsx (compact styling)

docker-compose.yml (mount GCP key, add env vars)
.gitignore (exclude GCP keys)
README.md (document backup feature)
```

---

## Testing Strategy

### Automated Tests
- **Backend Unit Tests**: backupService, tagService
- **Backend Integration Tests**: Tag reorder endpoint
- **Frontend Unit Tests**: Cockpit sorting/grouping logic
- **End-to-End Tests**: Tag reorder → cockpit group order

### Manual Tests
- Backup creation and GCP upload
- Drag-and-drop tag reordering
- Cockpit displays 12-15 items on desktop
- Sorting within groups
- Status history auto-update
- Mobile responsiveness

---

## Deployment Plan

### Pre-Deployment
1. Setup GCP production infrastructure
2. Create service account and bucket
3. Test backup in staging

### Deployment
1. Backup production database
2. Deploy code with Docker Compose
3. Run database migration (add index)
4. Verify health checks

### Post-Deployment
1. Monitor backup execution
2. Verify GCP bucket receives backups
3. Check error logs (target: zero critical errors)
4. Monitor for 7 days

---

## Rollback Plan

### Backup System
- Set `BACKUP_ENABLED=false` to disable
- Backups stop but data remains safe

### UI Changes
- Git revert frontend commits
- Rebuild and redeploy frontend
- Backend changes remain (backward compatible)

### Database Migration
- Drop index if needed (non-breaking)
- Migration is additive, no data changes

---

## Documentation

### User Documentation
- **README.md** - Updated with backup feature overview
- **BACKUP_RESTORE.md** - Detailed GCP setup and restore procedures

### Developer Documentation
- **DEVELOPMENT.md** - Local backup testing instructions
- **.env.example** - All new environment variables documented

### Deployment Documentation
- **Deployment checklist** in plan.md
- **Monitoring guide** for backup success

---

## Post-Implementation

### Week 1 Goals
- 7 consecutive successful backups
- Zero critical production errors
- User feedback on UI changes collected

### Month 1 Goals
- 30 successful backups with retention working
- Performance metrics stable
- User satisfaction maintained

### Future Enhancements
- Point-in-time recovery (WAL archiving)
- Backup encryption before upload
- Email/Slack notifications for backup failures
- Backup restore UI in admin panel
- Customizable UI density preference

---

## Questions & Answers

**Q: Why GCP instead of AWS S3?**  
A: User explicitly requested "GCP cloud storage"

**Q: Why full backups instead of incremental?**  
A: Simpler for Phase 1, sufficient for current data volume, easier restore process

**Q: Why @dnd-kit instead of react-beautiful-dnd?**  
A: @dnd-kit is more modern, better maintained, accessible, and has smaller bundle size

**Q: Why not WebSockets for auto-update?**  
A: React Query cache invalidation is simpler and sufficient for single-user app context

**Q: Why compact UI as default instead of user preference?**  
A: User explicitly requested compact as the standard; preference can be added later if needed

---

## Contact & Support

For questions about this specification:
- Review full spec: [spec.md](./spec.md)
- Check tasks: [tasks.md](./tasks.md)
- Implementation plan: [plan.md](./plan.md)

---

**Last Updated**: 2026-01-01  
**Next Review**: After Phase 1 completion (Day 2)
