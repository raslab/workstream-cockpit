import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StatusUpdateDialog } from '../../components/StatusUpdate/StatusUpdateDialog';
import { WorkstreamCreateDialog } from '../../components/Workstream/WorkstreamCreateDialog';
import { WorkstreamEditDialog } from '../../components/Workstream/WorkstreamEditDialog';
import type { Workstream } from '../../types/workstream';

const apiPostMock = vi.hoisted(() => vi.fn());
const apiPutMock = vi.hoisted(() => vi.fn());

vi.mock('../../api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: apiPostMock,
    put: apiPutMock,
  },
}));

vi.mock('../../components/Tag/TagAutocomplete', () => ({
  TagAutocomplete: () => null,
}));

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const baseWorkstream: Workstream = {
  id: 'stream-1',
  projectId: 'project-1',
  name: 'Existing stream',
  categoryId: null,
  context: 'Existing context',
  state: 'active',
  createdAt: '2026-06-01T00:00:00Z',
  closedAt: null,
};

describe('dialog keyboard submission hints', () => {
  beforeEach(() => {
    apiPostMock.mockReset();
    apiPutMock.mockReset();
    apiPostMock.mockImplementation(() => new Promise(() => undefined));
    apiPutMock.mockImplementation(() => new Promise(() => undefined));
  });

  it('submits a new workstream with Ctrl+Enter from a multi-line field and explains the shortcut', async () => {
    renderWithClient(<WorkstreamCreateDialog isOpen onClose={vi.fn()} />);

    expect(screen.getByText(/Enter adds a new line/i)).toBeInTheDocument();
    expect(screen.getByText(/Ctrl\/Cmd\+Enter submits/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'New stream' } });
    fireEvent.change(screen.getByLabelText(/Initial Status/i), { target: { value: 'Status line' } });
    await act(async () => {
      fireEvent.keyDown(screen.getByLabelText(/Initial Status/i), { key: 'Enter', ctrlKey: true });
    });

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/api/workstreams', expect.objectContaining({
        name: 'New stream',
        initialStatus: 'Status line',
      }));
    });
  });

  it('keeps regular Enter as a newline in the workstream edit context and submits with Cmd+Enter', async () => {
    renderWithClient(<WorkstreamEditDialog isOpen onClose={vi.fn()} workstream={baseWorkstream} />);

    expect(screen.getByText(/Enter adds a new line/i)).toBeInTheDocument();
    expect(screen.getByText(/Ctrl\/Cmd\+Enter submits/i)).toBeInTheDocument();

    const context = screen.getByLabelText(/Context/i);
    fireEvent.change(context, { target: { value: 'First line\nsecond line' } });
    expect(context).toHaveValue('First line\nsecond line');

    await act(async () => {
      fireEvent.keyDown(context, { key: 'Enter', metaKey: true });
    });

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith('/api/workstreams/stream-1', expect.objectContaining({
        name: 'Existing stream',
        context: 'First line\nsecond line',
      }));
    });
  });

  it('keeps regular Enter as a newline in status updates and submits with Ctrl+Enter', async () => {
    renderWithClient(
      <StatusUpdateDialog isOpen onClose={vi.fn()} workstreamId="stream-1" workstreamName="Existing stream" />,
    );

    expect(screen.getByText(/Enter adds a new line/i)).toBeInTheDocument();
    expect(screen.getByText(/Ctrl\/Cmd\+Enter submits/i)).toBeInTheDocument();

    const status = screen.getByLabelText(/Status/i);
    fireEvent.change(status, { target: { value: 'First line\nsecond line' } });
    expect(status).toHaveValue('First line\nsecond line');

    await act(async () => {
      fireEvent.keyDown(status, { key: 'Enter', ctrlKey: true });
    });

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/api/status-updates', expect.objectContaining({
        workstreamId: 'stream-1',
        status: 'First line\nsecond line',
      }));
    });
  });
});
