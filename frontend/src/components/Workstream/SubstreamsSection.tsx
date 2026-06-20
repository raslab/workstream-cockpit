import { Link } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { Workstream } from '../../types/workstream';
import { getDirectChildCount, getLatestSubstreamActivityAt, getLatestSubstreamActivitySourceId, getWorkstreamName } from '../../utils/hierarchy';

interface SubstreamsSectionProps {
  workstream: Workstream;
  onCreateSubstream: () => void;
}

export function SubstreamsSection({ workstream, onCreateSubstream }: SubstreamsSectionProps) {
  const children = workstream.children || [];
  const active = workstream.activeChildCount ?? children.filter((child) => child.state !== 'closed').length;
  const closed = workstream.closedChildCount ?? children.filter((child) => child.state === 'closed').length;
  const direct = getDirectChildCount(workstream);

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Sub-streams</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{direct} direct · {active} active · {closed} closed</p>
        </div>
        <button onClick={onCreateSubstream} className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700">
          Create sub-stream
        </button>
      </div>

      {children.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No direct sub-streams yet.</p>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {children.map((child) => {
            const activityAt = getLatestSubstreamActivityAt(child);
            const source = child.latestSubstreamActivitySource;
            const sourceId = getLatestSubstreamActivitySourceId(source);

            return (
              <div key={child.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <Link to={`/workstreams/${child.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-400">
                    {getWorkstreamName(child)}
                  </Link>
                  {activityAt && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      <span>Last activity</span> {formatDistanceToNow(parseISO(activityAt), { addSuffix: true })}
                      {source && sourceId && sourceId !== child.id && (
                        <>
                          {' '}from <Link to={`/workstreams/${sourceId}`} className="font-medium text-primary-700 hover:underline dark:text-primary-300">{getWorkstreamName(source)}</Link>
                        </>
                      )}
                    </p>
                  )}
                </div>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                  {child.state || 'active'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
