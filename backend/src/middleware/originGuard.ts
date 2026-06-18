import { Request, Response, NextFunction } from 'express';

const DEFAULT_DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];
const CONFIGURED_ORIGIN_ENV_KEYS = [
  'CORS_ORIGIN',
  'FRONTEND_ORIGIN',
  'FRONTEND_URL',
  'SERVER_ORIGIN',
  'SERVER_URL',
  'APP_ORIGIN',
  'APP_URL',
  'PUBLIC_URL',
];

function splitConfiguredOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0 && origin !== '*');
}

function toOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getRequestHost(req: Request): string | undefined {
  return req.get('x-forwarded-host')?.split(',')[0]?.trim() || req.get('host');
}

function isSameHost(req: Request, candidate: string): boolean {
  try {
    const candidateUrl = new URL(candidate);
    return candidateUrl.host.toLowerCase() === getRequestHost(req)?.toLowerCase();
  } catch {
    return false;
  }
}

export function getAllowedRequestOrigins(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const configuredOrigins = CONFIGURED_ORIGIN_ENV_KEYS.flatMap((key) => splitConfiguredOrigins(env[key]));
  const fallbackOrigins = env.NODE_ENV === 'production' ? [] : DEFAULT_DEV_ORIGINS;
  const normalizedOrigins = [...configuredOrigins, ...fallbackOrigins]
    .map((origin) => toOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));

  return new Set(normalizedOrigins);
}

function requestSourceOrigin(req: Request): string | null {
  return toOrigin(req.get('origin')) || toOrigin(req.get('referer'));
}

export function requireTrustedMutationOrigin(
  req: Request,
  res: Response,
  next: NextFunction
): Response | void {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const sourceOrigin = requestSourceOrigin(req);
  const allowedOrigins = getAllowedRequestOrigins();

  if (
    sourceOrigin &&
    (allowedOrigins.has(sourceOrigin) || isSameHost(req, sourceOrigin))
  ) {
    return next();
  }

  return res.status(403).json({
    error: 'Forbidden',
    message: 'A trusted Origin or Referer header is required for this request',
  });
}
