# Filters and views UI

The cockpit and timeline expose filters that can be saved as views for recurring work modes.

## Filters

Common filters include:

- stream type/category
- tag search and multi-select
- not updated today
- date range on timeline
- event type on timeline
- parent stream/sub-stream scope where hierarchy is available

Tag filtering supports searching by display name or normalized tag name.

## Views

The views UI allows users to:

- switch between saved views
- edit filters in the active view
- save changes to the active view
- create a new view from the current configuration
- rename a view
- discard unsaved changes
- delete non-default views

The active view is backed by the `/api/views` endpoints. The frontend falls back to a default view configuration while saved views are loading.

## Related docs

- [Views](../product/views.md)
- [Timeline](../product/timeline.md)
- [Parent streams and sub-streams](../product/hierarchy-v1.md)
