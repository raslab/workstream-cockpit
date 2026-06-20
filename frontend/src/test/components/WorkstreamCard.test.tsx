import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

vi.mock('../../api/client', () => ({
  apiClient: { put: vi.fn() },
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
    status: 'Latest work happened in child stream: weekly lessons are moving.',
    note: null,
    createdAt: '2026-06-19T10:00:00Z',
    updatedAt: '2026-06-19T10:00:00Z',
  },
  allTags: ['learning', 'English', 'speaking', 'weekly', 'practice', 'Mathew'],
  parentId: 'parent-1',
  parent: { id: 'parent-1', name: 'Goals', state: 'active' },
  childCount: 3,
  activeChildCount: 2,
  closedChildCount: 1,
  lastDirectUpdateAt: '2026-06-19T10:00:00Z',
  lastSubstreamActivityAt: '2026-06-20T10:00:00Z',
  lastActivityAt: '2026-06-20T10:00:00Z',
  latestSubstreamActivitySource: { id: 'child-1', workstreamId: 'child-1', name: 'Schedule 11 English classes' },
  ...overrides,
});

describe('WorkstreamCard tile layout', () => {
  let rectSpy: ReturnType<typeof vi.spyOn>;
  let mockTagsWidth = 600;

  beforeEach(() => {
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

  it('renders the redesigned category, parent, self and child activity regions', () => {
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

    const titleLink = screen.getByRole('link', { name: /English learning plan/ });
    expect(titleLink).toHaveAttribute('href', '/workstreams/stream-1');
    expect(titleLink.closest('article')).not.toHaveClass('gap-x-3');
    expect(screen.getByRole('heading', { name: 'English learning plan' })).toHaveClass('text-base', 'font-semibold');
    expect(screen.getByText('Latest work happened in child stream: weekly lessons are moving.')).toHaveClass('text-sm');
    expect(screen.getByText('Parent: Goals')).toBeInTheDocument();
    const parentLink = screen.getByText('Parent: Goals').closest('a');
    expect(parentLink).toHaveClass('min-w-0', 'overflow-hidden', 'pr-36');
    expect(parentLink).not.toHaveClass('pr-4');
    expect(screen.getByText('Parent: Goals')).toHaveClass('truncate');
    expect(screen.getByRole('button', { name: 'Log status' })).toHaveClass('absolute', 'right-2', 'top-2');
    expect(screen.getByRole('button', { name: 'Log status' }).className).not.toContain('row-start');
    expect(screen.getByText(/Self:/)).toBeInTheDocument();
    expect(screen.getByText(/Child:/)).toBeInTheDocument();
    expect(screen.getByText(/via Schedule 11 English classes/)).toBeInTheDocument();
    expect(screen.getByText('2 active / 1 closed sub-streams')).toBeInTheDocument();
  });

  it('does not render or reserve a tags region when the workstream has no tags', () => {
    renderCard(baseWorkstream({ allTags: [] }));

    expect(screen.queryByTestId('workstream-tags')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument();
  });

  it('stretches the tile to the grid row height while keeping content compact at the top', () => {
    renderCard(baseWorkstream());

    const card = screen.getByRole('heading', { name: 'English learning plan' }).closest('article');
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
});
