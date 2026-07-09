import { useMemo, useState } from 'react';
import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  format,
  isToday,
  isYesterday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  subDays,
  subMonths,
  subQuarters,
} from 'date-fns';
import {
  useTimeline,
  TimelineEntry,
  TimelineEventType,
  TimelineResponse,
} from '../hooks/useTimeline';
import { useWorkstreams } from '../hooks/useWorkstreams';
import { useCategories } from '../hooks/useCategories';
import { FilterBar } from '../components/Timeline/FilterBar';
import { Link, useSearchParams } from 'react-router-dom';
import { MarkdownRenderer } from '../components/Markdown/MarkdownRenderer';
import {
  WorkstreamLink,
  WorkstreamReferenceContent,
  workstreamPath,
  workstreamReferenceText,
} from '../components/Workstream/WorkstreamReference';
import { SelectMenu } from '../components/UI/SelectMenu';
import { ExportButton } from '../components/Timeline/ExportButton';
import { DateRangeQuickPreset } from '../components/Timeline/DateRangeFilter';
import {
  dateToUrlDate,
  parseTimelineSearch,
  serializeTimelineSearch,
  TimelineUrlState,
  urlDateToDate,
} from '../utils/urlState';
import { useResourceChangeScreen } from '../components/Notifications/ResourceChangeNotificationProvider';

function timelineTrail(entry: TimelineEntry) {
  return [...(entry.parentStreams || []), entry].map((stream) => {
    const ref = stream as {
      id?: string;
      number?: number;
      name?: string;
      workstreamId?: string;
      workstreamNumber?: number;
      workstreamName?: string;
    };
    return {
      id: ref.workstreamId || ref.id,
      number: ref.workstreamNumber ?? ref.number,
      name: ref.workstreamName || ref.name,
    };
  });
}

function UpdateImpactChip({ impact }: { impact?: TimelineEntry['impact'] }) {
  const normalizedImpact = impact ?? 'active';
  const className = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200',
    info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200',
    initial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200',
  }[normalizedImpact];

  return (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${className}`}
    >
      {normalizedImpact}
    </span>
  );
}

export default function Timeline() {
  useResourceChangeScreen({ screen: 'timeline' });
  const getQuickDateRange = (preset: DateRangeQuickPreset) => {
    const now = new Date();
    switch (preset) {
      case 'last-7-days':
        return { startDate: startOfDay(subDays(now, 7)), endDate: endOfDay(now) };
      case 'last-14-days':
        return { startDate: startOfDay(subDays(now, 14)), endDate: endOfDay(now) };
      case 'last-30-days':
        return { startDate: startOfDay(subDays(now, 30)), endDate: endOfDay(now) };
      case 'last-60-days':
        return { startDate: startOfDay(subDays(now, 60)), endDate: endOfDay(now) };
      case 'this-month':
        return { startDate: startOfMonth(now), endDate: endOfDay(now) };
      case 'last-month': {
        const lastMonth = subMonths(now, 1);
        return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
      }
      case 'this-quarter':
        return { startDate: startOfQuarter(now), endDate: endOfDay(now) };
      case 'last-quarter': {
        const lastQuarter = subQuarters(now, 1);
        return { startDate: startOfQuarter(lastQuarter), endDate: endOfQuarter(lastQuarter) };
      }
    }
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const { data: categories = [] } = useCategories();
  const { data: workstreams = [] } = useWorkstreams({ state: 'active' });
  const urlState = useMemo(
    () => parseTimelineSearch(searchParams, { categories, workstreams }),
    [searchParams, categories, workstreams],
  );
  const quickPreset = urlState.quickPreset as DateRangeQuickPreset | undefined;
  const quickRange = quickPreset ? getQuickDateRange(quickPreset) : undefined;
  const selectedCategoryIds = urlState.categoryIds;
  const selectedTags = urlState.tags;
  const customStartDate = quickRange?.startDate ?? urlDateToDate(urlState.startDate);
  const customEndDate = quickRange?.endDate ?? urlDateToDate(urlState.endDate);
  const streamScope = urlState.streamScope;
  const parentId = urlState.parentId || '';
  const includeSubstreams = urlState.includeSubstreams;
  const activityFilter = urlState.activity;
  const [pageSize, setPageSize] = useState<50 | 100 | 200>(50);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState<Array<string | undefined>>([undefined]);

  const resetPagination = () => {
    setPageIndex(0);
    setPageCursors([undefined]);
  };

  const writeTimelineSearch = (patch: Partial<TimelineUrlState>) => {
    setSearchParams(
      serializeTimelineSearch({ ...urlState, ...patch }, { categories, workstreams }),
      { replace: true },
    );
    resetPagination();
  };

  const setSelectedCategoryIds = (categoryIds: string[]) => writeTimelineSearch({ categoryIds });
  const setSelectedTags = (tags: string[]) => writeTimelineSearch({ tags });
  const setStreamScope = (nextScope: 'all' | 'top-level' | 'sub-streams' | 'under-parent') =>
    writeTimelineSearch({ streamScope: nextScope });
  const setParentId = (nextParentId: string) =>
    writeTimelineSearch({ parentId: nextParentId || undefined });
  const setIncludeSubstreams = (nextInclude: boolean) =>
    writeTimelineSearch({ includeSubstreams: nextInclude });
  const setActivityFilter = (nextActivity: 'all' | TimelineEventType) =>
    writeTimelineSearch({ activity: nextActivity });

  const currentCursor = pageCursors[pageIndex];

  const handleQuickPresetChange = (preset: DateRangeQuickPreset | undefined) => {
    writeTimelineSearch({
      quickPreset: preset ?? 'last-7-days',
      startDate: undefined,
      endDate: undefined,
    });
  };

  const handleCustomStartDateChange = (date: Date | undefined) => {
    writeTimelineSearch({
      quickPreset: undefined,
      startDate: dateToUrlDate(date),
      endDate: dateToUrlDate(customEndDate),
    });
  };

  const handleCustomEndDateChange = (date: Date | undefined) => {
    writeTimelineSearch({
      quickPreset: undefined,
      startDate: dateToUrlDate(customStartDate),
      endDate: dateToUrlDate(date),
    });
  };

  const {
    data: timelineResponse,
    isLoading,
    error,
  } = useTimeline({
    startDate: customStartDate,
    endDate: customEndDate,
    limit: pageSize,
    cursor: currentCursor,
    categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    streamScope,
    parentId: streamScope === 'under-parent' && parentId ? parentId : undefined,
    includeSubstreams,
    eventTypes: activityFilter === 'all' ? undefined : [activityFilter],
    includeStructuralEvents: true,
  });

  const timelineData = timelineResponse as TimelineResponse | TimelineEntry[] | undefined;
  const timeline: TimelineEntry[] | undefined = Array.isArray(timelineData)
    ? timelineData
    : timelineData?.events;
  const nextCursor = Array.isArray(timelineData)
    ? undefined
    : (timelineData?.nextCursor ?? undefined);
  const currentPageTimeline = timeline?.slice(0, pageSize);

  const handleNextPage = () => {
    if (!nextCursor) return;
    setPageCursors((cursors) => [...cursors.slice(0, pageIndex + 1), nextCursor]);
    setPageIndex((index) => index + 1);
  };

  const handlePreviousPage = () => {
    if (pageIndex === 0) return;
    setPageIndex((index) => index - 1);
  };

  const paginationButtonClassName =
    'h-9 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800';

  const renderPaginationControls = (options: { className?: string; testId?: string } = {}) => (
    <div
      data-testid={options.testId}
      className={`flex flex-wrap items-center justify-end gap-6 ${options.className ?? ''}`.trim()}
    >
      <nav className="flex items-center gap-3" aria-label="Timeline pagination">
        <button
          type="button"
          aria-label="Previous page"
          onClick={handlePreviousPage}
          disabled={pageIndex === 0}
          className={paginationButtonClassName}
        >
          Previous
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Page {pageIndex + 1}
        </span>
        <button
          type="button"
          aria-label="Next page"
          onClick={handleNextPage}
          disabled={!nextCursor}
          className={paginationButtonClassName}
        >
          Next
        </button>
      </nav>
      <div data-testid="timeline-page-size" className="whitespace-nowrap">
        <SelectMenu
          label="Page size"
          value={String(pageSize) as '50' | '100' | '200'}
          onChange={(nextPageSize) => {
            setPageSize(Number(nextPageSize) as 50 | 100 | 200);
            resetPagination();
          }}
          className="flex items-center gap-2 [&>span]:mb-0"
          buttonClassName="h-9"
          menuClassName="right-0 left-auto"
          options={[
            { value: '50', label: '50' },
            { value: '100', label: '100' },
            { value: '200', label: '200' },
          ]}
        />
      </div>
    </div>
  );

  // Group timeline entries by date
  const groupedEntries = currentPageTimeline?.reduce(
    (groups, entry) => {
      const date = format(parseISO(entry.createdAt), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
      return groups;
    },
    {} as Record<string, TimelineEntry[]>,
  );

  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const renderEventContent = (entry: TimelineEntry) => {
    switch (entry.eventType) {
      case 'workstream_created':
        return (
          <div className="flex items-center gap-2">
            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-200">
              Created
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Workstream created</span>
          </div>
        );
      case 'workstream_closed':
        return (
          <div className="flex items-center gap-2">
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              Closed
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Workstream closed</span>
          </div>
        );
      case 'parent_changed':
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              Parent changed
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Moved from {entry.oldParentName || entry.metadata?.oldParentName || 'top level'} to{' '}
              {entry.newParentName || entry.metadata?.newParentName || 'top level'}
            </span>
          </div>
        );
      case 'sub_stream_created':
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
              Sub-stream created
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Created under{' '}
              {entry.parent ? (
                <WorkstreamLink workstream={entry.parent} />
              ) : (
                entry.parentName ||
                entry.newParentName ||
                entry.metadata?.newParentName ||
                'parent stream'
              )}
            </span>
          </div>
        );
      case 'status_update':
      default:
        return (
          <div>
            <MarkdownRenderer
              content={entry.status!}
              className="text-sm text-gray-700 dark:text-gray-300"
            />
            {entry.note && (
              <div className="mt-3 border-t border-gray-900 pt-2 dark:border-gray-700">
                <MarkdownRenderer
                  content={entry.note}
                  className="text-sm text-gray-600 dark:text-gray-400"
                />
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Timeline</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review recent activity across all workstreams
        </p>
      </div>

      <div
        data-testid="timeline-filters-panel"
        className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="flex flex-wrap items-end gap-4">
          <FilterBar
            selectedCategoryIds={selectedCategoryIds}
            onCategoryIdsChange={(categoryIds) => {
              setSelectedCategoryIds(categoryIds);
              resetPagination();
            }}
            selectedTags={selectedTags}
            onTagsChange={(tags) => {
              setSelectedTags(tags);
              resetPagination();
            }}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            quickPreset={quickPreset}
            onCustomStartDateChange={handleCustomStartDateChange}
            onCustomEndDateChange={handleCustomEndDateChange}
            onQuickPresetChange={handleQuickPresetChange}
          />
          <div>
            <SelectMenu
              label="Stream scope"
              value={streamScope}
              onChange={(nextScope) => {
                setStreamScope(nextScope);
                resetPagination();
              }}
              options={[
                { value: 'all', label: 'All streams' },
                { value: 'top-level', label: 'Top-level only' },
                { value: 'sub-streams', label: 'Sub-streams only' },
                { value: 'under-parent', label: 'Under parent' },
              ]}
            />
          </div>
          {streamScope === 'under-parent' && (
            <div>
              <SelectMenu
                label="Parent stream"
                value={parentId}
                onChange={(nextParentId) => {
                  setParentId(nextParentId);
                  resetPagination();
                }}
                buttonClassName="min-w-64"
                options={[
                  { value: '', label: 'Select a parent' },
                  ...workstreams.map((stream) => ({
                    value: String(stream.number ?? stream.id),
                    label: workstreamReferenceText(stream),
                  })),
                ]}
              />
            </div>
          )}
          <div>
            <SelectMenu
              label="Activity type"
              value={activityFilter}
              onChange={(nextActivity) => {
                setActivityFilter(nextActivity);
                resetPagination();
              }}
              options={[
                { value: 'all', label: 'All activity' },
                { value: 'status_update', label: 'Status updates' },
                { value: 'workstream_created', label: 'Created' },
                { value: 'workstream_closed', label: 'Closed' },
                { value: 'parent_changed', label: 'Parent changes' },
                { value: 'sub_stream_created', label: 'Sub-stream created' },
              ]}
            />
          </div>
          <label className="inline-flex items-center gap-2 pb-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={includeSubstreams}
              onChange={(event) => {
                setIncludeSubstreams(event.target.checked);
                resetPagination();
              }}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Include sub-stream activity
          </label>
          <div className="ml-auto flex items-end gap-3">
            <span className="pb-2 text-xs text-gray-500 dark:text-gray-400">
              Exports current page
            </span>
            <ExportButton entries={currentPageTimeline ?? []} />
          </div>
        </div>
      </div>

      {renderPaginationControls({
        testId: 'timeline-pagination-top',
        className: 'mb-4 border-b border-gray-200 pb-3 dark:border-gray-700',
      })}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load timeline. Please try again.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-2 h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && currentPageTimeline && currentPageTimeline.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No activity found for the selected filters.
          </p>
        </div>
      )}

      {!isLoading && groupedEntries && (
        <div className="space-y-8">
          {Object.entries(groupedEntries).map(([date, entries]) => (
            <div key={date}>
              <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatDateHeader(date)}
              </h3>
              <div className="space-y-3">
                {entries.map((entry) => {
                  const trail = timelineTrail(entry);
                  return (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div className="flex items-start gap-3">
                        {entry.category && (
                          <div
                            className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-xs"
                            style={{ backgroundColor: entry.category.color }}
                            title={entry.category.name}
                          >
                            {entry.category.emoji}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <Link
                              to={workstreamPath({
                                id: entry.workstreamId,
                                number: entry.workstreamNumber,
                              })}
                              className="font-medium text-gray-900 hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-400"
                            >
                              {trail.map((stream, index) => (
                                <span key={`${stream.id ?? stream.number}-${index}`}>
                                  {index > 0 && (
                                    <span className="mx-1 text-gray-400 dark:text-gray-500">›</span>
                                  )}
                                  <WorkstreamReferenceContent workstream={stream} />
                                </span>
                              ))}
                              {entry.eventType === 'status_update' &&
                                entry.statusUpdateNumber !== undefined && (
                                  <span>
                                    <span className="mx-1 text-gray-400 dark:text-gray-500">›</span>
                                    update #{entry.statusUpdateNumber}
                                    <UpdateImpactChip impact={entry.impact} />
                                  </span>
                                )}
                            </Link>
                            <time className="text-xs text-gray-500 dark:text-gray-400">
                              {format(parseISO(entry.createdAt), 'h:mm a')}
                            </time>
                          </div>
                          <div className="mt-1">{renderEventContent(entry)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading &&
        timeline &&
        renderPaginationControls({
          testId: 'timeline-pagination-bottom',
          className: 'mt-6 border-t border-gray-200 pt-3 dark:border-gray-700',
        })}
    </div>
  );
}
