# Workstream Cockpit MCP Skill

## Purpose

Use this skill when an AI client or automation agent is connected to Workstream Cockpit through the MCP server. The goal is to retrieve operational context accurately, preserve narrative history, and make safe updates only when the user explicitly asks for them.

## When to use

Use this skill for requests such as:

- Review active workstreams or stale items.
- Prepare for a meeting, weekly review, or planning session.
- Summarize recent progress across streams.
- Add a narrative status update.
- Create, update, close, or reopen a workstream.
- Query timeline history by date, tag, category, or event type.
- Manage categories, tags, or saved views.

## Prerequisites

- Workstream Cockpit is running and reachable.
- The MCP endpoint is configured as a reachable `/mcp` URL. For local Docker Compose this is usually `http://localhost:3002/mcp` through the frontend proxy; `http://localhost:3001/mcp` also works if the backend port is exposed directly.
- The user created a personal access token in Settings → Personal access tokens.
- The MCP client sends an `Authorization` bearer header on MCP requests. In Codex, put the environment variable name (for example `WSC_PAT`) in **Bearer token env var** after exporting that variable to the raw `wsc_pat_...` token; do not paste the raw token into that env-var-name field.
- Use a read-only PAT for review workflows. Use a read-write PAT only when write actions are expected.

See the full setup and tool contract in [MCP server and personal access tokens](../integrations/mcp-server.md).

## Operating principles

1. **Read before writing.** Check current state with MCP read tools before changing anything.
2. **Do not invent IDs.** Use `settings_get`, `workstreams_list`, `workstreams_get`, or `timeline_query` to discover real IDs.
3. **Prefer narrative updates for history.** Use `updates_create` for progress/history. Use `workstreams_update` only for durable metadata or context corrections.
4. **Confirm ambiguous or destructive actions.** Ask the user before closing/reopening streams or deleting updates/settings.
5. **Keep PATs secret.** Never print, summarize, log, or store the raw token.
6. **Respect scopes.** If a write fails because the PAT is read-only, ask the user to intentionally configure a read-write PAT rather than working around it.

## Common read workflows

### Cockpit overview

Tool sequence:

1. `workstreams_list` with `state: "active"`.
2. `settings_get` if category/tag labels are needed.
3. `workstreams_get` for streams that need detail/history.

Output should group or prioritize streams by the user's requested angle: category, tag, meeting context, stale work, blockers, or next actions.

### Meeting preparation

Tool sequence:

1. `settings_get` to identify relevant categories/tags/views.
2. `workstreams_list` filtered by tag/category/state.
3. `timeline_query` with `relativeDays` for recent history.
4. `workstreams_get` for important streams.

Suggested response shape:

```md
## Briefing
## Needs attention
## Recent changes
## Decisions or asks
## Suggested agenda
## Sources checked
```

### Recent progress review

Tool sequence:

1. `timeline_query` with `relativeDays` or explicit `startDate` / `endDate`.
2. Optional `workstreams_get` for context on important events.

Summarize material changes, not every event. Call out streams without recent updates only if relevant to the user's question.

## Common write workflows

### Add a narrative update

1. Identify the target with `workstreams_list` or `workstreams_get`.
2. If multiple streams match, ask the user to choose.
3. Call `updates_create`.

Guidance:

- `status` should be a concise statement of what changed or what is true now.
- `note` should contain details, blockers, links, decisions, or next steps.

### Create a workstream

1. Call `settings_get` to find existing categories/tags.
2. Call `workstreams_create` with a clear `name`, optional `categoryId`, durable `context`, and optional initial status/note.

Use existing categories when possible. Do not create new categories/tags unless the user requested taxonomy changes.

### Update a workstream

1. Call `workstreams_get`.
2. Decide whether the change belongs in metadata/context or in history.
3. Use `workstreams_update` for durable metadata/context corrections.
4. Use `updates_create` for progress/history.

### Close or reopen a workstream

1. Call `workstreams_get`.
2. Confirm the intent if the user did not explicitly request close/reopen.
3. Call `workstreams_close` or `workstreams_reopen`.
4. Optionally add an `updates_create` entry explaining why the state changed.

## Settings workflows

### Categories

Use categories for stream type, such as project, process, watching, maybe later, or untagged.

Relevant tools:

- `settings_get`
- `settings_category_create`
- `settings_category_update`
- `settings_category_reorder`
- `settings_category_delete`

Prefer update/reorder over delete. Delete only after explicit confirmation.

### Tags

Use tags for reusable retrieval dimensions: teams, people, domains, systems, meetings, customers, or themes.

Relevant tools:

- `settings_get`
- `settings_tag_create`
- `settings_tag_update`
- `settings_tag_delete`

### Saved views

Use saved views for recurring meeting/checklist angles.

Relevant tools:

- `settings_views_list`
- `settings_view_get`
- `settings_view_create`
- `settings_view_update`
- `settings_view_delete`

## Safety checklist before writes

Before any write tool call, verify:

- I read the current state.
- The target stream/update/category/tag/view is unambiguous.
- This is not better represented as a narrative update.
- The user requested or confirmed the write.
- Any destructive tool includes `confirm: true` only after explicit confirmation.
- No PAT or secret value will appear in my response.

## Troubleshooting

- **No tools visible in the MCP client:** check the backend `/mcp` URL, PAT bearer configuration, and client startup logs. The server exposes tools, not MCP resources or prompts.
- **401 Unauthorized:** PAT is missing, malformed, expired, revoked, or belongs to a user without a project.
- **Write denied:** PAT lacks `mcp:write`.
- **Not found:** ID is wrong or outside the issuing user's project boundary.
- **Validation error:** check required fields, UUIDs, date format, color format, limits, and `confirm: true` for destructive tools.

## Related documentation

- [MCP server and personal access tokens](../integrations/mcp-server.md)
- [Personal access tokens for MCP](../security/authentication/personal-access-tokens.md)
- [Deployment and operations](../DEPLOYMENT.md)
- [Development guide](../DEVELOPMENT.md)
