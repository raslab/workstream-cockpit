import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
} from 'date-fns';

const useTimelineMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useTimeline', async () => {
  const actual =
    await vi.importActual<typeof import('../../hooks/useTimeline')>('../../hooks/useTimeline');
  return { ...actual, useTimeline: useTimelineMock };
});

vi.mock('../../hooks/useWorkstreams', () => ({
  useWorkstreams: () => ({ data: [{ id: 'parent-1', name: 'Parent stream' }] }),
}));

vi.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({ data: [] }),
}));

vi.mock('../../api/tags', () => ({
  useTags: () => ({ data: [], isLoading: false }),
}));

vi.mock('../../components/Markdown/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <span>{content}</span>,
}));

import Timeline from '../../pages/Timeline';

const entry = {
  id: 'entry-1',
  eventType: 'status_update' as const,
  workstreamId: 'stream-1',
  workstreamName: 'Launch plan',
  createdAt: '2026-06-20T10:00:00Z',
  status: 'On track',
  category: null,
};

describe('Timeline date quick filters and pagination', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T12:00:00Z'));
    useTimelineMock.mockReset();
    useTimelineMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: { events: [entry], nextCursor: 'cursor-page-2' },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to the last 7 days and requests the first page with page size 50', () => {
    render(
      <MemoryRouter>
        <Timeline />
      </MemoryRouter>,
    );

    expect(useTimelineMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: startOfDay(subDays(new Date('2026-06-21T12:00:00Z'), 7)),
        endDate: endOfDay(new Date('2026-06-21T12:00:00Z')),
        limit: 50,
        cursor: undefined,
      }),
    );
    expect(screen.getByRole('button', { name: /Time range.*Last 7 days/ })).toBeInTheDocument();
    expect(screen.getAllByText('Page 1')).toHaveLength(2);
  });

  it('shows an info chip after the update number for info updates', () => {
    useTimelineMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: { events: [{ ...entry, statusUpdateNumber: 17, impact: 'info' }], nextCursor: null },
    });

    render(
      <MemoryRouter>
        <Timeline />
      </MemoryRouter>,
    );

    const updateRef = screen.getByText(/update #17/).parentElement;
    expect(updateRef).toHaveTextContent('info');
  });

  it('applies 14, 30, and 60 day quick filters and resets pagination', () => {
    render(
      <MemoryRouter>
        <Timeline />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Next page' })[0]);
    expect(useTimelineMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cursor: 'cursor-page-2',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Time range.*Last 7 days/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Last 14 days' }));

    expect(useTimelineMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: startOfDay(subDays(new Date('2026-06-21T12:00:00Z'), 14)),
        endDate: endOfDay(new Date('2026-06-21T12:00:00Z')),
        cursor: undefined,
      }),
    );
    expect(screen.getAllByText('Page 1')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /Time range.*Last 14 days/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));

    expect(useTimelineMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: startOfDay(subDays(new Date('2026-06-21T12:00:00Z'), 30)),
        endDate: endOfDay(new Date('2026-06-21T12:00:00Z')),
        cursor: undefined,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Time range.*Last 30 days/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Last 60 days' }));

    expect(useTimelineMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: startOfDay(subDays(new Date('2026-06-21T12:00:00Z'), 60)),
        endDate: endOfDay(new Date('2026-06-21T12:00:00Z')),
        cursor: undefined,
      }),
    );
  });

  it('applies month and quarter quick filters', () => {
    render(
      <MemoryRouter>
        <Timeline />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Time range.*Last 7 days/ }));
    fireEvent.click(screen.getByRole('button', { name: 'This month' }));

    expect(useTimelineMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: startOfMonth(new Date('2026-06-21T12:00:00Z')),
        endDate: endOfDay(new Date('2026-06-21T12:00:00Z')),
        cursor: undefined,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Time range.*This month/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));

    expect(useTimelineMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: startOfMonth(subMonths(new Date('2026-06-21T12:00:00Z'), 1)),
        endDate: endOfMonth(subMonths(new Date('2026-06-21T12:00:00Z'), 1)),
        cursor: undefined,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Time range.*Previous month/ }));
    fireEvent.click(screen.getByRole('button', { name: 'This quarter' }));

    expect(useTimelineMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: startOfQuarter(new Date('2026-06-21T12:00:00Z')),
        endDate: endOfDay(new Date('2026-06-21T12:00:00Z')),
        cursor: undefined,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Time range.*This quarter/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous quarter' }));

    expect(useTimelineMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: startOfQuarter(subQuarters(new Date('2026-06-21T12:00:00Z'), 1)),
        endDate: endOfQuarter(subQuarters(new Date('2026-06-21T12:00:00Z'), 1)),
        cursor: undefined,
      }),
    );
  });

  it('clear in the time range filter restores the Last 7 days preset and resets the cursor', () => {
    render(
      <MemoryRouter>
        <Timeline />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Next page' })[0]);
    expect(useTimelineMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'cursor-page-2' }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Time range.*Last 7 days/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Last 14 days' }));
    expect(screen.getByRole('button', { name: /Time range.*Last 14 days/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Time range.*Last 14 days/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.getByRole('button', { name: /Time range.*Last 7 days/ })).toBeInTheDocument();
    expect(useTimelineMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: startOfDay(subDays(new Date('2026-06-21T12:00:00Z'), 7)),
        endDate: endOfDay(new Date('2026-06-21T12:00:00Z')),
        limit: 50,
        cursor: undefined,
      }),
    );
  });

  it('caps the rendered and exported current page to the selected page size when a sentinel item is present', () => {
    const sentinelEntries = Array.from({ length: 51 }, (_, index) => ({
      ...entry,
      id: `entry-${index + 1}`,
      status: `Timeline entry ${index + 1}`,
      createdAt: new Date(Date.UTC(2026, 5, 21, 12, 0, 0 - index)).toISOString(),
    }));
    useTimelineMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: { events: sentinelEntries, nextCursor: 'cursor-page-2' },
    });

    render(
      <MemoryRouter>
        <Timeline />
      </MemoryRouter>,
    );

    expect(screen.getByText('Timeline entry 50')).toBeInTheDocument();
    expect(screen.queryByText('Timeline entry 51')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Export 50 timeline entries to CSV/ }),
    ).toBeInTheDocument();
  });

  it('uses duplicated cursor-backed pagination and page size selector without a separate panel', () => {
    render(
      <MemoryRouter>
        <Timeline />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('timeline-pagination-panel')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Previous page' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Next page' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Previous page' })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Next page' })[0]).toBeEnabled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Next page' })[0]);
    expect(screen.getAllByText('Page 2')).toHaveLength(2);
    expect(useTimelineMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        limit: 50,
        cursor: 'cursor-page-2',
      }),
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Previous page' })[0]);
    expect(screen.getAllByText('Page 1')).toHaveLength(2);
    expect(useTimelineMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        limit: 50,
        cursor: undefined,
      }),
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Page size.*50/ })[0]);
    fireEvent.click(
      within(screen.getByRole('listbox', { name: 'Page size' })).getByRole('option', {
        name: '100',
      }),
    );

    expect(screen.getAllByText('Page 1')).toHaveLength(2);
    expect(useTimelineMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        limit: 100,
        cursor: undefined,
      }),
    );
  });

  it('renders matching right-aligned pagination groups with nav before one-line page size selector', () => {
    render(
      <MemoryRouter>
        <Timeline />
      </MemoryRouter>,
    );

    const topPagination = screen.getByTestId('timeline-pagination-top');
    const bottomPagination = screen.getByTestId('timeline-pagination-bottom');

    for (const pagination of [topPagination, bottomPagination]) {
      expect(pagination).toHaveClass('justify-end');
      expect(pagination).toHaveClass('gap-6');
      expect(pagination).toContainElement(
        within(pagination).getByRole('navigation', { name: 'Timeline pagination' }),
      );
      expect(pagination).toContainElement(
        within(pagination).getByRole('button', { name: /Page size.*50/ }),
      );

      const nav = within(pagination).getByRole('navigation', { name: 'Timeline pagination' });
      const previousButton = within(nav).getByRole('button', { name: 'Previous page' });
      const nextButton = within(nav).getByRole('button', { name: 'Next page' });
      const pageSize = within(pagination).getByRole('button', { name: /Page size.*50/ });
      expect(nav.compareDocumentPosition(pageSize) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(previousButton).toHaveClass('h-9');
      expect(nextButton).toHaveClass('h-9');
      const pageSizeWrapper = pageSize.closest('[data-testid="timeline-page-size"]');
      expect(pageSizeWrapper).toHaveClass('whitespace-nowrap');
      expect(pageSizeWrapper?.querySelector('.relative')).toHaveClass(
        'flex',
        'items-center',
        'gap-2',
        '[&>span]:mb-0',
      );
      expect(pageSize).toHaveClass('h-9');
    }

    expect(topPagination.querySelectorAll('nav').length).toBe(
      bottomPagination.querySelectorAll('nav').length,
    );
    expect(within(topPagination).getAllByRole('button')).toHaveLength(
      within(bottomPagination).getAllByRole('button').length,
    );
  });
});
