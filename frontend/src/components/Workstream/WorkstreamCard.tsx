import { CSSProperties, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Workstream } from '../../types/workstream';
import { formatDistanceToNow } from 'date-fns';
import { StatusUpdateDialog } from '../StatusUpdate/StatusUpdateDialog';
import { apiClient } from '../../api/client';
import { MarkdownRenderer } from '../Markdown/MarkdownRenderer';
import { TagChip } from '../Tag/TagChip';
import { WorkstreamCreateDialog } from './WorkstreamCreateDialog';
import { ParentSelectorDialog } from './ParentSelectorDialog';

interface WorkstreamCardProps {
  workstream: Workstream;
}

const DEFAULT_CATEGORY_COLOR = '#5b8ca0';
const DEFAULT_CATEGORY_SOFT = '#c5dae4';
const DEFAULT_CATEGORY_EMOJI = '🏷️';

function hexToSoftColor(color?: string | null) {
  if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return DEFAULT_CATEGORY_SOFT;
  }

  const red = parseInt(color.slice(1, 3), 16);
  const green = parseInt(color.slice(3, 5), 16);
  const blue = parseInt(color.slice(5, 7), 16);
  const mix = (channel: number) => Math.round(channel * 0.28 + 255 * 0.72);

  return `rgb(${mix(red)}, ${mix(green)}, ${mix(blue)})`;
}

function formatActivity(value?: string | null) {
  if (!value) {
    return 'no updates';
  }

  return formatDistanceToNow(new Date(value), { addSuffix: true }).replace(/^about /, '');
}

function getSourceName(workstream: Workstream) {
  return workstream.latestSubstreamActivitySource?.name || workstream.latestSubstreamActivitySource?.workstreamName;
}

function StatusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M12 8v6M9 11h6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" className="h-3.5 w-3.5 flex-none">
      <path d="M12 8v5l3 2" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function ChildIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" className="h-3.5 w-3.5 flex-none">
      <path d="M8 7h8M8 12h8M8 17h8" />
    </svg>
  );
}

function ParentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" className="h-3.5 w-3.5 flex-none">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" className="h-5 w-5">
      <path d="M12 5h.01M12 12h.01M12 19h.01" />
    </svg>
  );
}

export function WorkstreamCard({ workstream }: WorkstreamCardProps) {
  const { name, category, latestStatus, allTags } = workstream;
  const [showDialog, setShowDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreateSubstream, setShowCreateSubstream] = useState(false);
  const [showParentDialog, setShowParentDialog] = useState(false);
  const queryClient = useQueryClient();

  const tags = allTags || [];
  const hasTags = tags.length > 0;
  const categoryColor = category?.color || DEFAULT_CATEGORY_COLOR;
  const categorySoftColor = hexToSoftColor(categoryColor);
  const categoryEmoji = category?.emoji || DEFAULT_CATEGORY_EMOJI;
  const directActivityAt = workstream.lastDirectUpdateAt || latestStatus?.updatedAt;
  const sourceName = getSourceName(workstream);
  const childActivityText = workstream.lastSubstreamActivityAt
    ? `${formatActivity(workstream.lastSubstreamActivityAt)}${sourceName ? ` via ${sourceName}` : ''}`
    : null;
  const childCountsText = (workstream.childCount ?? 0) > 0
    ? `${workstream.activeChildCount ?? 0} active / ${workstream.closedChildCount ?? 0} closed sub-streams`
    : null;

  const categoryStyle = {
    '--workstream-category': categoryColor,
    '--workstream-category-soft': categorySoftColor,
  } as CSSProperties;

  const closeMutation = useMutation({
    mutationFn: async (workstreamId: string) => {
      const response = await apiClient.put(`/api/workstreams/${workstreamId}/close`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      setShowMenu(false);
    },
  });

  return (
    <>
      <article
        className={`relative grid grid-cols-[7px_66px_minmax(0,1fr)_auto] rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${workstream.state === 'closed' ? 'bg-gray-50/80 dark:bg-gray-800/70' : ''}`}
        style={categoryStyle}
      >
        <div
          data-testid="workstream-category-rail"
          className="absolute inset-y-0 left-0 w-[7px] rounded-l-lg bg-[var(--workstream-category)]"
          style={{ backgroundColor: categoryColor }}
        />

        <div
          data-testid="workstream-category-column"
          className="absolute inset-y-0 left-[7px] w-[66px] border-r border-gray-900/[0.03] bg-[var(--workstream-category-soft)] dark:border-gray-700/40 dark:bg-gray-900/30"
        />

        <div
          data-testid="workstream-category-icon"
          className="relative z-10 col-start-2 row-start-1 mx-auto mt-2 flex h-11 w-11 items-center justify-center rounded-lg text-2xl shadow-[inset_0_0_0_1px_rgba(15,23,42,0.07)]"
          style={{ backgroundColor: categorySoftColor }}
          title={category?.name || 'Uncategorized'}
        >
          {categoryEmoji}
        </div>

        <Link
          to={`/workstreams/${workstream.id}`}
          className="relative z-10 col-start-3 row-start-1 min-w-0 pl-3 pr-2 pt-3 hover:text-primary-600 dark:hover:text-primary-400"
        >
          <h3 className={`text-base font-semibold leading-tight text-gray-900 dark:text-gray-100 ${workstream.state === 'closed' ? 'text-gray-600 dark:text-gray-400' : ''}`}>
            {name}
          </h3>
        </Link>

        <button
          className="relative z-20 col-start-4 row-start-1 mr-3 mt-3 inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 shadow-sm hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          onClick={() => setShowDialog(true)}
          aria-label="Log status"
        >
          <StatusIcon />
          <span>Log status</span>
        </button>

        {workstream.parent && (
          <Link
            to={`/workstreams/${workstream.parent.id}`}
            className="relative z-10 col-start-3 col-end-5 row-start-2 mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden pl-3 pr-4 text-xs text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
          >
            <ParentIcon />
            <span className="truncate">Parent: {workstream.parent.name || workstream.parent.workstreamName}</span>
          </Link>
        )}

        <Link
          to={`/workstreams/${workstream.id}`}
          className={`relative z-10 col-start-3 col-end-4 min-w-0 pl-3 pr-2 ${workstream.parent ? 'row-start-3 mt-1' : 'row-start-2 mt-1'}`}
        >
          {latestStatus ? (
            <MarkdownRenderer content={latestStatus.status} className="text-sm leading-snug text-gray-700 dark:text-gray-300" />
          ) : (
            <p className="text-sm leading-snug text-gray-500 dark:text-gray-400">No status updates yet</p>
          )}
        </Link>

        <div className={`relative z-10 col-start-3 col-end-5 flex min-w-0 flex-wrap items-center gap-2 pl-3 pr-14 ${workstream.parent ? 'row-start-4 mt-2' : 'row-start-3 mt-2'} ${hasTags ? '' : 'pb-3'}`}>
          <span className={`inline-flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-gray-600 dark:text-gray-300 ${directActivityAt ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40' : 'border-gray-100 bg-gray-50/70 text-gray-500 dark:border-gray-700 dark:bg-gray-900/20 dark:text-gray-400'}`}>
            <ClockIcon />
            <strong className="font-bold text-gray-700 dark:text-gray-200">Self:</strong>
            {formatActivity(directActivityAt)}
          </span>

          {childActivityText && (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
              <ChildIcon />
              <strong className="font-bold text-gray-700 dark:text-gray-200">Child:</strong>
              <span className="truncate">{childActivityText}</span>
            </span>
          )}

          {childCountsText && (
            <span className="inline-flex min-w-0 items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
              {childCountsText}
            </span>
          )}
        </div>

        {hasTags && (
          <div
            data-testid="workstream-tags"
            className={`relative z-10 col-start-3 col-end-5 flex min-w-0 flex-wrap items-center gap-1.5 pb-3 pl-3 pr-14 pt-2 ${workstream.parent ? 'row-start-5' : 'row-start-4'} [&>button]:min-w-0 [&>button]:max-w-full [&>button]:flex-[0_1_auto] [&>button]:overflow-hidden [&>button]:text-ellipsis [&>button]:whitespace-nowrap`}
          >
            {tags.map((tag) => <TagChip key={tag} tagName={tag} />)}
          </div>
        )}

        <div className="absolute bottom-2 right-2 z-20">
          <button
            className="grid h-7 w-8 place-items-center rounded-md border border-transparent text-gray-500 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="More"
          >
            <MoreIcon />
          </button>

          {showMenu && (
            <div className="absolute bottom-full right-0 z-10 mb-1 w-44 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <button onClick={() => { setShowCreateSubstream(true); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">
                Create sub-stream
              </button>
              <button onClick={() => { setShowParentDialog(true); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">
                {workstream.parentId ? 'Change parent' : 'Set parent'}
              </button>
              <button onClick={() => closeMutation.mutate(workstream.id)} disabled={closeMutation.isPending} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700">
                {closeMutation.isPending ? 'Closing...' : 'Close'}
              </button>
            </div>
          )}
        </div>
      </article>

      <StatusUpdateDialog workstreamId={workstream.id} workstreamName={workstream.name} isOpen={showDialog} onClose={() => setShowDialog(false)} />
      <WorkstreamCreateDialog isOpen={showCreateSubstream} onClose={() => setShowCreateSubstream(false)} parent={{ id: workstream.id, name: workstream.name, state: workstream.state, depth: workstream.depth }} />
      <ParentSelectorDialog workstream={workstream} isOpen={showParentDialog} onClose={() => setShowParentDialog(false)} />
    </>
  );
}
