# Feature Specification: Workstream Cockpit - Phase 1 Core Functionality

**Feature Branch**: `001-cockpit-core`
**Created**: 2025-12-30
**Status**: Draft
**Input**: User description: "specify phase 1 from docs/Workstream Cockpit - Requirements Document.md"

## Clarifications

### Session 2025-12-30

- Q: What are the maximum character lengths for text fields to ensure proper database schema design and user input validation? → A: Workstream name: 200 chars, Status update: 500 chars, Tag name: 100 chars, Notes/Context/Descriptions: 2000 chars
- Q: When a user attempts to save a status update or create a workstream but the network request fails, what strategy should the system use? → A: Optimistic UI update with automatic retry (2-3 attempts), then show error if all fail
- Q: When a user edits the same workstream from two different devices or browser tabs simultaneously, what conflict resolution strategy should the system use? → A: Last write wins (simpler: later save overwrites earlier, no conflict detection)
- Q: How long should authenticated user sessions remain active? → A: Session lasts 30 days with automatic refresh on activity
- Q: What loading state indicators should be shown during asynchronous operations? → A: Skeleton screens for page loads, inline spinners for save/create actions

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Status Update (Priority: P1)

As an engineering manager, I need to quickly update the status of a workstream so I can maintain current information without disrupting my workflow during a busy day.

**Why this priority**: This is the most frequent operation (daily/multiple times per day) and the core value proposition of the tool - minimal friction status updates. Without this, the tool has no primary function.

**Independent Test**: Can be fully tested by creating a workstream, clicking the update button, entering new status text, saving, and verifying the status appears in the cockpit view. Delivers immediate value for tracking a single workstream.

**Acceptance Scenarios**:

1. **Given** I am viewing the cockpit with an existing workstream, **When** I click the "Update" button on the workstream row, **Then** a dialog opens showing the previous status for reference
2. **Given** the status update dialog is open, **When** I type a new status and click "Save", **Then** the dialog closes and the cockpit refreshes showing my new status
3. **Given** the status update dialog is open, **When** I type a new status and press Cmd+Enter (or Ctrl+Enter), **Then** the status saves and the dialog closes
4. **Given** I updated a workstream status, **When** I view the cockpit, **Then** I see the new status text and a timestamp showing when it was updated
5. **Given** I am updating a status, **When** I click "Cancel", **Then** the dialog closes without saving and the previous status remains unchanged

---

### User Story 2 - Daily Cockpit Review (Priority: P1)

As an engineering manager, I need to scan all my active workstreams at a glance so I can quickly recall the current state of all my initiatives before meetings.

**Why this priority**: This is the second most frequent operation (daily) and represents the core "cockpit" metaphor - a glanceable dashboard. This must work independently to provide value for tracking multiple workstreams.

**Independent Test**: Can be fully tested by creating multiple workstreams with different statuses and tags, then viewing the cockpit to verify all workstreams display with their current status, tag colors, and timestamps. Delivers value for maintaining mental context across parallel work.

**Acceptance Scenarios**:

1. **Given** I have multiple active workstreams, **When** I open the application, **Then** I land on the cockpit view showing all active workstreams
2. **Given** I am viewing the cockpit, **When** I scan the list, **Then** each workstream displays its name, current status text, tag color indicator, and time since last update
3. **Given** I have workstreams with different tags, **When** I view the cockpit, **Then** each workstream shows a colored indicator matching its assigned tag
4. **Given** I am viewing the cockpit, **When** I look at any workstream, **Then** I can see all key information (name, status, tag, timestamp) without clicking or expanding

---

### User Story 3 - Create New Workstream (Priority: P2)

As an engineering manager, I need to add new workstreams as initiatives start so I can begin tracking their progress immediately.

**Why this priority**: Essential for getting started and adding new work, but less frequent than daily status updates. Must work independently to allow creating and tracking new workstreams.

**Independent Test**: Can be fully tested by clicking "New Workstream", entering a name and optional initial status, saving, and verifying the workstream appears in the cockpit. Delivers value for starting to track a new initiative.

**Acceptance Scenarios**:

1. **Given** I am on the cockpit view, **When** I click the "New Workstream" button, **Then** a creation form/dialog opens
2. **Given** the new workstream form is open, **When** I enter a name and click "Save", **Then** the workstream is created and appears in the cockpit list
3. **Given** I am creating a new workstream, **When** I provide both a name and an initial status, **Then** the workstream is created with that status as its first status update
4. **Given** I am creating a new workstream, **When** I select a tag from the available options, **Then** the workstream is created with that tag assigned
5. **Given** I am creating a new workstream, **When** I try to save without entering a name, **Then** I see a validation error indicating the name is required

---

### User Story 4 - Authenticate with Google (Priority: P1)

As a user, I need to log in with my Google account so I can securely access my workstream data from any device.

**Why this priority**: Authentication is a prerequisite for all other functionality and must be the first feature implemented. Required for data security and multi-device access.

**Independent Test**: Can be fully tested by visiting the app, clicking "Sign in with Google", completing OAuth flow, and verifying a user session is created. Delivers security and access control value.

**Acceptance Scenarios**:

1. **Given** I am not logged in, **When** I visit the application, **Then** I see a login page with a "Sign in with Google" button
2. **Given** I am on the login page, **When** I click "Sign in with Google" and complete the OAuth flow, **Then** I am redirected to the cockpit view
3. **Given** I successfully log in for the first time, **When** the authentication completes, **Then** a Person record is automatically created for me
4. **Given** I successfully log in for the first time, **When** my Person record is created, **Then** a default Project is automatically created for me
5. **Given** I am logged in, **When** I close and reopen the application, **Then** I remain logged in without re-authenticating (session persists)
6. **Given** I am logged in, **When** I access any feature, **Then** all data shown belongs only to me (data isolation enforced)

---

### User Story 5 - Manage Tags (Priority: P2)

As an engineering manager, I need to create and customize tags so I can categorize my workstreams by type (project, ongoing, delegated, etc.).

**Why this priority**: Tags provide essential organization and visual scanning capability. While important, basic workstream tracking can function without custom tags using defaults.

**Independent Test**: Can be fully tested by creating a new tag with a name and color, assigning it to a workstream, and verifying the color indicator appears correctly in the cockpit. Delivers value for visual organization.

**Acceptance Scenarios**:

1. **Given** a new project is created, **When** I view the project, **Then** I see four default tags: "project" (blue), "ongoing" (green), "delegated" (purple), "watching" (gray)
2. **Given** I am viewing my project, **When** I access tag management, **Then** I can see all existing tags with their names and colors
3. **Given** I am in tag management, **When** I create a new tag with a name and color, **Then** the tag is saved and available for assigning to workstreams
4. **Given** I have existing tags, **When** I edit a tag's name or color, **Then** all workstreams using that tag reflect the updated information
5. **Given** I want to remove a tag, **When** I delete it, **Then** any workstreams using that tag have their tag assignment cleared (but are not deleted)

---

### User Story 6 - View Status History (Priority: P2)

As an engineering manager, I need to see the history of status updates for a workstream so I can understand how it has progressed over time.

**Why this priority**: Important for weekly reporting and understanding context, but not needed for daily operations. Can be deferred slightly after core create/update flows work.

**Independent Test**: Can be fully tested by creating multiple status updates for a workstream, then viewing the workstream detail to see all updates in chronological order with timestamps. Delivers value for historical context and reporting.

**Acceptance Scenarios**:

1. **Given** I have a workstream with multiple status updates, **When** I click on the workstream to open its detail view, **Then** I see a chronological list of all status updates with timestamps
2. **Given** I am viewing status history, **When** I look at each update, **Then** I can see the status text, optional note, and the creation timestamp
3. **Given** I am viewing a status update, **When** the update was edited after creation, **Then** I see an "updated" indicator showing it was modified
4. **Given** I am viewing status history, **When** I want to correct a past status, **Then** I can click to edit the status text or note
5. **Given** I am editing a past status update, **When** I save changes, **Then** the update is modified and the "updated" indicator appears

---

### User Story 7 - Timeline View for Reporting (Priority: P2)

As an engineering manager, I need to see all status updates across workstreams in chronological order so I can quickly prepare for weekly status meetings.

**Why this priority**: Critical for the reporting use case but can be implemented after basic workstream management works. Users can manually review individual workstreams until this is available.

**Independent Test**: Can be fully tested by creating status updates across multiple workstreams on different dates, then viewing the timeline filtered by "This week" to see a consolidated chronological view. Delivers value for meeting preparation.

**Acceptance Scenarios**:

1. **Given** I have status updates across multiple workstreams, **When** I navigate to the Timeline view, **Then** I see all updates sorted chronologically with the most recent first
2. **Given** I am viewing the timeline, **When** I look at each entry, **Then** I see the date, time, workstream name (with tag color), and status text
3. **Given** I am in the timeline view, **When** I set the date filter to "This week", **Then** I see only updates created within the current calendar week
4. **Given** I am in the timeline view, **When** I set the date filter to "Last 7 days", **Then** I see only updates from the past 7 days
5. **Given** I am viewing the timeline, **When** updates span multiple days, **Then** entries are grouped by date with clear date headers
6. **Given** I want to prepare for a meeting, **When** I view the filtered timeline, **Then** the information is formatted to be easily readable aloud (clear, scannable layout)

---

### User Story 8 - Close Completed Workstreams (Priority: P3)

As an engineering manager, I need to close workstreams when initiatives complete so my cockpit view stays focused on active work.

**Why this priority**: Important for long-term usability and keeping the cockpit clean, but not essential for initial tracking. Can be deferred until users accumulate enough workstreams to need archiving.

**Independent Test**: Can be fully tested by creating a workstream, closing it, and verifying it no longer appears in the active cockpit view but is accessible in the archive. Delivers value for maintaining a focused view.

**Acceptance Scenarios**:

1. **Given** I have an active workstream, **When** I click to open its detail view or inline menu, **Then** I see a "Close" option
2. **Given** I click "Close" on a workstream, **When** I confirm the action, **Then** the workstream state changes to "closed" and the closed_at timestamp is set
3. **Given** a workstream is closed, **When** I view the cockpit, **Then** the closed workstream no longer appears in the active list
4. **Given** I have closed workstreams, **When** I navigate to the Archive view, **Then** I see all closed workstreams with their status history preserved
5. **Given** I am viewing a closed workstream, **When** I choose to reopen it, **Then** its state changes to "active", closed_at is cleared, and it returns to the cockpit view

---

### Edge Cases

- What happens when a user tries to create a workstream with an extremely long name (>500 characters)?
- How does the system handle creating a status update with empty text?
- What happens if a user's OAuth session expires while they're viewing the cockpit?
- How does the system handle viewing the timeline when no status updates exist?
- What happens when a user deletes a tag that is assigned to many workstreams?
- How does the system handle concurrent updates to the same workstream from different devices?
- What happens when viewing the cockpit with 100+ active workstreams?
- How does the system handle creating a status update longer than 1000 characters?
- What happens when a user tries to close an already-closed workstream?
- How does the system handle filtering the timeline by a date range with no updates?

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Authorization

- **FR-001**: System MUST authenticate users via Google OAuth 2.0
- **FR-002**: System MUST automatically create a Person record on first successful login using email and name from Google OAuth
- **FR-003**: System MUST automatically create a default Project for new users upon first login
- **FR-004**: System MUST ensure all data access is scoped to the authenticated user (data isolation)
- **FR-005**: System MUST require authentication for all application endpoints and features
- **FR-006**: System MUST maintain user sessions across browser sessions (persistent login)
- **FR-007**: System MUST set session duration to 30 days from last activity
- **FR-008**: System MUST automatically refresh session expiration on user activity

#### Project Management

- **FR-009**: System MUST allow users to view their list of projects
- **FR-010**: System MUST allow users to create new projects with a name
- **FR-011**: System MUST allow users to edit project names
- **FR-012**: System MUST provide a project selector/switcher in the UI to change the active project context
- **FR-013**: Users MUST be able to view only data (workstreams, tags, status updates) belonging to the currently selected project

#### Tag Management

- **FR-014**: System MUST automatically create four default tags when a new project is created: "project" (blue), "ongoing" (green), "delegated" (purple), "watching" (gray)
- **FR-015**: System MUST allow users to view all tags for the current project
- **FR-016**: System MUST allow users to create new tags with a name and color (hex color code)
- **FR-017**: System MUST allow users to edit existing tag names and colors
- **FR-018**: System MUST allow users to delete tags
- **FR-019**: System MUST unset tag assignments on workstreams when their assigned tag is deleted (no cascade delete of workstreams)
- **FR-020**: System MUST store and respect tag sort order for consistent display

#### Workstream Management

- **FR-021**: System MUST display a list of all active workstreams in the cockpit view
- **FR-022**: System MUST allow users to create workstreams with a required name field
- **FR-023**: System MUST allow users to optionally assign a tag when creating a workstream
- **FR-024**: System MUST allow users to optionally provide an initial status when creating a workstream
- **FR-025**: System MUST create an initial StatusUpdate record if status text is provided during workstream creation
- **FR-026**: System MUST allow users to edit workstream metadata (name, tag assignment, context field)
- **FR-027**: System MUST allow users to close a workstream (setting state=closed and closed_at=current timestamp)
- **FR-028**: System MUST allow users to view closed/archived workstreams in a separate view
- **FR-029**: System MUST allow users to reopen closed workstreams (setting state=active and closed_at=null)
- **FR-030**: System MUST display the current status text inline in the cockpit workstream list
- **FR-031**: System MUST display a color indicator for each workstream's assigned tag
- **FR-032**: System MUST display the time since last update for each workstream in the cockpit
- **FR-033**: System MUST enforce a maximum length of 200 characters for workstream names
- **FR-034**: System MUST enforce a maximum length of 100 characters for tag names
- **FR-035**: System MUST enforce a maximum length of 2000 characters for workstream context/notes fields

#### Status Updates

- **FR-036**: System MUST provide a one-click mechanism to open a status update dialog from the cockpit view
- **FR-037**: System MUST display the previous/current status in the update dialog for reference
- **FR-038**: System MUST allow users to enter new status text in the update dialog
- **FR-039**: System MUST enforce a maximum length of 500 characters for status update text
- **FR-040**: System MUST enforce a maximum length of 2000 characters for status update note fields
- **FR-041**: System MUST save the status update when the user clicks "Save" or presses Cmd+Enter (Ctrl+Enter on Windows/Linux)
- **FR-042**: System MUST allow users to optionally add a note field with each status update
- **FR-043**: System MUST close the update dialog and refresh the cockpit view after successful save
- **FR-044**: System MUST display timestamps on each status update (creation time)
- **FR-045**: System MUST allow users to view the complete history of status updates for a workstream
- **FR-046**: System MUST allow users to edit existing status update text and notes
- **FR-047**: System MUST display an "updated" indicator when a status update has been edited after creation
- **FR-048**: System MUST update the updated_at timestamp when a status update is edited

#### Timeline / Reporting View

- **FR-049**: System MUST provide a timeline view showing all status updates across all workstreams in the current project
- **FR-050**: System MUST sort timeline entries chronologically with most recent first
- **FR-051**: System MUST display date, time, workstream name, tag color indicator, and status text for each timeline entry
- **FR-052**: System MUST provide date range filters: "Today", "This week", "Last 7 days", and custom date range
- **FR-053**: System MUST group timeline entries by date with clear date headers
- **FR-054**: System MUST format the timeline view to be easily scannable and readable aloud in meetings
- **FR-055**: System MUST apply the selected date filter to show only updates within the specified range

#### Cross-Device & Performance

- **FR-056**: System MUST provide a responsive design that works on desktop browsers (primary use case)
- **FR-057**: System MUST provide a responsive design that works on mobile browsers
- **FR-058**: System MUST persist all data in a cloud-accessible database
- **FR-059**: System MUST operate as an always-online application (no offline support required)
- **FR-060**: System MUST load the cockpit view in under 1 second under normal network conditions
- **FR-061**: System MUST save status updates in under 500ms under normal network conditions
- **FR-062**: System MUST load the timeline view in under 2 seconds for up to one year of status update data

#### Error Handling & Reliability

- **FR-063**: System MUST use optimistic UI updates for save operations (show success immediately)
- **FR-064**: System MUST automatically retry failed network requests 2-3 times with exponential backoff
- **FR-065**: System MUST display a clear error message to the user if all retry attempts fail
- **FR-066**: System MUST allow users to manually retry failed operations after an error is displayed
- **FR-067**: System MUST use last-write-wins strategy for concurrent edits (no conflict detection or version locking)

#### Loading States & User Feedback

- **FR-068**: System MUST display skeleton screens while loading the cockpit view
- **FR-069**: System MUST display skeleton screens while loading the timeline view
- **FR-070**: System MUST display inline loading spinners during save/create actions (status updates, workstreams, tags)
- **FR-071**: System MUST provide visual feedback that distinguishes between loading states and actual content

### Key Entities

- **Person**: Represents a user account, linked to Google OAuth identity via email. Stores user's email, display name, and account creation timestamp. Each person can own multiple projects.

- **Project**: Represents a logical grouping of workstreams (e.g., "Work", "Personal", "Q1 Initiatives"). Each project belongs to one person and contains its own set of tags and workstreams. Enables users to separate different contexts.

- **Tag**: Represents a category or classification for workstreams within a project. Has a name (e.g., "project", "ongoing", "delegated"), a color (hex code for visual identification), and a sort order for consistent display. Tags are project-scoped.

- **Workstream**: Represents an ongoing initiative or area of work being tracked. Contains a name, optional context notes, state (active/closed), and timestamps. Belongs to one project and may have one assigned tag. Can have multiple status updates over time.

- **StatusUpdate**: Represents a point-in-time status snapshot for a workstream. Contains status text (~100-200 characters recommended), optional note for additional context, creation timestamp, and updated timestamp (for edit tracking). Multiple updates form a workstream's history.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can scan all active workstreams and understand current state in under 10 seconds
- **SC-002**: Users can update a workstream status in under 30 seconds from opening the app to save confirmation
- **SC-003**: Users can prepare for a weekly status meeting by reviewing the timeline in under 2 minutes
- **SC-004**: The cockpit view loads and displays all active workstreams in under 1 second
- **SC-005**: Status update save operations complete in under 500 milliseconds
- **SC-006**: Timeline view loads with one year of status history in under 2 seconds
- **SC-007**: Users successfully complete the Google OAuth login flow on first attempt 95% of the time
- **SC-008**: Users can create a new workstream with initial status in under 20 seconds
- **SC-009**: The application works correctly on both desktop and mobile browsers for viewing and updating workstreams
- **SC-010**: Users trust the system enough to use it daily for at least 2 consecutive weeks (indicating mental offloading)
- **SC-011**: Users can correctly identify the current status of any workstream within 3 seconds of viewing the cockpit
- **SC-012**: The system handles 15-20 active workstreams in the cockpit view without degraded performance or usability

### Assumptions

- Users have Google accounts and are comfortable with Google OAuth authentication
- Primary usage will be on desktop browsers during working hours
- Users will have between 5-20 active workstreams at any given time
- Status updates will typically be 100-200 characters (one-sentence summaries)
- Users will update workstream statuses at least a few times per week
- Network connectivity is generally available (always-online assumption)
- Users prefer minimal UI friction over extensive features for this use case
- The tool will be used by individual contributors (engineering managers) rather than teams collaborating on shared workstreams

## Technical Stack Requirements *(mandatory)*

### Backend

- **TECH-001**: Backend MUST be implemented using Node.js with TypeScript
- **TECH-002**: Backend MUST use PostgreSQL as the primary database
- **TECH-003**: Backend MUST use Prisma ORM for database access and schema management
- **TECH-004**: Backend MUST implement Google OAuth 2.0 for authentication
- **TECH-005**: Backend MUST expose RESTful API endpoints (or GraphQL if preferred)
- **TECH-006**: Backend MUST support HTTP communication (HTTPS termination handled by nginx reverse proxy)
- **TECH-007**: Backend MUST validate all input data against character length constraints defined in functional requirements

### Frontend

- **TECH-008**: Frontend MUST be implemented using React with TypeScript
- **TECH-009**: Frontend MUST use Vite as the build tool and development server
- **TECH-010**: Frontend MUST use Tailwind CSS (or similar utility-first CSS framework) for styling
- **TECH-011**: Frontend MUST use React Query (or similar library) for server state management
- **TECH-012**: Frontend MUST implement responsive design supporting desktop and mobile viewports
- **TECH-013**: Frontend MUST communicate with backend via HTTP (HTTPS termination handled by nginx reverse proxy)

### Infrastructure & Deployment

- **TECH-014**: Application MUST be containerized using Docker
- **TECH-015**: Backend and frontend MUST run as separate Docker containers
- **TECH-016**: Application MUST be deployable to an existing VM infrastructure
- **TECH-017**: Application MUST use docker-compose for local development and deployment orchestration
- **TECH-018**: Application MUST be accessible via HTTPS through an nginx reverse proxy
- **TECH-019**: PostgreSQL database MUST run in a Docker container for development and production

### Project Structure

- **TECH-020**: Project MUST follow a monorepo structure with separate `/backend` and `/frontend` directories
- **TECH-021**: Backend source code MUST be organized into `/src/routes`, `/src/services`, `/src/models`, and `/src/middleware` directories
- **TECH-022**: Frontend source code MUST be organized into `/src/components`, `/src/pages`, `/src/hooks`, and `/src/api` directories
- **TECH-023**: Each service (backend, frontend) MUST have its own Dockerfile
- **TECH-024**: Project MUST include a root-level docker-compose.yml for orchestrating all services

### Development & Testing

- **TECH-025**: Both backend and frontend MUST follow Test-Driven Development (TDD) practices
- **TECH-026**: Backend MUST include unit tests for service layer logic
- **TECH-027**: Backend MUST include integration tests for API endpoint behavior
- **TECH-028**: Frontend MUST include component tests for UI components
- **TECH-029**: Frontend MUST include integration tests for critical user flows
- **TECH-030**: Tests MUST be runnable via npm/yarn scripts (e.g., `npm test`)

### Security & Data Isolation

- **TECH-031**: All API endpoints MUST require valid authentication tokens
- **TECH-032**: Backend MUST enforce data isolation by filtering all queries by authenticated user's person_id
- **TECH-033**: Backend MUST use secure session management with HTTP-only cookies or secure token storage
- **TECH-034**: Backend MUST sanitize and validate all user input to prevent injection attacks
- **TECH-035**: Database connection strings and OAuth secrets MUST be stored in environment variables, not committed to version control
