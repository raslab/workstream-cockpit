import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
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
  MarkdownRenderer: ({ content, className }: { content: string; className?: string }) => <div className={className}>{content}</div>,
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

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/workstreams/${workstream.id}`]}>
        <Routes>
          <Route path="/workstreams/:id" element={<WorkstreamDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockGet(url: string) {
  if (url === '/api/workstreams/stream-1') return Promise.resolve({ data: workstream });
  if (url === '/api/workstreams/stream-1/next-steps') return Promise.resolve({ data: nextSteps });
  return Promise.reject(new Error(`unexpected GET ${url}`));
}

describe('WorkstreamDetail next steps', () => {
  beforeEach(() => {
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
      if (url !== '/api/workstreams/stream-1/next-steps') return Promise.reject(new Error(`unexpected POST ${url}`));
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
        nextSteps = nextSteps.map((step) => step.id === 'step-1' ? { ...step, text: (body as { text: string }).text } : step);
        return Promise.resolve({ data: nextSteps[0] });
      }
      if (url === '/api/workstreams/stream-1/next-steps/reorder') {
        const ids = (body as { nextStepIds: string[] }).nextStepIds;
        nextSteps = ids.map((stepId, index) => ({ ...nextSteps.find((step) => step.id === stepId)!, sortOrder: index }));
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

    fireEvent.change(within(section).getByLabelText('New next step'), { target: { value: 'Publish release notes' } });
    fireEvent.click(within(section).getByRole('button', { name: 'Add next step' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith('/api/workstreams/stream-1/next-steps', { text: 'Publish release notes' }));
    expect(await within(section).findByText('Publish release notes')).toBeInTheDocument();
    expect(within(section).getByText('3 open next steps')).toBeInTheDocument();

    fireEvent.click(within(section).getByRole('button', { name: 'Edit Draft launch checklist' }));
    const editInput = within(section).getByDisplayValue('Draft launch checklist');
    fireEvent.change(editInput, { target: { value: 'Draft final launch checklist' } });
    fireEvent.click(within(section).getByRole('button', { name: 'Save next step' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledWith('/api/workstreams/stream-1/next-steps/step-1', { text: 'Draft final launch checklist' }));
    expect(await within(section).findByText('Draft final launch checklist')).toBeInTheDocument();

    fireEvent.click(within(section).getByRole('button', { name: 'Move Draft final launch checklist down' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledWith('/api/workstreams/stream-1/next-steps/reorder', { nextStepIds: ['step-2', 'step-1', 'step-3'] }));
    const rowsAfterReorder = within(section).getAllByTestId('next-step-row');
    expect(rowsAfterReorder[0]).toHaveTextContent('Confirm support owner');
    expect(rowsAfterReorder[1]).toHaveTextContent('Draft final launch checklist');

    fireEvent.click(within(section).getByRole('button', { name: 'Solve Draft final launch checklist' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledWith('/api/workstreams/stream-1/next-steps/step-1/solve'));
    expect(within(section).queryByText('Draft final launch checklist')).not.toBeInTheDocument();

    fireEvent.click(within(section).getByRole('button', { name: 'Abandon Confirm support owner' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledWith('/api/workstreams/stream-1/next-steps/step-2/abandon'));
    expect(within(section).queryByText('Confirm support owner')).not.toBeInTheDocument();
    expect(within(section).getByText('1 open next step')).toBeInTheDocument();
  }, 30000);
});
