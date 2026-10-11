import React from 'react';

/**
 * StatCard — KPI tile with icon, value, contextual trend (only rendered when
 * real historical comparisons exist) and an optional demo-data chip.
 */
export default function StatCard({
  label,
  value,
  icon,
  hint = null,
  trend = null,
  isDemo = false,
  tone = 'slate',
  loading = false,
  onClick = null,
  ariaLabel = null,
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  };

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick || undefined}
      aria-label={ariaLabel || undefined}
      className={`card card-hover w-full p-4 text-left ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {label}
            </p>
            {isDemo && (
              <span
                className="badge border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
                title="Simulated data — backend is not connected"
              >
                Demo
              </span>
            )}
          </div>

          {loading ? (
            <div className="skeleton mt-3 h-8 w-24" />
          ) : (
            <p className="mt-1.5 truncate text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {value}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {hint && <p className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
            {trend && (
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
                  trend.deltaPercent >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
                title={`Compared with the previous ${trend.days || 7}-day period`}
              >
                <span aria-hidden="true">{trend.deltaPercent >= 0 ? '▲' : '▼'}</span>
                {Math.abs(trend.deltaPercent).toFixed(0)}%
                <span className="font-medium text-slate-400 dark:text-slate-500">vs prev</span>
              </span>
            )}
          </div>
        </div>

        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.slate}`}>
          {icon}
        </div>
      </div>
    </Wrapper>
  );
}
