import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCategories } from '../hooks/useCategories';
import { apiClient } from '../api/client';
import { ColorPicker } from '../components/ColorPicker/ColorPicker';
import { EmojiPicker } from '../components/EmojiPicker/EmojiPicker';
import { Category } from '../types/workstream';
import { useDirtyResourceEditor } from '../components/Notifications/ResourceChangeNotificationProvider';

interface SortableCategoryProps {
  category: Category;
  isEditing: boolean;
  onEdit: (category: Category) => void;
  onUpdate: (category: Category) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  setDeleteConfirm: (id: string | null) => void;
  deleteConfirm: string | null;
}

function SortableCategory({
  category,
  isEditing,
  onEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
  setDeleteConfirm,
  deleteConfirm,
}: SortableCategoryProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    transition: null, // Disable animation to prevent glitches
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editName, setEditName] = useState(category.name);
  const [editColor, setEditColor] = useState(category.color);
  const [editEmoji, setEditEmoji] = useState(category.emoji || '');
  const [editDescription, setEditDescription] = useState(category.description || '');
  useEffect(() => {
    if (!isEditing) return;
    setEditName(category.name);
    setEditColor(category.color);
    setEditEmoji(category.emoji || '');
    setEditDescription(category.description || '');
  }, [category.color, category.description, category.emoji, category.id, category.name, isEditing]);
  useDirtyResourceEditor(
    `category-edit-${category.id}`,
    isEditing &&
      (editName !== category.name ||
        editColor !== category.color ||
        editEmoji !== (category.emoji || '') ||
        editDescription !== (category.description || '')),
  );

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Edit Category
        </h3>
        <div className="mb-4">
          <label
            htmlFor={`category-name-${category.id}`}
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Category Name <span className="text-red-500">*</span>
          </label>
          <input
            id={`category-name-${category.id}`}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
            maxLength={100}
          />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Color
          </label>
          <ColorPicker value={editColor} onChange={setEditColor} />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Emoji
          </label>
          <EmojiPicker value={editEmoji} onChange={setEditEmoji} />
        </div>
        <div className="mb-4">
          <label
            htmlFor={`category-description-${category.id}`}
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Description
          </label>
          <textarea
            id={`category-description-${category.id}`}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="min-h-24 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
            maxLength={2000}
            placeholder="Describe what this category means for humans and agents"
          />
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {editDescription.length}/2000 characters
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancelEdit}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onUpdate({
                ...category,
                name: editName,
                color: editColor,
                emoji: editEmoji || null,
                description: editDescription,
              })
            }
            aria-label="Save category"
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
      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:text-gray-500"
        title="Drag to reorder"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      <div
        className="flex h-10 w-10 items-center justify-center rounded-md text-lg"
        style={{ backgroundColor: category.color }}
      >
        {category.emoji}
      </div>

      <div className="flex-1">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">{category.name}</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          {category.description || 'No description'}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onEdit(category)}
          aria-label={`Edit ${category.name}`}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Edit
        </button>

        {deleteConfirm === category.id ? (
          <>
            <button
              onClick={() => setDeleteConfirm(null)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(category.id)}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Confirm Delete
            </button>
          </>
        ) : (
          <button
            onClick={() => setDeleteConfirm(category.id)}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-900/40"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default function CategoryManagement() {
  const { data: categories, isLoading, error } = useCategories();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const queryClient = useQueryClient();
  useDirtyResourceEditor(
    'category-create',
    isCreating &&
      Boolean(
        newCategoryName.trim() ||
        newCategoryColor !== '#3B82F6' ||
        newCategoryEmoji.trim() ||
        newCategoryDescription.trim(),
      ),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      color: string;
      emoji?: string | null;
      description: string;
    }) => {
      const response = await apiClient.post('/api/categories', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsCreating(false);
      setNewCategoryName('');
      setNewCategoryColor('#3B82F6');
      setNewCategoryEmoji('');
      setNewCategoryDescription('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      color: string;
      emoji?: string | null;
      description: string;
    }) => {
      const response = await apiClient.put(`/api/categories/${data.id}`, {
        name: data.name,
        color: data.color,
        emoji: data.emoji,
        description: data.description,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      setEditingCategory(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      await apiClient.delete(`/api/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      setDeleteConfirm(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (categoryIds: string[]) => {
      console.log('Reordering categories:', categoryIds);
      const response = await apiClient.put('/api/categories/reorder', { categoryIds });
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Reorder successful:', data);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
    },
    onError: (error: any) => {
      console.error('Reorder failed:', error);
      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      createMutation.mutate({
        name: newCategoryName.trim(),
        color: newCategoryColor,
        emoji: newCategoryEmoji || null,
        description: newCategoryDescription.trim(),
      });
    }
  };

  const handleUpdate = (category: Category) => {
    updateMutation.mutate({
      id: category.id,
      name: category.name,
      color: category.color,
      emoji: category.emoji,
      description: category.description || '',
    });
  };

  const handleDelete = (categoryId: string) => {
    deleteMutation.mutate(categoryId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && categories) {
      const oldIndex = categories.findIndex((category) => category.id === active.id);
      const newIndex = categories.findIndex((category) => category.id === over.id);

      const newCategories = arrayMove(categories, oldIndex, newIndex);
      const categoryIds = newCategories.map((category) => category.id);

      // Optimistic update
      queryClient.setQueryData(['categories'], newCategories);

      // Save to backend
      reorderMutation.mutate(categoryIds);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Categories</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create and customize categories to organize your workstreams
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load tags. Please try again.
          </p>
        </div>
      )}

      {/* Create New Category */}
      {isCreating ? (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Create New Category
          </h3>
          <form onSubmit={handleCreate}>
            <div className="mb-4">
              <label
                htmlFor="new-category-name"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                id="new-category-name"
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                maxLength={100}
                placeholder="e.g., urgent, client-work, infrastructure"
                autoFocus
              />
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {newCategoryName.length}/100 characters
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Color <span className="text-red-500">*</span>
              </label>
              <ColorPicker value={newCategoryColor} onChange={setNewCategoryColor} />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Emoji (optional)
              </label>
              <EmojiPicker value={newCategoryEmoji} onChange={setNewCategoryEmoji} />
            </div>

            <div className="mb-4">
              <label
                htmlFor="new-category-description"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Description
              </label>
              <textarea
                id="new-category-description"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                className="min-h-24 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                maxLength={2000}
                placeholder="Describe what this category means for humans and agents"
              />
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {newCategoryDescription.length}/2000 characters
              </div>
            </div>

            {createMutation.isError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                Failed to create category. Please try again.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewCategoryName('');
                  setNewCategoryColor('#3B82F6');
                  setNewCategoryEmoji('');
                  setNewCategoryDescription('');
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                disabled={createMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                disabled={!newCategoryName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="mb-6 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + New Category
        </button>
      )}

      {/* Tags List */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && categories && categories.length === 0 && !isCreating && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No categories yet. Create your first category!
          </p>
        </div>
      )}

      {!isLoading && categories && categories.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={categories.map((category) => category.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              <div className="mb-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100">
                <strong>💡 Tip:</strong> Drag and drop categories to reorder them. The order here
                affects how groups appear in the Cockpit view.
              </div>
              {categories.map((category) => (
                <SortableCategory
                  key={category.id}
                  category={category}
                  isEditing={editingCategory?.id === category.id}
                  onEdit={setEditingCategory}
                  onUpdate={handleUpdate}
                  onCancelEdit={() => setEditingCategory(null)}
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
