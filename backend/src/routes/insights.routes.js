const express = require('express');
const prisma = require('../config/db');
const ApiResponse = require('../utils/api-response');
const { authenticate } = require('../middlewares/auth.middleware');
const realtime = require('../services/realtime.service');
const router = express.Router();
router.get('/dashboard/overview', authenticate, async (req, res, next) => {
  try {
    const slaMinutes = parseInt(process.env.SLA_MINUTES || '30', 10);
    const slaLimitMs = slaMinutes * 60 * 1000;
    const now = Date.now();

    let complaints = [];
    let recentActivity = [];
    let isLive = true;

    try {
      complaints = await prisma.complaint.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { name: true, code: true } },
          statusLogs: {
            take: 3,
            orderBy: { changedAt: 'desc' },
            include: { updatedBy: { select: { name: true, role: true } } },
          },
        },
      });

      const logs = await prisma.complaintStatusLog.findMany({
        take: 15,
        orderBy: { changedAt: 'desc' },
        include: {
          complaint: { select: { ticketNumber: true, title: true, category: true } },
          updatedBy: { select: { name: true, role: true } },
        },
      });

      recentActivity = logs.map((l) => ({
        id: l.id,
        ticket: l.complaint?.ticketNumber || 'TICKET',
        title: l.complaint?.title,
        status: l.status,
        remarks: l.remarks || `Status transitioned to ${l.status}`,
        at: l.changedAt,
        by: l.updatedBy?.name || 'System',
        role: l.updatedBy?.role || 'SYSTEM',
      }));
    } catch (dbErr) {
      isLive = false;
      const { getDemoComplaints } = require('../data/demo-store');
      complaints = getDemoComplaints();

      complaints.forEach((c) => {
        (c.statusLogs || []).forEach((log) => {
          recentActivity.push({
            id: log.id || `${c.id}-${log.status}`,
            ticket: c.ticketNumber,
            title: c.title,
            status: log.status,
            remarks: log.remarks || `Status updated to ${log.status}`,
            at: log.changedAt,
            by: log.updatedBy?.name || 'Municipal Officer',
            role: log.updatedBy?.role || 'OFFICER',
          });
        });
      });
      recentActivity.sort((a, b) => new Date(b.at) - new Date(a.at));
      recentActivity = recentActivity.slice(0, 15);
    }

    const total = complaints.length;
    const byStatus = {};
    const byCategory = {};

    let newlyAssigned = 0;
    let inProgress = 0;
    let escalated = 0;
    let completed = 0;
    let slaBreaches = 0;
    let resolvedWithinSla = 0;
    let resolvedTotal = 0;

    complaints.forEach((c) => {
      byStatus[c.currentStatus] = (byStatus[c.currentStatus] || 0) + 1;
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;

      if (c.currentStatus === 'SUBMITTED' || c.currentStatus === 'ASSIGNED') newlyAssigned += 1;
      if (c.currentStatus === 'IN_PROGRESS') inProgress += 1;
      if (c.currentStatus === 'ESCALATED') escalated += 1;
      if (c.currentStatus === 'RESOLVED' || c.currentStatus === 'REJECTED') completed += 1;

      const createdTime = new Date(c.createdAt).getTime();
      const deadline = createdTime + slaLimitMs;
      const isPastSla = deadline < now;

      if (c.isEscalated || (['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'].includes(c.currentStatus) && isPastSla)) {
        slaBreaches += 1;
      }

      if (c.currentStatus === 'RESOLVED') {
        resolvedTotal += 1;
        const resolvedTime = new Date(c.resolvedAt || c.updatedAt).getTime();
        if (resolvedTime <= deadline) {
          resolvedWithinSla += 1;
        }
      }
    });

    const slaCompliance = resolvedTotal > 0
      ? Number(((resolvedWithinSla / resolvedTotal) * 100).toFixed(1))
      : null;

    return ApiResponse.success(res, 'Dashboard overview', {
      total,
      totalComplaints: total,
      newlyAssigned,
      inProgress,
      escalated,
      pendingEscalated: escalated,
      completed,
      slaBreaches,
      slaCompliance,
      slaComplianceRate: slaCompliance,
      resolvedTotal,
      resolvedWithinSla,
      byStatus,
      byCategory,
      recentActivity,
      isLive,
      slaMinutes,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/events/stream', (req, res, next) => {
  // EventSource cannot send Authorization headers — accept ?token= too.
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  const { authenticate } = require('../middlewares/auth.middleware');
  authenticate(req, res, () => {
    res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  const uid = String(req.user.id);
  realtime.addClient(uid, res);
  realtime.writeEvent(res, 'ready', { ok: true, user: uid });
  const ping = setInterval(() => realtime.writeEvent(res, 'ping', { t: Date.now() }), 25000);
  req.on('close', () => { clearInterval(ping); realtime.removeClient(uid, res); });
  });
});
module.exports = router;
