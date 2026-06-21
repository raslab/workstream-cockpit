import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { startOfDay, endOfDay, subDays } from 'date-fns';

const useTimelineMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useTimeline', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/useTimeline')>('../../hooks/useTimeline');
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
    render(<MemoryRouter><Timeline /></MemoryRouter>);

    expect(useTimelineMock).toHaveBeenLastCalledWith(expect.objectContaining({
      startDate: startOfDay(subDays(new Date('2026-06-21T12:00:00Z'), 7)),
      endDate: endOfDay(new Date('2026-06-21T12:00:00Z')),
      limit: 50,
      cursor: undefined,
    }));
    expect(screen.getByRole('button', { name: /Date range.*Last 7 days/ })).toBeInTheDocument();
    expect(screen.getByText('Page 1')).toBeInTheDocument();
  });

  it('applies 14 and 30 day quick filters and resets pagination', () => {
    render(<MemoryRouter><Timeline /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(useTimelineMock).toHaveBeenLastCalledWith(expect.objectContaining({
      cursor: 'cursor-page-2',
    }));

    fireEvent.click(screen.getByRole('button', { name: /Date range.*Last 7 days/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Last 14 days' }));

    expect(useTimelineMock).toHaveBeenLastCalledWith(expect.objectContaining({
      startDate: startOfDay(subDays(new Date('2026-06-21T12:00:00Z'), 14)),
      endDate: endOfDay(new Date('2026-06-21T12:00:00Z')),
      cursor: undefined,
    }));
    expect(screen.getByText('Page 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Date range.*Last 14 days/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));

    expect(useTimelineMock).toHaveBeenLastCalledWith(expect.objectContaining({
      startDate: startOfDay(subDays(new Date('2026-06-21T12:00:00Z'), 30)),
      endDate: endOfDay(new Date('2026-06-21T12:00:00Z')),
      cursor: undefined,
    }));
  });

  it('uses cursor-backed next and previous pagination and page size selector', () => {
    render(<MemoryRouter><Timeline /></MemoryRouter>);

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 2')).toBeInTheDocument();
    expect(useTimelineMock).toHaveBeenLastCalledWith(expect.objectContaining({
      limit: 50,
      cursor: 'cursor-page-2',
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(useTimelineMock).toHaveBeenLastCalledWith(expect.objectContaining({
      limit: 50,
      cursor: undefined,
    }));

    fireEvent.click(screen.getByRole('button', { name: /Page size.*50/ }));
    fireEvent.click(within(screen.getByRole('listbox', { name: 'Page size' })).getByRole('option', { name: '100' }));

    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(useTimelineMock).toHaveBeenLastCalledWith(expect.objectContaining({
      limit: 100,
      cursor: undefined,
    }));
  });
});
