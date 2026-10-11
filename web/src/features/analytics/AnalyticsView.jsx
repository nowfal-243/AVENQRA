import React, { useMemo, useState } from 'react';
import {
  Download,
  CheckCircle2,
  Timer,
  ShieldAlert,
  Clock,
  BarChart3,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import { DataErrorBar } from '../../components/common/DemoBanner';
import useComplaints from '../../hooks/useComplaints';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  filterByRange,
  volumeOverTime,
  categoryDistribution,
  departmentWorkload,
  officerWorkload,
  resolutionMetrics,
  openVsResolved,
} from '../../services/analyticsService';
import { getSlaMinutes, can } from '../../utils/permissions';
import { formatDuration, formatPercent, downloadCsv } from '../../utils/formatters';

const PIE_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#64748b', '#0ea5e9', '#a855f7', '#eab308', '#14b8a6', '#6366f1', '#ec4899', '#84cc16', '#78716c'];

const tooltipStyle = { borderRadius: 12, border: '1px solid rgba(148,163,184,0.3)', fontSize: 12 };

/**
 * AnalyticsView — aggregates computed in the browser from actual complaint
 * records (live or demo). There is no dedicated backend analytics endpoint,
 * so every metric here is derived, not invented. SLA denominators are stated
 * explicitly. Demo data is labelled.
 */
export default function AnalyticsView() {
  const { complaints, loading, error, refresh, isDemo } = useComplaints();
  const { departments, officers } = useData();
  const { user } = useAuth();
  const toast = useToast();

  const [days, setDays] = useState(14);
  const [deptId, setDeptId] = useState('');
  const slaMinutes = getSlaMinutes();
  const canExport = can(user, 'exportCsv');

  const scoped = useMemo(() => {
    const ranged = filterByRange(complaints, { days });
    return deptId ? ranged.filter((c) => c.departmentId === deptId) : ranged;
  }, [complaints, days, deptId]);

  const metrics = useMemo(() => resolutionMetrics(scoped, slaMinutes), [scoped, slaMinutes]);
  const volume = useMemo(() => volumeOverTime(scoped, days), [scoped, days]);
  const categories = useMemo(() => categoryDistribution(scoped), [scoped]);
  const deptLoad = useMemo(() => departmentWorkload(scoped, departments), [scoped, departments]);
  const officerLoad = useMemo(() => officerWorkload(scoped, officers), [scoped, officers]);
  const openResolved = useMemo(() => openVsResolved(scoped), [scoped]);

  const exportReport = () => {
    const rows = scoped.map((c) => ({
      ticket: c.ticketNumber,
      title: c.title,
      category: c.category,
      status: c.currentStatus,
      priority: c.priority,
      department: c.department?.name || '',
      created_utc: c.createdAt,
      resolved_utc: c.resolvedAt || '',
      escalated: c.isEscalated ? 'yes' : 'no',
      source: c.isDemoRecord ? 'demo' : 'live',
    }));
    if (rows.length === 0) {
      toast.warning('No data to export for the selected range.');
      return;
    }
    downloadCsv(`avenqra-analytics-${days}d-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success(`Exported ${rows.length} records.`);
  };

  return (
    <div>
      <PageHeader
        title="Analytics & Reports"
        description="Aggregated performance across the selected period."
        badge={
          isDemo ? (
            <span className="badge border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
              demo data
            </span>
          ) : null
        }
        actions={
          canExport && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={exportReport}>
              <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export CSV
            </button>
          )
        }
      />

      <DataErrorBar message={error} onRetry={refresh} />

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-3.5">
        <div>
          <label htmlFor="an-range" className="label">Date range</label>
          <select id="an-range" className="select w-40" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <div>
          <label htmlFor="an-dept" className="label">Department</label>
          <select id="an-dept" className="select w-52" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <p className="ml-auto text-[11px] text-slate-400">Based on {scoped.length} complaints filed in range.</p>
      </div>

      {loading && complaints.length === 0 ? (
        <LoadingSkeleton variant="stats" count={4} label="Loading analytics…" />
      ) : scoped.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" aria-hidden="true" />}
            title="No data for this selection"
            description="Widen the date range or clear the department filter to see metrics."
          />
        </div>
      ) : (
        <AnalyticsBody
          metrics={metrics}
          volume={volume}
          categories={categories}
          deptLoad={deptLoad}
          officerLoad={officerLoad}
          openResolved={openResolved}
          isDemo={isDemo}
          slaMinutes={slaMinutes}
        />
      )}
    </div>
  );
}


function AnalyticsBody({ metrics, volume, categories, deptLoad, officerLoad, openResolved, isDemo, slaMinutes }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StatCard
          label="Resolution Rate"
          value={metrics.resolutionRate === null ? '—' : formatPercent(metrics.resolutionRate, 1)}
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
          tone="emerald"
          isDemo={isDemo}
          hint={`${metrics.resolved} resolved of ${metrics.resolved + metrics.open} in range`}
        />
        <StatCard
          label="Avg Resolution Time"
          value={metrics.avgResolutionMs == null ? '—' : formatDuration(metrics.avgResolutionMs)}
          icon={<Clock className="h-5 w-5" aria-hidden="true" />}
          tone="blue"
          isDemo={isDemo}
          hint="Mean from filed to resolved"
        />
        <StatCard
          label="SLA Compliance"
          value={metrics.slaCompliance === null ? '—' : formatPercent(metrics.slaCompliance, 1)}
          icon={<Timer className="h-5 w-5" aria-hidden="true" />}
          tone="cyan"
          isDemo={isDemo}
          hint={`Resolved within ${slaMinutes}min ÷ ${metrics.slaDenominator} resolved`}
        />
        <StatCard
          label="Escalation Rate"
          value={metrics.escalationRate === null ? '—' : formatPercent(metrics.escalationRate, 1)}
          icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
          tone="amber"
          isDemo={isDemo}
          hint="Escalated ÷ all complaints"
        />
        <StatCard
          label="Open vs Resolved"
          value={`${metrics.open} / ${metrics.resolved}`}
          icon={<PieIcon className="h-5 w-5" aria-hidden="true" />}
          tone="slate"
          isDemo={isDemo}
          hint="Currently open / resolved"
        />
      </div>

      <div className="card p-4">
        <h3 className="panel-title">Complaint volume over time</h3>
        <p className="panel-subtitle">Filed vs resolved per day (UTC).</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={volume} margin={{ left: -18, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="filed" name="Filed" stroke="#06b6d4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="panel-title">Category distribution</h3>
          <p className="panel-subtitle">Share of complaints by issue type.</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categories} dataKey="value" nameKey="name" outerRadius={90} stroke="none">
                  {categories.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="panel-title">Department workload</h3>
          <p className="panel-subtitle">Open vs resolved per department.</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptLoad} margin={{ left: -18, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="code" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(6,182,212,0.06)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="open" name="Open" stackId="a" fill="#f59e0b" barSize={20} />
                <Bar dataKey="resolved" name="Resolved" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="panel-title">Officer workload &amp; performance</h3>
        <p className="panel-subtitle">Active vs completed assignments per officer.</p>
        {officerLoad.length === 0 ? (
          <EmptyState compact title="No officers" description="Add officers to see workload distribution." />
        ) : (
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={officerLoad} margin={{ left: -18, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="badge" tick={{ fontSize: 9 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(6,182,212,0.06)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="active" name="Active" stackId="a" fill="#0ea5e9" barSize={16} />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {isDemo && (
        <p className="text-[11px] text-violet-500">
          All figures above are computed from the simulated demo dataset, not a live backend.
        </p>
      )}
    </div>
  );
}

