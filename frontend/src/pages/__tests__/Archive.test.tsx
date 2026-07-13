import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Workstream } from '../../types/workstream';

const useWorkstreamsMock = vi.hoisted(() => vi.fn());
const apiPutMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useWorkstreams', () => ({
  useWorkstreams: useWorkstreamsMock,
}));

vi.mock('../../api/client', () => ({
  apiClient: { put: apiPutMock, get: vi.fn() },
}));

vi.mock('../../api/tags', () => ({
  useTags: () => ({ data: [] }),
}));

vi.mock('../../components/Notifications/ResourceChangeNotificationProvider', () => ({
  useResourceChangeScreen: vi.fn(),
}));

import Archive from '../Archive';

const closedWorkstream: Workstream = {
  id: 'stream-1',
  number: 42,
  projectId: 'project-1',
  name: 'Closed markdown stream',
  categoryId: 'cat-1',
  context: null,
  state: 'closed',
  createdAt: '2026-06-01T00:00:00Z',
  closedAt: '2026-07-01T12:00:00Z',
  category: {
    id: 'cat-1',
    name: 'Operations',
    color: '#0f766e',
    emoji: '📦',
    description: '',
    sortOrder: 1,
  },
  latestStatus: {
    id: 'status-1',
    workstreamId: 'stream-1',
    status: [
      '**Fixed** _archive_ `rendering` with [runbook](https://example.com/runbook).',
      '',
      '- first check',
      '- second check',
    ].join('\n'),
    note: null,
    createdAt: '2026-06-30T09:00:00Z',
    updatedAt: '2026-06-30T09:00:00Z',
  },
};

function renderArchive() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/archive']}>
          <Routes>
            <Route path="/archive" element={<Archive />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

async function clickAndFlush(user: ReturnType<typeof userEvent.setup>, element: Element) {
  await act(async () => {
    await user.click(element);
  });
}

describe('Archive rendering', () => {
  beforeEach(() => {
    useWorkstreamsMock.mockReset();
    apiPutMock.mockReset();
    useWorkstreamsMock.mockReturnValue({ data: [closedWorkstream], isLoading: false, error: null });
  });

  it('renders closed stream latest status Markdown consistently with active views', () => {
    renderArchive();

    const statusRegion = screen.getByTestId('archive-latest-status-stream-1');

    expect(within(statusRegion).getByText('Fixed').closest('strong')).toBeInTheDocument();
    expect(within(statusRegion).getByText('archive').closest('em')).toBeInTheDocument();
    expect(within(statusRegion).getByText('rendering').closest('code')).toBeInTheDocument();
    expect(within(statusRegion).getByRole('link', { name: 'runbook' })).toHaveAttribute(
      'href',
      'https://example.com/runbook',
    );
    expect(within(statusRegion).getByText('first check').closest('li')).toBeInTheDocument();
    expect(within(statusRegion).getByText('second check').closest('li')).toBeInTheDocument();
    expect(statusRegion).not.toHaveTextContent('**Fixed**');
    expect(statusRegion).not.toHaveTextContent('[runbook](https://example.com/runbook)');
  });

  it('exposes the exact localized closure timestamp without changing the readable date', () => {
    renderArchive();

    const closureText = screen.getByText('Closed on Jul 1, 2026');
    const exactTimestamp = new Date(closedWorkstream.closedAt!).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    expect(closureText).toHaveAttribute('title', exactTimestamp);
    expect(closureText).toHaveAccessibleName(
      `Closed on Jul 1, 2026 (exact timestamp: ${exactTimestamp})`,
    );
    expect(closureText).toHaveAttribute('tabindex', '0');
    expect(closureText).toHaveAccessibleDescription(`Exact timestamp: ${exactTimestamp}`);

    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
  });

  it.each([undefined, 'not-a-date'])(
    'safely omits an unusable closure timestamp: %s',
    (closedAt) => {
      useWorkstreamsMock.mockReturnValue({
        data: [{ ...closedWorkstream, closedAt }],
        isLoading: false,
        error: null,
      });

      expect(() => renderArchive()).not.toThrow();
      expect(screen.queryByText(/^Closed on /)).not.toBeInTheDocument();
    },
  );
});

describe('Archive reopen confirmation', () => {
  beforeEach(() => {
    useWorkstreamsMock.mockReset();
    useWorkstreamsMock.mockReturnValue({ data: [closedWorkstream], isLoading: false, error: null });
    apiPutMock.mockReset();
  });

  it('opens an accessible confirmation with the stream reference and does not reopen before confirmation', async () => {
    const user = userEvent.setup();
    renderArchive();

    await clickAndFlush(user, screen.getByRole('button', { name: 'Reopen' }));

    const dialog = screen.getByRole('alertdialog', {
      name: 'Reopen #42 Closed markdown stream?',
    });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription(
      'This will return #42 Closed markdown stream to your active workstreams and remove it from the Archive view.',
    );
    expect(apiPutMock).not.toHaveBeenCalled();
    const cancelButton = within(dialog).getByRole('button', { name: 'Cancel' });
    const confirmButton = within(dialog).getByRole('button', { name: 'Confirm reopen' });
    expect(cancelButton).toHaveFocus();
    await user.tab();
    expect(confirmButton).toHaveFocus();
    await user.tab();
    expect(cancelButton).toHaveFocus();
    await user.tab({ shift: true });
    expect(confirmButton).toHaveFocus();
  });

  it('cancels by button or Escape without mutating and restores focus to the reopen action', async () => {
    const user = userEvent.setup();
    renderArchive();
    const reopenButton = screen.getByRole('button', { name: 'Reopen' });

    await clickAndFlush(user, reopenButton);
    await clickAndFlush(user, screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(reopenButton).toHaveFocus();

    await clickAndFlush(user, reopenButton);
    act(() => {
      fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(reopenButton).toHaveFocus();
    expect(apiPutMock).not.toHaveBeenCalled();
  });

  it('submits exactly once under repeated confirmation clicks and disables actions in flight', async () => {
    apiPutMock.mockImplementation(() => new Promise(() => undefined));
    const user = userEvent.setup();
    renderArchive();

    await clickAndFlush(user, screen.getByRole('button', { name: 'Reopen' }));
    const confirmButton = screen.getByRole('button', { name: 'Confirm reopen' });
    act(() => {
      fireEvent.click(confirmButton);
      fireEvent.click(confirmButton);
    });

    await waitFor(() => expect(apiPutMock).toHaveBeenCalledTimes(1));
    expect(apiPutMock).toHaveBeenCalledWith('/api/workstreams/stream-1/reopen');
    expect(screen.getByRole('button', { name: 'Reopening...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveFocus();
    await user.tab();
    expect(dialog).toHaveFocus();
    act(() => {
      fireEvent.keyDown(dialog, { key: 'Escape' });
    });
    expect(dialog).toBeInTheDocument();
  });

  it('removes the reopened stream from the closed cache and invalidates workstream queries', async () => {
    let isArchived = true;
    useWorkstreamsMock.mockImplementation(() => ({
      data: isArchived ? [closedWorkstream] : [],
      isLoading: false,
      error: null,
    }));
    apiPutMock.mockImplementation(async () => {
      isArchived = false;
      return { data: { ...closedWorkstream, state: 'active', closedAt: null } };
    });
    const user = userEvent.setup();
    const { queryClient } = renderArchive();
    queryClient.setQueryData(['workstreams', { state: 'closed' }], [closedWorkstream]);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await clickAndFlush(user, screen.getByRole('button', { name: 'Reopen' }));
    await clickAndFlush(user, screen.getByRole('button', { name: 'Confirm reopen' }));

    await waitFor(() => {
      expect(screen.queryByText('Closed markdown stream')).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Closed Workstreams' })).toHaveFocus();
    expect(queryClient.getQueryData(['workstreams', { state: 'closed' }])).toEqual([]);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['workstreams'] });
  });

  it('preserves the stream and confirmation with a useful error when reopening fails', async () => {
    apiPutMock.mockRejectedValue(new Error('network unavailable'));
    const user = userEvent.setup();
    renderArchive();

    await clickAndFlush(user, screen.getByRole('button', { name: 'Reopen' }));
    await clickAndFlush(user, screen.getByRole('button', { name: 'Confirm reopen' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to reopen #42 Closed markdown stream. Please try again.',
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#42 Closed markdown stream' })).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: 'Confirm reopen' });
    expect(confirmButton).toBeEnabled();
    expect(confirmButton).toHaveFocus();
    expect(apiPutMock).toHaveBeenCalledTimes(1);
  });
});
