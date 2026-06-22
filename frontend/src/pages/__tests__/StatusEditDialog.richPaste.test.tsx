import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatusEditDialog } from '../WorkstreamDetail';
import type { StatusUpdate } from '../../types/workstream';

vi.mock('../../api/client', () => ({
  apiClient: { put: vi.fn() },
}));

vi.mock('../../api/tags', () => ({
  useTags: () => ({ data: [] }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function pasteHtml(textarea: HTMLTextAreaElement, html: string) {
  fireEvent.paste(textarea, {
    clipboardData: {
      getData: (type: string) => (type === 'text/html' ? html : ''),
      types: ['text/html'],
    },
  });
}

const statusUpdate: StatusUpdate = {
  id: 'status-1',
  workstreamId: 'stream-1',
  status: 'Existing status',
  note: 'Existing note',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('StatusEditDialog rich HTML paste', () => {
  it('pastes rich HTML as Markdown into edit status and note fields', () => {
    renderWithQuery(
      <StatusEditDialog statusUpdate={statusUpdate} workstreamId="stream-1" isOpen onClose={vi.fn()} />
    );

    const status = screen.getByLabelText(/Status/) as HTMLTextAreaElement;
    const note = screen.getByLabelText(/Note/) as HTMLTextAreaElement;

    status.setSelectionRange(0, status.value.length);
    note.setSelectionRange(0, note.value.length);
    pasteHtml(status, '<p><strong>Edited status</strong></p>');
    pasteHtml(note, '<ol><li>First</li><li style="font-style: italic">Second</li></ol>');

    expect(status.value).toBe('**Edited status**');
    expect(note.value).toBe('1. First\n2. *Second*');
  });
});
