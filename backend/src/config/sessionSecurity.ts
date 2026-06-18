import { CookieOptions } from 'express';
import { SessionOptions } from 'express-session';

export const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
export const DEFAULT_SESSION_COOKIE_NAME = 'connect.sid';

function getSessionMaxAge(env: NodeJS.ProcessEnv = process.env): number {
  const configuredMaxAge = env.SESSION_MAX_AGE ? Number(env.SESSION_MAX_AGE) : SESSION_MAX_AGE;
  return Number.isFinite(configuredMaxAge) && configuredMaxAge > 0 ? configuredMaxAge : SESSION_MAX_AGE;
}

const WEAK_SESSION_SECRETS = new Set([
  '',
  'secret',
  'keyboard cat',
  'test-secret',
  'changeme',
  'change-me',
  'change_me',
  'default',
  'session-secret',
  'your-session-secret',
  'your_session_secret',
  'workstream-cockpit-session-secret',
  'change-me-to-a-random-32-plus-character-value',
]);

const WEAK_SESSION_SECRET_SUBSTRINGS = [
  'changeme',
  'change-me',
  'change_me',
  'your-',
  'your_',
  'example',
  'default',
];

export function getSessionCookieName(env: NodeJS.ProcessEnv = process.env): string {
  return env.SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE_NAME;
}

export function getSessionCookieOptions(env: NodeJS.ProcessEnv = process.env): SessionOptions['cookie'] {
  const isProduction = env.NODE_ENV === 'production';

  return {
    secure: isProduction,
    httpOnly: true,
    maxAge: getSessionMaxAge(env),
    sameSite: isProduction ? 'none' : 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
  };
}

export function getSessionCookieClearOptions(env: NodeJS.ProcessEnv = process.env): CookieOptions {
  const cookieOptions = { ...(getSessionCookieOptions(env) as CookieOptions) };
  delete cookieOptions.maxAge;

  return cookieOptions;
}

export function validateSessionSecret(
  secret: string | undefined,
  env: NodeJS.ProcessEnv = process.env
): void {
  const trimmedSecret = secret?.trim();

  if (!trimmedSecret) {
    throw new Error('SESSION_SECRET environment variable is required');
  }

  if (env.NODE_ENV !== 'production') {
    return;
  }

  const normalized = trimmedSecret.toLowerCase();
  if (trimmedSecret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters in production');
  }

  if (
    WEAK_SESSION_SECRETS.has(normalized) ||
    WEAK_SESSION_SECRET_SUBSTRINGS.some((placeholder) => normalized.includes(placeholder))
  ) {
    throw new Error('SESSION_SECRET must not use a weak/default value in production');
  }
}

export function getSessionSecret(env: NodeJS.ProcessEnv = process.env): string {
  validateSessionSecret(env.SESSION_SECRET, env);
  return env.SESSION_SECRET!.trim();
}
