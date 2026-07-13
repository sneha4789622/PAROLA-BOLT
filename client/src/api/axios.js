import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pb_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let queue = [];

const clearSessionAndRedirect = () => {
  localStorage.removeItem('pb_access_token');
  localStorage.removeItem('pb_refresh_token');
  localStorage.removeItem('pb_mock_face_token');
  // Only redirect if not already on an auth page
  if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
    window.location.href = '/login';
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    // Skip refresh logic for auth endpoints themselves
    const isAuthEndpoint =
      config.url?.includes('/auth/refresh') ||
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/signup') ||
      config.url?.includes('/auth/biometric');

    if (response?.status === 401 && !config._retry && !isAuthEndpoint) {
      // Check if server explicitly told us the refresh token is expired/invalid
      const code = response?.data?.code;
      if (code === 'REFRESH_TOKEN_EXPIRED' || code === 'REFRESH_TOKEN_INVALID') {
        clearSessionAndRedirect();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject, config });
        });
      }

      config._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('pb_refresh_token');
        if (!refreshToken) {
          clearSessionAndRedirect();
          return Promise.reject(error);
        }

        const { data } = await api.post('/auth/refresh', { refreshToken });

        // Store the new tokens (server now rotates both)
        localStorage.setItem('pb_access_token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('pb_refresh_token', data.refreshToken);
        }

        // Retry all queued requests with the new access token
        queue.forEach(({ resolve, config: c }) => {
          c.headers.Authorization = `Bearer ${data.accessToken}`;
          resolve(api(c));
        });
        queue = [];

        // Retry the original failed request
        config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(config);
      } catch (refreshErr) {
        // Refresh itself failed — session is truly dead
        queue.forEach(({ reject }) => reject(refreshErr));
        queue = [];
        clearSessionAndRedirect();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
