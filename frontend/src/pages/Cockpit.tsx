import { useState } from 'react';
import { useWorkstreams } from '../hooks/useWorkstreams';
import { WorkstreamCard } from '../components/Workstream/WorkstreamCard';
import { WorkstreamSkeleton } from '../components/Workstream/WorkstreamSkeleton';
import { WorkstreamCreateDialog } from '../components/Workstream/WorkstreamCreateDialog';

export default function Cockpit() {
  const { data: workstreams, isLoading, error } = useWorkstreams({ state: 'active' });
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              Failed to load workstreams. Please try again.
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
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">No workstreams yet. Create your first one!</p>
            </div>
          )}

          {!isLoading && workstreams && workstreams.map((workstream) => (
            <WorkstreamCard key={workstream.id} workstream={workstream} />
          ))}
        </div>
      </div>

      <WorkstreamCreateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </>
  );
}
