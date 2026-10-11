import { STATUS_FLOW, DEFAULT_SLA_MINUTES, ROLES } from './constants';
import { isValidDate } from './formatters';

/* ------------------------------------------------------------------ */
/* SLA helpers                                                         */
/* ------------------------------------------------------------------ */

/** Read the configured display SLA policy (minutes) from browser storage. */
export function getSlaMinutes() {
  try {
    const raw = localStorage.getItem('avenqra_sla_minutes');
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_SLA_MINUTES;
  } catch {
    return DEFAULT_SLA_MINUTES;
  }
}

export function setSlaMinutes(minutes) {
  try {
    localStorage.setItem('avenqra_sla_minutes', String(minutes));
  } catch {
    /* storage unavailable — ignore */
  }
}

/**
 * Compute SLA state for a complaint.
 * Deadline = createdAt (UTC, from server) + configured SLA window.
 * This is a *display* feature only — enforcement runs in the backend
 * escalation worker (backend/src/jobs/escalation.job.js).
 */
export function getSlaState(complaint, slaMinutes = getSlaMinutes(), now = Date.now()) {
  const created = isValidDate(complaint?.createdAt) ? new Date(complaint.createdAt).getTime() : null;
  if (created === null) {
    return { supported: false, deadline: null, remainingMs: null, overdue: false, resolved: false, breached: false };
  }
  const deadline = created + slaMinutes * 60 * 1000;
  const resolved = complaint.currentStatus === 'RESOLVED' || complaint.currentStatus === 'REJECTED';
  const resolvedAt = isValidDate(complaint.resolvedAt)
    ? new Date(complaint.resolvedAt).getTime()
    : complaint.currentStatus === 'RESOLVED' && isValidDate(complaint.updatedAt)
      ? new Date(complaint.updatedAt).getTime()
      : null;
  const remainingMs = deadline - now;
  const overdue = !resolved && remainingMs < 0;
  const breached = complaint.isEscalated === true || complaint.currentStatus === 'ESCALATED';
  return {
    supported: true,
    deadline,
    remainingMs,
    overdue,
    breached,
    resolved,
    withinSla: resolved ? resolvedAt !== null && resolvedAt <= deadline : !overdue,
    resolvedAt,
  };
}

/* ------------------------------------------------------------------ */
/* Status transitions                                                  */
/* ------------------------------------------------------------------ */

export function canTransition(from, to) {
  if (!from || !to) return false;
  if (from === to) return false;
  const allowed = STATUS_FLOW[from] || [];
  return allowed.includes(to);
}

export function transitionTargets(from) {
  return STATUS_FLOW[from] || [];
}

/** Consequential transitions require an explicit confirmation dialog. */
export function isConsequentialTransition(to) {
  return ['RESOLVED', 'ESCALATED', 'REJECTED'].includes(to);
}

/* ------------------------------------------------------------------ */
/* Permissions — UI-level only. The backend is the source of truth.    */
/* ------------------------------------------------------------------ */

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN];

export function isSuperAdmin(user) {
  return user?.role === ROLES.SUPER_ADMIN;
}

export function isAdmin(user) {
  return !!user && ADMIN_ROLES.includes(user.role);
}

const PERMISSIONS = {
  viewAllComplaints: [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.OFFICER],
  updateComplaintStatus: [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.OFFICER],
  escalateComplaint: [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN],
  assignOfficer: [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN],
  overrideUnavailableOfficer: [ROLES.SUPER_ADMIN],
  createDepartment: [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN],
  editDepartment: [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN],
  deactivateDepartment: [ROLES.SUPER_ADMIN],
  createOfficer: [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN],
  editOfficer: [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN],
  updateOfficerAvailability: [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.OFFICER],
  exportCsv: [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN],
  viewContacts: [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN],
  viewInternalNotes: [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.OFFICER],
};

export function can(user, permission) {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

/** Route-level access (nav visibility + ProtectedRoute). */
export function canAccessRoute(user, routeId) {
  if (!user) return false;
  const adminOnly = ['departments'];
  const adminPreferred = ['analytics'];
  if (adminOnly.includes(routeId)) return isAdmin(user);
  if (adminPreferred.includes(routeId)) return true;
  return true;
}
