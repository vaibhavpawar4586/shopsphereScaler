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

// When the session expires, tell the AuthProvider so it can log the user out.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

/** Reads the { status: "failure", message } error message sent by the API. */
export const getErrorMessage = (error, fallback = 'Something went wrong, please try again') =>
  error?.response?.data?.message || (error?.request && !error.response ? 'Cannot reach the server' : fallback);

export default api;
