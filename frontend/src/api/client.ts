import axios from 'axios';
import { buildLoginRedirectUrl, getCurrentReturnTo } from '@/utils/authRedirect';
import { getResourceChangeClientId } from '@/utils/resourceChangeClient';

// Use relative path for production (nginx proxies /api to backend)
// or full URL for development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  config.headers.set('X-Resource-Change-Client-Id', getResourceChangeClientId());
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect to login if we're already on login or callback pages
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/auth/callback') {
        window.location.href = buildLoginRedirectUrl(getCurrentReturnTo());
      }
    }
    return Promise.reject(error);
  },
);
