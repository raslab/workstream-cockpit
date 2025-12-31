import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useTags } from '../../hooks/useTags';

interface WorkstreamCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkstreamCreateDialog({ isOpen, onClose }: WorkstreamCreateDialogProps) {
  const [name, setName] = useState('');
  const [tagId, setTagId] = useState<string>('');
  const [context, setContext] = useState('');
  const [initialStatus, setInitialStatus] = useState('');
  const [initialNote, setInitialNote] = useState('');
  const queryClient = useQueryClient();
  const { data: tags } = useTags();

  const createWorkstreamMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      tagId?: string;
      context?: string;
      initialStatus?: string;
      initialNote?: string;
    }) => {
      const response = await apiClient.post('/api/workstreams', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      resetForm();
      onClose();
    },
  });

  const resetForm = () => {
    setName('');
    setTagId('');
    setContext('');
    setInitialStatus('');
    setInitialNote('');
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createWorkstreamMutation.mutate({
        name: name.trim(),
        tagId: tagId || undefined,
        context: context.trim() || undefined,
        initialStatus: initialStatus.trim() || undefined,
        initialNote: initialNote.trim() || undefined,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Create New Workstream</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              maxLength={200}
              placeholder="Enter workstream name"
              autoFocus
            />
            <div className="mt-1 text-xs text-gray-500">{name.length}/200 characters</div>
          </div>

          <div className="mb-4">
            <label htmlFor="tagId" className="mb-1 block text-sm font-medium text-gray-700">
              Tag (optional)
            </label>
            <select
              id="tagId"
              value={tagId}
              onChange={(e) => setTagId(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">No tag</option>
              {tags?.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
            {tagId && tags && (
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: tags.find((t) => t.id === tagId)?.color,
                  }}
                />
                <span className="text-xs text-gray-500">
                  {tags.find((t) => t.id === tagId)?.name}
                </span>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="context" className="mb-1 block text-sm font-medium text-gray-700">
              Context (optional)
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={3}
              maxLength={2000}
              placeholder="Add background information or description"
            />
            <div className="mt-1 text-xs text-gray-500">{context.length}/2000 characters</div>
          </div>

          <div className="mb-4">
            <label htmlFor="initialStatus" className="mb-1 block text-sm font-medium text-gray-700">
              Initial Status (optional)
            </label>
            <textarea
              id="initialStatus"
              value={initialStatus}
              onChange={(e) => setInitialStatus(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={2}
              maxLength={500}
              placeholder="What's the current status?"
            />
            <div className="mt-1 text-xs text-gray-500">
              {initialStatus.length}/500 characters
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="initialNote" className="mb-1 block text-sm font-medium text-gray-700">
              Initial Note (optional)
            </label>
            <textarea
              id="initialNote"
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={2}
              maxLength={2000}
              placeholder="Add details about the initial status"
            />
            <div className="mt-1 text-xs text-gray-500">
              {initialNote.length}/2000 characters
            </div>
          </div>

          {createWorkstreamMutation.isError && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
              Failed to create workstream. Please try again.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={createWorkstreamMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              disabled={!name.trim() || createWorkstreamMutation.isPending}
            >
              {createWorkstreamMutation.isPending && (
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
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
