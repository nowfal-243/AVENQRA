import React, { useMemo, useState } from 'react';
import {
  Eye,
  UserCheck,
  PlayCircle,
  CheckCircle2,
  ShieldAlert,
  ImageIcon,
  MapPin,
  Clock,
  GripVertical,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/Modal';
import AssignOfficerModal from './AssignOfficerModal';
import ComplaintDetailModal from './ComplaintDetailModal';
import useComplaints from '../../hooks/useComplaints';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { can, canTransition, transitionTargets, getSlaState } from '../../utils/permissions';
import { KANBAN_COLUMNS, PRIORITY_META } from '../../utils/constants';
import { timeAgo, formatDuration, formatCoords } from '../../utils/formatters';
import useNow from '../../hooks/useNow';

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

function KanbanCard({
  complaint,
  now,
  slaMinutes,
  onView,
  onAssign,
  onTransition,
  onEvidence,
  canAssign,
  canEscalate,
  dragProps,
}) {
  const sla = getSlaState(complaint, slaMinutes, now);
  const officer = complaint.assignments?.[complaint.assignments.length - 1]?.officer || null;
  const thumb = complaint.images?.[0]?.imageUrl || null;
  const priorityMeta = PRIORITY_META[complaint.priority] || PRIORITY_META.MEDIUM;
  const targets = transitionTargets(complaint.currentStatus);

  return (
    <article
      {...dragProps}
      className={`group relative rounded-xl border bg-white p-3.5 shadow-card transition-all hover:shadow-card-hover dark:bg-navy-850 ${
        complaint.currentStatus === 'ESCALATED' || complaint.isEscalated
          ? 'border-rose-300 dark:border-rose-500/50'
          : 'border-slate-200 dark:border-slate-700/70'
      }`}
      aria-label={`Complaint ${complaint.ticketNumber}: ${complaint.title}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${priorityMeta.bar}`} aria-hidden="true" />

      <div className="flex items-start justify-between gap-2 pl-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <GripVertical
              className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 dark:text-slate-600"
              aria-hidden="true"
            />
            <span className="truncate text-[11px] font-bold text-slate-400">{complaint.ticketNumber}</span>
            {complaint.isDemoRecord && (
              <span className="badge border-violet-200 bg-violet-50 px-1 py-0 text-[8px] text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                demo
              </span>
            )}
          </div>
          <h4 className="mt-1 text-[13px] font-bold leading-snug text-slate-800 dark:text-slate-100">
            {complaint.title}
          </h4>
        </div>
        {thumb ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-300 dark:border-slate-700 dark:text-slate-600">
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1 pl-1.5">
        <StatusBadge status={complaint.currentStatus} size="sm" />
        <StatusBadge priority={complaint.priority} className="scale-90" />
        {complaint.aiAnalysis?.confidenceScore != null && (
          <span
            className="badge border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-600/40 dark:bg-slate-500/10 dark:text-slate-300"
            title={`AI classifier confidence: ${Math.round(complaint.aiAnalysis.confidenceScore * 100)}%`}
          >
            AI {Math.round(complaint.aiAnalysis.confidenceScore * 100)}%
          </span>
        )}
        {complaint.aiAnalysis?.severityScore != null && (
          <span className="badge border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-600/40 dark:bg-slate-500/10 dark:text-slate-300">
            sev {Number(complaint.aiAnalysis.severityScore).toFixed(1)}
          </span>
        )}
      </div>

      <p className="mt-2 line-clamp-1 pl-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        {complaint.category}
      </p>

      <div className="mt-1.5 flex items-center gap-2.5 pl-1.5 text-[10px] text-slate-400">
        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {complaint.location?.addressFormatted ||
              formatCoords(complaint.location?.latitude, complaint.location?.longitude) ||
              'No location'}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {timeAgo(complaint.createdAt)}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 pl-1.5 text-[10px]">
        <div className="rounded-md bg-slate-50 px-2 py-1 dark:bg-navy-900">
          <span className="block text-slate-400">Department</span>
          <span className="block truncate font-semibold text-slate-600 dark:text-slate-300">
            {complaint.department?.name || 'Unassigned'}
          </span>
        </div>
        <div className="rounded-md bg-slate-50 px-2 py-1 dark:bg-navy-900">
          <span className="block text-slate-400">Officer</span>
          <span className="block truncate font-semibold text-slate-600 dark:text-slate-300">
            {officer ? officer.user?.name || 'Officer' : 'Not dispatched'}
          </span>
        </div>
      </div>

      <div
        className={`mt-2 flex items-center justify-between rounded-md px-2 py-1.5 text-[10px] font-bold ${
          sla.overdue
            ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
            : sla.resolved
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300'
        }`}
      >
        <span>
          {sla.resolved
            ? sla.withinSla
              ? 'Resolved within SLA'
              : 'Resolved after SLA'
            : sla.overdue
              ? 'SLA overdue'
              : 'SLA remaining'}
        </span>
        <span className="tabular-nums">
          {sla.resolved
            ? formatDuration(Math.abs((sla.resolvedAt || now) - sla.deadline))
            : formatDuration(sla.remainingMs)}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2.5 pl-1.5 dark:border-slate-800">
        <button type="button" className="btn btn-xs btn-ghost" onClick={() => onView(complaint)} title="View details">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Details
        </button>
        {canAssign && (
          <button type="button" className="btn btn-xs btn-ghost" onClick={() => onAssign(complaint)} title="Assign or reassign officer">
            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" /> Assign
          </button>
        )}
        {targets.includes('IN_PROGRESS') && (
          <button
            type="button"
            className="btn btn-xs btn-ghost"
            onClick={() => onTransition(complaint, 'IN_PROGRESS')}
            title="Move to in progress"
          >
            <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" /> Start
          </button>
        )}
        {targets.includes('RESOLVED') && (
          <button
            type="button"
            className="btn btn-xs btn-ghost text-emerald-600 dark:text-emerald-400"
            onClick={() => onTransition(complaint, 'RESOLVED')}
            title="Mark resolved"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Resolve
          </button>
        )}
        {canEscalate && targets.includes('ESCALATED') && (
          <button
            type="button"
            className="btn btn-xs btn-ghost text-rose-600 dark:text-rose-400"
            onClick={() => onTransition(complaint, 'ESCALATED')}
            title="Trigger SLA escalation"
          >
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> Escalate
          </button>
        )}
        <button
          type="button"
          className="btn btn-xs btn-ghost ml-auto"
          onClick={() => onEvidence(complaint)}
          title="View resolution evidence"
        >
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" /> Evidence
        </button>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Board                                                               */
/* ------------------------------------------------------------------ */

export default function ComplaintKanban({ data: dataProp }) {
  const { complaints, loading, slaMinutes, isDemo, refresh, changeStatus } = useComplaints();
  const { user } = useAuth();
  const toast = useToast();
  const now = useNow();

  const [detailId, setDetailId] = useState(null);
  const [assignComplaint, setAssignComplaint] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(null);
  const [dragId, setDragId] = useState(null);

  const canAssign = can(user, 'assignOfficer');
  const canEscalate = can(user, 'escalateComplaint');

  /* Prefer the live complaint list; allow a `data` prop override */
  const columns = useMemo(() => {
    if (dataProp && Array.isArray(dataProp.newlyAssigned)) {
      return KANBAN_COLUMNS.map((col) => ({ ...col, items: dataProp[col.id] || [] }));
    }
    return KANBAN_COLUMNS.map((col) => ({
      ...col,
      items: complaints.filter((c) => col.statuses.includes(c.currentStatus)),
    }));
  }, [complaints, dataProp]);

  const runTransition = async (complaint, status) => {
    if (!canTransition(complaint.currentStatus, status)) {
      toast.error(`"${complaint.ticketNumber}" cannot move to ${status} from ${complaint.currentStatus}.`);
      return;
    }
    setBusy(true);
    const result = await changeStatus(
      complaint,
      status,
      status === 'ESCALATED' ? 'Escalated manually from the dispatch board' : 'Status updated via dispatch board'
    );
    setBusy(false);
    setConfirm(null);
    if (result.ok) {
      toast.success(`${complaint.ticketNumber} → ${status.replace('_', ' ').toLowerCase()}.`);
      refresh();
    } else {
      toast.error(result.error || 'The server rejected this change.');
      refresh();
    }
  };

  const requestTransition = (complaint, status) => {
    if (status === 'RESOLVED' || status === 'ESCALATED') {
      setConfirm({ complaint, status });
    } else {
      runTransition(complaint, status);
    }
  };

  /* Drag & drop validates the same transitions as the buttons */
  const handleDrop = (column, e) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/plain');
    setDragId(null);
    const complaint = complaints.find((c) => c.id === id);
    if (!complaint || column.statuses.includes(complaint.currentStatus)) return;

    const targetStatus =
      column.id === 'completed' ? 'RESOLVED' : column.id === 'pending' ? 'IN_PROGRESS' : 'ASSIGNED';

    if (!canTransition(complaint.currentStatus, targetStatus)) {
      toast.error(
        `Invalid move: ${complaint.currentStatus} → ${targetStatus}. Use the card actions instead.`
      );
      return;
    }
    if (targetStatus === 'RESOLVED' || targetStatus === 'ESCALATED') {
      setConfirm({ complaint, status: targetStatus });
      return;
    }
    runTransition(complaint, targetStatus);
  };

  if (loading && complaints.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-3" aria-busy="true">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col.id} className="card p-4">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton mt-4 h-24 w-full" />
            <div className="skeleton mt-3 h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Drag cards between columns or use the card actions — every move validates allowed status
          transitions and syncs with the backend.
        </p>
        <span className="text-[11px] text-slate-400">{isDemo ? 'Demo dataset' : 'Live data'}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((column) => (
          <section
            key={column.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(column.id);
            }}
            onDragLeave={() => setDragOver((v) => (v === column.id ? null : v))}
            onDrop={(e) => handleDrop(column, e)}
            className={`flex min-h-[220px] flex-col rounded-xl border bg-slate-50/80 p-3 transition-colors dark:bg-navy-900/60 ${
              dragOver === column.id
                ? 'border-cyan-400 bg-cyan-50/60 dark:border-cyan-500/60 dark:bg-cyan-500/5'
                : 'border-slate-200 dark:border-slate-800'
            }`}
            aria-label={`${column.title} column`}
          >
            <header className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${column.accent}`} aria-hidden="true" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {column.title}
                </h3>
              </div>
              <span className="badge border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-navy-850 dark:text-slate-300">
                {column.items.length}
              </span>
            </header>

            <div className="flex flex-1 flex-col gap-3">
              {column.items.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400 dark:border-slate-700">
                  No complaints in this stage
                </div>
              )}
              {column.items.map((complaint) => (
                <div
                  key={complaint.id}
                  className={dragId === complaint.id ? 'opacity-50' : ''}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', complaint.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDragId(complaint.id);
                  }}
                  onDragEnd={() => setDragId(null)}
                >
                  <KanbanCard
                    complaint={complaint}
                    now={now}
                    slaMinutes={slaMinutes}
                    canAssign={canAssign}
                    canEscalate={canEscalate}
                    onView={(c) => setDetailId(c.id)}
                    onAssign={(c) => setAssignComplaint(c)}
                    onEvidence={(c) => setDetailId(c.id)}
                    onTransition={requestTransition}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {detailId && (
        <ComplaintDetailModal
          complaintId={detailId}
          onClose={() => setDetailId(null)}
          onRefresh={refresh}
        />
      )}

      {assignComplaint && (
        <AssignOfficerModal
          complaint={assignComplaint}
          onClose={() => setAssignComplaint(null)}
          onSuccess={refresh}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        loading={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => runTransition(confirm.complaint, confirm.status)}
        title={confirm?.status === 'ESCALATED' ? 'Trigger SLA escalation' : 'Mark complaint resolved'}
        message={
          confirm?.status === 'ESCALATED'
            ? `Escalate ${confirm?.complaint?.ticketNumber} to the highest municipal authority? Priority will be raised to CRITICAL and the breach recorded in the audit log.`
            : `Mark ${confirm?.complaint?.ticketNumber} as resolved? Record resolution evidence from the officer portal when available.`
        }
        confirmLabel={confirm?.status === 'ESCALATED' ? 'Escalate now' : 'Mark resolved'}
        tone={confirm?.status === 'ESCALATED' ? 'danger' : 'success'}
      />
    </div>
  );
}