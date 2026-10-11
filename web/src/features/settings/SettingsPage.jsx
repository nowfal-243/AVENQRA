import React, { useState } from 'react';
import { Timer, Palette, Server, RotateCcw, Check, Info, ShieldCheck, Sun, Moon } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { ConfirmDialog } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { DEFAULT_SLA_MINUTES, ROLE_LABELS } from '../../utils/constants';
import { initials } from '../../utils/formatters';
import { resetDemoStore } from '../../services/demoStore';

/**
 * SettingsPage — profile summary, appearance, configurable SLA display policy,
 * data-source information and a demo-store reset. The SLA value is a display
 * policy; server-side escalation is enforced independently by the backend
 * worker and is not changed here.
 */
export default function SettingsPage() {
  const { user, isDemoSession } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { mode, modeError, health, isDemo, retryConnection, slaMinutes, updateSlaMinutes, lastUpdated } = useData();
  const toast = useToast();

  const [slaDraft, setSlaDraft] = useState(String(slaMinutes));
  const [resetOpen, setResetOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const saveSla = () => {
    const n = parseInt(slaDraft, 10);
    if (!Number.isFinite(n) || n < 5 || n > 1440) {
      toast.error('SLA window must be between 5 and 1440 minutes.');
      return;
    }
    updateSlaMinutes(n);
    toast.success(`SLA countdown display set to ${n} minutes.`);
  };

  const handleRetry = async () => {
    setRetrying(true);
    const resolved = await retryConnection();
    setRetrying(false);
    toast.info(resolved === 'live' ? 'Connected to the live API.' : 'Still in demo mode — backend unreachable.');
  };

  const handleReset = () => {
    resetDemoStore();
    setResetOpen(false);
    toast.success('Demo dataset reset to its original seed.');
  };

  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile, appearance and platform preferences." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="panel-title">Profile</h3>
          <div className="mt-4 flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-bold text-white">
              {initials(user?.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{user?.name}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="badge border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
                  {ROLE_LABELS[user?.role] || user?.role}
                </span>
                {isDemoSession && (
                  <span className="badge border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                    demo session
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="panel-title flex items-center gap-2">
            <Palette className="h-4 w-4 text-cyan-500" aria-hidden="true" /> Appearance
          </h3>
          <p className="panel-subtitle">Switch between light and dark themes. Your choice is remembered.</p>
          <div className="mt-4 inline-flex rounded-lg border border-slate-200 p-1 dark:border-slate-700">
            <button
              type="button"
              onClick={() => !isDark && toggleTheme()}
              aria-pressed={!isDark}
              className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition ${
                !isDark ? 'bg-cyan-500 text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Sun className="h-3.5 w-3.5" aria-hidden="true" /> Light
            </button>
            <button
              type="button"
              onClick={() => isDark && toggleTheme()}
              aria-pressed={isDark}
              className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition ${
                isDark ? 'bg-cyan-500 text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Moon className="h-3.5 w-3.5" aria-hidden="true" /> Dark
            </button>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="panel-title flex items-center gap-2">
            <Timer className="h-4 w-4 text-cyan-500" aria-hidden="true" /> SLA countdown policy
          </h3>
          <p className="panel-subtitle">
            Configured window for the on-screen SLA countdown. Deadline checks and escalations are enforced
            server-side, independently of this value.
          </p>
          <div className="mt-4 flex items-end gap-3">
            <div>
              <label htmlFor="sla-minutes" className="label">Minutes</label>
              <input
                id="sla-minutes"
                type="number"
                min="5"
                max="1440"
                className="input w-32"
                value={slaDraft}
                onChange={(e) => setSlaDraft(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={saveSla}>
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Save
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Default policy: {DEFAULT_SLA_MINUTES} minutes.</p>
        </div>

        <div className="card p-5">
          <h3 className="panel-title flex items-center gap-2">
            <Server className="h-4 w-4 text-cyan-500" aria-hidden="true" /> Data source
          </h3>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Current mode</span>
              <span className={`badge ${isDemo ? 'border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
                {mode}
              </span>
            </div>
            {health && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">API health</span>
                <span className="text-slate-700 dark:text-slate-200">{health.ok ? `UP · ${health.latencyMs}ms` : 'Unreachable'}</span>
              </div>
            )}
            {modeError && (
              <p className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {modeError}
              </p>
            )}
            {lastUpdated && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Last data refresh</span>
                <span className="text-slate-700 dark:text-slate-200">{lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          <button type="button" className="btn btn-secondary btn-sm mt-4" onClick={handleRetry} disabled={retrying}>
            <RotateCcw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} aria-hidden="true" />
            {retrying ? 'Re-checking…' : 'Re-check backend connection'}
          </button>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="panel-title flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-violet-500" aria-hidden="true" /> Demo data
          </h3>
          <p className="panel-subtitle">
            In demo mode, all records are simulated and stored only in this browser. Resetting restores the
            original seed. This never touches a real backend.
          </p>
          <button type="button" className="btn btn-secondary btn-sm mt-4" onClick={() => setResetOpen(true)}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset demo dataset
          </button>
        </div>

      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
        tone="danger"
        title="Reset demo dataset"
        confirmLabel="Reset"
        message="Restore the demo dataset to its original seed? Any demo complaints, departments or officers you created in this browser will be discarded."
      />
    </div>
  );
}

