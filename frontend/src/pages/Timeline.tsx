import { useState } from 'react';
import { useTimeline } from '../hooks/useTimeline';
import {
  FilterBar,
  FilterPreset,
  getDateRangeFromPreset,
} from '../components/Timeline/FilterBar';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

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
  }, {} as Record<string, typeof timeline>);

  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Status Updates</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review recent updates across all workstreams
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
            No status updates found for the selected filters.
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
                          className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: entry.tag.color }}
                          title={entry.tag.name}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="font-medium text-gray-900">
                            {entry.workstreamName}
                          </h4>
                          <time className="text-xs text-gray-500">
                            {format(parseISO(entry.createdAt), 'h:mm a')}
                          </time>
                        </div>
                        <p className="mt-1 text-sm text-gray-700">{entry.status}</p>
                        {entry.note && (
                          <p className="mt-2 text-sm text-gray-600">{entry.note}</p>
                        )}
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
