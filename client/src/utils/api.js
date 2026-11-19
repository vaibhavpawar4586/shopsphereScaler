import axios from 'axios';
import { BASE_URL } from './urlConfig';

/**
 * One axios instance for the whole app.
 * - withCredentials: send the httpOnly JWT cookie with every request.
 * - X-Requested-With: required by the API for POST/PATCH/DELETE (CSRF protection).
 */
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

// Render's free plan puts the API to sleep when idle; the first request can then time out
// at the proxy (502/503/504) while the server wakes up. Read-only requests are retried a
// few times. POST/PATCH/DELETE are never retried, so an order can't be placed twice.
const RETRY_STATUSES = new Set([502, 503, 504]);
const RETRY_DELAYS_MS = [2000, 5000, 10000];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const method = (config?.method || 'get').toLowerCase();
    const retryable = config && method === 'get' && (!response || RETRY_STATUSES.has(response.status));
    const attempt = config?.retryAttempt || 0;
    if (retryable && attempt < RETRY_DELAYS_MS.length) {
      await wait(RETRY_DELAYS_MS[attempt]);
      return api({ ...config, retryAttempt: attempt + 1 });
    }

    // When the session expires, tell the AuthProvider so it can log the user out.
    if (response?.status === 401) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

/** Reads the { status: "failure", message } error message sent by the API. */
export const getErrorMessage = (error, fallback = 'Something went wrong, please try again') => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response && RETRY_STATUSES.has(error.response.status)) {
    return 'The server is waking up, please try again in a moment';
  }
  if (error?.request && !error.response) return 'Cannot reach the server';
  return fallback;
};

export default api;
