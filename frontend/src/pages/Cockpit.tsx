import { useState, useMemo } from 'react';
import { useWorkstreams } from '../hooks/useWorkstreams';
import { WorkstreamCard } from '../components/Workstream/WorkstreamCard';
import { WorkstreamSkeleton } from '../components/Workstream/WorkstreamSkeleton';
import { WorkstreamCreateDialog } from '../components/Workstream/WorkstreamCreateDialog';
import { Workstream } from '../types/workstream';

type SortOption = 'name' | 'createdAt' | 'updatedAt';
type SortDirection = 'asc' | 'desc';
type GroupOption = 'none' | 'tag';

export default function Cockpit() {
  const { data: workstreams, isLoading, error } = useWorkstreams({ state: 'active' });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [groupBy, setGroupBy] = useState<GroupOption>('tag'); // Default to 'tag' grouping

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Switch to new sort option with default direction
      setSortBy(option);
      setSortDirection(option === 'name' ? 'asc' : 'desc');
    }
  };

  // Helper function to get sort comparator
  const getSortComparator = (sortBy: SortOption) => {
    return (a: Workstream, b: Workstream) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
        default:
          // Sort by latest status update time, fallback to createdAt if no status
          const aTime = a.latestStatus 
            ? new Date(a.latestStatus.updatedAt).getTime()
            : new Date(a.createdAt).getTime();
          const bTime = b.latestStatus
            ? new Date(b.latestStatus.updatedAt).getTime()
            : new Date(b.createdAt).getTime();
          comparison = aTime - bTime;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    };
  };

  // Group workstreams by tag and sort within each group
  const groupedWorkstreams = useMemo(() => {
    if (!workstreams) return [];

    if (groupBy === 'none') {
      // Sort all workstreams
      const sorted = [...workstreams].sort(getSortComparator(sortBy));
      return [{ key: 'all', name: null, color: null, emoji: null, sortOrder: 0, workstreams: sorted }];
    }

    // Group first
    const groups = new Map<string, Workstream[]>();
    workstreams.forEach((ws) => {
      const key = ws.tag?.id || 'untagged';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(ws);
    });

    // Sort workstreams within each group and add sortOrder
    const result = Array.from(groups.entries()).map(([key, wsList]) => ({
      key,
      name: key === 'untagged' ? null : wsList[0].tag?.name || null,
      color: key === 'untagged' ? null : wsList[0].tag?.color || null,
      emoji: key === 'untagged' ? null : wsList[0].tag?.emoji || null,
      sortOrder: key === 'untagged' ? 999999 : (wsList[0].tag?.sortOrder ?? 999999),
      workstreams: wsList.sort(getSortComparator(sortBy)), // Sort within group
    }));

    // Sort groups by tag sortOrder
    return result.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [workstreams, sortBy, sortDirection, groupBy]);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Unified compact header */}
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
          <h2 className="text-xl font-bold text-gray-900">Active Workstreams</h2>
          <div className="flex items-center gap-4">
            {/* Grouping toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Group:</span>
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  onClick={() => setGroupBy('none')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-l-md border ${
                    groupBy === 'none'
                      ? 'bg-gray-100 text-gray-900 border-gray-300'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  None
                </button>
                <button
                  onClick={() => setGroupBy('tag')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-r-md border-t border-r border-b ${
                    groupBy === 'tag'
                      ? 'bg-gray-100 text-gray-900 border-gray-300'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Tag
                </button>
              </div>
            </div>

            {/* Sorting toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort:</span>
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  onClick={() => toggleSort('updatedAt')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-l-md border flex items-center gap-1 ${
                    sortBy === 'updatedAt'
                      ? 'bg-gray-100 text-gray-900 border-gray-300'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Updated
                  {sortBy === 'updatedAt' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => toggleSort('createdAt')}
                  className={`px-3 py-1.5 text-sm font-medium border-t border-b flex items-center gap-1 ${
                    sortBy === 'createdAt'
                      ? 'bg-gray-100 text-gray-900 border-gray-300'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Created
                  {sortBy === 'createdAt' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => toggleSort('name')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-r-md border-t border-r border-b flex items-center gap-1 ${
                    sortBy === 'name'
                      ? 'bg-gray-100 text-gray-900 border-gray-300'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Name
                  {sortBy === 'name' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowCreateDialog(true)}
              className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              New Workstream
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              Failed to load workstreams. Please try again.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            <WorkstreamSkeleton />
            <WorkstreamSkeleton />
            <WorkstreamSkeleton />
            <WorkstreamSkeleton />
          </div>
        )}

        {!isLoading && workstreams && workstreams.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">No workstreams yet. Create your first one!</p>
          </div>
        )}

        {!isLoading && workstreams && workstreams.length > 0 && (
          <div className="space-y-4">
            {groupedWorkstreams.map((group) => (
              <div key={group.key}>
                {groupBy === 'tag' && (
                  <div className="mb-2 flex items-center gap-2">
                    {group.color && (
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded text-sm"
                        style={{ backgroundColor: group.color }}
                      >
                        {group.emoji}
                      </div>
                    )}
                    <h3 className="text-base font-semibold text-gray-900">
                      {group.name || 'Untagged'}
                    </h3>
                    <span className="text-sm text-gray-500">
                      ({group.workstreams.length})
                    </span>
                  </div>
                )}
                
                {/* Two-column grid layout */}
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {group.workstreams.map((workstream) => (
                    <WorkstreamCard key={workstream.id} workstream={workstream} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <WorkstreamCreateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </>
  );
}
