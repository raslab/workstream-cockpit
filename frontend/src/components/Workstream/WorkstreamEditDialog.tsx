import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Workstream } from '../../types/workstream';
import { useTags } from '../../hooks/useTags';

interface WorkstreamEditDialogProps {
  workstream: Workstream;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkstreamEditDialog({ workstream, isOpen, onClose }: WorkstreamEditDialogProps) {
  const [name, setName] = useState(workstream.name);
  const [tagId, setTagId] = useState<string>(workstream.tagId || '');
  const [context, setContext] = useState(workstream.context || '');
  const queryClient = useQueryClient();
  const { data: tags = [] } = useTags();

  useEffect(() => {
    if (isOpen) {
      setName(workstream.name);
      setTagId(workstream.tagId || '');
      setContext(workstream.context || '');
    }
  }, [isOpen, workstream]);

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; tagId: string | null; context: string | null }) => {
      const response = await apiClient.put(`/api/workstreams/${workstream.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['workstream', workstream.id] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      updateMutation.mutate({
        name: name.trim(),
        tagId: tagId || null,
        context: context.trim() || null,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Edit Workstream</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              maxLength={200}
              autoFocus
            />
            <div className="mt-1 text-xs text-gray-500">{name.length}/200 characters</div>
          </div>

          <div className="mb-4">
            <label htmlFor="tag" className="mb-1 block text-sm font-medium text-gray-700">
              Tag
            </label>
            <select
              id="tag"
              value={tagId}
              onChange={(e) => setTagId(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">No tag</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="context" className="mb-1 block text-sm font-medium text-gray-700">
              Context
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={4}
              maxLength={2000}
            />
            <div className="mt-1 text-xs text-gray-500">{context.length}/2000 characters</div>
          </div>

          {updateMutation.isError && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
              Failed to update workstream. Please try again.
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
              disabled={updateMutation.isPending || !name.trim()}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
