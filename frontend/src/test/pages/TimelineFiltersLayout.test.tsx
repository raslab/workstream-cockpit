import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const useTimelineMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useTimeline', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/useTimeline')>('../../hooks/useTimeline');
  return { ...actual, useTimeline: useTimelineMock };
});

vi.mock('../../hooks/useWorkstreams', () => ({
  useWorkstreams: () => ({ data: [{ id: 'parent-1', name: 'Parent stream' }] }),
}));

vi.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({ data: [{ id: 'cat-1', name: 'Operations', color: '#2563eb', emoji: '⚙️' }] }),
}));

vi.mock('../../api/tags', () => ({
  useTags: () => ({ data: [{ id: 'tag-1', name: 'priority', displayName: 'Priority', color: '#dc2626' }], isLoading: false }),
}));

vi.mock('../../components/Markdown/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <span>{content}</span>,
}));

import Timeline from '../../pages/Timeline';

describe('Timeline filters layout', () => {
  beforeEach(() => {
    useTimelineMock.mockReset();
    useTimelineMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: [
        {
          id: 'entry-1',
          eventType: 'status_update',
          workstreamId: 'stream-1',
          workstreamName: 'Launch plan',
          createdAt: '2026-06-20T10:00:00Z',
          status: 'On track',
          category: null,
        },
      ],
    });
  });

  it('places legacy filters, parent/sub-stream filters, and export action in one shared panel', () => {
    render(<MemoryRouter><Timeline /></MemoryRouter>);

    const panel = screen.getByTestId('timeline-filters-panel');
    const dateFilter = screen.getByRole('button', { name: /Time range.*Last 7 days/ });
    const categoriesFilter = screen.getByRole('button', { name: /Categories.*All categories/ });
    const tagsFilter = screen.getByRole('button', { name: /Tags.*All tags/ });
    const hierarchyFilter = screen.getByRole('button', { name: /Stream scope.*All streams/ });
    const activityFilter = screen.getByRole('button', { name: /Activity type.*All activity/ });
    const includeSubstreams = screen.getByRole('checkbox', { name: /Include sub-stream activity/ });
    const exportButton = screen.getByRole('button', { name: /Export 1 timeline entries to CSV/ });

    for (const control of [
      dateFilter,
      categoriesFilter,
      tagsFilter,
      hierarchyFilter,
      activityFilter,
      includeSubstreams,
      exportButton,
    ]) {
      expect(panel).toContainElement(control);
      expect(control.closest('[data-testid="timeline-filters-panel"]')).toBe(panel);
    }

    expect(screen.getByText('Time range')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.queryByTestId('timeline-parent-stream-filters-panel')).not.toBeInTheDocument();
  });

  it('closes the categories dropdown when clicking outside', () => {
    render(<MemoryRouter><Timeline /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /Categories.*All categories/ }));
    expect(screen.getByText('Operations')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByText('Operations')).not.toBeInTheDocument();
  });
});
