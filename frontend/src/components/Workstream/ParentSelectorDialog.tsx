import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useWorkstreams } from '../../hooks/useWorkstreams';
import type { Workstream } from '../../types/workstream';
import { getBreadcrumbLabel, getWorkstreamName, hierarchyErrorMessage, isObviousSubstream } from '../../utils/hierarchy';

function normalizeSearch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function fuzzyMatch(label: string, normalizedQuery: string): boolean {
  const haystack = normalizeSearch(label);
  if (haystack.includes(normalizedQuery)) return true;

  let searchIndex = 0;
  for (const char of normalizedQuery.replace(/\s+/g, '')) {
    searchIndex = haystack.indexOf(char, searchIndex);
    if (searchIndex === -1) return false;
    searchIndex += 1;
  }
  return true;
}

interface ParentSelectorDialogProps {
  workstream: Workstream;
  isOpen: boolean;
  onClose: () => void;
}

export function ParentSelectorDialog({ workstream, isOpen, onClose }: ParentSelectorDialogProps) {
  const [parentId, setParentId] = useState<string>('');
  const [parentSearch, setParentSearch] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const queryClient = useQueryClient();
  const { data: workstreams = [] } = useWorkstreams({ state: 'active' });

  useEffect(() => {
    if (isOpen) {
      setParentId(workstream.parentId || '');
      setParentSearch('');
      setIsConfirming(false);
    }
  }, [isOpen, workstream.parentId]);

  const candidates = workstreams.filter((candidate) => {
    if (isObviousSubstream(candidate, workstream)) return false;
    if (candidate.state === 'closed') return false;
    if ((candidate.depth || 1) >= 5) return false;
    if ((workstream.parentStreams || []).some((parentStream) => parentStream.id === candidate.id)) return false;
    return true;
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.put(`/api/workstreams/${workstream.id}`, { parentId: parentId || null });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['workstream', workstream.id] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      onClose();
    },
  });

  const selectedParent = candidates.find((candidate) => candidate.id === parentId) || null;
  const filteredCandidates = useMemo(() => {
    const query = normalizeSearch(parentSearch);
    if (!query) return candidates;

    return candidates.filter((candidate) => fuzzyMatch(getBreadcrumbLabel(candidate), query));
  }, [candidates, parentSearch]);
  const currentParentName = getWorkstreamName(workstream.parent || null);
  const nextParentName = parentId ? getWorkstreamName(selectedParent) : 'Top level / no parent';
  const hasChange = parentId !== (workstream.parentId || '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{workstream.parentId ? 'Change parent' : 'Set parent'}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose one active parent stream, or detach this stream to top level.</p>

        <label htmlFor="parentSearch" className="mt-4 mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Search parent streams
        </label>
        <input
          id="parentSearch"
          type="text"
          value={parentSearch}
          onChange={(event) => setParentSearch(event.target.value)}
          placeholder="Type to fuzzy search streams..."
          className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
        />
        <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white p-1 dark-scrollbar dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => {
              setParentId('');
              setIsConfirming(false);
            }}
            className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
              !parentId ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-950 dark:text-primary-200' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <span>Top level / no parent</span>
            {!parentId && <span aria-hidden="true">✓</span>}
          </button>
          {filteredCandidates.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No matching parent streams</div>
          ) : (
            filteredCandidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => {
                  setParentId(candidate.id);
                  setIsConfirming(false);
                }}
                className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  candidate.id === parentId ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-950 dark:text-primary-200' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>{getBreadcrumbLabel(candidate)}</span>
                {candidate.id === parentId && <span aria-hidden="true">✓</span>}
              </button>
            ))
          )}
        </div>

        {hasChange && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            <div className="font-medium">Preview parent stream change</div>
            <div className="mt-1">Current parent: {workstream.parentId ? currentParentName : 'Top level / no parent'}</div>
            <div>New parent: {nextParentName}</div>
            {!parentId && <div className="mt-1">This will detach the stream and make it top-level.</div>}
          </div>
        )}

        {mutation.isError && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {hierarchyErrorMessage(mutation.error)}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700" disabled={mutation.isPending}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isConfirming) {
                setIsConfirming(true);
                return;
              }
              mutation.mutate();
            }}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            disabled={mutation.isPending || !hasChange}
          >
            {mutation.isPending ? 'Saving...' : isConfirming ? (parentId ? 'Confirm parent change' : 'Confirm detach') : (parentId ? 'Review parent change' : 'Review detach')}
          </button>
        </div>
      </div>
    </div>
  );
}
