import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { WorkstreamCard } from '../../components/Workstream/WorkstreamCard';
import type { Workstream } from '../../types/workstream';

vi.mock('../../components/Markdown/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content, className }: { content: string; className?: string }) => <p className={className}>{content}</p>,
}));

vi.mock('../../components/Tag/TagChip', () => ({
  TagChip: ({ tagName }: { tagName: string }) => <button title={`Tag ID: #${tagName}`}>#{tagName}</button>,
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
  it('renders the redesigned category, parent, self and child activity regions', () => {
    renderCard(baseWorkstream());

    expect(screen.getByTestId('workstream-category-rail')).toHaveStyle({ backgroundColor: '#74d84f' });
    expect(screen.getByTestId('workstream-category-column')).toHaveClass('inset-y-0', 'left-[7px]', 'w-[66px]');
    expect(screen.getByTestId('workstream-category-icon')).toHaveClass('col-start-2');
    expect(screen.getByTestId('workstream-category-icon').className).not.toContain('mt-4');

    const titleLink = screen.getByRole('link', { name: /English learning plan/ });
    expect(titleLink).toHaveAttribute('href', '/workstreams/stream-1');
    expect(titleLink.closest('article')).not.toHaveClass('gap-x-3');
    expect(screen.getByRole('heading', { name: 'English learning plan' })).toHaveClass('text-base', 'font-semibold');
    expect(screen.getByText('Latest work happened in child stream: weekly lessons are moving.')).toHaveClass('text-sm');
    expect(screen.getByText('Parent: Goals')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log status' })).toBeInTheDocument();
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

  it('renders every tag and relies on width-based CSS truncation instead of fixed count truncation', () => {
    const tags = ['learning', 'English', 'speaking', 'weekly', 'practice', 'Mathew', 'long-topic-name'];
    renderCard(baseWorkstream({ allTags: tags }));

    for (const tag of tags) {
      expect(screen.getByTitle(`Tag ID: #${tag}`)).toBeInTheDocument();
    }
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^\+N$/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('workstream-tags')).toHaveClass('flex-wrap');
    expect(screen.getByTestId('workstream-tags').className).not.toContain('max-w-[9rem]');
  });
});
