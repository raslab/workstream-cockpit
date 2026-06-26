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

`backend/.env.test` is configured for Hermes/subagent containers by default. `POSTGRES_DB`
is a base name; `npm run test` appends a unique per-run suffix so concurrent worktrees do
not truncate or migrate the same database.

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

The test bootstrap composes Prisma's required `DATABASE_URL` from `POSTGRES_*`. Set `DATABASE_URL` only as an advanced override. The npm test wrapper still replaces the database name for each run.

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

The npm test wrapper loads `.env.test`, derives a database name such as
`workstream_cockpit_test_mabc123_pid_random`, sets both `POSTGRES_DB` and `DATABASE_URL` for
the Jest child process, and drops that isolated database after Jest exits.

The test helper composes `DATABASE_URL` from the effective `POSTGRES_*` values and uses the same host, port, user, password, and database name for setup.

On the first run it:

1. Connects to the sidecar's default `postgres` database.
2. Creates the isolated test database named in `POSTGRES_DB` if missing.
3. Runs `npm run migrate:deploy` against the isolated test database.
4. Cleans tables between tests inside the isolated database.
5. Drops the isolated database when the npm test run finishes.

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
