# Google OAuth allowlist

Related specs:

- [Session hardening](./session-hardening.md)
- [Logout and session invalidation](./logout-session-invalidation.md)

## Purpose

Google OAuth sign-in can be restricted to approved email addresses or domains. The allowlist must be normalized, predictable, and test-covered.

## Configuration

`GOOGLE_ALLOWED_EMAILS` is a comma-separated list of allowed full email addresses.

Example:

```env
GOOGLE_ALLOWED_EMAILS=alice@example.com,bob@example.com
```

`GOOGLE_ALLOWED_DOMAINS` is a comma-separated list of allowed email domains.

Example:

```env
GOOGLE_ALLOWED_DOMAINS=example.com,@company.org
```

Leading `@` is allowed for domains and normalized away.

## Normalization rules

Allowlist entries are:

- Split on commas.
- Trimmed.
- Lowercased.
- Empty entries ignored.

Domains additionally strip one leading `@`.

## Expected behavior

When both allowlists are empty or unset:

- Any successfully authenticated Google account is allowed.

When either allowlist is configured:

- A user is allowed if their normalized full email matches `GOOGLE_ALLOWED_EMAILS`.
- A user is allowed if their normalized email domain matches `GOOGLE_ALLOWED_DOMAINS`.
- Otherwise OAuth login is rejected.

Rejected login must not create a person, project, or default category records.

Logs may include allowlist counts, but must not log OAuth tokens.

## Implementation references

- `backend/src/config/oauthAllowlist.ts`
  - `getGoogleOAuthAllowlist`
  - `isGoogleEmailAllowed`
  - `describeGoogleOAuthAllowlist`
- `backend/src/config/passport.ts`

## Regression tests

- `backend/tests/unit/securityHelpers.test.ts`
  - allows all when no allowlist is configured.
  - matches configured emails case-insensitively.
  - matches configured domains case-insensitively.
  - strips leading `@` from domains.
