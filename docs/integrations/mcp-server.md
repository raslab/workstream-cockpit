# MCP Server and Personal Access Token Specification

## Purpose

Add a Workstream Cockpit MCP server so AI clients can safely read and write the same operational context that the web UI manages: workstreams, narrative updates, and settings. The server must be authenticated with user-generated personal access tokens (PATs), not browser sessions.

This document is the reviewed design contract for the implemented MCP/PAT feature. Keep it aligned with the production behavior as the integration evolves.

## Research summary

The Model Context Protocol (MCP) exposes server capabilities through discoverable primitives. For this feature we should expose **tools** because clients need to perform actions, not only read static resources. The relevant MCP design points are:

- Tools are discovered with `tools/list` and executed with `tools/call`.
- Tool names should be stable, unique, and use simple characters.
- Tool definitions should include precise `inputSchema`; use `outputSchema` where the SDK supports it so clients can type results.
- Tool results should be structured JSON for automation; text content can be present only as a short human-readable summary.
- HTTP/Streamable HTTP is the right transport for this product because Cockpit is already self-hosted as an HTTP service, needs bearer-token authentication, and should not require each user to run a local stdio process.
- OAuth is the MCP-preferred auth direction for public multi-user servers, but a scoped PAT is appropriate here because Cockpit is self-hosted and already uses Google OAuth for UI identity. PATs are also easier for local MCP clients and automation.

## Goals

- Provide MCP tools that fully cover read/write workflows for:
  - workstreams / streams
  - status updates / narrative history
  - settings: categories, tags, and saved views
  - timeline queries across streams and updates
- Add a Settings UI section where the signed-in user can create, inspect, and revoke PATs.
- Authorize MCP requests with a standard bearer token header containing the generated PAT.
- Reuse existing user/project authorization rules so a PAT can only access the issuing user's default project data.
- Keep destructive operations explicit and auditable.

## Non-goals for first release

- No public OAuth authorization server for MCP clients.
- No multi-project selection until the app itself has a first-class multi-project UX.
- No server-initiated sampling, prompts, or MCP resources in v1.
- No bulk import/export beyond bounded list tools.
- No admin PAT management for other users.

## Architecture decision

Implement the MCP server inside the backend Express service as a new authenticated HTTP endpoint:

- Endpoint: `POST /mcp`
- Transport: authenticated HTTP JSON-RPC implementing the MCP initialization and tool discovery/call flow, including notifications and batch requests. This keeps the first production release simple while preserving the public MCP tool contract; a future SDK-backed Streamable HTTP transport can replace the router without changing tool names or schemas.
- Auth: PAT bearer middleware before MCP request handling.
- Runtime identity: PAT resolves to `personId`, then existing project lookup chooses the user's default project, matching current API behavior.
- Tool handlers call existing service-layer functions where possible instead of HTTP-calling the app's own REST API.

This keeps deployment simple: existing Docker Compose users expose the backend as they do today and configure MCP clients with the backend URL plus PAT. For practical AI-client operating guidance after setup, see the [Workstream Cockpit MCP skill](../skills/workstream-cockpit-mcp.md).

## PAT model

Add a new `PersonalAccessToken` database model.

Fields:

- `id`: UUID primary key.
- `personId`: owner; cascade delete with person.
- `name`: user-visible label, 1-100 chars.
- `tokenHash`: SHA-256 or stronger keyed hash of the secret token; never store the raw token.
- `tokenPrefix`: non-secret display prefix, e.g. first 12 chars after `wsc_pat_`.
- `scopes`: string array or JSON array.
- `lastUsedAt`: nullable timestamp.
- `expiresAt`: nullable timestamp.
- `revokedAt`: nullable timestamp.
- `createdAt`: timestamp.

Token format:

```text
wsc_pat_<base64url-random-32-plus-bytes>
```

Creation response shows the raw PAT exactly once. Later Settings views show only name, prefix, scopes, created/last-used/expires/revoked metadata.

Scopes:

- `mcp:read`: list/get tools and settings reads.
- `mcp:write`: create/update/delete/reorder/close/reopen tools.

For v1 the UI can create either read-only (`mcp:read`) or read-write (`mcp:read`, `mcp:write`) PATs. The middleware enforces scopes per tool.

## PAT UI/API requirements

Settings menu adds a new section: **Personal access tokens**.

Backend REST endpoints for the browser UI, protected by normal session auth:

- `GET /api/personal-access-tokens`
  - Returns token metadata only.
- `POST /api/personal-access-tokens`
  - Body: `{ name, scopes, expiresAt? }`
  - Returns: `{ token, personalAccessToken }`, where `token` is the raw one-time secret.
- `DELETE /api/personal-access-tokens/:id`
  - Revokes the token by setting `revokedAt`.

UI behavior:

- Explain that PATs allow MCP clients to read/write Cockpit data.
- Make scope choice explicit: read-only vs read-write.
- Show a copyable token once after creation with a warning that it cannot be recovered.
- Show last used, expiry, and revoke action.
- Never log, persist, or re-render the raw token after the create response is dismissed.

## MCP client configuration example

Create a PAT in **Settings → Personal access tokens**, then configure the MCP client with the `/mcp` endpoint and an `Authorization` bearer header. The server exposes MCP **tools** only; MCP resources, prompts, and resource templates are intentionally empty in v1.

```yaml
mcp_servers:
  cockpit:
    url: "https://cockpit.example.com/mcp"
    headers:
      Authorization: "Bearer wsc_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Local Docker Compose example using the frontend/Nginx proxy:

```yaml
mcp_servers:
  cockpit_dev:
    url: "http://localhost:3002/mcp"
    headers:
      Authorization: "Bearer wsc_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

If your backend port is exposed directly, `http://localhost:3001/mcp` also works.

### Codex UI configuration

In Codex's MCP setup screen, configure the token in the **Headers** section:

- URL: `http://localhost:3002/mcp` for Docker Compose, or `http://localhost:3001/mcp` if the backend port is exposed directly.
- Header name: `Authorization`
- Header value: `Bearer wsc_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

Do **not** paste the raw `wsc_pat_...` value into the **Bearer token env var** field unless you have separately exported an environment variable containing the token. If Codex says `Environment variable wsc_pat_... is not set`, the PAT was entered as an environment-variable name instead of as an `Authorization` header.

If a client reports that startup is incomplete or no tools are visible, verify that it is using a reachable `/mcp` URL and that the bearer token is present on initialize, ping, and tools/list requests. The endpoint supports modern MCP startup negotiation for `2025-06-18`, `2025-03-26`, and the earlier `2024-11-05` protocol version.

For workflow guidance once the client is connected, use the [Workstream Cockpit MCP skill](../skills/workstream-cockpit-mcp.md).

## Tool naming convention

Use a consistent prefix-free vocabulary because the MCP client will already namespace the server:

- Workstreams: `workstreams_*`
- Updates: `updates_*`
- Settings: `settings_*`

All tools return a structured object with:

- `ok: true` for success.
- The requested or changed entity/entities.
- Optional `summary` for concise human display.

Errors should be MCP tool errors with safe messages. Do not include PATs, stack traces, SQL details, or internal project IDs unless the ID is already part of the normal response model.

## Tool inventory

### Read tools

#### `workstreams_list`

Lists workstreams for the issuing user's default project.

Input:

```json
{
  "state": "active | closed | all (default active)",
  "tagNames": ["optional tag IDs such as alan_awake"],
  "categoryIds": ["optional category UUIDs"],
  "notUpdatedToday": false,
  "limit": 100,
  "cursor": "optional opaque cursor"
}
```

Output:

```json
{
  "ok": true,
  "workstreams": [],
  "nextCursor": null
}
```

#### `workstreams_get`

Gets one workstream with optional update history.

Input:

```json
{
  "id": "workstream UUID",
  "includeUpdates": true,
  "updatesLimit": 50
}
```

Output:

```json
{
  "ok": true,
  "workstream": {},
  "updates": []
}
```

#### `updates_list`

Lists narrative updates for a workstream, optionally bounded by update creation dates.

Input:

```json
{
  "workstreamId": "workstream UUID",
  "startDate": "optional ISO timestamp/date, inclusive",
  "endDate": "optional ISO timestamp/date, inclusive",
  "limit": 100,
  "cursor": "optional opaque cursor"
}
```

Output:

```json
{
  "ok": true,
  "updates": [],
  "nextCursor": null
}
```

#### `timeline_query`

Queries the cross-stream timeline for recent operational history, including status updates, stream creation events, and stream closure events. This covers prompts such as “give me all streams/updates for the last 7 days with tags A,B,C”.

Input:

```json
{
  "startDate": "optional ISO timestamp/date, inclusive",
  "endDate": "optional ISO timestamp/date, inclusive",
  "relativeDays": "optional integer shorthand; 7 means from now minus 7 days through now",
  "tagNames": ["optional tag IDs such as alan_awake"],
  "categoryIds": ["optional category UUIDs"],
  "eventTypes": ["status_update", "workstream_created", "workstream_closed"],
  "limit": 100,
  "cursor": "optional opaque cursor"
}
```

Rules:

- `relativeDays` is convenience input for clients; if present, the handler converts it to `startDate`/`endDate`.
- If both explicit dates and `relativeDays` are provided, explicit dates win.
- `tagNames` filters against tags extracted from workstream context, update status, and update note, matching current timeline behavior.
- Results are sorted newest first.

Output:

```json
{
  "ok": true,
  "events": [
    {
      "id": "status-...",
      "eventType": "status_update",
      "workstreamId": "workstream UUID",
      "workstreamName": "Stream name",
      "status": "Narrative status",
      "note": "Optional longer note",
      "createdAt": "ISO timestamp",
      "category": {}
    }
  ],
  "nextCursor": null
}
```

#### `settings_get`

Returns current settings needed to create/edit streams and organize views.

Input:

```json
{
  "include": ["categories", "tags", "views"]
}
```

Output:

```json
{
  "ok": true,
  "categories": [],
  "tags": [],
  "views": []
}
```

### Workstream write tools

#### `workstreams_create`

Creates a stream and optionally an initial update.

Input:

```json
{
  "name": "1-200 chars",
  "categoryId": "optional category UUID",
  "context": "optional 0-2000 chars",
  "initialStatus": "optional 0-500 chars",
  "initialNote": "optional 0-2000 chars"
}
```

Output: created workstream.

#### `workstreams_update`

Updates stream metadata.

Input:

```json
{
  "id": "workstream UUID",
  "name": "optional 1-200 chars",
  "categoryId": "optional category UUID or null",
  "context": "optional 0-2000 chars or null"
}
```

Output: updated workstream.

#### `workstreams_close`

Closes a stream. Destructive-ish because it removes it from active views.

Input:

```json
{ "id": "workstream UUID" }
```

Output: closed workstream.

#### `workstreams_reopen`

Reopens a closed stream.

Input:

```json
{ "id": "workstream UUID" }
```

Output: reopened workstream.


### Update write tools

#### `updates_create`

Adds a narrative status/history update.

Input:

```json
{
  "workstreamId": "workstream UUID",
  "status": "1-500 chars",
  "note": "optional 0-2000 chars"
}
```

Output: created update.

#### `updates_update`

Edits an existing update.

Input:

```json
{
  "id": "status update UUID",
  "workstreamId": "owning workstream UUID",
  "status": "optional 1-500 chars",
  "note": "optional 0-2000 chars or null"
}
```

Output: updated update.

#### `updates_delete`

Deletes an update. Mark destructive in annotations.

Input:

```json
{
  "id": "status update UUID",
  "workstreamId": "owning workstream UUID",
  "confirm": true
}
```

Output:

```json
{ "ok": true, "deletedId": "status update UUID" }
```

### Settings write tools

#### `settings_category_create`

Input:

```json
{
  "name": "1-100 chars",
  "color": "#RRGGBB",
  "emoji": "optional single emoji"
}
```

Output: created category.

#### `settings_category_update`

Input:

```json
{
  "id": "category UUID",
  "name": "optional 1-100 chars",
  "color": "optional #RRGGBB",
  "emoji": "optional emoji or null"
}
```

Output: updated category.

#### `settings_category_reorder`

Input:

```json
{ "categoryIds": ["ordered category UUIDs"] }
```

Output: reordered categories.

#### `settings_category_delete`

Input:

```json
{
  "id": "category UUID",
  "confirm": true
}
```

Output: deleted ID. Deleting a category should preserve workstreams by nulling `categoryId`, matching current service behavior.

#### `settings_tag_create`

Input:

```json
{
  "displayName": "tag display name",
  "color": "#RRGGBB"
}
```

Output: created tag including generated machine `name`.

#### `settings_tag_update`

Input:

```json
{
  "id": "tag UUID or machine name; implementation must choose and document one before coding",
  "displayName": "optional display name",
  "color": "optional #RRGGBB"
}
```

Output: updated tag.

Open decision before implementation: existing REST routes call `PATCH /api/tags/:id`, but the route/service naming should be inspected to confirm whether `id` is UUID or tag `name`. The MCP contract must choose one stable identifier and keep it consistent.

#### `settings_tag_delete`

Input:

```json
{
  "id": "tag UUID or machine name; same identifier as update",
  "confirm": true
}
```

Output: deleted ID.

#### `settings_views_list`

Lists all saved views for the issuing user's default project.

Input:

```json
{}
```

Output:

```json
{
  "ok": true,
  "views": []
}
```

#### `settings_view_get`

Gets one saved view, including its full config.

Input:

```json
{ "id": "view UUID" }
```

Output:

```json
{
  "ok": true,
  "view": {}
}
```

#### `settings_view_create`

Input:

```json
{
  "name": "view name",
  "isDefault": false,
  "config": {}
}
```

Output: created view.

#### `settings_view_update`

Input:

```json
{
  "id": "view UUID",
  "name": "optional view name",
  "isDefault": "optional boolean",
  "config": "optional full view config object"
}
```

Output: updated view.

#### `settings_view_delete`

Input:

```json
{
  "id": "view UUID",
  "confirm": true
}
```

Output: deleted ID. The default view cannot be deleted.

## Validation rules

MCP tools must enforce the same limits as the REST API:

- Workstream name: required for create, max 200 chars.
- Workstream context: max 2000 chars.
- Update status: required for create, max 500 chars.
- Update note: max 2000 chars.
- Category name: max 100 chars.
- Category color: `#RRGGBB`, normalized uppercase.
- Tag color: use the same validation as tag service; align it with category color if missing.
- Destructive tools require `confirm: true`. Workstream deletion is intentionally not exposed through MCP.
- Unknown IDs return not found, not access denied, to avoid leaking existence across users.

## Authorization and safety

- PAT middleware must run before MCP handling and attach the same effective context shape as session auth: `personId`, email/name if needed, and default `projectId` resolution.
- Read tools require `mcp:read`.
- Write tools require both a valid non-revoked/non-expired PAT and `mcp:write`.
- Update `lastUsedAt` asynchronously after successful authentication.
- Add audit logs for create/update/delete/close/reopen/reorder actions: token ID, person ID, tool name, target entity ID, success/failure. Never log the raw PAT.
- Add rate limiting for `/mcp` separately from browser routes. Start with a conservative per-token limit, e.g. 120 tool calls/minute, adjustable by env var.
- Use tool annotations for destructive and write operations where supported by the SDK.

## Implementation reference paths

Expected backend additions:

- `backend/prisma/schema.prisma` — add PAT model.
- `backend/src/routes/personalAccessTokens.ts` — session-authenticated PAT management REST API.
- `backend/src/services/personalAccessTokenService.ts` — token generation, hashing, verification, revocation.
- `backend/src/middleware/patAuth.ts` — bearer-token auth for MCP.
- `backend/src/mcp/server.ts` — MCP server setup and transport.
- `backend/src/mcp/tools/*.ts` — grouped tool handlers.
- `backend/src/server.ts` — mount PAT API and `/mcp` endpoint.

Expected frontend additions:

- `frontend/src/pages/Settings.tsx` — add navigation entry.
- `frontend/src/pages/PersonalAccessTokens.tsx` or settings subcomponent.
- `frontend/src/api/personalAccessTokens.ts` — API client.
- Tests near existing frontend/backend test structure.

## Test requirements

Backend tests:

- PAT creation returns raw token once and stores only a hash.
- Revoked/expired/malformed PATs cannot call `/mcp`.
- Read-only PAT can call read tools and is denied write tools.
- Read-write PAT can create/update entities inside only the owner project.
- Destructive tools reject missing `confirm: true`.
- Every MCP tool has validation tests for required fields, date filters, timeline filters, and length/color constraints.
- Existing session-authenticated REST routes keep working.

Frontend tests:

- Settings shows PAT list metadata without raw secrets.
- Create flow displays raw token once with copy affordance.
- Revocation flow removes or marks the token as revoked.
- Scope selection is explicit and defaults to read-only unless product review chooses otherwise.

Manual verification:

- Use MCP Inspector against `/mcp` with a PAT.
- Configure a real MCP client and verify list/get/create/update flows.
- Confirm raw PAT never appears in backend logs.

## Rollout plan

1. Ship PAT database model, service, and Settings UI behind normal session auth.
2. Ship `/mcp` with read-only tools first and verify Inspector compatibility.
3. Add write tools with destructive confirmations and audit logs.
4. Document client configuration in deployment/development docs.
5. Consider OAuth MCP authorization only if Cockpit becomes a shared public service.

## Open decisions for review

- Should PATs expire by default? Recommendation: default to no expiry for self-hosted convenience, but allow optional expiry and show security guidance.
- Should read-write PATs be opt-in with an additional warning? Recommendation: yes.
- Should tag tools identify tags by UUID or machine `name`? Recommendation: choose UUID for consistency with categories/views if existing service supports it; otherwise document machine `name` as the stable ID.
- Should `/mcp` share the backend public URL or be optionally disabled by env var? Recommendation: add `MCP_ENABLED=true|false`, default true in development and false or explicit in production depending on security posture.
