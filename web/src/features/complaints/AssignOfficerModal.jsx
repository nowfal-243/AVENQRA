import React, { useMemo, useState } from 'react';
import { UserCheck, AlertCircle, ShieldCheck } from 'lucide-react';
import Modal from '../../components/common/Modal';
import useComplaints from '../../hooks/useComplaints';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { isSuperAdmin } from '../../utils/permissions';

/**
 * AssignOfficerModal — dispatch / reassign a field officer to a complaint.
 * Unavailable officers (BUSY / ON_LEAVE) are blocked unless a Super Admin
 * explicitly ticks the authorised override. The backend re-validates every
 * assignment server-side regardless of what the UI allows.
 */
export default function AssignOfficerModal({ complaint, onClose, onSuccess }) {
  const { officers, departments } = useData();
  const { assignOfficer } = useComplaints();
  const toast = useToast();
  const { user } = useAuth();

  const [selectedDept, setSelectedDept] = useState(complaint?.departmentId || '');
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [override, setOverride] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredOfficers = useMemo(
    () => (selectedDept ? officers.filter((o) => o.departmentId === selectedDept) : officers),
    [officers, selectedDept]
  );

  const selected = officers.find((o) => o.id === selectedOfficer);
  const unavailable = selected && selected.status !== 'ACTIVE';
  const canOverride = isSuperAdmin(user);
  const blocked = unavailable && !(canOverride && override);

  const handleAssign = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedOfficer) {
      setError('Select a field officer to dispatch.');
      return;
    }
    if (blocked) {
      setError(
        `${selected.user?.name || 'This officer'} is ${selected.status}. Only a Super Admin override can assign anyway.`
      );
      return;
    }

    setLoading(true);
    const result = await assignOfficer(complaint.id, selectedOfficer);
    setLoading(false);

    if (result.ok) {
      toast.success(
        `${complaint.ticketNumber} dispatched to ${selected.user?.name} (#${selected.badgeNumber})${
          unavailable ? ' — override applied' : ''
        }.`
      );
      onSuccess?.();
      onClose();
    } else {
      setError(result.error);
      toast.error(result.error || 'Assignment failed.');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Dispatch field officer"
      subtitle={complaint ? `${complaint.ticketNumber} · ${complaint.title}` : ''}
      icon={<UserCheck className="h-5 w-5" aria-hidden="true" />}
    >
      <form onSubmit={handleAssign} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        <div>
          <label htmlFor="assign-dept" className="label">
            Target department
          </label>
          <select
            id="assign-dept"
            className="select"
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setSelectedOfficer('');
            }}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="assign-officer" className="label">
            Field officer
          </label>
          <select
            id="assign-officer"
            className="select"
            value={selectedOfficer}
            onChange={(e) => setSelectedOfficer(e.target.value)}
            required
          >
            <option value="">Choose an officer…</option>
            {filteredOfficers.map((o) => (
              <option key={o.id} value={o.id} disabled={o.status !== 'ACTIVE'}>
                {o.user?.name} — #{o.badgeNumber}
                {o.status !== 'ACTIVE' ? ` (${o.status})` : ' (Active)'}
              </option>
            ))}
          </select>
          {filteredOfficers.length === 0 && (
            <p className="field-error">No officers found for this department.</p>
          )}
          <p className="mt-1.5 text-[10px] text-slate-400">
            Distance-based routing requires officer GPS telemetry, which this API does not provide —
            selection is by availability only.
          </p>
        </div>

        {selected && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-navy-850">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                {selected.user?.name}
              </p>
              <p className="text-[11px] text-slate-500">
                {selected.department?.name || 'No department'} ·{' '}
                {selected._count?.assignments ?? 0} assignments on record
              </p>
            </div>
            <span
              className={`badge shrink-0 ${
                selected.status === 'ACTIVE'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
              }`}
            >
              {selected.status}
            </span>
          </div>
        )}

        {unavailable && canOverride && (
          <label className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-amber-400"
            />
            <span>
              <strong className="font-bold">Super Admin override:</strong> assign anyway to an officer
              marked {selected.status}. The override is recorded in the assignment audit trail.
            </span>
          </label>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !selectedOfficer || blocked}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {loading ? 'Dispatching…' : 'Dispatch officer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}