import { useCallback, useEffect, useMemo, useState } from 'react';

type DialogDraftValues = Record<string, string>;

interface UseDialogDraftOptions<TDraft extends DialogDraftValues> {
  storageKey: string;
  isOpen: boolean;
  draft: TDraft;
  isDirty: boolean;
  onRestore: (draft: TDraft) => void;
}

function readDraft<TDraft extends DialogDraftValues>(storageKey: string): TDraft | null {
  try {
    const rawDraft = window.localStorage.getItem(storageKey);
    if (!rawDraft) return null;
    const parsedDraft = JSON.parse(rawDraft) as unknown;
    if (!parsedDraft || typeof parsedDraft !== 'object') return null;
    return parsedDraft as TDraft;
  } catch {
    return null;
  }
}

function writeDraft<TDraft extends DialogDraftValues>(storageKey: string, draft: TDraft) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // Local draft preservation is best-effort; do not block editing if storage is unavailable.
  }
}

function removeDraft(storageKey: string) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Best effort only.
  }
}

function sameDraft<TDraft extends DialogDraftValues>(first: TDraft, second: TDraft): boolean {
  const keys = new Set([...Object.keys(first), ...Object.keys(second)]);
  for (const key of keys) {
    if ((first[key] ?? '') !== (second[key] ?? '')) return false;
  }
  return true;
}

export function useDialogDraft<TDraft extends DialogDraftValues>({
  storageKey,
  isOpen,
  draft,
  isDirty,
  onRestore,
}: UseDialogDraftOptions<TDraft>) {
  const [savedDraft, setSavedDraft] = useState<TDraft | null>(null);
  const draftSignature = useMemo(() => JSON.stringify(draft), [draft]);

  useEffect(() => {
    if (!isOpen) {
      setSavedDraft(null);
      return;
    }

    const storedDraft = readDraft<TDraft>(storageKey);
    setSavedDraft(storedDraft && !sameDraft(storedDraft, draft) ? storedDraft : null);
    // Only inspect storage when a dialog/key opens. Current value changes are handled below.
  }, [isOpen, storageKey]);

  useEffect(() => {
    if (!isOpen || !isDirty) return;
    writeDraft(storageKey, draft);
    setSavedDraft((currentSavedDraft) =>
      currentSavedDraft && sameDraft(currentSavedDraft, draft) ? null : currentSavedDraft,
    );
  }, [draft, draftSignature, isDirty, isOpen, storageKey]);

  const restoreDraft = useCallback(() => {
    if (!savedDraft) return;
    onRestore(savedDraft);
    setSavedDraft(null);
  }, [onRestore, savedDraft]);

  const discardDraft = useCallback(() => {
    removeDraft(storageKey);
    setSavedDraft(null);
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    removeDraft(storageKey);
    setSavedDraft(null);
  }, [storageKey]);

  return {
    hasSavedDraft: Boolean(savedDraft),
    restoreDraft,
    discardDraft,
    clearDraft,
  };
}

export function DialogDraftNotice({
  onRestore,
  onDiscard,
}: {
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <div className="font-medium">Unsaved draft available</div>
      <div className="mt-1">
        Restore it into this form, or discard it and keep the loaded values.
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onRestore}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
        >
          Restore draft
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-gray-900 dark:text-amber-100 dark:hover:bg-amber-900/40"
        >
          Discard draft
        </button>
      </div>
    </div>
  );
}
