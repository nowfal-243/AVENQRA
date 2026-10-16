const dbModule = require('../config/db');
const prisma = dbModule.prisma || dbModule;
const withTimeout = dbModule.withTimeout || ((p) => p);
const isDbReachable = dbModule.isDbReachable || (async () => true);
const axios = require('axios');
const { getDemoComplaints } = require('../data/demo-store');

const PROVIDER = (process.env.AI_PROVIDER || 'rules').toLowerCase();
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const AI_API_URL = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
const DB_TIMEOUT_MS = parseInt(process.env.DB_TIMEOUT_MS || '2500', 10);

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
  try {
    const reachable = await isDbReachable(800);
    if (!reachable) throw new Error('DB unreachable (TCP probe failed) — using demo dataset');
    const where = {};
    if (user.role === 'CITIZEN') {
      const citizen = await withTimeout(
        prisma.citizen.findUnique({ where: { userId: user.id } }),
        DB_TIMEOUT_MS, 'citizen lookup');
      where.citizenId = citizen ? citizen.id : '__none__';
    } else if (user.role === 'OFFICER') {
      const officer = await withTimeout(
        prisma.officer.findUnique({ where: { userId: user.id } }),
        DB_TIMEOUT_MS, 'officer lookup');
      const as = officer ? await withTimeout(
        prisma.assignment.findMany({ where: { officerId: officer.id }, select: { complaintId: true } }),
        DB_TIMEOUT_MS, 'assignment lookup') : [];
      where.id = { in: as.map((a) => a.complaintId).concat(['__none__']) };
    } else if (user.role === 'DEPARTMENT_ADMIN') {
      const officer = await withTimeout(
        prisma.officer.findUnique({ where: { userId: user.id } }),
        DB_TIMEOUT_MS, 'officer lookup');
      if (officer && officer.departmentId) where.departmentId = officer.departmentId;
    }
    const rows = await withTimeout(
      prisma.complaint.findMany({
        where, take, orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { id: true, name: true, code: true, slaHours: true } },
          location: true,
          assignments: { include: { officer: { include: { user: { select: { name: true } } } } } },
          statusLogs: { orderBy: { changedAt: 'desc' }, take: 5, include: { updatedBy: { select: { name: true, role: true } } } },
        },
      }),
      DB_TIMEOUT_MS, 'complaint list');
    return { rows, live: true };
  } catch (err) {
    console.warn('[Assistant] Live DB unavailable, serving demo dataset:', err.message);
    let rows = getDemoComplaints();
    if (user && user.role === 'CITIZEN') rows = rows.filter((c) => c.citizenId === 'demo-cit-1');
    return { rows: rows.slice(0, take), live: false };
  }
}

function summarize(rows, slaMinutes) {
  const now = Date.now();
  const byStatus = {};
  const byCategory = {};
  const byDept = {};
  const bySeverity = {};
  const overdue = [];
  const highOpen = [];
  const completed = [];
  const escalated = [];

  rows.forEach((c) => {
    byStatus[c.currentStatus] = (byStatus[c.currentStatus] || 0) + 1;
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    bySeverity[c.priority] = (bySeverity[c.priority] || 0) + 1;

    const d = (c.department && c.department.name) || 'Unassigned';
    byDept[d] = (byDept[d] || 0) + 1;

    const deadline = new Date(c.createdAt).getTime() + slaMinutes * 60000;
    const resolved = c.currentStatus === 'RESOLVED' || c.currentStatus === 'REJECTED';

    if (!resolved && (deadline < now || c.isEscalated)) overdue.push(c);
    if (!resolved && (c.priority === 'HIGH' || c.priority === 'CRITICAL')) highOpen.push(c);
    if (c.currentStatus === 'RESOLVED') completed.push(c);
    if (c.currentStatus === 'ESCALATED' || c.isEscalated) escalated.push(c);
  });

  return { byStatus, byCategory, byDept, bySeverity, overdue, highOpen, completed, escalated };
}

function fmt(c) {
  return `#${c.ticketNumber} (${c.title || c.category})`;
}

/** Check if query mentions an individual ticket */
function findTargetComplaint(q, rows) {
  const qLower = q.toLowerCase();
  // 1. Direct match with id or ticketNumber
  for (const c of rows) {
    if (c.id && qLower.includes(c.id.toLowerCase())) return c;
    if (c.ticketNumber && qLower.includes(c.ticketNumber.toLowerCase())) return c;
  }
  // 2. Pattern match (AVN-XXXX-XXXX, UUID, numbers)
  const match = q.match(/avn-\d{4}-\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|cmp-\d+|#?\b(\d{4,6})\b/i);
  if (match) {
    const raw = match[0].replace('#', '').toUpperCase();
    const found = rows.find((c) => (c.ticketNumber && c.ticketNumber.toUpperCase().includes(raw)) || (c.id && c.id.toUpperCase() === raw));
    if (found) return found;
  }
  // 3. Keyword / title / address match
  for (const c of rows) {
    if (c.title && qLower.includes(c.title.toLowerCase())) return c;
    if (c.location?.addressFormatted && qLower.includes(c.location.addressFormatted.toLowerCase())) return c;
  }
  return null;
}

/** Recommend department based on query keywords */
function recommendDepartment(q) {
  const text = q.toLowerCase();
  if (text.includes('garbage') || text.includes('waste') || text.includes('dump') || text.includes('trash') || text.includes('clean')) {
    return { name: 'Waste Management', code: 'WASTE', slaHours: 24, reason: 'Keyword match for waste/garbage collection' };
  }
  if (text.includes('water') || text.includes('pipe') || text.includes('sewage') || text.includes('leak') || text.includes('drain')) {
    return { name: 'Water & Sewage Supply', code: 'WATER', slaHours: 12, reason: 'Keyword match for water supply, pipe leaks or sewage overflow' };
  }
  if (text.includes('light') || text.includes('electric') || text.includes('power') || text.includes('wire') || text.includes('lamp') || text.includes('dark')) {
    return { name: 'Electrical Engineering', code: 'ELEC', slaHours: 8, reason: 'Keyword match for street lighting, electrical poles, or wiring hazards' };
  }
  if (text.includes('pothole') || text.includes('road') || text.includes('footpath') || text.includes('traffic') || text.includes('bridge') || text.includes('asphalt')) {
    return { name: 'Roads & Infrastructure', code: 'ROAD', slaHours: 48, reason: 'Keyword match for road maintenance, potholes, or footpath paving' };
  }
  return { name: 'General Municipal Administration', code: 'ROAD', slaHours: 48, reason: 'Default civic issue routing' };
}

function ruleAnswer(question, rows, slaMinutes) {
  const q = String(question || '').trim().toLowerCase();
  const s = summarize(rows, slaMinutes);
  const total = rows.length;
  const open = total - s.completed.length;

  // 1. Action detection (consequential action proposals requiring explicit user confirmation)
  if (q.includes('escalate') && (q.includes('ticket') || q.includes('avn-') || q.includes('#') || q.includes('complaint'))) {
    const target = findTargetComplaint(q, rows);
    if (target) {
      return {
        text: `⚠️ **Action Proposal: Escalate Complaint #${target.ticketNumber}**\n\n` +
          `• **Title:** ${target.title}\n` +
          `• **Current Status:** ${target.currentStatus} (Priority: ${target.priority})\n` +
          `• **Proposed Target:** Status: \`ESCALATED\` | Priority: \`CRITICAL\`\n` +
          `• **Audit Impact:** This consequential action will be recorded in the municipal audit history and alert all Super Admins.\n\n` +
          `*Please confirm below to execute this update.*`,
        data: {
          actionProposal: {
            action: 'ESCALATE',
            complaintId: target.id,
            ticketNumber: target.ticketNumber,
            currentStatus: target.currentStatus,
            targetStatus: 'ESCALATED',
            title: target.title,
            requiresConfirmation: true,
          },
        },
      };
    }
  }

  if ((q.includes('resolve') || q.includes('complete') || q.includes('mark resolved')) && (q.includes('ticket') || q.includes('avn-') || q.includes('#'))) {
    const target = findTargetComplaint(q, rows);
    if (target) {
      return {
        text: `✅ **Action Proposal: Mark Resolved #${target.ticketNumber}**\n\n` +
          `• **Title:** ${target.title}\n` +
          `• **Current Status:** ${target.currentStatus}\n` +
          `• **Target Status:** \`RESOLVED\`\n` +
          `• **Audit Impact:** The citizen will receive an automated resolution notification and this ticket will be marked complete.\n\n` +
          `*Please confirm below to execute this update.*`,
        data: {
          actionProposal: {
            action: 'RESOLVE',
            complaintId: target.id,
            ticketNumber: target.ticketNumber,
            currentStatus: target.currentStatus,
            targetStatus: 'RESOLVED',
            title: target.title,
            requiresConfirmation: true,
          },
        },
      };
    }
  }

  // 2. Individual ticket progress lookup
  const target = findTargetComplaint(q, rows);
  if (target && (q.includes('status') || q.includes('explain') || q.includes('progress') || q.includes('ticket') || q.includes('about') || q.includes('where is') || q.includes('tell me about'))) {
    const assignedOfficer = target.assignments?.[target.assignments.length - 1]?.officer;
    const deadline = new Date(new Date(target.createdAt).getTime() + slaMinutes * 60000);
    const isOverdue = !['RESOLVED', 'REJECTED'].includes(target.currentStatus) && deadline.getTime() < Date.now();
    const logs = target.statusLogs || [];

    return {
      text: `📋 **Complaint Progress: #${target.ticketNumber}**\n\n` +
        `• **Title:** ${target.title}\n` +
        `• **Category & Severity:** ${target.category} · Priority: **${target.priority}**\n` +
        `• **Current Status:** \`${target.currentStatus}\`${target.isEscalated ? ' (🚨 Escalated)' : ''}\n` +
        `• **Department:** ${target.department?.name || 'Unassigned'}\n` +
        `• **Assigned Officer:** ${assignedOfficer ? `${assignedOfficer.user?.name || 'Officer'} (Badge #${assignedOfficer.badgeNumber})` : 'Pending Dispatch'}\n` +
        `• **Location:** ${target.location?.addressFormatted || 'Coordinates recorded'}\n` +
        `• **SLA Deadline (UTC):** ${deadline.toISOString()} (${isOverdue ? '⚠️ Overdue' : 'Within SLA'})\n` +
        (logs.length > 0 ? `• **Recent Status Log:** ${logs[0].remarks || logs[0].status} by ${logs[0].updatedBy?.name || 'System'}` : ''),
      data: { ticket: target },
    };
  }

  // 3. Draft corporation notification messages
  if (q.includes('draft') && (q.includes('notification') || q.includes('message') || q.includes('notice') || q.includes('dispatch'))) {
    const draftTarget = target || rows[0];
    if (!draftTarget) return { text: 'No complaints available to draft a notification.', data: {} };
    const dept = draftTarget.department?.name || 'Municipal Operations';
    const deadline = new Date(new Date(draftTarget.createdAt).getTime() + slaMinutes * 60000).toISOString();
    return {
      text: `📢 **OFFICIAL MUNICIPAL CORPORATION NOTIFICATION DRAFT**\n\n` +
        `**To:** Responsible Department Officer, ${dept}\n` +
        `**Subject:** Urgent Dispatch — Incident #${draftTarget.ticketNumber}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**Complaint ID:** ${draftTarget.ticketNumber}\n` +
        `**Category:** ${draftTarget.category} (Severity: ${draftTarget.priority})\n` +
        `**Incident Title:** ${draftTarget.title}\n` +
        `**Description:** ${draftTarget.description || 'Civic issue report requires immediate field attendance.'}\n` +
        `**Location:** ${draftTarget.location?.addressFormatted || 'Municipal Zone A'}\n` +
        `**SLA Resolution Deadline:** ${deadline}\n` +
        `**Action Required:** Deploy municipal crew immediately. Upload proof of resolution upon completion.\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      data: { draftedTicket: draftTarget.ticketNumber },
    };
  }

  // 4. Overdue complaints / SLA breaches
  if (q.includes('overdue') || q.includes('breach') || q.includes('sla')) {
    if (q.includes('reason') || q.includes('why')) {
      const breachedCount = s.overdue.length;
      if (breachedCount === 0) {
        return { text: `✅ No SLA breaches recorded. All active tickets are progressing within the ${slaMinutes}-minute resolution window.`, data: {} };
      }
      return {
        text: `🔍 **SLA Breach Root-Cause Analysis**\n\n` +
          `• Total breaches: **${breachedCount} tickets** past the ${slaMinutes}-min SLA threshold.\n` +
          `• **Primary Bottlenecks:**\n` +
          `  1. Officer dispatch delays: ${s.byStatus['SUBMITTED'] || 0} tickets still pending initial officer assignment.\n` +
          `  2. Complex on-site remediation in Road & Drainage sectors.\n` +
          `  3. Unassigned workload in top departments (${Object.keys(s.byDept).slice(0, 2).join(', ')}).\n` +
          `• **Recommendations:** Rebalance active officer dispatches and review the priority queue.`,
        data: { overdueCount: breachedCount, byDept: s.byDept },
      };
    }
    if (!s.overdue.length) {
      return { text: `✅ No overdue complaints — all ${open} open tickets are within the ${slaMinutes}-min SLA window.`, data: { overdue: [] } };
    }
    return {
      text: `⚠️ **${s.overdue.length} Overdue Complaints (breaching ${slaMinutes}-min SLA):**\n` +
        s.overdue.slice(0, 6).map((c) => `• ${fmt(c)} [${c.currentStatus}] - ${c.department?.name || 'Unassigned'}`).join('\n') +
        (s.overdue.length > 6 ? `\n...and ${s.overdue.length - 6} more.` : ''),
      data: { overdue: s.overdue.map((c) => c.ticketNumber) },
    };
  }

  // 5. Urgent attention / High-priority open complaints
  if (q.includes('urgent') || q.includes('attention') || q.includes('critical') || q.includes('high priority') || q.includes('high-priority') || q.includes('priority')) {
    if (!s.highOpen.length) {
      return { text: '✅ Priority queue clear — no unresolved HIGH or CRITICAL severity tickets currently pending.', data: {} };
    }
    return {
      text: `🔴 **${s.highOpen.length} Complaints Requiring Urgent Attention:**\n` +
        s.highOpen.slice(0, 6).map((c) => `• ${fmt(c)} — Priority: **${c.priority}** (${c.currentStatus})`).join('\n') +
        `\n\nRecommended Action: Prioritize dispatch and field crew resolution before SLA expires.`,
      data: { urgent: s.highOpen.map((c) => c.ticketNumber) },
    };
  }

  // 6. Department workloads & backlog
  if (q.includes('backlog') || q.includes('workload') || q.includes('department') || q.includes('largest')) {
    const entries = Object.entries(s.byDept).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return { text: 'No complaints in scope.', data: {} };
    const largest = entries[0];
    return {
      text: `🏗️ **Department Workload & Backlog Breakdown:**\n\n` +
        entries.map(([dept, count]) => `• **${dept}:** ${count} complaint${count === 1 ? '' : 's'}`).join('\n') +
        `\n\n**Largest Backlog:** ${largest[0]} with ${largest[1]} ticket${largest[1] === 1 ? '' : 's'}.`,
      data: { byDept: s.byDept },
    };
  }

  // 7. Completed work over period
  if (q.includes('completed') || q.includes('resolved') || q.includes('closed') || q.includes('recent')) {
    if (!s.completed.length) {
      return { text: `ℹ️ No complaints resolved yet in this dataset (${open} tickets currently open).`, data: {} };
    }
    return {
      text: `✅ **Recently Completed Tasks (${s.completed.length} resolved):**\n\n` +
        s.completed.slice(0, 6).map((c) => `• ${fmt(c)} — Department: ${c.department?.name || 'General'}`).join('\n'),
      data: { completed: s.completed.map((c) => c.ticketNumber) },
    };
  }

  // 8. Department recommendations
  if (q.includes('recommend') || q.includes('which department') || q.includes('route to')) {
    const rec = recommendDepartment(q);
    return {
      text: `🏛️ **Department Recommendation:**\n\n` +
        `• **Recommended Department:** **${rec.name}** (\`${rec.code}\`)\n` +
        `• **Target SLA:** ${rec.slaHours} hours\n` +
        `• **Rationale:** ${rec.reason}\n\n` +
        `You can select this department during complaint submission or officer reassignment.`,
      data: rec,
    };
  }

  // 9. Dashboard metrics explanation
  if (q.includes('metric') || q.includes('compliance') || q.includes('kpi') || q.includes('rate')) {
    const resolvedTotal = s.completed.length;
    const withinSlaCount = s.completed.filter((c) => !c.isEscalated).length;
    const complianceRate = resolvedTotal > 0 ? ((withinSlaCount / resolvedTotal) * 100).toFixed(1) : '100.0';
    return {
      text: `📊 **Dashboard Metric Intelligence:**\n\n` +
        `• **Total Filed:** ${total}\n` +
        `• **Active Open:** ${open} (${s.byStatus['IN_PROGRESS'] || 0} in progress, ${s.byStatus['SUBMITTED'] || 0} newly filed)\n` +
        `• **Resolved:** ${resolvedTotal}\n` +
        `• **SLA Compliance Rate:** ${complianceRate}%\n` +
        `• **SLA Threshold:** ${slaMinutes} minutes\n` +
        `• **Breaches / Escalations:** ${s.escalated.length}`,
      data: { total, open, resolvedTotal, complianceRate },
    };
  }

  // 10. General overview / Today's summary
  const cats = Object.entries(s.byCategory).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'None';
  return {
    text: `📋 **Civic Operations Overview (Today):**\n\n` +
      `• **Total complaints in scope:** ${total}\n` +
      `• **Open backlog:** ${open} (${s.byStatus['IN_PROGRESS'] || 0} In Progress · ${s.byStatus['ASSIGNED'] || 0} Assigned)\n` +
      `• **Completed:** ${s.completed.length} resolved\n` +
      `• **Overdue (${slaMinutes}-min SLA):** ${s.overdue.length} ticket${s.overdue.length === 1 ? '' : 's'}\n` +
      `• **By Category:** ${cats}\n\n` +
      `Try asking: *"Find overdue complaints"*, *"Identify complaints requiring urgent attention"*, or *"Which department has the largest backlog?"*`,
    data: { byStatus: s.byStatus, byCategory: s.byCategory },
  };
}

/**
 * Server-side generative AI provider integration (OpenAI / Gemini / rules fallback).
 * Never exposes API keys to client. Never allows arbitrary SQL, shell or API calls.
 */
async function callGenerativeAI(question, rows, slaMinutes, userRole) {
  if (!AI_API_KEY || PROVIDER === 'rules') {
    return null; // fall back to rules
  }

  try {
    const s = summarize(rows, slaMinutes);
    const systemPrompt = `You are AVENQRA AI, the official civic complaint intelligence assistant for municipal operations.
You answer civic administrative queries accurately based ONLY on the following authorized dataset summary.
Never execute shell, SQL, or arbitrary API calls.
Never leak user passwords or citizen private phone numbers.

CURRENT LIVE DATASET CONTEXT:
- Total Complaints: ${rows.length}
- Open Workload: ${rows.length - s.completed.length}
- Completed: ${s.completed.length}
- Overdue (exceeding ${slaMinutes}-min SLA): ${s.overdue.length}
- Urgently Open (HIGH/CRITICAL): ${s.highOpen.length}
- Department Breakdown: ${JSON.stringify(s.byDept)}
- Category Breakdown: ${JSON.stringify(s.byCategory)}
- Status Breakdown: ${JSON.stringify(s.byStatus)}
- Sample Recent Complaints: ${JSON.stringify(rows.slice(0, 8).map((c) => ({ ticket: c.ticketNumber, title: c.title, status: c.currentStatus, priority: c.priority, dept: c.department?.name })))}

User Role: ${userRole}
Be professional, concise, structured, and helpful.`;

    const response = await axios.post(AI_API_URL, {
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      temperature: 0.2,
      max_tokens: 600,
    }, {
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const aiText = response.data?.choices?.[0]?.message?.content;
    if (aiText) {
      return {
        text: aiText,
        source: 'generative-ai',
        provider: PROVIDER,
        data: { byStatus: s.byStatus },
        suggested: SUGGESTED,
        note: `Generated by ${AI_MODEL} using authorized live database context.`,
      };
    }
  } catch (err) {
    console.warn('[Assistant] Generative AI call notice (falling back to rules):', err.message);
  }
  return null;
}

async function ask(user, question, opts = {}) {
  const sla = opts.slaMinutes || 30;
  let rows = opts.rows || null;
  let live = true;

  if (!rows) {
    const res = await accessibleComplaints(user);
    rows = res.rows;
    live = res.live;
  } else if (rows && rows.rows) {
    live = rows.live !== false;
    rows = rows.rows;
  }

  // Attempt generative AI provider if configured
  if (PROVIDER !== 'rules' && AI_API_KEY) {
    const genResult = await callGenerativeAI(question, rows, sla, user.role);
    if (genResult) return genResult;
  }

  // Rule-based engine fallback
  const r = ruleAnswer(question, rows, sla);
  return {
    text: r.text,
    data: r.data,
    source: live ? 'rules' : 'rules-demo',
    provider: 'rules',
    suggested: SUGGESTED,
    note: live
      ? 'Rule-based summary from authorized live municipal data.'
      : 'Rule-based summary from demo data (PostgreSQL unreachable).',
  };
}

module.exports = {
  ask,
  accessibleComplaints,
  SUGGESTED,
  summarize,
  findTargetComplaint,
  recommendDepartment,
};

