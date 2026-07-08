import { useCallback, useEffect, useMemo, useRef } from 'react';

type DialogDraftValues = Record<string, string>;

type StoredDialogDraft<TDraft extends DialogDraftValues> = {
  version: 1;
  savedAt: number;
  value: TDraft;
};

interface UseDialogDraftOptions<TDraft extends DialogDraftValues> {
  storageKey: string;
  isOpen: boolean;
  draft: TDraft;
  isDirty: boolean;
  onRestore: (draft: TDraft) => void;
}

const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isDraftValues(value: unknown): value is DialogDraftValues {
  return isRecord(value) && Object.values(value).every((field) => typeof field === 'string');
}

function removeDraft(storageKey: string) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Best effort only.
  }
}

function readDraft<TDraft extends DialogDraftValues>(storageKey: string): TDraft | null {
  try {
    const rawDraft = window.localStorage.getItem(storageKey);
    if (!rawDraft) return null;

    const parsedDraft = JSON.parse(rawDraft) as unknown;
    if (!isRecord(parsedDraft)) {
      removeDraft(storageKey);
      return null;
    }

    if (parsedDraft.version === 1) {
      const storedDraft = parsedDraft as Partial<StoredDialogDraft<TDraft>>;
      if (typeof storedDraft.savedAt !== 'number' || !isDraftValues(storedDraft.value)) {
        removeDraft(storageKey);
        return null;
      }

      if (Date.now() - storedDraft.savedAt > DRAFT_TTL_MS) {
        removeDraft(storageKey);
        return null;
      }

      return storedDraft.value as TDraft;
    }

    // Backward compatibility for drafts written before metadata/TTL existed.
    if (isDraftValues(parsedDraft)) return parsedDraft as TDraft;

    removeDraft(storageKey);
    return null;
  } catch {
    removeDraft(storageKey);
    return null;
  }
}

function writeDraft<TDraft extends DialogDraftValues>(storageKey: string, draft: TDraft) {
  try {
    const storedDraft: StoredDialogDraft<TDraft> = {
      version: 1,
      savedAt: Date.now(),
      value: draft,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(storedDraft));
  } catch {
    // Local draft preservation is best-effort; do not block editing if storage is unavailable.
  }
}

export function useDialogDraft<TDraft extends DialogDraftValues>({
  storageKey,
  isOpen,
  draft,
  isDirty,
  onRestore,
}: UseDialogDraftOptions<TDraft>) {
  const draftSignature = useMemo(() => JSON.stringify(draft), [draft]);
  const onRestoreRef = useRef(onRestore);
  const suppressedDraftSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    if (!isOpen) return;

    const storedDraft = readDraft<TDraft>(storageKey);
    if (storedDraft) onRestoreRef.current(storedDraft);
  }, [isOpen, storageKey]);

  useEffect(() => {
    if (!isOpen || !isDirty) return;
    if (suppressedDraftSignatureRef.current === draftSignature) return;
    suppressedDraftSignatureRef.current = null;
    writeDraft(storageKey, draft);
  }, [draft, draftSignature, isDirty, isOpen, storageKey]);

  const clearDraft = useCallback(() => {
    removeDraft(storageKey);
    suppressedDraftSignatureRef.current = draftSignature;
  }, [draftSignature, storageKey]);

  return { clearDraft };
}
