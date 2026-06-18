# Auth debug endpoint

Related specs:

- [Session hardening](./session-hardening.md)
- [Logout and session invalidation](./logout-session-invalidation.md)

## Purpose

`GET /auth/debug` is for temporary diagnostics. It must be unavailable by default and must never expose raw session IDs, cookies, OAuth tokens, credentials, or environment secrets.

## Configuration

`AUTH_DEBUG_ENABLED` enables the endpoint only when set exactly to `true`.

Unset, empty, or any other value means disabled.

## Expected behavior

When disabled:

- `GET /auth/debug` returns `404`.
- Response body is `{ "error": "Not found" }`.

When enabled, the endpoint may return only safe diagnostics:

- Authentication state.
- Whether a session exists.
- Safe cookie metadata: `secure`, `httpOnly`, `sameSite`, `maxAge`.
- Basic authenticated user fields: `id`, `email`, `name`.
- Safe request metadata: cookie header presence, `origin`, `referer`.

## Redaction rules

Never return:

- Raw session IDs.
- Full session cookie values.
- Raw `Cookie` header.
- OAuth tokens.
- Session secrets.
- Server environment secrets.

Session IDs, when present, are redacted to the final six characters using `...abcdef` format.

## Implementation references

- `backend/src/routes/auth.ts`
  - `isAuthDebugEnabled`
  - `redactSessionId`
  - `GET /auth/debug`

## Regression tests

- `backend/tests/integration/authSecurity.test.ts`
  - returns `404` by default.
  - returns only safe redacted fields when enabled.
  - does not expose raw cookie/session data.
