# Workstream Cockpit — Requirements Document

*Version: 1.0*
*Created: December 30, 2024*

---

## Overview

A personal productivity tool for tracking active workstreams with status history. Designed for engineering managers who need to maintain context across 15-20 parallel initiatives and report status quickly in meetings.

### Problem Statement

- Multiple workstreams running in parallel require mental tracking
- Status changes need to be recalled quickly during syncs/meetings
- Historical status progression needed for weekly/biweekly reporting
- Existing tools (Asana, Notion) don't provide fast status updates with history

### Core Value Proposition

- Glanceable cockpit view of all active work (10 seconds to scan)
- Minimal friction status updates (click → type → save)
- Timeline view for reporting across workstreams
- Trust the system enough to offload mental tracking

---

## Data Model

### Entities

#### Person
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| email | String | From Google OAuth, unique |
| name | String | Display name from Google |
| created_at | Timestamp | Account creation |

#### Project
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| person_id | UUID | FK to Person |
| name | String | Project name (e.g., "Temp proj", "Personal") |
| created_at | Timestamp | |

#### Tag
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| project_id | UUID | FK to Project |
| name | String | Tag name (max 100 chars) |
| color | String | Hex color code for UI |
| sort_order | Integer | Display order |
| created_at | Timestamp | |

*Default tags on project creation: project (blue), ongoing (green), delegated (purple), watching (gray)*

#### Workstream
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| project_id | UUID | FK to Project |
| tag_id | UUID | FK to Tag, nullable |
| name | String | Workstream name (max 200 chars) |
| context | Text | Notes, links, longer form info (max 2000 chars) |
| state | Enum | active, closed |
| created_at | Timestamp | |
| closed_at | Timestamp | Nullable, set when state → closed |

#### StatusUpdate
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| workstream_id | UUID | FK to Workstream |
| status | String | Status text (max 500 chars, recommended ~100-200) |
| note | Text | Optional context for this update (max 2000 chars) |
| created_at | Timestamp | |
| updated_at | Timestamp | For edit tracking |

### Relationships

```
Person (1) ←→ (n) Project
Project (1) ←→ (n) Tag
Project (1) ←→ (n) Workstream
Workstream (n) ←→ (1) Tag
Workstream (1) ←→ (n) StatusUpdate
```

---

## Functional Requirements

### Authentication & Authorization

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-1 | Google OAuth login | Must |
| AUTH-2 | Auto-create Person record on first login | Must |
| AUTH-3 | Auto-create default Project on first login | Must |
| AUTH-4 | All data scoped to authenticated user | Must |
| AUTH-5 | Session duration: 30 days with automatic refresh on activity | Must |

### Project Management

| ID | Requirement | Priority |
|----|-------------|----------|
| PROJ-1 | View list of user's projects | Must |
| PROJ-2 | Create new project | Must |
| PROJ-3 | Edit project name | Must |
| PROJ-4 | Switch between projects (context selector) | Must |
| PROJ-5 | Delete project (with confirmation, cascades) | Should |

### Tag Management

| ID | Requirement | Priority |
|----|-------------|----------|
| TAG-1 | View tags for current project | Must |
| TAG-2 | Create new tag (name + color) | Must |
| TAG-3 | Edit tag (name, color) | Must |
| TAG-4 | Delete tag (unsets tag on workstreams, no cascade delete) | Should |
| TAG-5 | Reorder tags | Should |
| TAG-6 | Default tags created with new project | Must |
| TAG-7 | Enforce max 100 chars for tag names | Must |

### Workstream Management

| ID | Requirement | Priority |
|----|-------------|----------|
| WS-1 | View list of active workstreams | Must |
| WS-2 | Create workstream (name required, status optional) | Must |
| WS-3 | If status provided on create, create initial StatusUpdate | Must |
| WS-4 | Edit workstream metadata (name, tag, context) | Must |
| WS-5 | Close workstream (sets state=closed, closed_at=now) | Must |
| WS-6 | View closed/archived workstreams | Must |
| WS-7 | Reopen closed workstream (state=active, closed_at=null) | Must |
| WS-8 | Filter workstreams by tag | Should |
| WS-9 | Group workstreams by tag in list view | Should |
| WS-10 | Display current status inline in workstream list | Must |
| WS-11 | Color-code workstreams by tag | Must |
| WS-12 | Enforce max 200 chars for workstream names | Must |
| WS-13 | Enforce max 2000 chars for workstream context | Must |

### Status Updates

| ID | Requirement | Priority |
|----|-------------|----------|
| ST-1 | Add status update to workstream (click → dialog → type → save) | Must |
| ST-2 | View history of status updates for workstream | Must |
| ST-3 | Edit existing status update (text, note) | Must |
| ST-4 | Delete status update | Should |
| ST-5 | Add optional note with status update | Should |
| ST-6 | Show timestamp on each status update | Must |
| ST-7 | Show "updated" indicator if status was edited | Should |
| ST-8 | Enforce max 500 chars for status text | Must |
| ST-9 | Enforce max 2000 chars for status note | Must |

### Timeline / Reporting View

| ID | Requirement | Priority |
|----|-------------|----------|
| TL-1 | Timeline view: all status updates across workstreams, sorted by date | Must |
| TL-2 | Timeline shows: date, workstream name, status text | Must |
| TL-3 | Filter timeline by date range (today, this week, last 7 days, custom) | Must |
| TL-4 | Filter timeline by tag | Should |
| TL-5 | Group timeline entries by date | Must |
| TL-6 | Include workstream create/close events in timeline | Should |
| TL-7 | Visual distinction between status updates and lifecycle events | Should |
| TL-8 | Optimized for reading aloud in meetings (clear, scannable) | Must |

### Cross-Device Access

| ID | Requirement | Priority |
|----|-------------|----------|
| CD-1 | Responsive design — works on desktop (primary) | Must |
| CD-2 | Responsive design — works on mobile browser (read-only acceptable) | Must |
| CD-3 | Data persists in cloud, syncs across devices | Must |
| CD-4 | Always-online architecture (no offline support required) | Must |

### Error Handling & Reliability

| ID | Requirement | Priority |
|----|-------------|----------|
| ERR-1 | Use optimistic UI updates for save operations | Must |
| ERR-2 | Automatically retry failed network requests 2-3 times with exponential backoff | Must |
| ERR-3 | Display clear error message if all retry attempts fail | Must |
| ERR-4 | Allow manual retry after error | Must |
| ERR-5 | Use last-write-wins for concurrent edits (no conflict detection) | Must |

### Loading States & User Feedback

| ID | Requirement | Priority |
|----|-------------|----------|
| UI-1 | Display skeleton screens while loading cockpit view | Must |
| UI-2 | Display skeleton screens while loading timeline view | Must |
| UI-3 | Display inline spinners during save/create actions | Must |
| UI-4 | Visual distinction between loading states and actual content | Must |

---

## Non-Functional Requirements

### Performance
- Cockpit view loads in < 1 second
- Status update saves in < 500ms
- Timeline view loads in < 2 seconds for 1 year of data

### UX Principles
- Minimal friction for frequent operations (status update, create workstream)
- One-click to reach status update dialog from cockpit
- Optimistic UI with automatic retry for save operations
- Skeleton screens for page loads, inline spinners for actions
- Keyboard shortcuts for power users (optional, nice-to-have)
- Clean, readable UI — no fancy styling, focus on clarity
- High information density on cockpit view

### Security
- All API endpoints require authentication
- Users can only access their own data
- HTTPS required
- Session duration: 30 days with automatic refresh on activity
- Last-write-wins for concurrent edits (no conflict locking)

---

## Technical Architecture

### Stack

**Backend:**
- Language: Node.js (TypeScript) or Python (FastAPI)
- Database: PostgreSQL
- ORM: Prisma (Node) or SQLAlchemy (Python)
- Auth: Google OAuth 2.0

**Frontend:**
- Framework: React with TypeScript
- State: React Query or similar for server state
- Styling: Tailwind CSS or similar utility-first CSS
- Build: Vite

**Infrastructure:**
- Deployment: Docker containers on existing VM
- Architecture: Monolith with separated frontend/backend services
- Domain: Existing domain available

### Project Structure

```
workstream-cockpit/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   └── middleware/
│   ├── tests/
│   ├── Dockerfile
│   └── package.json (or pyproject.toml)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── api/
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

### Development Practices
- TDD for both backend and frontend
- Backend: Unit tests for services, integration tests for API endpoints
- Frontend: Component tests, integration tests for user flows
- CI pipeline recommended but not required for MVP

---

## User Flows

### Flow 1: Daily Cockpit Review (10 seconds)
1. Open app → lands on cockpit (active workstreams list)
2. Scan list — each workstream shows name, tag color, current status
3. Done

### Flow 2: Status Update (30 seconds)
1. On cockpit, click "Update" button on workstream row
2. Dialog opens with text field, previous status shown for reference
3. Type new status
4. Click Save (or Cmd+Enter)
5. Dialog closes, list refreshes with new status

### Flow 3: Create New Workstream (20 seconds)
1. Click "New Workstream" button
2. Enter name (required)
3. Select tag (optional, defaults to none or first tag)
4. Enter initial status (optional)
5. Save
6. Appears in cockpit list

### Flow 4: Prepare for Weekly Report (1-2 minutes)
1. Navigate to Timeline view
2. Set filter: "This week" 
3. Optionally filter by tag
4. Scan chronological list of all updates
5. Read from screen during meeting

### Flow 5: Close Completed Workstream (10 seconds)
1. Click workstream to open detail view (or inline menu)
2. Click "Close"
3. Confirm
4. Workstream moves to archived list

### Flow 6: Review History for Specific Workstream (30 seconds)
1. Click workstream to open detail view
2. See full history of status updates with timestamps
3. Optionally edit past status if correction needed

---

## UI Wireframes (Conceptual)

### Cockpit View (Main Screen)
```
┌─────────────────────────────────────────────────────────────┐
│ Workstream Cockpit            [Project: Temp proj ▼] [User] │
├─────────────────────────────────────────────────────────────┤
│ [+ New Workstream]                    [Timeline] [Archive]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ● QA Hiring                                      [Update]   │
│   pre-approved offer, expecting approval next week,         │
│   start date 19.01                              2h ago      │
│                                                             │
│ ● Alerts System                                  [Update]   │
│   working on requirements for pilot              1d ago     │
│                                                             │
│ ● AdTech SDK                                     [Update]   │
│   on track, 1-2 weeks to ABC deploy, then scale  3d ago     │
│                                                             │
│ ● CMS Migration                                  [Update]   │
│   postponed due to alerting system priority      1w ago     │
│                                                             │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘

● = tag color indicator
```

### Timeline View
```
┌─────────────────────────────────────────────────────────────┐
│ Timeline                    [This Week ▼] [All Tags ▼]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ December 30, 2024                                           │
│ ─────────────────                                           │
│ 14:32  ● QA Hiring                                          │
│        pre-approved offer, expecting approval next week     │
│                                                             │
│ 10:15  ● Alerts System                                      │
│        working on requirements for pilot                    │
│                                                             │
│ December 29, 2024                                           │
│ ─────────────────                                           │
│ 16:45  ● AdTech SDK                                         │
│        on track, 1-2 weeks to CWW deploy                    │
│                                                             │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

### Status Update Dialog
```
┌────────────────────────────────────────┐
│ Update Status: QA Hiring          [X]  │
├────────────────────────────────────────┤
│                                        │
│ Previous:                              │
│ "offer sent Friday, waiting response"  │
│                                        │
│ New status:                            │
│ ┌────────────────────────────────────┐ │
│ │                                    │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Note (optional):                       │
│ ┌────────────────────────────────────┐ │
│ │                                    │ │
│ └────────────────────────────────────┘ │
│                                        │
│              [Cancel]  [Save ⌘+Enter]  │
└────────────────────────────────────────┘
```

---

## MVP Scope

### Phase 1: Core Functionality
- Google OAuth login
- Single default project (multi-project deferred)
- CRUD workstreams
- CRUD status updates
- Cockpit view with current status
- Tag management with colors
- Basic timeline view with date filter

### Phase 2: Polish
- Multi-project support
- Timeline filtering by tag
- Workstream lifecycle events in timeline
- Edit status history
- Archive view improvements

### Phase 3: Nice-to-Have
- Keyboard shortcuts
- Export timeline to markdown
- Reminder/prompt for daily updates
- Mobile-optimized input

---

## Open Questions

1. **Status length limit?** — ✅ RESOLVED: 500 chars max for status text, 2000 chars for notes

2. **Default sort for cockpit?** — By last updated? By tag then name? User preference?

3. **What happens to status history when workstream is closed?** — Preserved and viewable in archive

4. **Bulk operations?** — Close multiple workstreams at once? Defer to Phase 2+

---

## Success Criteria

The tool is successful if:

1. You can scan all active workstreams in <10 seconds
2. You can update a status in <30 seconds
3. You can prepare for a weekly report in <2 minutes
4. You trust the system enough to stop carrying workstream status in your head
5. You actually use it daily for 2+ weeks

---

*End of requirements document*