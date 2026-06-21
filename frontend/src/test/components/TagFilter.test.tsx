import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagFilter } from '../../components/Tag/TagFilter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mock the useTags hook
vi.mock('../../api/tags', () => ({
  useTags: () => ({
    data: [
      { id: '1', name: 'frontend', displayName: 'Frontend', color: '#3b82f6' },
      { id: '2', name: 'backend', displayName: 'Backend', color: '#10b981' },
      { id: '3', name: 'api', displayName: 'API', color: '#f59e0b' },
      { id: '4', name: 'database', displayName: 'Database', color: '#8b5cf6' },
    ],
    isLoading: false,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('TagFilter', () => {
  it('should render tag filter button', () => {
    const onTagsChange = vi.fn();
    render(<TagFilter selectedTags={[]} onTagsChange={onTagsChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tags.*All tags/ })).toBeInTheDocument();
  });

  it('should show count badge when tags are selected', () => {
    const onTagsChange = vi.fn();
    render(<TagFilter selectedTags={['frontend', 'backend']} onTagsChange={onTagsChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tags.*2 tags/ })).toBeInTheDocument();
  });

  it('should open dropdown on button click', () => {
    const onTagsChange = vi.fn();
    render(<TagFilter selectedTags={[]} onTagsChange={onTagsChange} />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: /Tags/ });
    fireEvent.click(button);

    expect(screen.getByPlaceholderText('Search tags...')).toBeInTheDocument();
  });

  it('should display all tags when dropdown is open', () => {
    const onTagsChange = vi.fn();
    render(<TagFilter selectedTags={[]} onTagsChange={onTagsChange} />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: /Tags/ });
    fireEvent.click(button);

    expect(screen.getByText('#Frontend')).toBeInTheDocument();
    expect(screen.getByText('#Backend')).toBeInTheDocument();
    expect(screen.getByText('#API')).toBeInTheDocument();
    expect(screen.getByText('#Database')).toBeInTheDocument();
  });

  it('should filter tags based on search query', async () => {
    const onTagsChange = vi.fn();
    render(<TagFilter selectedTags={[]} onTagsChange={onTagsChange} />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: /Tags/ });
    fireEvent.click(button);

    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.change(searchInput, { target: { value: 'front' } });

    await waitFor(() => {
      expect(screen.getByText('#Frontend')).toBeInTheDocument();
      expect(screen.queryByText('#Backend')).not.toBeInTheDocument();
      expect(screen.queryByText('#API')).not.toBeInTheDocument();
      expect(screen.queryByText('#Database')).not.toBeInTheDocument();
    });
  });

  it('should show "No tags found" when search yields no results', async () => {
    const onTagsChange = vi.fn();
    render(<TagFilter selectedTags={[]} onTagsChange={onTagsChange} />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: /Tags/ });
    fireEvent.click(button);

    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No tags found')).toBeInTheDocument();
    });
  });

  it('should toggle tag selection', () => {
    const onTagsChange = vi.fn();
    render(<TagFilter selectedTags={[]} onTagsChange={onTagsChange} />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: /Tags/ });
    fireEvent.click(button);

    const frontendTag = screen.getByText('#Frontend');
    fireEvent.click(frontendTag);

    expect(onTagsChange).toHaveBeenCalledWith(['frontend']);
  });

  it('should remove tag when already selected', () => {
    const onTagsChange = vi.fn();
    render(<TagFilter selectedTags={['frontend']} onTagsChange={onTagsChange} />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: /Tags/ });
    fireEvent.click(button);

    const frontendTags = screen.getAllByText('#Frontend');
    const frontendTag = frontendTags[frontendTags.length - 1];
    fireEvent.click(frontendTag);

    expect(onTagsChange).toHaveBeenCalledWith([]);
  });

  it('should clear all tags', () => {
    const onTagsChange = vi.fn();
    render(<TagFilter selectedTags={['frontend', 'backend']} onTagsChange={onTagsChange} />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: /Tags/ });
    fireEvent.click(button);

    const clearButton = screen.getByText('Clear all');
    fireEvent.click(clearButton);

    expect(onTagsChange).toHaveBeenCalledWith([]);
  });

  it('should reset search query when dropdown closes', () => {
    const onTagsChange = vi.fn();
    render(<TagFilter selectedTags={[]} onTagsChange={onTagsChange} />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: /Tags/ });
    fireEvent.click(button);

    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.change(searchInput, { target: { value: 'front' } });

    // Close dropdown by clicking button again
    fireEvent.click(button);

    // Re-open dropdown
    fireEvent.click(button);

    const newSearchInput = screen.getByPlaceholderText('Search tags...');
    expect(newSearchInput).toHaveValue('');
  });

  it('should focus search input when dropdown opens', () => {
    const onTagsChange = vi.fn();
    render(<TagFilter selectedTags={[]} onTagsChange={onTagsChange} />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: /Tags/ });
    fireEvent.click(button);

    const searchInput = screen.getByPlaceholderText('Search tags...');
    expect(document.activeElement).toBe(searchInput);
  });
});
