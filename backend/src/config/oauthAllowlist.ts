export interface GoogleOAuthAllowlist {
  emails: Set<string>;
  domains: Set<string>;
}

function parseCsv(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function getGoogleOAuthAllowlist(
  env: NodeJS.ProcessEnv = process.env
): GoogleOAuthAllowlist {
  return {
    emails: new Set(parseCsv(env.GOOGLE_ALLOWED_EMAILS)),
    domains: new Set(parseCsv(env.GOOGLE_ALLOWED_DOMAINS).map((domain) => domain.replace(/^@/, ''))),
  };
}

export function isGoogleEmailAllowed(
  email: string,
  allowlist: GoogleOAuthAllowlist = getGoogleOAuthAllowlist()
): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const domain = normalizedEmail.split('@')[1];

  if (allowlist.emails.size === 0 && allowlist.domains.size === 0) {
    return true;
  }

  return allowlist.emails.has(normalizedEmail) || Boolean(domain && allowlist.domains.has(domain));
}

export function describeGoogleOAuthAllowlist(
  allowlist: GoogleOAuthAllowlist = getGoogleOAuthAllowlist()
): { emailCount: number; domainCount: number; enabled: boolean } {
  return {
    emailCount: allowlist.emails.size,
    domainCount: allowlist.domains.size,
    enabled: allowlist.emails.size > 0 || allowlist.domains.size > 0,
  };
}
