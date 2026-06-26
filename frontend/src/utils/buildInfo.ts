export interface BuildEnv {
  readonly VITE_GIT_BRANCH?: string;
  readonly VITE_GIT_COMMIT?: string;
  readonly VITE_GIT_COMMIT_DATE?: string;
  readonly VITE_BUILD_TIME?: string;
}

export interface FormattedBuildInfo {
  branch: string;
  commit: string;
  commitTitle: string;
  commitDate: string;
  buildTime: string;
}

function present(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed !== 'unknown' ? trimmed : fallback;
}

function formatDate(value: string | undefined, fallback: string): string {
  const rawValue = present(value, fallback);
  if (rawValue === fallback) {
    return fallback;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }

  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
    timeZoneName: 'short',
  })
    .format(date)
    .replace(',', '');
}

export function formatBuildInfo(env: BuildEnv): FormattedBuildInfo {
  const commitTitle = present(env.VITE_GIT_COMMIT, 'unknown commit');

  return {
    branch: present(env.VITE_GIT_BRANCH, 'unknown branch'),
    commit: commitTitle === 'unknown commit' ? commitTitle : commitTitle.slice(0, 7),
    commitTitle,
    commitDate: formatDate(env.VITE_GIT_COMMIT_DATE, 'unknown date'),
    buildTime: formatDate(env.VITE_BUILD_TIME, 'unknown build time'),
  };
}

export const buildInfo = formatBuildInfo(import.meta.env);
