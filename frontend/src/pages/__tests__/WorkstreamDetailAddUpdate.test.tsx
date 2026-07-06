import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StatusUpdate, Workstream } from '../../types/workstream';

const apiGetMock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());

vi.mock('../../api/client', () => ({
  apiClient: {
    get: apiGetMock,
    post: apiPostMock,
    put: vi.fn(),
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

vi.mock('../../components/Workstream/ParentSelectorDialog', () => ({
  ParentSelectorDialog: () => null,
}));

import WorkstreamDetail from '../WorkstreamDetail';

const originalUpdate: StatusUpdate = {
  id: 'update-old',
  number: 41,
  workstreamId: 'stream-uuid',
  status: 'Original launch status',
  note: null,
  createdAt: '2026-06-01T09:00:00Z',
  updatedAt: '2026-06-01T09:00:00Z',
};

const createdUpdate: StatusUpdate = {
  id: 'update-new',
  number: 42,
  workstreamId: 'stream-uuid',
  status: 'Fresh detail update',
  note: 'Visible without reload',
  createdAt: '2026-06-02T10:00:00Z',
  updatedAt: '2026-06-02T10:00:00Z',
};

const baseWorkstream: Workstream = {
  id: 'stream-uuid',
  number: 520,
  projectId: 'project-1',
  name: 'Launch readiness',
  categoryId: null,
  context: null,
  state: 'active',
  createdAt: '2026-06-01T00:00:00Z',
  closedAt: null,
  latestStatus: originalUpdate,
  lastDirectUpdateAt: originalUpdate.updatedAt,
  substreams: [],
  allTags: [],
};

let updates: StatusUpdate[];

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/workstreams/${baseWorkstream.number}`]}>
        <Routes>
          <Route path="/workstreams/:id" element={<WorkstreamDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockGet(url: string) {
  if (url === '/api/workstreams/520') {
    return Promise.resolve({
      data: {
        ...baseWorkstream,
        latestStatus: updates[0],
        lastDirectUpdateAt: updates[0]?.updatedAt ?? null,
      },
    });
  }
  if (url === '/api/workstreams/520/status-updates?includeSubstreams=false&limit=50') {
    return Promise.resolve({ data: { updates, nextCursor: null } });
  }
  if (url === '/api/workstreams/stream-uuid/next-steps') {
    return Promise.resolve({ data: [] });
  }
  return Promise.reject(new Error(`unexpected GET ${url}`));
}

describe('WorkstreamDetail add update flow', () => {
  beforeEach(() => {
    updates = [originalUpdate];
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    apiGetMock.mockImplementation(mockGet);
    apiPostMock.mockImplementation((url: string, body: { workstreamId: string; status: string; note?: string }) => {
      if (url !== '/api/status-updates') return Promise.reject(new Error(`unexpected POST ${url}`));
      expect(body).toMatchObject({
        workstreamId: 'stream-uuid',
        status: 'Fresh detail update',
        note: 'Visible without reload',
      });
      updates = [createdUpdate, ...updates];
      return Promise.resolve({ data: createdUpdate });
    });
  });

  it('refreshes status history and latest metadata after adding an update from a public-number detail route', async () => {
    renderDetail();

    await screen.findByTestId('status-update-update-old');
    expect(screen.getByText('Original launch status')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Update' }));
    const dialog = await screen.findByRole('heading', { name: /Add update for/ });
    const form = dialog.closest('form') ?? dialog.parentElement?.querySelector('form');
    if (!form) throw new Error('status update form not found');

    fireEvent.change(within(form).getByLabelText(/Status/), {
      target: { value: 'Fresh detail update' },
    });
    fireEvent.change(within(form).getByLabelText(/Note/), {
      target: { value: 'Visible without reload' },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Save' }));

    expect(await screen.findByTestId('status-update-update-new')).toBeInTheDocument();
    expect(screen.getByText('Fresh detail update')).toBeInTheDocument();
    expect(screen.getByText('Visible without reload')).toBeInTheDocument();
    await waitFor(() =>
      expect(apiGetMock).toHaveBeenCalledWith(
        '/api/workstreams/520/status-updates?includeSubstreams=false&limit=50',
      ),
    );
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith('/api/workstreams/520'));
  });
});
