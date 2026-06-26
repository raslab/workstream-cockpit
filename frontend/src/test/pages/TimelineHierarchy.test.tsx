import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const useTimelineMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useTimeline', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/useTimeline')>('../../hooks/useTimeline');
  return { ...actual, useTimeline: useTimelineMock };
});

vi.mock('../../hooks/useWorkstreams', () => ({
  useWorkstreams: () => ({ data: [{ id: 'parent-1', number: 7, name: 'Parent stream' }] }),
}));

vi.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({ data: [] }),
}));

vi.mock('../../components/Timeline/FilterBar', () => ({
  FilterBar: () => <div data-testid="filter-bar" />,
}));

vi.mock('../../components/Markdown/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <span>{content}</span>,
}));

import Timeline from '../../pages/Timeline';

describe('Timeline parent stream path rendering', () => {
  beforeEach(() => {
    useTimelineMock.mockReset();
    useTimelineMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: [
        {
          id: 'move-1',
          eventType: 'parent_changed',
          workstreamId: 'substream-1',
          workstreamNumber: 12,
          workstreamName: 'Sub-stream',
          createdAt: '2026-06-20T10:00:00Z',
          oldParentName: 'Old parent',
          newParentName: 'New parent',
          breadcrumb: 'Root > New parent > Sub-stream',
          category: null,
        },
        {
          id: 'created-1',
          eventType: 'sub_stream_created',
          workstreamId: 'substream-2',
          workstreamNumber: 13,
          workstreamName: 'Created sub-stream',
          createdAt: '2026-06-20T09:00:00Z',
          parentName: 'Flat parent',
          category: null,
        },
      ],
    });
  });

  it('renders backend flat parent stream fields without metadata or parentStreamPath', () => {
    render(<MemoryRouter><Timeline /></MemoryRouter>);

    expect(screen.getByText('Moved from Old parent to New parent')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#12' })).toBeInTheDocument();
    expect(screen.getByText('Created under Flat parent')).toBeInTheDocument();
  });

  it('uses custom listbox controls for parent stream and activity filters', () => {
    render(<MemoryRouter><Timeline /></MemoryRouter>);

    const hierarchyControl = screen.getByRole('button', { name: /Stream scope.*All streams/ });
    const activityControl = screen.getByRole('button', { name: /Activity type.*All activity/ });

    expect(hierarchyControl.tagName).toBe('BUTTON');
    expect(activityControl.tagName).toBe('BUTTON');
    expect(hierarchyControl).toHaveAttribute('aria-haspopup', 'listbox');
    expect(activityControl).toHaveAttribute('aria-haspopup', 'listbox');
    expect(document.querySelector('#streamScope')).toBeNull();
    expect(document.querySelector('#activityFilter')).toBeNull();

    fireEvent.click(activityControl);
    expect(screen.getByRole('listbox', { name: 'Activity type' })).toBeInTheDocument();
  });

  it('exposes activity filtering and sends selected event type to the timeline query', () => {
    render(<MemoryRouter><Timeline /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /Activity type.*All activity/ }));
    fireEvent.click(within(screen.getByRole('listbox', { name: 'Activity type' })).getByRole('option', { name: 'Parent changes' }));

    expect(useTimelineMock).toHaveBeenLastCalledWith(expect.objectContaining({ eventTypes: ['parent_changed'] }));
  });

  it('sends selected stream scope and parent id to the timeline query', () => {
    render(<MemoryRouter><Timeline /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /Stream scope.*All streams/ }));
    fireEvent.click(within(screen.getByRole('listbox', { name: 'Stream scope' })).getByRole('option', { name: 'Under parent' }));

    const parentControl = screen.getByRole('button', { name: /Parent stream.*Select a parent/ });
    expect(parentControl.tagName).toBe('BUTTON');

    fireEvent.click(parentControl);
    fireEvent.click(within(screen.getByRole('listbox', { name: 'Parent stream' })).getByRole('option', { name: '#7 Parent stream' }));

    expect(useTimelineMock).toHaveBeenLastCalledWith(expect.objectContaining({
      streamScope: 'under-parent',
      parentId: '7',
    }));
  });
});
