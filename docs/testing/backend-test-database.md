# Backend test database

Backend integration tests use a PostgreSQL sidecar that runs on the developer machine, not inside the Hermes/subagent container.

## Why this exists

Hermes and subagents run commands inside Docker containers. They cannot reliably start sibling Docker services or use Docker-in-Docker. A permanent host-side Postgres container gives all agents a stable database target.

## Start the permanent sidecar

Run this once on the host machine:

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

Check it:

```bash
docker ps --filter name=workstream-cockpit-test-postgres
```

## Test environment

`backend/.env.test` is configured for Hermes/subagent containers by default:

```env
POSTGRES_HOST=host.docker.internal
POSTGRES_PORT=35268
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=workstream_cockpit_test
```

If you run tests directly on the host and `host.docker.internal` does not resolve, change only the host locally:

```env
POSTGRES_HOST=localhost
```

The test bootstrap composes Prisma's required `DATABASE_URL` from `POSTGRES_*`. Set `DATABASE_URL` only as an advanced override.

## Run tests

From the repository root:

```bash
npm run test --workspace=backend -- --runInBand
```

Target one suite:

```bash
npm run test --workspace=backend -- --runTestsByPath backend/tests/integration/workstreams.test.ts --runInBand
```

## Automatic setup behavior

The test helper composes `DATABASE_URL` from `POSTGRES_*` and uses the same host, port, user, password, and database name for setup.

On the first run it:

1. Connects to the sidecar's default `postgres` database.
2. Creates the test database named in `POSTGRES_DB` if missing.
3. Runs `npm run migrate:deploy` against the test database.
4. Cleans tables between tests.

## Troubleshooting

Connection refused from Hermes/subagents usually means the host sidecar is not running or not bound to port `35268`.

Check from the host:

```bash
docker logs workstream-cockpit-test-postgres --tail=50
docker port workstream-cockpit-test-postgres
```

Check from an agent container:

```bash
node -e "require('net').connect(35268, 'host.docker.internal').on('connect', () => { console.log('ok'); process.exit(0); }).on('error', e => { console.error(e.message); process.exit(1); })"
```
