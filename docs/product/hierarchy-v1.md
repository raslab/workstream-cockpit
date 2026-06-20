# Hierarchy V1: sub-streams

Date: 2026-06-20

## Purpose

Hierarchy V1 adds optional parent/child structure to Workstream Cockpit so broad streams can contain smaller concrete sub-streams without losing operational clarity.

The feature answers:

- What larger area does this stream belong to?
- What moved recently inside this area?
- Which concrete sub-stream created that movement?
- What is direct progress vs inherited activity from children?
- How did this stream's parent relationship change over time?

V1 shows structure and recency only. It must not infer health, urgency, priority, or staleness.

## Product principles

1. **Show recency, not judgment.** Show elapsed time since direct and sub-stream activity; do not label streams stale, unhealthy, blocked, or needing attention.
2. **Preserve meaning.** Closing a parent means the whole area is complete or inactive. Closing a parent with active descendants is contradictory and must be blocked.
3. **Keep history honest.** Ancestors can inherit activity timestamps from descendants, but must not receive fake status updates when children move.
4. **Use hierarchy for primary belonging.** Each stream has at most one parent. Other relationships remain tags, references, or future features.
5. **Avoid file-explorer complexity.** Breadcrumbs can show full path; main view must not render deep recursive trees in V1.

## V1 model rules

- A stream can have zero or one parent.
- A stream can have many children.
- Maximum hierarchy depth is 5 total levels, with a top-level stream at depth 1.
- Cycles are not allowed.
- A stream cannot be its own parent.
- A stream cannot be moved under one of its descendants.
- A stream cannot be moved under a closed parent.
- Closed streams can be reparented under active parents or detached to top level.
- Categories and tags do not need to match between parent and child.
- Existing streams are treated as top-level streams after migration.
- Streams cannot currently be deleted by design. If deletion is added later, a parent with children must not be deletable until children are moved, detached, or otherwise resolved.

## Timestamp semantics

Expose distinct timestamps so UI does not blur different kinds of movement:

- `lastDirectUpdateAt`: latest real status update on this stream itself.
- `lastSubstreamActivityAt`: latest activity anywhere below this stream, up to depth 5.
- `lastActivityAt`: newest of direct update and descendant activity.

Only the stream that receives a status update stores the update. Ancestors receive activity propagation only through computed timestamps and source metadata.

## Audit events

Hierarchy changes are structural audit events, not normal status updates.

V1 structural event types:

- `parent_changed`
- `sub_stream_created`

Existing narrative/event types remain:

- `status_update`
- `workstream_created`
- `workstream_closed`
- `workstream_reopened` if represented by the backend/timeline contract.

A `parent_changed` event records:

- stream id
- old parent id/name, nullable
- new parent id/name, nullable
- timestamp
- actor later if multi-user becomes relevant

User-facing examples:

- `Moved from Job search to JobScan public release`
- `Moved under JobScan public release`
- `Removed from JobScan public release`
- `Moved to top level`

For closed streams, event order is chronological. If a stream was closed and later reparented, timeline shows `Closed` before `Moved from X to Y`.

## Backend/API behavior

### Data model

- `Workstream.parentId` is a nullable self-reference.
- `WorkstreamEvent` stores structural audit events and JSON metadata.
- Service-layer validation enforces same-project parentage, no cycles, max depth, and closed-parent constraints.

### Workstream responses

List/detail responses should include hierarchy and activity metadata sufficient for UI rendering without N+1 requests:

- `parentId`
- `parent` summary, nullable
- `ancestors` breadcrumb chain, root to immediate parent
- `children` direct child summaries on detail responses
- direct/active/closed child counts
- `depth`
- `lastDirectUpdateAt`
- `lastSubstreamActivityAt`
- `lastActivityAt`
- latest sub-stream activity source summary when available

### Create sub-stream

- `POST /api/workstreams` accepts optional `parentId`.
- If `parentId` is provided, the parent must exist, belong to the same project, be active, and not make depth exceed 5.
- Creating a child records `sub_stream_created`.
- The parent receives inherited activity propagation through computed activity fields.

### Change parent

- `PUT /api/workstreams/:id` accepts `parentId`, including `null` to detach to top level.
- Validation rejects self-parent, descendant parent, depth > 5, cross-project parent, and closed parent.
- Closed streams may be moved under active parents or detached.
- A confirmed change records `parent_changed`.

### Closing and reopening

- Closing a stream is blocked while it has active descendants.
- Closing a stream with only closed descendants is allowed.
- Reopening a parent does not reopen children.
- Reopening a child under a closed parent is blocked unless the parent is reopened first or the child is moved to an active parent/top level.

### Timeline and export

Timeline entries include breadcrumb context and structural events. Timeline export includes hierarchy columns:

- `stream_id`
- `stream_name`
- `parent_id`
- `parent_name`
- `breadcrumb`
- `event_type`
- `old_parent_id`
- `old_parent_name`
- `new_parent_id`
- `new_parent_name`

## Frontend behavior

### Breadcrumbs

- Child detail pages show full breadcrumbs near the title/context area.
- Deep streams show a full chain, for example `Job search > JobScan > Dataset publishing > CSV cleanup`.
- Top-level streams may show no breadcrumb or a subtle `Top-level` marker.
- Breadcrumb links navigate to ancestors.
- Breadcrumbs update after reparenting.
- Timeline items include breadcrumb context.

### Detail view

Every stream detail view supports:

- Close stream
- Create sub-stream
- Set parent / Change parent
- Direct-only vs include-sub-stream status history

Parent details show:

- last direct update age
- last sub-stream activity age
- child counts split by active and closed
- latest sub-stream activity source
- a direct `Sub-streams` section near context/status history

### Main view

Main view supports:

- Flat
- By category
- By parent

Hierarchy filters:

- All streams
- Top-level only
- Sub-streams only
- No parent
- Has sub-streams

Sorting distinguishes:

- Last direct update
- Last activity
- Last sub-stream activity

Default main view sort is `Last activity` so parent streams remain visibly alive when deep work moves.

### Timeline

Timeline remains a date-based activity log. It gains:

- scope filters (`All streams`, `Top-level only`, `Sub-streams only`, `Under parent...`)
- direct-only vs include-sub-streams toggle for scoped views
- activity filter for structural events
- breadcrumb context on every item

Timeline does not add hierarchy grouping in V1.

### Saved views

Saved views can store:

- hierarchy filter
- view mode/grouping
- sort mode
- selected parent scope if any
- include sub-streams toggle
- timeline activity filter

## Implementation references

Expected backend files:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*_add_workstream_hierarchy/migration.sql`
- `backend/src/services/workstreamService.ts`
- `backend/src/services/timelineService.ts`
- `backend/src/routes/workstreams.ts`
- `backend/src/routes/timeline.ts`
- `backend/src/mcp/server.ts`
- `backend/tests/helpers/testDb.ts`

Expected frontend files:

- `frontend/src/types/workstream.ts`
- `frontend/src/types/view.ts`
- `frontend/src/hooks/useWorkstreams.ts`
- `frontend/src/hooks/useStatusHistory.ts`
- `frontend/src/hooks/useTimeline.ts`
- `frontend/src/pages/Cockpit.tsx`
- `frontend/src/pages/WorkstreamDetail.tsx`
- `frontend/src/pages/Timeline.tsx`
- `frontend/src/components/Workstream/*`
- `frontend/src/components/ViewManagement/*`
- `frontend/src/utils/exportTimeline.ts`

## Regression tests

Backend tests should cover:

- valid child creation
- blocked create under closed parent
- blocked self/cycle/descendant parent
- blocked depth > 5
- closed stream reparenting under active parent
- parent close blocked with active descendants
- child reopen blocked under closed parent
- structural audit events in timeline
- breadcrumb/activity fields on list/detail/timeline
- MCP parity for create/update/list/timeline

Frontend tests should cover:

- breadcrumbs rendering and navigation
- create sub-stream parent preselection
- parent change/detach confirmation
- detail sub-stream section and status history toggle
- main view hierarchy filters/grouping/sorting
- timeline hierarchy filters and structural event display
- saved views preserving hierarchy configuration
- CSV export hierarchy columns

## Out of scope for V1

- Multiple parents per stream
- Automatic stale/health labels
- User-configured cadence or expected update frequency
- Cascading close of children
- Deep recursive tree rendering in main view
- Bulk reparenting unless implementation makes it cheap
- Deleting streams
- Advanced relationship types beyond parent/child
- Automatic category/tag inheritance
