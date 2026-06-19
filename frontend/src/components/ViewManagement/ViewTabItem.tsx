import { useState, useRef, useEffect } from 'react';
import type { ViewConfig } from '../../types/view';

interface ViewTabItemProps {
  view: ViewConfig;
  isActive: boolean;
  isEditing: boolean;
  onClick: () => void;
  onEdit: () => void;
  onEditComplete: (newName: string) => void;
  onDelete: () => void;
}

export function ViewTabItem({
  view,
  isActive,
  isEditing,
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

  if (isEditing) {
    return (
      <div className="inline-flex items-center px-3 py-1.5">
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => onEditComplete(editName)}
          onKeyDown={handleKeyDown}
          className="w-32 border-b border-primary-600 bg-transparent text-sm outline-none dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
        />
      </div>
    );
  }

  return (
    <div
      className={`group relative flex items-center gap-2 rounded-t-md px-3 py-1.5 transition-colors ${
        isActive
          ? 'border-x border-t border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'
          : 'cursor-pointer bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
      }`}
    >
      <button onClick={onClick} className="text-sm font-medium">
        {view.name}
      </button>

      {!view.isDefault && (
        <div className="hidden items-center gap-1 group-hover:flex">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded p-0.5 hover:bg-gray-200"
            title="Rename view"
            aria-label="Rename view"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-0.5 hover:bg-gray-200"
            title="Delete view"
            aria-label="Delete view"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
