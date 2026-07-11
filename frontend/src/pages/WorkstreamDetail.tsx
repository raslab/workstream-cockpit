import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Workstream, StatusUpdate, NextStep } from '../types/workstream';
import { useStatusHistory } from '../hooks/useStatusHistory';
import { useNextSteps } from '../hooks/useNextSteps';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { StatusUpdateDialog } from '../components/StatusUpdate/StatusUpdateDialog';
import { WorkstreamEditDialog } from '../components/Workstream/WorkstreamEditDialog';
import { WorkstreamCreateDialog } from '../components/Workstream/WorkstreamCreateDialog';
import { ParentSelectorDialog } from '../components/Workstream/ParentSelectorDialog';
import { MarkdownRenderer } from '../components/Markdown/MarkdownRenderer';
import { TagAutocomplete } from '../components/Tag/TagAutocomplete';
import {
  getBreadcrumbItems,
  getDirectSubstreamCount,
  getLatestSubstreamActivityAt,
  getLatestSubstreamActivitySourceId,
  getStatusUpdateSource,
  getWorkstreamName,
  hierarchyErrorMessage,
} from '../utils/hierarchy';
import {
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_EMOJI,
  getCategoryIconBandBackground,
} from '../utils/categoryColor';
import { handleRichHtmlTextareaPaste } from '../utils/richPasteTextarea';
import {
  WorkstreamLink,
  WorkstreamNumber,
  WorkstreamReferenceContent,
  workstreamReferenceText,
  workstreamPath,
} from '../components/Workstream/WorkstreamReference';
import {
  useDirtyResourceEditor,
  useResourceChangeScreen,
} from '../components/Notifications/ResourceChangeNotificationProvider';
import { useDialogDraft } from '../hooks/useDialogDraft';
import { shortenDocumentTitleText, useDocumentTitle } from '../components/DocumentTitle';

const STATUS_HISTORY_PAGE_SIZE = 10;

interface StatusEditDialogProps {
  statusUpdate: StatusUpdate;
  workstreamId: string;
  workstreamReferenceId?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface StatusHistoryCachePage {
  updates?: StatusUpdate[];
  nextCursor?: string | null;
}

function replaceStatusUpdateInHistoryCache(
  oldHistory: InfiniteData<StatusHistoryCachePage> | undefined,
  updatedStatusUpdate: StatusUpdate,
): InfiniteData<StatusHistoryCachePage> | undefined {
  if (!oldHistory) return oldHistory;

  return {
    ...oldHistory,
    pages: oldHistory.pages.map((page) => ({
      ...page,
      updates: page.updates?.map((update) =>
        update.id === updatedStatusUpdate.id ? updatedStatusUpdate : update,
      ),
    })),
  };
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not yet';
  return format(parseISO(value), 'MMM d, yyyy • h:mm a');
}

function formatRelativeTime(value: string): string {
  return formatDistanceToNow(parseISO(value), { addSuffix: true }).replace(/^about /, '');
}

function RelativeTime({
  value,
  emptyLabel = 'No updates yet',
}: {
  value: string | null | undefined;
  emptyLabel?: string;
}) {
  if (!value) return <span>{emptyLabel}</span>;
  return (
    <time dateTime={value} title={formatDateTime(value)}>
      {formatRelativeTime(value)}
    </time>
  );
}

function statusUpdateReference(
  update: StatusUpdate,
  updateSource: ReturnType<typeof getStatusUpdateSource>,
  isSubstreamUpdate: boolean,
): string {
  const updateNumber = update.number !== undefined ? ` #${update.number}` : '';
  if (isSubstreamUpdate && updateSource) return `update${updateNumber} from sub-stream`;
  return `self update${updateNumber}`;
}

function UpdateImpactChip({ impact }: { impact?: StatusUpdate['impact'] }) {
  const normalizedImpact = impact ?? 'active';
  const className = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200',
    info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200',
    initial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200',
  }[normalizedImpact];

  return (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${className}`}
    >
      {normalizedImpact}
    </span>
  );
}

export function StatusEditDialog({
  statusUpdate,
  workstreamId,
  workstreamReferenceId,
  isOpen,
  onClose,
}: StatusEditDialogProps) {
  const [status, setStatus] = useState(statusUpdate.status);
  const [note, setNote] = useState(statusUpdate.note || '');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const queryClient = useQueryClient();
  const statusRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const currentDraft = { status, note };
  const isDraftDirty = status !== statusUpdate.status || note !== (statusUpdate.note || '');
  const draftControls = useDialogDraft({
    storageKey: `cockpit:draft:status-edit:${statusUpdate.id}`,
    isOpen,
    draft: currentDraft,
    isDirty: isDraftDirty,
    onRestore: (draft) => {
      setStatus(draft.status || '');
      setNote(draft.note || '');
    },
  });
  useDirtyResourceEditor(`status-edit-${statusUpdate.id}`, isOpen && isDraftDirty);

  const updateMutation = useMutation({
    mutationFn: async (data: { status: string; note: string }) => {
      const response = await apiClient.put(`/api/status-updates/${statusUpdate.id}`, {
        workstreamId,
        status: data.status,
        note: data.note || null,
      });
      return response.data;
    },
    onSuccess: (updatedStatusUpdate: StatusUpdate) => {
      queryClient.setQueriesData<InfiniteData<StatusHistoryCachePage>>(
        { queryKey: ['status-updates'] },
        (oldHistory) => replaceStatusUpdateInHistoryCache(oldHistory, updatedStatusUpdate),
      );
      queryClient.invalidateQueries({ queryKey: ['status-updates', workstreamId] });
      if (workstreamReferenceId && workstreamReferenceId !== workstreamId) {
        queryClient.invalidateQueries({ queryKey: ['status-updates', workstreamReferenceId] });
      }
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['workstream', workstreamId] });
      if (workstreamReferenceId && workstreamReferenceId !== workstreamId) {
        queryClient.invalidateQueries({ queryKey: ['workstream', workstreamReferenceId] });
      }
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      draftControls.clearDraft();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (updateMutation.isPending) return;
    if (status.trim()) {
      draftControls.clearDraft();
      updateMutation.mutate({ status: status.trim(), note: note.trim() });
    }
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
          Edit Status Update
        </h2>

        <form onSubmit={handleSubmit} onKeyDown={handleShortcutKeys}>
          <div className="mb-4">
            <label
              htmlFor="status"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Status <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                ref={statusRef}
                id="status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setShowDiscardConfirm(false);
                }}
                onPaste={(e) => handleRichHtmlTextareaPaste(e, status, setStatus, 500)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                rows={3}
                maxLength={500}
                autoFocus
              />
              <TagAutocomplete textareaRef={statusRef} value={status} onChange={setStatus} />
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {status.length}/500 characters
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="note"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Note (optional)
            </label>
            <div className="relative">
              <textarea
                ref={noteRef}
                id="note"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setShowDiscardConfirm(false);
                }}
                onPaste={(e) => handleRichHtmlTextareaPaste(e, note, setNote, 2000)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                rows={3}
                maxLength={2000}
              />
              <TagAutocomplete textareaRef={noteRef} value={note} onChange={setNote} />
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {note.length}/2000 characters
            </div>
          </div>

          {updateMutation.isError && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              Failed to update status. Please try again.
            </div>
          )}

          {showDiscardConfirm && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              <div className="font-semibold">Discard changes?</div>
              <div className="mt-1">Your edited status update text has not been saved.</div>
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
                disabled={!status.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
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

function nextStepCountText(count: number, prefixOpen = true): string {
  const label = count === 1 ? 'next step' : 'next steps';
  return `${count}${prefixOpen ? ' open' : ''} ${label}`;
}

function reorderStepIds(
  nextSteps: NextStep[],
  draggedId: string,
  targetId: string,
): string[] | null {
  if (draggedId === targetId) return null;
  const index = nextSteps.findIndex((step) => step.id === draggedId);
  const targetIndex = nextSteps.findIndex((step) => step.id === targetId);
  if (index < 0 || targetIndex < 0) return null;

  const reordered = [...nextSteps];
  const [step] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, step);
  return reordered.map((nextStep) => nextStep.id);
}

type NavigationOrigin = {
  pathname: string;
  search?: string;
  hash?: string;
  label?: string;
};

function isSafeNavigationOrigin(value: unknown): value is NavigationOrigin {
  if (!value || typeof value !== 'object') return false;
  const origin = value as Partial<NavigationOrigin>;
  return (
    typeof origin.pathname === 'string' &&
    origin.pathname.startsWith('/') &&
    !origin.pathname.startsWith('//') &&
    (origin.search === undefined || typeof origin.search === 'string') &&
    (origin.hash === undefined || typeof origin.hash === 'string') &&
    (origin.label === undefined || typeof origin.label === 'string')
  );
}

function NextStepsSection({
  workstreamId,
  workstreamReferenceId,
  isClosed,
}: {
  workstreamId: string;
  workstreamReferenceId?: string;
  isClosed: boolean;
}) {
  const {
    nextSteps,
    isLoading,
    isError,
    createNextStep,
    updateNextStep,
    reorderNextSteps,
    solveNextStep,
    abandonNextStep,
  } = useNextSteps(workstreamId, workstreamReferenceId ? [workstreamReferenceId] : []);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const nextStepDraftControls = useDialogDraft({
    storageKey: `cockpit:draft:next-step-create:${workstreamId}`,
    isOpen: !isClosed,
    draft: { text: newText },
    isDirty: Boolean(newText.trim()),
    onRestore: (draft) => setNewText(draft.text || ''),
  });
  useDirtyResourceEditor(`next-step-create-${workstreamId}`, Boolean(newText.trim()));
  useDirtyResourceEditor(
    `next-step-edit-${workstreamId}`,
    Boolean(
      editingId && editingText !== (nextSteps.find((step) => step.id === editingId)?.text ?? ''),
    ),
  );
  const isMutating =
    createNextStep.isPending ||
    updateNextStep.isPending ||
    reorderNextSteps.isPending ||
    solveNextStep.isPending ||
    abandonNextStep.isPending;

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    const text = newText.trim();
    if (!text) return;
    nextStepDraftControls.clearDraft();
    createNextStep.mutate(text, {
      onSuccess: () => setNewText(''),
    });
  };

  const beginEdit = (step: NextStep) => {
    setEditingId(step.id);
    setEditingText(step.text);
  };

  const saveEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId) return;
    const text = editingText.trim();
    if (!text) return;
    updateNextStep.mutate(
      { nextStepId: editingId, text },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditingText('');
        },
      },
    );
  };

  const dropStep = (targetId: string) => {
    if (!draggedId || isMutating || isClosed) return;
    const ids = reorderStepIds(nextSteps, draggedId, targetId);
    if (ids) reorderNextSteps.mutate(ids);
    setDraggedId(null);
  };

  return (
    <section
      aria-labelledby="next-steps-heading"
      className="border-b border-gray-200 px-5 py-5 dark:border-gray-700 lg:px-7"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="next-steps-heading" className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Next steps
        </h2>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {nextStepCountText(nextSteps.length)}
        </span>
      </div>

      {isError && (
        <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          Failed to load Next steps. Please try again.
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading Next steps...</p>
      ) : nextSteps.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No open next steps.
        </p>
      ) : (
        <div className="space-y-2">
          {nextSteps.map((step) => (
            <div
              key={step.id}
              data-testid="next-step-row"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropStep(step.id)}
              className="flex items-start gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <button
                type="button"
                draggable={!isClosed && !isMutating}
                onDragStart={(event) => {
                  setDraggedId(step.id);
                  event.dataTransfer?.setData('text/plain', step.id);
                  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => setDraggedId(null)}
                disabled={isClosed || isMutating || nextSteps.length < 2}
                aria-label={`Drag to reorder ${step.text}`}
                className="rounded px-1.5 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              >
                ⋮⋮
              </button>

              {editingId === step.id ? (
                <form onSubmit={saveEdit} className="flex min-w-0 flex-1 gap-2">
                  <input
                    value={editingText}
                    onChange={(event) => setEditingText(event.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    maxLength={500}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!editingText.trim() || updateNextStep.isPending}
                    className="rounded-md bg-primary-600 px-3 py-1 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    Save next step
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => beginEdit(step)}
                    disabled={isMutating || isClosed}
                    aria-label={`Edit next step ${step.text}`}
                    className="min-w-0 flex-1 whitespace-pre-wrap break-words rounded px-1 py-1 text-left text-gray-700 hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {step.text}
                  </button>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => solveNextStep.mutate(step.id)}
                      disabled={isMutating || isClosed}
                      aria-label={`Solve ${step.text}`}
                      className="rounded-md border border-green-300 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/40"
                    >
                      Solve
                    </button>
                    <button
                      type="button"
                      onClick={() => abandonNextStep.mutate(step.id)}
                      disabled={isMutating || isClosed}
                      aria-label={`Abandon ${step.text}`}
                      className="rounded-md border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40"
                    >
                      Abandon
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {!isClosed && (
        <form onSubmit={handleAdd} className="mt-3 flex gap-2">
          <label htmlFor="new-next-step" className="sr-only">
            New next step
          </label>
          <input
            id="new-next-step"
            value={newText}
            onChange={(event) => setNewText(event.target.value)}
            placeholder="Add a next step"
            className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newText.trim() || createNextStep.isPending}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Add next step
          </button>
        </form>
      )}
    </section>
  );
}

export default function WorkstreamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [showNewStatusDialog, setShowNewStatusDialog] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusUpdate | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateSubstreamDialog, setShowCreateSubstreamDialog] = useState(false);
  const [showParentDialog, setShowParentDialog] = useState(false);
  const includeSubstreams =
    searchParams.get('includeSubstreams') === '1' ||
    searchParams.get('includeSubstreams') === 'true';
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [reopenConfirm, setReopenConfirm] = useState(false);

  const { data: workstream, isLoading: workstreamLoading } = useQuery<Workstream>({
    queryKey: ['workstream', id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/workstreams/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
  useDocumentTitle(
    workstream?.number !== undefined
      ? `#${workstream.number} ${shortenDocumentTitleText(workstream.name)}`
      : 'Workstream',
  );
  useResourceChangeScreen({ screen: 'stream-detail', workstreamId: workstream?.id ?? null });

  const {
    data: statusUpdates,
    isLoading: historyLoading,
    hasNextPage = false,
    isFetchingNextPage = false,
    fetchNextPage,
  } = useStatusHistory(id!, { includeSubstreams, pageSize: STATUS_HISTORY_PAGE_SIZE });
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (
      !sentinel ||
      !hasNextPage ||
      isFetchingNextPage ||
      !fetchNextPage ||
      typeof IntersectionObserver === 'undefined'
    )
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '240px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, statusUpdates?.length, workstream?.id]);

  const setIncludeSubstreams = (nextInclude: boolean) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextInclude) nextParams.set('includeSubstreams', '1');
    else nextParams.delete('includeSubstreams');
    setSearchParams(nextParams, { replace: true });
  };

  const deleteMutation = useMutation({
    mutationFn: async (statusUpdateId: string) => {
      await apiClient.delete(`/api/status-updates/${statusUpdateId}`, {
        data: { workstreamId: id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-updates', id] });
      queryClient.invalidateQueries({ queryKey: ['workstream', id] });
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      setDeleteConfirm(null);
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.put(`/api/workstreams/${id}/close`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['workstream', id] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      setCloseConfirm(false);
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.put(`/api/workstreams/${id}/reopen`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['workstream', id] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      setReopenConfirm(false);
    },
  });

  const isLoading = workstreamLoading || historyLoading;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="mb-6 h-8 w-64 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-96 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  if (!workstream) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-800 dark:text-red-200">Workstream not found.</p>
          <Link
            to="/"
            className="mt-2 inline-block text-sm text-red-700 underline dark:text-red-300"
          >
            Go back to Cockpit
          </Link>
        </div>
      </div>
    );
  }

  const categoryColor = workstream.category?.color || DEFAULT_CATEGORY_COLOR;
  const categorySoft = getCategoryIconBandBackground(categoryColor, DEFAULT_CATEGORY_COLOR);
  const breadcrumbs = getBreadcrumbItems(workstream);
  const directSubstreams = workstream.substreams || [];
  const latestSelfUpdateAt =
    workstream.lastDirectUpdateAt ||
    workstream.latestStatus?.updatedAt ||
    statusUpdates?.find((update) => update.workstreamId === workstream.id)?.updatedAt;
  const latestSubstreamUpdateAt =
    workstream.lastSubstreamActivityAt ||
    workstream.latestSubstreamActivitySource?.lastActivityAt ||
    workstream.latestSubstreamActivitySource?.updatedAt;
  const origin = isSafeNavigationOrigin((location.state as { from?: unknown } | null)?.from)
    ? (location.state as { from: NavigationOrigin }).from
    : null;
  const backButtonLabel = origin?.label ? `← Back to ${origin.label}` : '← Back to Cockpit';
  const detailNavigationState = {
    from: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      label: workstreamReferenceText(workstream),
    },
  };
  const handleBack = () => {
    if (origin) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={handleBack}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          {backButtonLabel}
        </button>

        <article
          data-testid="workstream-detail-shell"
          className="grid overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:grid-cols-[8px_68px_minmax(0,1fr)]"
        >
          <div
            data-testid="workstream-category-rail"
            className="hidden sm:block"
            style={{ backgroundColor: categoryColor }}
          />
          <div
            data-testid="workstream-category-icon-band"
            className="hidden justify-center border-r border-gray-100 pt-7 dark:border-gray-700 sm:flex"
            style={{ backgroundColor: categorySoft }}
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl shadow-inner ring-1 ring-black/10"
              style={{ backgroundColor: categorySoft }}
              title={workstream.category?.name || 'Uncategorized'}
            >
              {workstream.category?.emoji || DEFAULT_CATEGORY_EMOJI}
            </div>
          </div>

          <div className="min-w-0">
            <header className="grid gap-7 border-b border-gray-200 px-5 py-7 dark:border-gray-700 lg:grid-cols-[minmax(0,1fr)_190px] lg:px-7">
              <div className="min-w-0">
                <nav
                  aria-label="Workstream parent-stream breadcrumbs"
                  className="mb-2 flex flex-wrap items-center gap-1 text-sm font-semibold text-gray-500 dark:text-gray-400"
                >
                  {breadcrumbs.map((crumb, index) => {
                    const isCurrent = crumb.id === workstream.id;
                    return (
                      <span key={`${crumb.id}-${index}`} className="inline-flex items-center gap-2">
                        {index > 0 && <span className="text-gray-400 dark:text-gray-500">›</span>}
                        {isCurrent ? (
                          <span aria-current="page" className="text-gray-700 dark:text-gray-200">
                            {crumb.number !== undefined ? (
                              <WorkstreamNumber workstream={crumb} />
                            ) : (
                              getWorkstreamName(crumb)
                            )}
                          </span>
                        ) : (
                          <WorkstreamLink workstream={crumb} state={detailNavigationState} />
                        )}
                      </span>
                    );
                  })}
                </nav>

                <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
                  {workstream.name}
                </h1>
                {workstream.context && (
                  <div className="mt-4 max-w-3xl text-base leading-7 text-gray-600 dark:text-gray-300">
                    <MarkdownRenderer content={workstream.context} />
                  </div>
                )}
              </div>

              <div
                data-testid="workstream-detail-actions"
                className="grid content-start gap-2 lg:w-[190px]"
              >
                {workstream.state !== 'closed' && (
                  <button
                    onClick={() => setShowNewStatusDialog(true)}
                    className="h-10 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
                  >
                    Add Update
                  </button>
                )}
                <button
                  onClick={() => setShowCreateSubstreamDialog(true)}
                  className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Create sub-stream
                </button>
                <button
                  onClick={() => setShowEditDialog(true)}
                  className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowParentDialog(true)}
                  className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {workstream.parentId ? 'Change parent' : 'Set parent'}
                </button>
                {workstream.state !== 'closed' ? (
                  closeConfirm ? (
                    <>
                      <button
                        onClick={() => setCloseConfirm(false)}
                        className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        disabled={closeMutation.isPending}
                      >
                        Cancel close
                      </button>
                      <button
                        onClick={() => closeMutation.mutate()}
                        className="h-10 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        disabled={closeMutation.isPending}
                      >
                        {closeMutation.isPending ? 'Closing...' : 'Confirm close'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setCloseConfirm(true)}
                      className="h-10 rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-900/40"
                    >
                      Close stream
                    </button>
                  )
                ) : reopenConfirm ? (
                  <>
                    <button
                      onClick={() => setReopenConfirm(false)}
                      className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      disabled={reopenMutation.isPending}
                    >
                      Cancel reopen
                    </button>
                    <button
                      onClick={() => reopenMutation.mutate()}
                      className="h-10 rounded-md bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      disabled={reopenMutation.isPending}
                    >
                      {reopenMutation.isPending ? 'Reopening...' : 'Confirm reopen'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setReopenConfirm(true)}
                    className="h-10 rounded-md border border-green-300 bg-white px-4 text-sm font-semibold text-green-700 hover:bg-green-50 dark:border-green-700 dark:bg-gray-800 dark:text-green-300 dark:hover:bg-green-900/40"
                  >
                    Reopen stream
                  </button>
                )}
              </div>
            </header>

            {(closeMutation.isError || reopenMutation.isError) && (
              <div className="mx-5 mt-5 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200 lg:mx-7">
                {closeMutation.isError
                  ? hierarchyErrorMessage(closeMutation.error)
                  : hierarchyErrorMessage(reopenMutation.error)}
              </div>
            )}

            <NextStepsSection
              workstreamId={workstream.id}
              workstreamReferenceId={id}
              isClosed={workstream.state === 'closed'}
            />

            <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
              <section
                className="min-w-0 border-gray-200 px-5 py-6 dark:border-gray-700 lg:border-r lg:px-7"
                aria-labelledby="status-history-heading"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2
                    id="status-history-heading"
                    className="text-2xl font-bold text-gray-900 dark:text-gray-100"
                  >
                    Status History
                  </h2>
                  <label className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={includeSubstreams}
                      onChange={(event) => setIncludeSubstreams(event.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Include sub-stream updates
                  </label>
                </div>

                {statusUpdates && statusUpdates.length === 0 && (
                  <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No status updates yet. Add the first one!
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {statusUpdates?.map((update) => {
                    const updateSource = getStatusUpdateSource(update);
                    const updateSourceId = getLatestSubstreamActivitySourceId(updateSource);
                    const isSubstreamUpdate = Boolean(
                      updateSourceId && updateSourceId !== workstream.id,
                    );
                    return (
                      <article
                        key={update.id}
                        data-testid={`status-update-${update.id}`}
                        data-source={isSubstreamUpdate ? 'sub-stream' : 'self'}
                        className={`rounded-lg border p-5 shadow-sm ${
                          isSubstreamUpdate
                            ? 'border-blue-200 bg-blue-50/70 shadow-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:shadow-none'
                            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                        }`}
                      >
                        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                          <div className="grid gap-2">
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                              <time
                                dateTime={update.createdAt}
                                title={formatDateTime(update.createdAt)}
                              >
                                {formatRelativeTime(update.createdAt)}
                              </time>
                              {update.createdAt !== update.updatedAt && (
                                <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                                  (edited)
                                </span>
                              )}
                              <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                                • {statusUpdateReference(update, updateSource, isSubstreamUpdate)}
                                <UpdateImpactChip impact={update.impact} />
                              </span>
                            </div>
                            {isSubstreamUpdate && updateSource && updateSourceId && (
                              <WorkstreamLink
                                workstream={updateSource}
                                state={detailNavigationState}
                                className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 hover:text-blue-800 dark:bg-blue-900 dark:text-blue-200 dark:hover:text-blue-100"
                              />
                            )}
                          </div>

                          <div className="flex gap-2">
                            {isSubstreamUpdate && updateSource && updateSourceId ? (
                              <Link
                                to={workstreamPath(updateSource)}
                                state={detailNavigationState}
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                Open sub-stream
                              </Link>
                            ) : (
                              <>
                                <button
                                  onClick={() => setEditingStatus(update)}
                                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  Edit
                                </button>
                                {deleteConfirm === update.id ? (
                                  <>
                                    <button
                                      onClick={() => setDeleteConfirm(null)}
                                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                      disabled={deleteMutation.isPending}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => deleteMutation.mutate(update.id)}
                                      className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                      disabled={deleteMutation.isPending}
                                    >
                                      {deleteMutation.isPending ? 'Deleting...' : 'Confirm'}
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => setDeleteConfirm(update.id)}
                                    className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-900/40"
                                  >
                                    Delete
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <MarkdownRenderer
                          content={update.status}
                          className="text-sm leading-6 text-gray-700 dark:text-gray-300"
                        />
                        {update.note && (
                          <div className="mt-4 border-t border-gray-900/80 pt-4 dark:border-gray-200/40">
                            <MarkdownRenderer
                              content={update.note}
                              className="text-sm leading-6 text-gray-600 dark:text-gray-400"
                            />
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                {statusUpdates && statusUpdates.length > 0 && (
                  <div
                    ref={loadMoreSentinelRef}
                    data-testid="status-history-load-more-sentinel"
                    className="py-5 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {isFetchingNextPage
                      ? 'Loading more status updates...'
                      : hasNextPage
                        ? 'Scroll for more status updates'
                        : 'All status updates loaded.'}
                  </div>
                )}
              </section>

              <aside
                data-testid="workstream-detail-sidebar"
                className="bg-gray-50 px-5 py-6 dark:bg-gray-900/40 lg:px-6"
              >
                <section className="border-b border-gray-200 pb-6 dark:border-gray-700">
                  <h3 className="mb-3 flex items-center justify-between text-lg font-bold text-gray-900 dark:text-gray-100">
                    Sub-streams{' '}
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {getDirectSubstreamCount(workstream)}
                    </span>
                  </h3>
                  <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
                    Direct sub-streams of this stream. No sibling or neighbor parent-stream path
                    shown here.
                  </p>
                  <div className="mt-4 grid gap-3">
                    {directSubstreams.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No direct sub-streams yet.
                      </p>
                    )}
                    {directSubstreams.map((substream) => {
                      const substreamActivity =
                        getLatestSubstreamActivityAt(substream) || substream.lastActivityAt;
                      return (
                        <Link
                          key={substream.id}
                          to={workstreamPath(substream)}
                          state={detailNavigationState}
                          className="rounded-lg border border-gray-200 bg-white p-3 hover:border-primary-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-700"
                        >
                          <div className="flex justify-between gap-3 text-sm font-bold text-gray-900 dark:text-gray-100">
                            <span className="text-primary-700 dark:text-primary-300">
                              <WorkstreamReferenceContent workstream={substream} />
                            </span>
                            <span className="h-fit rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                              {substream.state || 'active'}
                            </span>
                          </div>
                          <div className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                            Latest update: <RelativeTime value={substreamActivity} />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>

                <section className="pt-6">
                  <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">
                    Metadata
                  </h3>
                  <dl className="grid gap-4">
                    <div>
                      <dt className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                        Category
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {workstream.category?.name || 'Uncategorized'}
                      </dd>
                    </div>
                    {workstream.parent && (
                      <div>
                        <dt className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                          Parent stream
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                          <WorkstreamLink
                            workstream={workstream.parent}
                            state={detailNavigationState}
                            className="text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200"
                          />
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                        Created
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                        <RelativeTime value={workstream.createdAt} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                        Latest self update
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                        <RelativeTime value={latestSelfUpdateAt} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                        Latest sub-stream update
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {latestSubstreamUpdateAt ? (
                          <>
                            <RelativeTime value={latestSubstreamUpdateAt} />
                            {workstream.latestSubstreamActivitySource && (
                              <>
                                {' '}
                                •{' '}
                                <WorkstreamLink
                                  workstream={workstream.latestSubstreamActivitySource}
                                  state={detailNavigationState}
                                  className="text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200"
                                />
                              </>
                            )}
                          </>
                        ) : (
                          'No sub-stream updates yet'
                        )}
                      </dd>
                    </div>
                  </dl>
                </section>
              </aside>
            </div>
          </div>
        </article>
      </main>

      <StatusUpdateDialog
        workstreamId={workstream.id}
        workstreamReferenceId={id}
        workstreamName={workstream.name}
        workstreamNumber={workstream.number}
        isOpen={showNewStatusDialog}
        onClose={() => setShowNewStatusDialog(false)}
      />

      {editingStatus && (
        <StatusEditDialog
          statusUpdate={editingStatus}
          workstreamId={workstream.id}
          workstreamReferenceId={id}
          isOpen={!!editingStatus}
          onClose={() => setEditingStatus(null)}
        />
      )}

      {showEditDialog && (
        <WorkstreamEditDialog
          workstream={workstream}
          isOpen={showEditDialog}
          onUpdated={(updatedWorkstream) => {
            queryClient.setQueryData(['workstream', id], updatedWorkstream);
          }}
          onClose={() => setShowEditDialog(false)}
        />
      )}

      {showCreateSubstreamDialog && (
        <WorkstreamCreateDialog
          isOpen={showCreateSubstreamDialog}
          onClose={() => setShowCreateSubstreamDialog(false)}
          parent={workstream}
          parentReferenceId={id}
        />
      )}

      {showParentDialog && (
        <ParentSelectorDialog
          workstream={workstream}
          isOpen={showParentDialog}
          onClose={() => setShowParentDialog(false)}
        />
      )}
    </>
  );
}
