import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();
let mockUser: { id: string; email: string; name: string } | null = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    login: mockLogin,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login return URL handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUser = null;
  });

  it('stores the safe returnTo query before starting OAuth', async () => {
    render(
      <MemoryRouter initialEntries={['/login?returnTo=%2Ftimeline%3Frange%3D30d%23updates']}>
        <Login />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

    expect(sessionStorage.getItem('workstream-cockpit:returnTo')).toBe(
      '/timeline?range=30d#updates',
    );
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('does not store unsafe external returnTo query targets', async () => {
    render(
      <MemoryRouter initialEntries={['/login?returnTo=%2F%2Fevil.example%2Fphish']}>
        <Login />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

    expect(sessionStorage.getItem('workstream-cockpit:returnTo')).toBeNull();
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('redirects an already-authenticated user to the safe returnTo query target', () => {
    mockUser = { id: '123', email: 'test@example.com', name: 'Test User' };

    render(
      <MemoryRouter initialEntries={['/login?returnTo=%2F%3Fview%3Dplatform-ops%23filters']}>
        <Login />
      </MemoryRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith('/?view=platform-ops#filters', { replace: true });
  });
});
