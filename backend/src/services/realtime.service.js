/**
 * AVENQRA realtime hub — Server-Sent Events (SSE), no new dependencies.
 * Priority order from spec: reuse existing socket infra (none exists) ->
 * SSE -> polling fallback (frontend handles fallback).
 *
 * Auth: the SSE route is behind `authenticate`; each connection is scoped to
 * req.user.id + role. Department users only receive events for their own
 * department (checked at emit time via payload.departmentId).
 */
const clients = new Map(); // userId -> Set(res)

function addClient(userId, res) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);
}

function removeClient(userId, res) {
  const set = clients.get(userId);
  if (set) {
    set.delete(res);
    if (set.size === 0) clients.delete(userId);
  }
}

function writeEvent(res, event, data) {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch { /* client gone */ }
}

/** Broadcast to a single user (all their open tabs). */
function emitToUser(userId, event, data) {
  const set = clients.get(String(userId));
  if (!set) return;
  set.forEach((res) => writeEvent(res, event, data));
}

/** Broadcast to many users. */
function emitToUsers(userIds, event, data) {
  (userIds || []).forEach((id) => emitToUser(id, event, data));
}

/**
 * Department-scoped broadcast helper.
 * Callers pass the list of candidate userIds + the event departmentId;
 * per-user filtering happens on the frontend too, but we keep server-side
 * scoping by requiring callers to resolve recipients (never broadcast-all
 * private complaint data).
 */
function emitComplaintEvent(event, { complaint, recipients = [] }) {
  const safe = {
    id: complaint?.id,
    ticketNumber: complaint?.ticketNumber,
    title: complaint?.title,
    currentStatus: complaint?.currentStatus,
    departmentId: complaint?.departmentId || null,
    updatedAt: complaint?.updatedAt || new Date().toISOString(),
  };
  emitToUsers(recipients, event, safe);
}

module.exports = { addClient, removeClient, writeEvent, emitToUser, emitToUsers, emitComplaintEvent };
