<!--
Sync Impact Report
==================
Version Change: Initial version → 1.0.0
Ratification Type: Initial constitution establishment

Core Principles Established:
- I. Minimal Friction (speed and efficiency for core user flows)
- II. Test-Driven Development (TDD mandatory for all features)
- III. Data Integrity (transactional consistency and cascading deletes)
- IV. Simplicity First (avoid over-engineering and premature optimization)
- V. Security & Isolation (user data isolation and authentication)

Additional Sections:
- Technical Stack Requirements (enforces consistent technology choices)
- Development Workflow (TDD cycle, code organization, responsive design)

Templates Requiring Updates:
✅ .specify/templates/plan-template.md - Constitution check gates already present
✅ .specify/templates/spec-template.md - User scenario priority structure aligns
✅ .specify/templates/tasks-template.md - TDD test-first workflow aligns

Follow-up TODOs: None - all placeholders filled

Commit Message Suggestion:
docs: establish constitution v1.0.0 for Workstream Cockpit (TDD + minimal friction + simplicity)
-->

# Workstream Cockpit Constitution

## Core Principles

### I. Minimal Friction

Speed is non-negotiable for core user flows. The cockpit view must load in <1 second, status updates must save in <500ms, and timeline view must load in <2 seconds. Every interaction that adds friction to the primary flows (daily cockpit scan, status update, create workstream, timeline review) must be justified against clear user value. Features that slow down these flows are rejected unless they solve a documented pain point.

**Rationale**: The tool exists to offload mental tracking burden. If using the tool requires more cognitive effort than mental tracking, it has failed its core mission. Engineering managers scan workstreams 5-10 times daily; every 100ms delay compounds into significant lost time.

### II. Test-Driven Development (NON-NEGOTIABLE)

All feature development follows strict TDD: tests written → tests fail → implementation → tests pass. This applies to both backend (unit + integration tests for services and API endpoints) and frontend (component tests + integration tests for user flows). No code is merged without accompanying tests that verify the feature's behavior.

**Rationale**: TDD prevents regressions in a system where data integrity is critical (status history must never be lost or corrupted). The cost of bugs in user-facing features (broken status updates, lost history) is unacceptable when the user has delegated memory to the system.

### III. Data Integrity

All database operations that affect multiple entities must use transactions. Cascading deletes must be explicitly defined (e.g., deleting a project deletes all workstreams, tags, and status updates). Data relationships must be enforced at the database level with foreign key constraints. Orphaned records are bugs.

**Rationale**: Users must trust the system enough to stop mental tracking. Any data inconsistency (orphaned status updates, mismatched relationships) destroys that trust. Historical status data is the core value proposition and must be preserved accurately.

### IV. Simplicity First

Start with the minimal solution that solves the documented user need. Reject abstractions, patterns, or frameworks not justified by current requirements. No features for hypothetical future needs. No premature optimization. The codebase should be readable and maintainable by a single engineer.

**Rationale**: This is a personal productivity tool, not enterprise software. Over-engineering increases maintenance burden, slows development, and creates complexity that doesn't serve the core mission (fast status tracking with reliable history).

### V. Security & Isolation

All data is scoped to the authenticated user. Every API endpoint requires authentication. Users can only access their own projects, workstreams, tags, and status updates. HTTPS is mandatory. Google OAuth is the single authentication mechanism.

**Rationale**: User workstream data may contain sensitive project details. Multi-tenancy isolation failures could leak confidential information. Simple, proven authentication (Google OAuth) reduces attack surface compared to custom auth systems.

## Technical Stack Requirements

**Enforced Technology Choices:**
- Backend: Node.js with TypeScript OR Python with FastAPI
- Frontend: React with TypeScript
- Database: PostgreSQL with explicit foreign key constraints
- ORM: Prisma (Node) OR SQLAlchemy (Python) with migration support
- State Management: React Query or equivalent server-state library
- Styling: Tailwind CSS or similar utility-first approach
- Deployment: Docker containers on VM infrastructure

**Rationale**: Stack consistency ensures single-engineer maintainability. TypeScript on both frontend and backend reduces context switching. PostgreSQL provides ACID guarantees needed for data integrity. Docker ensures deployment consistency.

## Development Workflow

**TDD Cycle:**
1. Write test for new feature (contract test for API, integration test for user flow)
2. Verify test fails
3. Implement minimum code to pass test
4. Refactor while keeping tests green
5. No merges without tests

**Code Organization:**
- Monolith architecture with separated frontend/backend services
- Backend: routes → services → models (no business logic in routes)
- Frontend: pages → components → hooks → api (no data fetching in components)
- Explicit file structure defined in project documentation
- Tests mirror source structure (tests/unit/, tests/integration/, tests/contract/)

**Responsive Design:**
- Desktop-first (primary use case)
- Mobile browser support required but read-only acceptable for MVP
- All layouts must work on 320px width minimum
- No native mobile apps (deferred unless proven essential)

**Performance Gates:**
- Cockpit load: <1 second (fail if exceeded)
- Status update save: <500ms (fail if exceeded)
- Timeline load (1 year data): <2 seconds (fail if exceeded)

**UI/UX Standards:**
- High information density on cockpit view (15-20 workstreams visible without scrolling on 1080p display)
- One-click access to status update dialog from cockpit
- Clean, readable UI with no decorative styling that doesn't serve function
- Color-coding by tag must be visually distinct for 8+ tags

## Governance

This constitution supersedes all other practices and guides all architectural, implementation, and design decisions. Amendments require:
1. Documentation of the specific problem or limitation in the current constitution
2. Proposed amendment with clear rationale
3. Review of impact on existing codebase and templates
4. Version increment according to semantic versioning rules

**Compliance Verification:**
- All PRs must verify adherence to TDD workflow (tests present and passing)
- Code reviews must check for violations of Simplicity First principle
- Performance gates must be validated before merging user-facing features
- Security isolation must be verified in all new API endpoints

**Complexity Justification:**
Any violation of these principles (e.g., adding repository pattern, introducing additional abstraction layers, adding non-required features) must be documented in the feature's plan.md with:
- Specific need that simple approach cannot address
- Why the simpler alternative was rejected
- Maintenance cost assessment

**Version**: 1.0.0 | **Ratified**: 2025-12-30 | **Last Amended**: 2025-12-30
