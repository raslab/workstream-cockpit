# Development guide

This guide covers local development commands and implementation reference material. For Docker deployment, environment configuration, and backups, see [Deployment and operations](./DEPLOYMENT.md).

## Project layout

- `frontend/` — React, TypeScript, Vite, Tailwind CSS
- `backend/` — Node.js, Express, TypeScript, Prisma
- `docs/` — product, operational, testing, and security documentation
- `docker-compose.yml` — local/self-hosted runtime stack
- `.env.example` — runtime configuration template

## Prerequisites

- Node.js 20+
- npm 10+
- Docker and Docker Compose
- Google OAuth credentials for sign-in flows

## First-time setup

```bash
npm install
cp .env.example .env
```

Edit `.env` with local database, session, frontend, CORS, and Google OAuth values. For the full environment reference, see [Deployment and operations](./DEPLOYMENT.md).

Generate Prisma client if needed:

```bash
cd backend
npm run prisma:generate
```

## Running the app locally

### Docker stack

```bash
docker compose up -d --build
```

Default URLs:

- Frontend: `http://localhost:3002`
- Backend: `http://localhost:3001`

### Hot-reload development

The Compose database is private to the Compose network by default. For the simplest local development loop, run the full Docker stack:

```bash
docker compose up -d --build
```

If you want to run the backend and frontend directly on the host with hot reload, use a host-reachable PostgreSQL instance and override the backend database host/port accordingly:

```bash
# example only: use values that point at your local database
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
npm run dev:backend
npm run dev:frontend
```

Or run both dev scripts through the root command after the database variables point at a reachable database:

```bash
npm run dev
```

## Common commands

```bash
npm run build          # build backend and frontend workspaces
npm test               # run all workspace tests
npm run test:backend   # backend tests
npm run test:frontend  # frontend tests
npm run lint           # workspace linting
npm run format         # workspace formatting
```

Backend-specific commands:

```bash
cd backend
npm run dev
npm test
npm run test:coverage
npm run prisma:generate
npm run migrate
npm run prisma:studio
```

Frontend-specific commands:

```bash
cd frontend
npm run dev
npm test
npm run build
```

## Testing

Backend integration tests use a separate PostgreSQL test database. The repeatable sidecar setup is documented in [Backend test database](./testing/backend-test-database.md), with a broader index in [Testing](./testing/README.md).

Short version:

```bash
docker rm -f workstream-cockpit-test-postgres 2>/dev/null || true

docker run -d \
  --name workstream-cockpit-test-postgres \
  --restart unless-stopped \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=postgres \
  -p 35268:5432 \
  postgres:15-alpine
```

`backend/.env.test` should point at that sidecar. In containerized agent environments, use `POSTGRES_HOST=host.docker.internal`; when running directly on a host where that name is unavailable, use `POSTGRES_HOST=localhost`.

## Domain model

Core data concepts:

- `Person` — authenticated user account
- `Project` — workspace boundary for a user's data
- `Category` — stream type, such as project, process, watching, maybe later, or uncategorized
- `Tag` — reusable context dimension, such as team, person, domain, system, or meeting context
- `Workstream` — tracked thread of operational attention
- `StatusUpdate` — narrative progress/history note for a workstream
- `View` — saved meeting or checklist angle over streams

## API reference map

Important backend route areas live under `backend/src/routes/`:

- Auth: Google OAuth login/logout/session handling
- Workstreams: create, list, update, archive, reopen, and details
- Status updates: add and edit narrative history
- Categories: stream type management
- Tags: tag management and filtering
- Timeline: cross-stream history retrieval
- Views: saved cockpit angles
- Health: service readiness

## Frontend route map

Common app routes include:

- `/` — cockpit dashboard
- `/workstreams/:id` — workstream detail and history
- `/timeline` — cross-stream timeline
- `/archive` — archived streams
- `/settings` or related settings routes — category, tag, personal access token, and appearance management

## Troubleshooting

### Database connection failures

- Confirm the database service is running: `docker compose ps`.
- Check `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.
- Remove an accidental `DATABASE_URL` override unless you intentionally need it.
- Check whether the host port is already in use.

### Prisma client errors

```bash
cd backend
npm run prisma:generate
```

### Dependency issues

```bash
rm -rf node_modules backend/node_modules frontend/node_modules
rm -f package-lock.json backend/package-lock.json frontend/package-lock.json
npm install
```

### Docker rebuild

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Related docs

- [Deployment and operations](./DEPLOYMENT.md)
- [Testing](./testing/README.md)
- [Security specs](./security/README.md)
- [Requirements document](./Workstream%20Cockpit%20-%20Requirements%20Document.md)
