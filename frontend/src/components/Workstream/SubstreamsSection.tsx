import { formatDistanceToNow, parseISO } from 'date-fns';
import type { Workstream } from '../../types/workstream';
import { getDirectSubstreamCount, getLatestSubstreamActivityAt, getLatestSubstreamActivitySourceId } from '../../utils/hierarchy';
import { WorkstreamLink } from './WorkstreamReference';

interface SubstreamsSectionProps {
  workstream: Workstream;
  onCreateSubstream: () => void;
}

export function SubstreamsSection({ workstream, onCreateSubstream }: SubstreamsSectionProps) {
  const substreams = workstream.substreams || [];
  const active = workstream.activeSubstreamCount ?? substreams.filter((substream) => substream.state !== 'closed').length;
  const closed = workstream.closedSubstreamCount ?? substreams.filter((substream) => substream.state === 'closed').length;
  const direct = getDirectSubstreamCount(workstream);

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

      {substreams.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No direct sub-streams yet.</p>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {substreams.map((substream) => {
            const activityAt = getLatestSubstreamActivityAt(substream);
            const source = substream.latestSubstreamActivitySource;
            const sourceId = getLatestSubstreamActivitySourceId(source);

            return (
              <div key={substream.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <WorkstreamLink workstream={substream} className="text-sm font-medium text-gray-900 hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-400" />
                  {activityAt && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      <span>Last activity</span> {formatDistanceToNow(parseISO(activityAt), { addSuffix: true })}
                      {source && sourceId && sourceId !== substream.id && (
                        <>
                          {' '}from <WorkstreamLink workstream={source} className="font-medium text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200" />
                        </>
                      )}
                    </p>
                  )}
                </div>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                  {substream.state || 'active'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
