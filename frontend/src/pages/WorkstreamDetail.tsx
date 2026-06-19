import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Workstream, StatusUpdate } from '../types/workstream';
import { useStatusHistory } from '../hooks/useStatusHistory';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { StatusUpdateDialog } from '../components/StatusUpdate/StatusUpdateDialog';
import { WorkstreamEditDialog } from '../components/Workstream/WorkstreamEditDialog';
import { MarkdownRenderer } from '../components/Markdown/MarkdownRenderer';
import { TagAutocomplete } from '../components/Tag/TagAutocomplete';

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
  
  // Refs for autocomplete
  const statusRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

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
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Status Update</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                ref={statusRef}
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                rows={3}
                maxLength={500}
                autoFocus
              />
              <TagAutocomplete
                textareaRef={statusRef}
                value={status}
                onChange={setStatus}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{status.length}/500 characters</div>
          </div>

          <div className="mb-4">
            <label htmlFor="note" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Note (optional)
            </label>
            <div className="relative">
              <textarea
                ref={noteRef}
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                rows={3}
                maxLength={2000}
              />
              <TagAutocomplete
                textareaRef={noteRef}
                value={note}
                onChange={setNote}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{note.length}/2000 characters</div>
          </div>

          {updateMutation.isError && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              Failed to update status. Please try again.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
  const queryClient = useQueryClient();
  const [showNewStatusDialog, setShowNewStatusDialog] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusUpdate | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: workstream, isLoading: workstreamLoading } = useQuery<Workstream>({
    queryKey: ['workstream', id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/workstreams/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const { data: statusUpdates, isLoading: historyLoading } = useStatusHistory(id!);

  const deleteMutation = useMutation({
    mutationFn: async (statusUpdateId: string) => {
      await apiClient.delete(`/api/status-updates/${statusUpdateId}`, {
        data: { workstreamId: id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-updates', id] });
      queryClient.invalidateQueries({ queryKey: ['workstream', id] });
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      setDeleteConfirm(null);
    },
  });

  const isLoading = workstreamLoading || historyLoading;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="mb-6 h-8 w-64 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-4">
            <div className="h-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    );
  }

  if (!workstream) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-800 dark:text-red-200">Workstream not found.</p>
          <Link to="/" className="mt-2 inline-block text-sm text-red-700 underline dark:text-red-300">
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
            className="mb-3 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            ← Back to Cockpit
          </button>
          
          {/* Workstream header */}
            <div className="flex items-center gap-2">
              {workstream.category && (
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-lg"
                  style={{ backgroundColor: workstream.category.color }}
                  title={workstream.category.name}
                >
                  {workstream.category.emoji}
                </div>
              )}
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{workstream.name}</h1>

              <div className="flex-1"></div>

              {/* Action buttons */}
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  onClick={() => setShowEditDialog(true)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowNewStatusDialog(true)}
                  className="whitespace-nowrap rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Add Update
                </button>
              </div>
            </div>
          
          {/* Context */}
          {workstream.context && (
            <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <MarkdownRenderer content={workstream.context} className="text-sm text-gray-700 dark:text-gray-300" />
            </div>
          )}
        </div>

        {/* Status History */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Status History</h2>

          {statusUpdates && statusUpdates.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">No status updates yet. Add the first one!</p>
            </div>
          )}

          <div className="space-y-4">
            {statusUpdates?.map((update) => (
              <div key={update.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                
                {/* Timestamp */}
                <div className="flex items-baseline gap-2">
                  <time className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {format(parseISO(update.createdAt), 'MMM d, yyyy • h:mm a')}
                  </time>
                  {update.createdAt !== update.updatedAt && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">(edited)</span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    • {formatDistanceToNow(parseISO(update.createdAt), { addSuffix: true })}
                  </span>

                  <div className="flex-1"></div>

                  {/* Action buttons */}
                  <div className="flex justify-end gap-2 mb-3">
                    <button
                      onClick={() => setEditingStatus(update)}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Edit
                    </button>
                    
                    {deleteConfirm === update.id ? (
                      <>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          disabled={deleteMutation.isPending}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(update.id)}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? 'Deleting...' : 'Confirm'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(update.id)}
                        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-900/40"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Status */}
                <div className="mt-2">
                  <MarkdownRenderer content={update.status} className="text-sm text-gray-700 dark:text-gray-300" />
                </div>
                
                {/* Note (if exists) */}
                {update.note && (
                  <div className="mt-3 border-t border-gray-900 pt-3">
                    <MarkdownRenderer content={update.note} className="text-sm text-gray-600 dark:text-gray-400" />
                  </div>
                )}
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
