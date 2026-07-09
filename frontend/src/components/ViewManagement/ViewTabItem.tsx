import { useState, useRef, useEffect } from 'react';
import type { ViewConfig } from '../../types/view';

interface ViewTabItemProps {
  view: ViewConfig;
  isActive: boolean;
  isEditing: boolean;
  showSeparator: boolean;
  onClick: () => void;
  onEdit: () => void;
  onEditComplete: (newName: string) => void;
  onDelete: () => void;
}

export function ViewTabItem({
  view,
  isActive,
  isEditing,
  showSeparator,
  onClick,
  onEdit,
  onEditComplete,
  onDelete,
}: ViewTabItemProps) {
  const [editName, setEditName] = useState(view.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onEditComplete(editName);
    } else if (e.key === 'Escape') {
      setEditName(view.name);
      onEditComplete(view.name);
    }
  };

  const tabWidthClasses = isActive ? 'shrink-0' : 'min-w-12 shrink';
  const tabPaddingClasses = 'px-2';

  if (isEditing) {
    return (
      <div
        data-testid={`view-tab-${view.id}`}
        className={`inline-flex basis-[150px] items-center overflow-hidden whitespace-nowrap py-1.5 ${tabPaddingClasses} ${tabWidthClasses}`}
        aria-current={isActive ? 'page' : undefined}
      >
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => onEditComplete(editName)}
          onKeyDown={handleKeyDown}
          className="w-full min-w-0 border-b border-primary-600 bg-transparent text-sm outline-none dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
        />
      </div>
    );
  }

  return (
    <div
      data-testid={`view-tab-${view.id}`}
      aria-current={isActive ? 'page' : undefined}
      className={`group relative flex basis-[150px] items-center overflow-hidden whitespace-nowrap py-1.5 transition-colors ${tabPaddingClasses} ${
        isActive
          ? 'shrink-0 rounded-t-md border-x border-t border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'
          : 'min-w-12 shrink cursor-pointer bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
      }`}
    >
      <button
        onClick={onClick}
        className={`min-w-0 flex-1 truncate text-left text-sm font-medium transition-[padding] ${
          isActive ? 'group-hover:pr-10' : ''
        }`}
        title={view.name}
      >
        {view.name}
      </button>

      {isActive && !view.isDefault && (
        <div
          data-testid={`view-tab-${view.id}-actions`}
          className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded bg-gray-50 p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            title="Rename view"
            aria-label="Rename view"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded bg-gray-50 p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            title="Delete view"
            aria-label="Delete view"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      )}

      {showSeparator && (
        <span
          data-testid={`view-tab-${view.id}-separator`}
          data-view-id={view.id}
          aria-hidden="true"
          className="pointer-events-none absolute right-0 text-gray-300 dark:text-gray-600"
        >
          |
        </span>
      )}
    </div>
  );
}
