# Security specs

This directory defines behavioral security requirements for Workstream Cockpit. Use it as the review checklist for security-sensitive code changes.

## Read by concern

### Authentication security

Controls related to login, sessions, cookies, OAuth, and diagnostic exposure.

- [Auth debug endpoint](./authentication/auth-debug-endpoint.md)
- [Logout and session invalidation](./authentication/logout-session-invalidation.md)
- [Google OAuth allowlist](./authentication/google-oauth-allowlist.md)
- [Session hardening](./authentication/session-hardening.md)

### Authorization security

Controls that enforce project/user data boundaries.

- [Category ID authorization](./authorization/category-id-authorization.md)

### Operational security

Controls for backend operational tasks and infrastructure safety.

- [Backup command safety](./operations/backup-command-safety.md)

## Shared principles

- User-controlled identifiers must be scoped to the authenticated user's authorized project.
- Diagnostic endpoints must be disabled by default and must not expose secrets.
- Logout must invalidate both Passport login state and the server-side session.
- Backup commands must avoid shell interpolation.
- Production sessions must use strong secrets and secure cookie settings.
- OAuth admission controls must be explicit, normalized, and test-covered.

## Environment index

- `AUTH_DEBUG_ENABLED`: [Auth debug endpoint](./authentication/auth-debug-endpoint.md)
- `SESSION_SECRET`: [Session hardening](./authentication/session-hardening.md)
- `SESSION_COOKIE_NAME`: [Session hardening](./authentication/session-hardening.md), [Logout and session invalidation](./authentication/logout-session-invalidation.md)
- `SESSION_MAX_AGE`: [Session hardening](./authentication/session-hardening.md)
- `COOKIE_DOMAIN`: [Session hardening](./authentication/session-hardening.md), [Logout and session invalidation](./authentication/logout-session-invalidation.md)
- `GOOGLE_ALLOWED_EMAILS`: [Google OAuth allowlist](./authentication/google-oauth-allowlist.md)
- `GOOGLE_ALLOWED_DOMAINS`: [Google OAuth allowlist](./authentication/google-oauth-allowlist.md)
- Backup/Postgres/GCP variables: [Backup command safety](./operations/backup-command-safety.md)

## Implementation index

- Auth routes: `backend/src/routes/auth.ts`
- Session helpers: `backend/src/config/sessionSecurity.ts`
- Session middleware: `backend/src/middleware/session.ts`
- Google OAuth allowlist helpers: `backend/src/config/oauthAllowlist.ts`
- Passport Google strategy: `backend/src/config/passport.ts`
- Backup service: `backend/src/services/backupService.ts`
- Category service: `backend/src/services/categoryService.ts`
- Workstream service: `backend/src/services/workstreamService.ts`

## Test index

- Auth debug/logout integration tests: `backend/tests/integration/authSecurity.test.ts`
- Session and OAuth helper tests: `backend/tests/unit/securityHelpers.test.ts`
- Backup command safety tests: `backend/tests/unit/backupService.test.ts`
- Category/workstream authorization tests: `backend/tests/integration/workstreams.test.ts`

Back to [Documentation](../README.md).
