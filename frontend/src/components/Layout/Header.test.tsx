import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Header from './Header';
import { ResourceChangeNotificationProvider } from '../Notifications/ResourceChangeNotificationProvider';

const logoutMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Ada Lovelace',
      pictureUrl: 'https://example.com/ada.png',
    },
    logout: logoutMock,
  }),
}));

function renderHeader() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <ResourceChangeNotificationProvider
          fetchChanges={vi.fn().mockResolvedValue({ cursor: null, changes: [] })}
        >
          <Header />
        </ResourceChangeNotificationProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Header account menu', () => {
  beforeEach(() => {
    logoutMock.mockReset();
  });

  it('shows notifications before a Google avatar dropdown with name, settings, and logout', async () => {
    renderHeader();

    const navigation = screen.getByRole('navigation', { name: /primary/i });
    expect(within(navigation).queryByRole('link', { name: /settings/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^logout$/i })).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    const accountButton = screen.getByRole('button', { name: /account menu for ada lovelace/i });
    expect(within(accountButton).getByRole('img', { name: /ada lovelace/i })).toHaveAttribute(
      'src',
      'https://example.com/ada.png',
    );

    await userEvent.click(accountButton);

    const menu = screen.getByRole('menu', { name: /account/i });
    expect(within(menu).getByText('Ada Lovelace')).toBeInTheDocument();
    expect(within(menu).getByText('user@example.com')).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /settings/i })).toHaveAttribute(
      'href',
      '/settings',
    );

    await userEvent.click(within(menu).getByRole('menuitem', { name: /logout/i }));
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
