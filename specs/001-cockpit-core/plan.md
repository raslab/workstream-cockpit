# Development Plan: Workstream Cockpit - Phase 1 Core Functionality

**Feature Branch**: `001-cockpit-core`
**Created**: 2025-12-30
**Status**: Ready for Implementation
**Based on**: [spec.md](./spec.md)

---

## Executive Summary

This plan outlines the implementation strategy for Phase 1 of the Workstream Cockpit application - a personal productivity tool for tracking active workstreams with minimal friction. The implementation follows a structured approach prioritizing core user flows, authentication, and data management capabilities.

### Key Deliverables

- Full-stack TypeScript application (Node.js backend + React frontend)
- Google OAuth authentication system
- CRUD operations for Projects, Tags, Workstreams, and Status Updates
- Cockpit view (glanceable dashboard)
- Timeline view (reporting interface)
- Archive functionality for closed workstreams
- Docker-based deployment architecture

### Timeline Estimate

**Total Estimated Duration**: 12-15 weeks (3-4 months)

- **Phase 1 (Infrastructure)**: 2 weeks
- **Phase 2 (Authentication)**: 1.5 weeks
- **Phase 3 (Core Data)**: 3 weeks
- **Phase 4 (Primary Views)**: 3 weeks
- **Phase 5 (Timeline & Reporting)**: 2 weeks
- **Phase 6 (Polish & Testing)**: 1.5 weeks

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                   │
│                   (HTTPS Termination)                    │
└───────────────────┬─────────────────┬───────────────────┘
                    │                 │
        ┌───────────▼──────────┐  ┌──▼─────────────────┐
        │   Frontend Container │  │  Backend Container │
        │   (React + Vite)     │  │  (Node.js + TS)    │
        │   Internal: 5173     │  │  Internal: 3000    │
        │   Host: 3001         │  │  Host: 3000        │
        └──────────────────────┘  └──────┬─────────────┘
                                          │
                                  ┌───────▼──────────┐
                                  │   PostgreSQL DB  │
                                  │   Internal: 5432 │
                                  │   Host: 5433     │
                                  └──────────────────┘
```

### Technology Stack

**Backend**:
- Runtime: Node.js 20.x
- Language: TypeScript 5.x
- Framework: Express.js
- ORM: Prisma 5.x
- Database: PostgreSQL 15
- Auth: Google OAuth 2.0 (passport.js)
- Testing: Jest + Supertest

**Frontend**:
- Framework: React 18.x
- Language: TypeScript 5.x
- Build Tool: Vite 5.x
- Styling: Tailwind CSS
- State Management: React Query (TanStack Query)
- Routing: React Router 6.x
- Testing: Vitest + React Testing Library

**Infrastructure**:
- Containerization: Docker + Docker Compose
- Reverse Proxy: Nginx
- Deployment: Docker containers on VM

---

## Implementation Phases

### Phase 1: Infrastructure & Project Setup (2 weeks)

**Objective**: Establish foundational project structure, development environment, and deployment infrastructure.

#### Milestones

**M1.1: Monorepo Structure** (3 days)
- Create root project with `/backend`, `/frontend` directories
- Initialize TypeScript configuration for both services
- Set up ESLint, Prettier for code quality
- Create shared type definitions (if needed)
- Set up workspace scripts in root package.json

**M1.2: Backend Foundation** (3 days)
- Initialize Node.js/TypeScript project
- Configure Express.js server
- Set up Prisma with PostgreSQL
- Create initial database schema (Person, Project, Tag, Workstream, StatusUpdate)
- Implement database migrations
- Create basic health check endpoint (`/health`)
- Set up Jest testing framework

**M1.3: Frontend Foundation** (3 days)
- Initialize React + Vite project
- Configure TypeScript + path aliases
- Set up Tailwind CSS
- Create basic routing structure (placeholder pages)
- Set up React Query for server state
- Create basic layout components (Header, Container, etc.)
- Set up Vitest + React Testing Library

**M1.4: Docker & Deployment** (3 days)
- Create Dockerfile for backend
- Create Dockerfile for frontend
- Create docker-compose.yml orchestrating all services
  - Backend: Internal port 3000 → Host port 3000
  - Frontend: Internal port 5173 → Host port 3001
  - PostgreSQL: Internal port 5432 → Host port 5433
- Configure nginx reverse proxy
- Set up environment variable management (.env templates)
- Document local development setup in README.md
- Test full stack startup with `docker-compose up`

**Deliverables**:
- ✅ Working monorepo with backend and frontend projects
- ✅ Database schema migrations
- ✅ Docker-based local development environment
- ✅ CI-ready test suites (even if empty)
- ✅ Documentation for setup and running locally

**Success Criteria**:
- `docker-compose up` starts all services without errors
- Backend health endpoint returns 200 OK at http://localhost:3000
- Frontend loads in browser at http://localhost:3001
- PostgreSQL accessible at localhost:5433
- Database migrations run successfully
- Test command runs in both backend and frontend

---

### Phase 2: Authentication & User Management (1.5 weeks)

**Objective**: Implement Google OAuth authentication with automatic Person and Project creation.

#### Milestones

**M2.1: Google OAuth Backend** (2 days)
- Set up Google OAuth credentials (client ID, secret)
- Implement OAuth routes (`/auth/google`, `/auth/google/callback`)
- Configure passport-google-oauth20 strategy
- Implement session management (express-session or JWT)
- Create middleware for authentication verification
- Auto-create Person on first login
- Auto-create default Project on first login
- Create default Tags for new Project
- Write unit tests for auth service layer

**M2.2: Google OAuth Frontend** (2 days)
- Create Login page with "Sign in with Google" button
- Implement OAuth redirect flow
- Store authentication token/session
- Create authenticated route wrapper/guard
- Create AuthContext for user state management
- Handle OAuth callback and redirect to cockpit
- Add logout functionality
- Write component tests for login flow

**M2.3: Data Isolation & Security** (2 days)
- Implement middleware to attach user context to requests
- Create database query helpers that auto-filter by person_id
- Add authorization checks on all API endpoints
- Implement session expiration (30 days with refresh)
- Test concurrent user sessions
- Write integration tests for data isolation
- Security audit: input validation, XSS prevention, CSRF tokens

**Deliverables**:
- ✅ Google OAuth login flow (end-to-end)
- ✅ Automatic Person record creation on first login
- ✅ Automatic Project + default Tags creation
- ✅ Session persistence across browser restarts
- ✅ Protected API endpoints requiring authentication
- ✅ Data isolation enforced at database query level

**Success Criteria**:
- User can log in with Google account and land on cockpit
- Person record created in database on first login
- Default Project with 4 tags ("project", "ongoing", "delegated", "watching") created
- Session persists for 30 days
- User cannot access other users' data
- Logout functionality works correctly

---

### Phase 3: Core Data Management (3 weeks)

**Objective**: Implement CRUD operations for Projects, Tags, and Workstreams with Status Updates.

#### Milestones

**M3.1: Project Management API** (2 days)
- Create `/api/projects` endpoints (GET, POST, PUT)
- Implement service layer for project CRUD operations
- Add validation (project name required, max length 200 chars)
- Add project switcher context to API requests
- Write unit tests for project service
- Write integration tests for project API endpoints

**M3.2: Tag Management API** (3 days)
- Create `/api/tags` endpoints (GET, POST, PUT, DELETE)
- Implement service layer for tag CRUD operations
- Add validation (name max 100 chars, color hex code)
- Implement tag deletion (unset from workstreams, no cascade)
- Handle tag sort_order updates
- Write unit tests for tag service
- Write integration tests for tag API endpoints
- Test default tag creation on project creation

**M3.3: Workstream Management API** (4 days)
- Create `/api/workstreams` endpoints (GET, POST, PUT, DELETE)
- Implement service layer for workstream CRUD operations
- Add validation (name required max 200 chars, context max 2000 chars)
- Implement state transitions (active ↔ closed)
- Handle initial StatusUpdate creation if status provided on create
- Implement filtering (active vs closed)
- Add tag assignment/unassignment
- Write unit tests for workstream service
- Write integration tests for workstream API endpoints

**M3.4: Status Update API** (4 days)
- Create `/api/status-updates` endpoints (GET, POST, PUT, DELETE)
- Implement service layer for status update CRUD operations
- Add validation (status max 500 chars, note max 2000 chars)
- Track created_at and updated_at timestamps
- Implement status update history retrieval (per workstream)
- Handle edit detection (show "updated" indicator)
- Write unit tests for status update service
- Write integration tests for status update API endpoints

**Deliverables**:
- ✅ Complete RESTful API for all core entities
- ✅ Validation enforced on all inputs
- ✅ Database constraints match validation rules
- ✅ Comprehensive test coverage (unit + integration)
- ✅ API documentation (inline comments or OpenAPI spec)

**Success Criteria**:
- All CRUD operations work via API calls (testable with Postman/curl)
- Validation errors return clear error messages
- Database maintains referential integrity
- Character limits enforced correctly
- Default tags created automatically with new projects
- Initial status update created when provided during workstream creation

---

### Phase 4: Primary User Views (3 weeks)

**Objective**: Build Cockpit view, Workstream detail view, and all associated UI components.

#### Milestones

**M4.1: Cockpit View - Read Only** (3 days)
- Create Cockpit page component
- Fetch and display list of active workstreams
- Display workstream name, current status, tag color, timestamp
- Implement skeleton loading states
- Create WorkstreamCard component
- Style with Tailwind CSS (glanceable design)
- Write component tests for Cockpit page
- Test with 0, 1, 10, 20 workstreams

**M4.2: Status Update Dialog** (3 days)
- Create StatusUpdateDialog component
- Display previous status for reference
- Implement status input (textarea, max 500 chars)
- Implement optional note field (max 2000 chars)
- Add Save button and keyboard shortcut (Cmd/Ctrl+Enter)
- Add Cancel button
- Implement optimistic UI updates
- Show inline spinner during save
- Handle save errors with retry option
- Write component tests for dialog interactions

**M4.3: Workstream Creation** (3 days)
- Create WorkstreamCreateDialog component
- Implement name input (required, max 200 chars)
- Add optional tag selector
- Add optional initial status field
- Add optional context field (max 2000 chars)
- Implement form validation
- Handle creation and redirect/refresh
- Write component tests for creation flow

**M4.4: Workstream Detail View** (3 days)
- Create WorkstreamDetail page
- Display workstream metadata (name, tag, context, state)
- Show status update history (chronological list)
- Add Edit buttons for workstream metadata
- Add Edit buttons for individual status updates
- Implement inline editing or edit dialogs
- Add Close/Reopen workstream actions
- Write component tests for detail view

**M4.5: Tag Management UI** (3 days)
- Create TagManagement page/dialog
- Display list of existing tags with colors
- Implement tag creation form
- Implement tag editing (name, color)
- Add color picker component
- Implement tag deletion with confirmation
- Handle tag reordering (drag-and-drop or up/down buttons)
- Write component tests for tag management

**Deliverables**:
- ✅ Fully functional Cockpit view
- ✅ Status update creation and editing
- ✅ Workstream creation and editing
- ✅ Tag management interface
- ✅ Responsive design (desktop + mobile)
- ✅ Loading states and error handling

**Success Criteria**:
- User can scan cockpit and identify all active workstreams in <10 seconds
- User can update status from cockpit in <30 seconds
- User can create new workstream in <20 seconds
- All forms validate correctly and show clear error messages
- UI works on desktop (1920x1080) and mobile (375x667) viewports
- Skeleton screens appear during loading

---

### Phase 5: Timeline & Reporting (2 weeks)

**Objective**: Implement Timeline view for cross-workstream reporting with filtering.

#### Milestones

**M5.1: Timeline API** (2 days)
- Create `/api/timeline` endpoint
- Implement query logic to fetch all status updates across workstreams
- Add filtering by date range (today, this week, last 7 days, custom)
- Add filtering by tag (optional)
- Include workstream name and tag color in response
- Sort by created_at descending
- Write unit tests for timeline service
- Write integration tests for timeline API endpoint

**M5.2: Timeline View** (3 days)
- Create Timeline page component
- Fetch and display timeline entries
- Group entries by date with date headers
- Display workstream name, tag color, status text, timestamp
- Implement skeleton loading states
- Style for readability (optimized for reading aloud)
- Write component tests for Timeline page
- Test with various data volumes (10, 50, 100 entries)

**M5.3: Timeline Filtering** (3 days)
- Create FilterBar component with date range selector
- Implement preset filters (Today, This week, Last 7 days)
- Add custom date range picker
- Add tag filter (multi-select or dropdown)
- Update timeline query on filter changes
- Persist filter state in URL query params
- Write component tests for filtering interactions

**M5.4: Archive View** (2 days)
- Create Archive page component
- Fetch and display closed workstreams
- Show closed_at timestamp
- Add Reopen action
- Add link to view full workstream detail
- Write component tests for Archive page

**Deliverables**:
- ✅ Timeline view showing all status updates
- ✅ Date range filtering (presets + custom)
- ✅ Tag filtering
- ✅ Archive view for closed workstreams
- ✅ Reopen functionality

**Success Criteria**:
- User can prepare for weekly status meeting by reviewing timeline in <2 minutes
- Timeline loads with 1 year of data in <2 seconds
- Filters update timeline view instantly
- Archive view clearly separates closed from active workstreams
- Reopened workstreams return to active state and appear in cockpit

---

### Phase 6: Polish, Performance & Testing (1.5 weeks)

**Objective**: Final QA, performance optimization, error handling refinement, and comprehensive testing.

#### Milestones

**M6.1: Error Handling & Reliability** (2 days)
- Implement retry logic with exponential backoff (2-3 attempts)
- Add user-facing error messages for all failure scenarios
- Add manual retry buttons on error states
- Test network failure scenarios
- Test concurrent edit scenarios (last-write-wins)
- Add logging for debugging production issues

**M6.2: Performance Optimization** (2 days)
- Optimize database queries (add indexes, review N+1 queries)
- Implement pagination for timeline (if needed for large datasets)
- Optimize React component re-renders
- Add caching headers for static assets
- Profile and optimize bundle size
- Test with realistic data volumes (20 workstreams, 500 status updates)

**M6.3: End-to-End Testing** (2 days)
- Write E2E tests for critical user flows:
  - Login → Create workstream → Update status → View cockpit
  - Login → View timeline → Filter by date → Read updates
  - Login → Create tag → Assign to workstream → View in cockpit
  - Login → Close workstream → View archive → Reopen
- Run cross-browser tests (Chrome, Firefox, Safari)
- Test on mobile browsers (iOS Safari, Chrome Android)

**M6.4: Documentation & Deployment Prep** (2 days)
- Update README with setup instructions
- Document API endpoints (inline or OpenAPI spec)
- Create deployment guide for VM
- Document environment variables
- Create database backup/restore procedures
- Write user guide / getting started docs

**Deliverables**:
- ✅ Robust error handling with retry logic
- ✅ Optimized performance meeting success criteria
- ✅ Comprehensive E2E test coverage
- ✅ Complete documentation (technical + user)
- ✅ Production-ready deployment package

**Success Criteria**:
- All success criteria from spec.md are met:
  - Cockpit loads in <1 second
  - Status updates save in <500ms
  - Timeline loads 1 year of data in <2 seconds
  - Users can scan cockpit in <10 seconds
  - Users can update status in <30 seconds
  - Users can prepare for meeting using timeline in <2 minutes
- All E2E tests pass
- Application works on desktop and mobile browsers
- Error scenarios handled gracefully with clear user feedback

---

## Testing Strategy

### Test Pyramid

```
          ┌─────────────┐
          │   E2E (5%)  │  Critical user flows
          ├─────────────┤
          │ Integration │  API endpoints, component integration
          │    (25%)    │
          ├─────────────┤
          │    Unit     │  Service logic, utilities, hooks
          │    (70%)    │
          └─────────────┘
```

### Test Coverage Targets

- **Backend Unit Tests**: 80% coverage
  - All service layer methods
  - Validation functions
  - Authentication middleware
  - Database query helpers

- **Backend Integration Tests**: 100% of API endpoints
  - All CRUD operations
  - Authentication flows
  - Data isolation verification
  - Error scenarios

- **Frontend Component Tests**: 70% coverage
  - All reusable components
  - All page components
  - Form validation
  - User interactions

- **E2E Tests**: 100% of critical user flows
  - Authentication and first login
  - Create workstream with status
  - Update status from cockpit
  - View timeline with filters
  - Close and reopen workstream

### Test-Driven Development (TDD) Approach

For each feature:
1. Write failing test first (unit or integration)
2. Implement minimal code to pass test
3. Refactor for clarity and performance
4. Add edge case tests
5. Document test scenarios

---

## Risk Management

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Google OAuth configuration complexity | High | Allocate extra time in Phase 2; use proven libraries (passport.js) |
| Database schema changes breaking migrations | Medium | Use Prisma migrations; test migration rollback; maintain schema version history |
| Performance degradation with large datasets | Medium | Test with realistic data volumes early; implement pagination and indexes proactively |
| Cross-browser compatibility issues | Low | Test incrementally on target browsers; use well-supported libraries |
| Docker networking issues in deployment | Medium | Document networking setup; test deployment to staging environment before production |

### Schedule Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Underestimated complexity in OAuth flow | High | Front-load authentication work; allocate buffer time in Phase 2 |
| Scope creep adding features not in Phase 1 | Medium | Strictly adhere to spec.md requirements; defer nice-to-haves to Phase 2 |
| Testing takes longer than expected | Medium | Write tests alongside features (TDD); don't defer to end |
| Integration issues between frontend and backend | Medium | Define API contracts early; use TypeScript shared types; test integration continuously |

---

## Dependencies & Prerequisites

### External Dependencies

- Google OAuth 2.0 credentials (client ID, client secret)
- VM with Docker and Docker Compose installed
- Domain name for HTTPS access (or use localhost for dev)
- PostgreSQL-compatible hosting environment

### Internal Dependencies

- Phase 2 depends on Phase 1 (infrastructure must exist)
- Phase 3 depends on Phase 2 (authentication required for API access)
- Phase 4 depends on Phase 3 (UI consumes API endpoints)
- Phase 5 depends on Phase 4 (timeline extends cockpit functionality)

### Knowledge Prerequisites

- TypeScript development experience
- React and modern frontend development
- Node.js backend development
- PostgreSQL and SQL knowledge
- Docker and containerization basics
- OAuth 2.0 authentication flow understanding

---

## Deployment Strategy

### Environments

**Development** (Local):
- Run via `docker-compose up`
- Hot reload enabled for both frontend and backend
- In-memory or local PostgreSQL database
- HTTP (no HTTPS required)

**Staging** (Optional):
- Deployed to VM using docker-compose
- HTTPS via nginx reverse proxy
- Separate PostgreSQL instance
- Uses production-like configuration

**Production** (VM):
- Deployed to VM using docker-compose
- HTTPS via nginx reverse proxy
- PostgreSQL with regular backups
- Environment variables for secrets
- Monitoring and logging enabled

### Deployment Steps

1. **Build Docker Images**:
   ```bash
   docker-compose build
   ```

2. **Push to VM** (manual or via CI/CD):
   ```bash
   rsync -avz . user@vm:/path/to/app
   ```

3. **Run Database Migrations**:
   ```bash
   docker-compose run backend npm run migrate
   ```

4. **Start Services**:
   ```bash
   docker-compose up -d
   ```

5. **Verify Health**:
   ```bash
   curl https://your-domain.com/health
   ```

### Rollback Strategy

- Keep previous Docker images tagged with version numbers
- Maintain database migration rollback scripts
- Document manual rollback steps in deployment guide
- Test rollback procedure in staging environment

---

## Success Metrics (Post-Launch)

### Performance Metrics

- Cockpit view load time: <1 second (target from spec)
- Status update save time: <500ms (target from spec)
- Timeline view load time: <2 seconds with 1 year of data (target from spec)
- API response time (95th percentile): <200ms
- Frontend bundle size: <500KB gzipped

### User Success Metrics

- User can scan cockpit in <10 seconds (validated through user testing)
- User can update status in <30 seconds (validated through user testing)
- User can prepare for meeting using timeline in <2 minutes (validated through user testing)
- Daily active usage rate: Target 80% of registered users active weekly
- User retention: Target 90% of users continue using after 2 weeks

### Quality Metrics

- Test coverage: >80% backend, >70% frontend
- Zero critical bugs in production after 1 week
- <5% error rate on API requests
- 99% uptime (excluding planned maintenance)

---

## Open Questions & Decisions Needed

### Before Starting Implementation

1. **Google OAuth Setup**: Who will create and manage Google OAuth credentials?
2. **Domain/Hosting**: What domain will be used? Is the VM already provisioned?
3. **Environment Secrets**: How will sensitive environment variables be managed in production?
4. **Monitoring**: What monitoring/logging tools should be integrated (if any)?
5. **Backup Strategy**: What is the database backup frequency and retention policy?

### During Implementation

1. **Color Picker**: Which color picker library for tag color selection?
2. **Date Picker**: Which date picker library for timeline custom date range?
3. **Skeleton Screens**: Design specifics for loading states?
4. **Error Messages**: Standard error message format and tone?
5. **Session Storage**: JWT vs. session cookies for authentication?

---

## Next Steps

### Immediate Actions (Week 1)

1. **Set up development environment**:
   - Clone repository and create feature branch `001-cockpit-core`
   - Initialize monorepo structure
   - Configure TypeScript, ESLint, Prettier

2. **Provision Google OAuth credentials**:
   - Create Google Cloud Project
   - Enable Google OAuth API
   - Generate client ID and client secret
   - Configure authorized redirect URIs

3. **Initialize backend project**:
   - Set up Node.js + TypeScript + Express
   - Initialize Prisma with PostgreSQL
   - Create initial database schema

4. **Initialize frontend project**:
   - Set up React + Vite + TypeScript
   - Configure Tailwind CSS
   - Set up React Query and routing

5. **Create Docker configuration**:
   - Write Dockerfile for backend
   - Write Dockerfile for frontend
   - Create docker-compose.yml
   - Document local setup in README

### Review & Approval

- [ ] Specification reviewed and approved
- [ ] Development plan reviewed and approved
- [ ] Timeline and resource allocation confirmed
- [ ] Technical stack confirmed
- [ ] Google OAuth credentials obtained
- [ ] VM infrastructure confirmed available
- [ ] Ready to begin Phase 1 implementation

---

**Plan Version**: 1.0
**Last Updated**: 2025-12-30
**Approved By**: [Pending]
**Implementation Start Date**: [TBD]
