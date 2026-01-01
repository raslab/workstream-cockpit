import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Workstream } from '../../types/workstream';
import { formatDistanceToNow } from 'date-fns';
import { StatusUpdateDialog } from '../StatusUpdate/StatusUpdateDialog';
import { apiClient } from '../../api/client';

interface WorkstreamCardProps {
  workstream: Workstream;
}

export function WorkstreamCard({ workstream }: WorkstreamCardProps) {
  const { name, tag, latestStatus } = workstream;
  const [showDialog, setShowDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const queryClient = useQueryClient();

  const closeMutation = useMutation({
    mutationFn: async (workstreamId: string) => {
      const response = await apiClient.put(`/api/workstreams/${workstreamId}/close`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      setShowMenu(false);
    },
  });

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <Link to={`/workstreams/${workstream.id}`} className="flex-1">
            <div className="flex items-center gap-2">
              {tag && (
                <div
                  className="flex h-5 w-5 items-center justify-center rounded text-sm"
                  style={{ backgroundColor: tag.color }}
                  title={tag.name}
                >
                  {tag.emoji}
                </div>
              )}
              <h3 className="text-base font-semibold text-gray-900 hover:text-primary-600">
                {name}
              </h3>
            </div>
            
            {latestStatus && (
              <div className="mt-1.5">
                <p className="text-sm text-gray-700">{latestStatus.status}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Updated {formatDistanceToNow(new Date(latestStatus.updatedAt), { addSuffix: true })}
                </p>
              </div>
            )}
            
            {!latestStatus && (
              <p className="mt-1.5 text-sm text-gray-500">No status updates yet</p>
            )}
          </Link>
          
          <div className="ml-4 flex gap-2">
            <button
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              onClick={() => setShowDialog(true)}
            >
              Update
            </button>
            
            <div className="relative">
              <button
                className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                onClick={() => setShowMenu(!showMenu)}
              >
                ⋮
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-md border border-gray-200 bg-white shadow-lg">
                  <button
                    onClick={() => closeMutation.mutate(workstream.id)}
                    disabled={closeMutation.isPending}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {closeMutation.isPending ? 'Closing...' : 'Close'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <StatusUpdateDialog
        workstreamId={workstream.id}
        workstreamName={workstream.name}
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
      />
    </>
  );
}
