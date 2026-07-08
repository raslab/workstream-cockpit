import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StatusUpdateDialog } from '../../components/StatusUpdate/StatusUpdateDialog';
import { WorkstreamCreateDialog } from '../../components/Workstream/WorkstreamCreateDialog';
import { WorkstreamEditDialog } from '../../components/Workstream/WorkstreamEditDialog';
import { StatusEditDialog } from '../../pages/WorkstreamDetail';
import { apiClient } from '../../api/client';
import type { StatusUpdate, Workstream } from '../../types/workstream';

vi.mock('../../api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../../components/Tag/TagAutocomplete', () => ({
  TagAutocomplete: () => null,
}));

const apiPostMock = vi.mocked(apiClient.post);
const apiPutMock = vi.mocked(apiClient.put);

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}

const baseWorkstream: Workstream = {
  id: 'stream-1',
  projectId: 'project-1',
  name: 'Server stream title',
  categoryId: null,
  context: 'Server context',
  state: 'active',
  createdAt: '2026-06-01T00:00:00Z',
  closedAt: null,
  allTags: [],
};

const baseStatusUpdate: StatusUpdate = {
  id: 'update-1',
  workstreamId: 'stream-1',
  status: 'Server status',
  note: 'Server note',
  createdAt: '2026-06-02T00:00:00Z',
};

describe('dialog draft preservation', () => {
  beforeEach(() => {
    localStorage.clear();
    apiPostMock.mockReset();
    apiPutMock.mockReset();
  });

  it('preserves a closed workstream create draft and lets the user restore or discard it', () => {
    const { rerender } = renderWithProviders(<WorkstreamCreateDialog isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Draft stream title' } });
    fireEvent.change(screen.getByLabelText(/Context/i), {
      target: { value: 'Draft stream context' },
    });

    rerender(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <WorkstreamCreateDialog isOpen={false} onClose={vi.fn()} />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    rerender(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <WorkstreamCreateDialog isOpen onClose={vi.fn()} />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Unsaved draft available/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toHaveValue('');
    expect(screen.getByLabelText(/Context/i)).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: /Restore draft/i }));
    expect(screen.getByLabelText(/Name/i)).toHaveValue('Draft stream title');
    expect(screen.getByLabelText(/Context/i)).toHaveValue('Draft stream context');

    localStorage.setItem(
      'cockpit:draft:workstream-create:root',
      JSON.stringify({
        name: 'Discard me',
        categoryId: '',
        context: 'Discard this context',
        initialStatus: '',
        initialNote: '',
      }),
    );

    rerender(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <WorkstreamCreateDialog isOpen={false} onClose={vi.fn()} />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    rerender(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <WorkstreamCreateDialog isOpen onClose={vi.fn()} />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Unsaved draft available/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Discard draft/i }));
    expect(screen.queryByText(/Unsaved draft available/i)).not.toBeInTheDocument();
  });

  it('does not silently overwrite loaded workstream edit data with a saved draft', () => {
    localStorage.setItem(
      'cockpit:draft:workstream-edit:stream-1',
      JSON.stringify({ name: 'Draft title', categoryId: '', context: 'Draft context' }),
    );

    renderWithProviders(
      <WorkstreamEditDialog isOpen onClose={vi.fn()} workstream={baseWorkstream} />,
    );

    expect(screen.getByText(/Unsaved draft available/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toHaveValue('Server stream title');
    expect(screen.getByLabelText(/Context/i)).toHaveValue('Server context');

    fireEvent.click(screen.getByRole('button', { name: /Restore draft/i }));
    expect(screen.getByLabelText(/Name/i)).toHaveValue('Draft title');
    expect(screen.getByLabelText(/Context/i)).toHaveValue('Draft context');
  });

  it('scopes status update create drafts by stream and clears the draft after save', async () => {
    apiPostMock.mockResolvedValueOnce({ data: { id: 'update-2' } });

    renderWithProviders(
      <StatusUpdateDialog
        isOpen
        onClose={vi.fn()}
        workstreamId="stream-1"
        workstreamName="Stream One"
      />,
    );

    fireEvent.change(screen.getByLabelText(/Status/i), { target: { value: 'Draft status' } });
    fireEvent.change(screen.getByLabelText(/Note/i), { target: { value: 'Draft note' } });

    expect(localStorage.getItem('cockpit:draft:status-create:stream-1')).toContain('Draft status');
    expect(localStorage.getItem('cockpit:draft:status-create:stream-2')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    });

    await waitFor(() => {
      expect(localStorage.getItem('cockpit:draft:status-create:stream-1')).toBeNull();
    });
  });

  it('preserves status edit drafts without replacing server data until restore is chosen', () => {
    localStorage.setItem(
      'cockpit:draft:status-edit:update-1',
      JSON.stringify({ status: 'Draft edited status', note: 'Draft edited note' }),
    );

    renderWithProviders(
      <StatusEditDialog
        isOpen
        onClose={vi.fn()}
        statusUpdate={baseStatusUpdate}
        workstreamId="stream-1"
      />,
    );

    expect(screen.getByText(/Unsaved draft available/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/i)).toHaveValue('Server status');
    expect(screen.getByLabelText(/Note/i)).toHaveValue('Server note');

    fireEvent.click(screen.getByRole('button', { name: /Restore draft/i }));
    expect(screen.getByLabelText(/Status/i)).toHaveValue('Draft edited status');
    expect(screen.getByLabelText(/Note/i)).toHaveValue('Draft edited note');
  });
});
