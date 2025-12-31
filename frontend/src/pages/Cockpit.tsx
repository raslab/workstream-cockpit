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

  // Sort workstreams
  const sortedWorkstreams = useMemo(() => {
    if (!workstreams) return [];
    
    const sorted = [...workstreams].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updatedAt':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
    
    return sorted;
  }, [workstreams, sortBy]);

  // Group workstreams by tag
  const groupedWorkstreams = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', name: null, color: null, emoji: null, workstreams: sortedWorkstreams }];
    }

    const groups = new Map<string, Workstream[]>();
    
    sortedWorkstreams.forEach((ws) => {
      const key = ws.tag?.id || 'untagged';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(ws);
    });

    // Convert to array and sort: tagged groups first (alphabetically), then untagged
    const result = Array.from(groups.entries()).map(([key, wsList]) => ({
      key,
      name: key === 'untagged' ? null : wsList[0].tag?.name || null,
      color: key === 'untagged' ? null : wsList[0].tag?.color || null,
      emoji: key === 'untagged' ? null : wsList[0].tag?.emoji || null,
      workstreams: wsList,
    }));

    return result.sort((a, b) => {
      if (a.key === 'untagged') return 1;
      if (b.key === 'untagged') return -1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [sortedWorkstreams, groupBy]);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Active Workstreams</h2>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            New Workstream
          </button>
        </div>

        {/* Filters and sorting */}
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm font-medium text-gray-700">
              Sort by:
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="updatedAt">Last Updated</option>
              <option value="createdAt">Created Date</option>
              <option value="name">Name</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="group" className="text-sm font-medium text-gray-700">
              Group by:
            </label>
            <select
              id="group"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupOption)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="none">None</option>
              <option value="tag">Tag</option>
            </select>
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
          <div className="space-y-6">
            {groupedWorkstreams.map((group) => (
              <div key={group.key}>
                {groupBy === 'tag' && (
                  <div className="mb-3 flex items-center gap-2">
                    {group.color && (
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-md text-sm"
                        style={{ backgroundColor: group.color }}
                      >
                        {group.emoji}
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {group.name || 'Untagged'}
                    </h3>
                    <span className="text-sm text-gray-500">
                      ({group.workstreams.length})
                    </span>
                  </div>
                )}
                
                <div className="space-y-4">
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
