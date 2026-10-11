/**
 * Backwards-compatible re-export of the central API client.
 * Existing modules import `api` from '../api/client'; the canonical
 * implementation now lives in src/services/apiClient.js.
 */
export { default, API_BASE_URL, unwrap, apiMessage, checkHealth, TOKEN_KEY, USER_KEY } from '../services/apiClient';

