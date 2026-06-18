# Backup command safety

Related specs:

- [Session hardening](../authentication/session-hardening.md)

## Purpose

Database backup execution must not be vulnerable to shell injection. PostgreSQL backups must invoke `pg_dump` with executable and argument arrays, never by constructing a shell command string.

## Expected behavior

The backup service must:

- Use `child_process.execFile` or an equivalent no-shell execution API.
- Pass `pg_dump` arguments as an array.
- Pass PostgreSQL credentials through environment variables.
- Never interpolate database credentials into command strings.
- Never log database passwords.
- Treat shell metacharacters in configuration as literal argument content.

## Required invocation shape

Executable:

```text
pg_dump
```

Arguments are discrete array entries:

```ts
[
  '-h', dbHost,
  '-p', dbPort,
  '-U', dbUser,
  '-d', dbName,
  '-f', outputFile
]
```

Password handling:

```ts
env: {
  ...process.env,
  PGPASSWORD: dbPassword
}
```

Do not enable shell execution.

## Forbidden patterns

Do not use:

```ts
exec(`pg_dump ...`)
```

Do not build command strings containing host, port, username, password, database name, or output path.

Do not log `POSTGRES_PASSWORD`, `PGPASSWORD`, or full command strings containing credentials.

## Configuration

Backup behavior uses:

- `BACKUP_ENABLED`
- `GCP_PROJECT_ID`
- `GCP_BUCKET_NAME`
- `GCP_SERVICE_ACCOUNT_KEY_PATH`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `BACKUP_RETENTION_DAYS`

## Implementation references

- `backend/src/services/backupService.ts`
  - `BackupService.createPgDump`
  - `createBackupService`
  - `executeBackup`
- `backend/scripts/backup-database.ts`

## Regression tests

- `backend/tests/unit/backupService.test.ts`
  - mocks `child_process`.
  - asserts `execFile` is used.
  - asserts `exec` is not used.
  - asserts arguments remain discrete array values.
  - asserts `PGPASSWORD` is passed via `env`.
  - asserts shell execution is not enabled.
