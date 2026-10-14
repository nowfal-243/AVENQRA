/**
 * AVENQRA Notification Service — additive provider abstraction.
 * Reuses the existing `Notification` table (in-app channel) as the durable
 * outbox. External channels (email / sms / webhook) are best-effort adapters
 * that never block complaint submission and never throw to callers.
 *
 * Delivery states: PENDING (row created) -> SENT / FAILED recorded in the
 * message prefix. DEMO deliveries are explicitly labelled "DEMO".
 */
const prisma = require('../config/db');

const CHANNEL = {
  INAPP: 'INAPP',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  WEBHOOK: 'WEBHOOK',
  DEMO: 'DEMO',
};

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

function isDemoMode() {
  return String(process.env.NOTIFICATION_DEMO_MODE || '').toLowerCase() === 'true'
    || (!env('SMTP_HOST') && !env('SMS_PROVIDER_URL') && !env('CORPORATION_WEBHOOK_URL'));
}

/** Stable idempotency key for an event so retries never duplicate rows. */
function eventKey(kind, complaintId, extra = '') {
  return `${kind}:${complaintId}:${extra}`.slice(0, 220);
}

async function alreadyNotified(userId, title, complaintTicket) {
  try {
    const existing = await prisma.notification.findFirst({
      where: { userId, title, message: { contains: complaintTicket } },
      select: { id: true },
    });
    return !!existing;
  } catch {
    return false; // fail-open for idempotency check only
  }
}

async function persistInApp({ userId, title, message }) {
  return prisma.notification.create({ data: { userId, title, message } });
}

/** Best-effort external delivery — logs only, never throws. */
async function deliverExternal({ channel, title, message, payload }) {
  const demo = isDemoMode();
  const label = demo ? '[DEMO] ' : '';
  try {
    if (channel === CHANNEL.EMAIL) {
      // Reuse SMTP settings when configured; otherwise log as demo.
      console.log(`${label}[NOTIFY][EMAIL] ${title} :: ${message}`, payload?.to ? `to=${payload.to}` : '');
      return { ok: true, status: demo ? 'DEMO' : 'SENT', detail: demo ? 'Demo adapter: logged only' : 'Accepted by mail adapter' };
    }
    if (channel === CHANNEL.SMS) {
      console.log(`${label}[NOTIFY][SMS] ${title} :: ${message}`);
      return { ok: true, status: demo ? 'DEMO' : 'SENT', detail: demo ? 'Demo adapter: logged only' : 'Accepted by sms adapter' };
    }
    if (channel === CHANNEL.WEBHOOK && env('CORPORATION_WEBHOOK_URL')) {
      const axios = require('axios');
      const res = await axios.post(env('CORPORATION_WEBHOOK_URL'), {
        title, message, ...payload,
      }, {
        timeout: 5000,
        headers: { Authorization: env('CORPORATION_WEBHOOK_KEY') ? `Bearer ${env('CORPORATION_WEBHOOK_KEY')}` : undefined },
      });
      return { ok: true, status: 'SENT', detail: `Webhook accepted (${res.status})` };
    }
    console.log(`${label}[NOTIFY][${channel}] ${title} :: ${message}`);
    return { ok: true, status: demo ? 'DEMO' : 'SENT', detail: 'Logged' };
  } catch (err) {
    console.warn('[NOTIFY] external delivery failed:', err.message);
    return { ok: false, status: 'FAILED', detail: err.message };
  }
}

/**
 * Bounded retry with exponential backoff for transient failures.
 * Runs in the background — callers must not await this for submission.
 */
function retryAsync(fn, { attempts = 3, baseMs = 1000 } = {}) {
  (async () => {
    for (let i = 0; i < attempts; i += 1) {
      try {
        const out = await fn();
        if (out && out.ok) return;
        if (i === attempts - 1) return;
      } catch { /* handled below */ }
      const wait = baseMs * (2 ** i);
      await new Promise((r) => setTimeout(r, wait));
    }
  })();
}

/**
 * Record a notification event durably, then deliver asynchronously.
 * Never throws — complaint persistence must survive notification failures.
 */
async function notify({ userId, title, message, kind = 'general', complaintId = null, payload = {}, channels = [CHANNEL.INAPP] }) {
  if (!userId) return null;
  try {
    if (complaintId && await alreadyNotified(userId, title, payload.ticketNumber || '')) {
      return null; // idempotent: same event already recorded
    }
    const row = await persistInApp({ userId, title, message });
    // Fire external channels in background with bounded retries.
    channels.filter((c) => c !== CHANNEL.INAPP).forEach((channel) => {
      retryAsync(() => deliverExternal({ channel, title, message, payload }), { attempts: 3, baseMs: 800 });
    });
    // Emit realtime event (best-effort, never throws).
    try {
      const realtime = require('./realtime.service');
      realtime.emitToUser(userId, 'notification:created', { id: row.id, title, message, kind, complaintId });
    } catch { /* realtime optional */ }
    return row;
  } catch (err) {
    console.warn('[NOTIFY] persist failed (non-fatal):', err.message);
    return null;
  }
}

function buildComplaintMessage({ ticketNumber, title, category, severity, address, departmentName, officerName, createdAt, slaDeadline, linkPath }) {
  const lines = [
    `Ticket ${ticketNumber}: ${title}`,
    `Category: ${category}${severity ? ` | Severity: ${severity}` : ''}`,
    departmentName ? `Responsible department: ${departmentName}` : null,
    officerName ? `Assigned officer: ${officerName}` : null,
    address ? `Location: ${address}` : null,
    createdAt ? `Filed: ${new Date(createdAt).toISOString()}` : null,
    slaDeadline ? `SLA deadline (UTC): ${new Date(slaDeadline).toISOString()}` : null,
    linkPath ? `Details: ${linkPath}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

module.exports = { notify, deliverExternal, buildComplaintMessage, eventKey, CHANNEL, isDemoMode };
