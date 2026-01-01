# Feature Specification: Database Backups & UI Enhancements

**Feature Branch**: `002-enhancements-backups`
**Created**: 2026-01-01
**Status**: Draft
**Input**: User request for database backups and UI improvements

## Clarifications

### Session 2026-01-01

**Q1: For GCP Cloud Storage backups, what authentication method should be used?**
→ A: Service account with JSON key file (standard GCP pattern for automated backups)

**Q2: Should backup retention have an automatic cleanup policy?**
→ A: Keep last 30 daily backups, automatic cleanup of older backups

**Q3: What should happen if a backup fails?**
→ A: Log error, send notification (future: email/Slack), continue with next scheduled backup

**Q4: For tag reordering in the UI, should it use drag-and-drop or up/down arrows?**
→ A: Drag-and-drop for better UX, with visual feedback during drag

**Q5: When status history auto-updates on the detail page, should it use polling or WebSockets?**
→ A: React Query cache invalidation after mutation (simpler, sufficient for single-user app)

**Q6: For the compact UI, should we maintain responsive behavior for mobile devices?**
→ A: Yes, maintain mobile responsiveness but optimize desktop view for density

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated Database Backups (Priority: P1)

As a system administrator, I need automated daily database backups to GCP Cloud Storage so that I can recover from data loss or corruption incidents.

**Why this priority**: Data protection is critical for a productivity tool where users trust the system to maintain their work context. Without backups, data loss would be catastrophic.

**Independent Test**: Can be fully tested by configuring GCP credentials, triggering a backup manually, verifying the backup file appears in GCP Cloud Storage, then restoring from backup to verify data integrity. Delivers immediate data protection value.

**Acceptance Scenarios**:

1. **Given** the backup system is configured with GCP credentials, **When** the daily scheduled time arrives (e.g., 2 AM UTC), **Then** a full database backup is created and uploaded to GCP Cloud Storage
2. **Given** a backup is being created, **When** the backup completes successfully, **Then** the backup file is named with a timestamp (e.g., `workstream-backup-2026-01-01-020000.sql.gz`) and stored in the configured GCP bucket
3. **Given** multiple daily backups exist, **When** a new backup is created, **Then** backups older than 30 days are automatically deleted
4. **Given** a backup operation fails, **When** the error occurs, **Then** the error is logged with details and the system continues to attempt the next scheduled backup
5. **Given** I need to restore data, **When** I download a backup file from GCP and run the restore script, **Then** the database is restored to the state captured in that backup

---

### User Story 2 - Unified Cockpit Panel (Priority: P1)

As an engineering manager, I need a unified view combining active workstreams and grouping controls so I can see more information without scrolling and make the interface feel like a true "cockpit".

**Why this priority**: The current separation of panels reduces information density and requires scrolling for 5-6 items. Merging panels enables the target of 12-15 visible workstreams, directly addressing the "cockpit" metaphor's core value.

**Independent Test**: Can be fully tested by viewing the cockpit with 15+ workstreams and verifying that 12-15 are visible without scrolling, controls are accessible in a compact header, and all functionality (sorting, grouping) still works. Delivers immediate productivity value.

**Acceptance Scenarios**:

1. **Given** I am viewing the cockpit, **When** I look at the page layout, **Then** I see a single compact header containing sorting controls, grouping controls, and the "New Workstream" button on one row
2. **Given** I have 15 active workstreams, **When** I view the cockpit on a standard desktop screen (1920x1080), **Then** I can see 12-15 workstream cards without scrolling
3. **Given** the unified panel is displayed, **When** I interact with sorting or grouping controls, **Then** the functionality works identically to the previous separate panels
4. **Given** I am on mobile, **When** I view the cockpit, **Then** the controls wrap responsively and remain usable

---

### User Story 3 - Tag Reordering with Grouping Impact (Priority: P2)

As an engineering manager, I need to reorder tags in the tag management view so that my most important categories appear first when grouping workstreams in the cockpit.

**Why this priority**: Enables users to customize the information hierarchy in their cockpit view, making frequently-referenced tag groups easier to scan. Enhances but doesn't fundamentally change existing functionality.

**Independent Test**: Can be fully tested by going to tag management, dragging tags to reorder them, returning to cockpit with tag grouping enabled, and verifying groups appear in the same order as tags. Delivers customization value.

**Acceptance Scenarios**:

1. **Given** I am on the tag management page, **When** I see my list of tags, **Then** each tag row has a drag handle icon indicating it can be reordered
2. **Given** I am viewing tags, **When** I drag a tag to a new position in the list, **Then** visual feedback shows where the tag will be placed when dropped
3. **Given** I drag a tag to a new position and release, **When** the drop completes, **Then** the tag order is saved immediately and persists on page reload
4. **Given** I have reordered my tags, **When** I go to the cockpit and enable "Group by Tag", **Then** the tag groups appear in the same order as in tag management (top tag in tag management = top group in cockpit)
5. **Given** I have untagged workstreams, **When** tag grouping is active, **Then** the "Untagged" group always appears last regardless of tag order

---

### User Story 4 - Sorting Within Tag Groups (Priority: P2)

As an engineering manager, I need sorting to apply within each tag group (not just to ungrouped workstreams) so I can see the most recently updated items in each category.

**Why this priority**: Current behavior only sorts the ungrouped view, making tag grouping less useful for finding recent updates. This fix makes grouping and sorting complementary rather than mutually exclusive.

**Independent Test**: Can be fully tested by creating workstreams in multiple tags, updating them at different times, enabling both tag grouping and "Last Updated" sorting, and verifying each group shows its workstreams in sorted order. Delivers immediate sorting value in grouped view.

**Acceptance Scenarios**:

1. **Given** tag grouping is enabled, **When** I select "Sort by Last Updated", **Then** workstreams within each tag group are sorted by update time (most recent first)
2. **Given** tag grouping is enabled, **When** I select "Sort by Name", **Then** workstreams within each tag group are alphabetically sorted
3. **Given** tag grouping is enabled, **When** I select "Sort by Created Date", **Then** workstreams within each tag group are sorted by creation date (newest first)
4. **Given** I have workstreams in multiple tags with various update times, **When** I enable grouping and sort by "Last Updated", **Then** I can quickly find the most recent update within each tag category

---

### User Story 5 - Compact Cockpit UI (Priority: P1)

As an engineering manager, I need a more compact cockpit view so I can see 12-15 workstreams on screen at once instead of 5-6, making it actually useful as a "cockpit" dashboard.

**Why this priority**: Addresses the core usability issue preventing the cockpit from serving its intended purpose. Without seeing enough items at once, users must scroll and lose the "glanceable" value proposition.

**Independent Test**: Can be fully tested by viewing the cockpit with 15+ workstreams and measuring visible cards. Success = 12-15 visible on 1920x1080 screen. Delivers immediate dashboard value.

**Acceptance Scenarios**:

1. **Given** I am viewing the cockpit on a standard desktop (1920x1080), **When** the page loads with 15+ workstreams, **Then** I can see 12-15 workstream cards without scrolling
2. **Given** the compact design is applied, **When** I view workstream cards, **Then** vertical padding, margins, and line heights are reduced while maintaining readability
3. **Given** the compact design is applied, **When** I view text content, **Then** font sizes remain unchanged (as specified by user: "width and font sizes is okay")
4. **Given** workstreams have tags, **When** I view them in compact mode, **Then** tag emoji indicators are smaller and better positioned to save vertical space
5. **Given** I am viewing the cockpit, **When** I hover over a workstream card, **Then** interactive elements remain easy to click despite reduced spacing
6. **Given** I am on mobile or tablet, **When** I view the cockpit, **Then** the layout remains usable and doesn't break despite desktop optimizations

---

### User Story 6 - Real-time Status History Updates (Priority: P2)

As an engineering manager, I need the status history to update automatically when I add a new status update so I can see my addition immediately without manually refreshing.

**Why this priority**: Removes friction from the status update workflow and provides immediate feedback. While nice-to-have, users can work around it by refreshing, so it's not blocking core functionality.

**Independent Test**: Can be fully tested by opening a workstream detail page, adding a new status update, and verifying it appears in the history list without page refresh. Delivers UX polish value.

**Acceptance Scenarios**:

1. **Given** I am viewing a workstream detail page, **When** I click "New Update" and save a status, **Then** the new status appears at the top of the status history immediately without page reload
2. **Given** I am viewing status history, **When** I edit an existing status update, **Then** the updated status appears in the history with the modified content and "edited" indicator
3. **Given** I just added a status update, **When** I view the history, **Then** the new update shows the correct timestamp (e.g., "Updated a few seconds ago")
4. **Given** the status update dialog closes after saving, **When** I look at the detail page, **Then** the latest status section also reflects the new update

---

## Data Model Changes

### Tag Model Enhancement

```prisma
model Tag {
  id        String   @id @default(uuid())
  projectId String   @map("project_id")
  name      String
  color     String
  emoji     String?
  sortOrder Int      @default(0) @map("sort_order")  // Already exists
  createdAt DateTime @default(now()) @map("created_at")

  project     Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  workstreams Workstream[]

  @@unique([projectId, name])
  @@index([projectId])
  @@index([projectId, sortOrder])  // NEW: Index for efficient ordering
  @@map("tags")
}
```

**Changes**:
- Add index on `(projectId, sortOrder)` for efficient tag ordering queries
- No schema changes needed, sortOrder field already exists

### Backup Metadata (Optional Future Enhancement)

For now, backups will be simple file-based with timestamp naming. Future enhancement could add:

```prisma
model BackupLog {
  id          String   @id @default(uuid())
  filename    String
  size        BigInt
  status      String   // 'success', 'failed'
  startedAt   DateTime
  completedAt DateTime?
  errorMsg    String?
  gcpPath     String

  @@index([startedAt])
  @@map("backup_logs")
}
```

**Decision**: Defer this to future version. Start with simple file-based backups logged to application logs.

---

## API Changes

### New Endpoint: Tag Reordering

```typescript
PUT /api/tags/reorder
Authorization: Required (session cookie)
Content-Type: application/json

Request Body:
{
  "tagIds": ["uuid1", "uuid2", "uuid3"]  // Ordered array of tag IDs
}

Response: 200 OK
{
  "tags": [
    {
      "id": "uuid1",
      "name": "project",
      "color": "#3B82F6",
      "emoji": "🚀",
      "sortOrder": 0,
      "createdAt": "2026-01-01T00:00:00Z"
    },
    // ... more tags in new order
  ]
}

Error Responses:
400 Bad Request - Invalid tag IDs or missing tags
404 Not Found - One or more tags not found or not owned by user
500 Internal Server Error - Database error
```

### Modified Endpoint: Get Tags

```typescript
GET /api/tags
Authorization: Required (session cookie)

Response: 200 OK
{
  "tags": [/* sorted by sortOrder ASC */]
}
```

**Change**: Ensure tags are returned sorted by `sortOrder` ASC so frontend displays them in user's custom order.

### New Endpoint: Manual Backup Trigger (Admin Only)

```typescript
POST /api/admin/backup
Authorization: Required (admin session)

Response: 202 Accepted
{
  "message": "Backup initiated",
  "jobId": "backup-uuid"
}

Error Responses:
401 Unauthorized - Not authenticated
403 Forbidden - Not admin user
500 Internal Server Error - Backup failed to start
```

**Note**: Admin authentication to be added in future. For MVP, this endpoint can be omitted and backups run via cron only.

---

## Technical Implementation

### Backup System Architecture

**Components**:

1. **Backup Script** (`backend/scripts/backup-database.ts`):
   - Uses `pg_dump` to create SQL dump
   - Compresses with gzip
   - Uploads to GCP Cloud Storage using `@google-cloud/storage` SDK
   - Implements retry logic (3 attempts)
   - Logs success/failure

2. **Backup Service** (`backend/src/services/backupService.ts`):
   - Orchestrates backup process
   - Manages GCP credentials from environment
   - Implements cleanup of old backups (>30 days)
   - Error handling and logging

3. **Cron Scheduler** (Docker container or separate service):
   - Runs daily at 2 AM UTC
   - Executes backup script
   - Options: node-cron in backend or separate cron container

4. **Environment Configuration**:
   ```bash
   GCP_PROJECT_ID=your-project
   GCP_BUCKET_NAME=workstream-backups
   GCP_SERVICE_ACCOUNT_KEY=/path/to/key.json
   BACKUP_ENABLED=true
   BACKUP_SCHEDULE="0 2 * * *"  # 2 AM UTC daily
   ```

**Backup Process Flow**:
```
1. Cron triggers at 2 AM UTC
2. Backup service creates timestamp: 2026-01-01-020000
3. Execute pg_dump: workstream-backup-2026-01-01-020000.sql
4. Compress: workstream-backup-2026-01-01-020000.sql.gz
5. Upload to GCS: gs://workstream-backups/2026/01/workstream-backup-2026-01-01-020000.sql.gz
6. Delete local temp files
7. Query GCS for backups >30 days old
8. Delete old backups
9. Log completion
```

### Frontend UI Changes

#### Cockpit.tsx Refactoring

**Current Structure** (separate panels):
```tsx
<div className="mb-6 flex items-center justify-between">
  <h2>Active Workstreams</h2>
  <button>New Workstream</button>
</div>

<div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border p-4">
  {/* Sorting and grouping controls */}
</div>
```

**New Structure** (unified compact header):
```tsx
<div className="mb-4 flex items-center justify-between border-b border-gray-200 bg-white pb-3">
  <h2 className="text-xl font-bold">Cockpit</h2>
  
  <div className="flex items-center gap-4">
    {/* Inline sorting */}
    <select className="text-sm px-2 py-1">...</select>
    
    {/* Inline grouping */}
    <select className="text-sm px-2 py-1">...</select>
    
    {/* New workstream */}
    <button className="px-3 py-1.5 text-sm">New</button>
  </div>
</div>
```

**Compacting Changes**:
- Card padding: `p-4` → `p-3`
- Card margins: `space-y-4` → `space-y-2`
- Title size: `text-lg` → `text-base`
- Status text: `text-sm` → `text-sm` (unchanged, per user request)
- Tag emoji size: `h-6 w-6` → `h-5 w-5`
- Line height adjustments: `leading-relaxed` → `leading-snug`
- Group spacing: `space-y-6` → `space-y-4`

#### TagManagement.tsx Drag-and-Drop

**Library**: `@dnd-kit/core` and `@dnd-kit/sortable`

**Implementation**:
```tsx
import { DndContext, closestCenter, PointerSensor, useSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';

function SortableTag({ tag }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: tag.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* Tag content with drag handle */}
    </div>
  );
}

// In parent component
const handleDragEnd = (event) => {
  const { active, over } = event;
  if (active.id !== over.id) {
    const oldIndex = tags.findIndex(t => t.id === active.id);
    const newIndex = tags.findIndex(t => t.id === over.id);
    const newOrder = arrayMove(tags, oldIndex, newIndex);
    reorderMutation.mutate({ tagIds: newOrder.map(t => t.id) });
  }
};
```

#### WorkstreamDetail.tsx Auto-Update

**React Query Cache Invalidation**:
```tsx
const createStatusMutation = useMutation({
  mutationFn: async (data) => {
    return await apiClient.post(`/api/status-updates`, data);
  },
  onSuccess: () => {
    // Invalidate both detail view and list view
    queryClient.invalidateQueries({ queryKey: ['status-updates', workstreamId] });
    queryClient.invalidateQueries({ queryKey: ['workstream', workstreamId] });
    queryClient.invalidateQueries({ queryKey: ['workstreams'] });
  },
});
```

**Why this works**: React Query automatically refetches invalidated queries if they're currently being observed (which they are on the detail page), providing the auto-update behavior.

### Backend Service Changes

#### tagService.ts Enhancement

```typescript
export async function reorderTags(
  projectId: string,
  tagIds: string[]
): Promise<Tag[]> {
  // Verify all tags belong to project
  const tags = await db.tag.findMany({
    where: {
      id: { in: tagIds },
      projectId,
    },
  });

  if (tags.length !== tagIds.length) {
    throw new Error('Some tags not found or access denied');
  }

  // Update sortOrder based on array position
  await db.$transaction(
    tagIds.map((tagId, index) =>
      db.tag.update({
        where: { id: tagId },
        data: { sortOrder: index },
      })
    )
  );

  // Return updated tags in order
  return await db.tag.findMany({
    where: { projectId },
    orderBy: { sortOrder: 'asc' },
  });
}

// Modify existing getTagsByProjectId
export async function getTagsByProjectId(projectId: string): Promise<Tag[]> {
  return await db.tag.findMany({
    where: { projectId },
    orderBy: { sortOrder: 'asc' },  // Add ordering
  });
}
```

#### Sorting Within Groups (Cockpit.tsx)

**Current Code** (sorts all workstreams, then groups):
```typescript
const sortedWorkstreams = useMemo(() => {
  if (!workstreams) return [];
  return [...workstreams].sort((a, b) => {
    // sorting logic
  });
}, [workstreams, sortBy]);

const groupedWorkstreams = useMemo(() => {
  // groups sortedWorkstreams
}, [sortedWorkstreams, groupBy]);
```

**Fixed Code** (groups first, then sorts within each group):
```typescript
const groupedWorkstreams = useMemo(() => {
  if (!workstreams) return [];
  
  if (groupBy === 'none') {
    // Sort all workstreams
    const sorted = [...workstreams].sort(getSortComparator(sortBy));
    return [{ key: 'all', name: null, workstreams: sorted }];
  }

  // Group first
  const groups = new Map<string, Workstream[]>();
  workstreams.forEach((ws) => {
    const key = ws.tag?.id || 'untagged';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ws);
  });

  // Sort workstreams within each group
  const result = Array.from(groups.entries()).map(([key, wsList]) => ({
    key,
    name: key === 'untagged' ? null : wsList[0].tag?.name || null,
    color: key === 'untagged' ? null : wsList[0].tag?.color || null,
    emoji: key === 'untagged' ? null : wsList[0].tag?.emoji || null,
    sortOrder: key === 'untagged' ? 999999 : (wsList[0].tag?.sortOrder ?? 999999),
    workstreams: wsList.sort(getSortComparator(sortBy)),  // Sort within group
  }));

  // Sort groups by tag sortOrder
  return result.sort((a, b) => a.sortOrder - b.sortOrder);
}, [workstreams, sortBy, groupBy]);

function getSortComparator(sortBy: SortOption) {
  return (a: Workstream, b: Workstream) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'createdAt':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'updatedAt':
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  };
}
```

---

## Environment & Configuration

### New Environment Variables

**Backend** (`.env`):
```bash
# GCP Backup Configuration
GCP_PROJECT_ID=your-gcp-project-id
GCP_BUCKET_NAME=workstream-cockpit-backups
GCP_SERVICE_ACCOUNT_KEY_PATH=/app/config/gcp-service-account.json
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Cron expression: 2 AM UTC daily
BACKUP_RETENTION_DAYS=30

# Database connection for pg_dump
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=workstream_cockpit
```

**Docker Compose** (`docker-compose.yml`):
```yaml
services:
  backend:
    # ... existing config
    volumes:
      - ./backend/config/gcp-service-account.json:/app/config/gcp-service-account.json:ro
    environment:
      # ... existing vars
      GCP_PROJECT_ID: ${GCP_PROJECT_ID}
      GCP_BUCKET_NAME: ${GCP_BUCKET_NAME}
      GCP_SERVICE_ACCOUNT_KEY_PATH: /app/config/gcp-service-account.json
      BACKUP_ENABLED: ${BACKUP_ENABLED:-true}
      BACKUP_SCHEDULE: ${BACKUP_SCHEDULE:-0 2 * * *}
      BACKUP_RETENTION_DAYS: ${BACKUP_RETENTION_DAYS:-30}
```

### GCP Setup Instructions

1. **Create GCP Storage Bucket**:
   ```bash
   gsutil mb -p your-project-id -l us-central1 gs://workstream-cockpit-backups
   ```

2. **Create Service Account**:
   ```bash
   gcloud iam service-accounts create workstream-backup \
     --display-name="Workstream Cockpit Backup Service"
   ```

3. **Grant Permissions**:
   ```bash
   gsutil iam ch serviceAccount:workstream-backup@your-project-id.iam.gserviceaccount.com:objectAdmin \
     gs://workstream-cockpit-backups
   ```

4. **Create Key File**:
   ```bash
   gcloud iam service-accounts keys create gcp-service-account.json \
     --iam-account=workstream-backup@your-project-id.iam.gserviceaccount.com
   ```

5. **Place Key File**: Copy `gcp-service-account.json` to `backend/config/` (add to `.gitignore`)

---

## Dependencies

### New NPM Packages

**Backend**:
```json
{
  "@google-cloud/storage": "^7.7.0",
  "node-cron": "^3.0.3"
}
```

**Frontend**:
```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

---

## Testing Strategy

### Unit Tests

**Backend**:
- `tagService.test.ts`:
  - Test `reorderTags()` with valid tag IDs
  - Test `reorderTags()` with invalid tag IDs (expect error)
  - Test `reorderTags()` with mixed ownership (expect error)
  - Test `getTagsByProjectId()` returns tags in sortOrder

- `backupService.test.ts`:
  - Test backup filename generation
  - Test GCP upload (mocked)
  - Test old backup cleanup logic
  - Test error handling

**Frontend**:
- `Cockpit.test.tsx`:
  - Test grouped workstreams sorted within each group
  - Test group ordering matches tag sortOrder
  - Test ungrouped sorting still works
  - Test compact UI renders correctly

- `TagManagement.test.tsx`:
  - Test drag-and-drop reordering
  - Test reorder API call with correct tag IDs

### Integration Tests

1. **Tag Reordering End-to-End**:
   - Create 3 tags: A, B, C
   - Reorder to C, A, B via API
   - GET /api/tags and verify order
   - GET /api/workstreams (grouped) and verify group order

2. **Backup System**:
   - Trigger manual backup
   - Verify file in GCP bucket
   - Download and verify SQL dump is valid
   - Restore to test database and verify data integrity

3. **Status History Auto-Update**:
   - Open workstream detail page
   - Add status update
   - Verify status appears in history without page reload
   - Verify status count increments

### Manual Testing Checklist

- [ ] Tag drag-and-drop works smoothly with visual feedback
- [ ] Tag order persists after page reload
- [ ] Cockpit groups appear in tag order
- [ ] Sorting works within each group when grouped
- [ ] Compact UI shows 12-15 items on 1920x1080 screen
- [ ] Unified header fits all controls on one line
- [ ] Mobile responsive layout still works
- [ ] Status update appears immediately in detail view
- [ ] Backup runs at scheduled time
- [ ] Backup file appears in GCP bucket
- [ ] Old backups are cleaned up

---

## Deployment Plan

### Phase 1: Backend Infrastructure (Days 1-2)

1. Add backup dependencies to `backend/package.json`
2. Implement `backupService.ts`
3. Create `scripts/backup-database.ts`
4. Add cron scheduler to backend startup
5. Add environment variables
6. Update Docker Compose configuration
7. Write unit tests
8. Manual backup testing

### Phase 2: Tag Reordering (Days 3-4)

1. Add database index migration
2. Implement `reorderTags()` in `tagService.ts`
3. Add `PUT /api/tags/reorder` route
4. Write backend tests
5. Add frontend drag-and-drop dependencies
6. Implement drag-and-drop UI in `TagManagement.tsx`
7. Wire up API call
8. Test end-to-end

### Phase 3: Cockpit UI Enhancements (Days 5-6)

1. Refactor `Cockpit.tsx` for unified header
2. Apply compact CSS changes to `WorkstreamCard.tsx`
3. Fix sorting logic to work within groups
4. Update group ordering to use tag sortOrder
5. Test with 15+ workstreams
6. Test responsive behavior
7. Cross-browser testing

### Phase 4: Status History Auto-Update (Day 7)

1. Update mutation invalidation in `WorkstreamDetail.tsx`
2. Verify React Query refetches correctly
3. Test with multiple updates
4. Test edge cases (network errors, etc.)

### Phase 5: Documentation & Deployment (Day 8)

1. Write GCP setup guide for backups
2. Update README with new features
3. Update environment variable documentation
4. Create deployment checklist
5. Deploy to staging
6. Final testing
7. Deploy to production

---

## Rollback Plan

### Backup System Rollback

If backups cause issues:
1. Set `BACKUP_ENABLED=false` in environment
2. Restart backend service
3. Backups will stop but data remains safe
4. Investigate and fix issues offline

### Frontend Rollback

If UI changes cause problems:
1. Git revert frontend commits
2. Rebuild frontend Docker image
3. Deploy previous version
4. Backend changes (tag reordering API) remain backward compatible

### Tag Reordering Rollback

If tag reordering has issues:
1. Frontend can ignore sortOrder and fall back to alphabetical
2. API endpoints remain available but unused
3. Database migration (index) is non-breaking and can stay

---

## Security Considerations

1. **GCP Service Account Key**:
   - Store in `backend/config/` (gitignored)
   - Mount as read-only volume in Docker
   - Use environment-specific keys (dev/staging/prod)
   - Rotate keys periodically

2. **Backup Data**:
   - Backups contain all user data (PII)
   - GCP bucket must have restricted access (service account only)
   - Enable GCP bucket encryption at rest
   - Consider backup encryption before upload (future enhancement)

3. **Tag Reorder API**:
   - Verify all tagIds belong to user's project
   - Prevent unauthorized reordering of other users' tags
   - Validate array length matches user's tag count

4. **Admin Endpoints** (future):
   - Manual backup trigger requires admin role
   - Implement role-based access control
   - Audit log for admin actions

---

## Performance Considerations

1. **Tag Ordering Query**:
   - Add index: `@@index([projectId, sortOrder])`
   - Minimal impact: tag count per project typically <20

2. **Backup Performance**:
   - pg_dump runs at 2 AM UTC (low traffic)
   - Compression reduces upload size by ~70%
   - Async process doesn't block API requests
   - Monitor backup duration (should be <5 minutes for typical data)

3. **Compact UI Rendering**:
   - Reduced DOM size from fewer margins/padding
   - No performance degradation expected
   - Virtual scrolling not needed for 15 items

4. **React Query Cache**:
   - Invalidation triggers refetch
   - Uses existing HTTP request flow
   - No performance impact vs manual refresh

---

## Monitoring & Observability

### Metrics to Track

1. **Backup System**:
   - Backup success rate (daily)
   - Backup duration (minutes)
   - Backup file size (MB)
   - GCP upload success rate
   - Old backup cleanup count

2. **Tag Reordering**:
   - Reorder API call frequency
   - Reorder API latency
   - Validation error rate

3. **UI Performance**:
   - Cockpit page load time
   - Workstream card render count
   - Mobile vs desktop usage split

### Logging

**Backup logs**:
```
[2026-01-01 02:00:00] INFO: Starting scheduled backup
[2026-01-01 02:00:15] INFO: Database dump completed: 15.2 MB
[2026-01-01 02:00:45] INFO: Uploaded to GCS: gs://workstream-cockpit-backups/2026/01/workstream-backup-2026-01-01-020000.sql.gz
[2026-01-01 02:00:50] INFO: Cleaned up 2 backups older than 30 days
[2026-01-01 02:00:50] INFO: Backup completed successfully
```

**Error logs**:
```
[2026-01-01 02:00:00] ERROR: Backup failed: GCP authentication error
[2026-01-01 02:00:00] ERROR: Stack trace: ...
[2026-01-01 02:00:00] WARN: Will retry at next scheduled time
```

---

## Future Enhancements

1. **Backup System**:
   - Point-in-time recovery (WAL archiving)
   - Backup encryption before upload
   - Email/Slack notifications on backup failure
   - Manual restore UI in admin panel
   - Incremental backups (currently full only)

2. **Tag Management**:
   - Tag usage statistics
   - Bulk tag assignment
   - Tag color themes/palettes
   - Tag descriptions/tooltips

3. **Cockpit UI**:
   - Customizable density (compact/normal/comfortable)
   - Saved filter/sort presets
   - Keyboard shortcuts for navigation
   - Multi-select for bulk operations

4. **Performance**:
   - Virtual scrolling for 50+ workstreams
   - Workstream search/filter
   - Lazy loading for status history

---

## Open Questions

1. **Backup notification**: Should we implement email/Slack notifications for backup failures in this phase, or defer to future?
   → **Recommendation**: Defer to future. Start with logging only.

2. **Backup retention policy**: Should we support custom retention periods per environment (e.g., 7 days for dev, 90 days for prod)?
   → **Recommendation**: Use environment variable `BACKUP_RETENTION_DAYS` for flexibility.

3. **Tag reordering permissions**: Should we allow tag reordering only for tag creator, or any project member?
   → **Recommendation**: Phase 1 is single-user, so not applicable. For future multi-user: project admin only.

4. **Compact UI density**: Should we add a user preference for compact vs normal density?
   → **Recommendation**: Start with always-compact. Add preference in future if users request it.

5. **Mobile optimization**: Should compact mode be disabled on mobile to maintain touch target sizes?
   → **Recommendation**: Keep compact on desktop, use responsive CSS to increase spacing on mobile.

---

## Success Metrics

### Backup System
- ✅ Automated daily backups running without manual intervention
- ✅ 100% backup success rate over 7 days
- ✅ Successful test restore from backup
- ✅ Old backups cleaned up automatically

### Tag Reordering
- ✅ Users can reorder tags via drag-and-drop
- ✅ Tag order persists across sessions
- ✅ Cockpit groups appear in custom tag order
- ✅ Zero data loss or corruption during reordering

### Cockpit UI
- ✅ 12-15 workstreams visible on 1920x1080 screen without scrolling
- ✅ Unified header combines all controls in one row
- ✅ Sorting works correctly within tag groups
- ✅ Mobile layout remains functional

### Status History
- ✅ New status updates appear immediately without page reload
- ✅ Edited statuses update in real-time
- ✅ No console errors or infinite re-renders

---

## Acceptance Criteria Summary

### Must Have (P1)
- [ ] Automated daily backups to GCP Cloud Storage
- [ ] Backups compressed and timestamped
- [ ] 30-day retention with automatic cleanup
- [ ] Unified cockpit header with all controls
- [ ] 12-15 workstreams visible without scrolling on desktop
- [ ] Compact card design (reduced padding/margins, same font sizes)
- [ ] Sorting applies within each tag group, not just globally

### Should Have (P2)
- [ ] Drag-and-drop tag reordering in tag management
- [ ] Tag order affects group order in cockpit
- [ ] Status updates appear in history without manual refresh
- [ ] Visual feedback during tag drag operation

### Nice to Have (P3)
- [ ] Manual backup trigger API (admin only)
- [ ] Backup success/failure notifications
- [ ] Backup restore UI
- [ ] User preference for UI density

---

## Notes

- Font sizes remain unchanged per user request: "width and font sizes is okay"
- Backup strategy chosen: Full daily backups (simpler than incremental, sufficient for current scale)
- React Query cache invalidation preferred over WebSockets for auto-update (simpler, fits single-user model)
- Drag-and-drop library chosen: @dnd-kit (modern, well-maintained, accessible)
- GCP chosen over AWS S3: Follows user's explicit requirement for "GCP cloud storage"
