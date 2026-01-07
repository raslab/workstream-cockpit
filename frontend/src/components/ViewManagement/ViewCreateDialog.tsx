import { useState } from 'react';

interface ViewCreateDialogProps {
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function ViewCreateDialog({ onSave, onCancel }: ViewCreateDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (name.length < 3) {
      setError('View name must be at least 3 characters');
      return;
    }
    if (name.length > 50) {
      setError('View name must be less than 50 characters');
      return;
    }

    onSave(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Create New View</h3>

        <div className="mb-4">
          <label htmlFor="view-name" className="mb-1 block text-sm font-medium text-gray-700">
            View Name
          </label>
          <input
            id="view-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g., QA Team, Old Ones"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            autoFocus
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Create View
          </button>
        </div>
      </div>
    </div>
  );
}
