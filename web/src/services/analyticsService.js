/**
 * Analytics service.
 *
 * The backend does NOT expose a dedicated analytics endpoint, so every metric
 * here is aggregated in the browser from actual complaint records (live or
 * demo). Each function documents its exact denominator so numbers are never
 * ambiguous. Nothing fabricates statistics — with no data, metrics return
 * null and the UI shows an empty state.
 *
 * SLA definitions used consistently:
 *   - Deadline       = complaint.createdAt (server UTC) + configured window
 *   - SLA compliance = resolved complaints finished before the deadline
 *                      ÷ ALL resolved complaints
 *   - Escalation rate= escalated complaints ÷ all complaints
 */
import { getSlaState, getSlaMinutes } from '../utils/permissions';

const DAY = 24 * 60 * 60 * 1000;

function isResolved(c) {
  return c.currentStatus === 'RESOLVED' || c.currentStatus === 'REJECTED';
}

function resolutionTimeMs(c) {
  const end = c.resolvedAt || (c.currentStatus === 'RESOLVED' ? c.updatedAt : null);
  if (!end || !c.createdAt) return null;
  const diff = new Date(end).getTime() - new Date(c.createdAt).getTime();
  return Number.isFinite(diff) && diff >= 0 ? diff : null;
}

export function filterByRange(complaints, { days = 14, from = null, to = null } = {}) {
  const now = Date.now();
  const start = from ? new Date(from).getTime() : now - days * DAY;
  const end = to ? new Date(to).getTime() : now + DAY;
  return complaints.filter((c) => {
    const t = new Date(c.createdAt).getTime();
    return t >= start && t <= end;
  });
}

export function computeKpis(complaints, slaMinutes = getSlaMinutes()) {
  const total = complaints.length;
  const newlyAssigned = complaints.filter((c) => c.currentStatus === 'SUBMITTED' || c.currentStatus === 'ASSIGNED').length;
  const inProgress = complaints.filter((c) => c.currentStatus === 'IN_PROGRESS').length;
  const escalated = complaints.filter((c) => {
    const sla = getSlaState(c, slaMinutes);
    return c.currentStatus === 'ESCALATED' || c.isEscalated || sla.overdue;
  }).length;
  const resolved = complaints.filter((c) => c.currentStatus === 'RESOLVED').length;
  const rejected = complaints.filter((c) => c.currentStatus === 'REJECTED').length;

  const resolvedAll = complaints.filter(isResolved);
  const withinSla = resolvedAll.filter((c) => getSlaState(c, slaMinutes).withinSla === true).length;
  const slaCompliance = resolvedAll.length > 0 ? (withinSla / resolvedAll.length) * 100 : null;

  return { total, newlyAssigned, inProgress, escalated, resolved, rejected, slaCompliance, resolvedTotal: resolvedAll.length };
}

export function categoryDistribution(complaints) {
  const map = new Map();
  complaints.forEach((c) => {
    const key = c.category || 'Uncategorised';
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function departmentWorkload(complaints, departments = []) {
  return departments.map((d) => ({
    name: d.name,
    code: d.code,
    open: complaints.filter((c) => c.departmentId === d.id && !isResolved(c)).length,
    total: complaints.filter((c) => c.departmentId === d.id).length,
    resolved: complaints.filter((c) => c.departmentId === d.id && isResolved(c)).length,
  }));
}

export function statusBreakdown(complaints) {
  const map = {};
  complaints.forEach((c) => {
    map[c.currentStatus] = (map[c.currentStatus] || 0) + 1;
  });
  return map;
}

export function resolutionMetrics(complaints, slaMinutes = getSlaMinutes()) {
  const resolvedAll = complaints.filter(isResolved);
  const durations = resolvedAll.map(resolutionTimeMs).filter((v) => v !== null);
  const avgMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  const withinSla = resolvedAll.filter((c) => getSlaState(c, slaMinutes).withinSla === true).length;
  const escalated = complaints.filter((c) => c.isEscalated || c.currentStatus === 'ESCALATED').length;
  const open = complaints.filter((c) => !isResolved(c)).length;

  return {
    resolutionRate: complaints.length > 0 ? (resolvedAll.length / complaints.length) * 100 : null,
    avgResolutionMs: avgMs,
    slaCompliance: resolvedAll.length > 0 ? (withinSla / resolvedAll.length) * 100 : null,
    slaDenominator: resolvedAll.length,
    escalationRate: complaints.length > 0 ? (escalated / complaints.length) * 100 : null,
    open,
    resolved: resolvedAll.length,
  };
}

export function openVsResolved(complaints) {
  const open = complaints.filter((c) => !isResolved(c)).length;
  return [
    { name: 'Open', value: open },
    { name: 'Resolved / Rejected', value: complaints.length - open },
  ];
}

export function officerWorkload(complaints, officers = []) {
  return officers.map((o) => {
    const assigned = complaints.filter(
      (c) => (c.assignments || []).some((a) => a.officerId === o.id || a.officer?.id === o.id)
    );
    return {
      id: o.id,
      name: o.user?.name || 'Unknown',
      badge: o.badgeNumber,
      status: o.status,
      active: assigned.filter((c) => !isResolved(c)).length,
      completed: assigned.filter(isResolved).length,
      total: assigned.length,
    };
  });
}

/** Trend between the current window and the preceding one of equal length. */
export function computeTrend(complaints, metricFn, days = 7) {
  const now = Date.now();
  const current = complaints.filter((c) => {
    const t = new Date(c.createdAt).getTime();
    return t >= now - days * DAY && t <= now;
  });
  const previous = complaints.filter((c) => {
    const t = new Date(c.createdAt).getTime();
    return t >= now - 2 * days * DAY && t < now - days * DAY;
  });
  if (previous.length === 0) return null;
  const cur = metricFn(current);
  const prev = metricFn(previous);
  if (prev === 0) return null;
  return { current: cur, previous: prev, deltaPercent: ((cur - prev) / prev) * 100 };
}

/** Count of new complaints per day for the last `days` days (UTC dates). */
export function volumeOverTime(complaints, days = 14) {
  const buckets = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * DAY);
    buckets.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), filed: 0, resolved: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  complaints.forEach((c) => {
    const key = new Date(c.createdAt).toISOString().slice(0, 10);
    if (index.has(key)) buckets[index.get(key)].filed += 1;
    const end = c.resolvedAt || (c.currentStatus === 'RESOLVED' ? c.updatedAt : null);
    if (end) {
      const rKey = new Date(end).toISOString().slice(0, 10);
      if (index.has(rKey)) buckets[index.get(rKey)].resolved += 1;
    }
  });
  return buckets;
}
