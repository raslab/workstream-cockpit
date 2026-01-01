import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTags } from '../hooks/useTags';
import { apiClient } from '../api/client';
import { ColorPicker } from '../components/ColorPicker/ColorPicker';
import { EmojiPicker } from '../components/EmojiPicker/EmojiPicker';
import { Tag } from '../types/workstream';

interface SortableTagProps {
  tag: Tag;
  isEditing: boolean;
  onEdit: (tag: Tag) => void;
  onUpdate: (tag: Tag) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  setDeleteConfirm: (id: string | null) => void;
  deleteConfirm: string | null;
}

function SortableTag({
  tag,
  isEditing,
  onEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
  setDeleteConfirm,
  deleteConfirm,
}: SortableTagProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tag.id,
    transition: null, // Disable animation to prevent glitches
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editName, setEditName] = useState(tag.name);
  const [editColor, setEditColor] = useState(tag.color);
  const [editEmoji, setEditEmoji] = useState(tag.emoji || '');

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Edit Tag</h3>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tag Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            maxLength={100}
          />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
          <ColorPicker value={editColor} onChange={setEditColor} />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Emoji</label>
          <EmojiPicker value={editEmoji} onChange={setEditEmoji} />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancelEdit}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onUpdate({ ...tag, name: editName, color: editColor, emoji: editEmoji || null })
            }
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        title="Drag to reorder"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      <div
        className="flex h-10 w-10 items-center justify-center rounded-md text-lg"
        style={{ backgroundColor: tag.color }}
      >
        {tag.emoji}
      </div>

      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{tag.name}</h3>
        <p className="text-sm text-gray-500">{tag.color}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onEdit(tag)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit
        </button>

        {deleteConfirm === tag.id ? (
          <>
            <button
              onClick={() => setDeleteConfirm(null)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(tag.id)}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Confirm Delete
            </button>
          </>
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
  );
}

export default function TagManagement() {
  const { data: tags, isLoading, error } = useTags();
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [newTagEmoji, setNewTagEmoji] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

  const reorderMutation = useMutation({
    mutationFn: async (tagIds: string[]) => {
      console.log('Reordering tags:', tagIds);
      const response = await apiClient.put('/api/tags/reorder', { tagIds });
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Reorder successful:', data);
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
    },
    onError: (error: any) => {
      console.error('Reorder failed:', error);
      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey: ['tags'] });
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && tags) {
      const oldIndex = tags.findIndex((tag) => tag.id === active.id);
      const newIndex = tags.findIndex((tag) => tag.id === over.id);

      const newTags = arrayMove(tags, oldIndex, newIndex);
      const tagIds = newTags.map((tag) => tag.id);

      // Optimistic update
      queryClient.setQueryData(['tags'], newTags);

      // Save to backend
      reorderMutation.mutate(tagIds);
    }
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tags.map((tag) => tag.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              <div className="mb-2 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                <strong>💡 Tip:</strong> Drag and drop tags to reorder them. The order here affects how groups appear in the Cockpit view.
              </div>
              {tags.map((tag) => (
                <SortableTag
                  key={tag.id}
                  tag={tag}
                  isEditing={editingTag?.id === tag.id}
                  onEdit={setEditingTag}
                  onUpdate={handleUpdate}
                  onCancelEdit={() => setEditingTag(null)}
                  onDelete={handleDelete}
                  setDeleteConfirm={setDeleteConfirm}
                  deleteConfirm={deleteConfirm}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
