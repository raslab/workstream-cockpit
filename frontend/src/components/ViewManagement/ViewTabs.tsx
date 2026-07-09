import { useState } from 'react';
import type { ViewConfig } from '../../types/view';
import { ViewTabItem } from './ViewTabItem';
import { ViewCreateDialog } from './ViewCreateDialog';

interface ViewTabsProps {
  views: ViewConfig[];
  activeViewId: string;
  onViewChange: (id: string) => void;
  onViewCreate: (name: string) => void;
  onViewDelete: (id: string) => void;
  onViewRename: (id: string, newName: string) => void;
  onNewWorkstream?: () => void;
}

export function ViewTabs({
  views,
  activeViewId,
  onViewChange,
  onViewCreate,
  onViewDelete,
  onViewRename,
  onNewWorkstream,
}: ViewTabsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this view?')) {
      onViewDelete(id);
    }
  };

  return (
    <>
      <div
        data-testid="view-tabs-panel"
        className="flex min-w-0 items-center justify-between overflow-hidden border-b border-gray-200 bg-gray-50 px-4 dark:border-gray-700 dark:bg-gray-900"
      >
        <div data-testid="view-tabs-list" className="flex min-w-0 flex-1 flex-nowrap overflow-hidden pt-2">
          {views.map((view) => (
            <ViewTabItem
              key={view.id}
              view={view}
              isActive={view.id === activeViewId}
              isEditing={editingId === view.id}
              onClick={() => onViewChange(view.id)}
              onEdit={() => setEditingId(view.id)}
              onEditComplete={(newName) => {
                if (newName !== view.name) {
                  onViewRename(view.id, newName);
                }
                setEditingId(null);
              }}
              onDelete={() => handleDelete(view.id)}
            />
          ))}

          <button
            onClick={() => setIsCreating(true)}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            title="Create new view"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>New View</span>
          </button>
        </div>

        {/* New Workstream Button */}
        {onNewWorkstream && (
          <button
            onClick={onNewWorkstream}
            className="ml-4 shrink-0 whitespace-nowrap rounded-md bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            New Workstream
          </button>
        )}
      </div>

      {isCreating && (
        <ViewCreateDialog
          onSave={(name) => {
            onViewCreate(name);
            setIsCreating(false);
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}
    </>
  );
}
