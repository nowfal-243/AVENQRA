const express = require('express');
const prisma = require('../config/db');
const ApiResponse = require('../utils/api-response');
const { authenticate } = require('../middlewares/auth.middleware');
const realtime = require('../services/realtime.service');
const router = express.Router();
router.get('/dashboard/overview', authenticate, async (req, res, next) => {
  try {
    const total = await prisma.complaint.count();
    const by = await prisma.complaint.groupBy({ by: ['currentStatus'], _count: true });
    const map = {}; by.forEach((r) => { map[r.currentStatus] = r._count; });
    const recent = await prisma.complaintStatusLog.findMany({ take: 15, orderBy: { changedAt: 'desc' },
      include: { complaint: { select: { ticketNumber: true, title: true } }, updatedBy: { select: { name: true } } } });
    return ApiResponse.success(res, 'Dashboard overview', { total, byStatus: map, recentActivity: recent });
  } catch (e) { next(e); }
});
router.post('/assistant/ask', authenticate, async (req, res, next) => {
  try {
    const q = req.body.question || req.body.q || '';
    if (!q || String(q).length > 1000) return ApiResponse.error(res, 'Question required (max 1000 chars).', 400);
    const svc = require('../services/assistant.service');
    const out = await svc.ask(req.user, String(q), { slaMinutes: 30 });
    return ApiResponse.success(res, 'Assistant answer', out);
  } catch (e) { next(e); }
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
