import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkstreams } from '../hooks/useWorkstreams';
import { WorkstreamSkeleton } from '../components/Workstream/WorkstreamSkeleton';
import { apiClient } from '../api/client';
import { format, parseISO } from 'date-fns';

export default function Archive() {
  const { data: workstreams, isLoading, error } = useWorkstreams({ state: 'closed' });
  const queryClient = useQueryClient();

  const reopenMutation = useMutation({
    mutationFn: async (workstreamId: string) => {
      const response = await apiClient.put(`/api/workstreams/${workstreamId}/reopen`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Closed Workstreams</h2>
        <p className="mt-1 text-sm text-gray-500">
          View and manage your archived workstreams
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load archived workstreams. Please try again.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {isLoading && (
          <>
            <WorkstreamSkeleton />
            <WorkstreamSkeleton />
            <WorkstreamSkeleton />
          </>
        )}

        {!isLoading && workstreams && workstreams.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">No archived workstreams.</p>
          </div>
        )}

        {!isLoading &&
          workstreams &&
          workstreams.map((workstream) => (
            <div
              key={workstream.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {workstream.tag && (
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-md text-sm"
                        style={{ backgroundColor: workstream.tag.color }}
                        title={workstream.tag.name}
                      >
                        {workstream.tag.emoji}
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {workstream.name}
                    </h3>
                  </div>

                  {workstream.latestStatus && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-700">
                        {workstream.latestStatus.status}
                      </p>
                    </div>
                  )}

                  {workstream.closedAt && (
                    <p className="mt-2 text-xs text-gray-500">
                      Closed on {format(parseISO(workstream.closedAt), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>

                <div className="ml-4">
                  <button
                    onClick={() => reopenMutation.mutate(workstream.id)}
                    disabled={reopenMutation.isPending}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {reopenMutation.isPending ? 'Reopening...' : 'Reopen'}
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
