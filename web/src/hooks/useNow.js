import { useEffect, useState } from 'react';

/**
 * Shared clock. All SLA countdowns in the app subscribe to ONE interval
 * (reference-counted), avoiding dozens of duplicate timers.
 *
 * The tick is display-only — deadlines are computed from server timestamps
 * and never used to trigger escalations in the browser (the backend
 * escalation worker owns that).
 */
const listeners = new Set();
let subscribers = 0;
let intervalId = null;
let lastEmit = 0;

function emit() {
  lastEmit = Date.now();
  listeners.forEach((fn) => {
    try {
      fn(lastEmit);
    } catch (err) {
      console.error('[AVENQRA] useNow listener failed', err);
    }
  });
}

function ensureInterval() {
  if (intervalId === null) {
    emit();
    intervalId = setInterval(emit, 1000);
  }
}

function releaseInterval() {
  subscribers = Math.max(0, subscribers - 1);
  if (subscribers === 0 && intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/** @returns {number} current epoch ms, refreshed about once per intervalMs. */
export default function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const period = Math.max(1000, intervalMs || 1000);
    let lastUpdate = Date.now() - period; // first tick updates immediately
    const handler = (ts) => {
      if (ts - lastUpdate >= period - 50) {
        lastUpdate = ts;
        setNow(ts);
      }
    };
    listeners.add(handler);
    subscribers += 1;
    ensureInterval();
    setNow(Date.now());

    return () => {
      listeners.delete(handler);
      releaseInterval();
    };
  }, [intervalMs]);

  return now;
}
