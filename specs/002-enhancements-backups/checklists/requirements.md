# Requirements Checklist: Database Backups & UI Enhancements

**Feature**: 002-enhancements-backups
**Created**: 2026-01-01

This checklist maps user requirements to implementation tasks and acceptance criteria.

---

## User Requirement 1: Database Backups to GCP

### Original Request
> "I need to add some functionallity to make backups of database. let's say - full database backup once per day to a GCP cloud storage."

### Implementation Tasks
- [ ] Task 1.1: Setup GCP Infrastructure
- [ ] Task 1.2: Implement Backup Service
- [ ] Task 1.3: Create Backup Scripts
- [ ] Task 1.4: Add Cron Scheduler
- [ ] Task 1.5: Environment Configuration
- [ ] Task 1.6: Backup Tests
- [ ] Task 1.7: Documentation - Backups

### Acceptance Criteria
- [ ] Automated backup runs daily at 2 AM UTC
- [ ] Backup file uploaded to GCP Cloud Storage
- [ ] Backup file is compressed (gzip)
- [ ] Backup file named with timestamp (e.g., `workstream-backup-2026-01-01-020000.sql.gz`)
- [ ] Backups older than 30 days automatically deleted
- [ ] Backup failures logged with details
- [ ] Manual backup can be triggered via npm script
- [ ] Database can be restored from backup file

### Testing
- [ ] Manual backup succeeds: `npm run backup:manual`
- [ ] Backup file appears in GCP bucket
- [ ] Backup file can be downloaded
- [ ] Database restore from backup succeeds
- [ ] Scheduled backup runs at 2 AM UTC
- [ ] Old backups cleaned up after 30 days

---

## User Requirement 2: Merge Panels in Cockpit View

### Original Request
> "need in UI merge 'Active Workstreams' panel and storing/grouping panel into one united pannel to make view more compact"

### Implementation Tasks
- [ ] Task 3.1: Unified Cockpit Header

### Acceptance Criteria
- [ ] Single compact header replaces two separate sections
- [ ] Header contains: Title, Sort dropdown, Group dropdown, New Workstream button
- [ ] All controls fit on one row on desktop
- [ ] Controls wrap responsively on mobile
- [ ] Functionality unchanged (sorting, grouping, creating still work)

### Testing
- [ ] Cockpit displays unified header
- [ ] Sorting dropdown functional
- [ ] Grouping dropdown functional
- [ ] "New Workstream" button functional
- [ ] Mobile layout wraps gracefully
- [ ] Visual hierarchy clear

---

## User Requirement 3: Tag Reordering Affects Cockpit Grouping

### Original Request
> "for tags I need ability to re-arrange they in tags view. and this arranging have to make effect when grouping at the cockpit view - if grouping applied, top tags in tags view have to be rendered at top in cockpit view."

### Implementation Tasks
- [ ] Task 2.1: Database Migration (sortOrder index)
- [ ] Task 2.2: Backend - Tag Reorder Service
- [ ] Task 2.3: Backend - Tag Reorder API
- [ ] Task 2.4: Backend Tests - Tag Reordering
- [ ] Task 2.5: Frontend - Drag-and-Drop Dependencies
- [ ] Task 2.6: Frontend - Draggable Tag Component
- [ ] Task 2.7: Frontend - Reorder API Integration
- [ ] Task 2.8: Frontend - Cockpit Group Ordering

### Acceptance Criteria
- [ ] Tags can be reordered via drag-and-drop in Tag Management
- [ ] Drag handle visible on each tag row
- [ ] Visual feedback during drag (opacity, cursor change)
- [ ] Drop shows preview of new position
- [ ] Tag order persists across page reloads
- [ ] Cockpit groups appear in same order as tags in Tag Management
- [ ] Top tag in Tag Management = top group in Cockpit (when grouping enabled)
- [ ] "Untagged" group always appears last

### Testing
- [ ] Create 3 tags: A, B, C
- [ ] Drag tags to order: C, A, B
- [ ] Tag order saved to database
- [ ] Refresh page, order persists
- [ ] Go to Cockpit, enable "Group by Tag"
- [ ] Verify groups appear as: C, A, B, Untagged
- [ ] Reorder tags again, cockpit updates accordingly

---

## User Requirement 4: Sorting Within Tag Groups

### Original Request
> "if grouping by tags activated - sorting applying only for rifts group, have to be applied for every group."

### Implementation Tasks
- [ ] Task 3.5: Fix Sorting Within Groups
- [ ] Task 3.6: UI Tests

### Acceptance Criteria
- [ ] When grouping is enabled, sorting applies within each group
- [ ] "Sort by Last Updated" sorts workstreams within each tag group
- [ ] "Sort by Name" alphabetically sorts workstreams within each tag group
- [ ] "Sort by Created Date" sorts workstreams by creation within each tag group
- [ ] Sorting works independently in each group
- [ ] Ungrouped view (no grouping) still sorts all workstreams normally

### Testing
- [ ] Create workstreams in multiple tags with different update times
- [ ] Enable grouping by tag
- [ ] Select "Sort by Last Updated"
- [ ] Verify each group shows most recently updated first
- [ ] Select "Sort by Name"
- [ ] Verify each group is alphabetically sorted
- [ ] Disable grouping
- [ ] Verify all workstreams sorted correctly without grouping

---

## User Requirement 5: Compact Cockpit UI

### Original Request
> "also I need to make cockpit UI more compact. width and font sizes is okay, but the view right now showing only 5-6 streams while grouping and 7-8 without grouping. ideally view have to render 12-15 elements at the same screen, without it it is hard co call 'cockpit'))"

### Implementation Tasks
- [ ] Task 3.2: Compact Workstream Cards
- [ ] Task 3.3: Compact Group Headers
- [ ] Task 3.4: Responsive Adjustments

### Acceptance Criteria
- [ ] 12-15 workstreams visible on 1920x1080 screen without scrolling
- [ ] Card padding reduced: `p-4` → `p-3`
- [ ] Card margins reduced: `space-y-4` → `space-y-2`
- [ ] Title size reduced: `text-lg` → `text-base`
- [ ] Tag emoji size reduced: `h-6 w-6` → `h-5 w-5`
- [ ] Group spacing reduced: `space-y-6` → `space-y-4`
- [ ] Font sizes unchanged (per user requirement: "width and font sizes is okay")
- [ ] Text remains readable
- [ ] Interactive elements remain clickable
- [ ] Mobile layout maintains usability (normal spacing on mobile)

### Testing
- [ ] Create 15+ workstreams
- [ ] View cockpit on 1920x1080 screen
- [ ] Count visible workstreams (target: 12-15)
- [ ] Verify text is readable
- [ ] Verify buttons are clickable
- [ ] Test on mobile (375x667)
- [ ] Verify mobile spacing is comfortable
- [ ] Test on tablet (768x1024)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)

---

## User Requirement 6: Auto-Update Status History

### Original Request
> "detailed view of a stream don't updating on a fly when I adding update - now I need to update page to view in history fresh updates. expected to autoupdate status history when adding it."

### Implementation Tasks
- [ ] Task 4.1: Status Update Mutation Enhancement
- [ ] Task 4.2: Edit Status Mutation Enhancement
- [ ] Task 4.3: Status Dialog Optimization

### Acceptance Criteria
- [ ] When adding a new status update, it appears in history without page refresh
- [ ] When editing a status update, changes appear without page refresh
- [ ] Latest status section updates automatically
- [ ] Timestamp shows "a few seconds ago" for new updates
- [ ] Cockpit view also updates (shows new update time)
- [ ] No console errors or infinite re-renders
- [ ] Loading state shown during save

### Testing
- [ ] Open workstream detail page
- [ ] Click "New Update"
- [ ] Add status and save
- [ ] Verify status appears in history immediately (no refresh)
- [ ] Verify latest status section updates
- [ ] Go to cockpit, verify "Updated X ago" reflects new update
- [ ] Edit an existing status
- [ ] Verify changes appear without refresh
- [ ] Check console for errors (should be none)
- [ ] Test with slow network (loading states work)

---

## Overall Feature Acceptance

### Must Have (P1)
- [x] Requirements documented
- [ ] All P1 tasks completed
- [ ] All P1 acceptance criteria met
- [ ] All P1 tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Deployed to production

### Should Have (P2)
- [ ] All P2 tasks completed
- [ ] All P2 acceptance criteria met
- [ ] All P2 tests passing

### Nice to Have (P3)
- [ ] P3 enhancements considered for future

---

## Quality Gates

### Code Quality
- [ ] All TypeScript compilation succeeds (no errors)
- [ ] All ESLint rules pass
- [ ] All Prettier formatting applied
- [ ] No console warnings in production build
- [ ] No React warnings in browser console

### Testing
- [ ] Backend unit tests: >80% coverage
- [ ] Frontend unit tests: >70% coverage
- [ ] All integration tests pass
- [ ] Manual testing checklist complete
- [ ] Cross-browser testing complete
- [ ] Mobile testing complete

### Performance
- [ ] Cockpit page loads in <2 seconds
- [ ] Backup completes in <5 minutes
- [ ] Tag reorder API responds in <500ms
- [ ] No memory leaks detected
- [ ] No performance regressions vs previous version

### Security
- [ ] GCP service account key not committed to git
- [ ] Environment variables properly configured
- [ ] API endpoints require authentication
- [ ] Tag reordering only allows user's own tags
- [ ] Backup files have restricted access (GCP)

### Documentation
- [ ] README.md updated with new features
- [ ] BACKUP_RESTORE.md created with GCP setup
- [ ] DEVELOPMENT.md updated with local testing
- [ ] .env.example includes all new variables
- [ ] API documentation updated (if applicable)
- [ ] Release notes created

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing in CI/CD
- [ ] Staging deployment successful
- [ ] Smoke tests passed in staging
- [ ] Database backup taken
- [ ] GCP production bucket created
- [ ] GCP service account configured
- [ ] Production environment variables set
- [ ] Deployment plan reviewed

### Deployment
- [ ] Code merged to main branch
- [ ] Docker images built
- [ ] Database migration executed
- [ ] Services restarted
- [ ] Health checks passing
- [ ] Smoke tests passed in production

### Post-Deployment
- [ ] Application accessible
- [ ] All features functional
- [ ] Backup scheduled correctly
- [ ] Error logs reviewed (no critical errors)
- [ ] Performance metrics normal
- [ ] User notification sent (if needed)
- [ ] Monitoring alerts configured

---

## Rollback Checklist

### If Backup System Fails
- [ ] Disable backups: `BACKUP_ENABLED=false`
- [ ] Restart backend service
- [ ] Investigate GCP credentials
- [ ] Review error logs
- [ ] Fix issues offline
- [ ] Re-enable when fixed

### If UI Breaks
- [ ] Git revert frontend commits
- [ ] Rebuild frontend Docker image
- [ ] Deploy previous version
- [ ] Verify functionality restored
- [ ] Investigate issue offline

### If Database Migration Fails
- [ ] Rollback migration: `prisma migrate resolve --rolled-back`
- [ ] Drop index manually if needed
- [ ] Restore from pre-deployment backup if critical
- [ ] Fix migration offline
- [ ] Re-apply when fixed

---

## Success Metrics

### Week 1 Post-Deployment
- [ ] 7 consecutive successful backups
- [ ] 0 critical errors in production logs
- [ ] Backup files accumulating in GCP bucket
- [ ] Users able to reorder tags
- [ ] Cockpit shows 12-15 items on desktop
- [ ] Status updates appear without refresh
- [ ] User feedback collected (positive/neutral)

### Month 1 Post-Deployment
- [ ] 30 successful backups
- [ ] Old backups cleaned up (only 30 retained)
- [ ] No data loss incidents
- [ ] No rollbacks required
- [ ] Performance metrics stable
- [ ] User satisfaction maintained or improved

---

## Sign-Off

### Development Team
- [ ] Developer: Implementation complete
- [ ] Code Reviewer: Code reviewed and approved
- [ ] QA: Testing complete, all tests passing

### Stakeholders
- [ ] Product Owner: Requirements met
- [ ] DevOps: Infrastructure configured
- [ ] Security: Security review passed (if required)

### Final Approval
- [ ] Ready for production deployment
- [ ] All checklists complete
- [ ] Risks mitigated
- [ ] Rollback plan documented

**Date**: _______________
**Approved By**: _______________
