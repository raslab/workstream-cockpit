# MCP Personal Access Tokens PR1 Scope Plan

> **For Hermes:** Use the subagent-driven-development skill to implement each task. Parent/orchestrator coordinates only.

**Goal:** Ship the first MCP foundation PR: users can create, list, and revoke personal access tokens (PATs) from Settings, with secure backend storage and tests.

**Architecture:** PR1 adds the PAT data model, token service, session-authenticated REST endpoints, and Settings UI. It intentionally stops before MCP transport/auth work.

---

## Scope guard

### In scope

- Prisma `PersonalAccessToken` model and migration.
- PAT service for token generation, hashing, metadata listing, verification helper, and revocation.
- Session-authenticated REST API:
  - `GET /api/personal-access-tokens`
  - `POST /api/personal-access-tokens`
  - `DELETE /api/personal-access-tokens/:id`
- Settings UI section for PAT management.
- Frontend API client and tests.
- Backend unit/integration tests proving raw token secrecy and revocation behavior.
- Minimal docs link/update for this implementation plan.

### Explicitly out of scope for PR1

- No `/mcp` endpoint or MCP transport.
- No MCP SDK dependency.
- No bearer-token middleware, including `patAuth`.
- No MCP tools or MCP reads/writes.
- No rate limiting, audit log stream, or admin token management.

**Important:** `verifyPersonalAccessToken` is allowed only as a service helper with unit tests. Do not wire it into Express middleware or any request path in PR1.

---

## Product and validation decisions

- Token format: `wsc_pat_<base64url random secret>`.
- Raw token is returned only in the create response and is never persisted.
- Store only `tokenHash` plus non-secret prefix/metadata.
- Hash with SHA-256 behind a helper function so a later PR can swap in keyed hashing.
- Scopes supported now because the UI must create tokens future MCP can enforce:
  - `mcp:read`
  - `mcp:write`
- UI defaults to read-only (`mcp:read`). Read-write (`mcp:read` + `mcp:write`) is opt-in with warning copy.
- Expiry is optional and defaults to no expiry.
- Revocation is soft delete via `revokedAt`.
- Validate consistently in service and route layers:
  - `name`: trim, required after trim, cap length at 100 characters.
  - `scopes`: required non-empty array; only allowed values above; de-dupe before storage.
  - `expiresAt`: optional ISO date string at the API boundary; reject invalid or past dates; service accepts `Date | null`.

---

## Task 1: Add PAT Prisma model and migration

**Objective:** Persist PAT metadata without storing raw tokens.

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_personal_access_tokens/migration.sql`

**Steps:**

1. Add relation to `Person`:

```prisma
personalAccessTokens PersonalAccessToken[]
```

2. Add model:

```prisma
model PersonalAccessToken {
  id          String    @id @default(uuid())
  personId    String    @map("person_id")
  name        String
  tokenHash   String    @unique @map("token_hash")
  tokenPrefix String    @map("token_prefix")
  scopes      String[]  @default([])
  lastUsedAt  DateTime? @map("last_used_at")
  expiresAt   DateTime? @map("expires_at")
  revokedAt   DateTime? @map("revoked_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)

  @@index([personId])
  @@map("personal_access_tokens")
}
```

Do not add a separate `@@index([tokenHash])`; `@unique` already creates the needed index.

3. Generate migration and Prisma client:

```bash
cd backend
npm run migrate -- --name add_personal_access_tokens
npm run prisma:generate
npm run build
```

**Acceptance:** migration exists, build succeeds, `tokenHash` is unique, and no raw token column exists.

---

## Task 2: Implement PAT service with strict unit tests

**Objective:** Provide reusable token lifecycle functions without wiring bearer auth.

**Files:**
- Create: `backend/src/services/personalAccessTokenService.ts`
- Create: `backend/tests/unit/personalAccessTokenService.test.ts`
- Modify: `backend/tests/helpers/testDb.ts`

**Required service API:**

```ts
export type PersonalAccessTokenScope = 'mcp:read' | 'mcp:write';

export interface CreatePersonalAccessTokenInput {
  personId: string;
  name: string;
  scopes: PersonalAccessTokenScope[];
  expiresAt?: Date | null;
}

export async function createPersonalAccessToken(input: CreatePersonalAccessTokenInput): Promise<{
  token: string;
  personalAccessToken: PersonalAccessTokenMetadata;
}>;

export async function listPersonalAccessTokens(personId: string): Promise<PersonalAccessTokenMetadata[]>;

export async function revokePersonalAccessToken(personId: string, tokenId: string): Promise<void>;

export async function verifyPersonalAccessToken(rawToken: string): Promise<{
  personId: string;
  tokenId: string;
  scopes: PersonalAccessTokenScope[];
} | null>;
```

**Implementation notes:**

- Use `crypto.randomBytes(32).toString('base64url')` for the random secret.
- `tokenPrefix` should be non-secret display data, e.g. first 12 chars after `wsc_pat_`.
- Metadata shape: `id`, `name`, `tokenPrefix`, `scopes`, `lastUsedAt`, `expiresAt`, `revokedAt`, `createdAt`.
- Update `backend/tests/helpers/testDb.ts` cleanup tables to include `personal_access_tokens` so tests stay isolated.
- Keep `verifyPersonalAccessToken` unused by routes/middleware in PR1.

**TDD tests first:**

- Create returns token matching `wsc_pat_` prefix.
- Returned metadata does not contain raw token or hash.
- Database row stores hash, not raw token.
- Name trim/required/max-length validation.
- Scope validation, de-dupe, read-only default handling by caller tests, and read-write token with both scopes.
- Expired token validation and verification behavior.
- Verify returns owner/scopes for active token and `null` for malformed, expired, and revoked tokens.
- Revoke only affects tokens owned by `personId`.

**Commands:**

```bash
cd backend
npm test -- --runTestsByPath tests/unit/personalAccessTokenService.test.ts
npm run build
```

---

## Task 3: Add session-authenticated PAT REST API

**Objective:** Let the browser UI manage PATs using normal login/session auth.

**Files:**
- Create: `backend/src/routes/personalAccessTokens.ts`
- Modify: `backend/src/server.ts`
- Create: `backend/tests/integration/personalAccessTokens.test.ts`

**Route mount:**

- Import the router in `backend/src/server.ts`.
- Mount it after `attachUserContext` and before `errorHandler`:

```ts
app.use('/api/personal-access-tokens', personalAccessTokenRoutes);
```

**Routes:**

- `GET /api/personal-access-tokens`
  - Requires `requireUserContext`.
  - Returns `{ personalAccessTokens: [...] }` metadata only.
- `POST /api/personal-access-tokens`
  - Requires `requireUserContext`.
  - Body: `{ name: string, scopes: string[], expiresAt?: string | null }`.
  - Applies validation from this plan.
  - Returns `{ token, personalAccessToken }`; `token` appears only here.
- `DELETE /api/personal-access-tokens/:id`
  - Requires `requireUserContext`.
  - Revokes owned token and returns `204`.
  - Treat another user's token as not found.

**TDD tests first:**

- Unauthenticated/sessionless requests are rejected.
- Create validates name, scopes, and `expiresAt`.
- Create returns raw token once.
- List never includes `token` or `tokenHash`.
- Delete revokes owned token.
- Deleting another user's token returns not found and does not revoke it.
- No bearer auth path exists for these routes.

**Commands:**

```bash
cd backend
npm test -- --runTestsByPath tests/integration/personalAccessTokens.test.ts
npm test -- --runTestsByPath tests/integration/authSecurity.test.ts
npm run build
```

---

## Task 4: Add frontend API client

**Objective:** Provide typed frontend calls for PAT Settings UI.

**Files:**
- Create: `frontend/src/api/personalAccessTokens.ts`
- Create: `frontend/src/api/__tests__/personalAccessTokens.test.ts`

**API functions:**

```ts
listPersonalAccessTokens(): Promise<PersonalAccessTokenMetadata[]>;
createPersonalAccessToken(input): Promise<{ token: string; personalAccessToken: PersonalAccessTokenMetadata }>;
revokePersonalAccessToken(id: string): Promise<void>;
```

**Implementation warnings:**

- Do not persist the raw token in localStorage/sessionStorage, React Query cache, URL state, or reusable app state.
- If React Query is used, cache only metadata/list responses. Handle the create response locally and clear the raw token on dismiss/navigation/reload.

**TDD tests first:**

- List parses metadata response.
- Create sends name/scopes/expiresAt and returns one-time token.
- Revoke calls DELETE.
- Client does not invent, cache, or persist the token outside the create response handler.

**Commands:**

```bash
cd frontend
npm test -- personalAccessTokens.test.ts
npm run build
```

---

## Task 5: Add Settings UI section

**Objective:** Users can create, copy once, inspect metadata, and revoke PATs.

**Files:**
- Modify: `frontend/src/pages/Settings.tsx`
- Modify: `frontend/src/components/Settings/SettingsSidebar.tsx`
- Create: `frontend/src/pages/PersonalAccessTokens.tsx`
- Create: `frontend/src/pages/__tests__/PersonalAccessTokens.test.tsx`

**Route/sidebar details:**

- Import `PersonalAccessTokens` in `Settings.tsx`.
- Add nested route: `<Route path="personal-access-tokens" element={<PersonalAccessTokens />} />`.
- Add sidebar tab: `Personal access tokens` at `/settings/personal-access-tokens`.
- Keep the existing Settings fallback behavior unless deliberately changing the default tab.

**UI behavior:**

- Page explains PATs are for MCP clients and automation.
- List existing tokens with name, prefix, scopes, created, last used, expiry, and revoked state.
- Create form has name input, read-only/read-write scope choice, and optional expiry date.
- Read-only is default; read-write displays explicit warning copy before creation.
- After create, show raw token in a one-time callout with copy button and warning.
- Dismissing/reloading/navigating away removes raw token from UI; it cannot be recovered from metadata.
- Revoke button asks for confirmation.

**TDD tests first:**

- Page lists token metadata without raw token.
- Create flow shows returned raw token exactly after create.
- Read-only is default.
- Read-write shows explicit warning.
- Dismiss/navigation removes raw token.
- Revoke calls API and updates list.

**Commands:**

```bash
cd frontend
npm test -- PersonalAccessTokens.test.tsx
npm run build
```

---

## Task 6: Final integration verification and docs touch-up

**Objective:** Ensure PR1 is complete and does not drift into MCP transport work.

**Files:**
- Modify if needed: `docs/README.md`
- Do not expand `docs/integrations/mcp-server.md` into implementation docs in PR1 unless only linking to this plan.

**Verification:**

```bash
cd backend
npm test -- --runInBand
npm run build

cd ../frontend
npm test
npm run build
```

**Manual UI verification:**

- Sign in and open `/settings/personal-access-tokens`.
- Create a read-only token; confirm the raw token appears once and copy works.
- Dismiss or reload; confirm the raw token is gone and only prefix/metadata remain.
- Create a read-write token; confirm warning copy appears before creation.
- Revoke a token; confirm revoked state/list update and backend rejects verification for it.

**Scope audit:**

- No `/mcp` endpoint.
- No MCP SDK dependency.
- No bearer-token middleware or `patAuth`.
- No MCP tools.
- No raw PAT stored in DB, logs, React Query cache, browser storage, or list responses.
- Settings UI cannot recover dismissed tokens.

## PR summary template

```markdown
## Summary
- Adds personal access token model, service, and session-authenticated REST API.
- Adds Settings UI for creating, listing, and revoking PATs.
- Stores only token hashes and shows raw PATs once after creation.

## Test Plan
- [ ] `cd backend && npm test -- --runInBand`
- [ ] `cd backend && npm run build`
- [ ] `cd frontend && npm test`
- [ ] `cd frontend && npm run build`
- [ ] Manual UI verification at `/settings/personal-access-tokens`

## Scope guard
- No `/mcp` endpoint, MCP SDK, bearer-token middleware, or MCP tools in this PR.
```
