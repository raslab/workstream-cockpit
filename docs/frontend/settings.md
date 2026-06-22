# Settings UI

Settings groups user-managed configuration for Workstream Cockpit.

Current settings areas include:

- Stream types/categories: name, color, optional emoji, and ordering.
- Tags: display name and color for cross-cutting context labels.
- Personal access tokens: API/MCP automation credentials.
- Appearance: system, light, and dark theme preference.

Implementation note: stream types are still named `Category` in backend routes and some frontend components.

## Editing behavior

Settings changes should preserve existing stream history. Removing or changing a label must not delete streams, status updates, or timeline events.

## Related docs

- [Stream types](../product/stream-types.md)
- [Tags](../product/tags.md)
- [MCP server and personal access tokens](../integrations/mcp-server.md)
- [Appearance and theme preferences](./appearance-theme.md)
