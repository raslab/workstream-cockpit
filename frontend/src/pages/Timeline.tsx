import { useState } from 'react';
import { useTimeline, TimelineEntry } from '../hooks/useTimeline';
import {
  FilterBar,
  FilterPreset,
  getDateRangeFromPreset,
} from '../components/Timeline/FilterBar';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

export default function Timeline() {
  const [selectedPreset, setSelectedPreset] = useState<FilterPreset>('last7');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const dateRange = getDateRangeFromPreset(selectedPreset);
  const { data: timeline, isLoading, error } = useTimeline({
    ...dateRange,
    tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
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
            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              Created
            </span>
            <span className="text-sm text-gray-700">Workstream created</span>
          </div>
        );
      case 'workstream_closed':
        return (
          <div className="flex items-center gap-2">
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
              Closed
            </span>
            <span className="text-sm text-gray-700">Workstream closed</span>
          </div>
        );
      case 'status_update':
      default:
        return (
          <>
            <p className="text-sm text-gray-700">{entry.status}</p>
            {entry.note && (
              <p className="mt-2 text-sm text-gray-600 italic">{entry.note}</p>
            )}
          </>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Timeline</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review recent activity across all workstreams
        </p>
      </div>

      <FilterBar
        selectedPreset={selectedPreset}
        onPresetChange={setSelectedPreset}
        selectedTagIds={selectedTagIds}
        onTagIdsChange={setSelectedTagIds}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load timeline. Please try again.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
              <div className="h-4 w-32 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-full rounded bg-gray-200" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && timeline && timeline.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No activity found for the selected filters.
          </p>
        </div>
      )}

      {!isLoading && groupedEntries && (
        <div className="space-y-8">
          {Object.entries(groupedEntries).map(([date, entries]) => (
            <div key={date}>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                {formatDateHeader(date)}
              </h3>
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      {entry.tag && (
                        <div
                          className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-xs"
                          style={{ backgroundColor: entry.tag.color }}
                          title={entry.tag.name}
                        >
                          {entry.tag.emoji}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <Link
                            to={`/workstreams/${entry.workstreamId}`}
                            className="font-medium text-gray-900 hover:text-primary-600"
                          >
                            {entry.workstreamName}
                          </Link>
                          <time className="text-xs text-gray-500">
                            {format(parseISO(entry.createdAt), 'h:mm a')}
                          </time>
                        </div>
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
