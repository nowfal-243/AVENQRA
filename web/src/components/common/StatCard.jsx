import React from 'react';

/**
 * StatCard — Enterprise executive KPI tile with ambient glow, tabular metrics,
 * hairline accent borders, contextual trend pills, and accessible interactions.
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
    slate: {
      icon: 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 ring-slate-400/20',
      border: 'before:from-slate-400/60 before:via-slate-500/30',
      glow: 'group-hover:shadow-[0_8px_30px_rgba(100,116,139,0.15)]',
      bar: 'bg-slate-400',
    },
    cyan: {
      icon: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300 ring-cyan-500/30 shadow-sm shadow-cyan-500/10',
      border: 'before:from-cyan-400 before:via-cyan-500/40',
      glow: 'group-hover:shadow-[0_8px_30px_rgba(6,182,212,0.18)]',
      bar: 'bg-cyan-500',
    },
    blue: {
      icon: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 ring-blue-500/30 shadow-sm shadow-blue-500/10',
      border: 'before:from-blue-500 before:via-indigo-500/40',
      glow: 'group-hover:shadow-[0_8px_30px_rgba(59,130,246,0.18)]',
      bar: 'bg-blue-500',
    },
    amber: {
      icon: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 ring-amber-500/30 shadow-sm shadow-amber-500/10',
      border: 'before:from-amber-400 before:via-orange-500/40',
      glow: 'group-hover:shadow-[0_8px_30px_rgba(245,158,11,0.18)]',
      bar: 'bg-amber-500',
    },
    rose: {
      icon: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300 ring-rose-500/30 shadow-sm shadow-rose-500/10',
      border: 'before:from-rose-500 before:via-red-500/40',
      glow: 'group-hover:shadow-[0_8px_30px_rgba(244,63,94,0.22)]',
      bar: 'bg-rose-500',
    },
    emerald: {
      icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300 ring-emerald-500/30 shadow-sm shadow-emerald-500/10',
      border: 'before:from-emerald-400 before:via-teal-500/40',
      glow: 'group-hover:shadow-[0_8px_30px_rgba(16,185,129,0.18)]',
      bar: 'bg-emerald-500',
    },
  };

  const currentTone = tones[tone] || tones.slate;
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick || undefined}
      aria-label={ariaLabel || undefined}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-4 sm:p-5 text-left shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 dark:border-white/[0.08] dark:bg-navy-900/90 dark:backdrop-blur-xl ${currentTone.glow} ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      } before:absolute before:inset-x-0 before:top-0 before:h-[2.5px] before:bg-gradient-to-r ${currentTone.border} before:to-transparent`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {label}
            </p>
            {isDemo && (
              <span
                className="badge border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300 text-[9px] px-1.5 py-0"
                title="Simulated data — backend in demo mode"
              >
                Demo
              </span>
            )}
          </div>

          {loading ? (
            <div className="skeleton mt-3 h-9 w-28 rounded-lg" />
          ) : (
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums drop-shadow-sm">
                {value}
              </span>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {hint && (
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {hint}
              </p>
            )}
            {trend && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                  trend.deltaPercent >= 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
                    : 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30'
                }`}
                title={`Compared with previous ${trend.days || 7}-day window`}
              >
                <span aria-hidden="true">{trend.deltaPercent >= 0 ? '▲' : '▼'}</span>
                <span>{Math.abs(trend.deltaPercent).toFixed(0)}%</span>
                <span className="font-normal opacity-70">vs prev</span>
              </span>
            )}
          </div>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-105 ${currentTone.icon}`}
        >
          {icon}
        </div>
      </div>

      {/* Micro-sparkline hairline bar at bottom */}
      <div className="mt-3.5 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-navy-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${currentTone.bar}`}
          style={{ width: loading ? '0%' : '100%', opacity: 0.85 }}
        />
      </div>
    </Wrapper>
  );
}
