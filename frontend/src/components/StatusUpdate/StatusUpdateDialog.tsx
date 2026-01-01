import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface StatusUpdateDialogProps {
  workstreamId: string;
  workstreamName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function StatusUpdateDialog({
  workstreamId,
  workstreamName,
  isOpen,
  onClose,
}: StatusUpdateDialogProps) {
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();

  const createStatusMutation = useMutation({
    mutationFn: async (data: { workstreamId: string; status: string; note?: string }) => {
      const response = await apiClient.post('/api/status-updates', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['status-updates', workstreamId] });
      queryClient.invalidateQueries({ queryKey: ['workstream', workstreamId] });
      setStatus('');
      setNote('');
      onClose();
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStatus('');
      setNote('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status.trim()) {
      createStatusMutation.mutate({
        workstreamId,
        status: status.trim(),
        note: note.trim() || undefined,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Update Status: {workstreamName}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700">
              Status <span className="text-red-500">*</span>
            </label>
            <textarea
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={3}
              maxLength={500}
              placeholder="What's the current status?"
              autoFocus
            />
            <div className="mt-1 text-xs text-gray-500">
              {status.length}/500 characters
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="note" className="mb-1 block text-sm font-medium text-gray-700">
              Note (optional)
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={3}
              maxLength={2000}
              placeholder="Add any additional details..."
            />
            <div className="mt-1 text-xs text-gray-500">
              {note.length}/2000 characters
            </div>
          </div>

          {createStatusMutation.isError && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
              Failed to create status update. Please try again.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={createStatusMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              disabled={!status.trim() || createStatusMutation.isPending}
            >
              {createStatusMutation.isPending && (
                <svg
                  className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              Save
            </button>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            Tip: Press Cmd/Ctrl+Enter to save quickly
          </div>
        </form>
      </div>
    </div>
  );
}
