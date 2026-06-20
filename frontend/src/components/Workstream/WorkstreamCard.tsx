import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Workstream } from '../../types/workstream';
import { formatDistanceToNow } from 'date-fns';
import { StatusUpdateDialog } from '../StatusUpdate/StatusUpdateDialog';
import { apiClient } from '../../api/client';
import { MarkdownRenderer } from '../Markdown/MarkdownRenderer';
import { TagChip } from '../Tag/TagChip';
import { WorkstreamBreadcrumbs } from './WorkstreamBreadcrumbs';
import { WorkstreamCreateDialog } from './WorkstreamCreateDialog';
import { ParentSelectorDialog } from './ParentSelectorDialog';

interface WorkstreamCardProps {
  workstream: Workstream;
}

export function WorkstreamCard({ workstream }: WorkstreamCardProps) {
  const { name, category, latestStatus, allTags } = workstream;
  const [showDialog, setShowDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreateSubstream, setShowCreateSubstream] = useState(false);
  const [showParentDialog, setShowParentDialog] = useState(false);
  const queryClient = useQueryClient();

  const tags = allTags || [];

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
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start justify-between">
          <Link to={`/workstreams/${workstream.id}`} className="flex-1">
            <WorkstreamBreadcrumbs workstream={workstream} />
            <div className="mt-1 flex items-center gap-2">
              {category && (
                <div className="flex h-5 w-5 items-center justify-center rounded text-sm" style={{ backgroundColor: category.color }} title={category.name}>
                  {category.emoji}
                </div>
              )}
              <h3 className="text-base font-semibold text-gray-900 hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-400">
                {name}
              </h3>
            </div>

            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
              {workstream.parent && <span>Parent: {workstream.parent.name}</span>}
              {(workstream.childCount ?? 0) > 0 && <span>{workstream.activeChildCount ?? 0} active / {workstream.closedChildCount ?? 0} closed sub-streams</span>}
              {workstream.lastSubstreamActivityAt && (
                <span>
                  Sub-stream activity {formatDistanceToNow(new Date(workstream.lastSubstreamActivityAt), { addSuffix: true })}
                  {workstream.latestSubstreamActivitySource?.name ? ` from ${workstream.latestSubstreamActivitySource.name}` : ''}
                </span>
              )}
            </div>
            
            {latestStatus && (
              <div className="mt-1.5">
                <MarkdownRenderer content={latestStatus.status} className="text-sm text-gray-700 dark:text-gray-300" />
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.map((tag) => <TagChip key={tag} tagName={tag} />)}
                  </div>
                )}
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Direct update {formatDistanceToNow(new Date(workstream.lastDirectUpdateAt || latestStatus.updatedAt), { addSuffix: true })}
                </p>
              </div>
            )}
            
            {!latestStatus && <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">No direct status updates yet</p>}
          </Link>
          
          <div className="ml-4 flex gap-2">
            <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:border-gray-500" onClick={() => setShowDialog(true)}>
              Update
            </button>
            
            <div className="relative">
              <button className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-200" onClick={() => setShowMenu(!showMenu)}>
                ⋮
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
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
          </div>
        </div>
      </div>

      <StatusUpdateDialog workstreamId={workstream.id} workstreamName={workstream.name} isOpen={showDialog} onClose={() => setShowDialog(false)} />
      <WorkstreamCreateDialog isOpen={showCreateSubstream} onClose={() => setShowCreateSubstream(false)} parent={{ id: workstream.id, name: workstream.name, state: workstream.state, depth: workstream.depth }} />
      <ParentSelectorDialog workstream={workstream} isOpen={showParentDialog} onClose={() => setShowParentDialog(false)} />
    </>
  );
}
