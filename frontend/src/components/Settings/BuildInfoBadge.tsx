import { buildInfo } from '../../utils/buildInfo';

export function BuildInfoBadge() {
  return (
    <aside
      aria-label="Deployed version"
      className="text-[11px] leading-5 text-gray-400 dark:text-gray-500"
    >
      <p className="mb-1 font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Deployed version
      </p>
      <dl className="space-y-0.5">
        <div>
          <dt className="inline font-medium">Branch:</dt>{' '}
          <dd className="inline break-all" title={buildInfo.branch}>
            {buildInfo.branch}
          </dd>
        </div>
        <div>
          <dt className="inline font-medium">Commit:</dt>{' '}
          <dd className="inline" title={buildInfo.commitTitle}>
            {buildInfo.commit}
          </dd>
        </div>
        <div>
          <dt className="inline font-medium">Built:</dt> <dd className="inline">{buildInfo.buildTime}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Commit date:</dt>{' '}
          <dd className="inline">{buildInfo.commitDate}</dd>
        </div>
      </dl>
    </aside>
  );
}
