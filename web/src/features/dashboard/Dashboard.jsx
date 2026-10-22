import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox,
  UserCheck,
  Loader,
  ShieldAlert,
  CheckCircle2,
  Timer,
  Camera,
  AlertTriangle,
  Clock,
  Activity,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ExternalLink,
  Filter,
  Flame,
  Building2,
  FileCheck2,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import { DataErrorBar } from '../../components/common/DemoBanner';
import useComplaints from '../../hooks/useComplaints';
import { computeKpis, computeTrend, categoryDistribution } from '../../services/analyticsService';
import { getSlaState } from '../../utils/permissions';
import { STATUS_META, PRIORITY_META } from '../../utils/constants';
import { timeAgo, formatNumber, formatPercent } from '../../utils/formatters';
import useNow from '../../hooks/useNow';

const STATUS_BAR_COLORS = {
  SUBMITTED: '#f59e0b',
  ASSIGNED: '#0ea5e9',
  IN_PROGRESS: '#3b82f6',
  ESCALATED: '#f43f5e',
  RESOLVED: '#10b981',
  REJECTED: '#64748b',
};

const tooltipStyle = {
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.1)',
  backgroundColor: 'rgba(10, 16, 28, 0.95)',
  backdropFilter: 'blur(12px)',
  fontSize: 12,
  color: '#f8fafc',
  boxShadow: '0 12px 40px -10px rgba(0, 0, 0, 0.5)',
};

/** High-contrast category distribution bars with percentage fills */
function CategoryBars({ complaints }) {
  const data = useMemo(() => categoryDistribution(complaints).slice(0, 7), [complaints]);
  if (data.length === 0) {
    return <EmptyState compact title="No data" description="Complaints will populate this chart." />;
  }
  const total = data.reduce((acc, curr) => acc + curr.value, 0) || 1;
  const max = Math.max(...data.map((d) => d.value));

  return (
    <ul className="mt-3.5 space-y-3">
      {data.map((d) => {
        const pct = Math.round((d.value / total) * 100);
        return (
          <li key={d.name} className="group">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate font-medium text-slate-700 dark:text-slate-300 group-hover:text-cyan-500 transition-colors">
                {d.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-slate-400">{pct}%</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  {d.value}
                </span>
              </div>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-navy-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
                style={{ width: `${Math.max(5, (d.value / max) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Dashboard — Enterprise Civic Operations Command Center.
 * Database-backed telemetry, authoritative SLA monitoring, and live task progression.
 */
export default function Dashboard() {
  const { complaints, loading, error, refresh, isDemo, slaMinutes } = useComplaints();
  const now = useNow();

  const trends = useMemo(
    () => ({
      total: computeTrend(complaints, (rows) => rows.length, 7),
      resolved: computeTrend(complaints, (rows) => rows.filter((c) => c.currentStatus === 'RESOLVED').length, 7),
    }),
    [complaints]
  );

  const kpis = useMemo(() => computeKpis(complaints, slaMinutes), [complaints, slaMinutes]);

  const overdue = useMemo(
    () => complaints.filter((c) => getSlaState(c, slaMinutes, now).overdue),
    [complaints, slaMinutes, now]
  );

  const statusOverview = useMemo(() => {
    const counts = {};
    complaints.forEach((c) => {
      counts[c.currentStatus] = (counts[c.currentStatus] || 0) + 1;
    });
    return Object.keys(STATUS_META).map((key) => ({
      name: STATUS_META[key].label,
      status: key,
      value: counts[key] || 0,
    }));
  }, [complaints]);

  const priorityQueue = useMemo(
    () =>
      complaints
        .filter((c) => c.priority === 'CRITICAL' || c.priority === 'HIGH')
        .filter((c) => !['RESOLVED', 'REJECTED'].includes(c.currentStatus))
        .sort((a, b) => {
          const rank = { CRITICAL: 0, HIGH: 1 };
          return rank[a.priority] - rank[b.priority] || new Date(b.createdAt) - new Date(a.createdAt);
        })
        .slice(0, 6),
    [complaints]
  );

  const recent = useMemo(
    () => [...complaints].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6),
    [complaints]
  );

  const recentActivity = useMemo(() => {
    const events = [];
    complaints.forEach((c) => {
      // Creation event
      events.push({
        id: `created-${c.id}`,
        ticket: c.ticketNumber,
        category: c.category,
        kind: 'CREATED',
        status: 'SUBMITTED',
        remarks: `Complaint registered in sector: ${c.category}`,
        at: c.createdAt,
        by: c.citizen?.user?.name || 'Citizen Reporter',
        role: 'CITIZEN',
      });

      // Assignment event
      (c.assignments || []).forEach((a) => {
        events.push({
          id: `as-${a.id}`,
          ticket: c.ticketNumber,
          category: c.category,
          kind: 'ASSIGNMENT',
          status: 'ASSIGNED',
          remarks: `Auto-dispatched to Officer ${a.officer?.user?.name || 'Field Officer'} (Badge #${a.officer?.badgeNumber || '—'})`,
          at: a.assignedAt || c.updatedAt,
          by: a.assignedBy?.name || 'Municipal Admin',
          role: 'ADMIN',
        });
      });

      // Evidence upload event
      (c.images || []).filter((img) => img.imageType === 'RESOLUTION').forEach((img) => {
        events.push({
          id: `img-${img.id}`,
          ticket: c.ticketNumber,
          category: c.category,
          kind: 'EVIDENCE',
          status: 'RESOLVED',
          remarks: 'Proof-of-resolution photographic evidence recorded',
          at: img.uploadedAt || c.updatedAt,
          by: 'Field Remediator',
          role: 'OFFICER',
          evidenceUrl: img.imageUrl,
        });
      });

      // Status logs
      (c.statusLogs || []).forEach((log) => {
        events.push({
          id: `${c.id}-${log.id}`,
          ticket: c.ticketNumber,
          category: c.category,
          kind: log.status === 'ESCALATED' ? 'ESCALATION' : 'STATUS_CHANGE',
          status: log.status,
          remarks: log.remarks || `Status transitioned to ${log.status}`,
          at: log.changedAt,
          by: log.updatedBy?.name || 'Municipal Supervisor',
          role: log.updatedBy?.role || 'SYSTEM',
        });
      });
    });

    return events.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 12);
  }, [complaints]);

  if (loading && complaints.length === 0) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton variant="stats" count={7} label="Syncing municipal telemetry…" />
        <div className="grid gap-4 lg:grid-cols-3">
          <LoadingSkeleton variant="chart" />
          <LoadingSkeleton variant="chart" />
          <LoadingSkeleton variant="chart" />
        </div>
      </div>
    );
  }

  return (
    <DashboardView
      complaints={complaints}
      isDemo={isDemo}
      slaMinutes={slaMinutes}
      kpis={kpis}
      trends={trends}
      overdue={overdue}
      statusOverview={statusOverview}
      priorityQueue={priorityQueue}
      recent={recent}
      recentActivity={recentActivity}
      error={error}
      refresh={refresh}
      now={now}
    />
  );
}

function DashboardView({
  complaints,
  isDemo,
  slaMinutes,
  kpis,
  trends,
  overdue,
  statusOverview,
  priorityQueue,
  recent,
  recentActivity,
  error,
  refresh,
  now,
}) {
  const [feedFilter, setFeedFilter] = useState('ALL');

  const filteredActivity = useMemo(() => {
    if (feedFilter === 'ALL') return recentActivity;
    if (feedFilter === 'ESCALATIONS') return recentActivity.filter((e) => e.status === 'ESCALATED' || e.kind === 'ESCALATION');
    if (feedFilter === 'DISPATCHES') return recentActivity.filter((e) => e.status === 'ASSIGNED' || e.kind === 'ASSIGNMENT');
    if (feedFilter === 'RESOLUTIONS') return recentActivity.filter((e) => e.status === 'RESOLVED' || e.kind === 'EVIDENCE');
    return recentActivity;
  }, [recentActivity, feedFilter]);

  const timeString = useMemo(() => {
    const dateObj = typeof now === 'number' ? new Date(now) : (now instanceof Date ? now : new Date());
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [now]);

  return (
    <div className="space-y-5">
      {/* Executive Command Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-900 via-navy-900 to-slate-900 p-5 text-white shadow-xl dark:border-white/[0.08]">
        {/* Cybernetic ambient glow lines */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30">
                <Building2 className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                Operations Command Center
              </h1>
              {isDemo ? (
                <span className="badge border-violet-400/40 bg-violet-500/15 text-violet-300">
                  Simulation Active
                </span>
              ) : (
                <span className="badge border-emerald-400/30 bg-emerald-500/15 text-emerald-300 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  Live Telemetry
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300/90 sm:text-sm">
              Real-time civic triage, multi-channel corporation dispatch &amp; 30-minute authoritative SLA monitoring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live Clock Pill */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs backdrop-blur-md">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-mono font-bold tracking-wider text-slate-200 tabular-nums">
                {timeString}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">LOCAL</span>
            </div>

            {/* SLA Policy Badge */}
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-slate-200">
              <Timer className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-semibold">{slaMinutes}m SLA Enforcement</span>
            </div>

            {/* Quick Action */}
            <Link
              to="/reporter"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all active:scale-[0.98]"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Report Issue</span>
            </Link>
          </div>
        </div>
      </div>

      <DataErrorBar message={error} onRetry={refresh} />

      {/* Critical Situation Room Banner (if overdue tickets exist) */}
      {overdue.length > 0 && (
        <div
          role="alert"
          className="relative overflow-hidden rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-transparent p-4 text-slate-900 shadow-md backdrop-blur-md dark:text-rose-100"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/30">
                <Flame className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-rose-900 dark:text-rose-200 uppercase tracking-wide">
                    Critical SLA Escalation Alert
                  </h4>
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                    {overdue.length} Breached
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-rose-800 dark:text-rose-300/90 leading-relaxed">
                  {overdue.length} open municipal tickets have breached the authoritative {slaMinutes}-minute resolution window. High-priority dispatch notifications have been routed to Super Admins.
                </p>
              </div>
            </div>
            <Link
              to="/complaints?filter=overdue"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-500 transition"
            >
              <span>Triage Overdue Queue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 7 Core Database-Backed Metric KPIs */}
      <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        <StatCard
          label="Total Incidents"
          value={formatNumber(kpis.total)}
          icon={<Inbox className="h-5 w-5" aria-hidden="true" />}
          tone="cyan"
          isDemo={isDemo}
          trend={trends.total}
          hint="Registered database total"
        />
        <StatCard
          label="Newly Assigned"
          value={formatNumber(kpis.newlyAssigned)}
          icon={<UserCheck className="h-5 w-5" aria-hidden="true" />}
          tone="blue"
          isDemo={isDemo}
          hint="Submitted & dispatched"
        />
        <StatCard
          label="In Remediation"
          value={formatNumber(kpis.inProgress)}
          icon={<Loader className="h-5 w-5" aria-hidden="true" />}
          tone="slate"
          isDemo={isDemo}
          hint="Active field crews"
        />
        <StatCard
          label="Escalated Queue"
          value={formatNumber(kpis.escalated)}
          icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
          tone="amber"
          isDemo={isDemo}
          hint="Priority escalation"
        />
        <StatCard
          label="Completed Tasks"
          value={formatNumber(kpis.completed || kpis.resolved)}
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
          tone="emerald"
          isDemo={isDemo}
          trend={trends.resolved}
          hint="Resolved with verification"
        />
        <StatCard
          label="SLA Breaches"
          value={formatNumber(kpis.slaBreaches || overdue.length)}
          icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
          tone="rose"
          isDemo={isDemo}
          hint={`Exceeding ${slaMinutes}m target`}
        />
        <StatCard
          label="SLA Compliance"
          value={kpis.slaCompliance === null ? '—' : formatPercent(kpis.slaCompliance, 1)}
          icon={<Timer className="h-5 w-5" aria-hidden="true" />}
          tone="cyan"
          isDemo={isDemo}
          hint={
            kpis.resolvedTotal > 0
              ? `${kpis.resolvedWithinSla}/${kpis.resolvedTotal} within SLA window`
              : 'Awaiting resolved data'
          }
        />
      </div>

      {/* Analytics Charts & Status Overview */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Status Distribution Donut */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h3 className="panel-title">Workflow Distribution</h3>
            <span className="text-[11px] font-semibold text-slate-400">Current Scope</span>
          </div>
          <p className="panel-subtitle">Complaints categorized by current operational state.</p>

          <div className="relative mt-2 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusOverview}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  stroke="none"
                >
                  {statusOverview.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_BAR_COLORS[entry.status] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(val, name) => [`${val} tickets`, name]} />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Donut Metric */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                {kpis.total}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total
              </span>
            </div>
          </div>

          <ul className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            {statusOverview.map((s) => (
              <li key={s.status} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
                  style={{ background: STATUS_BAR_COLORS[s.status] }}
                  aria-hidden="true"
                />
                <span className="truncate">{s.name}</span>
                <span className="ml-auto font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  {s.value}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Top Categories Bar Breakdown */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="panel-title">Civic Sectors &amp; Workload</h3>
            <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
              Department Routing Active
            </span>
          </div>
          <p className="panel-subtitle">Breakdown of reported issues by municipal service sector.</p>
          <CategoryBars complaints={complaints} />
        </div>
      </div>

      {/* Recent Incidents Table & Priority / Activity Columns */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Recent Incidents Table */}
        <div className="table-shell lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-cyan-500" />
              <h3 className="panel-title">Active Complaints Docket</h3>
            </div>
            <Link
              to="/complaints"
              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 flex items-center gap-1"
            >
              <span>Open Triage Board</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Inbox className="h-6 w-6" aria-hidden="true" />}
                title="Docket is clear"
                description="Submitted complaints will appear here in real time."
              />
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="aven-table">
                <thead>
                  <tr>
                    <th scope="col">Ticket ID</th>
                    <th scope="col">Description</th>
                    <th scope="col">Severity</th>
                    <th scope="col">Workflow Status</th>
                    <th scope="col">Logged</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((c) => (
                    <tr key={c.id} className="group">
                      <td className="whitespace-nowrap font-mono">
                        <Link
                          to={`/complaints?focus=${c.id}`}
                          className="text-xs font-bold text-cyan-600 group-hover:text-cyan-500 hover:underline dark:text-cyan-400"
                        >
                          {c.ticketNumber}
                        </Link>
                      </td>
                      <td className="max-w-[240px]">
                        <span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                          {c.title}
                        </span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {c.location?.addressFormatted || 'Coordinates recorded'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge priority={c.priority} size="sm" />
                      </td>
                      <td>
                        <StatusBadge status={c.currentStatus} size="sm" />
                      </td>
                      <td className="whitespace-nowrap text-[11px] font-medium text-slate-400">
                        {timeAgo(c.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Priority Queue & Interactive Live Activity Feed */}
        <div className="space-y-5">
          {/* Priority Queue */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="panel-title flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>Priority Action Queue</span>
              </h3>
              <span className="rounded-full bg-orange-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-orange-600 dark:text-orange-400">
                {priorityQueue.length} Pending
              </span>
            </div>
            <p className="panel-subtitle">Critical &amp; High severity incidents requiring dispatch.</p>

            {priorityQueue.length === 0 ? (
              <div className="mt-3">
                <EmptyState compact title="Queue Clear" description="No critical tickets require urgent action." />
              </div>
            ) : (
              <ul className="mt-3.5 space-y-2.5">
                {priorityQueue.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/complaints?focus=${c.id}`}
                      className="group flex items-start gap-3 rounded-xl border border-slate-200/70 p-3 transition-all hover:border-cyan-500/40 hover:bg-cyan-50/30 dark:border-slate-800 dark:hover:border-cyan-500/30 dark:hover:bg-cyan-500/5"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full shadow-sm ${PRIORITY_META[c.priority]?.bar || 'bg-slate-400'}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-cyan-500 transition-colors">
                          {c.title}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {c.ticketNumber} · {c.category}
                        </p>
                      </div>
                      <StatusBadge priority={c.priority} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Interactive Live Activity Stream */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="panel-title flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-500" />
                <span>Live Activity Stream</span>
              </h3>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Realtime
              </span>
            </div>
            <p className="panel-subtitle">Audited events, officer dispatches &amp; resolution uploads.</p>

            {/* Quick Filter Tabs */}
            <div className="mt-3 flex gap-1 overflow-x-auto pb-1 text-[10px] font-bold no-scrollbar">
              {['ALL', 'ESCALATIONS', 'DISPATCHES', 'RESOLUTIONS'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFeedFilter(tab)}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    feedFilter === tab
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-400 dark:hover:bg-navy-700'
                  }`}
                >
                  {tab === 'ALL' ? 'All (12)' : tab}
                </button>
              ))}
            </div>

            {filteredActivity.length === 0 ? (
              <div className="mt-3">
                <EmptyState compact title="No events" description="No activity found matching filter." />
              </div>
            ) : (
              <ol className="mt-3.5 space-y-3.5 border-l border-slate-200/80 dark:border-slate-800 pl-3.5 ml-1">
                {filteredActivity.map((ev) => (
                  <li key={ev.id} className="relative group">
                    {/* Node Dot */}
                    <span
                      className={`absolute -left-[19px] top-1.5 h-2 w-2 rounded-full ring-4 ring-white dark:ring-navy-900 ${
                        ev.status === 'ESCALATED'
                          ? 'bg-rose-500'
                          : ev.status === 'RESOLVED'
                          ? 'bg-emerald-500'
                          : 'bg-cyan-500'
                      }`}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          to={`/complaints?q=${ev.ticket}`}
                          className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                        >
                          {ev.ticket}
                        </Link>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {timeAgo(ev.at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug mt-0.5">
                        {ev.remarks}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          by <strong className="text-slate-600 dark:text-slate-300">{ev.by}</strong>
                        </span>
                        <StatusBadge status={ev.status} size="sm" />
                        {ev.evidenceUrl && (
                          <a
                            href={ev.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                          >
                            <span>Photo Evidence</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
