import React from 'react';
import { AlertTriangle, RefreshCw, FlaskConical } from 'lucide-react';
import { useData } from '../../context/DataContext';

/**
 * DemoBanner — persistent, impossible-to-miss disclosure whenever the app is
 * showing simulated data instead of the live backend.
 */
export default function DemoBanner() {
  const { isDemo, demoNotice, modeError, retryConnection } = useData();
  if (!isDemo) return null;

  return (
    <div
      role="status"
      className="relative z-30 border-b border-violet-200/70 bg-violet-50 px-4 py-2 dark:border-violet-500/30 dark:bg-violet-500/10"
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <FlaskConical className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden="true" />
          <span className="font-bold text-violet-800 dark:text-violet-200">DEMO MODE</span>
          <span className="text-violet-700/90 dark:text-violet-300/90">
            — showing simulated data stored in this browser.
            {demoNotice || modeError
              ? ` Live API unavailable — start the backend + database, then retry.`
              : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={() => retryConnection()}
          className="btn btn-xs border border-violet-300 bg-white text-violet-700 hover:bg-violet-100 dark:border-violet-500/40 dark:bg-navy-900 dark:text-violet-300"
          title="Re-probe the AVENQRA backend"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          Retry live connection
        </button>
      </div>
    </div>
  );
}

/** Inline error strip used above data tables and charts. */
export function DataErrorBar({ message, onRetry = null }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <span className="font-semibold">Data error:</span> {message}
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-xs btn-secondary shrink-0">
          Retry
        </button>
      )}
    </div>
  );
}
