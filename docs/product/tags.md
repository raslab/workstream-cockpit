# Tags

Tags are cross-cutting context labels for streams and timeline entries. They complement stream types rather than replacing them.

Use tags for people, teams, domains, systems, meetings, initiatives, or any dimension that can apply to many stream types.

## Hashtag syntax

Tags can be extracted from text with hashtag syntax:

- `#backend`
- `#platform-team`
- `#api_v2`

Rules:

- Tags are single words.
- Letters, numbers, hyphens, and underscores are supported.
- Matching is case-insensitive and normalized to lowercase internally.
- Multi-word tags are not supported in hashtag text.

## Managed tags

Configured tags have:

- internal normalized name, for example `platform-team`
- user-facing display name
- color

The UI displays tags as colored chips. If hashtag text exists for a tag that is not configured, the text remains part of history even if no managed tag record exists.

## Filtering

Tag filters select streams or timeline entries containing any selected tag. This makes tags useful for recurring views such as a team sync, domain review, or person-focused checklist.

## Where tags are used

Tags can be associated with stream context and status update text. Timeline export also extracts tags from timeline entry status and note fields.

## Stream types vs tags

Use a stream type for the stream's primary kind: project, process, watching, maybe later, or uncategorized.

Use tags for cross-cutting lenses: `#backend`, `#alice`, `#incident-review`, `#hiring`, or `#mcp`.
