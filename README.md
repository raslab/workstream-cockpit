# Workstream Cockpit

Workstream Cockpit is a self-hosted operational context tool for people managing many parallel workstreams.

It keeps current context, narrative progress notes, and long-running history in one place so you can walk into a meeting, planning session, or weekly review with the right context already organized.

[Quick start](#quick-start) · [MCP setup](#mcp-setup) · [How it works](#how-it-works) · [Screenshots](#screenshots) · [Documentation](docs/README.md)

![Cockpit view showing grouped active workstreams](docs/screenshots/cockpit_view.png)

## Why it exists

When you are carrying a dozen or more concurrent efforts, the hard part is not only knowing whether something is “green” or “red.” It is remembering what changed, what is waiting on whom, which streams belong together, and what history matters when the topic comes back up.

Workstream Cockpit is designed for that operating mode:

- **Meeting-ready context:** open the cockpit or a saved view before a sync and quickly see the streams relevant to that conversation.
- **Durable stream history:** capture narrative updates over time instead of losing context in chat threads, docs, or memory.
- **Many parallel tracks:** keep projects, recurring processes, watched items, and “maybe later” ideas visible without mixing them together.
- **Flexible retrieval:** use categories, tags, and views to slice the same underlying work by meeting, team, person, topic, or checklist.
- **Self-hosted by default:** run it with Docker Compose and keep the operational record under your control.

## How it works

### Workstreams

A workstream is any ongoing thread of work or attention: a project, process, risk, customer issue, dependency, operational watch item, or idea that may become active later.

Each stream has a detail page with its context and history.

![Workstream detail view with history](docs/screenshots/stream_detailed_view.png)

### Status updates are narrative history

Updates are progress notes, not just traffic lights. They are meant to answer: what changed, what matters now, what should be remembered later?

![Adding a narrative stream update](docs/screenshots/stream_add_update.png)

### Categories describe stream type

Categories are the primary kind of workstream, such as:

- Project
- Process
- Watching
- Maybe later
- Uncategorized / untagged

They help separate fundamentally different kinds of operational attention without forcing everything into one project list.

### Tags describe dimensions

Tags are reusable context dimensions: teams, people, systems, domains, customers, themes, or meeting contexts. A stream can have multiple tags, making it easier to find the same work from different angles.

![Creating a stream with tags](docs/screenshots/stream_create_new_with_tags.png)

### Views are meeting and checklist angles

Views let you arrange the cockpit around how you actually review work: a staff meeting, launch checklist, platform watch list, customer review, or weekly planning pass.

The timeline view gives a cross-stream history when you need to reconstruct what happened across a date range or tag set.

![Timeline filtered by tags](docs/screenshots/timeline_view_tags.png)

## Features

- Cockpit view for scanning active workstreams
- Workstream detail pages with chronological update history
- Narrative status updates with optional status markers
- Categories for stream types
- Tags for teams, people, domains, and other dimensions
- Timeline view across streams, dates, and tags
- Archive and reopen flow for inactive work
- Google OAuth sign-in
- MCP server for AI clients to read and update workstreams through scoped personal access tokens
- Self-hosted Docker Compose deployment
- Optional automated PostgreSQL backups to Google Cloud Storage

## Quick start

Prerequisites: Docker, Docker Compose, and Google OAuth credentials.

```bash
git clone https://github.com/raslab/workstream-cockpit.git
cd workstream-cockpit
cp .env.example .env
```

Edit `.env` with at least:

```bash
POSTGRES_PASSWORD=change-this
SESSION_SECRET=replace-with-a-random-32-plus-character-value
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
FRONTEND_URL=http://localhost:3002
CORS_ORIGIN=http://localhost:3002
```

Then start the app:

```bash
docker compose up -d --build
```

Open `http://localhost:3002` and sign in with Google.

For production notes, environment details, backup setup, and restore commands, see [Deployment and operations](docs/DEPLOYMENT.md).

## MCP setup

Workstream Cockpit includes an MCP endpoint so AI clients can read and update operational context: workstreams, narrative updates, categories, tags, saved views, and timeline history.

1. Start Workstream Cockpit and sign in through the web UI.
2. Open **Settings → Personal access tokens**.
3. Create a read-only token for review workflows or a read-write token when the client should update Cockpit.
4. Configure your MCP client with the MCP endpoint and bearer token.

Local Docker Compose endpoint:

```yaml
mcp_servers:
  cockpit_dev:
    url: "http://localhost:3002/mcp"
    headers:
      Authorization: "Bearer wsc_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

If your backend port is exposed directly, `http://localhost:3001/mcp` also works.

Production endpoint:

```yaml
mcp_servers:
  cockpit:
    url: "https://cockpit.example.com/mcp"
    headers:
      Authorization: "Bearer wsc_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Codex UI note: the **Bearer token env var** field expects an environment variable name, not the token itself. For example, set `WSC_PAT=wsc_pat_xxx...` in the shell that starts Codex, then enter `WSC_PAT` in that field. Do not paste the raw `wsc_pat_...` value into the env-var-name field.

The MCP server exposes tools, not resources or prompts. For the full tool contract and troubleshooting, see [MCP server and personal access tokens](docs/integrations/mcp-server.md). For practical AI-client operating guidance, use the [Workstream Cockpit MCP skill](docs/skills/workstream-cockpit-mcp.md).

## Google OAuth setup

In Google Cloud Console:

1. Create or select a project.
2. Configure the OAuth consent screen.
3. Create OAuth credentials for a web application.
4. Add the authorized redirect URI: `http://localhost:3001/auth/google/callback`.
5. Copy the client ID and client secret into `.env`.

For a deployed instance, use your real backend URL in `GOOGLE_CALLBACK_URL` and in the Google redirect URI.

## Screenshots

### Cockpit

![Cockpit view](docs/screenshots/cockpit_view.png)

### Workstream detail

![Workstream detail view](docs/screenshots/stream_detailed_view.png)

### Timeline

![Timeline view filtered by tags](docs/screenshots/timeline_view_tags.png)

### Settings

![Tag settings](docs/screenshots/settings_view_tags.png)

The current screenshots cover the core product shape. A few additional screenshots would improve presentation later: a saved/custom view example, an archive/reopen example, and a meeting-prep workflow showing filtered streams plus recent updates.

## Documentation

- [Documentation index](docs/README.md)
- [Deployment and operations](docs/DEPLOYMENT.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Testing guide](docs/testing/README.md)
- [Security notes](docs/security/README.md)
- [MCP server and personal access tokens](docs/integrations/mcp-server.md)
- [Workstream Cockpit MCP skill](docs/skills/workstream-cockpit-mcp.md)

## Tech stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL with Prisma
- Auth: Google OAuth with server-side sessions
- Deployment: Docker Compose and Nginx

## Contributing

Contributions are welcome. Keep changes focused, update tests where behavior changes, and update docs when operational or product behavior changes.

Useful commands are documented in [Development guide](docs/DEVELOPMENT.md).

## License

MIT. See the package metadata for project license information.
