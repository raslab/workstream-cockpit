# Views

Views save a reusable cockpit angle: filters, grouping, sorting, and hierarchy scope. They support recurring meetings, checklists, and focus contexts without rebuilding filters each time.

## Stored configuration

A view can store:

- selected stream types
- selected tags
- temporal filters such as "not updated today"
- parent stream/sub-stream scope
- selected parent stream
- whether to include sub-streams under a selected parent stream
- grouping, currently including grouping by stream type
- sort field and sort direction

Views are persisted by the backend and scoped to the project.

## Default view

Each project should have a default view. The default view is loaded first when no other view is selected. The default view cannot be deleted.

## Editing views

The UI supports switching views, changing filters, saving changes to the active view, creating a new view, renaming views, and discarding unsaved changes.

Current constraints:

- View names must be meaningful and unique within the project.
- The frontend enforces a maximum of 50 saved views.

## Typical uses

- Daily review: active operational streams, grouped by stream type.
- Team sync: streams tagged with a team tag.
- Person review: streams tagged with a person's name.
- Parent stream review: a broad area with sub-streams included.
- Follow-up checklist: streams not updated today.
