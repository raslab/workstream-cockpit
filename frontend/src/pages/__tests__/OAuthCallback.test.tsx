import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OAuthCallback from '../OAuthCallback';

// Mock the useAuth hook
const mockRefetchUser = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    refetchUser: mockRefetchUser,
    user: null,
    loading: false,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('OAuthCallback Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <OAuthCallback />
      </BrowserRouter>
    );
  };

  it('should render loading state initially', () => {
    renderComponent();
    
    expect(screen.getByText(/completing sign in/i)).toBeInTheDocument();
  });

  it('should call refetchUser after mount with delay', async () => {
    renderComponent();
    
    // Wait for the 100ms delay
    await waitFor(() => {
      expect(mockRefetchUser).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('should navigate to cockpit after successful user fetch', async () => {
    mockRefetchUser.mockResolvedValueOnce({ id: '123', email: 'test@example.com' });
    
    renderComponent();
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    }, { timeout: 500 });
  });

  it('should show error message on refetch failure', async () => {
    const error = new Error('Failed to fetch user');
    mockRefetchUser.mockRejectedValueOnce(error);
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('should redirect to login after error timeout', async () => {
    const error = new Error('Failed to fetch user');
    mockRefetchUser.mockRejectedValueOnce(error);
    
    renderComponent();
    
    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    }, { timeout: 500 });
    
    // Wait for redirect (2 seconds after error)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    }, { timeout: 2500 });
  });

  it('should not redirect during initial load', () => {
    renderComponent();
    
    // Should not navigate immediately
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('OAuthCallback - Redirect Loop Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <OAuthCallback />
      </BrowserRouter>
    );
  };

  it('should use 100ms delay before fetching user', async () => {
    renderComponent();
    
    // refetchUser should not be called immediately
    expect(mockRefetchUser).not.toHaveBeenCalled();
    
    // Should be called after delay
    await waitFor(() => {
      expect(mockRefetchUser).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('should only call refetchUser once', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(mockRefetchUser).toHaveBeenCalledTimes(1);
    }, { timeout: 500 });
  });

  it('should navigate to cockpit (not back to login)', async () => {
    mockRefetchUser.mockResolvedValueOnce({ id: '123', email: 'test@example.com' });
    
    renderComponent();
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      expect(mockNavigate).not.toHaveBeenCalledWith('/login', { replace: true });
    }, { timeout: 500 });
  });
});
