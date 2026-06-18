# Deployment and operations

This guide contains the durable setup details that are intentionally kept out of the product README.

## Runtime model

Workstream Cockpit runs as three Docker Compose services:

- `postgres` — PostgreSQL 15 database, persisted in the `postgres-data` volume
- `backend` — Node/Express API on host port `3001` by default
- `frontend` — React app served by Nginx on host port `3002` by default

The default Docker network is `workstream-cockpit-network`.

## Required configuration

Start from the example file:

```bash
cp .env.example .env
```

Minimum local values:

```bash
POSTGRES_PASSWORD=change-this
SESSION_SECRET=replace-with-a-random-32-plus-character-value
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
FRONTEND_URL=http://localhost:3002
CORS_ORIGIN=http://localhost:3002
```

`DATABASE_URL` is normally composed by the backend from the `POSTGRES_*` values. Set an explicit `DATABASE_URL` only for a custom deployment that needs a full connection string override.

Optional Google account restrictions:

```bash
GOOGLE_ALLOWED_EMAILS=person@example.com,other@example.com
GOOGLE_ALLOWED_DOMAINS=example.com
```

Leave both empty to allow any Google account accepted by your OAuth client.

## Google OAuth

For local development or local Docker:

- Authorized redirect URI: `http://localhost:3001/auth/google/callback`
- Frontend URL: `http://localhost:3002`

For production:

- Set `GOOGLE_CALLBACK_URL` to the public backend callback URL.
- Add that exact callback URL to the Google OAuth client.
- Set `FRONTEND_URL` and `CORS_ORIGIN` to the public frontend origin.
- Use a strong unique `SESSION_SECRET`.
- Configure cookie/domain settings as needed for your reverse proxy and domain.

## Docker deployment

Build and start:

```bash
docker compose up -d --build
```

Check status:

```bash
docker compose ps
docker compose logs -f backend
```

Update an existing deployment:

```bash
git pull origin main
docker compose up -d --build
```

Stop the stack:

```bash
docker compose down
```

The database is stored in the named Compose volume `workstream-cockpit_postgres-data` or the equivalent project-prefixed `postgres-data` volume created by your Compose installation.

## Ports

Defaults from `.env.example` and `docker-compose.yml`:

- Frontend: `http://localhost:3002`
- Backend API: `http://localhost:3001`
- PostgreSQL: internal Compose network only unless you expose it separately

To change host ports, set:

```bash
FRONTEND_PORT=3002
BACKEND_PORT=3001
```

## Automated database backups

Workstream Cockpit can run scheduled PostgreSQL backups to Google Cloud Storage.

### Backup behavior

- Scheduled backups using `BACKUP_SCHEDULE` cron syntax
- Default schedule: `0 2 * * *` (02:00 UTC daily)
- gzip-compressed SQL dumps
- Configurable retention with `BACKUP_RETENTION_DAYS`
- Manual backup command for on-demand snapshots
- Retry logic in the backup service

### GCP setup

1. Create a Google Cloud Storage bucket, for example:

   ```bash
   gsutil mb gs://workstream-cockpit-backups
   ```

2. Create a GCP service account with permission to write and delete objects in that bucket. `Storage Object Admin` is sufficient, though a narrower custom role is preferable for production.

3. Download a JSON key and place it at:

   ```text
   backend/config/gcp-service-account.json
   ```

   The Docker Compose file mounts that file read-only into the backend container at `/app/config/gcp-service-account.json`.

4. Enable backups in `.env`:

   ```bash
   BACKUP_ENABLED=true
   GCP_PROJECT_ID=your-project-id
   GCP_BUCKET_NAME=workstream-cockpit-backups
   GCP_SERVICE_ACCOUNT_KEY_PATH=/app/config/gcp-service-account.json
   BACKUP_SCHEDULE=0 2 * * *
   BACKUP_RETENTION_DAYS=30
   ```

5. Restart the backend:

   ```bash
   docker compose up -d --build backend
   ```

### Manual backup

From the host:

```bash
docker compose exec backend npm run backup:manual
```

### Restore from backup

Download and decompress the backup:

```bash
gsutil cp gs://workstream-cockpit-backups/2026/01/workstream-cockpit-2026-01-01-184200.sql.gz .
gunzip workstream-cockpit-2026-01-01-184200.sql.gz
```

Restore into the database:

```bash
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < workstream-cockpit-2026-01-01-184200.sql
```

If your Compose service name or database credentials differ, adjust the restore command accordingly.

### Backup monitoring

```bash
docker compose logs backend | grep -i backup
```

Also verify objects appear in the configured GCS bucket after the first scheduled or manual backup.

## Operational notes

- Keep `.env` and service account keys out of version control.
- Back up before migrations, upgrades, or manual database changes.
- If using a reverse proxy, preserve session cookies and forward the original protocol/host headers consistently.
- Review [Security notes](./security/README.md) before exposing an instance beyond a private network.
