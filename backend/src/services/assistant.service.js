const prisma = require('../config/db');
const axios = require('axios');
const PROVIDER = (process.env.AI_PROVIDER || 'rules').toLowerCase();
const SUGGESTED = [
  "Summarize today's complaints.",
  'Show unresolved high-priority complaints.',
  'Find overdue complaints.',
  'Which department has the largest backlog?',
  'Show recently completed tasks.',
  'Identify complaints requiring urgent attention.',
  'Summarize the reasons for SLA breaches.',
];
async function accessibleComplaints(user, opts = {}) {
  const take = opts.take || 200;
  const where = {};
  if (user.role === 'CITIZEN') {
    const citizen = await prisma.citizen.findUnique({ where: { userId: user.id } });
    where.citizenId = citizen ? citizen.id : '__none__';
  } else if (user.role === 'OFFICER') {
    const officer = await prisma.officer.findUnique({ where: { userId: user.id } });
    const as = officer ? await prisma.assignment.findMany({ where: { officerId: officer.id }, select: { complaintId: true } }) : [];
    where.id = { in: as.map((a) => a.complaintId).concat(['__none__']) };
  } else if (user.role === 'DEPARTMENT_ADMIN') {
    const officer = await prisma.officer.findUnique({ where: { userId: user.id } });
    if (officer && officer.departmentId) where.departmentId = officer.departmentId;
  }
  return prisma.complaint.findMany({ where, take, orderBy: { createdAt: 'desc' },
    include: { department: { select: { id: true, name: true, code: true } }, location: true,
      assignments: { include: { officer: { include: { user: { select: { name: true } } } } } },
      statusLogs: { orderBy: { changedAt: 'desc' }, take: 5 } } });
}
function summarize(rows, slaMinutes) {
  const now = Date.now(); const byStatus = {}; const byCategory = {}; const byDept = {};
  const overdue = []; const highOpen = []; const completed = [];
  rows.forEach((c) => {
    byStatus[c.currentStatus] = (byStatus[c.currentStatus] || 0) + 1;
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    const d = (c.department && c.department.name) || 'Unassigned';
    byDept[d] = (byDept[d] || 0) + 1;
    const deadline = new Date(c.createdAt).getTime() + slaMinutes * 60000;
    const resolved = c.currentStatus === 'RESOLVED' || c.currentStatus === 'REJECTED';
    if (!resolved && deadline < now) overdue.push(c);
    if (!resolved && (c.priority === 'HIGH' || c.priority === 'CRITICAL')) highOpen.push(c);
    if (c.currentStatus === 'RESOLVED') completed.push(c);
  });
  return { byStatus, byCategory, byDept, overdue, highOpen, completed };
}
function fmt(c) { return '#' + c.ticketNumber + ' - ' + c.title; }
function ruleAnswer(question, rows, slaMinutes) {
  const q = String(question || '').toLowerCase();
  const s = summarize(rows, slaMinutes);
  if (q.includes('overdue') || q.includes('breach')) {
    if (!s.overdue.length) return { text: 'No overdue complaints (SLA ' + slaMinutes + ' min).', data: {} };
    return { text: s.overdue.length + ' overdue: ' + s.overdue.slice(0, 8).map(fmt).join('; '), data: {} };
  }
  if (q.includes('high-priority') || q.includes('urgent')) {
    if (!s.highOpen.length) return { text: 'Priority queue clear.', data: {} };
    return { text: s.highOpen.length + ' urgent: ' + s.highOpen.slice(0, 8).map(fmt).join('; '), data: {} };
  }
  if (q.includes('backlog') || q.includes('workload')) {
    const e = Object.entries(s.byDept).sort((a, b) => b[1] - a[1]);
    return { text: 'Backlog: ' + e.map((x) => x[0] + ':' + x[1]).join(', '), data: {} };
  }
  if (q.includes('completed')) {
    return { text: 'Completed ' + s.completed.length + ': ' + s.completed.slice(0, 8).map(fmt).join('; '), data: {} };
  }
  return { text: 'Scope ' + rows.length + '. Status ' + JSON.stringify(s.byStatus) + '. Overdue ' + s.overdue.length + '.', data: {} };
}
async function ask(user, question, opts) {
  const sla = (opts && opts.slaMinutes) || 30;
  const rows = await accessibleComplaints(user);
  const r = ruleAnswer(question, rows, sla);
  return { text: r.text, data: r.data, source: 'rules', provider: 'rules', suggested: SUGGESTED, note: 'Rule-based summary from authorized live data.' };
}
module.exports = { ask, accessibleComplaints, SUGGESTED, summarize };
