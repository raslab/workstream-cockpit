# Authentication security

Authentication security covers login diagnostics, logout/session invalidation, cookie/session configuration, and Google OAuth admission controls.

## Specs

- [Auth debug endpoint](./auth-debug-endpoint.md) — keep diagnostics disabled and redacted.
- [Logout and session invalidation](./logout-session-invalidation.md) — destroy server sessions and clear browser cookies.
- [Google OAuth allowlist](./google-oauth-allowlist.md) — restrict OAuth users by email/domain when configured.
- [Personal access tokens for MCP](./personal-access-tokens.md) — scoped bearer tokens for MCP clients.
- [Session hardening](./session-hardening.md) — validate secrets and configure secure cookies.

Back to [Security specs](../README.md).
