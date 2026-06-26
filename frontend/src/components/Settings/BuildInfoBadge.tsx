import { buildInfo } from '../../utils/buildInfo';

export function BuildInfoBadge() {
  return (
    <aside
      aria-label="Deployed version"
      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
    >
      <p className="mb-1 font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
        Deployed version
      </p>
      <dl className="space-y-0.5">
        <div className="flex gap-1">
          <dt className="font-medium">Branch:</dt>
          <dd className="truncate" title={buildInfo.branch}>
            {buildInfo.branch}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt className="font-medium">Commit:</dt>
          <dd title={buildInfo.commitTitle}>{buildInfo.commit}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="font-medium">Built:</dt>
          <dd>{buildInfo.buildTime}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="font-medium">Commit date:</dt>
          <dd>{buildInfo.commitDate}</dd>
        </div>
      </dl>
    </aside>
  );
}
