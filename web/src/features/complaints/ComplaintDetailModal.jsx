import React, { useCallback, useEffect, useState } from 'react';
import {
  MapPin,
  Clock,
  ShieldAlert,
  Image as ImageIcon,
  UserCheck,
  History,
  Bot,
  Building2,
  Flag,
  RefreshCw,
} from 'lucide-react';
import Modal, { ConfirmDialog } from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import AssignOfficerModal from './AssignOfficerModal';
import useComplaints from '../../hooks/useComplaints';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { can, canTransition, transitionTargets, isConsequentialTransition, getSlaState } from '../../utils/permissions';
import { formatDateTime, timeAgo, formatDuration, formatCoords } from '../../utils/formatters';
import useNow from '../../hooks/useNow';

const STATUS_LABELS = {
  SUBMITTED: 'Filed',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

function SlaPanel({ complaint, slaMinutes, now }) {
  const sla = getSlaState(complaint, slaMinutes, now);
  if (!sla.supported) return null;

  return (
    <div
      className={`rounded-xl border p-4 ${
        sla.overdue
          ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'
          : sla.resolved
            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
            : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-navy-850'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <Clock className="h-4 w-4" aria-hidden="true" />
          {slaMinutes}-minute SLA window
        </div>
        <span
          className={`text-lg font-extrabold tabular-nums ${
            sla.overdue ? 'text-rose-600 dark:text-rose-400' : sla.resolved ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-600 dark:text-cyan-400'
          }`}
        >
          {sla.resolved
            ? sla.withinSla
              ? 'Met'
              : 'Missed'
            : formatDuration(sla.remainingMs)}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <dt className="text-slate-400">Deadline (server time)</dt>
          <dd className="font-semibold text-slate-600 dark:text-slate-300">{formatDateTime(sla.deadline)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Escalation state</dt>
          <dd className="font-semibold text-slate-600 dark:text-slate-300">
            {sla.breached ? 'Escalated to Super Admin' : sla.overdue ? 'Overdue — server job escalates' : 'Within window'}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
        Countdown is display-only. Deadline checks and escalations run in the backend SLA worker, not
        in the browser.
      </p>
    </div>
  );
}

/**
 * ComplaintDetailModal — full record: description, evidence, location,
 * assignment & status history, SLA state and workflow actions.
 */
export default function ComplaintDetailModal({ complaintId, complaint: initial, onClose, onRefresh }) {
  const [detail, setDetail] = useState(initial || null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const { slaMinutes, isDemo } = useData();
  const toast = useToast();
  const { changeStatus, getDetail } = useComplaints();
  const now = useNow();

  const load = useCallback(async () => {
    if (!complaintId) return;
    setLoading(true);
    setError(null);
    try {
      const { row } = await getDetail(complaintId);
      setDetail(row);
    } catch (err) {
      setError(err.message);
      if (initial) setDetail(initial);
    } finally {
      setLoading(false);
    }
  }, [complaintId, getDetail, initial]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaintId]);

  const runTransition = async (status) => {
    if (!detail) return;
    setBusy(true);
    const result = await changeStatus(detail, status, `Status updated to ${STATUS_LABELS[status] || status}`);
    setBusy(false);
    setConfirm(null);
    if (result.ok) {
      toast.success(`${detail.ticketNumber} moved to ${STATUS_LABELS[status] || status}.`);
      await load();
      onRefresh?.();
    } else {
      toast.error(result.error || 'Update failed. The server may be unavailable.');
      await load();
    }
  };

  const targets = detail ? transitionTargets(detail.currentStatus) : [];
  const canAssign = can(user, 'assignOfficer');
  const canEscalate = can(user, 'escalateComplaint');
  const showNotes = can(user, 'viewInternalNotes');
  const images = detail?.images || [];
  const originalImages = images.filter((i) => (i.imageType || 'INITIAL') === 'INITIAL');
  const evidenceImages = images.filter((i) => i.imageType && i.imageType !== 'INITIAL');
  const assignments = detail?.assignments || [];
  const latestAssignment = assignments[assignments.length - 1] || null;

  if (!complaintId && !initial) return null;

  return (
    <>
      <Modal
        open={!!complaintId || !!initial}
        onClose={onClose}
        size="lg"
        title={detail ? `Ticket #${detail.ticketNumber}` : 'Complaint details'}
        subtitle={detail ? detail.title : ''}
        icon={<Flag className="h-5 w-5" aria-hidden="true" />}
        footer={
          <>
            <span className="mr-auto text-[10px] text-slate-400">
              {isDemo ? 'Demo record' : 'Live record'}
            </span>
            {canAssign && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAssignOpen(true)}>
                <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {latestAssignment ? 'Reassign officer' : 'Assign officer'}
              </button>
            )}
            {targets.includes('IN_PROGRESS') && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm({ status: 'IN_PROGRESS' })}>
                Move to In Progress
              </button>
            )}
            {targets.includes('RESOLVED') && (
              <button type="button" className="btn btn-success btn-sm" onClick={() => setConfirm({ status: 'RESOLVED' })}>
                Mark Resolved
              </button>
            )}
            {canEscalate && targets.includes('ESCALATED') && (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirm({ status: 'ESCALATED' })}>
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                Escalate
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Close
            </button>
          </>
        }
      >
        {loading && <LoadingSkeleton variant="cards" count={3} label="Loading complaint details…" />}

        {!loading && error && !detail && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
            <button type="button" className="btn btn-xs btn-secondary ml-3" onClick={load}>
              Retry
            </button>
          </div>
        )}

        {!loading && detail && (
          <div className="space-y-5">
            {/* Status header */}
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.currentStatus} />
              <StatusBadge priority={detail.priority} />
              {detail.isEscalated && (
                <span className="badge border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300">
                  <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                  SLA breach history
                </span>
              )}
              <span className="badge border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-600/40 dark:bg-slate-500/10 dark:text-slate-300">
                {detail.category}
              </span>
            </div>

            <SlaPanel complaint={detail} slaMinutes={slaMinutes} now={now} />

            {/* Meta grid */}
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-navy-850">
                <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Building2 className="h-3 w-3" aria-hidden="true" /> Department
                </dt>
                <dd className="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {detail.department?.name || 'Unassigned department'}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-navy-850">
                <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <UserCheck className="h-3 w-3" aria-hidden="true" /> Officer
                </dt>
                <dd className="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {latestAssignment
                    ? `${latestAssignment.officer?.user?.name || 'Officer'} (#${latestAssignment.officer?.badgeNumber || '—'})`
                    : 'Not dispatched'}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-navy-850">
                <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Bot className="h-3 w-3" aria-hidden="true" /> AI analysis
                </dt>
                <dd className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {detail.aiAnalysis ? (
                    <>
                      severity {Number(detail.aiAnalysis.severityScore).toFixed(1)}/10
                      {detail.aiAnalysis.confidenceScore != null && (
                        <span className="ml-1 font-medium text-slate-400">
                          · {Math.round(detail.aiAnalysis.confidenceScore * 100)}% conf.
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="font-medium text-slate-400">Not available</span>
                  )}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-navy-850">
                <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Flag className="h-3 w-3" aria-hidden="true" /> Filed
                </dt>
                <dd className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {formatDateTime(detail.createdAt)}
                </dd>
              </div>
            </dl>

            {/* Description */}
            <section>
              <h3 className="panel-title">Description</h3>
              <p className="mt-1.5 whitespace-pre-line rounded-lg border border-slate-100 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-navy-850 dark:text-slate-300">
                {detail.description}
              </p>
            </section>

            {/* Media & location */}
            <div className="grid gap-4 sm:grid-cols-2">
              <section>
                <h3 className="panel-title">Original photo</h3>
                <div className="mt-1.5">
                  {originalImages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {originalImages.slice(0, 2).map((img) => (
                        <img
                          key={img.id}
                          src={img.imageUrl}
                          alt="Original complaint evidence"
                          loading="lazy"
                          className="h-28 w-full rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700">
                      <ImageIcon className="h-4 w-4" aria-hidden="true" /> No photo attached
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="panel-title">Resolution evidence</h3>
                <div className="mt-1.5">
                  {evidenceImages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {evidenceImages.slice(0, 2).map((img) => (
                        <img
                          key={img.id}
                          src={img.imageUrl}
                          alt="Resolution evidence"
                          loading="lazy"
                          className="h-28 w-full rounded-lg border border-emerald-200 object-cover dark:border-emerald-500/40"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-400 dark:border-slate-700">
                      <ImageIcon className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {detail.currentStatus === 'RESOLVED'
                          ? 'Marked resolved without uploaded evidence'
                          : 'No evidence yet'}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-lg border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-navy-850">
              <h3 className="panel-title flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-cyan-500" aria-hidden="true" /> Location
              </h3>
              {detail.location ? (
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 dark:text-slate-300">
                    {detail.location.addressFormatted || 'No formatted address'}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {formatCoords(detail.location.latitude, detail.location.longitude)}
                    {detail.isDemoRecord && (
                      <span className="badge ml-2 border-violet-200 bg-violet-50 text-violet-600">
                        demo coords
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-slate-400">No coordinates recorded for this complaint.</p>
              )}
            </section>

            {/* Histories */}
            <div className="grid gap-4 sm:grid-cols-2">
              <section>
                <h3 className="panel-title">Assignment history</h3>
                <ul className="mt-1.5 space-y-2">
                  {assignments.length === 0 && (
                    <li className="text-xs text-slate-400">No dispatch records yet.</li>
                  )}
                  {assignments.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-navy-900"
                    >
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {a.officer?.user?.name || 'Officer'}{' '}
                        <span className="font-normal text-slate-400">#{a.officer?.badgeNumber}</span>
                      </span>
                      <span className="text-[10px] text-slate-400">{timeAgo(a.assignedAt)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="panel-title flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" /> Status history
                </h3>
                <ol className="mt-1.5 max-h-52 space-y-3 overflow-y-auto pr-1">
                  {(!detail.statusLogs || detail.statusLogs.length === 0) && (
                    <li className="text-xs text-slate-400">No status changes recorded.</li>
                  )}
                  {(detail.statusLogs || []).map((log) => (
                    <li key={log.id} className="relative border-l-2 border-slate-200 pl-4 dark:border-slate-700">
                      <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-cyan-500" aria-hidden="true" />
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={log.status} size="sm" />
                        <span className="text-[10px] text-slate-400">{formatDateTime(log.changedAt)}</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {showNotes ? log.remarks : 'Remarks hidden for your role.'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {log.updatedBy?.name || 'System'}
                        {log.updatedBy?.role ? ` · ${log.updatedBy.role}` : ''}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-400">
              <RefreshCw className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              Record refreshed {timeAgo(detail.updatedAt || detail.createdAt)} · timestamps shown in
              your local timezone, stored as UTC on the server.
            </p>
          </div>
        )}
      </Modal>

      {assignOpen && detail && (
        <AssignOfficerModal
          complaint={detail}
          onClose={() => setAssignOpen(false)}
          onSuccess={async () => {
            await load();
            onRefresh?.();
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        loading={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => runTransition(confirm.status)}
        title="Confirm status change"
        message={`Move ${detail?.ticketNumber || 'this complaint'} from ${
          STATUS_LABELS[detail?.currentStatus] || detail?.currentStatus
        } to ${STATUS_LABELS[confirm?.status] || confirm?.status}?`}
        confirmLabel={confirm?.status === 'ESCALATED' ? 'Escalate now' : 'Confirm change'}
        tone={confirm?.status === 'ESCALATED' ? 'danger' : confirm?.status === 'RESOLVED' ? 'success' : 'primary'}
      />
    </>
  );
}
