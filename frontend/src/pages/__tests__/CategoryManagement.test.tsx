import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '../../api/client';
import Settings from '../Settings';

async function performUserAction(action: () => Promise<void>) {
  await act(async () => {
    await action();
  });
}

function renderCategorySettings() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/settings/categories']}>
        <Routes>
          <Route path="/settings/*" element={<Settings />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Category management settings', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it('displays category descriptions in settings', async () => {
    mock.onGet('/api/categories').reply(200, [
      {
        id: 'cat-project',
        name: 'project',
        color: '#9EC3FF',
        emoji: '🎯',
        description: 'Tracked initiatives with a bounded outcome.',
        sortOrder: 0,
      },
      {
        id: 'cat-empty',
        name: 'watching',
        color: '#B5BAC5',
        emoji: '👀',
        description: '',
        sortOrder: 1,
      },
    ]);

    renderCategorySettings();

    expect(
      await screen.findByText('Tracked initiatives with a bounded outcome.'),
    ).toBeInTheDocument();
    expect(screen.getByText('watching')).toBeInTheDocument();
  });

  it('creates and edits category descriptions', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/categories').reply(200, [
      {
        id: 'cat-project',
        name: 'project',
        color: '#9EC3FF',
        emoji: '🎯',
        description: 'Old meaning.',
        sortOrder: 0,
      },
    ]);
    mock.onPost('/api/categories').reply((config) => {
      expect(JSON.parse(config.data)).toMatchObject({
        name: 'process',
        color: '#3B82F6',
        description: 'Recurring operational work.',
      });
      return [
        201,
        {
          id: 'cat-process',
          name: 'process',
          color: '#3B82F6',
          emoji: null,
          description: 'Recurring operational work.',
          sortOrder: 1,
        },
      ];
    });
    mock.onPut('/api/categories/cat-project').reply((config) => {
      expect(JSON.parse(config.data)).toMatchObject({
        name: 'project',
        color: '#9EC3FF',
        emoji: '🎯',
        description: 'Updated meaning for humans and agents.',
      });
      return [
        200,
        {
          id: 'cat-project',
          name: 'project',
          color: '#9EC3FF',
          emoji: '🎯',
          description: 'Updated meaning for humans and agents.',
          sortOrder: 0,
        },
      ];
    });

    renderCategorySettings();
    await screen.findByText('Old meaning.');

    await performUserAction(async () => {
      await user.click(screen.getByRole('button', { name: /new category/i }));
    });
    await performUserAction(async () => {
      await user.type(screen.getByLabelText(/category name/i), 'process');
    });
    await performUserAction(async () => {
      await user.type(screen.getByLabelText(/description/i), 'Recurring operational work.');
    });
    await performUserAction(async () => {
      await user.click(screen.getByRole('button', { name: /create category/i }));
    });
    await waitFor(() => expect(mock.history.post).toHaveLength(1));

    await performUserAction(async () => {
      await user.click(screen.getByRole('button', { name: /edit project/i }));
    });
    const descriptionInput = screen.getByLabelText(/description/i);
    await performUserAction(async () => {
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated meaning for humans and agents.');
    });
    await performUserAction(async () => {
      await user.click(screen.getByRole('button', { name: /save category/i }));
    });

    await waitFor(() => expect(mock.history.put).toHaveLength(1));
  }, 10000);
});
