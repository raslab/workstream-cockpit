import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StatusUpdateDialog } from '../../components/StatusUpdate/StatusUpdateDialog';
import { WorkstreamCreateDialog } from '../../components/Workstream/WorkstreamCreateDialog';
import { WorkstreamEditDialog } from '../../components/Workstream/WorkstreamEditDialog';
import { StatusEditDialog } from '../../pages/WorkstreamDetail';
import type { StatusUpdate, Workstream } from '../../types/workstream';

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

const baseStatusUpdate: StatusUpdate = {
  id: 'status-1',
  workstreamId: 'stream-1',
  status: 'Existing status',
  note: 'Existing note',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

describe('dialog keyboard submission hints', () => {
  beforeEach(() => {
    localStorage.clear();
    apiPostMock.mockReset();
    apiPutMock.mockReset();
    apiPostMock.mockImplementation(() => new Promise(() => undefined));
    apiPutMock.mockImplementation(() => new Promise(() => undefined));
  });

  it('submits a new workstream with Ctrl+Enter from a multi-line field and explains the shortcut', async () => {
    renderWithClient(<WorkstreamCreateDialog isOpen onClose={vi.fn()} />);

    expect(screen.getByText(/Enter adds a new line/i)).toBeInTheDocument();
    expect(screen.getByText(/Ctrl\/Cmd \| Enter submits/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'New stream' } });
    fireEvent.change(screen.getByLabelText(/Initial Status/i), {
      target: { value: 'Status line' },
    });
    await act(async () => {
      fireEvent.keyDown(screen.getByLabelText(/Initial Status/i), { key: 'Enter', ctrlKey: true });
    });

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/workstreams',
        expect.objectContaining({
          name: 'New stream',
          initialStatus: 'Status line',
        }),
      );
    });
  });

  it('keeps regular Enter as a newline in the workstream edit context and submits with Cmd+Enter', async () => {
    renderWithClient(<WorkstreamEditDialog isOpen onClose={vi.fn()} workstream={baseWorkstream} />);

    expect(screen.getByText(/Enter adds a new line/i)).toBeInTheDocument();
    expect(screen.getByText(/Ctrl\/Cmd \| Enter submits/i)).toBeInTheDocument();

    const context = screen.getByLabelText(/Context/i);
    fireEvent.change(context, { target: { value: 'First line\nsecond line' } });
    expect(context).toHaveValue('First line\nsecond line');

    await act(async () => {
      fireEvent.keyDown(context, { key: 'Enter', metaKey: true });
    });

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith(
        '/api/workstreams/stream-1',
        expect.objectContaining({
          name: 'Existing stream',
          context: 'First line\nsecond line',
        }),
      );
    });
  });

  it('keeps regular Enter as a newline in status updates and submits with Ctrl+Enter', async () => {
    renderWithClient(
      <StatusUpdateDialog
        isOpen
        onClose={vi.fn()}
        workstreamId="stream-1"
        workstreamName="Existing stream"
      />,
    );

    expect(screen.getByText(/Enter adds a new line/i)).toBeInTheDocument();
    expect(screen.getByText(/Ctrl\/Cmd \| Enter submits/i)).toBeInTheDocument();

    const status = screen.getByLabelText(/Status/i);
    fireEvent.change(status, { target: { value: 'First line\nsecond line' } });
    expect(status).toHaveValue('First line\nsecond line');

    await act(async () => {
      fireEvent.keyDown(status, { key: 'Enter', ctrlKey: true });
    });

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/status-updates',
        expect.objectContaining({
          workstreamId: 'stream-1',
          status: 'First line\nsecond line',
        }),
      );
    });
  });

  it('submits a status update edit with Cmd+Enter from a multi-line field', async () => {
    renderWithClient(
      <StatusEditDialog
        statusUpdate={baseStatusUpdate}
        workstreamId="stream-1"
        isOpen
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/Enter adds a new line/i)).toBeInTheDocument();
    expect(screen.getByText(/Ctrl\/Cmd \| Enter submits/i)).toBeInTheDocument();

    const status = screen.getByLabelText(/Status/i);
    fireEvent.change(status, { target: { value: 'Edited status\nsecond line' } });
    expect(status).toHaveValue('Edited status\nsecond line');

    await act(async () => {
      fireEvent.keyDown(status, { key: 'Enter', metaKey: true });
    });

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith(
        '/api/status-updates/status-1',
        expect.objectContaining({
          workstreamId: 'stream-1',
          status: 'Edited status\nsecond line',
          note: 'Existing note',
        }),
      );
    });
  });

  it('closes dirty-free dialogs on Escape without showing discard confirmation', () => {
    const onClose = vi.fn();
    renderWithClient(
      <StatusEditDialog
        statusUpdate={baseStatusUpdate}
        workstreamId="stream-1"
        isOpen
        onClose={onClose}
      />,
    );

    fireEvent.keyDown(screen.getByLabelText(/Status/i), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Discard changes/i)).not.toBeInTheDocument();
  });

  it('confirms before discarding changed status update edits and preserves text when kept', () => {
    const onClose = vi.fn();
    renderWithClient(
      <StatusEditDialog
        statusUpdate={baseStatusUpdate}
        workstreamId="stream-1"
        isOpen
        onClose={onClose}
      />,
    );

    const status = screen.getByLabelText(/Status/i);
    fireEvent.change(status, { target: { value: 'Unsaved edit' } });
    fireEvent.keyDown(status, { key: 'Escape' });

    expect(screen.getByText(/Discard changes\?/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Cancel$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Save$/i })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Keep editing/i }));

    expect(screen.queryByText(/Discard changes\?/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/i)).toHaveValue('Unsaved edit');
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByLabelText(/Status/i), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /Discard changes/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses the same Escape discard confirmation for creating status updates', () => {
    const onClose = vi.fn();
    renderWithClient(
      <StatusUpdateDialog
        isOpen
        onClose={onClose}
        workstreamId="stream-1"
        workstreamName="Existing stream"
      />,
    );

    const status = screen.getByLabelText(/Status/i);
    fireEvent.change(status, { target: { value: 'Draft update' } });
    fireEvent.keyDown(status, { key: 'Escape' });

    expect(screen.getByText(/Discard changes\?/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Cancel$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Save$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Keep editing/i }));

    expect(screen.queryByText(/Discard changes\?/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/i)).toHaveValue('Draft update');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('uses the same Escape discard confirmation for creating streams', () => {
    const onClose = vi.fn();
    renderWithClient(<WorkstreamCreateDialog isOpen onClose={onClose} />);

    const name = screen.getByLabelText(/Name/i);
    fireEvent.change(name, { target: { value: 'Draft stream' } });
    fireEvent.keyDown(name, { key: 'Escape' });

    expect(screen.getByText(/Discard changes\?/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Cancel$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Create$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Keep editing/i }));

    expect(screen.queryByText(/Discard changes\?/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Create$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toHaveValue('Draft stream');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('uses the same Escape discard confirmation for creating sub-streams', () => {
    const onClose = vi.fn();
    renderWithClient(<WorkstreamCreateDialog isOpen onClose={onClose} parent={baseWorkstream} />);

    expect(screen.getByText(/Create Sub-stream/i)).toBeInTheDocument();

    const name = screen.getByLabelText(/Name/i);
    fireEvent.change(name, { target: { value: 'Draft sub-stream' } });
    fireEvent.keyDown(name, { key: 'Escape' });

    expect(screen.getByText(/Discard changes\?/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Cancel$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Create$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Keep editing/i }));

    expect(screen.queryByText(/Discard changes\?/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Create$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toHaveValue('Draft sub-stream');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('uses the same Escape discard confirmation for editing streams', () => {
    const onClose = vi.fn();
    renderWithClient(<WorkstreamEditDialog isOpen onClose={onClose} workstream={baseWorkstream} />);

    const context = screen.getByLabelText(/Context/i);
    fireEvent.change(context, { target: { value: 'Unsaved context' } });
    fireEvent.keyDown(context, { key: 'Escape' });

    expect(screen.getByText(/Discard changes\?/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Cancel$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Save Changes$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Keep editing/i }));

    expect(screen.queryByText(/Discard changes\?/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save Changes$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Context/i)).toHaveValue('Unsaved context');
    expect(onClose).not.toHaveBeenCalled();
  });
});
