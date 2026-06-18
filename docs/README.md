# Documentation

Start here when you need setup details, implementation references, testing instructions, or security notes for Workstream Cockpit.

## Product and operations

- [Deployment and operations](./DEPLOYMENT.md) — Docker deployment, environment variables, Google OAuth, ports, backups, restore, and operational notes.
- [Development guide](./DEVELOPMENT.md) — local setup, hot-reload workflows, common commands, domain model, and implementation map.
- [Testing](./testing/README.md) — repeatable test setup, including the backend Postgres sidecar.

## Product reference

- [Requirements document](./Workstream%20Cockpit%20-%20Requirements%20Document.md) — product requirements and user stories.
- [Changelog 002](./CHANGELOG-002.md) — timeline export feature notes.
- [Screenshots](./screenshots/) — current UI captures used by the README and docs.

## Security

Security docs are organized by concern, not by implementation batch:

- [Security specs](./security/README.md) — security overview.
- [Authentication security](./security/authentication/README.md) — debug exposure, logout, sessions, and Google OAuth admission.
- [Authorization security](./security/authorization/README.md) — project/user data boundaries.
- [Operational security](./security/operations/README.md) — safe operational command execution.

## Implementation reference paths

- Backend API: `backend/src/routes/`
- Backend services: `backend/src/services/`
- Backend config/middleware: `backend/src/config/`, `backend/src/middleware/`
- Backend tests: `backend/tests/`
- Frontend app: `frontend/src/`
- Runtime config examples: `.env.example`, `docker-compose.yml`
