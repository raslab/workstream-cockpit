import { render, screen, fireEvent, within } from '@testing-library/react';
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

vi.mock('../../components/Timeline/FilterBar', () => ({
  FilterBar: () => <div data-testid="filter-bar" />,
}));

vi.mock('../../components/Markdown/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <span>{content}</span>,
}));

import Timeline from '../../pages/Timeline';

describe('Timeline hierarchy rendering', () => {
  beforeEach(() => {
    useTimelineMock.mockReset();
    useTimelineMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: [
        {
          id: 'move-1',
          eventType: 'parent_changed',
          workstreamId: 'child-1',
          workstreamName: 'Child stream',
          createdAt: '2026-06-20T10:00:00Z',
          oldParentName: 'Old parent',
          newParentName: 'New parent',
          breadcrumb: 'Root > New parent > Child stream',
          category: null,
        },
        {
          id: 'created-1',
          eventType: 'sub_stream_created',
          workstreamId: 'child-2',
          workstreamName: 'Created child',
          createdAt: '2026-06-20T09:00:00Z',
          parentName: 'Flat parent',
          category: null,
        },
      ],
    });
  });

  it('renders backend flat hierarchy fields without metadata or hierarchyPath', () => {
    render(<MemoryRouter><Timeline /></MemoryRouter>);

    expect(screen.getByText('Moved from Old parent to New parent')).toBeInTheDocument();
    expect(screen.getByText('Root > New parent > Child stream')).toBeInTheDocument();
    expect(screen.getByText('Created under Flat parent')).toBeInTheDocument();
  });

  it('uses custom listbox controls for hierarchy and activity filters', () => {
    render(<MemoryRouter><Timeline /></MemoryRouter>);

    const hierarchyControl = screen.getByRole('button', { name: /Hierarchy scope.*All streams/ });
    const activityControl = screen.getByRole('button', { name: /Activity type.*All activity/ });

    expect(hierarchyControl.tagName).toBe('BUTTON');
    expect(activityControl.tagName).toBe('BUTTON');
    expect(hierarchyControl).toHaveAttribute('aria-haspopup', 'listbox');
    expect(activityControl).toHaveAttribute('aria-haspopup', 'listbox');
    expect(document.querySelector('#hierarchyScope')).toBeNull();
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

  it('sends selected hierarchy scope and parent id to the timeline query', () => {
    render(<MemoryRouter><Timeline /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /Hierarchy scope.*All streams/ }));
    fireEvent.click(within(screen.getByRole('listbox', { name: 'Hierarchy scope' })).getByRole('option', { name: 'Under parent' }));

    const parentControl = screen.getByRole('button', { name: /Parent stream.*Select a parent/ });
    expect(parentControl.tagName).toBe('BUTTON');

    fireEvent.click(parentControl);
    fireEvent.click(within(screen.getByRole('listbox', { name: 'Parent stream' })).getByRole('option', { name: 'Parent stream' }));

    expect(useTimelineMock).toHaveBeenLastCalledWith(expect.objectContaining({
      hierarchyScope: 'under-parent',
      parentId: 'parent-1',
    }));
  });
});
