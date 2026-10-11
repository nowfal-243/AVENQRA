import React from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const ICONS = {
  success: { Icon: CheckCircle2, classes: 'text-emerald-500' },
  error: { Icon: XCircle, classes: 'text-rose-500' },
  warning: { Icon: AlertTriangle, classes: 'text-amber-500' },
  info: { Icon: Info, classes: 'text-cyan-500' },
};

const BORDER = {
  success: 'border-l-emerald-500',
  error: 'border-l-rose-500',
  warning: 'border-l-amber-500',
  info: 'border-l-cyan-500',
};

/**
 * Toast stack — rendered once at the app root by ToastProvider.
 * Accessible: role="status" / role="alert" and keyboard-dismissable.
 */
export default function Toast({ toasts = [], onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const { Icon, classes } = ICONS[toast.type] || ICONS.info;
        return (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 border-l-4 bg-white p-3.5 shadow-panel animate-slide-in-right dark:border-slate-700 dark:border-l-slate-500 dark:bg-navy-850 ${
              BORDER[toast.type] || 'border-l-cyan-500'
            }`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${classes}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              {toast.title && (
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{toast.title}</p>
              )}
              <p className="break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {toast.message}
              </p>
              {toast.action}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-navy-800 dark:hover:text-slate-200"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
