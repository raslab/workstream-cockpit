import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useWorkstreams } from '../hooks/useWorkstreams';
import { WorkstreamSkeleton } from '../components/Workstream/WorkstreamSkeleton';
import { apiClient } from '../api/client';
import { format, parseISO } from 'date-fns';
import {
  WorkstreamLink,
  workstreamReferenceText,
} from '../components/Workstream/WorkstreamReference';
import { useResourceChangeScreen } from '../components/Notifications/ResourceChangeNotificationProvider';
import { MarkdownRenderer } from '../components/Markdown/MarkdownRenderer';
import { LocalizedTimestamp } from '../components/UI/LocalizedTimestamp';
import type { Workstream } from '../types/workstream';

function ClosureTimestamp({ closedAt }: { closedAt: string | null | undefined }) {
  if (!closedAt) return null;

  const closureDate = parseISO(closedAt);
  if (Number.isNaN(closureDate.getTime())) return null;

  return (
    <p className="mt-2 w-fit text-xs text-gray-500 dark:text-gray-400">
      <LocalizedTimestamp
        value={closedAt}
        accessibleLabel={`Closed on ${format(closureDate, 'MMM d, yyyy')} (exact timestamp: ${closureDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })})`}
      >
        Closed on {format(closureDate, 'MMM d, yyyy')}
      </LocalizedTimestamp>
    </p>
  );
}

export default function Archive() {
  useResourceChangeScreen({ screen: 'archive' });
  const { data: workstreams, isLoading, error } = useWorkstreams({ state: 'closed' });
  const queryClient = useQueryClient();
  const [workstreamToReopen, setWorkstreamToReopen] = useState<Workstream | null>(null);
  const archiveHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const reopenTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const isSubmittingRef = useRef(false);

  const reopenMutation = useMutation({
    retry: false,
    mutationFn: async (workstreamId: string) => {
      const response = await apiClient.put(`/api/workstreams/${workstreamId}/reopen`);
      return response.data;
    },
    onSuccess: (_reopenedWorkstream, workstreamId) => {
      archiveHeadingRef.current?.focus();
      queryClient.setQueryData<Workstream[]>(
        ['workstreams', { state: 'closed' }],
        (closedWorkstreams) =>
          closedWorkstreams?.filter((workstream) => workstream.id !== workstreamId),
      );
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      setWorkstreamToReopen(null);
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  useEffect(() => {
    if (!workstreamToReopen) return;

    if (reopenMutation.isPending) {
      dialogRef.current?.focus();
    } else if (reopenMutation.isError) {
      confirmButtonRef.current?.focus();
    }
  }, [reopenMutation.isError, reopenMutation.isPending, workstreamToReopen]);

  const openReopenConfirmation = (workstream: Workstream, trigger: HTMLButtonElement) => {
    reopenMutation.reset();
    isSubmittingRef.current = false;
    reopenTriggerRef.current = trigger;
    setWorkstreamToReopen(workstream);
  };

  const closeReopenConfirmation = () => {
    if (reopenMutation.isPending) return;
    reopenTriggerRef.current?.focus();
    setWorkstreamToReopen(null);
  };

  const confirmReopen = () => {
    if (!workstreamToReopen || reopenMutation.isPending || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    reopenMutation.mutate(workstreamToReopen.id);
  };

  const handleConfirmationKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !reopenMutation.isPending) {
      event.preventDefault();
      closeReopenConfirmation();
      return;
    }

    if (event.key !== 'Tab') return;
    if (reopenMutation.isPending) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    if (event.shiftKey && document.activeElement === cancelButtonRef.current) {
      event.preventDefault();
      confirmButtonRef.current?.focus();
    } else if (!event.shiftKey && document.activeElement === confirmButtonRef.current) {
      event.preventDefault();
      cancelButtonRef.current?.focus();
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2
          ref={archiveHeadingRef}
          tabIndex={-1}
          className="text-2xl font-bold text-gray-900 dark:text-gray-100"
        >
          Closed Workstreams
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View and manage your archived workstreams
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load archived workstreams. Please try again.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {isLoading && (
          <>
            <WorkstreamSkeleton />
            <WorkstreamSkeleton />
            <WorkstreamSkeleton />
          </>
        )}

        {!isLoading && workstreams && workstreams.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">No archived workstreams.</p>
          </div>
        )}

        {!isLoading &&
          workstreams &&
          workstreams.map((workstream) => (
            <div
              key={workstream.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {workstream.category && (
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-md text-sm"
                        style={{ backgroundColor: workstream.category.color }}
                        title={workstream.category.name}
                      >
                        {workstream.category.emoji}
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      <WorkstreamLink workstream={workstream} />
                    </h3>
                  </div>

                  {workstream.latestStatus && (
                    <div className="mt-2" data-testid={`archive-latest-status-${workstream.id}`}>
                      <MarkdownRenderer
                        content={workstream.latestStatus.status}
                        className="text-sm leading-6 text-gray-700 dark:text-gray-300"
                      />
                    </div>
                  )}

                  <ClosureTimestamp closedAt={workstream.closedAt} />
                </div>

                <div className="ml-4">
                  <button
                    onClick={(event) => openReopenConfirmation(workstream, event.currentTarget)}
                    disabled={reopenMutation.isPending}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Reopen
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {workstreamToReopen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4 dark:bg-opacity-70">
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reopen-dialog-title"
            aria-describedby="reopen-dialog-description"
            onKeyDown={handleConfirmationKeyDown}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
          >
            <h2
              id="reopen-dialog-title"
              className="text-xl font-semibold text-gray-900 dark:text-gray-100"
            >
              {`Reopen ${workstreamReferenceText(workstreamToReopen)}?`}
            </h2>
            <p
              id="reopen-dialog-description"
              className="mt-2 text-sm text-gray-600 dark:text-gray-300"
            >
              {`This will return ${workstreamReferenceText(workstreamToReopen)} to your active workstreams and remove it from the Archive view.`}
            </p>

            {reopenMutation.isError && (
              <div
                role="alert"
                className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
              >
                Failed to reopen {workstreamReferenceText(workstreamToReopen)}. Please try again.
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={closeReopenConfirmation}
                disabled={reopenMutation.isPending}
                autoFocus
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={confirmReopen}
                disabled={reopenMutation.isPending}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {reopenMutation.isPending ? 'Reopening...' : 'Confirm reopen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
