# Tasks: Workstream Cockpit - Phase 1 Core Functionality

**Input**: Design documents from `/specs/001-cockpit-core/`
**Prerequisites**: plan.md, spec.md

**Tests**: Tests are included following TDD approach per plan.md requirements (80% backend coverage, 70% frontend coverage)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Root**: Docker configs, documentation at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create monorepo structure with /backend and /frontend directories
- [X] T002 [P] Initialize backend Node.js/TypeScript project with package.json in backend/
- [X] T003 [P] Initialize frontend React/TypeScript project with Vite in frontend/
- [X] T004 [P] Configure TypeScript for backend in backend/tsconfig.json
- [X] T005 [P] Configure TypeScript for frontend in frontend/tsconfig.json
- [X] T006 [P] Set up ESLint and Prettier for backend in backend/.eslintrc.js
- [X] T007 [P] Set up ESLint and Prettier for frontend in frontend/.eslintrc.js
- [X] T008 Create root package.json with workspace scripts
- [X] T009 [P] Configure Tailwind CSS in frontend/tailwind.config.js
- [X] T010 [P] Set up Jest testing framework in backend/jest.config.js
- [X] T011 [P] Set up Vitest and React Testing Library in frontend/vitest.config.ts
- [X] T012 Create .env.example templates for backend and frontend
- [X] T013 Create .gitignore for Node.js and environment files
- [X] T014 Initialize README.md with project overview and setup instructions

**Checkpoint**: Basic project structure ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Schema

- [X] T015 Initialize Prisma in backend/ and configure PostgreSQL connection in backend/prisma/schema.prisma
- [X] T016 Create Person model in backend/prisma/schema.prisma
- [X] T017 Create Project model in backend/prisma/schema.prisma
- [X] T018 Create Tag model in backend/prisma/schema.prisma
- [X] T019 Create Workstream model in backend/prisma/schema.prisma
- [X] T020 Create StatusUpdate model in backend/prisma/schema.prisma
- [X] T021 Generate Prisma client and create initial migration
- [X] T022 Test database connection and migrations

### Backend Foundation

- [X] T023 Create Express.js server setup in backend/src/server.ts
- [X] T024 [P] Create health check endpoint in backend/src/routes/health.ts
- [X] T025 [P] Create error handling middleware in backend/src/middleware/errorHandler.ts
- [X] T026 [P] Create logging configuration in backend/src/utils/logger.ts
- [X] T027 Configure CORS and body parsing middleware in backend/src/server.ts
- [X] T028 Create database client wrapper in backend/src/utils/db.ts
- [X] T029 Set up express-session configuration in backend/src/middleware/session.ts

### Frontend Foundation

- [X] T030 Create Vite configuration with TypeScript path aliases in frontend/vite.config.ts
- [X] T031 [P] Create basic App component in frontend/src/App.tsx
- [X] T032 [P] Set up React Router in frontend/src/router.tsx
- [X] T033 [P] Configure React Query client in frontend/src/lib/queryClient.ts
- [X] T034 [P] Create base layout components (Header, Container) in frontend/src/components/Layout/
- [X] T035 [P] Set up Tailwind base styles in frontend/src/index.css
- [X] T036 Create placeholder pages in frontend/src/pages/ (Login, Cockpit, Timeline, Archive)
- [X] T037 Create API client utility in frontend/src/api/client.ts

### Docker Infrastructure

- [X] T038 Create Dockerfile for backend in backend/Dockerfile
- [X] T039 Create Dockerfile for frontend in frontend/Dockerfile
- [X] T040 Create docker-compose.yml with backend, frontend, and PostgreSQL services
- [X] T041 Configure nginx reverse proxy config in nginx/nginx.conf
- [X] T042 Test full stack startup with docker-compose up
- [X] T043 Document Docker setup and port mappings in README.md

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 4 - Authenticate with Google (Priority: P1) 🎯 MVP Foundation

**Goal**: Implement Google OAuth authentication with automatic Person and Project creation on first login

**Independent Test**: Visit app, click "Sign in with Google", complete OAuth flow, verify Person and default Project created, verify session persists

### Tests for User Story 4

- [X] T044 [P] [US4] Create unit test for OAuth callback handler in backend/tests/unit/auth.test.ts
- [X] T045 [P] [US4] Create integration test for Google OAuth flow in backend/tests/integration/auth.test.ts
- [X] T046 [P] [US4] Create component test for Login page in frontend/tests/components/Login.test.tsx
- [X] T047 [P] [US4] Create integration test for authentication flow in frontend/tests/integration/auth.test.tsx

### Implementation for User Story 4

- [X] T048 [US4] Configure passport-google-oauth20 strategy in backend/src/config/passport.ts
- [X] T049 [US4] Create auth routes (/auth/google, /auth/google/callback, /auth/logout) in backend/src/routes/auth.ts
- [X] T050 [US4] Implement auto-create Person service in backend/src/services/personService.ts
- [X] T051 [US4] Implement auto-create default Project service in backend/src/services/projectService.ts
- [X] T052 [US4] Create default tags creation service in backend/src/services/tagService.ts
- [X] T053 [US4] Create authentication middleware in backend/src/middleware/auth.ts
- [X] T054 [US4] Create user context middleware in backend/src/middleware/userContext.ts
- [X] T055 [US4] Create Login page with Google OAuth button in frontend/src/pages/Login.tsx
- [X] T056 [US4] Create AuthContext for user state management in frontend/src/contexts/AuthContext.tsx
- [X] T057 [US4] Create authenticated route wrapper in frontend/src/components/ProtectedRoute.tsx
- [X] T058 [US4] Implement OAuth callback handler in frontend/src/pages/OAuthCallback.tsx
- [X] T059 [US4] Add logout functionality to Header component in frontend/src/components/Layout/Header.tsx
- [X] T060 [US4] Test session persistence across browser restarts
- [X] T061 [US4] Test data isolation with multiple user sessions

**Checkpoint**: Authentication complete - users can log in with Google and have a default project created

---

## Phase 4: User Story 2 - Daily Cockpit Review (Priority: P1) 🎯 MVP Core

**Goal**: Display all active workstreams in a glanceable cockpit view with current status, tag colors, and timestamps

**Independent Test**: Create multiple workstreams with different statuses and tags, view cockpit, verify all display correctly with current status and tag colors

### Tests for User Story 2

- [X] T062 [P] [US2] Create unit test for workstream list service in backend/tests/unit/workstreamService.test.ts
- [X] T063 [P] [US2] Create integration test for GET /api/workstreams in backend/tests/integration/workstreams.test.ts
- [X] T064 [P] [US2] Create component test for Cockpit page in frontend/tests/components/Cockpit.test.tsx
- [X] T065 [P] [US2] Create component test for WorkstreamCard in frontend/tests/components/WorkstreamCard.test.tsx

### Implementation for User Story 2

- [X] T066 [P] [US2] Create Workstream service for listing active workstreams in backend/src/services/workstreamService.ts
- [X] T067 [US2] Create GET /api/workstreams endpoint with active filter in backend/src/routes/workstreams.ts
- [X] T068 [US2] Create Cockpit page component in frontend/src/pages/Cockpit.tsx
- [X] T069 [US2] Create WorkstreamCard component in frontend/src/components/Workstream/WorkstreamCard.tsx
- [X] T070 [US2] Implement tag color indicator in WorkstreamCard
- [X] T071 [US2] Implement skeleton loading states in frontend/src/components/Workstream/WorkstreamSkeleton.tsx
- [X] T072 [US2] Create useWorkstreams hook in frontend/src/hooks/useWorkstreams.ts
- [X] T073 [US2] Style cockpit for glanceable design with Tailwind CSS
- [X] T074 [US2] Test cockpit with 0, 1, 10, 20 workstreams

**Checkpoint**: Cockpit view displays all active workstreams - users can scan their work at a glance

---

## Phase 5: User Story 1 - Quick Status Update (Priority: P1) 🎯 MVP Critical

**Goal**: Enable users to quickly update workstream status with minimal friction (click → type → save)

**Independent Test**: Click update button on workstream, enter new status, save, verify status appears in cockpit with timestamp

### Tests for User Story 1

- [X] T075 [P] [US1] Create unit test for status update service in backend/tests/unit/statusUpdateService.test.ts
- [X] T076 [P] [US1] Create integration test for POST /api/status-updates in backend/tests/integration/statusUpdates.test.ts
- [X] T077 [P] [US1] Create component test for StatusUpdateDialog in frontend/tests/components/StatusUpdateDialog.test.tsx
- [X] T078 [P] [US1] Create integration test for status update flow in frontend/tests/integration/statusUpdate.test.tsx

### Implementation for User Story 1

- [X] T079 [P] [US1] Create StatusUpdate service in backend/src/services/statusUpdateService.ts
- [X] T080 [US1] Create POST /api/status-updates endpoint in backend/src/routes/statusUpdates.ts
- [X] T081 [US1] Add validation for status text (max 500 chars) and note (max 2000 chars)
- [X] T082 [US1] Create StatusUpdateDialog component in frontend/src/components/StatusUpdate/StatusUpdateDialog.tsx
- [X] T083 [US1] Implement status input with character counter
- [X] T084 [US1] Implement optional note field in dialog
- [X] T085 [US1] Add Save button and Cmd/Ctrl+Enter keyboard shortcut
- [X] T086 [US1] Implement optimistic UI updates with React Query
- [X] T087 [US1] Add inline spinner during save operation
- [X] T088 [US1] Handle save errors with retry option
- [X] T089 [US1] Update WorkstreamCard to show Update button
- [X] T090 [US1] Test status update flow end-to-end

**Checkpoint**: Users can quickly update workstream status from cockpit view

---

## Phase 6: User Story 3 - Create New Workstream (Priority: P2)

**Goal**: Allow users to create new workstreams with name, optional tag, and optional initial status

**Independent Test**: Click "New Workstream", enter name and optional status, save, verify workstream appears in cockpit

### Tests for User Story 3

- [X] T091 [P] [US3] Create unit test for workstream creation service in backend/tests/unit/workstreamService.test.ts
- [X] T092 [P] [US3] Create integration test for POST /api/workstreams in backend/tests/integration/workstreams.test.ts
- [X] T093 [P] [US3] Create component test for WorkstreamCreateDialog in frontend/tests/components/WorkstreamCreateDialog.test.tsx

### Implementation for User Story 3

- [X] T094 [P] [US3] Extend workstream service to handle creation in backend/src/services/workstreamService.ts
- [X] T095 [US3] Create POST /api/workstreams endpoint in backend/src/routes/workstreams.ts
- [X] T096 [US3] Implement logic to create initial StatusUpdate if status provided
- [X] T097 [US3] Add validation for workstream name (required, max 200 chars) and context (max 2000 chars)
- [X] T098 [US3] Create WorkstreamCreateDialog component in frontend/src/components/Workstream/WorkstreamCreateDialog.tsx
- [X] T099 [US3] Implement name input with validation in create dialog
- [X] T100 [US3] Add optional tag selector in create dialog
- [X] T101 [US3] Add optional initial status field in create dialog
- [X] T102 [US3] Add optional context field in create dialog
- [X] T103 [US3] Implement form validation and error display
- [X] T104 [US3] Add "New Workstream" button to Cockpit page
- [X] T105 [US3] Test workstream creation flow end-to-end

**Checkpoint**: Users can create new workstreams and start tracking them

---

## Phase 7: User Story 5 - Manage Tags (Priority: P2)

**Goal**: Allow users to create, edit, and delete tags for categorizing workstreams

**Independent Test**: Create new tag with name and color, assign to workstream, verify color indicator appears in cockpit

### Tests for User Story 5

- [X] T106 [P] [US5] Create unit test for tag service in backend/tests/unit/tagService.test.ts
- [X] T107 [P] [US5] Create integration test for tag endpoints in backend/tests/integration/tags.test.ts
- [X] T108 [P] [US5] Create component test for TagManagement in frontend/tests/components/TagManagement.test.tsx

### Implementation for User Story 5

- [X] T109 [P] [US5] Extend tag service with CRUD operations in backend/src/services/tagService.ts
- [X] T110 [US5] Create tag routes (GET, POST, PUT, DELETE) in backend/src/routes/tags.ts
- [X] T111 [US5] Add validation for tag name (max 100 chars) and color (hex code)
- [X] T112 [US5] Implement tag deletion logic (unset from workstreams) in backend/src/services/tagService.ts
- [X] T113 [US5] Handle tag sort_order updates in backend/src/services/tagService.ts
- [X] T114 [US5] Create TagManagement page/dialog in frontend/src/pages/TagManagement.tsx
- [X] T115 [US5] Display list of existing tags with colors in TagManagement
- [X] T116 [US5] Implement tag creation form in TagManagement
- [X] T117 [US5] Implement tag editing (name and color) in TagManagement
- [X] T118 [US5] Add color picker component in frontend/src/components/ColorPicker/ColorPicker.tsx
- [X] T119 [US5] Implement tag deletion with confirmation dialog
- [X] T120 [US5] Add tag reordering functionality (drag-and-drop or buttons)
- [X] T121 [US5] Test default tags created with new project
- [X] T122 [US5] Test tag management operations end-to-end

**Checkpoint**: Users can manage tags for visual organization of workstreams

---

## Phase 8: User Story 6 - View Status History (Priority: P2)

**Goal**: Display chronological history of all status updates for a workstream

**Independent Test**: Create multiple status updates for a workstream, view workstream detail, see all updates in chronological order with timestamps

### Tests for User Story 6

- [X] T123 [P] [US6] Create unit test for status history retrieval in backend/tests/unit/statusUpdateService.test.ts
- [X] T124 [P] [US6] Create integration test for GET /api/workstreams/:id/status-updates in backend/tests/integration/statusUpdates.test.ts
- [X] T125 [P] [US6] Create component test for WorkstreamDetail in frontend/tests/components/WorkstreamDetail.test.tsx

### Implementation for User Story 6

- [X] T126 [P] [US6] Create status history retrieval service in backend/src/services/statusUpdateService.ts
- [X] T127 [US6] Create GET /api/workstreams/:id/status-updates endpoint in backend/src/routes/statusUpdates.ts
- [X] T128 [US6] Create PUT /api/status-updates/:id endpoint for editing in backend/src/routes/statusUpdates.ts
- [X] T129 [US6] Create WorkstreamDetail page in frontend/src/pages/WorkstreamDetail.tsx
- [X] T130 [US6] Display workstream metadata (name, tag, context, state) in WorkstreamDetail
- [X] T131 [US6] Display chronological list of status updates in WorkstreamDetail
- [X] T132 [US6] Show timestamps and "updated" indicator for edited statuses
- [X] T133 [US6] Add edit buttons for workstream metadata
- [X] T134 [US6] Add edit buttons for individual status updates
- [X] T135 [US6] Implement inline editing or edit dialogs for status updates
- [X] T136 [US6] Test status history display and editing end-to-end

**Checkpoint**: Users can view complete status history for any workstream

---

## Phase 9: User Story 7 - Timeline View for Reporting (Priority: P2)

**Goal**: Show all status updates across workstreams in chronological order with date filtering for meeting preparation

**Independent Test**: Create status updates across multiple workstreams, view timeline filtered by "This week", see consolidated chronological view

### Tests for User Story 7

- [X] T137 [P] [US7] Create unit test for timeline service in backend/tests/unit/timelineService.test.ts
- [X] T138 [P] [US7] Create integration test for GET /api/timeline in backend/tests/integration/timeline.test.ts
- [X] T139 [P] [US7] Create component test for Timeline page in frontend/tests/components/Timeline.test.tsx
- [X] T140 [P] [US7] Create component test for FilterBar in frontend/tests/components/FilterBar.test.tsx

### Implementation for User Story 7

- [X] T141 [P] [US7] Create timeline service in backend/src/services/timelineService.ts
- [X] T142 [US7] Create GET /api/timeline endpoint with date filtering in backend/src/routes/timeline.ts
- [X] T143 [US7] Implement filtering by date range (today, this week, last 7 days, custom)
- [X] T144 [US7] Add optional tag filtering to timeline endpoint
- [X] T145 [US7] Include workstream name and tag color in timeline response
- [X] T146 [US7] Create Timeline page component in frontend/src/pages/Timeline.tsx
- [X] T147 [US7] Display timeline entries grouped by date with date headers
- [X] T148 [US7] Show workstream name, tag color, status text, and timestamp for each entry
- [X] T149 [US7] Create FilterBar component in frontend/src/components/Timeline/FilterBar.tsx
- [X] T150 [US7] Implement preset filters (Today, This week, Last 7 days) in FilterBar
- [X] T151 [US7] Add custom date range picker to FilterBar
- [X] T152 [US7] Add tag filter (multi-select or dropdown) to FilterBar
- [X] T153 [US7] Update timeline query on filter changes
- [X] T154 [US7] Persist filter state in URL query params
- [X] T155 [US7] Style timeline for meeting readability
- [X] T156 [US7] Implement skeleton loading states for timeline
- [X] T157 [US7] Test timeline with various data volumes (10, 50, 100 entries)

**Checkpoint**: Users can quickly prepare for meetings using filtered timeline view

---

## Phase 10: User Story 8 - Close Completed Workstreams (Priority: P3)

**Goal**: Allow users to close workstreams when complete and view them in an archive

**Independent Test**: Create workstream, close it, verify it no longer appears in active cockpit but is accessible in archive view

### Tests for User Story 8

- [X] T158 [P] [US8] Create unit test for workstream close/reopen in backend/tests/unit/workstreamService.test.ts
- [X] T159 [P] [US8] Create integration test for PUT /api/workstreams/:id/close in backend/tests/integration/workstreams.test.ts
- [X] T160 [P] [US8] Create component test for Archive page in frontend/tests/components/Archive.test.tsx

### Implementation for User Story 8

- [X] T161 [P] [US8] Implement close workstream service in backend/src/services/workstreamService.ts
- [X] T162 [P] [US8] Implement reopen workstream service in backend/src/services/workstreamService.ts
- [X] T163 [US8] Create PUT /api/workstreams/:id/close endpoint in backend/src/routes/workstreams.ts
- [X] T164 [US8] Create PUT /api/workstreams/:id/reopen endpoint in backend/src/routes/workstreams.ts
- [X] T165 [US8] Update GET /api/workstreams to filter by state (active/closed)
- [X] T166 [US8] Add Close action to WorkstreamDetail page
- [X] T167 [US8] Add Close action to WorkstreamCard (inline menu or button)
- [X] T168 [US8] Create Archive page component in frontend/src/pages/Archive.tsx
- [X] T169 [US8] Display closed workstreams with closed_at timestamp in Archive
- [X] T170 [US8] Add Reopen action to Archive page
- [X] T171 [US8] Add navigation link to Archive view in Header
- [X] T172 [US8] Test close and reopen flow end-to-end

**Checkpoint**: All user stories complete - users can manage full workstream lifecycle

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, testing, and deployment preparation

### Error Handling & Reliability

- [X] T173 [P] Implement retry logic with exponential backoff in frontend/src/api/client.ts
- [X] T174 [P] Add user-facing error messages for all failure scenarios in frontend/src/components/ErrorMessage/
- [X] T175 [P] Add manual retry buttons on error states
- [X] T176 Test network failure scenarios across all features
- [X] T177 Test concurrent edit scenarios (last-write-wins verification)
- [X] T178 [P] Add error logging for debugging in backend/src/utils/logger.ts

### Performance Optimization

- [X] T179 [P] Add database indexes for common queries in backend/prisma/schema.prisma
- [X] T180 [P] Review and optimize N+1 queries in backend services
- [X] T181 Implement pagination for timeline if needed
- [X] T182 [P] Optimize React component re-renders with memo/useMemo
- [X] T183 [P] Add caching headers for static assets in nginx config
- [X] T184 Profile and optimize frontend bundle size
- [X] T185 Test with realistic data volumes (20 workstreams, 500 status updates)

### End-to-End Testing

- [X] T186 [P] Write E2E test: Login → Create workstream → Update status → View cockpit
- [X] T187 [P] Write E2E test: Login → View timeline → Filter by date → Read updates
- [X] T188 [P] Write E2E test: Login → Create tag → Assign to workstream → View in cockpit
- [X] T189 [P] Write E2E test: Login → Close workstream → View archive → Reopen
- [X] T190 Run cross-browser tests (Chrome, Firefox, Safari)
- [X] T191 Test on mobile browsers (iOS Safari, Chrome Android)

### Documentation & Deployment

- [X] T192 [P] Update README with comprehensive setup instructions
- [X] T193 [P] Document all API endpoints in backend/docs/api.md or OpenAPI spec
- [X] T194 [P] Create deployment guide for VM in docs/deployment.md
- [X] T195 [P] Document environment variables in .env.example
- [X] T196 [P] Create database backup/restore procedures in docs/database.md
- [X] T197 [P] Write user guide / getting started docs in docs/user-guide.md
- [X] T198 Final code cleanup and refactoring
- [X] T199 Verify all success criteria from spec.md are met
- [X] T200 Final production deployment test

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-10)**: All depend on Foundational phase completion
  - User Story 4 (Auth) must complete before other stories can be fully tested
  - User Story 2 (Cockpit) and User Story 1 (Status Update) can proceed in parallel after Auth
  - User Story 3-8 can proceed in parallel (if staffed) after Auth and Cockpit complete
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 4 (Auth - P1)**: No dependencies on other stories (but needs Foundational phase)
- **User Story 2 (Cockpit - P1)**: Needs Auth complete for testing, but can develop in parallel
- **User Story 1 (Status Update - P1)**: Needs Cockpit complete (update button in cockpit view)
- **User Story 3 (Create Workstream - P2)**: Needs Cockpit complete (new workstream appears in cockpit)
- **User Story 5 (Tags - P2)**: Needs Cockpit complete (tags display in cockpit)
- **User Story 6 (Status History - P2)**: Needs User Story 1 complete (status updates to display)
- **User Story 7 (Timeline - P2)**: Needs User Story 1 complete (status updates to display in timeline)
- **User Story 8 (Archive - P3)**: Needs Cockpit complete (closed workstreams disappear from cockpit)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD approach)
- Backend services before API endpoints
- API endpoints before frontend components
- Core components before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Test tasks within each user story marked [P] can run in parallel
- Backend and frontend tasks within a story can proceed in parallel
- After Auth completes: User Stories 2, 3, 5, 8 can start in parallel (different features)
- After Cockpit and Status Update complete: User Stories 6 and 7 can proceed in parallel
- All Polish phase tasks marked [P] can run in parallel

---

## Parallel Execution Examples

### Phase 2: Foundational - Backend Setup
```bash
# These can all run in parallel (different files):
T024: Health check endpoint
T025: Error handling middleware  
T026: Logging configuration
```

### Phase 2: Foundational - Frontend Setup
```bash
# These can all run in parallel (different files):
T031: App component
T032: React Router
T033: React Query client
T034: Layout components
T035: Tailwind styles
```

### User Story 4: Tests
```bash
# All tests for US4 can run in parallel:
T044: Unit test for OAuth callback
T045: Integration test for OAuth flow
T046: Component test for Login page
T047: Integration test for auth flow
```

### Multiple User Stories (After Auth Complete)
```bash
# These stories can proceed in parallel with different developers:
Developer A: User Story 2 (Cockpit)
Developer B: User Story 3 (Create Workstream)
Developer C: User Story 5 (Tags)
```

---

## Implementation Strategy

### MVP First (Essential User Stories Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 4 (Auth) - Foundation for all other work
4. Complete Phase 4: User Story 2 (Cockpit) - Core viewing capability
5. Complete Phase 5: User Story 1 (Status Update) - Core update capability
6. **STOP and VALIDATE**: Test Auth + Cockpit + Status Update flow independently
7. Deploy/demo MVP if ready

### Incremental Delivery (Recommended)

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 4 (Auth) → Test independently → Deploy/Demo (Authentication working!)
3. Add User Story 2 (Cockpit) + User Story 1 (Status Update) → Test independently → Deploy/Demo (MVP!)
4. Add User Story 3 (Create Workstream) → Test independently → Deploy/Demo
5. Add User Story 5 (Tags) → Test independently → Deploy/Demo
6. Add User Story 6 (Status History) + User Story 7 (Timeline) → Test independently → Deploy/Demo
7. Add User Story 8 (Archive) → Test independently → Deploy/Demo
8. Add Polish phase → Final deployment

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 4 (Auth)
3. Once Auth is done:
   - Developer A: User Story 2 (Cockpit)
   - Developer B: User Story 3 (Create Workstream)
   - Developer C: User Story 5 (Tags)
4. Once Cockpit is done:
   - Developer A: User Story 1 (Status Update)
   - Developer B: Continues User Story 3
   - Developer C: Continues User Story 5
5. After core stories (US1, US2, US3, US4, US5):
   - Developer A: User Story 6 (Status History)
   - Developer B: User Story 7 (Timeline)
   - Developer C: User Story 8 (Archive)
6. Team completes Polish phase together

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests follow TDD approach: write and verify failure before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total tasks: 200 (aligned with 12-15 week timeline estimate)
- Estimated MVP scope (US4 + US2 + US1): ~90 tasks (~6 weeks)
- Full Phase 1 scope (all 8 user stories): ~172 tasks (~12 weeks)
- Polish phase: ~28 tasks (~1.5 weeks)
