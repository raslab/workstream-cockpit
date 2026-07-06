import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StatusUpdate, Workstream } from '../../types/workstream';

const apiGetMock = vi.hoisted(() => vi.fn());
const apiPutMock = vi.hoisted(() => vi.fn());

vi.mock('../../api/client', () => ({
  apiClient: {
    get: apiGetMock,
    put: apiPutMock,
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../components/Markdown/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content, className }: { content: string; className?: string }) => (
    <div className={className}>{content}</div>
  ),
}));

vi.mock('../../components/Tag/TagAutocomplete', () => ({
  TagAutocomplete: () => null,
}));

import WorkstreamDetail from '../WorkstreamDetail';

const workstream: Workstream = {
  id: 'stream-1',
  projectId: 'project-1',
  name: 'Incident follow-up',
  categoryId: null,
  context: null,
  state: 'active',
  createdAt: '2026-07-06T10:00:00Z',
  closedAt: null,
  substreams: [],
  parentStreams: [],
};

const originalUpdate: StatusUpdate = {
  id: 'status-1',
  workstreamId: 'stream-1',
  status: 'Original status title before save. #OldStatus',
  note: 'Original status note before save. #OldNote',
  createdAt: '2026-07-06T11:00:00Z',
  updatedAt: '2026-07-06T11:00:00Z',
  sourceWorkstream: { id: 'stream-1', name: 'Incident follow-up' },
};

function pendingForever() {
  return new Promise(() => undefined);
}

function renderDetail(initialEntry = '/workstreams/stream-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/workstreams/:id" element={<WorkstreamDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('WorkstreamDetail status edit refresh', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiPutMock.mockReset();
    apiGetMock.mockImplementation((url: string) => {
      if (url === '/api/workstreams/stream-1') return Promise.resolve({ data: workstream });
      if (url.startsWith('/api/workstreams/stream-1/status-updates')) {
        return Promise.resolve({ data: { updates: [originalUpdate], nextCursor: null } });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('shows edited status title and note immediately from the save response while history refetch is still pending', async () => {
    const editedUpdate: StatusUpdate = {
      ...originalUpdate,
      status: 'Edited status title visible immediately. #NewStatus',
      note: 'Edited status note visible immediately. #NewNote',
      updatedAt: '2026-07-06T12:00:00Z',
    };
    let statusHistoryRequests = 0;
    apiGetMock.mockImplementation((url: string) => {
      if (url === '/api/workstreams/stream-1') return Promise.resolve({ data: workstream });
      if (url.startsWith('/api/workstreams/stream-1/status-updates')) {
        statusHistoryRequests += 1;
        if (statusHistoryRequests === 1) {
          return Promise.resolve({ data: { updates: [originalUpdate], nextCursor: null } });
        }
        return pendingForever();
      }
      return Promise.resolve({ data: [] });
    });
    apiPutMock.mockResolvedValueOnce({ data: editedUpdate });

    renderDetail();
    expect(await screen.findByText(/Original status title before save/)).toBeInTheDocument();
    expect(screen.getByText(/Original status note before save/)).toBeInTheDocument();

    const ownUpdate = screen.getByTestId('status-update-status-1');
    fireEvent.click(within(ownUpdate).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Status *'), {
      target: { value: editedUpdate.status },
    });
    fireEvent.change(screen.getByLabelText('Note (optional)'), {
      target: { value: editedUpdate.note },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Edited status title visible immediately/)).toHaveTextContent('#NewStatus');
    expect(screen.getByText(/Edited status note visible immediately/)).toHaveTextContent('#NewNote');
    expect(screen.queryByText(/Original status title before save/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Original status note before save/)).not.toBeInTheDocument();
  });

  it('keeps edited status title and note in the dialog when saving fails', async () => {
    apiPutMock.mockRejectedValueOnce(new Error('network failed'));

    renderDetail();
    const ownUpdate = await screen.findByTestId('status-update-status-1');
    fireEvent.click(within(ownUpdate).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Status *'), {
      target: { value: 'Unsaved status title should stay editable. #RetryStatus' },
    });
    fireEvent.change(screen.getByLabelText('Note (optional)'), {
      target: { value: 'Unsaved status note should stay editable. #RetryNote' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Failed to update status. Please try again.')).toBeInTheDocument();
    expect(screen.getByLabelText('Status *')).toHaveValue(
      'Unsaved status title should stay editable. #RetryStatus',
    );
    expect(screen.getByLabelText('Note (optional)')).toHaveValue(
      'Unsaved status note should stay editable. #RetryNote',
    );
    expect(screen.getByText(/Original status title before save/)).toBeInTheDocument();
    expect(screen.getByText(/Original status note before save/)).toBeInTheDocument();
  });
});
