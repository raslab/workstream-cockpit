import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WorkstreamCreateDialog } from '../../components/Workstream/WorkstreamCreateDialog';
import { ParentSelectorDialog } from '../../components/Workstream/ParentSelectorDialog';
import { SubstreamsSection } from '../../components/Workstream/SubstreamsSection';
import { getStatusUpdateSource, getLatestSubstreamActivitySourceId } from '../../utils/hierarchy';
import type { Workstream, StatusUpdate } from '../../types/workstream';

const apiPost = vi.hoisted(() => vi.fn());
const workstreamsMock = vi.hoisted(() => vi.fn());

vi.mock('../../api/client', () => ({
  apiClient: { post: apiPost, put: vi.fn() },
}));

vi.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({ data: [] }),
}));

vi.mock('../../hooks/useWorkstreams', () => ({
  useWorkstreams: () => ({ data: workstreamsMock() }),
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('frontend hierarchy review blockers', () => {
  beforeEach(() => {
    apiPost.mockReset();
    workstreamsMock.mockReset();
    workstreamsMock.mockReturnValue([]);
  });

  it('proactively blocks creating a sub-stream under a closed parent with the exact message', () => {
    renderWithQuery(
      <WorkstreamCreateDialog
        isOpen
        onClose={vi.fn()}
        parent={baseWorkstream({ state: 'closed', closedAt: '2026-01-02T00:00:00Z' })}
      />
    );

    expect(screen.getByText('Cannot create a sub-stream under a closed parent.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Child stream' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(apiPost).not.toHaveBeenCalled();
  });

  it('shows substream row activity age and source from backend fields', () => {
    render(
      <MemoryRouter>
        <SubstreamsSection
          workstream={baseWorkstream({
            children: [
              {
                id: 'child-1',
                name: 'Child',
                state: 'active',
                lastActivityAt: '2026-06-20T10:00:00Z',
                latestSubstreamActivitySource: { id: 'source-row', workstreamId: 'source-1', workstreamName: 'Deep child' },
              },
            ],
          })}
          onCreateSubstream={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Last activity')).toBeInTheDocument();
    expect(screen.getByText(/from/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Deep child' })).toHaveAttribute('href', '/workstreams/source-1');
  });

  it('uses a searchable fuzzy parent picker instead of a plain long dropdown', () => {
    workstreamsMock.mockReturnValue([
      baseWorkstream({ id: 'alpha-1', name: 'Alpha One' }),
      baseWorkstream({ id: 'beta-1', name: 'Beta Stream' }),
      baseWorkstream({ id: 'arch-1', name: 'Archive Project' }),
    ]);

    renderWithQuery(
      <ParentSelectorDialog
        isOpen
        onClose={vi.fn()}
        workstream={baseWorkstream({ id: 'child-1', name: 'Child stream', parentId: null })}
      />
    );

    expect(screen.queryByRole('combobox', { name: 'Parent stream' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search parent streams' }), { target: { value: 'al on' } });

    expect(screen.getByRole('button', { name: /Alpha One/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Beta Stream/ })).not.toBeInTheDocument();
  });

  it('normalizes status history source and latest activity source ID backend shapes', () => {
    const flatSourceUpdate = {
      id: 'update-1',
      workstreamId: 'child-1',
      status: 'Done',
      note: null,
      createdAt: '2026-06-20T10:00:00Z',
      updatedAt: '2026-06-20T10:00:00Z',
      source: { id: 'legacy-source-id', workstreamId: 'child-1', workstreamName: 'Child stream' },
    } as StatusUpdate;

    expect(getStatusUpdateSource(flatSourceUpdate)?.workstreamName).toBe('Child stream');
    expect(getLatestSubstreamActivitySourceId({ id: 'legacy-source-id', workstreamId: 'child-1' })).toBe('child-1');
  });
});
