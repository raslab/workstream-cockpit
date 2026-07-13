import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NextStep, StatusUpdate, Workstream } from '../../types/workstream';

const apiGetMock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());
const apiPutMock = vi.hoisted(() => vi.fn());
const useStatusHistoryMock = vi.hoisted(() => vi.fn());

vi.mock('../../api/client', () => ({
  apiClient: {
    get: apiGetMock,
    post: apiPostMock,
    put: apiPutMock,
    delete: vi.fn(),
  },
}));

vi.mock('../../hooks/useStatusHistory', () => ({
  useStatusHistory: useStatusHistoryMock,
}));

vi.mock('../../components/Markdown/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content, className }: { content: string; className?: string }) => (
    <div className={className}>{content}</div>
  ),
}));

import WorkstreamDetail from '../WorkstreamDetail';

const workstream: Workstream = {
  id: 'stream-1',
  projectId: 'project-1',
  name: 'Launch readiness',
  categoryId: null,
  context: null,
  state: 'active',
  createdAt: '2026-06-01T00:00:00Z',
  closedAt: null,
  latestStatus: undefined,
  allTags: [],
};

const updates: StatusUpdate[] = [];

let nextSteps: NextStep[];

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/workstreams/${workstream.id}`]}>
        <Routes>
          <Route path="/workstreams/:id" element={<WorkstreamDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

function mockGet(url: string) {
  if (url === '/api/workstreams/stream-1') return Promise.resolve({ data: workstream });
  if (url === '/api/workstreams/stream-1/next-steps') return Promise.resolve({ data: nextSteps });
  return Promise.reject(new Error(`unexpected GET ${url}`));
}

function storedDraft(value: Record<string, string>, savedAt = Date.now()) {
  return JSON.stringify({ version: 1, savedAt, value });
}

describe('WorkstreamDetail next steps', () => {
  beforeEach(() => {
    localStorage.clear();
    nextSteps = [
      {
        id: 'step-1',
        workstreamId: 'stream-1',
        text: 'Draft launch checklist',
        state: 'open',
        sortOrder: 0,
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
      {
        id: 'step-2',
        workstreamId: 'stream-1',
        text: 'Confirm support owner',
        state: 'open',
        sortOrder: 1,
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
    ];
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    apiPutMock.mockReset();
    apiGetMock.mockImplementation(mockGet);
    apiPostMock.mockImplementation((url: string, body: { text: string }) => {
      if (url !== '/api/workstreams/stream-1/next-steps')
        return Promise.reject(new Error(`unexpected POST ${url}`));
      const created = {
        id: 'step-3',
        workstreamId: 'stream-1',
        text: body.text,
        state: 'open' as const,
        sortOrder: nextSteps.length,
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };
      nextSteps = [...nextSteps, created];
      return Promise.resolve({ data: created });
    });
    apiPutMock.mockImplementation((url: string, body?: unknown) => {
      if (url === '/api/workstreams/stream-1/next-steps/step-1') {
        nextSteps = nextSteps.map((step) =>
          step.id === 'step-1' ? { ...step, text: (body as { text: string }).text } : step,
        );
        return Promise.resolve({ data: nextSteps[0] });
      }
      if (url === '/api/workstreams/stream-1/next-steps/reorder') {
        const ids = (body as { nextStepIds: string[] }).nextStepIds;
        nextSteps = ids.map((stepId, index) => ({
          ...nextSteps.find((step) => step.id === stepId)!,
          sortOrder: index,
        }));
        return Promise.resolve({ data: nextSteps });
      }
      if (url === '/api/workstreams/stream-1/next-steps/step-1/solve') {
        nextSteps = nextSteps.filter((step) => step.id !== 'step-1');
        return Promise.resolve({ data: { id: 'step-1', state: 'solved' } });
      }
      if (url === '/api/workstreams/stream-1/next-steps/step-2/abandon') {
        nextSteps = nextSteps.filter((step) => step.id !== 'step-2');
        return Promise.resolve({ data: { id: 'step-2', state: 'abandoned' } });
      }
      return Promise.reject(new Error(`unexpected PUT ${url}`));
    });
    useStatusHistoryMock.mockReset();
    useStatusHistoryMock.mockReturnValue({ data: updates, isLoading: false });
  });

  it('adds, edits, reorders, solves, and abandons lightweight stream-local Next steps without todo terminology', async () => {
    renderDetail();

    const section = await screen.findByRole('region', { name: 'Next steps' });
    expect(await within(section).findByText('2 open next steps')).toBeInTheDocument();
    expect(within(section).getByRole('heading', { name: 'Next steps' })).toBeInTheDocument();
    expect(section).toHaveTextContent('Draft launch checklist');
    expect(section).toHaveTextContent('Confirm support owner');
    expect(section.textContent?.toLowerCase()).not.toContain('todo');

    fireEvent.change(within(section).getByLabelText('New next step'), {
      target: { value: 'Publish release notes' },
    });
    fireEvent.click(within(section).getByRole('button', { name: 'Add next step' }));
    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith('/api/workstreams/stream-1/next-steps', {
        text: 'Publish release notes',
      }),
    );
    expect(await within(section).findByText('Publish release notes')).toBeInTheDocument();
    expect(within(section).getByText('3 open next steps')).toBeInTheDocument();

    expect(
      within(section).queryByRole('button', { name: /Edit Draft launch checklist/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(section).getByRole('button', { name: 'Edit next step Draft launch checklist' }),
    );
    const editInput = within(section).getByDisplayValue('Draft launch checklist');
    fireEvent.change(editInput, { target: { value: 'Draft final launch checklist' } });
    fireEvent.click(within(section).getByRole('button', { name: 'Save next step' }));
    await waitFor(() =>
      expect(apiPutMock).toHaveBeenCalledWith('/api/workstreams/stream-1/next-steps/step-1', {
        text: 'Draft final launch checklist',
      }),
    );
    expect(await within(section).findByText('Draft final launch checklist')).toBeInTheDocument();

    const dragHandle = within(section).getByRole('button', {
      name: 'Drag to reorder Draft final launch checklist',
    });
    const targetRow = within(section)
      .getByText('Confirm support owner')
      .closest('[data-testid="next-step-row"]')!;
    fireEvent.dragStart(dragHandle);
    fireEvent.dragOver(targetRow);
    fireEvent.drop(targetRow);
    fireEvent.dragEnd(dragHandle);
    await waitFor(() =>
      expect(apiPutMock).toHaveBeenCalledWith('/api/workstreams/stream-1/next-steps/reorder', {
        nextStepIds: ['step-2', 'step-1', 'step-3'],
      }),
    );
    const rowsAfterReorder = within(section).getAllByTestId('next-step-row');
    expect(rowsAfterReorder[0]).toHaveTextContent('Confirm support owner');
    expect(rowsAfterReorder[1]).toHaveTextContent('Draft final launch checklist');

    fireEvent.click(
      within(section).getByRole('button', { name: 'Solve Draft final launch checklist' }),
    );
    expect(apiPutMock).not.toHaveBeenCalledWith(
      '/api/workstreams/stream-1/next-steps/step-1/solve',
    );
    fireEvent.click(
      within(section).getByRole('button', {
        name: 'Confirm solve Draft final launch checklist',
      }),
    );
    await waitFor(() =>
      expect(apiPutMock).toHaveBeenCalledWith('/api/workstreams/stream-1/next-steps/step-1/solve'),
    );
    expect(within(section).queryByText('Draft final launch checklist')).not.toBeInTheDocument();

    fireEvent.click(within(section).getByRole('button', { name: 'Abandon Confirm support owner' }));
    expect(apiPutMock).not.toHaveBeenCalledWith(
      '/api/workstreams/stream-1/next-steps/step-2/abandon',
    );
    fireEvent.click(
      within(section).getByRole('button', { name: 'Confirm abandon Confirm support owner' }),
    );
    await waitFor(() =>
      expect(apiPutMock).toHaveBeenCalledWith(
        '/api/workstreams/stream-1/next-steps/step-2/abandon',
      ),
    );
    expect(within(section).queryByText('Confirm support owner')).not.toBeInTheDocument();
    expect(within(section).getByText('1 open next step')).toBeInTheDocument();
  }, 30000);

  it('cancels an action-specific inline confirmation without mutating and restores row controls', async () => {
    renderDetail();
    const section = await screen.findByRole('region', { name: 'Next steps' });

    fireEvent.click(
      await within(section).findByRole('button', { name: 'Abandon Draft launch checklist' }),
    );

    expect(
      within(section).getByRole('button', { name: 'Confirm abandon Draft launch checklist' }),
    ).toBeInTheDocument();
    expect(
      within(section).queryByRole('button', { name: 'Confirm solve Draft launch checklist' }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(section).getByRole('button', { name: 'Cancel abandon Draft launch checklist' }),
    );

    expect(apiPutMock).not.toHaveBeenCalledWith(
      '/api/workstreams/stream-1/next-steps/step-1/abandon',
    );
    expect(
      within(section).getByRole('button', { name: 'Solve Draft launch checklist' }),
    ).toBeInTheDocument();
    expect(
      await within(section).findByRole('button', { name: 'Abandon Draft launch checklist' }),
    ).toBeInTheDocument();
  });

  it('clears confirmation if a refetch removes the selected next step', async () => {
    const { queryClient } = renderDetail();
    const section = await screen.findByRole('region', { name: 'Next steps' });

    fireEvent.click(
      await within(section).findByRole('button', { name: 'Solve Draft launch checklist' }),
    );
    expect(
      within(section).getByRole('button', { name: 'Confirm solve Draft launch checklist' }),
    ).toBeInTheDocument();

    nextSteps = nextSteps.filter((step) => step.id !== 'step-1');
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['next-steps', 'stream-1'] });
    });

    await waitFor(() => expect(section).not.toHaveTextContent('Draft launch checklist'));
    expect(
      within(section).getByRole('button', { name: 'Edit next step Confirm support owner' }),
    ).toBeEnabled();
    fireEvent.change(within(section).getByLabelText('New next step'), {
      target: { value: 'Follow up after external change' },
    });
    expect(within(section).getByRole('button', { name: 'Add next step' })).toBeEnabled();
  });

  it('submits a confirmed solve exactly once during rapid clicks and disables confirmation in flight', async () => {
    let resolveSolve!: (value: { data: { id: string; state: string } }) => void;
    const solveRequest = new Promise<{ data: { id: string; state: string } }>((resolve) => {
      resolveSolve = resolve;
    });
    apiPutMock.mockImplementation((url: string) => {
      if (url === '/api/workstreams/stream-1/next-steps/step-1/solve') return solveRequest;
      return Promise.reject(new Error(`unexpected PUT ${url}`));
    });
    renderDetail();
    const section = await screen.findByRole('region', { name: 'Next steps' });

    fireEvent.click(
      await within(section).findByRole('button', { name: 'Solve Draft launch checklist' }),
    );
    const confirm = within(section).getByRole('button', {
      name: 'Confirm solve Draft launch checklist',
    });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(apiPutMock).toHaveBeenCalledTimes(1));
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAccessibleName('Solving Draft launch checklist');

    nextSteps = nextSteps.filter((step) => step.id !== 'step-1');
    resolveSolve({ data: { id: 'step-1', state: 'solved' } });
    await waitFor(() =>
      expect(within(section).queryByText('Draft launch checklist')).not.toBeInTheDocument(),
    );
  });

  it('does not treat a rapid double-click on the initial action as confirmation', async () => {
    const user = userEvent.setup();
    renderDetail();
    const section = await screen.findByRole('region', { name: 'Next steps' });
    const solve = await within(section).findByRole('button', {
      name: 'Solve Draft launch checklist',
    });

    await act(async () => user.dblClick(solve));

    expect(apiPutMock).not.toHaveBeenCalledWith(
      '/api/workstreams/stream-1/next-steps/step-1/solve',
    );
    expect(
      within(section).getByRole('button', { name: 'Confirm solve Draft launch checklist' }),
    ).toBeInTheDocument();
  });

  it('keeps a failed abandon confirmation usable and shows an action-specific inline error', async () => {
    let abandonAttempts = 0;
    apiPutMock.mockImplementation((url: string) => {
      if (url === '/api/workstreams/stream-1/next-steps/step-1/abandon') {
        abandonAttempts += 1;
        if (abandonAttempts === 1) return Promise.reject(new Error('network unavailable'));
        nextSteps = nextSteps.filter((step) => step.id !== 'step-1');
        return Promise.resolve({ data: { id: 'step-1', state: 'abandoned' } });
      }
      return Promise.reject(new Error(`unexpected PUT ${url}`));
    });
    renderDetail();
    const section = await screen.findByRole('region', { name: 'Next steps' });

    fireEvent.click(
      await within(section).findByRole('button', { name: 'Abandon Draft launch checklist' }),
    );
    fireEvent.click(
      within(section).getByRole('button', { name: 'Confirm abandon Draft launch checklist' }),
    );

    expect(await within(section).findByRole('alert')).toHaveTextContent(
      'Failed to abandon “Draft launch checklist”. Please try again.',
    );
    expect(
      within(section).getByRole('button', { name: 'Confirm abandon Draft launch checklist' }),
    ).toBeEnabled();
    fireEvent.click(
      within(section).getByRole('button', { name: 'Confirm abandon Draft launch checklist' }),
    );
    await waitFor(() => expect(abandonAttempts).toBe(2));
    await waitFor(() => expect(section).not.toHaveTextContent('Draft launch checklist'));
  });

  it('exposes distinct keyboard-operable confirmation and cancellation labels', async () => {
    const user = userEvent.setup();
    renderDetail();
    const section = await screen.findByRole('region', { name: 'Next steps' });

    const solve = await within(section).findByRole('button', {
      name: 'Solve Draft launch checklist',
    });
    solve.focus();
    await act(async () => user.keyboard('{Enter}'));
    const confirm = within(section).getByRole('button', {
      name: 'Confirm solve Draft launch checklist',
    });
    const cancel = within(section).getByRole('button', {
      name: 'Cancel solve Draft launch checklist',
    });
    expect(confirm).toHaveTextContent('Confirm solve');
    expect(confirm).toHaveFocus();
    expect(cancel).toHaveTextContent('Cancel');

    cancel.focus();
    await act(async () => user.keyboard(' '));
    expect(apiPutMock).not.toHaveBeenCalledWith(
      '/api/workstreams/stream-1/next-steps/step-1/solve',
    );
    const restoredSolve = within(section).getByRole('button', {
      name: 'Solve Draft launch checklist',
    });
    expect(restoredSolve).toHaveFocus();
  });

  it('preserves the Add a next step draft across remounts and clears it on submit', async () => {
    const { unmount } = renderDetail();

    const section = await screen.findByRole('region', { name: 'Next steps' });
    fireEvent.change(within(section).getByLabelText('New next step'), {
      target: { value: 'Draft a follow-up task' },
    });

    expect(localStorage.getItem('cockpit:draft:next-step-create:stream-1')).toContain(
      'Draft a follow-up task',
    );

    unmount();
    renderDetail();

    const restoredSection = await screen.findByRole('region', { name: 'Next steps' });
    await waitFor(() =>
      expect(within(restoredSection).getByLabelText('New next step')).toHaveValue(
        'Draft a follow-up task',
      ),
    );

    fireEvent.click(within(restoredSection).getByRole('button', { name: 'Add next step' }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith('/api/workstreams/stream-1/next-steps', {
        text: 'Draft a follow-up task',
      }),
    );
    expect(localStorage.getItem('cockpit:draft:next-step-create:stream-1')).toBeNull();
  });

  it('auto-restores a fresh Add a next step draft from local storage', async () => {
    localStorage.setItem(
      'cockpit:draft:next-step-create:stream-1',
      storedDraft({ text: 'Stored next-step draft' }),
    );

    renderDetail();

    const section = await screen.findByRole('region', { name: 'Next steps' });
    await waitFor(() =>
      expect(within(section).getByLabelText('New next step')).toHaveValue('Stored next-step draft'),
    );
  });
});
