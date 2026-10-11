import React from 'react';
import { STATUS_META, PRIORITY_META } from '../../utils/constants';

/**
 * StatusBadge — consistent pill rendering for complaint statuses,
 * priorities and officer availability.
 */
export default function StatusBadge({ status, priority, size = 'md', className = '' }) {
  if (status) {
    const meta = STATUS_META[status] || {
      label: status,
      dot: 'bg-slate-400',
      classes: 'border-slate-200 bg-slate-50 text-slate-600',
    };
    return (
      <span
        className={`badge ${meta.classes} ${size === 'sm' ? 'px-1.5 py-0 text-[9px]' : ''} ${className}`}
        title={`Status: ${meta.label}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
        {meta.label}
      </span>
    );
  }

  if (priority) {
    const meta = PRIORITY_META[priority] || { label: priority, classes: '' };
    return (
      <span className={`badge ${meta.classes} ${className}`} title={`Priority: ${meta.label}`}>
        {meta.label}
      </span>
    );
  }

  return null;
}
