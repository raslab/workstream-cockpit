export const RETURN_TO_STORAGE_KEY = 'workstream-cockpit:returnTo';

const DEFAULT_RETURN_TO = '/';
const AUTH_PATHS = new Set(['/login', '/auth/callback']);

export function getCurrentReturnTo(
  location: Pick<Location, 'pathname' | 'search' | 'hash'> = window.location,
) {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function getSafeReturnTo(returnTo: string | null | undefined): string {
  if (!returnTo) {
    return DEFAULT_RETURN_TO;
  }

  if (!returnTo.startsWith('/') || returnTo.startsWith('//') || returnTo.includes('\\')) {
    return DEFAULT_RETURN_TO;
  }

  try {
    const url = new URL(returnTo, window.location.origin);

    if (url.origin !== window.location.origin || AUTH_PATHS.has(url.pathname)) {
      return DEFAULT_RETURN_TO;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}

export function buildLoginRedirectUrl(returnTo: string): string {
  return `/login?returnTo=${encodeURIComponent(getSafeReturnTo(returnTo))}`;
}

export function storeReturnTo(returnTo: string | null | undefined): void {
  const safeReturnTo = getSafeReturnTo(returnTo);

  if (safeReturnTo === DEFAULT_RETURN_TO) {
    sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(RETURN_TO_STORAGE_KEY, safeReturnTo);
}

export function consumeStoredReturnTo(): string {
  const returnTo = getSafeReturnTo(sessionStorage.getItem(RETURN_TO_STORAGE_KEY));
  sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
  return returnTo;
}
