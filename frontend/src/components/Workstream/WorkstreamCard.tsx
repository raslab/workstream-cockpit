import { CSSProperties, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Workstream } from '../../types/workstream';
import { formatDistanceToNow } from 'date-fns';
import { StatusUpdateDialog } from '../StatusUpdate/StatusUpdateDialog';
import { apiClient } from '../../api/client';
import { MarkdownRenderer } from '../Markdown/MarkdownRenderer';
import { TagChip } from '../Tag/TagChip';
import { WorkstreamCreateDialog } from './WorkstreamCreateDialog';
import { ParentSelectorDialog } from './ParentSelectorDialog';
import { DEFAULT_CATEGORY_COLOR, DEFAULT_CATEGORY_EMOJI, getCategoryIconBandBackground } from '../../utils/categoryColor';
import { WorkstreamLink, WorkstreamReferenceContent, workstreamPath } from './WorkstreamReference';

interface WorkstreamCardProps {
  workstream: Workstream;
}

const TAG_GAP_PX = 6;
function formatActivity(value?: string | null) {
  if (!value) {
    return 'no updates';
  }

  return formatDistanceToNow(new Date(value), { addSuffix: true }).replace(/^about /, '');
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

function SubstreamIcon() {
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
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-current">
      <circle data-testid="more-icon-dot" cx="12" cy="5" r="1.8" fill="currentColor" />
      <circle data-testid="more-icon-dot" cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle data-testid="more-icon-dot" cx="12" cy="19" r="1.8" fill="currentColor" />
    </svg>
  );
}

export function calculateVisibleTagCount(containerWidth: number, tagWidths: number[], overflowChipWidth: number, gap = TAG_GAP_PX) {
  if (tagWidths.length === 0) {
    return 0;
  }

  const totalTagsWidth = tagWidths.reduce((sum, width) => sum + width, 0);
  const totalGapsWidth = Math.max(0, tagWidths.length - 1) * gap;

  if (totalTagsWidth + totalGapsWidth <= containerWidth) {
    return tagWidths.length;
  }

  let usedWidth = 0;
  let visibleCount = 0;

  for (const tagWidth of tagWidths) {
    const tagGap = visibleCount > 0 ? gap : 0;
    const nextWidth = usedWidth + tagGap + tagWidth + gap + overflowChipWidth;

    if (nextWidth > containerWidth) {
      break;
    }

    usedWidth += tagGap + tagWidth;
    visibleCount += 1;
  }

  return visibleCount;
}

function MeasuredTagList({ tags }: { tags: string[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overflowMeasureRef = useRef<HTMLSpanElement | null>(null);
  const tagWidthCacheRef = useRef(new Map<string, number>());
  const [visibleCount, setVisibleCount] = useState(tags.length);

  const measure = useCallback(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const containerWidth = container.getBoundingClientRect().width || container.clientWidth;
    const visibleTagWrappers = Array.from(container.querySelectorAll<HTMLElement>('[data-tag-chip-index]'));

    visibleTagWrappers.forEach((wrapper) => {
      const tagName = wrapper.dataset.tagName;
      const width = wrapper.getBoundingClientRect().width || wrapper.offsetWidth;

      if (tagName && width > 0) {
        tagWidthCacheRef.current.set(tagName, width);
      }
    });

    const tagWidths = tags.map((tag) => tagWidthCacheRef.current.get(tag) || 0);

    if (containerWidth <= 0 || tagWidths.some((width) => width <= 0)) {
      return;
    }

    const overflowChipWidth = overflowMeasureRef.current
      ? overflowMeasureRef.current.getBoundingClientRect().width || overflowMeasureRef.current.offsetWidth
      : 0;
    const nextVisibleCount = calculateVisibleTagCount(containerWidth, tagWidths, overflowChipWidth, TAG_GAP_PX);
    setVisibleCount((currentVisibleCount) => (currentVisibleCount === nextVisibleCount ? currentVisibleCount : nextVisibleCount));
  }, [tags]);

  useLayoutEffect(() => {
    measure();

    const container = containerRef.current;

    if (!container || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [measure]);

  const hiddenCount = Math.max(0, tags.length - visibleCount);

  return (
    <div ref={containerRef} className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-hidden">
      {tags.slice(0, visibleCount).map((tag, index) => (
        <span key={tag} data-tag-chip-index={index} data-tag-name={tag} className="min-w-0 flex-none">
          <TagChip tagName={tag} />
        </span>
      ))}
      {hiddenCount > 0 && (
        <span
          data-testid="hidden-tags-count"
          aria-label={`${hiddenCount} hidden tags`}
          className="inline-flex flex-none items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
        >
          +{hiddenCount}
        </span>
      )}
      <span
        ref={overflowMeasureRef}
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] top-0 inline-flex flex-none items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700"
      >
        +{tags.length}
      </span>
    </div>
  );
}

export function WorkstreamCard({ workstream }: WorkstreamCardProps) {
  const location = useLocation();
  const { category, latestStatus, allTags } = workstream;
  const [showDialog, setShowDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreateSubstream, setShowCreateSubstream] = useState(false);
  const [showParentDialog, setShowParentDialog] = useState(false);
  const queryClient = useQueryClient();

  const tags = allTags || [];
  const hasTags = tags.length > 0;
  const categoryColor = category?.color || DEFAULT_CATEGORY_COLOR;
  const categorySoftColor = getCategoryIconBandBackground(categoryColor, DEFAULT_CATEGORY_COLOR);
  const categoryEmoji = category?.emoji || DEFAULT_CATEGORY_EMOJI;
  const directActivityAt =
    workstream.lastDirectUpdateAt ||
    (latestStatus && latestStatus.impact !== 'info' && latestStatus.impact !== 'initial'
      ? latestStatus.createdAt
      : null);
  const selfDisplayAt = directActivityAt || latestStatus?.createdAt || workstream.createdAt;
  const selfActivityLabel = latestStatus || directActivityAt ? 'Self:' : 'Created:';
  const sourceStream = workstream.latestSubstreamActivitySource;
  const substreamActivityAge = workstream.lastSubstreamActivityAt ? formatActivity(workstream.lastSubstreamActivityAt) : null;
  const substreamCount = workstream.substreamCount ?? 0;
  const substreamCountsText = substreamCount > 0
    ? `${workstream.activeSubstreamCount ?? 0} active / ${workstream.closedSubstreamCount ?? 0} closed sub-streams`
    : null;
  const nextStepCount = workstream.openNextStepCount ?? workstream.nextStepCount ?? 0;
  const nextStepsText = nextStepCount > 0 ? `${nextStepCount} next ${nextStepCount === 1 ? 'step' : 'steps'}` : null;
  const hasCountRow = Boolean(substreamCountsText || nextStepsText);

  const categoryStyle = {
    '--workstream-category': categoryColor,
    '--workstream-category-soft': categorySoftColor,
  } as CSSProperties;
  const detailNavigationState = {
    from: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      label: 'Cockpit',
    },
  };

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
        className={`relative grid h-full content-start grid-cols-[7px_66px_minmax(0,1fr)_auto] rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${workstream.state === 'closed' ? 'bg-gray-50/80 dark:bg-gray-800/70' : ''}`}
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
          className="absolute left-[18px] top-2 z-10 flex h-11 w-11 items-center justify-center rounded-lg text-2xl shadow-[inset_0_0_0_1px_rgba(15,23,42,0.07)]"
          style={{ backgroundColor: categorySoftColor }}
          title={category?.name || 'Uncategorized'}
        >
          {categoryEmoji}
        </div>

        <div className="relative z-10 col-start-3 row-start-1 min-w-0 pl-3 pr-36 pt-3">
          <h3 className={`text-base font-semibold leading-tight text-gray-900 dark:text-gray-100 ${workstream.state === 'closed' ? 'text-gray-600 dark:text-gray-400' : ''}`}>
            <WorkstreamLink workstream={workstream} state={detailNavigationState} />
          </h3>
        </div>

        <button
          className="absolute right-2 top-2 z-20 inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 shadow-sm hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          onClick={() => setShowDialog(true)}
          aria-label="Log status"
        >
          <StatusIcon />
          <span>Log status</span>
        </button>

        {workstream.parent && (
          <div
            data-testid="workstream-parent-row"
            className="relative z-10 col-start-3 col-end-5 row-start-2 mt-0.5 min-w-0 overflow-hidden pl-3 pr-36"
          >
            <Link
              to={workstreamPath(workstream.parent)}
              state={detailNavigationState}
              className="inline-flex max-w-full min-w-0 items-center gap-1.5 overflow-hidden text-xs text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
            >
              <ParentIcon />
              <span className="truncate">Parent: <WorkstreamReferenceContent workstream={workstream.parent} /></span>
            </Link>
          </div>
        )}

        <Link
          to={workstreamPath(workstream)}
          state={detailNavigationState}
          className={`relative z-10 col-start-3 col-end-4 min-w-0 pl-3 pr-2 ${workstream.parent ? 'row-start-3 mt-1' : 'row-start-2 mt-1'}`}
        >
          {latestStatus ? (
            <MarkdownRenderer content={latestStatus.status} className="text-sm leading-snug text-gray-700 dark:text-gray-300" />
          ) : (
            <p className="text-sm leading-snug text-gray-500 dark:text-gray-400">No status updates yet</p>
          )}
        </Link>

        <div className={`relative z-10 col-start-3 col-end-5 flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden pl-3 pr-14 ${workstream.parent ? 'row-start-4 mt-2' : 'row-start-3 mt-2'} ${hasTags || hasCountRow ? '' : 'pb-3'}`}>
          <span className={`inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-xs text-gray-600 dark:text-gray-300 ${directActivityAt || latestStatus ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40' : 'border-gray-100 bg-gray-50/70 text-gray-500 dark:border-gray-700 dark:bg-gray-900/20 dark:text-gray-400'}`}>
            <ClockIcon />
            <strong className="font-bold text-gray-700 dark:text-gray-200">{selfActivityLabel}</strong>
            {formatActivity(selfDisplayAt)}
          </span>

          {substreamActivityAge && (
            <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
              <SubstreamIcon />
              <strong className="flex-none whitespace-nowrap font-bold text-gray-700 dark:text-gray-200">Sub-stream:</strong>
              <span className="flex-none whitespace-nowrap">{substreamActivityAge}{sourceStream ? ' via' : ''}</span>
              {sourceStream && <WorkstreamLink workstream={sourceStream} state={detailNavigationState} className="min-w-0 flex-1 truncate text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200" />}
            </span>
          )}
        </div>

        {hasCountRow && (
          <div className={`relative z-10 col-start-3 col-end-5 flex min-w-0 flex-wrap items-center gap-2 pl-3 pr-14 pt-2 ${workstream.parent ? 'row-start-5' : 'row-start-4'} ${hasTags ? '' : 'pb-3'}`}>
            {substreamCountsText && (
              <span className="inline-flex max-w-full items-center truncate whitespace-nowrap rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                {substreamCountsText}
              </span>
            )}
            {nextStepsText && (
              <span className="inline-flex max-w-full items-center truncate whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                {nextStepsText}
              </span>
            )}
          </div>
        )}

        {hasTags && (
          <div
            data-testid="workstream-tags"
            className={`relative z-10 col-start-3 col-end-5 flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden pb-3 pl-3 pr-14 pt-2 ${workstream.parent ? (hasCountRow ? 'row-start-6' : 'row-start-5') : (hasCountRow ? 'row-start-5' : 'row-start-4')} [&_button]:min-w-0 [&_button]:max-w-full [&_button]:flex-none [&_button]:overflow-hidden [&_button]:text-ellipsis [&_button]:whitespace-nowrap`}
          >
            <MeasuredTagList tags={tags} />
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

      <StatusUpdateDialog workstreamId={workstream.id} workstreamName={workstream.name} workstreamNumber={workstream.number} isOpen={showDialog} onClose={() => setShowDialog(false)} />
      <WorkstreamCreateDialog isOpen={showCreateSubstream} onClose={() => setShowCreateSubstream(false)} parent={{ id: workstream.id, number: workstream.number, name: workstream.name, state: workstream.state, depth: workstream.depth }} />
      <ParentSelectorDialog workstream={workstream} isOpen={showParentDialog} onClose={() => setShowParentDialog(false)} />
    </>
  );
}
