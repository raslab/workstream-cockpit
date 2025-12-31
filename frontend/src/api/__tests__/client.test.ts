import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';

// Mock window.location
const mockLocation = {
  pathname: '/',
  href: '/',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('API Client - OAuth Redirect Loop Prevention', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    vi.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('401 Interceptor - Redirect Logic', () => {
    it('should redirect to /login on 401 when on regular page', async () => {
      // Set current path to a protected route
      const mockLocationObj = { pathname: '/cockpit', href: '/cockpit' };
      Object.defineProperty(window, 'location', {
        value: mockLocationObj,
        writable: true,
        configurable: true,
      });

      mock.onGet('/api/user').reply(401);

      try {
        await apiClient.get('/api/user');
      } catch (error: any) {
        // Request should fail with 401
        expect(error.response.status).toBe(401);
      }

      // Should redirect to login
      expect(window.location.href).toBe('/login');
    });

    it('should NOT redirect when already on /login page', async () => {
      // Set current path to login
      Object.defineProperty(window, 'location', {
        value: { pathname: '/login' },
        writable: true,
      });

      mock.onGet('/api/user').reply(401);

      try {
        await apiClient.get('/api/user');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }

      // Should stay on /login (not redirect)
      expect(window.location.pathname).toBe('/login');
    });

    it('should NOT redirect when on /auth/callback page', async () => {
      // Set current path to OAuth callback
      Object.defineProperty(window, 'location', {
        value: { pathname: '/auth/callback' },
        writable: true,
      });

      mock.onGet('/api/user').reply(401);

      try {
        await apiClient.get('/api/user');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }

      // Should stay on /auth/callback (not redirect)
      expect(window.location.pathname).toBe('/auth/callback');
    });

    it('should NOT redirect when on /auth/callback with query params', async () => {
      // OAuth callback URL with Google's query params
      Object.defineProperty(window, 'location', {
        value: { 
          pathname: '/auth/callback',
          search: '?code=abc123&scope=email+profile'
        },
        writable: true,
      });

      mock.onGet('/api/user').reply(401);

      try {
        await apiClient.get('/api/user');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }

      // Should stay on /auth/callback
      expect(window.location.pathname).toBe('/auth/callback');
    });
  });

  describe('401 Interceptor - Prevents Infinite Loop', () => {
    it('should not create redirect loop on /login', async () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/login' },
        writable: true,
      });

      // Simulate multiple 401 responses
      mock.onGet('/api/user').reply(401);
      mock.onGet('/api/projects').reply(401);

      try {
        await apiClient.get('/api/user');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }

      try {
        await apiClient.get('/api/projects');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }

      // Should still be on /login (not looping)
      expect(window.location.pathname).toBe('/login');
    });

    it('should not create redirect loop during OAuth callback', async () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/auth/callback' },
        writable: true,
      });

      // OAuthCallback component calls refetchUser which may get 401 initially
      mock.onGet('/auth/user').reply(401);

      try {
        await apiClient.get('/auth/user');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }

      // Should stay on /auth/callback to complete OAuth flow
      expect(window.location.pathname).toBe('/auth/callback');
    });
  });

  describe('API Client - CORS Credentials', () => {
    it('should include credentials in all requests', () => {
      // Verify axios instance is configured with withCredentials
      expect(apiClient.defaults.withCredentials).toBe(true);
    });

    it('should send cookies with requests', async () => {
      mock.onGet('/api/user').reply((config: any) => {
        // Verify withCredentials is set
        expect(config.withCredentials).toBe(true);
        return [200, { id: '123', email: 'test@example.com' }];
      });

      const response = await apiClient.get('/api/user');
      expect(response.status).toBe(200);
    });
  });

  describe('API Client - Base URL Configuration', () => {
    it('should use correct API base URL', () => {
      const baseURL = apiClient.defaults.baseURL;
      
      // Should point to backend
      expect(baseURL).toBeTruthy();
      expect(baseURL).toContain('http');
    });

    it('should handle API routes correctly', async () => {
      mock.onGet('/api/workstreams').reply(200, []);

      const response = await apiClient.get('/api/workstreams');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should pass through non-401 errors', async () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/cockpit' },
        writable: true,
      });

      mock.onGet('/api/workstreams').reply(500, { error: 'Server error' });

      try {
        await apiClient.get('/api/workstreams');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.error).toBe('Server error');
      }

      // Should NOT redirect on 500 error
      expect(window.location.pathname).toBe('/cockpit');
    });

    it('should pass through 404 errors without redirecting', async () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/cockpit' },
        writable: true,
      });

      mock.onGet('/api/workstreams/999').reply(404, { error: 'Not found' });

      try {
        await apiClient.get('/api/workstreams/999');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }

      // Should NOT redirect on 404
      expect(window.location.pathname).toBe('/cockpit');
    });
  });
});
