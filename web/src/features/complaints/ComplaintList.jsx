import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Download,
  Eye,
  PlayCircle,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  ListChecks,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { DataErrorBar } from '../../components/common/DemoBanner';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import { ConfirmDialog } from '../../components/common/Modal';
import ComplaintDetailModal from './ComplaintDetailModal';
import AssignOfficerModal from './AssignOfficerModal';
import useComplaints from '../../hooks/useComplaints';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { can, canTransition, transitionTargets, getSlaState } from '../../utils/permissions';
import { CATEGORIES, STATUS_META, PRIORITY_META, STATUSES } from '../../utils/constants';
import {
  formatDateTime,
  timeAgo,
  formatDuration,
  downloadCsv,
  formatCoords,
} from '../../utils/formatters';
import useNow from '../../hooks/useNow';

const PAGE_SIZES = [10, 25, 50];

const SORT_ACCESSORS = {
  ticket: (c) => c.ticketNumber || '',
  title: (c) => c.title || '',
  category: (c) => c.category || '',
  priority: (c) => ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].indexOf(c.priority),
  status: (c) => STATUSES.indexOf(c.currentStatus),
  officer: (c) => c.assignments?.[c.assignments.length - 1]?.officer?.user?.name || 'zzz',
  createdAt: (c) => new Date(c.createdAt).getTime(),
};

export default function ComplaintList() {
  const { complaints, loading, error, refresh, slaMinutes, isDemo, changeStatus } = useComplaints();
  const { departments, officers } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const now = useNow();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [deptId, setDeptId] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(() => new Set());
  const [detailId, setDetailId] = useState(searchParams.get('focus') || null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(null);
  const [rowConfirm, setRowConfirm] = useState(null);
  const [rowBusy, setRowBusy] = useState(null);
  const [busy, setBusy] = useState(false);

  const canExport = can(user, 'exportCsv');
  const canAssign = can(user, 'assignOfficer');
  const canEscalate = can(user, 'escalateComplaint');

  /* Deep-link support: /complaints?focus=<id> opens the detail modal */
  useEffect(() => {
    const focus = searchParams.get('focus');
    if (focus) setDetailId(focus);
    const q = searchParams.get('q');
    if (q) setSearch(q);
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 : null;
    return complaints.filter((c) => {
      if (q) {
        const hay = `${c.ticketNumber} ${c.title} ${c.location?.addressFormatted || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (category && c.category !== category) return false;
      if (status && c.currentStatus !== status) return false;
      if (priority && c.priority !== priority) return false;
      if (deptId && c.departmentId !== deptId) return false;
      if (officerId) {
        const assigned = (c.assignments || []).some(
          (a) => a.officerId === officerId || a.officer?.id === officerId
        );
        if (!assigned) return false;
      }
      const created = new Date(c.createdAt).getTime();
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    });
  }, [complaints, search, category, status, priority, deptId, officerId, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    const accessor = SORT_ACCESSORS[sort.key] || SORT_ACCESSORS.createdAt;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const activeFilters = [category, status, priority, deptId, officerId, dateFrom, dateTo].filter(Boolean).length;

  const toggleSort = (key) => {
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }));
    setPage(1);
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectPage = () => {
    setSelected((prev) => {
      const allOnPage = paged.every((c) => prev.has(c.id));
      const next = new Set(prev);
      paged.forEach((c) => (allOnPage ? next.delete(c.id) : next.add(c.id)));
      return next;
    });
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setPriority('');
    setDeptId('');
    setOfficerId('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    if (searchParams.get('q') || searchParams.get('focus')) setSearchParams({});
  };

  const exportCsv = () => {
    const rows = sorted.map((c) => ({
      ticket: c.ticketNumber,
      title: c.title,
      category: c.category,
      status: c.currentStatus,
      priority: c.priority,
      department: c.department?.name || '',
      officer: c.assignments?.[c.assignments.length - 1]?.officer?.user?.name || '',
      location: c.location?.addressFormatted || '',
      latitude: c.location?.latitude ?? '',
      longitude: c.location?.longitude ?? '',
      ai_severity: c.aiAnalysis?.severityScore ?? '',
      ai_confidence: c.aiAnalysis?.confidenceScore ?? '',
      created_utc: c.createdAt,
      escalated: c.isEscalated ? 'yes' : 'no',
      source: c.isDemoRecord ? 'demo' : 'live',
    }));
    if (rows.length === 0) {
      toast.warning('Nothing to export with the current filters.');
      return;
    }
    downloadCsv(`avenqra-complaints-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success(`Exported ${rows.length} complaints to CSV.`);
  };

  const runRowAction = async (complaint, target) => {
    setRowBusy(complaint.id);
    const result = await changeStatus(complaint, target, `Status updated from triage table`);
    setRowBusy(null);
    if (result.ok) {
      toast.success(`${complaint.ticketNumber} → ${target.replace('_', ' ').toLowerCase()}.`);
      refresh();
    } else {
      toast.error(result.error || 'Update failed.');
      refresh();
    }
  };

  const runBulk = async () => {
    setBusy(true);
    const targets = [...selected]
      .map((id) => complaints.find((c) => c.id === id))
      .filter(Boolean);
    let okCount = 0;
    for (const complaint of targets) {
      if (!canTransition(complaint.currentStatus, bulkConfirm.status)) continue;
      const result = await changeStatus(complaint, bulkConfirm.status, 'Bulk triage action');
      if (result.ok) okCount += 1;
    }
    setBusy(false);
    setBulkConfirm(null);
    setSelected(new Set());
    toast.success(`Bulk action applied to ${okCount} of ${targets.length} complaints.`);
    refresh();
  };

  const sortIcon = (key) =>
    sort.key === key ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : '';

  return (
    <div>
      <PageHeader
        title="Complaints Triage"
        description="Search, filter, dispatch and progress civic complaints through the workflow."
        actions={
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={refresh}>
              Refresh
            </button>
            {canExport && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={exportCsv}>
                <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export CSV
              </button>
            )}
          </>
        }
        badge={
          isDemo ? (
            <span className="badge border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
              demo data
            </span>
          ) : null
        }
      />

      <DataErrorBar message={error} onRetry={refresh} />

      {/* Toolbar */}
      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative flex-1 min-w-[200px]">
            <label htmlFor="triage-search" className="label">
              Search
            </label>
            <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              id="triage-search"
              type="search"
              className="input pl-9"
              placeholder="Ticket #, title or location…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:flex-wrap">
            <div>
              <label htmlFor="f-category" className="label">Category</label>
              <select id="f-category" className="select lg:w-44" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.label}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-status" className="label">Status</label>
              <select id="f-status" className="select lg:w-36" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-priority" className="label">Severity</label>
              <select id="f-priority" className="select lg:w-32" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
                <option value="">All levels</option>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                  <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-dept" className="label">Department</label>
              <select id="f-dept" className="select lg:w-44" value={deptId} onChange={(e) => { setDeptId(e.target.value); setPage(1); }}>
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-officer" className="label">Officer</label>
              <select id="f-officer" className="select lg:w-44" value={officerId} onChange={(e) => { setOfficerId(e.target.value); setPage(1); }}>
                <option value="">All officers</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>{o.user?.name} (#{o.badgeNumber})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-from" className="label">From</label>
              <input id="f-from" type="date" className="input lg:w-36" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label htmlFor="f-to" className="label">To</label>
              <input id="f-to" type="date" className="input lg:w-36" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="text-[11px] text-slate-500">
            Showing <strong>{sorted.length}</strong> of {complaints.length} complaints
            {activeFilters > 0 && <span> · {activeFilters} filter(s) active</span>}
          </p>
          {activeFilters > 0 || search ? (
            <button type="button" className="btn btn-xs btn-ghost" onClick={clearFilters}>
              <Filter className="h-3 w-3" aria-hidden="true" /> Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-xs dark:border-cyan-500/30 dark:bg-cyan-500/10">
          <span className="font-bold text-cyan-800 dark:text-cyan-200">
            {selected.size} selected
          </span>
          <button type="button" className="btn btn-xs btn-secondary" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-xs btn-secondary"
              onClick={() => setBulkConfirm({ status: 'IN_PROGRESS' })}
            >
              <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" /> Move to In Progress
            </button>
            <button
              type="button"
              className="btn btn-xs btn-success"
              onClick={() => setBulkConfirm({ status: 'RESOLVED' })}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Mark Resolved
            </button>
            {canEscalate && (
              <button
                type="button"
                className="btn btn-xs btn-danger"
                onClick={() => setBulkConfirm({ status: 'ESCALATED' })}
              >
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> Escalate
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table (desktop) */}
      {loading && complaints.length === 0 ? (
        <LoadingSkeleton variant="table" rows={8} cols={7} label="Loading complaints…" />
      ) : sorted.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ListChecks className="h-6 w-6" aria-hidden="true" />}
            title="No complaints match these filters"
            description="Try widening the date range or clearing filters. New complaints appear here as soon as they are filed."
            action={
              <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
                Clear all filters
              </button>
            }
          />
        </div>
      ) : (
        <div className="table-shell">
          <table className="aven-table">
            <caption className="sr-only">Complaints triage table</caption>
            <thead>
              <tr>
                <th scope="col" className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all complaints on this page"
                    checked={paged.length > 0 && paged.every((c) => selected.has(c.id))}
                    onChange={toggleSelectPage}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </th>
                <th scope="col">
                  <button type="button" className="hover:text-cyan-600" onClick={() => toggleSort('ticket')}>
                    Ticket{sortIcon('ticket')}
                  </button>
                </th>
                <th scope="col">
                  <button type="button" className="hover:text-cyan-600" onClick={() => toggleSort('title')}>
                    Issue{sortIcon('title')}
                  </button>
                </th>
                <th scope="col">
                  <button type="button" className="hover:text-cyan-600" onClick={() => toggleSort('category')}>
                    Category{sortIcon('category')}
                  </button>
                </th>
                <th scope="col">
                  <button type="button" className="hover:text-cyan-600" onClick={() => toggleSort('priority')}>
                    Severity{sortIcon('priority')}
                  </button>
                </th>
                <th scope="col">
                  <button type="button" className="hover:text-cyan-600" onClick={() => toggleSort('officer')}>
                    Officer{sortIcon('officer')}
                  </button>
                </th>
                <th scope="col">
                  <button type="button" className="hover:text-cyan-600" onClick={() => toggleSort('status')}>
                    Status{sortIcon('status')}
                  </button>
                </th>
                <th scope="col">SLA</th>
                <th scope="col" className="text-right">
                  <span className="inline-flex items-center gap-1">
                    <ArrowUpDown className="h-3 w-3" aria-hidden="true" /> Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => {
                const sla = getSlaState(c, slaMinutes, now);
                const officer = c.assignments?.[c.assignments.length - 1]?.officer || null;
                const targets = transitionTargets(c.currentStatus);
                const busyRow = rowBusy === c.id;
                return (
                  <tr key={c.id} className={selected.has(c.id) ? 'bg-cyan-50/50 dark:bg-cyan-500/5' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${c.ticketNumber}`}
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="block text-xs font-bold text-cyan-700 dark:text-cyan-400">
                        {c.ticketNumber}
                      </span>
                      <span className="block text-[10px] text-slate-400">{timeAgo(c.createdAt)}</span>
                    </td>
                    <td className="min-w-[220px] max-w-[320px]">
                      <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100" title={c.title}>
                        {c.title}
                      </span>
                      <span className="block truncate text-[10px] text-slate-400">
                        {c.location?.addressFormatted || 'No location'}
                        {c.isDemoRecord && ' · demo'}
                      </span>
                    </td>
                    <td className="text-xs">{c.category}</td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <StatusBadge priority={c.priority} size="sm" />
                        {c.aiAnalysis?.severityScore != null && (
                          <span className="text-[10px] text-slate-400" title="AI severity score (0–10)">
                            AI {Number(c.aiAnalysis.severityScore).toFixed(1)}
                            {c.aiAnalysis.confidenceScore != null &&
                              ` · ${Math.round(c.aiAnalysis.confidenceScore * 100)}%`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {officer ? (
                        <>
                          <span className="block font-medium">{officer.user?.name}</span>
                          <span className="block text-[10px] text-slate-400">#{officer.badgeNumber}</span>
                        </>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={c.currentStatus} size="sm" />
                        {(c.isEscalated || c.currentStatus === 'ESCALATED') && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-500">
                            <ShieldAlert className="h-3 w-3" aria-hidden="true" /> BREACH
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      {sla.supported ? (
                        <div className="flex flex-col">
                          <span
                            className={`text-[11px] font-bold tabular-nums ${
                              sla.resolved
                                ? sla.withinSla
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                                : sla.overdue
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-cyan-600 dark:text-cyan-400'
                            }`}
                          >
                            {sla.resolved
                              ? sla.withinSla
                                ? 'Met'
                                : 'Missed'
                              : sla.overdue
                                ? `+${formatDuration(sla.remainingMs)} overdue`
                                : formatDuration(sla.remainingMs)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {sla.resolved ? 'SLA closed' : 'remaining'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          onClick={() => setDetailId(c.id)}
                          title="View details"
                          aria-label={`View details for ${c.ticketNumber}`}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        {canAssign && targets.includes('ASSIGNED') && !officer && (
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            onClick={() => setAssignTarget(c)}
                            title="Assign officer"
                            aria-label={`Assign an officer to ${c.ticketNumber}`}
                          >
                            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                        {can(user, 'updateComplaintStatus') && targets.includes('IN_PROGRESS') && (
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            onClick={() => runRowAction(c, 'IN_PROGRESS')}
                            disabled={busyRow}
                            title="Move to In Progress"
                            aria-label={`Move ${c.ticketNumber} to in progress`}
                          >
                            <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                        {can(user, 'updateComplaintStatus') && targets.includes('RESOLVED') && (
                          <button
                            type="button"
                            className="btn btn-xs btn-success"
                            onClick={() => setRowConfirm({ complaint: c, status: 'RESOLVED' })}
                            disabled={busyRow}
                            title="Mark resolved"
                            aria-label={`Mark ${c.ticketNumber} resolved`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                        {canEscalate && targets.includes('ESCALATED') && (
                          <button
                            type="button"
                            className="btn btn-xs btn-danger"
                            onClick={() => setRowConfirm({ complaint: c, status: 'ESCALATED' })}
                            disabled={busyRow}
                            title="Escalate"
                            aria-label={`Escalate ${c.ticketNumber}`}
                          >
                            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {sorted.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Rows per page</span>
            <select
              className="select h-8 w-[72px] py-0 text-xs"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of{' '}
              {sorted.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Row-level consequential confirmation */}
      <ConfirmDialog
        open={!!rowConfirm}
        loading={rowBusy === rowConfirm?.complaint?.id}
        onClose={() => setRowConfirm(null)}
        onConfirm={() => {
          runRowAction(rowConfirm.complaint, rowConfirm.status);
          setRowConfirm(null);
        }}
        title={rowConfirm?.status === 'ESCALATED' ? 'Trigger SLA escalation' : 'Mark complaint resolved'}
        message={
          rowConfirm?.status === 'ESCALATED'
            ? `Escalate ${rowConfirm?.complaint?.ticketNumber} to the highest municipal authority? Priority will be raised and the breach recorded in the audit log.`
            : `Mark ${rowConfirm?.complaint?.ticketNumber} as resolved? Resolution evidence can be recorded from the officer portal.`
        }
        confirmLabel={rowConfirm?.status === 'ESCALATED' ? 'Escalate now' : 'Mark resolved'}
        tone={rowConfirm?.status === 'ESCALATED' ? 'danger' : 'success'}
      />

      {/* Bulk confirmation */}
      <ConfirmDialog
        open={!!bulkConfirm}
        loading={busy}
        onClose={() => setBulkConfirm(null)}
        onConfirm={runBulk}
        title={bulkConfirm?.status === 'ESCALATED' ? 'Bulk escalation' : 'Bulk status change'}
        message={`Apply "${(bulkConfirm?.status || '').replace('_', ' ').toLowerCase()}" to ${selected.size} selected complaint(s)? Only valid transitions will be applied.`}
        confirmLabel={bulkConfirm?.status === 'ESCALATED' ? 'Escalate all' : 'Apply'}
        tone={bulkConfirm?.status === 'ESCALATED' ? 'danger' : bulkConfirm?.status === 'RESOLVED' ? 'success' : 'primary'}
      />

      {/* Detail modal */}
      {detailId && (
        <ComplaintDetailModal
          complaintId={detailId}
          onClose={() => setDetailId(null)}
          onRefresh={refresh}
        />
      )}

      {/* Assign / reassign modal */}
      {assignTarget && (
        <AssignOfficerModal
          complaint={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

