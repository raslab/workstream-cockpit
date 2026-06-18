# Category ID authorization

Related specs:

- [Session hardening](../authentication/session-hardening.md)
- [Logout and session invalidation](../authentication/logout-session-invalidation.md)

## Purpose

Any operation that accepts or assigns a `categoryId` must verify that the category belongs to the same authorized project as the request context. A category from another project must never be accepted only because its ID exists.

## Expected behavior

For every request that uses a `categoryId`:

1. Resolve the authenticated user.
2. Resolve the user's authorized project context.
3. Verify the category exists in that same project.
4. Continue only when the category belongs to that project.

If the category does not exist in the current project, return a not-found/access-denied style response. Do not reveal whether the category exists in another project.

## Workstream create/update behavior

When creating or updating a workstream:

- `categoryId` omitted: no category change requested.
- `categoryId: null`: clear the category.
- `categoryId: "..."`: verify the category belongs to the current project before assigning it.

Cross-project category IDs must be rejected.

Expected route behavior:

- Service rejects with `Category not found`.
- Route returns `404` with `{ "error": "Category not found" }`.

## Category service behavior

Category operations must include project scoping:

- Read by both `id` and `projectId`.
- Verify project access before update/delete.
- Verify all IDs belong to the project before reorder operations.

## Filtering and delete behavior

Filtering workstreams by category IDs must remain project-scoped.

Deleting a category must only affect records inside the same project scope. Cross-project category IDs must not trigger updates, deletes, or reassignment.

## Implementation references

- `backend/src/services/categoryService.ts`
- `backend/src/services/workstreamService.ts`
  - `assertCategoryBelongsToProject`
  - `createWorkstream`
  - `updateWorkstream`
  - `getWorkstreams`
- `backend/src/routes/workstreams.ts`

## Regression tests

- `backend/tests/integration/workstreams.test.ts`
  - create with same-project category succeeds.
  - create with cross-project category returns `404`.
  - update to same-project category succeeds.
  - update to cross-project category returns `404`.
  - `categoryId: null` clears the category.

Additional category-service coverage should verify cross-project update/delete/reorder rejection.
