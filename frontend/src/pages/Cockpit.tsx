import { useState, useMemo } from 'react';
import { useWorkstreams } from '../hooks/useWorkstreams';
import { WorkstreamCard } from '../components/Workstream/WorkstreamCard';
import { WorkstreamSkeleton } from '../components/Workstream/WorkstreamSkeleton';
import { WorkstreamCreateDialog } from '../components/Workstream/WorkstreamCreateDialog';
import { Workstream } from '../types/workstream';

type SortOption = 'name' | 'createdAt' | 'updatedAt';
type GroupOption = 'none' | 'tag';

export default function Cockpit() {
  const { data: workstreams, isLoading, error } = useWorkstreams({ state: 'active' });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('updatedAt');
  const [groupBy, setGroupBy] = useState<GroupOption>('none');

  // Helper function to get sort comparator
  const getSortComparator = (sortBy: SortOption) => {
    return (a: Workstream, b: Workstream) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updatedAt':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
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
  }, [workstreams, sortBy, groupBy]);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Unified compact header */}
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
          <h2 className="text-xl font-bold text-gray-900">Active Workstreams</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-gray-600">
                Sort:
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="updatedAt">Last Updated</option>
                <option value="createdAt">Created Date</option>
                <option value="name">Name</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="group" className="text-sm text-gray-600">
                Group:
              </label>
              <select
                id="group"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupOption)}
                className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="none">None</option>
                <option value="tag">Tag</option>
              </select>
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
          <div className="space-y-4">
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
                
                <div className="space-y-2">
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
