/**
 * Data-source mode controller.
 *
 * 'connecting' — probing the backend
 * 'live'       — real AVENQRA API
 * 'demo'       — clearly-labelled local demo data (backend unreachable or
 *                VITE_DEMO_MODE=demo). Demo data is never presented silently
 *                as live data; the UI always renders a demo banner.
 */
import { DEMO_MODE_POLICY, checkHealth } from './apiClient';

let mode = 'connecting';
let lastError = null;
const listeners = new Set();

export function getMode() {
  if (DEMO_MODE_POLICY === 'demo' && mode === 'connecting') return 'demo';
  if (DEMO_MODE_POLICY === 'live' && mode === 'connecting') return 'live';
  return mode;
}

export function isDemoMode() {
  return getMode() === 'demo';
}

export function getLastError() {
  return lastError;
}

export function setMode(next, error = null) {
  if (mode === next && lastError === error) return;
  mode = next;
  lastError = error;
  listeners.forEach((fn) => {
    try {
      fn(mode, error);
    } catch (err) {
      console.error('[AVENQRA] mode listener failed', err);
    }
  });
}

export function subscribeMode(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Resolve the data source. Returns { mode, health }.
 * - VITE_DEMO_MODE=demo → demo without probing
 * - VITE_DEMO_MODE=live → live without probing
 * - auto → probe /health, fall back to demo when unreachable
 */
export async function resolveMode() {
  if (DEMO_MODE_POLICY === 'demo') {
    setMode('demo', 'VITE_DEMO_MODE=demo');
    return { mode: 'demo', health: null };
  }
  if (DEMO_MODE_POLICY === 'live') {
    setMode('live');
    return { mode: 'live', health: null };
  }
  const health = await checkHealth();
  if (health.ok) {
    setMode('live');
  } else {
    setMode('demo', health.error);
  }
  return { mode: getMode(), health };
}
