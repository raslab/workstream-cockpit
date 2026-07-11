import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateVisibleTagCount, WorkstreamCard } from '../../components/Workstream/WorkstreamCard';
import type { Workstream } from '../../types/workstream';
import { getCategoryIconBandBackground } from '../../utils/categoryColor';

vi.mock('../../components/Markdown/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content, className }: { content: string; className?: string }) => <p className={className}>{content}</p>,
}));

vi.mock('../../components/Tag/TagChip', () => ({
  TagChip: ({ tagName }: { tagName: string }) => <button title={`Tag ID: #${tagName}`} className="min-w-0 max-w-full truncate">#{tagName}</button>,
}));

const apiGetMock = vi.hoisted(() => vi.fn());
const apiPutMock = vi.hoisted(() => vi.fn());

vi.mock('../../api/client', () => ({
  apiClient: { get: apiGetMock, put: apiPutMock },
}));

const renderCard = (workstream: Workstream) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <WorkstreamCard workstream={workstream} />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

function LocationPath() {
  const location = useLocation();
  return <output aria-label="Current path">{location.pathname}</output>;
}

const renderCardWithLocation = (workstream: Workstream) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <LocationPath />
        <Routes>
          <Route path="*" element={<WorkstreamCard workstream={workstream} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

function CachedCard({ workstream }: { workstream: Workstream }) {
  const { data = [] } = useQuery({ queryKey: ['workstreams', { state: 'active' }], queryFn: () => new Promise<Workstream[]>(() => undefined), initialData: [workstream] });
  return <WorkstreamCard workstream={data[0]} />;
}

const renderCachedCard = (workstream: Workstream) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter><CachedCard workstream={workstream} /></MemoryRouter></QueryClientProvider>);
};

const baseWorkstream = (overrides: Partial<Workstream> = {}): Workstream => ({
  id: 'stream-1',
  projectId: 'project-1',
  name: 'English learning plan',
  categoryId: 'cat-1',
  context: null,
  state: 'active',
  createdAt: '2026-06-01T00:00:00Z',
  closedAt: null,
  category: { id: 'cat-1', name: 'goals', color: '#74d84f', emoji: '🌟', sortOrder: 1 },
  latestStatus: {
    id: 'status-1',
    workstreamId: 'stream-1',
    status: 'Latest work happened in sub-stream: weekly lessons are moving.',
    note: null,
    createdAt: '2026-06-19T10:00:00Z',
    updatedAt: '2026-06-19T10:00:00Z',
  },
  allTags: ['learning', 'English', 'speaking', 'weekly', 'practice', 'Mathew'],
  parentId: 'parent-1',
  parent: { id: 'parent-1', name: 'Goals', state: 'active' },
  substreamCount: 3,
  activeSubstreamCount: 2,
  closedSubstreamCount: 1,
  lastDirectUpdateAt: '2026-06-19T10:00:00Z',
  lastSubstreamActivityAt: '2026-06-20T10:00:00Z',
  lastActivityAt: '2026-06-20T10:00:00Z',
  latestSubstreamActivitySource: { id: 'substream-1', workstreamId: 'substream-1', name: 'Schedule 11 English classes' },
  ...overrides,
});

describe('WorkstreamCard tile layout', () => {
  let rectSpy: ReturnType<typeof vi.spyOn>;
  let mockTagsWidth = 600;

  beforeEach(() => {
    apiGetMock.mockReset();
    apiPutMock.mockReset();
    apiGetMock.mockImplementation((url: string) => Promise.resolve({ data: url === '/api/categories' ? [baseWorkstream().category] : { tags: [] } }));
    mockTagsWidth = 600;
    rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function getMockRect() {
      const element = this as HTMLElement;
      let width = 0;

      if (element.dataset.testid === 'workstream-tags' || element.parentElement?.dataset.testid === 'workstream-tags') {
        width = mockTagsWidth;
      } else if (element.dataset.tagName) {
        width = Number(element.dataset.mockWidth || 70);
      } else if (element.textContent?.match(/^\+\d+$/)) {
        width = 34;
      }

      return { width, height: 20, x: 0, y: 0, top: 0, left: 0, right: width, bottom: 20, toJSON: () => ({}) } as DOMRect;
    });
  });

  afterEach(() => {
    rectSpy.mockRestore();
  });

  it('renders the redesigned category, parent, self and sub-stream activity regions', () => {
    renderCard(baseWorkstream());
    const expectedCategoryBandBackground = getCategoryIconBandBackground('#74d84f', '#5b8ca0');

    expect(screen.getByTestId('workstream-category-rail')).toHaveStyle({ backgroundColor: '#74d84f' });
    expect(screen.getByTestId('workstream-category-column')).toHaveClass('inset-y-0', 'left-[7px]', 'w-[66px]');
    expect(screen.getByRole('heading', { name: 'English learning plan' }).closest('article')).toHaveStyle({
      '--workstream-category-soft': expectedCategoryBandBackground,
    });
    expect(screen.getByTestId('workstream-category-icon')).toHaveClass('absolute', 'left-[18px]', 'top-2');
    expect(screen.getByTestId('workstream-category-icon')).toHaveStyle({
      backgroundColor: expectedCategoryBandBackground,
    });
    expect(screen.getByTestId('workstream-category-icon').className).not.toContain('row-start');
    expect(screen.getByTestId('workstream-category-icon').className).not.toContain('mt-4');

    expect(screen.getByRole('heading', { name: 'English learning plan' }).closest('article')).not.toHaveClass('gap-x-3');
    expect(screen.getByRole('heading', { name: 'English learning plan' })).toHaveClass('text-base', 'font-semibold');
    expect(screen.getByText('Latest work happened in sub-stream: weekly lessons are moving.')).toHaveClass('text-sm');
    expect(screen.getByText(/Parent:/)).toHaveTextContent('Parent: Goals');
    const parentRow = screen.getByTestId('workstream-parent-row');
    expect(parentRow).toHaveClass('min-w-0', 'overflow-hidden', 'pr-36');
    const parentLink = screen.getByText(/Parent:/).closest('a');
    expect(parentLink).toHaveClass('inline-flex', 'max-w-full', 'min-w-0', 'overflow-hidden');
    expect(parentLink).not.toHaveClass('pr-4');
    expect(screen.getByText(/Parent:/)).toHaveClass('truncate');
    expect(screen.getByRole('button', { name: 'Log status' })).toHaveClass('absolute', 'right-2', 'top-2');
    expect(screen.getByRole('button', { name: 'Log status' }).className).not.toContain('row-start');
    expect(screen.getByText(/Self:/)).toBeInTheDocument();
    expect(screen.getByText(/Sub-stream:/)).toBeInTheDocument();
    expect(screen.getByText(/via/)).toBeInTheDocument();
    expect(screen.getByText('Schedule 11 English classes')).toBeInTheDocument();
    expect(screen.getByText('2 active / 1 closed sub-streams')).toBeInTheDocument();

    const activityRow = screen.getByText(/Self:/).parentElement?.parentElement;
    expect(activityRow).toHaveClass('flex-nowrap', 'overflow-hidden');
    expect(activityRow?.className).not.toContain('flex-wrap');
    expect(activityRow).not.toContainElement(screen.getByText('2 active / 1 closed sub-streams'));

    const selfPill = screen.getByText(/Self:/).parentElement;
    expect(selfPill).toHaveClass('flex-none', 'whitespace-nowrap');

    const substreamPill = screen.getByText(/Sub-stream:/).parentElement;
    expect(substreamPill).toHaveClass('min-w-0', 'flex-1', 'overflow-hidden');
    const sourceLink = screen.getByRole('link', { name: 'Schedule 11 English classes' });
    expect(sourceLink).toHaveClass('min-w-0', 'flex-1', 'truncate');
    expect(sourceLink).toHaveAttribute('title', 'Schedule 11 English classes');

    const substreamCountRow = screen.getByText('2 active / 1 closed sub-streams').parentElement;
    expect(substreamCountRow).toHaveClass('row-start-5', 'pt-2');
    expect(substreamCountRow).not.toBe(activityRow);

    expect(screen.getByTestId('workstream-tags')).toHaveClass('row-start-6');
  });

  it('exposes localized timestamps for self and sub-stream activity labels', () => {
    const workstream = baseWorkstream();
    renderCard(workstream);
    const exact = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

    expect(screen.getByText(/Self:/).parentElement?.querySelector('time')).toHaveAttribute('title', exact(workstream.lastDirectUpdateAt!));
    expect(screen.getByText(/Sub-stream:/).parentElement?.querySelector('time')).toHaveAttribute('title', exact(workstream.lastSubstreamActivityAt!));
  });

  it('shows public stream numbers and links with them when available', () => {
    renderCard(baseWorkstream({ number: 28, parent: { id: 'parent-1', number: 7, name: 'Goals', state: 'active' } }));

    expect(screen.queryByText('Stream #28')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#28 English learning plan' })).toHaveAttribute('href', '/workstreams/28');
    expect(screen.getByRole('heading', { name: /#28\s+English learning plan/ })).toBeInTheDocument();
    expect(screen.getByText(/Parent:/)).toHaveTextContent('Parent: #7 Goals');
    expect(screen.getByText(/Parent:/).closest('a')).toHaveAttribute('href', '/workstreams/7');
  });

  it('keeps parent navigation limited to the visible parent text link', () => {
    renderCardWithLocation(baseWorkstream({ parent: { id: 'parent-1', number: 7, name: 'Goals', state: 'active' } }));

    fireEvent.click(screen.getByTestId('workstream-parent-row'));
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/');

    fireEvent.click(screen.getByRole('link', { name: 'Parent: #7 Goals' }));
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/workstreams/7');
  });

  it('navigates to the stream from the main title link', () => {
    renderCardWithLocation(baseWorkstream({ number: 28 }));

    fireEvent.click(screen.getByRole('link', { name: '#28 English learning plan' }));
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/workstreams/28');
  });

  it('shows open next step count using Next steps terminology and never todo wording', () => {
    renderCard(baseWorkstream({ nextStepCount: 3 }));

    expect(screen.getByText('3 next steps')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /English learning plan/ }).closest('article')).not.toHaveTextContent(/todo/i);
  });

  it('singularizes one open next step', () => {
    renderCard(baseWorkstream({ nextStepCount: 1, allTags: [], substreamCount: 0 }));

    expect(screen.getByText('1 next step')).toBeInTheDocument();
    expect(screen.queryByText('1 next steps')).not.toBeInTheDocument();
  });

  it('does not render or reserve a tags region when the workstream has no tags', () => {
    renderCard(baseWorkstream({ allTags: [] }));

    expect(screen.queryByTestId('workstream-tags')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument();
  });

  it('renders backend-provided stream tags even without a latest status update', () => {
    renderCard(baseWorkstream({ latestStatus: undefined, allTags: ['platform', 'launch_risk'] }));

    expect(screen.getByText('No status updates yet')).toBeInTheDocument();
    expect(screen.getByTitle('Tag ID: #platform')).toBeInTheDocument();
    expect(screen.getByTitle('Tag ID: #launch_risk')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'English learning plan' }).closest('article')).not.toHaveTextContent('No tags');
  });

  it('renders an initial update as the latest self-update preview without active freshness metadata', () => {
    renderCard(baseWorkstream({
      latestStatus: {
        id: 'initial-status-1',
        workstreamId: 'stream-1',
        status: 'Initial background context for the new stream.',
        note: null,
        impact: 'initial',
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
      lastDirectUpdateAt: null,
      lastActivityAt: null,
      lastSubstreamActivityAt: null,
      latestSubstreamActivitySource: null,
    }));

    expect(screen.getByText('Initial background context for the new stream.')).toBeInTheDocument();
    expect(screen.queryByText('No status updates yet')).not.toBeInTheDocument();
    const selfPill = screen.getByText(/Self:/).parentElement;
    expect(selfPill).toHaveTextContent(/Self:.*ago/);
    expect(selfPill).not.toHaveTextContent('no updates');
  });

  it('uses stream creation time for the empty self-update state', () => {
    renderCard(baseWorkstream({
      latestStatus: undefined,
      lastDirectUpdateAt: null,
      lastActivityAt: null,
      lastSubstreamActivityAt: null,
      latestSubstreamActivitySource: null,
    }));

    expect(screen.getByText('No status updates yet')).toBeInTheDocument();
    expect(screen.getByText(/Created:/).parentElement).toHaveTextContent(/Created:.*ago/);
    expect(screen.queryByText(/no updates/)).not.toBeInTheDocument();
  });

  it('stretches the tile to the grid row height while keeping content compact at the top', () => {
    renderCard(baseWorkstream());

    const card = screen.getByRole('heading', { name: /English learning plan/ }).closest('article');
    expect(card).toHaveClass('h-full', 'content-start');
    expect(card).not.toHaveClass('content-between', 'gap-y-4', 'gap-y-5', 'gap-y-6');
  });

  it('calculates visible tags from available width instead of a fixed count', () => {
    expect(calculateVisibleTagCount(600, [70, 70, 70, 70, 70, 70, 70], 34)).toBe(7);
    expect(calculateVisibleTagCount(260, [70, 70, 70, 70, 70, 70, 70], 34)).toBe(2);
    expect(calculateVisibleTagCount(20, [70, 70, 70], 34)).toBe(0);
  });

  it('shows every tag with no overflow chip when all tags fit the measured width', () => {
    const tags = ['learning', 'English', 'speaking', 'weekly', 'practice', 'Mathew', 'long-topic-name'];
    renderCard(baseWorkstream({ allTags: tags }));

    for (const tag of tags) {
      expect(screen.getByTitle(`Tag ID: #${tag}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('hidden-tags-count')).not.toBeInTheDocument();
    expect(screen.queryByText(/^\+N$/i)).not.toBeInTheDocument();
    const tagsRegion = screen.getByTestId('workstream-tags');
    expect(tagsRegion).toHaveClass('overflow-hidden', 'flex-nowrap');
    expect(tagsRegion.className).not.toContain('flex-wrap');
    expect(tagsRegion.className).not.toContain('max-w-[9rem]');
  });

  it('collapses width-overflowed tags into a gray +N chip', async () => {
    const tags = ['learning', 'English', 'speaking', 'weekly', 'practice', 'Mathew', 'long-topic-name'];
    mockTagsWidth = 260;
    renderCard(baseWorkstream({ allTags: tags }));

    await waitFor(() => expect(screen.getByTestId('hidden-tags-count')).toHaveTextContent('+5'));

    expect(screen.getByTitle('Tag ID: #learning')).toBeInTheDocument();
    expect(screen.getByTitle('Tag ID: #English')).toBeInTheDocument();
    expect(screen.queryByTitle('Tag ID: #speaking')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Tag ID: #long-topic-name')).not.toBeInTheDocument();
    expect(screen.getByTestId('hidden-tags-count')).toHaveClass('bg-gray-200', 'text-gray-700');
    expect(screen.getByTestId('hidden-tags-count')).toHaveAttribute('aria-label', '5 hidden tags');
  });

  it('uses filled visible dots for the More icon', () => {
    renderCard(baseWorkstream());

    const moreButton = screen.getByRole('button', { name: 'More' });
    expect(moreButton).toHaveAttribute('aria-label', 'More');
    const dots = moreButton.querySelectorAll('[data-testid="more-icon-dot"]');
    expect(dots).toHaveLength(3);
    dots.forEach((dot) => {
      expect(dot).toHaveAttribute('fill', 'currentColor');
      expect(dot).toHaveAttribute('r', '1.8');
    });
  });

  it('opens the existing stream edit dialog from the options menu with current values', async () => {
    renderCard(baseWorkstream({ context: 'Current cockpit context' }));
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit stream' }));
    expect(await screen.findByRole('heading', { name: /Edit.*English learning plan/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toHaveValue('English learning plan');
    expect(await screen.findByRole('button', { name: /Category \(optional\).*goals/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Context')).toHaveValue('Current cockpit context');
  });

  it('updates the visible card immediately after a successful edit', async () => {
    apiPutMock.mockResolvedValue({ data: baseWorkstream({ name: 'Corrected stream name', context: 'Corrected context' }) });
    renderCachedCard(baseWorkstream({ context: 'Old context' }));
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit stream' }));
    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: 'Corrected stream name' } });
    fireEvent.change(screen.getByLabelText('Context'), { target: { value: 'Corrected context' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(apiPutMock).toHaveBeenCalledWith('/api/workstreams/stream-1', { name: 'Corrected stream name', categoryId: 'cat-1', context: 'Corrected context' }));
    expect(await screen.findByRole('heading', { name: 'Corrected stream name' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
  });

  it('cancels a changed edit without updating the stream', async () => {
    renderCard(baseWorkstream());
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit stream' }));
    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: 'Unsaved corrected name' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Discard changes?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText(/^Name/)).toHaveValue('Unsaved corrected name');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(apiPutMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'English learning plan' })).toBeInTheDocument();
  });

  it('keeps the edit dialog open with feedback and entered values after an update failure', async () => {
    apiPutMock.mockRejectedValue(new Error('update failed'));
    renderCard(baseWorkstream());
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit stream' }));
    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: 'Unsaved corrected name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByText('Failed to update workstream. Please try again.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toHaveValue('Unsaved corrected name');
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

});
