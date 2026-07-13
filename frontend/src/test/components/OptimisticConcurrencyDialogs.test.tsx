import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../../api/client';
import { ParentSelectorDialog } from '../../components/Workstream/ParentSelectorDialog';
import { WorkstreamEditDialog } from '../../components/Workstream/WorkstreamEditDialog';
import { StatusEditDialog } from '../../pages/WorkstreamDetail';
import type { StatusUpdate, Workstream } from '../../types/workstream';

vi.mock('../../api/client', () => ({ apiClient: { get: vi.fn(), put: vi.fn() } }));
vi.mock('../../components/Tag/TagAutocomplete', () => ({ TagAutocomplete: () => null }));

const getMock = vi.mocked(apiClient.get);
const putMock = vi.mocked(apiClient.put);
const workstream: Workstream = {
  id: 'stream-1',
  projectId: 'project-1',
  name: 'Original',
  categoryId: null,
  context: 'Original context',
  state: 'active',
  createdAt: '2026-01-01',
  closedAt: null,
  version: 3,
};
const update: StatusUpdate = {
  id: 'update-1',
  workstreamId: 'stream-1',
  status: 'Original status',
  note: 'Original note',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  version: 5,
};

function renderDialog(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}

function conflict(current: unknown) {
  return {
    response: { status: 409, data: { code: 'VERSION_CONFLICT', error: 'conflict', current } },
  };
}

describe('optimistic concurrency edit dialogs', () => {
  beforeEach(() => {
    localStorage.clear();
    getMock.mockReset().mockResolvedValue({ data: [] });
    putMock.mockReset();
  });

  it('preserves and recovers a workstream draft after a conflict, then saves against latest version', async () => {
    const latest = {
      ...workstream,
      name: 'Changed elsewhere',
      context: 'Latest context',
      version: 4,
    };
    putMock
      .mockRejectedValueOnce(conflict(latest))
      .mockResolvedValueOnce({ data: { ...latest, name: 'My edit', version: 5 } });
    renderDialog(<WorkstreamEditDialog workstream={workstream} isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'My edit' } });
    fireEvent.change(screen.getByLabelText(/Context/i), { target: { value: 'My context' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText(/changed elsewhere/i)).toBeInTheDocument();
    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock.mock.calls[0][1]).toMatchObject({ expectedVersion: 3, name: 'My edit' });
    expect(screen.getByLabelText(/Name/i)).toHaveValue('My edit');
    expect(localStorage.getItem('cockpit:draft:workstream-edit:stream-1')).toContain('My edit');

    fireEvent.click(screen.getByRole('button', { name: 'Reload current version' }));
    expect(screen.getByLabelText(/Name/i)).toHaveValue('Changed elsewhere');
    expect(screen.getByRole('button', { name: 'Restore draft' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restore draft' }));
    expect(screen.getByLabelText(/Name/i)).toHaveValue('My edit');
    expect(screen.getByLabelText(/Context/i)).toHaveValue('My context');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(putMock).toHaveBeenCalledTimes(2));
    expect(putMock.mock.calls[1][1]).toMatchObject({ expectedVersion: 4, name: 'My edit' });
  });

  it('preserves and restores status and note while advancing the conflict baseline', async () => {
    const latest = { ...update, status: 'Latest status', note: 'Latest note', version: 6 };
    putMock
      .mockRejectedValueOnce(conflict(latest))
      .mockResolvedValueOnce({ data: { ...latest, status: 'Mine', version: 7 } });
    renderDialog(
      <StatusEditDialog statusUpdate={update} workstreamId="stream-1" isOpen onClose={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText('Status *'), { target: { value: 'Mine' } });
    fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: 'My note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/changed elsewhere/i)).toBeInTheDocument();
    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock.mock.calls[0][1]).toMatchObject({
      expectedVersion: 5,
      status: 'Mine',
      note: 'My note',
    });
    expect(screen.getByLabelText('Status *')).toHaveValue('Mine');
    expect(localStorage.getItem('cockpit:draft:status-edit:update-1')).toContain('Mine');

    fireEvent.click(screen.getByRole('button', { name: 'Reload current version' }));
    expect(screen.getByLabelText('Status *')).toHaveValue('Latest status');
    fireEvent.click(screen.getByRole('button', { name: 'Restore draft' }));
    expect(screen.getByLabelText('Status *')).toHaveValue('Mine');
    expect(screen.getByLabelText('Note (optional)')).toHaveValue('My note');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(putMock).toHaveBeenCalledTimes(2));
    expect(putMock.mock.calls[1][1]).toMatchObject({ expectedVersion: 6, status: 'Mine' });
  });

  it('does not silently reset a dirty workstream form when refreshed props arrive', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = (value: Workstream) => (
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <WorkstreamEditDialog workstream={value} isOpen onClose={vi.fn()} />
        </QueryClientProvider>
      </MemoryRouter>
    );
    const { rerender } = render(wrapper(workstream));
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Unsaved local title' } });

    rerender(wrapper({ ...workstream, name: 'Refetched server title', version: 4 }));

    expect(screen.getByLabelText(/Name/i)).toHaveValue('Unsaved local title');
  });

  it('sends the parent dialog original version and preserves selection on conflict', async () => {
    getMock.mockResolvedValue({ data: [{ id: 'parent-2', name: 'Parent Two', state: 'active' }] });
    putMock.mockRejectedValueOnce(conflict({ ...workstream, version: 4 }));
    renderDialog(<ParentSelectorDialog workstream={workstream} isOpen onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Parent Two/ }));
    fireEvent.click(screen.getByRole('button', { name: /Review parent change/ }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm parent change/ }));
    expect(await screen.findByText(/changed elsewhere/i)).toBeInTheDocument();
    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock.mock.calls[0][1]).toEqual({ parentId: 'parent-2', expectedVersion: 3 });
    expect(screen.getByRole('button', { name: /Parent Two/ })).toHaveTextContent('✓');
  });

  it('does not overwrite a dirty parent selection when refreshed props arrive', async () => {
    getMock.mockResolvedValue({ data: [{ id: 'parent-2', name: 'Parent Two', state: 'active' }] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = (value: Workstream) => (
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <ParentSelectorDialog workstream={value} isOpen onClose={vi.fn()} />
        </QueryClientProvider>
      </MemoryRouter>
    );
    const { rerender } = render(wrapper(workstream));

    fireEvent.click(await screen.findByRole('button', { name: /Parent Two/ }));
    rerender(wrapper({ ...workstream, parentId: 'parent-refreshed', version: 4 }));

    expect(screen.getByRole('button', { name: /Parent Two/ })).toHaveTextContent('✓');
  });

  it('retains a recoverable workstream draft when refreshed props arrive after reload', async () => {
    const latest = { ...workstream, name: 'Changed elsewhere', version: 4 };
    putMock.mockRejectedValueOnce(conflict(latest));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = (value: Workstream) => (
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <WorkstreamEditDialog workstream={value} isOpen onClose={vi.fn()} />
        </QueryClientProvider>
      </MemoryRouter>
    );
    const { rerender } = render(wrapper(workstream));

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Recover me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reload current version' }));
    rerender(wrapper(latest));

    expect(screen.getByRole('button', { name: 'Restore draft' })).toBeInTheDocument();
  });

  it('retains a recoverable status draft when refreshed props arrive after reload', async () => {
    const latest = { ...update, status: 'Changed elsewhere', version: 6 };
    putMock.mockRejectedValueOnce(conflict(latest));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = (value: StatusUpdate) => (
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <StatusEditDialog statusUpdate={value} workstreamId="stream-1" isOpen onClose={vi.fn()} />
        </QueryClientProvider>
      </MemoryRouter>
    );
    const { rerender } = render(wrapper(update));

    fireEvent.change(screen.getByLabelText('Status *'), { target: { value: 'Recover me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reload current version' }));
    rerender(wrapper(latest));

    expect(screen.getByRole('button', { name: 'Restore draft' })).toBeInTheDocument();
  });
});
