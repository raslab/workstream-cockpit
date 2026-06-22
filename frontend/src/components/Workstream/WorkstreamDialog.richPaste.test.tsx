import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkstreamCreateDialog } from './WorkstreamCreateDialog';
import { WorkstreamEditDialog } from './WorkstreamEditDialog';
import type { Workstream } from '../../types/workstream';

vi.mock('../../api/client', () => ({
  apiClient: { post: vi.fn(), put: vi.fn() },
}));

vi.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({ data: [] }),
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

const workstream = (overrides: Partial<Workstream> = {}): Workstream => ({
  id: 'stream-1',
  projectId: 'project-1',
  name: 'Stream One',
  categoryId: null,
  context: 'Existing context',
  state: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  closedAt: null,
  allTags: [],
  ...overrides,
});

describe('workstream dialog rich HTML paste', () => {
  it('pastes rich HTML as Markdown into create dialog description, status, and note fields', () => {
    renderWithQuery(<WorkstreamCreateDialog isOpen onClose={vi.fn()} />);

    const context = screen.getByLabelText(/Context/) as HTMLTextAreaElement;
    const initialStatus = screen.getByLabelText(/Initial Status/) as HTMLTextAreaElement;
    const initialNote = screen.getByLabelText(/Initial Note/) as HTMLTextAreaElement;

    pasteHtml(context, '<p style="font-weight:700">Bold description</p>');
    pasteHtml(initialStatus, '<p><em>Italic status</em></p>');
    pasteHtml(initialNote, '<ul><li>One</li><li><a href="https://example.com">Two</a></li></ul>');

    expect(context.value).toBe('**Bold description**');
    expect(initialStatus.value).toBe('*Italic status*');
    expect(initialNote.value).toBe('- One\n- [Two](https://example.com)');
  });

  it('pastes rich HTML as Markdown into edit dialog description field', () => {
    renderWithQuery(<WorkstreamEditDialog workstream={workstream()} isOpen onClose={vi.fn()} />);

    const context = screen.getByLabelText(/Context/) as HTMLTextAreaElement;
    context.setSelectionRange(0, context.value.length);
    pasteHtml(context, '<p>Replacement <strong>description</strong></p>');

    expect(context.value).toBe('Replacement **description**');
  });
});
