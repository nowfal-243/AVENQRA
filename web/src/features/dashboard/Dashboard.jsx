import React, { useMemo } from 'react';
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
  borderRadius: 12,
  border: '1px solid rgba(148,163,184,0.3)',
  fontSize: 12,
  boxShadow: '0 10px 40px -12px rgb(2 6 23 / 0.35)',
};

/** Ranked category bars — no chart library needed, crisp and accessible. */
function CategoryBars({ complaints }) {
  const data = useMemo(() => categoryDistribution(complaints).slice(0, 7), [complaints]);
  if (data.length === 0) {
    return <EmptyState compact title="No data" description="Complaints will populate this chart." />;
  }
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ul className="mt-3 space-y-2.5">
      {data.map((d) => (
        <li key={d.name}>
          <div className="flex items-center justify-between text-xs">
            <span className="truncate text-slate-600 dark:text-slate-300">{d.name}</span>
            <span className="ml-2 font-bold text-slate-700 dark:text-slate-200">{d.value}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-navy-850">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
              style={{ width: `${Math.max(6, (d.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Dashboard — executive operations overview. All figures are computed from the
 * actual (live or demo) complaint dataset via analyticsService — nothing is
 * hard-coded. Demo data is labelled through isDemo flags and the banner.
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
      (c.statusLogs || []).forEach((log) => {
        events.push({
          id: `${c.id}-${log.id}`,
          ticket: c.ticketNumber,
          status: log.status,
          remarks: log.remarks,
          at: log.changedAt,
          by: log.updatedBy?.name || 'System',
        });
      });
    });
    return events.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
  }, [complaints]);

  if (loading && complaints.length === 0) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton variant="stats" count={6} label="Loading dashboard metrics…" />
        <div className="grid gap-4 lg:grid-cols-3">
          <LoadingSkeleton variant="chart" />
          <LoadingSkeleton variant="chart" />
          <LoadingSkeleton variant="chart" />
        </div>
      </div>
    );
  }

  return <DashboardView complaints={complaints} isDemo={isDemo} slaMinutes={slaMinutes} kpis={kpis} trends={trends} overdue={overdue} statusOverview={statusOverview} priorityQueue={priorityQueue} recent={recent} recentActivity={recentActivity} error={error} refresh={refresh} />;
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
}) {
  return (
    <div>
      <PageHeader
        title="Operations Overview"
        description="Live civic intelligence across departments, officers and SLA compliance."
        badge={
          isDemo ? (
            <span className="badge border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
              demo data
            </span>
          ) : (
            <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              live
            </span>
          )
        }
        actions={
          <Link to="/reporter" className="btn btn-primary btn-sm">
            <Camera className="h-3.5 w-3.5" aria-hidden="true" /> Report issue
          </Link>
        }
      />

      <DataErrorBar message={error} onRetry={refresh} />

      {overdue.length > 0 && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-rose-800 dark:text-rose-200">
                {overdue.length} complaint{overdue.length === 1 ? '' : 's'} past the {slaMinutes}-minute SLA
              </p>
              <p className="text-xs text-rose-700/90 dark:text-rose-300/90">
                Overdue items are escalated automatically by the server-side SLA worker. The countdown here is
                display-only.
              </p>
            </div>
          </div>
          <Link to="/complaints" className="btn btn-danger btn-sm shrink-0">
            Review now
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Total Complaints"
          value={formatNumber(kpis.total)}
          icon={<Inbox className="h-5 w-5" aria-hidden="true" />}
          tone="cyan"
          isDemo={isDemo}
          trend={trends.total}
        />
        <StatCard
          label="Newly Assigned"
          value={formatNumber(kpis.newlyAssigned)}
          icon={<UserCheck className="h-5 w-5" aria-hidden="true" />}
          tone="blue"
          isDemo={isDemo}
          hint="Submitted & assigned"
        />
        <StatCard
          label="In Progress"
          value={formatNumber(kpis.inProgress)}
          icon={<Loader className="h-5 w-5" aria-hidden="true" />}
          tone="slate"
          isDemo={isDemo}
        />
        <StatCard
          label="Pending / Escalated"
          value={formatNumber(kpis.escalated)}
          icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
          tone="amber"
          isDemo={isDemo}
          hint="Overdue or escalated"
        />
        <StatCard
          label="Resolved"
          value={formatNumber(kpis.resolved)}
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
          tone="emerald"
          isDemo={isDemo}
          trend={trends.resolved}
        />
        <StatCard
          label="SLA Compliance"
          value={kpis.slaCompliance === null ? '—' : formatPercent(kpis.slaCompliance, 1)}
          icon={<Timer className="h-5 w-5" aria-hidden="true" />}
          tone="cyan"
          isDemo={isDemo}
          hint={
            kpis.resolvedTotal > 0
              ? `Resolved within SLA ÷ ${kpis.resolvedTotal} resolved`
              : 'No resolved complaints yet'
          }
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <h3 className="panel-title">Status overview</h3>
          <p className="panel-subtitle">Current distribution across the workflow.</p>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusOverview}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={72}
                  paddingAngle={2}
                  stroke="none"
                >
                  {statusOverview.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_BAR_COLORS[entry.status] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${value}`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-1.5">
            {statusOverview.map((s) => (
              <li key={s.status} className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: STATUS_BAR_COLORS[s.status] }}
                  aria-hidden="true"
                />
                <span className="truncate">{s.name}</span>
                <span className="ml-auto font-bold text-slate-700 dark:text-slate-200">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-4 lg:col-span-2">
          <h3 className="panel-title">Top categories</h3>
          <p className="panel-subtitle">Most-reported civic issue types in this dataset.</p>
          <CategoryBars complaints={complaints} />
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="table-shell lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h3 className="panel-title">Recent complaints</h3>
            <Link to="/complaints" className="text-xs font-semibold text-cyan-600 hover:underline dark:text-cyan-400">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6" aria-hidden="true" />}
              title="No complaints yet"
              description="Filed complaints will appear here in real time."
            />
          ) : (
            <table className="aven-table">
              <thead>
                <tr>
                  <th scope="col">Ticket</th>
                  <th scope="col">Issue</th>
                  <th scope="col">Severity</th>
                  <th scope="col">Status</th>
                  <th scope="col">Filed</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap">
                      <Link
                        to={`/complaints?focus=${c.id}`}
                        className="text-xs font-bold text-cyan-700 hover:underline dark:text-cyan-400"
                      >
                        {c.ticketNumber}
                      </Link>
                    </td>
                    <td className="max-w-[240px]">
                      <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {c.title}
                      </span>
                      <span className="block truncate text-[10px] text-slate-400">
                        {c.location?.addressFormatted || 'No location'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge priority={c.priority} size="sm" />
                    </td>
                    <td>
                      <StatusBadge status={c.currentStatus} size="sm" />
                    </td>
                    <td className="whitespace-nowrap text-[11px] text-slate-400">{timeAgo(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="panel-title">Priority queue</h3>
            <p className="panel-subtitle">Critical &amp; high severity still open.</p>
            {priorityQueue.length === 0 ? (
              <EmptyState compact title="All clear" description="No critical or high severity items pending." />
            ) : (
              <ul className="mt-3 space-y-2">
                {priorityQueue.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/complaints?focus=${c.id}`}
                      className="flex items-start gap-2.5 rounded-lg border border-slate-100 p-2.5 transition hover:border-cyan-200 hover:bg-cyan-50/40 dark:border-slate-800 dark:hover:border-cyan-500/30 dark:hover:bg-cyan-500/5"
                    >
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${PRIORITY_META[c.priority]?.bar || 'bg-slate-400'}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{c.title}</p>
                        <p className="truncate text-[10px] text-slate-400">
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

          <div className="card p-4">
            <h3 className="panel-title">Recent activity</h3>
            <p className="panel-subtitle">Latest status transitions across all tickets.</p>
            {recentActivity.length === 0 ? (
              <EmptyState compact title="No activity" description="Status changes will appear here." />
            ) : (
              <ol className="mt-3 space-y-3">
                {recentActivity.map((ev) => (
                  <li key={ev.id} className="flex gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-navy-800 dark:text-slate-300">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400">{ev.ticket}</span> →{' '}
                        {STATUS_META[ev.status]?.label || ev.status}
                      </p>
                      <p className="truncate text-[10px] text-slate-400">
                        {ev.remarks} · by {ev.by}
                      </p>
                      <p className="text-[10px] text-slate-400">{timeAgo(ev.at)}</p>
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

