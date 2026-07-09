import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useCategories } from '../../hooks/useCategories';
import { TagAutocomplete } from '../Tag/TagAutocomplete';
import type { WorkstreamSummary } from '../../types/workstream';
import { CLOSED_PARENT_SUBSTREAM_MESSAGE, hierarchyErrorMessage } from '../../utils/hierarchy';
import { WorkstreamLink } from './WorkstreamReference';
import { SelectMenu } from '../UI/SelectMenu';
import { handleRichHtmlTextareaPaste } from '../../utils/richPasteTextarea';
import { useDirtyResourceEditor } from '../Notifications/ResourceChangeNotificationProvider';
import { useDialogDraft } from '../../hooks/useDialogDraft';

interface WorkstreamCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  parent?: WorkstreamSummary | null;
}

export function WorkstreamCreateDialog({ isOpen, onClose, parent }: WorkstreamCreateDialogProps) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [context, setContext] = useState('');
  const [initialStatus, setInitialStatus] = useState('');
  const [initialNote, setInitialNote] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const isClosedParent = parent?.state === 'closed';
  const currentDraft = { name, categoryId, context, initialStatus, initialNote };
  const isDraftDirty = Boolean(
    name.trim() || categoryId || context.trim() || initialStatus.trim() || initialNote.trim(),
  );
  const draftControls = useDialogDraft({
    storageKey: parent?.id
      ? `cockpit:draft:workstream-create:parent:${parent.id}`
      : 'cockpit:draft:workstream-create:root',
    isOpen,
    draft: currentDraft,
    isDirty: isDraftDirty,
    onRestore: (draft) => {
      setName(draft.name || '');
      setCategoryId(draft.categoryId || '');
      setContext(draft.context || '');
      setInitialStatus(draft.initialStatus || '');
      setInitialNote(draft.initialNote || '');
    },
  });
  useDirtyResourceEditor(
    parent?.id ? `workstream-create-${parent.id}` : 'workstream-create',
    isOpen && isDraftDirty,
  );

  // Refs for autocomplete
  const contextRef = useRef<HTMLTextAreaElement>(null);
  const initialStatusRef = useRef<HTMLTextAreaElement>(null);
  const initialNoteRef = useRef<HTMLTextAreaElement>(null);

  const createWorkstreamMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      categoryId?: string;
      context?: string;
      initialStatus?: string;
      initialNote?: string;
      parentId?: string;
    }) => {
      const response = await apiClient.post('/api/workstreams', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      if (parent?.id) queryClient.invalidateQueries({ queryKey: ['workstream', parent.id] });
      draftControls.clearDraft();
      resetForm();
      onClose();
    },
  });

  const resetForm = () => {
    setName('');
    setCategoryId('');
    setContext('');
    setInitialStatus('');
    setInitialNote('');
    setShowDiscardConfirm(false);
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isClosedParent || createWorkstreamMutation.isPending) return;
    if (name.trim()) {
      draftControls.clearDraft();
      createWorkstreamMutation.mutate({
        name: name.trim(),
        categoryId: categoryId || undefined,
        context: context.trim() || undefined,
        initialStatus: initialStatus.trim() || undefined,
        initialNote: initialNote.trim() || undefined,
        parentId: parent?.id,
      });
    }
  };

  const closeWithoutSaving = () => {
    draftControls.clearDraft();
    resetForm();
    onClose();
  };

  const requestClose = () => {
    if (createWorkstreamMutation.isPending) return;
    if (isDraftDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    closeWithoutSaving();
  };

  const handleShortcutKeys = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.requestSubmit();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      requestClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
          {parent ? 'Create Sub-stream' : 'Create New Workstream'}
        </h2>
        {parent && (
          <div className="mb-4 rounded-md border border-primary-200 bg-primary-50 p-3 text-sm text-primary-900 dark:border-primary-500 dark:bg-primary-900/40 dark:text-primary-50">
            Parent:{' '}
            <WorkstreamLink
              workstream={parent}
              className="font-medium text-primary-700 hover:text-primary-800 dark:text-primary-200 dark:hover:text-primary-100"
            />
          </div>
        )}

        {isClosedParent && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {CLOSED_PARENT_SUBSTREAM_MESSAGE}
          </div>
        )}

        <form onSubmit={handleSubmit} onKeyDown={handleShortcutKeys}>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setShowDiscardConfirm(false);
              }}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
              maxLength={200}
              placeholder="Enter workstream name"
              autoFocus
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {name.length}/200 characters
            </div>
          </div>

          <div className="mb-4">
            <SelectMenu
              label="Category (optional)"
              value={categoryId}
              onChange={(value) => {
                setCategoryId(value);
                setShowDiscardConfirm(false);
              }}
              buttonClassName="w-full"
              options={[
                { value: '', label: 'No category' },
                ...(categories?.map((category) => ({ value: category.id, label: category.name })) ??
                  []),
              ]}
            />
            {categoryId && categories && (
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: categories.find((c) => c.id === categoryId)?.color,
                  }}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {categories.find((c) => c.id === categoryId)?.name}
                </span>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="context"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Context (optional)
            </label>
            <div className="relative">
              <textarea
                ref={contextRef}
                id="context"
                value={context}
                onChange={(e) => {
                  setContext(e.target.value);
                  setShowDiscardConfirm(false);
                }}
                onPaste={(e) => handleRichHtmlTextareaPaste(e, context, setContext, 2000)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                rows={3}
                maxLength={2000}
                placeholder="Add background information or description"
              />
              <TagAutocomplete textareaRef={contextRef} value={context} onChange={setContext} />
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {context.length}/2000 characters
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="initialStatus"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Initial Status (optional)
            </label>
            <div className="relative">
              <textarea
                ref={initialStatusRef}
                id="initialStatus"
                value={initialStatus}
                onChange={(e) => {
                  setInitialStatus(e.target.value);
                  setShowDiscardConfirm(false);
                }}
                onPaste={(e) =>
                  handleRichHtmlTextareaPaste(e, initialStatus, setInitialStatus, 500)
                }
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                rows={2}
                maxLength={500}
                placeholder="What's the current status?"
              />
              <TagAutocomplete
                textareaRef={initialStatusRef}
                value={initialStatus}
                onChange={setInitialStatus}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {initialStatus.length}/500 characters
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="initialNote"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Initial Note (optional)
            </label>
            <div className="relative">
              <textarea
                ref={initialNoteRef}
                id="initialNote"
                value={initialNote}
                onChange={(e) => {
                  setInitialNote(e.target.value);
                  setShowDiscardConfirm(false);
                }}
                onPaste={(e) => handleRichHtmlTextareaPaste(e, initialNote, setInitialNote, 2000)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                rows={2}
                maxLength={2000}
                placeholder="Add details about the initial status"
              />
              <TagAutocomplete
                textareaRef={initialNoteRef}
                value={initialNote}
                onChange={setInitialNote}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {initialNote.length}/2000 characters
            </div>
          </div>

          {createWorkstreamMutation.isError && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              {hierarchyErrorMessage(createWorkstreamMutation.error)}
            </div>
          )}

          {showDiscardConfirm && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              <div className="font-semibold">Discard changes?</div>
              <div className="mt-1">Your new stream draft has not been saved.</div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-gray-900 dark:text-amber-100 dark:hover:bg-amber-900/40"
                  disabled={createWorkstreamMutation.isPending}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={closeWithoutSaving}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  disabled={createWorkstreamMutation.isPending}
                >
                  Discard changes
                </button>
              </div>
            </div>
          )}

          {!showDiscardConfirm && (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={requestClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                disabled={createWorkstreamMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                disabled={!name.trim() || isClosedParent || createWorkstreamMutation.isPending}
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
          )}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Enter adds a new line • Ctrl/Cmd | Enter submits • Esc cancels
          </div>
        </form>
      </div>
    </div>
  );
}
