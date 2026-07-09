import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Workstream } from '../../types/workstream';

const useWorkstreamsMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useWorkstreams', () => ({
  useWorkstreams: useWorkstreamsMock,
}));

vi.mock('../../api/client', () => ({
  apiClient: { put: vi.fn(), get: vi.fn() },
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

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/archive']}>
        <Routes>
          <Route path="/archive" element={<Archive />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Archive Markdown rendering', () => {
  beforeEach(() => {
    useWorkstreamsMock.mockReset();
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
});
