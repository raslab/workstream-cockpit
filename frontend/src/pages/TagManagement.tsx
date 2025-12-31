import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTags } from '../hooks/useTags';
import { apiClient } from '../api/client';
import { ColorPicker } from '../components/ColorPicker/ColorPicker';
import { EmojiPicker } from '../components/EmojiPicker/EmojiPicker';
import { Tag } from '../types/workstream';

export default function TagManagement() {
  const { data: tags, isLoading, error } = useTags();
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [newTagEmoji, setNewTagEmoji] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; emoji?: string | null }) => {
      const response = await apiClient.post('/api/tags', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setIsCreating(false);
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setNewTagEmoji('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; color: string; emoji?: string | null }) => {
      const response = await apiClient.put(`/api/tags/${data.id}`, {
        name: data.name,
        color: data.color,
        emoji: data.emoji,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      setEditingTag(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tagId: string) => {
      await apiClient.delete(`/api/tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      setDeleteConfirm(null);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
      createMutation.mutate({ 
        name: newTagName.trim(), 
        color: newTagColor,
        emoji: newTagEmoji || null,
      });
    }
  };

  const handleUpdate = (tag: Tag) => {
    updateMutation.mutate({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      emoji: tag.emoji,
    });
  };

  const handleDelete = (tagId: string) => {
    deleteMutation.mutate(tagId);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Tag Management</h2>
        <p className="mt-1 text-sm text-gray-500">
          Create and customize tags to organize your workstreams
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">Failed to load tags. Please try again.</p>
        </div>
      )}

      {/* Create New Tag */}
      {isCreating ? (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Create New Tag</h3>
          <form onSubmit={handleCreate}>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tag Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                maxLength={100}
                placeholder="e.g., urgent, client-work, infrastructure"
                autoFocus
              />
              <div className="mt-1 text-xs text-gray-500">{newTagName.length}/100 characters</div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Color <span className="text-red-500">*</span>
              </label>
              <ColorPicker value={newTagColor} onChange={setNewTagColor} />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Emoji (optional)
              </label>
              <EmojiPicker value={newTagEmoji} onChange={setNewTagEmoji} />
            </div>

            {createMutation.isError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
                Failed to create tag. Please try again.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewTagName('');
                  setNewTagColor('#3B82F6');
                  setNewTagEmoji('');
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={createMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                disabled={!newTagName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Tag'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="mb-6 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + New Tag
        </button>
      )}

      {/* Tags List */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
              <div className="h-4 w-32 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && tags && tags.length === 0 && !isCreating && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">No tags yet. Create your first tag!</p>
        </div>
      )}

      {!isLoading && tags && tags.length > 0 && (
        <div className="space-y-3">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              {editingTag?.id === tag.id ? (
                <div>
                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Tag Name
                    </label>
                    <input
                      type="text"
                      value={editingTag.name}
                      onChange={(e) =>
                        setEditingTag({ ...editingTag, name: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      maxLength={100}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
                    <ColorPicker
                      value={editingTag.color}
                      onChange={(color) => setEditingTag({ ...editingTag, color })}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Emoji</label>
                    <EmojiPicker
                      value={editingTag.emoji || ''}
                      onChange={(emoji) => setEditingTag({ ...editingTag, emoji })}
                    />
                  </div>

                  {updateMutation.isError && (
                    <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
                      Failed to update tag. Please try again.
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingTag(null)}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      disabled={updateMutation.isPending}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdate(editingTag)}
                      className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                      disabled={!editingTag.name.trim() || updateMutation.isPending}
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-md text-lg"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.emoji}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{tag.name}</h4>
                      <p className="text-xs text-gray-500">{tag.color} {tag.emoji && `• ${tag.emoji}`}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingTag(tag)}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    {deleteConfirm === tag.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(tag.id)}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? 'Deleting...' : 'Confirm'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(tag.id)}
                        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
