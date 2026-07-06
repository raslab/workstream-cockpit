import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WorkstreamCreateDialog } from '../../components/Workstream/WorkstreamCreateDialog';
import { ParentSelectorDialog } from '../../components/Workstream/ParentSelectorDialog';
import { WorkstreamCard } from '../../components/Workstream/WorkstreamCard';
import { SubstreamsSection } from '../../components/Workstream/SubstreamsSection';
import { getStatusUpdateSource, getLatestSubstreamActivitySourceId } from '../../utils/hierarchy';
import type { Workstream, StatusUpdate } from '../../types/workstream';

const apiPost = vi.hoisted(() => vi.fn());
const workstreamReferencesMock = vi.hoisted(() => vi.fn());

vi.mock('../../api/client', () => ({
  apiClient: { post: apiPost, put: vi.fn() },
}));

vi.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({ data: [] }),
}));

vi.mock('../../hooks/useWorkstreamReferences', () => ({
  useWorkstreamReferences: (options: unknown) => ({ data: workstreamReferencesMock(options) }),
}));

vi.mock('../../hooks/useTags', () => ({
  useTags: () => ({ data: [] }),
}));

const baseWorkstream = (overrides: Partial<Workstream> = {}): Workstream => ({
  id: 'parent-1',
  projectId: 'project-1',
  name: 'Parent',
  categoryId: null,
  context: null,
  state: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  closedAt: null,
  allTags: [],
  ...overrides,
});

const renderWithQuery = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('frontend parent stream review blockers', () => {
  beforeEach(() => {
    apiPost.mockReset();
    workstreamReferencesMock.mockReset();
    workstreamReferencesMock.mockReturnValue([]);
  });

  it('proactively blocks creating a sub-stream under a closed parent with the exact message', () => {
    renderWithQuery(
      <WorkstreamCreateDialog
        isOpen
        onClose={vi.fn()}
        parent={baseWorkstream({ state: 'closed', closedAt: '2026-01-02T00:00:00Z' })}
      />,
    );

    expect(
      screen.getByText('Cannot create a sub-stream under a closed parent.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Sub-stream' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(apiPost).not.toHaveBeenCalled();
  });

  it('shows substream row activity age and source from backend fields', () => {
    render(
      <MemoryRouter>
        <SubstreamsSection
          workstream={baseWorkstream({
            substreams: [
              {
                id: 'substream-1',
                name: 'Sub-stream',
                state: 'active',
                lastActivityAt: '2026-06-20T10:00:00Z',
                latestSubstreamActivitySource: {
                  id: 'source-row',
                  workstreamId: 'source-1',
                  workstreamName: 'Nested sub-stream',
                },
              },
            ],
          })}
          onCreateSubstream={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Last activity')).toBeInTheDocument();
    expect(screen.getByText(/from/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nested sub-stream' })).toHaveAttribute(
      'href',
      '/workstreams/source-1',
    );
  });

  it('uses a searchable fuzzy parent picker instead of a plain long dropdown', () => {
    workstreamReferencesMock.mockReturnValue([
      baseWorkstream({ id: 'alpha-1', name: 'Alpha One' }),
      baseWorkstream({ id: 'beta-1', name: 'Beta Stream' }),
      baseWorkstream({ id: 'arch-1', name: 'Archive Project' }),
    ]);

    renderWithQuery(
      <ParentSelectorDialog
        isOpen
        onClose={vi.fn()}
        workstream={baseWorkstream({ id: 'substream-1', name: 'Sub-stream', parentId: null })}
      />,
    );

    expect(screen.queryByRole('combobox', { name: 'Parent stream' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search parent streams' }), {
      target: { value: 'al on' },
    });

    expect(screen.getByRole('button', { name: /Alpha One/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Beta Stream/ })).not.toBeInTheDocument();
  });

  it('does not load parent references from closed workstream cards until the parent picker opens', () => {
    renderWithQuery(
      <MemoryRouter>
        <WorkstreamCard workstream={baseWorkstream({ id: 'stream-1', name: 'Visible stream' })} />
      </MemoryRouter>,
    );

    expect(workstreamReferencesMock).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'active', enabled: false }),
    );
    expect(workstreamReferencesMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ state: 'active', enabled: true }),
    );
  });

  it('normalizes status history source and latest activity source ID backend shapes', () => {
    const flatSourceUpdate = {
      id: 'update-1',
      workstreamId: 'substream-1',
      status: 'Done',
      note: null,
      createdAt: '2026-06-20T10:00:00Z',
      updatedAt: '2026-06-20T10:00:00Z',
      source: { id: 'legacy-source-id', workstreamId: 'substream-1', workstreamName: 'Sub-stream' },
    } as StatusUpdate;

    expect(getStatusUpdateSource(flatSourceUpdate)?.workstreamName).toBe('Sub-stream');
    expect(
      getLatestSubstreamActivitySourceId({ id: 'legacy-source-id', workstreamId: 'substream-1' }),
    ).toBe('substream-1');
  });
});
