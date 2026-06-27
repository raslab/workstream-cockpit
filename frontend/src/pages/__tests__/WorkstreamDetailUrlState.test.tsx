import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const useStatusHistoryMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useStatusHistory', () => ({
  useStatusHistory: useStatusHistoryMock,
}));

vi.mock('../../api/client', () => ({
  apiClient: {
    get: apiGetMock,
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../components/Markdown/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <span>{content}</span>,
}));

vi.mock('../../components/Tag/TagAutocomplete', () => ({
  TagAutocomplete: () => null,
}));

vi.mock('../../components/Workstream/ParentSelectorDialog', () => ({
  ParentSelectorDialog: () => null,
}));

import WorkstreamDetail from '../../pages/WorkstreamDetail';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderDetail(initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/workstreams/:id"
            element={
              <>
                <WorkstreamDetail />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('WorkstreamDetail URL state', () => {
  beforeEach(() => {
    useStatusHistoryMock.mockReset();
    useStatusHistoryMock.mockReturnValue({ data: [], isLoading: false });
    apiGetMock.mockReset();
    apiGetMock.mockResolvedValue({
      data: {
        id: 'stream-1',
        name: 'Launch plan',
        status: 'active',
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
        tags: [],
        substreams: [],
      },
    });
  });

  it('initializes includeSubstreams from URL and toggles it back into the URL', async () => {
    renderDetail('/workstreams/stream-1?includeSubstreams=1');

    const checkbox = await screen.findByRole('checkbox', { name: /Include sub-stream updates/ });
    expect(checkbox).toBeChecked();
    expect(useStatusHistoryMock).toHaveBeenLastCalledWith('stream-1', {
      includeSubstreams: true,
      pageSize: 10,
    });

    fireEvent.click(checkbox);

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(''));
    expect(useStatusHistoryMock).toHaveBeenLastCalledWith('stream-1', {
      includeSubstreams: false,
      pageSize: 10,
    });
  });
});
