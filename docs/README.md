# Documentation

Start here when you need the project map, behavioral specs, or implementation references.

## Core project docs

- [Development guide](./DEVELOPMENT.md) — local setup, API notes, testing, and development workflow.
- [Requirements document](./Workstream%20Cockpit%20-%20Requirements%20Document.md) — product requirements and user stories.
- [Security specs](./security/README.md) — authentication, authorization, session, OAuth, and backup hardening behavior.
- [Changelog 002](./CHANGELOG-002.md) — timeline export feature notes.

## Security mental map

Security docs are organized by concern, not by implementation batch:

- [Authentication security](./security/authentication/README.md) — debug exposure, logout, sessions, Google OAuth admission.
- [Authorization security](./security/authorization/README.md) — project/user data boundaries.
- [Operational security](./security/operations/README.md) — safe operational command execution.

## Implementation reference paths

- Backend API: `backend/src/routes/`
- Backend services: `backend/src/services/`
- Backend config/middleware: `backend/src/config/`, `backend/src/middleware/`
- Backend tests: `backend/tests/`
- Runtime config examples: `.env.example`, `docker-compose.yml`
