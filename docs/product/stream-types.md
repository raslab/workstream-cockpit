# Stream types

Stream types classify the primary nature of a stream. They are intentionally separate from tags.

Implementation note: the data model, routes, and some UI internals currently use the name `Category` for stream types.

## Behavior

A stream type has:

- name
- color
- optional emoji
- sort order

Stream types are managed in Settings. The cockpit and timeline can filter by one or more stream types.

Typical stream types are:

- Project — concrete outcome-oriented work.
- Process — recurring or operational flow.
- Watching — something monitored for changes.
- Maybe later — intentionally deferred work.
- Uncategorized — fallback for streams without a clearer type.

## Deletion

When a stream type is removed, existing streams must not become inaccessible. The expected behavior is to detach or fall back those streams rather than deleting stream history.

## Product rule

Use stream types for primary classification. Use tags for fields, teams, people, systems, meeting contexts, or other cross-cutting dimensions.
