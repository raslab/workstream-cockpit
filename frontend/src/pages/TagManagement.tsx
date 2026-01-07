import { useState } from 'react';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '../api/tags';
import { ColorPicker } from '../components/ColorPicker/ColorPicker';
import type { Tag } from '../types/tag';

interface TagItemProps {
  tag: Tag;
  isEditing: boolean;
  onEdit: (tag: Tag) => void;
  onUpdate: (tag: Tag) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  setDeleteConfirm: (id: string | null) => void;
  deleteConfirm: string | null;
}

function TagItem({
  tag,
  isEditing,
  onEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
  setDeleteConfirm,
  deleteConfirm,
}: TagItemProps) {
  const [editDisplayName, setEditDisplayName] = useState(tag.displayName);
  const [editColor, setEditColor] = useState(tag.color);
  
  // Generate tag ID preview
  const generateTagId = (displayName: string): string => {
    return displayName.trim().toLowerCase().replace(/\s+/g, '_');
  };
  
  const tagIdPreview = generateTagId(editDisplayName);

  if (isEditing) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Edit Tag</h3>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tag Display Name <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">#</span>
            <input
              type="text"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              maxLength={50}
              placeholder="Backend Team, Alan Awake, API v2"
            />
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Alphanumeric, hyphens, underscores, and spaces allowed • {editDisplayName.length}/50 characters
          </div>
          {editDisplayName.trim() && (
            <div className="mt-2 rounded-md bg-blue-50 p-2 text-xs text-blue-800">
              <strong>Tag ID:</strong> #{tagIdPreview}
              {editDisplayName !== tagIdPreview && (
                <span className="ml-1">(Use this ID in text: #{tagIdPreview})</span>
              )}
            </div>
          )}
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Color <span className="text-red-500">*</span>
          </label>
          <ColorPicker value={editColor} onChange={setEditColor} />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancelEdit}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onUpdate({ ...tag, displayName: editDisplayName, color: editColor })}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
            disabled={!editDisplayName.trim()}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white"
        style={{ backgroundColor: tag.color }}
      >
        #
      </div>

      <div className="flex-1">
        <h3 className="font-medium text-gray-900">#{tag.displayName}</h3>
        <p className="text-xs text-gray-500">
          ID: #{tag.name} • {tag.color}
        </p>
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
  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();
  const deleteMutation = useDeleteTag();

  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagDisplayName, setNewTagDisplayName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#1DA1F2');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Generate tag ID preview for new tag
  const generateTagId = (displayName: string): string => {
    return displayName.trim().toLowerCase().replace(/\s+/g, '_');
  };
  
  const newTagIdPreview = generateTagId(newTagDisplayName);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagDisplayName.trim()) {
      createMutation.mutate(
        {
          displayName: newTagDisplayName.trim(),
          color: newTagColor,
        },
        {
          onSuccess: () => {
            setIsCreating(false);
            setNewTagDisplayName('');
            setNewTagColor('#1DA1F2');
          },
        }
      );
    }
  };

  const handleUpdate = (tag: Tag) => {
    updateMutation.mutate(
      {
        id: tag.id,
        updates: {
          displayName: tag.displayName,
          color: tag.color,
        },
      },
      {
        onSuccess: () => {
          setEditingTag(null);
        },
      }
    );
  };

  const handleDelete = (tagId: string) => {
    deleteMutation.mutate(tagId, {
      onSuccess: () => {
        setDeleteConfirm(null);
      },
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Tags</h2>
        <p className="mt-1 text-sm text-gray-500">
          Create tags to reference people, teams, projects, or any other entity across your workstreams. 
          Use #tagname in any text field.
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
                Tag Display Name <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-lg">#</span>
                <input
                  type="text"
                  value={newTagDisplayName}
                  onChange={(e) => setNewTagDisplayName(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  maxLength={50}
                  placeholder="e.g., Backend Team, Alan Awake, API v2"
                  autoFocus
                />
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Alphanumeric, hyphens, underscores, and spaces allowed • {newTagDisplayName.length}/50 characters
              </div>
              {newTagDisplayName.trim() && (
                <div className="mt-2 rounded-md bg-blue-50 p-2 text-sm text-blue-800">
                  <strong>Tag ID:</strong> #{newTagIdPreview}
                  <br />
                  <span className="text-xs">
                    Use <code className="bg-blue-100 px-1 rounded">#{newTagIdPreview}</code> in text for autocompletion and matching
                  </span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Color <span className="text-red-500">*</span>
              </label>
              <ColorPicker value={newTagColor} onChange={setNewTagColor} />
              <div className="mt-1 text-xs text-gray-500">
                Default: #1DA1F2 (Twitter blue)
              </div>
            </div>

            {createMutation.isError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
                Failed to create tag. Please check the name format and try again.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewTagDisplayName('');
                  setNewTagColor('#1DA1F2');
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={createMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                disabled={!newTagDisplayName.trim() || createMutation.isPending}
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
          <p className="text-gray-500 mb-2">No tags yet. Create your first tag!</p>
          <p className="text-xs text-gray-400">
            Tags let you reference entities like #backend, #frontend, #team-alpha across workstreams
          </p>
        </div>
      )}

      {!isLoading && tags && tags.length > 0 && (
        <div className="space-y-3">
          <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
            <strong>💡 How to use tags:</strong>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>Type the <strong>tag ID</strong> (shown below each tag) in workstream context or status updates</li>
              <li>Example: For "Alan Awake", type <code className="bg-blue-100 px-1 rounded">#alan_awake</code></li>
              <li>The autocomplete will help you select the right tag</li>
              <li>Tags display with their friendly names everywhere in the UI</li>
            </ul>
          </div>
          {tags.map((tag) => (
            <TagItem
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
      )}
    </div>
  );
}
