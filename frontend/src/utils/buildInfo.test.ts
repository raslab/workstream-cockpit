import { describe, expect, it } from 'vitest';
import { formatBuildInfo, type BuildEnv } from './buildInfo';

const buildEnv: BuildEnv = {
  VITE_GIT_BRANCH: 'feature/version-banner',
  VITE_GIT_COMMIT: '802d719625e8f00d',
  VITE_GIT_COMMIT_DATE: '2026-06-26T12:34:56Z',
  VITE_BUILD_TIME: '2026-06-26T13:00:00Z',
};

describe('formatBuildInfo', () => {
  it('formats branch, short commit, commit date, and build time for display', () => {
    expect(formatBuildInfo(buildEnv)).toEqual({
      branch: 'feature/version-banner',
      commit: '802d719',
      commitTitle: '802d719625e8f00d',
      commitDate: '2026-06-26 12:34 UTC',
      buildTime: '2026-06-26 13:00 UTC',
    });
  });

  it('falls back to unknown labels when build metadata is unavailable', () => {
    expect(formatBuildInfo({})).toEqual({
      branch: 'unknown branch',
      commit: 'unknown commit',
      commitTitle: 'unknown commit',
      commitDate: 'unknown date',
      buildTime: 'unknown build time',
    });
  });
});
