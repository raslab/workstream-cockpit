import { useState } from 'react';
import { useTimeline, TimelineEntry, TimelineEventType } from '../hooks/useTimeline';
import { useWorkstreams } from '../hooks/useWorkstreams';
import { FilterBar } from '../components/Timeline/FilterBar';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { MarkdownRenderer } from '../components/Markdown/MarkdownRenderer';
import { getWorkstreamName } from '../utils/hierarchy';

export default function Timeline() {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [hierarchyScope, setHierarchyScope] = useState<'all' | 'top-level' | 'sub-streams' | 'under-parent'>('all');
  const [parentId, setParentId] = useState<string>('');
  const [includeSubstreams, setIncludeSubstreams] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | TimelineEventType>('all');

  const { data: workstreams = [] } = useWorkstreams({ state: 'active' });

  const { data: timeline, isLoading, error } = useTimeline({
    startDate: customStartDate,
    endDate: customEndDate,
    categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    hierarchyScope,
    parentId: hierarchyScope === 'under-parent' && parentId ? parentId : undefined,
    includeSubstreams,
    eventTypes: activityFilter === 'all' ? undefined : [activityFilter],
    includeStructuralEvents: true,
  });

  // Group timeline entries by date
  const groupedEntries = timeline?.reduce((groups, entry) => {
    const date = format(parseISO(entry.createdAt), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, TimelineEntry[]>);

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
              Moved from {entry.oldParentName || entry.metadata?.oldParentName || 'top level'} to {entry.newParentName || entry.metadata?.newParentName || 'top level'}
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
              Created under {entry.parent ? getWorkstreamName(entry.parent) : entry.parentName || entry.newParentName || entry.metadata?.newParentName || 'parent stream'}
            </span>
          </div>
        );
      case 'status_update':
      default:
        return (
          <div>
            <MarkdownRenderer content={entry.status!} className="text-sm text-gray-700 dark:text-gray-300" />
            {entry.note && (
              <div className="mt-3 border-t border-gray-900 pt-2 dark:border-gray-700">
                <MarkdownRenderer content={entry.note} className="text-sm text-gray-600 dark:text-gray-400" />
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

      <FilterBar
        selectedCategoryIds={selectedCategoryIds}
        onCategoryIdsChange={setSelectedCategoryIds}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
        timelineEntries={timeline}
      />

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="hierarchyScope" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Hierarchy scope</label>
            <select
              id="hierarchyScope"
              value={hierarchyScope}
              onChange={(event) => setHierarchyScope(event.target.value as typeof hierarchyScope)}
              className="rounded-md border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="all">All streams</option>
              <option value="top-level">Top-level only</option>
              <option value="sub-streams">Sub-streams only</option>
              <option value="under-parent">Under parent</option>
            </select>
          </div>
          {hierarchyScope === 'under-parent' && (
            <div>
              <label htmlFor="parentStream" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Parent stream</label>
              <select
                id="parentStream"
                value={parentId}
                onChange={(event) => setParentId(event.target.value)}
                className="min-w-64 rounded-md border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="">Select a parent</option>
                {workstreams.map((stream) => (
                  <option key={stream.id} value={stream.id}>{getWorkstreamName(stream)}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="activityFilter" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Activity type</label>
            <select
              id="activityFilter"
              value={activityFilter}
              onChange={(event) => setActivityFilter(event.target.value as typeof activityFilter)}
              className="rounded-md border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="all">All activity</option>
              <option value="status_update">Status updates</option>
              <option value="workstream_created">Created</option>
              <option value="workstream_closed">Closed</option>
              <option value="parent_changed">Parent changes</option>
              <option value="sub_stream_created">Sub-stream created</option>
            </select>
          </div>
          <label className="inline-flex items-center gap-2 pb-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={includeSubstreams}
              onChange={(event) => setIncludeSubstreams(event.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Include sub-stream activity
          </label>
        </div>
      </div>

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
            <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-2 h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && timeline && timeline.length === 0 && (
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
                {entries.map((entry) => (
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
                            to={`/workstreams/${entry.workstreamId}`}
                            className="font-medium text-gray-900 hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-400"
                          >
                            {entry.workstreamName}
                          </Link>
                          <time className="text-xs text-gray-500 dark:text-gray-400">
                            {format(parseISO(entry.createdAt), 'h:mm a')}
                          </time>
                        </div>
                        {(entry.ancestors?.length || entry.parent || entry.parentName || entry.hierarchyPath || entry.breadcrumb) && (
                          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            {entry.hierarchyPath || entry.breadcrumb ? (
                              <span>{entry.hierarchyPath || entry.breadcrumb}</span>
                            ) : (
                              <>
                                {(entry.ancestors || []).map((ancestor) => (
                                  <span key={ancestor.id} className="inline-flex items-center gap-1">
                                    <Link to={`/workstreams/${ancestor.id}`} className="hover:text-primary-600 dark:hover:text-primary-400">{getWorkstreamName(ancestor)}</Link>
                                    <span aria-hidden="true">›</span>
                                  </span>
                                ))}
                                {entry.parent ? (
                                  !entry.ancestors?.some((ancestor) => ancestor.id === entry.parent?.id) && (
                                    <span className="inline-flex items-center gap-1">
                                      <Link to={`/workstreams/${entry.parent.id}`} className="hover:text-primary-600 dark:hover:text-primary-400">{getWorkstreamName(entry.parent)}</Link>
                                      <span aria-hidden="true">›</span>
                                    </span>
                                  )
                                ) : entry.parentName ? (
                                  <span className="inline-flex items-center gap-1">
                                    <span>{entry.parentName}</span>
                                    <span aria-hidden="true">›</span>
                                  </span>
                                ) : null}
                                <span>{entry.workstreamName}</span>
                              </>
                            )}
                          </div>
                        )}
                        <div className="mt-1">
                          {renderEventContent(entry)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
