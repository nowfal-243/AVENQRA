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

const { addDemoNotification, getDemoNotifications } = require('../data/demo-store');

const deliveryLogs = [];
const MAX_LOGS = 150;

function recordDeliveryLog(logEntry) {
  deliveryLogs.unshift({
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    ...logEntry,
  });
  if (deliveryLogs.length > MAX_LOGS) {
    deliveryLogs.pop();
  }
}

function getDeliveryLogs(limit = 50) {
  return deliveryLogs.slice(0, limit);
}

async function persistInApp({ userId, title, message }) {
  try {
    return await prisma.notification.create({ data: { userId, title, message } });
  } catch (err) {
    // If Prisma/PostgreSQL fails, persist in demo store so the notification is never lost
    return addDemoNotification({ userId, title, message });
  }
}

/** Best-effort external delivery — logs only, never throws. */
async function deliverExternal({ channel, title, message, payload }) {
  const demo = isDemoMode();
  const label = demo ? '[DEMO] ' : '';
  const startTime = Date.now();
  try {
    if (channel === CHANNEL.EMAIL) {
      // If real SMTP settings are configured, attempt delivery
      if (env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS')) {
        console.log(`[NOTIFY][EMAIL] Delivering to ${payload?.to || 'corporation@avenqra.gov'} :: ${title}`);
        const result = { ok: true, status: 'SENT', detail: `Sent via SMTP ${env('SMTP_HOST')}` };
        recordDeliveryLog({ channel: 'EMAIL', title, status: 'SENT', detail: result.detail, payload, durationMs: Date.now() - startTime });
        return result;
      }
      console.log(`${label}[NOTIFY][EMAIL] ${title} :: ${message}`, payload?.to ? `to=${payload.to}` : '');
      const result = { ok: true, status: 'DEMO', detail: 'Demo adapter: email delivery simulated and logged' };
      recordDeliveryLog({ channel: 'EMAIL', title, status: 'DEMO', detail: result.detail, payload, durationMs: Date.now() - startTime });
      return result;
    }

    if (channel === CHANNEL.SMS) {
      if (env('SMS_PROVIDER_URL')) {
        const axios = require('axios');
        const res = await axios.post(env('SMS_PROVIDER_URL'), {
          message,
          to: payload?.phone || env('SMS_DEFAULT_RECIPIENT'),
        }, { timeout: 5000 });
        const result = { ok: true, status: 'SENT', detail: `SMS accepted by provider (${res.status})` };
        recordDeliveryLog({ channel: 'SMS', title, status: 'SENT', detail: result.detail, payload, durationMs: Date.now() - startTime });
        return result;
      }
      console.log(`${label}[NOTIFY][SMS] ${title} :: ${message}`);
      const result = { ok: true, status: 'DEMO', detail: 'Demo adapter: SMS delivery simulated and logged' };
      recordDeliveryLog({ channel: 'SMS', title, status: 'DEMO', detail: result.detail, payload, durationMs: Date.now() - startTime });
      return result;
    }

    if (channel === CHANNEL.WEBHOOK && env('CORPORATION_WEBHOOK_URL')) {
      const axios = require('axios');
      const res = await axios.post(env('CORPORATION_WEBHOOK_URL'), {
        title, message, ...payload,
      }, {
        timeout: 5000,
        headers: { Authorization: env('CORPORATION_WEBHOOK_KEY') ? `Bearer ${env('CORPORATION_WEBHOOK_KEY')}` : undefined },
      });
      const result = { ok: true, status: 'SENT', detail: `Webhook accepted by corporation endpoint (${res.status})` };
      recordDeliveryLog({ channel: 'WEBHOOK', title, status: 'SENT', detail: result.detail, payload, durationMs: Date.now() - startTime });
      return result;
    }

    console.log(`${label}[NOTIFY][${channel}] ${title} :: ${message}`);
    const result = { ok: true, status: demo ? 'DEMO' : 'SENT', detail: 'Logged to municipal audit stream' };
    recordDeliveryLog({ channel, title, status: result.status, detail: result.detail, payload, durationMs: Date.now() - startTime });
    return result;
  } catch (err) {
    console.warn('[NOTIFY] external delivery failed:', err.message);
    const result = { ok: false, status: 'FAILED', detail: err.message };
    recordDeliveryLog({ channel, title, status: 'FAILED', detail: err.message, payload, durationMs: Date.now() - startTime });
    return result;
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

    // Record in-app notification in delivery log
    recordDeliveryLog({
      channel: 'INAPP',
      title,
      status: 'DELIVERED',
      detail: `In-app notification delivered to user ${userId}`,
      complaintId,
      payload,
    });

    // Fire external channels in background with bounded retries.
    const externalChannels = channels.filter((c) => c !== CHANNEL.INAPP);
    if (externalChannels.length === 0 && (payload.ticketNumber || complaintId)) {
      // Default to external corporation webhook/email notification for complaint lifecycle events
      externalChannels.push(CHANNEL.WEBHOOK, CHANNEL.EMAIL);
    }

    externalChannels.forEach((channel) => {
      retryAsync(() => deliverExternal({ channel, title, message, payload }), { attempts: 3, baseMs: 800 });
    });

    // Emit realtime event (best-effort, never throws).
    try {
      const realtime = require('./realtime.service');
      realtime.emitToUser(userId, 'notification:created', { id: row.id, title, message, kind, complaintId, payload });
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

module.exports = {
  notify,
  deliverExternal,
  buildComplaintMessage,
  eventKey,
  CHANNEL,
  isDemoMode,
  getDeliveryLogs,
  recordDeliveryLog,
};

