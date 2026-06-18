# Session hardening

Related specs:

- [Auth debug endpoint](./auth-debug-endpoint.md)
- [Logout and session invalidation](./logout-session-invalidation.md)
- [Google OAuth allowlist](./google-oauth-allowlist.md)

## Purpose

Session configuration must use strong secrets, secure cookie attributes, and predictable expiration behavior.

## Configuration

### `SESSION_SECRET`

Required in all environments.

In production, the trimmed value must:

- Be at least 32 characters.
- Not be a known weak/default value.
- Not contain placeholder substrings such as `changeme`, `change-me`, `change_me`, `your-`, `your_`, `example`, or `default`.

Invalid production examples:

```env
SESSION_SECRET=secret
SESSION_SECRET=change-me-to-a-random-32-plus-character-value
```

### `SESSION_COOKIE_NAME`

Optional. Defaults to `connect.sid`. Can be overridden, for example `workstream.sid`.

### `SESSION_MAX_AGE`

Optional. Defaults to 30 days in milliseconds. Invalid, non-numeric, or non-positive values fall back to the default.

### `COOKIE_DOMAIN`

Optional. Use only when cookies must be shared across subdomains.

## Cookie behavior

Session cookies are always:

- `HttpOnly`
- `Path=/`

In production (`NODE_ENV=production`), cookies are:

- `Secure`
- `SameSite=None`

Outside production, cookies use:

- `SameSite=Lax`
- `Secure=false`

## Expiration behavior

Sessions use rolling expiration. Activity refreshes expiration according to `SESSION_MAX_AGE`.

Session middleware settings:

```ts
resave: false
saveUninitialized: false
rolling: true
```

## Startup validation

Startup fails if `SESSION_SECRET` is missing or whitespace-only.

Production startup also fails if the trimmed secret is too short, weak, or placeholder-like.

## Storage note

The current middleware centralizes cookie/secret hardening. Production deployments should use a durable server-side session store appropriate for the runtime environment instead of relying on process-local memory storage.

## Implementation references

- `backend/src/config/sessionSecurity.ts`
  - `validateSessionSecret`
  - `getSessionSecret`
  - `getSessionCookieName`
  - `getSessionCookieOptions`
  - `getSessionCookieClearOptions`
- `backend/src/middleware/session.ts`

## Regression tests

- `backend/tests/unit/securityHelpers.test.ts`
  - requires `SESSION_SECRET`.
  - rejects short production secrets.
  - rejects weak/default production secrets.
  - rejects whitespace-only secrets.
  - trims secrets before length validation.
  - verifies cookie name/options and clear-cookie behavior.
- `backend/tests/integration/authSecurity.test.ts`
  - verifies auth debug exposes only safe cookie metadata.
  - verifies logout clears the configured cookie.
