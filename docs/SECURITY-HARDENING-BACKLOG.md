# Security hardening backlog behavioral specs

This document records the expected behavior for the security-hardening backlog items so they can be validated consistently across implementation, review, and regression testing.

## Auth debug endpoint

- `/auth/debug` is disabled by default and returns `404` unless `AUTH_DEBUG_ENABLED=true` is set explicitly.
- Debug output must not expose full session identifiers or secrets. Session IDs are redacted to the final six characters only.
- The endpoint is intended for temporary operational diagnostics; do not enable it in production unless access is otherwise controlled.

## Logout and session invalidation

- `POST /auth/logout` must call Passport logout, destroy the server-side session, and clear the configured session cookie.
- The clear-cookie options must match the active session cookie name/domain/security options so browser cookies are actually removed.
- A logout failure during Passport logout or session destruction returns a `500` and does not report success.

## Google OAuth allowlist

- `GOOGLE_ALLOWED_EMAILS` and `GOOGLE_ALLOWED_DOMAINS` are comma-separated allowlists.
- Values are trimmed and compared case-insensitively; domains may be configured with or without a leading `@`.
- When both allowlists are empty, Google OAuth remains open to any successfully authenticated Google account.
- When either allowlist is populated, a Google account is accepted only if the normalized email or email domain is listed.

## Session secret and cookie storage

- `SESSION_SECRET` is required at startup.
- In production, `SESSION_SECRET` must be at least 32 characters and must not be a known weak/default value.
- Session cookies are HTTP-only. Production cookies are `secure` and `sameSite=none`; non-production cookies use `sameSite=lax`.
- `SESSION_COOKIE_NAME` may override the default cookie name, and `COOKIE_DOMAIN` may be set when cookies must be shared across subdomains.
- Sessions use rolling expiration so activity refreshes the configured max age.

## Backup command construction

- Database backups invoke `pg_dump` with `execFile`/argument arrays, never a shell command string.
- Database credentials are passed to `pg_dump` through `env.PGPASSWORD`; the password must not be interpolated into command strings or logs.
- Host, port, user, database, and output path are passed as discrete arguments so shell metacharacters in configuration are treated as literal argument content.
- Regression tests must mock `child_process` and assert that `exec`/shell execution is not used.

## CategoryId authorization

- Any operation that reads, creates, updates, deletes, or assigns a `categoryId` must verify the category belongs to the same authorized project as the workstream/request context.
- A `categoryId` from a different project must be rejected as not found or access denied, not silently accepted.
- Deleting a category must only affect workstreams in the same project scope.
