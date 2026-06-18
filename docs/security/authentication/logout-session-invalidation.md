# Logout and session invalidation

Related specs:

- [Session hardening](./session-hardening.md)
- [Auth debug endpoint](./auth-debug-endpoint.md)

## Purpose

`POST /auth/logout` must fully invalidate authenticated state. A successful logout means Passport state is cleared, the server-side session is destroyed, and the browser session cookie is cleared.

## Expected behavior

Logout must:

1. Call `req.logout`.
2. Return `500` with `{ "error": "Logout failed" }` if Passport logout fails.
3. Destroy the server-side session with `req.session.destroy`.
4. Return `500` with `{ "error": "Logout failed" }` if session destruction fails.
5. Clear the configured session cookie.
6. Return `{ "message": "Logged out successfully" }` only after the invalidation steps succeed.

## Cookie clearing requirements

The clear-cookie operation must use the same cookie identity as the session middleware:

- Active session cookie name.
- Cookie path.
- `COOKIE_DOMAIN`, when configured.
- Security attributes needed for the browser to recognize the cookie.

Clear-cookie options should be derived from the shared session security helper, not duplicated in the route.

## Configuration

Logout behavior depends on:

- `SESSION_COOKIE_NAME`
- `COOKIE_DOMAIN`
- `NODE_ENV`

See [Session hardening](./session-hardening.md) for cookie attribute rules.

## Implementation references

- `backend/src/routes/auth.ts`
  - `POST /auth/logout`
- `backend/src/config/sessionSecurity.ts`
  - `getSessionCookieName`
  - `getSessionCookieClearOptions`

## Regression tests

- `backend/tests/integration/authSecurity.test.ts`
  - verifies logout destroys the session and clears the configured cookie.
- `backend/tests/unit/securityHelpers.test.ts`
  - verifies clear-cookie options match session cookie options except expiration-only fields.
