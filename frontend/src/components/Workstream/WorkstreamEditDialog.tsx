import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Workstream } from '../../types/workstream';
import { useCategories } from '../../hooks/useCategories';
import { TagAutocomplete } from '../Tag/TagAutocomplete';
import { SelectMenu } from '../UI/SelectMenu';
import { handleRichHtmlTextareaPaste } from '../../utils/richPasteTextarea';
import { WorkstreamLink } from './WorkstreamReference';
import { useDirtyResourceEditor } from '../Notifications/ResourceChangeNotificationProvider';
import { useDialogDraft } from '../../hooks/useDialogDraft';

interface WorkstreamEditDialogProps {
  workstream: Workstream;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (workstream: Workstream) => void;
}

export function WorkstreamEditDialog({
  workstream,
  isOpen,
  onClose,
  onUpdated,
}: WorkstreamEditDialogProps) {
  const [name, setName] = useState(workstream.name);
  const [categoryId, setCategoryId] = useState<string>(workstream.categoryId || '');
  const [context, setContext] = useState(workstream.context || '');
  const [baseline, setBaseline] = useState(workstream);
  const [conflictCurrent, setConflictCurrent] = useState<Workstream | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const wasOpenRef = useRef(false);
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();

  useEffect(() => {
    const dirty =
      name !== baseline.name ||
      categoryId !== (baseline.categoryId || '') ||
      context !== (baseline.context || '');
    const opening = isOpen && !wasOpenRef.current;
    const changingResource = baseline.id !== workstream.id;
    if (isOpen && (opening || changingResource || !dirty)) {
      setBaseline(workstream);
      setName(workstream.name);
      setCategoryId(workstream.categoryId || '');
      setContext(workstream.context || '');
      setShowDiscardConfirm(false);
      if (opening || changingResource) {
        setConflictCurrent(null);
      }
    }
    wasOpenRef.current = isOpen;
    // Form values intentionally participate in the guard, not the trigger: a cache/prop
    // refresh may update a pristine editor but must never overwrite a dirty open editor or
    // discard a draft restored automatically after conflict recovery.
  }, [isOpen, workstream]);

  const currentDraft = { name, categoryId, context };
  const isDraftDirty =
    name !== baseline.name ||
    categoryId !== (baseline.categoryId || '') ||
    context !== (baseline.context || '');
  const draftControls = useDialogDraft({
    storageKey: `cockpit:draft:workstream-edit:${workstream.id}`,
    isOpen,
    draft: currentDraft,
    isDirty: isDraftDirty,
    onRestore: (draft) => {
      setName(draft.name || '');
      setCategoryId(draft.categoryId || '');
      setContext(draft.context || '');
    },
  });
  useDirtyResourceEditor(`workstream-edit-${workstream.id}`, isOpen && isDraftDirty);

  // Ref for autocomplete
  const contextRef = useRef<HTMLTextAreaElement>(null);

  const updateMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      categoryId: string | null;
      context: string | null;
      expectedVersion: number;
    }) => {
      const response = await apiClient.put(`/api/workstreams/${workstream.id}`, data);
      return response.data;
    },
    onSuccess: (updatedWorkstream: Workstream) => {
      queryClient.setQueryData(['workstream', workstream.id], updatedWorkstream);
      queryClient.setQueriesData<Workstream[]>({ queryKey: ['workstreams'] }, (oldWorkstreams) => {
        if (!Array.isArray(oldWorkstreams)) return oldWorkstreams;
        return oldWorkstreams.map((cachedWorkstream) =>
          cachedWorkstream.id === updatedWorkstream.id ? updatedWorkstream : cachedWorkstream,
        );
      });
      onUpdated?.(updatedWorkstream);
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['workstream', workstream.id] });
      draftControls.clearDraft();
      onClose();
    },
    onError: (error: any) => {
      if (error?.response?.status === 409 && error?.response?.data?.code === 'VERSION_CONFLICT') {
        setConflictCurrent(error.response.data.current || null);
      }
    },
    retry: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (updateMutation.isPending) return;
    if (name.trim()) {
      updateMutation.mutate({
        name: name.trim(),
        categoryId: categoryId || null,
        context: context.trim() || null,
        expectedVersion: baseline.version,
      });
    }
  };

  const reloadCurrentVersion = () => {
    if (!conflictCurrent) return;
    const latest = conflictCurrent;
    setBaseline(latest);
    setConflictCurrent(null);
    updateMutation.reset();
  };

  const closeWithoutSaving = () => {
    draftControls.clearDraft();
    setShowDiscardConfirm(false);
    onClose();
  };

  const requestClose = () => {
    if (updateMutation.isPending) return;
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
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
          Edit <WorkstreamLink workstream={workstream} />
        </h2>

        <form onSubmit={handleSubmit} onKeyDown={handleShortcutKeys}>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setShowDiscardConfirm(false);
              }}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
              maxLength={200}
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
                ...categories.map((category) => ({ value: category.id, label: category.name })),
              ]}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="context"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Context
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
                rows={4}
                maxLength={2000}
              />
              <TagAutocomplete textareaRef={contextRef} value={context} onChange={setContext} />
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {context.length}/2000 characters
            </div>
          </div>

          {conflictCurrent ? (
            <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              This workstream changed elsewhere. Reload the current version to continue; your cached
              draft will be restored automatically.
              <button type="button" onClick={reloadCurrentVersion} className="ml-2 underline">
                Reload current version
              </button>
            </div>
          ) : (
            updateMutation.isError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                Failed to update workstream. Please try again.
              </div>
            )
          )}

          {showDiscardConfirm && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              <div className="font-semibold">Discard changes?</div>
              <div className="mt-1">Your stream edits have not been saved.</div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-gray-900 dark:text-amber-100 dark:hover:bg-amber-900/40"
                  disabled={updateMutation.isPending}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={closeWithoutSaving}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  disabled={updateMutation.isPending}
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
          )}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Enter adds a new line • Ctrl/Cmd | Enter submits • Esc cancels
          </div>
        </form>
      </div>
    </div>
  );
}
