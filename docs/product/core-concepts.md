# Core concepts

Workstream Cockpit tracks operational attention as streams, narrative updates, stream types, tags, views, and timeline events.

## Streams

A stream is a tracked thread of work or attention: a project, ongoing process, watch item, relationship, investigation, or later item. A stream has a name, optional context, one stream type, zero or more tags, and a chronological history.

Current constraints:

- Stream names are limited to 200 characters.
- Context and long notes are limited to 2000 characters.
- Existing streams are archived/closed rather than deleted.
- Closed streams can be reopened.

## Status updates

A status update is a short narrative progress/history note for a stream. It should be 1-4 sentences that capture what changed, what was learned, or why the stream moved.

Status updates are not traffic-light states. Avoid using them as only `green`, `yellow`, `blocked`, or similar labels unless the note also explains the concrete change.

Current constraints:

- Status text is limited to 500 characters.
- Optional notes are limited to 2000 characters.
- Updates can be corrected or deleted when they were entered incorrectly.

## Stream types

Each stream has one stream type. Stream types answer "what kind of stream is this?" Typical examples are project, process, watching, maybe later, and uncategorized.

Implementation note: the backend/API model currently calls stream types `Category`.

See [Stream types](./stream-types.md).

## Tags

Tags are cross-cutting context dimensions: people, teams, systems, domains, meetings, or other lenses that cut across stream types. A stream can have many tags, and timeline/cockpit filters can use tags to build meeting or checklist views.

See [Tags](./tags.md).

## Parent streams and sub-streams

A stream can optionally belong under one parent stream. Parent streams and sub-streams provide primary belonging when broad work needs smaller concrete threads.

See [Parent streams and sub-streams](./hierarchy-v1.md).

## Views

A view is a saved angle over the cockpit: filters, grouping, sorting, and hierarchy scope. Views are useful for recurring meetings, checklists, or focus modes.

See [Views](./views.md).

## Timeline

The timeline is the cross-stream activity log. It includes narrative status updates, stream lifecycle events, and parent stream/sub-stream structural events.

See [Timeline](./timeline.md).
