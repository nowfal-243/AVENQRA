import React from 'react';

/** LoadingSkeleton — shimmer placeholders for tables, cards and charts. */
export function SkeletonBlock({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function StatCardSkeleton() {
  return (
    <div className="card p-4" aria-hidden="true">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton mt-3 h-8 w-20" />
      <div className="skeleton mt-3 h-3 w-32" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="table-shell p-4" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="skeleton h-4 flex-1" style={{ opacity: 1 - r * 0.08 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid gap-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3 p-4">
          <div className="skeleton h-4 w-2/5" />
          <div className="skeleton h-3 w-4/5" />
          <div className="skeleton h-3 w-3/5" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 260 }) {
  return (
    <div className="card p-4" aria-hidden="true">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-4 w-full" style={{ height }} />
    </div>
  );
}

/** Screen-reader friendly status text paired with skeletons. */
export default function LoadingSkeleton({ label = 'Loading data…', variant = 'cards', count = 3, rows = 6, cols = 5, height = 260 }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {variant === 'table' && <TableSkeleton rows={rows} cols={cols} />}
      {variant === 'chart' && <ChartSkeleton height={height} />}
      {variant === 'cards' && <CardSkeleton count={count} />}
      {variant === 'stats' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: count || 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  );
}
