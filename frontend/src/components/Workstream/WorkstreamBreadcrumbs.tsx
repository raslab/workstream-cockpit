import { Link } from 'react-router-dom';
import type { Workstream, WorkstreamSummary } from '../../types/workstream';
import { getWorkstreamName } from '../../utils/hierarchy';

interface WorkstreamBreadcrumbsProps {
  workstream: Workstream;
  subtleTopLevel?: boolean;
}

export function WorkstreamBreadcrumbs({ workstream, subtleTopLevel = true }: WorkstreamBreadcrumbsProps) {
  const ancestors = workstream.ancestors || [];
  const items: WorkstreamSummary[] = [...ancestors, { id: workstream.id, name: workstream.name }];

  if (items.length <= 1 && subtleTopLevel) {
    return <div className="text-xs text-gray-500 dark:text-gray-400">Top-level</div>;
  }

  return (
    <nav aria-label="Workstream breadcrumbs" className="flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.id}-${index}`} className="inline-flex items-center gap-1">
            {index > 0 && <span aria-hidden="true">›</span>}
            {isLast ? (
              <span className="font-medium text-gray-700 dark:text-gray-300">{getWorkstreamName(item)}</span>
            ) : (
              <Link to={`/workstreams/${item.id}`} className="hover:text-primary-600 dark:hover:text-primary-400">
                {getWorkstreamName(item)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
