import axios from 'axios';

/**
 * Central API client for the AVENQRA Express REST API.
 * Base URL is configured via VITE_API_BASE_URL (see .env.example).
 * No secrets are ever stored here — only the short-lived JWT session token.
 */

const envBase =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const API_BASE_URL = String(envBase).replace(/\/$/, '');

/** Demo mode policy: auto | live | demo (VITE_DEMO_MODE). */
export const DEMO_MODE_POLICY = String(import.meta.env.VITE_DEMO_MODE || 'auto').toLowerCase();

export const TOKEN_KEY = 'avenqra_token';
export const USER_KEY = 'avenqra_user';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Event name fired when the API rejects the session (401). */
export const UNAUTHORIZED_EVENT = 'avenqra:unauthorized';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !String(error.config?.url || '').includes('/auth/')) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: { message: error.response?.data?.message } }));
    }
    return Promise.reject(normalizeApiError(error));
  }
);

/** Normalize every failure into a consistent, safe error shape. */
export function normalizeApiError(error) {
  if (error?.isNormalized) return error;
  const status = error?.response?.status ?? null;
  const message =
    error?.response?.data?.message ||
    (status === 403 ? 'You do not have permission to perform this action.' : null) ||
    (error?.code === 'ECONNABORTED' ? 'The request timed out.' : null) ||
    (error?.request && !error.response ? 'Cannot reach the AVENQRA API server.' : null) ||
    error?.message ||
    'Unexpected API error.';
  const normalized = new Error(message);
  normalized.isNormalized = true;
  normalized.status = status;
  normalized.isNetworkError = !error?.response && !!error?.request;
  normalized.errors = error?.response?.data?.errors ?? null;
  return normalized;
}

/** Unwrap the backend envelope `{ success, message, data }`. */
export function unwrap(response) {
  const body = response?.data;
  if (body && typeof body === 'object' && 'data' in body) return body.data;
  return body;
}

export function apiMessage(error) {
  return error?.message || 'Something went wrong.';
}

/**
 * Probe the backend health endpoint (`GET /health` on the API root).
 * Returns { ok, latencyMs, error } and never throws.
 */
export async function checkHealth(timeoutMs = 2500) {
  const root = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  const started = performance.now();
  try {
    const res = await axios.get(`${root}/health`, { timeout: timeoutMs });
    return { ok: true, latencyMs: Math.round(performance.now() - started), status: res.data?.status || 'UP' };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - started),
      error: normalizeApiError(error).message,
    };
  }
}

export default api;
