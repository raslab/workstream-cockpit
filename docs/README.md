# Documentation

Start here when you need setup details, implementation references, testing instructions, or security notes for Workstream Cockpit.

## Product and operations

- [Deployment and operations](./DEPLOYMENT.md) — Docker deployment, environment variables, Google OAuth, ports, backups, restore, and operational notes.
- [Development guide](./DEVELOPMENT.md) — local setup, hot-reload workflows, common commands, domain model, and implementation map.
- [Testing](./testing/README.md) — repeatable test setup, including the backend Postgres sidecar.

## Product reference

- [Product specs](./product/README.md) — durable product behavior and feature contracts.
- [Core concepts](./product/core-concepts.md) — streams, status updates, stream types, tags, views, and timeline.
- [Stream types](./product/stream-types.md) — primary stream classification; implemented as `Category` in the API/model.
- [Tags](./product/tags.md) — cross-cutting context labels and hashtag behavior.
- [Parent streams and sub-streams](./product/hierarchy-v1.md) — parent stream/sub-stream behavior and implementation contract.
- [Views](./product/views.md) — saved cockpit angles for filters, grouping, sorting, and hierarchy scope.
- [Timeline](./product/timeline.md) — activity log, filters, structural events, and CSV export.
- [Requirements document](./Workstream%20Cockpit%20-%20Requirements%20Document.md) — product requirements and user stories.
- [Screenshots](./screenshots/) — current UI captures used by the README and docs.

## Frontend behavior

- [Frontend specs](./frontend/README.md) — browser-side behavior, UI routes, and interaction contracts.
- [Appearance and theme preferences](./frontend/appearance-theme.md) — System/Light/Dark theme behavior and tests.
- [Settings UI](./frontend/settings.md) — stream type, tag, token, and appearance settings.
- [Filters and views UI](./frontend/filters-and-views.md) — saved view and filtering behavior.
- [Markdown and rich text](./frontend/markdown-and-rich-text.md) — formatted context and update notes.

## Integrations

- [Integration specs](./integrations/README.md) — external automation and protocol integrations.
- [MCP server and personal access tokens](./integrations/mcp-server.md) — read/write MCP tools for streams, updates, and settings.

## Skills

- [Skills index](./skills/README.md) — AI-client operating guides.
- [Workstream Cockpit MCP skill](./skills/workstream-cockpit-mcp.md) — practical guide for using Cockpit through MCP.

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
