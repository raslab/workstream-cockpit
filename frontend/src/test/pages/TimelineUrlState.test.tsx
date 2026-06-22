import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
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

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

describe('Timeline URL state', () => {
  beforeEach(() => {
    useTimelineMock.mockReset();
    useTimelineMock.mockReturnValue({ isLoading: false, error: null, data: [] });
  });

  it('initializes filters from URL params and writes changed controls back to the URL', async () => {
    render(
      <MemoryRouter initialEntries={['/timeline?tags=priority&scope=under-parent&parentId=parent-1&includeSubstreams=1&activity=parent_changed&categories=operations']}>
        <Routes>
          <Route path="/timeline" element={<><Timeline /><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(useTimelineMock).toHaveBeenLastCalledWith(expect.objectContaining({
      tags: ['priority'],
      categoryIds: ['cat-1'],
      streamScope: 'under-parent',
      parentId: 'parent-1',
      includeSubstreams: true,
      eventTypes: ['parent_changed'],
    })));

    fireEvent.click(screen.getByRole('checkbox', { name: /Include sub-stream activity/ }));

    await waitFor(() => expect(screen.getByTestId('location')).not.toHaveTextContent('includeSubstreams=1'));
    expect(screen.getByTestId('location')).toHaveTextContent('tags=priority');
  });

  it('updates start and end dates atomically when date range controls set both values', async () => {
    render(
      <MemoryRouter initialEntries={['/timeline?startDate=2026-06-01&endDate=2026-06-22&tags=priority']}>
        <Routes>
          <Route path="/timeline" element={<><Timeline /><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Jun 1 - Jun 22, 2026/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => expect(screen.getByTestId('location')).not.toHaveTextContent('startDate='));
    expect(screen.getByTestId('location')).not.toHaveTextContent('endDate=');
    expect(screen.getByTestId('location')).toHaveTextContent('tags=priority');
  });
});
