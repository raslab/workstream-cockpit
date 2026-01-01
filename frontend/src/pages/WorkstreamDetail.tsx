import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Workstream, StatusUpdate } from '../types/workstream';
import { useStatusHistory } from '../hooks/useStatusHistory';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { StatusUpdateDialog } from '../components/StatusUpdate/StatusUpdateDialog';
import { WorkstreamEditDialog } from '../components/Workstream/WorkstreamEditDialog';

interface StatusEditDialogProps {
  statusUpdate: StatusUpdate;
  workstreamId: string;
  isOpen: boolean;
  onClose: () => void;
}

function StatusEditDialog({ statusUpdate, workstreamId, isOpen, onClose }: StatusEditDialogProps) {
  const [status, setStatus] = useState(statusUpdate.status);
  const [note, setNote] = useState(statusUpdate.note || '');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: { status: string; note: string }) => {
      const response = await apiClient.put(`/api/status-updates/${statusUpdate.id}`, {
        workstreamId,
        status: data.status,
        note: data.note || null,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-updates', workstreamId] });
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['workstream', workstreamId] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status.trim()) {
      updateMutation.mutate({ status: status.trim(), note: note.trim() });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Edit Status Update</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700">
              Status <span className="text-red-500">*</span>
            </label>
            <textarea
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={3}
              maxLength={500}
              autoFocus
            />
            <div className="mt-1 text-xs text-gray-500">{status.length}/500 characters</div>
          </div>

          <div className="mb-4">
            <label htmlFor="note" className="mb-1 block text-sm font-medium text-gray-700">
              Note (optional)
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={3}
              maxLength={2000}
            />
            <div className="mt-1 text-xs text-gray-500">{note.length}/2000 characters</div>
          </div>

          {updateMutation.isError && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
              Failed to update status. Please try again.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={updateMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              disabled={!status.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WorkstreamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showNewStatusDialog, setShowNewStatusDialog] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusUpdate | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: workstream, isLoading: workstreamLoading } = useQuery<Workstream>({
    queryKey: ['workstream', id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/workstreams/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const { data: statusUpdates, isLoading: historyLoading } = useStatusHistory(id!);

  const isLoading = workstreamLoading || historyLoading;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="mb-6 h-8 w-64 rounded bg-gray-200" />
          <div className="space-y-4">
            <div className="h-32 rounded-lg bg-gray-200" />
            <div className="h-32 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!workstream) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">Workstream not found.</p>
          <Link to="/" className="mt-2 inline-block text-sm text-red-700 underline">
            Go back to Cockpit
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="mb-3 text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Cockpit
          </button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {workstream.tag && (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-md text-lg"
                    style={{ backgroundColor: workstream.tag.color }}
                    title={workstream.tag.name}
                  >
                    {workstream.tag.emoji}
                  </div>
                )}
                <h1 className="text-3xl font-bold text-gray-900">{workstream.name}</h1>
              </div>
              {workstream.context && (
                <p className="mt-2 text-sm text-gray-600">{workstream.context}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowEditDialog(true)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={() => setShowNewStatusDialog(true)}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Add Update
              </button>
            </div>
          </div>
        </div>

        {/* Status History */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Status History</h2>

          {statusUpdates && statusUpdates.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-gray-500">No status updates yet. Add the first one!</p>
            </div>
          )}

          <div className="space-y-4">
            {statusUpdates?.map((update) => (
              <div key={update.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <time className="text-sm font-medium text-gray-900">
                        {format(parseISO(update.createdAt), 'MMM d, yyyy • h:mm a')}
                      </time>
                      {update.createdAt !== update.updatedAt && (
                        <span className="text-xs text-gray-500">(edited)</span>
                      )}
                      <span className="text-xs text-gray-500">
                        • {formatDistanceToNow(parseISO(update.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{update.status}</p>
                    {update.note && (
                      <p className="mt-2 text-sm text-gray-600 italic">{update.note}</p>
                    )}
                  </div>

                  <button
                    onClick={() => setEditingStatus(update)}
                    className="ml-4 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <StatusUpdateDialog
        workstreamId={workstream.id}
        workstreamName={workstream.name}
        isOpen={showNewStatusDialog}
        onClose={() => setShowNewStatusDialog(false)}
      />

      {editingStatus && (
        <StatusEditDialog
          statusUpdate={editingStatus}
          workstreamId={workstream.id}
          isOpen={!!editingStatus}
          onClose={() => setEditingStatus(null)}
        />
      )}

      {workstream && (
        <WorkstreamEditDialog
          workstream={workstream}
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
        />
      )}
    </>
  );
}
