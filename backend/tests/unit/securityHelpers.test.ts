import {
  getSessionCookieClearOptions,
  getSessionCookieName,
  getSessionCookieOptions,
  getSessionSecret,
  validateSessionSecret,
} from '../../src/config/sessionSecurity';
import { getGoogleOAuthAllowlist, isGoogleEmailAllowed } from '../../src/config/oauthAllowlist';

describe('session security helpers', () => {
  it('requires SESSION_SECRET', () => {
    expect(() => validateSessionSecret(undefined, { NODE_ENV: 'development' })).toThrow(
      'SESSION_SECRET environment variable is required'
    );
  });

  it('rejects short production SESSION_SECRET values', () => {
    expect(() => validateSessionSecret('short-secret', { NODE_ENV: 'production' })).toThrow(
      'SESSION_SECRET must be at least 32 characters in production'
    );
  });

  it('rejects default production SESSION_SECRET values', () => {
    expect(() =>
      validateSessionSecret('changeme-but-long-enough-to-be-32-chars', { NODE_ENV: 'production' })
    ).toThrow('SESSION_SECRET must not use a weak/default value in production');

    expect(() =>
      validateSessionSecret('change-me-to-a-random-32-plus-character-value', { NODE_ENV: 'production' })
    ).toThrow('SESSION_SECRET must not use a weak/default value in production');
  });

  it('rejects whitespace-only production SESSION_SECRET values', () => {
    expect(() => validateSessionSecret(' '.repeat(32), { NODE_ENV: 'production' })).toThrow(
      'SESSION_SECRET environment variable is required'
    );
  });

  it('uses trimmed length for production SESSION_SECRET validation', () => {
    expect(() => validateSessionSecret(` ${'a'.repeat(31)} `, { NODE_ENV: 'production' })).toThrow(
      'SESSION_SECRET must be at least 32 characters in production'
    );
  });

  it('allows strong production SESSION_SECRET values', () => {
    expect(() =>
      validateSessionSecret('a-strong-random-session-secret-value-123', { NODE_ENV: 'production' })
    ).not.toThrow();
  });

  it('returns the configured session cookie name and options', () => {
    const env = {
      NODE_ENV: 'production',
      SESSION_SECRET: 'a-strong-random-session-secret-value-123',
      SESSION_COOKIE_NAME: '__Host-workstream.sid',
      SESSION_MAX_AGE: '60000',
      COOKIE_DOMAIN: 'example.com',
    };

    expect(getSessionCookieName(env)).toBe('__Host-workstream.sid');
    expect(getSessionSecret(env)).toBe(env.SESSION_SECRET);
    expect(getSessionCookieOptions(env)).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      domain: 'example.com',
      path: '/',
      maxAge: 60000,
    });
    expect(getSessionCookieClearOptions(env)).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      domain: 'example.com',
      path: '/',
    });
    expect(getSessionCookieClearOptions(env)).not.toHaveProperty('maxAge');
  });
});

describe('Google OAuth allowlist helpers', () => {
  it('allows all emails when no allowlist is configured', () => {
    expect(isGoogleEmailAllowed('anyone@example.com', getGoogleOAuthAllowlist({}))).toBe(true);
  });

  it('allows configured emails case-insensitively', () => {
    const allowlist = getGoogleOAuthAllowlist({ GOOGLE_ALLOWED_EMAILS: 'Alice@Example.com,bob@example.com' });

    expect(isGoogleEmailAllowed('alice@example.com', allowlist)).toBe(true);
    expect(isGoogleEmailAllowed('mallory@example.com', allowlist)).toBe(false);
  });

  it('allows configured domains case-insensitively and strips leading at signs', () => {
    const allowlist = getGoogleOAuthAllowlist({ GOOGLE_ALLOWED_DOMAINS: '@Example.com, company.org' });

    expect(isGoogleEmailAllowed('user@example.com', allowlist)).toBe(true);
    expect(isGoogleEmailAllowed('user@company.org', allowlist)).toBe(true);
    expect(isGoogleEmailAllowed('user@evil.com', allowlist)).toBe(false);
  });
});
