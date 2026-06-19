# Personal access tokens for MCP

## Purpose

Personal access tokens (PATs) let non-browser clients authenticate to Workstream Cockpit's MCP endpoint without reusing Google OAuth browser sessions.

## Expected behavior

- Users create and revoke their own PATs from Settings.
- Raw PATs are displayed exactly once at creation time.
- The database stores only a hash plus non-secret metadata.
- PATs can be read-only or read-write through explicit scopes.
- MCP requests authenticate with a standard bearer token header.
- Expired or revoked PATs are rejected.
- PAT-authenticated requests resolve to the issuing user's data boundary.

## Related implementation spec

- [MCP server and personal access tokens](../../integrations/mcp-server.md)
- [Workstream Cockpit MCP skill](../../skills/workstream-cockpit-mcp.md)

## Regression tests

The MCP implementation must include tests proving raw tokens are not persisted, revoked/expired tokens are rejected, read-only scopes cannot write, and raw tokens do not appear in logs or response metadata after creation.

Back to [Authentication security](./README.md).
