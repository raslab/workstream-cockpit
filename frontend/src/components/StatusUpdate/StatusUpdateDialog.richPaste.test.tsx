import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatusUpdateDialog } from './StatusUpdateDialog';

vi.mock('../../api/client', () => ({
  apiClient: { post: vi.fn() },
}));

vi.mock('../../api/tags', () => ({
  useTags: () => ({ data: [] }),
}));

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <StatusUpdateDialog workstreamId="stream-1" workstreamName="Stream One" isOpen onClose={vi.fn()} />
    </QueryClientProvider>
  );
}

function pasteHtml(textarea: HTMLTextAreaElement, html: string) {
  fireEvent.paste(textarea, {
    clipboardData: {
      getData: (type: string) => (type === 'text/html' ? html : ''),
      types: ['text/html'],
    },
  });
}

describe('StatusUpdateDialog rich HTML paste', () => {
  it('pastes rich HTML as Markdown into the status textarea at the current selection', () => {
    renderDialog();
    const status = screen.getByLabelText(/Status/) as HTMLTextAreaElement;

    fireEvent.change(status, { target: { value: 'before after' } });
    status.setSelectionRange(7, 12);
    pasteHtml(status, '<p><strong>bold</strong> and <a href="https://example.com">link</a></p>');

    expect(status.value).toBe('before **bold** and [link](https://example.com)');
  });

  it('falls back to default paste behavior when no HTML clipboard data is present', () => {
    renderDialog();
    const note = screen.getByLabelText(/Note/) as HTMLTextAreaElement;

    fireEvent.paste(note, {
      clipboardData: {
        getData: (type: string) => (type === 'text/plain' ? 'plain' : ''),
        types: ['text/plain'],
      },
    });

    expect(note.value).toBe('');
  });
});
