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
    expect(screen.getByTestId('workstream-category-icon')).toHaveTextContent('🌟');
    expect(screen.getByRole('link', { name: /English learning plan/ })).toHaveAttribute('href', '/workstreams/stream-1');
    expect(screen.getByText('Parent: Goals')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log status' })).toBeInTheDocument();
    expect(screen.getByText(/Self:/)).toBeInTheDocument();
    expect(screen.getByText(/Child:/)).toBeInTheDocument();
    expect(screen.getByText(/via Schedule 11 English classes/)).toBeInTheDocument();
    expect(screen.getByText('2 active / 1 closed sub-streams')).toBeInTheDocument();
  });

  it('renders every tag and relies on width-based CSS truncation instead of fixed count truncation', () => {
    const tags = ['learning', 'English', 'speaking', 'weekly', 'practice', 'Mathew', 'long-topic-name'];
    renderCard(baseWorkstream({ allTags: tags }));

    for (const tag of tags) {
      expect(screen.getByTitle(`Tag ID: #${tag}`)).toBeInTheDocument();
    }
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    expect(screen.getByTestId('workstream-tags')).toHaveClass('overflow-hidden');
    expect(screen.getByTestId('workstream-tags').className).not.toContain('max-w-[9rem]');
  });
});
