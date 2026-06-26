import { describe, expect, it } from 'vitest';
import {
  buildLoginRedirectUrl,
  consumeStoredReturnTo,
  getSafeReturnTo,
  RETURN_TO_STORAGE_KEY,
  storeReturnTo,
} from './authRedirect';

describe('auth redirect helpers', () => {
  it('builds a login URL that preserves path, query, and hash for saved views and filters', () => {
    const intendedUrl = '/?view=platform-ops&tags=sre%2Cdevops&categoryIds=ktlo#filters';

    expect(buildLoginRedirectUrl(intendedUrl)).toBe(
      '/login?returnTo=%2F%3Fview%3Dplatform-ops%26tags%3Dsre%252Cdevops%26categoryIds%3Dktlo%23filters',
    );
  });

  it('builds a login URL that preserves timeline URLs exactly', () => {
    const intendedUrl = '/timeline?range=30d&tagNames=deployments&parentId=stream-1#updates';

    expect(buildLoginRedirectUrl(intendedUrl)).toBe(
      '/login?returnTo=%2Ftimeline%3Frange%3D30d%26tagNames%3Ddeployments%26parentId%3Dstream-1%23updates',
    );
  });

  it('accepts only same-origin app paths as return targets', () => {
    expect(getSafeReturnTo('/timeline?range=7d#today')).toBe('/timeline?range=7d#today');
    expect(getSafeReturnTo('https://evil.example/timeline?range=7d')).toBe('/');
    expect(getSafeReturnTo('//evil.example/timeline?range=7d')).toBe('/');
    expect(getSafeReturnTo('/login?returnTo=%2Ftimeline')).toBe('/');
    expect(getSafeReturnTo('/auth/callback?code=abc')).toBe('/');
  });

  it('stores and consumes only safe return targets', () => {
    storeReturnTo('/timeline?range=7d#today');

    expect(sessionStorage.getItem(RETURN_TO_STORAGE_KEY)).toBe('/timeline?range=7d#today');
    expect(consumeStoredReturnTo()).toBe('/timeline?range=7d#today');
    expect(sessionStorage.getItem(RETURN_TO_STORAGE_KEY)).toBeNull();

    storeReturnTo('//evil.example/phish');
    expect(sessionStorage.getItem(RETURN_TO_STORAGE_KEY)).toBeNull();
    expect(consumeStoredReturnTo()).toBe('/');
  });
});
