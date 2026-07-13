import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NextStep, StatusUpdate, Workstream } from '../../types/workstream';

const apiGetMock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());
const apiPutMock = vi.hoisted(() => vi.fn());

vi.mock('../../api/client', () => ({
  apiClient: {
    get: apiGetMock,
    post: apiPostMock,
    put: apiPutMock,
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

const solvedUpdate: StatusUpdate = {
  id: 'update-solved',
  number: 43,
  workstreamId: 'stream-uuid',
  status: 'Solved next step: Confirm rollout owner',
  note: null,
  impact: 'active',
  createdAt: '2026-06-03T10:00:00Z',
  updatedAt: '2026-06-03T10:00:00Z',
};

const abandonedUpdate: StatusUpdate = {
  id: 'update-abandoned',
  number: 44,
  workstreamId: 'stream-uuid',
  status: 'Abandoned next step: Retire stale checklist',
  note: null,
  impact: 'info',
  createdAt: '2026-06-04T10:00:00Z',
  updatedAt: '2026-06-04T10:00:00Z',
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

const createdSubstream = {
  id: 'substream-new',
  number: 521,
  name: 'New execution lane',
  state: 'active' as const,
  parentId: 'stream-uuid',
  lastActivityAt: null,
};

let updates: StatusUpdate[];
let nextSteps: NextStep[];
let currentWorkstream: Workstream;

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
  if (url === '/api/categories') {
    return Promise.resolve({ data: [] });
  }
  if (url === '/api/workstreams/520') {
    return Promise.resolve({
      data: {
        ...currentWorkstream,
        latestStatus: updates[0],
        lastDirectUpdateAt: updates[0]?.updatedAt ?? null,
      },
    });
  }
  if (url === '/api/workstreams/520/status-updates?includeSubstreams=false&limit=10') {
    return Promise.resolve({ data: { updates, nextCursor: null } });
  }
  if (url === '/api/workstreams/stream-uuid/next-steps') {
    return Promise.resolve({ data: nextSteps });
  }
  return Promise.reject(new Error(`unexpected GET ${url}`));
}

describe('WorkstreamDetail add update flow', () => {
  beforeEach(() => {
    updates = [originalUpdate];
    currentWorkstream = { ...baseWorkstream, substreams: [] };
    nextSteps = [
      {
        id: 'step-solve',
        workstreamId: 'stream-uuid',
        text: 'Confirm rollout owner',
        state: 'open',
        sortOrder: 0,
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
      {
        id: 'step-abandon',
        workstreamId: 'stream-uuid',
        text: 'Retire stale checklist',
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
    apiPostMock.mockImplementation(
      (
        url: string,
        body: {
          workstreamId?: string;
          status?: string;
          note?: string;
          name?: string;
          parentId?: string;
        },
      ) => {
        if (url === '/api/workstreams') {
          expect(body).toMatchObject({
            name: 'New execution lane',
            parentId: 'stream-uuid',
          });
          currentWorkstream = {
            ...currentWorkstream,
            substreams: [createdSubstream],
            directSubstreamCount: 1,
            activeSubstreamCount: 1,
            closedSubstreamCount: 0,
          };
          return Promise.resolve({ data: createdSubstream });
        }
        if (url !== '/api/status-updates')
          return Promise.reject(new Error(`unexpected POST ${url}`));
        expect(body).toMatchObject({
          workstreamId: 'stream-uuid',
          status: 'Fresh detail update',
          note: 'Visible without reload',
        });
        updates = [createdUpdate, ...updates];
        return Promise.resolve({ data: createdUpdate });
      },
    );
    apiPutMock.mockImplementation((url: string) => {
      if (url === '/api/workstreams/stream-uuid/next-steps/step-solve/solve') {
        const nextStep = nextSteps.find((step) => step.id === 'step-solve');
        nextSteps = nextSteps.filter((step) => step.id !== 'step-solve');
        updates = [solvedUpdate, ...updates];
        return Promise.resolve({ data: { nextStep, update: solvedUpdate } });
      }
      if (url === '/api/workstreams/stream-uuid/next-steps/step-abandon/abandon') {
        const nextStep = nextSteps.find((step) => step.id === 'step-abandon');
        nextSteps = nextSteps.filter((step) => step.id !== 'step-abandon');
        updates = [abandonedUpdate, ...updates];
        return Promise.resolve({ data: { nextStep, update: abandonedUpdate } });
      }
      return Promise.reject(new Error(`unexpected PUT ${url}`));
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
        '/api/workstreams/520/status-updates?includeSubstreams=false&limit=10',
      ),
    );
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith('/api/workstreams/520'));
  });

  it('refreshes status history and latest metadata after solving and abandoning next steps from a public-number detail route', async () => {
    renderDetail();

    const nextStepsSection = await screen.findByRole('region', { name: 'Next steps' });
    expect(await within(nextStepsSection).findByText('2 open next steps')).toBeInTheDocument();

    fireEvent.click(
      within(nextStepsSection).getByRole('button', { name: 'Solve Confirm rollout owner' }),
    );
    fireEvent.click(
      within(nextStepsSection).getByRole('button', {
        name: 'Confirm solve Confirm rollout owner',
      }),
    );

    expect(await screen.findByTestId('status-update-update-solved')).toBeInTheDocument();
    expect(screen.getByText('Solved next step: Confirm rollout owner')).toBeInTheDocument();
    expect(within(nextStepsSection).queryByText('Confirm rollout owner')).not.toBeInTheDocument();
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith('/api/workstreams/520'));

    fireEvent.click(
      within(nextStepsSection).getByRole('button', { name: 'Abandon Retire stale checklist' }),
    );
    fireEvent.click(
      within(nextStepsSection).getByRole('button', {
        name: 'Confirm abandon Retire stale checklist',
      }),
    );

    expect(await screen.findByTestId('status-update-update-abandoned')).toBeInTheDocument();
    expect(screen.getByText('Abandoned next step: Retire stale checklist')).toBeInTheDocument();
    expect(screen.getByText('info')).toBeInTheDocument();
    expect(within(nextStepsSection).queryByText('Retire stale checklist')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(apiGetMock).toHaveBeenCalledWith(
        '/api/workstreams/520/status-updates?includeSubstreams=false&limit=10',
      ),
    );
  });

  it('refreshes parent detail sub-stream metadata after creating a sub-stream from a public-number detail route', async () => {
    renderDetail();

    const sidebar = await screen.findByTestId('workstream-detail-sidebar');
    expect(within(sidebar).getByText('No direct sub-streams yet.')).toBeInTheDocument();
    expect(within(sidebar).getByText('0')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create sub-stream' }));
    const dialog = await screen.findByRole('heading', { name: 'Create Sub-stream' });
    const form = dialog.closest('form') ?? dialog.parentElement?.querySelector('form');
    if (!form) throw new Error('workstream create form not found');

    fireEvent.change(within(form).getByLabelText(/Name/), {
      target: { value: 'New execution lane' },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith('/api/workstreams/520'));
    expect(
      await within(sidebar).findByRole('link', { name: /521\s+New execution lane/ }),
    ).toBeInTheDocument();
    expect(within(sidebar).getByText('1')).toBeInTheDocument();
    expect(within(sidebar).queryByText('No direct sub-streams yet.')).not.toBeInTheDocument();
  });
});
