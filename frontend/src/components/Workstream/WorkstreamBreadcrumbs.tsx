import type { Workstream, WorkstreamSummary } from '../../types/workstream';
import { WorkstreamLink, WorkstreamNumber, workstreamId, workstreamName } from './WorkstreamReference';

interface WorkstreamBreadcrumbsProps {
  workstream: Workstream;
  subtleTopLevel?: boolean;
}

export function WorkstreamBreadcrumbs({ workstream, subtleTopLevel = true }: WorkstreamBreadcrumbsProps) {
  const parentStreams = workstream.parentStreams || [];
  const items: WorkstreamSummary[] = [...parentStreams, { id: workstream.id, number: workstream.number, name: workstream.name }];

  if (items.length <= 1 && subtleTopLevel) {
    return <div className="text-xs text-gray-500 dark:text-gray-400">Top-level</div>;
  }

  return (
    <nav aria-label="Workstream breadcrumbs" className="flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${workstreamId(item) ?? workstreamName(item)}-${index}`} className="inline-flex items-center gap-1">
            {index > 0 && <span aria-hidden="true">›</span>}
            {isLast ? (
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {item.number !== undefined ? <WorkstreamNumber workstream={item} className="underline underline-offset-2" /> : workstreamName(item)}
              </span>
            ) : (
              <WorkstreamLink workstream={item} className="hover:text-primary-600 dark:hover:text-primary-400" />
            )}
          </span>
        );
      })}
    </nav>
  );
}
