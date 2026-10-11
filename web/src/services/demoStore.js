/**
 * Demo store — a browser-storage backed mock database.
 *
 * Used ONLY when the app runs in (or falls back to) demo mode. All changes
 * persist to localStorage under `avenqra_demo_db_v1`, are clearly labelled as
 * simulated, and never touch the real backend.
 */
import { createDemoSeed } from './demoData';

const KEY = 'avenqra_demo_db_v1';

let cache = null;
const listeners = new Set();

function readDb() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1 && Array.isArray(parsed.complaints)) {
        cache = parsed;
        return cache;
      }
    }
  } catch {
    /* corrupted store — reseed below */
  }
  cache = createDemoSeed();
  writeDb();
  return cache;
}

function writeDb() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('[AVENQRA demo] Unable to persist demo store:', error.message);
  }
}

function commit() {
  writeDb();
  listeners.forEach((fn) => {
    try {
      fn(cache);
    } catch (err) {
      console.error('[AVENQRA demo] listener error', err);
    }
  });
}

export function subscribeDemoStore(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getDemoDb() {
  return readDb();
}

export function resetDemoStore() {
  cache = createDemoSeed();
  commit();
  return cache;
}

const clone = (obj) => JSON.parse(JSON.stringify(obj));
let seq = 0;
const localId = (prefix) => `${prefix}-demo-local-${Date.now()}-${(seq += 1)}`;

/* ---------------- Complaints ---------------- */

export function listDemoComplaints() {
  return clone(readDb().complaints).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getDemoComplaint(id) {
  const found = readDb().complaints.find((c) => c.id === id || c.ticketNumber === id);
  return found ? clone(found) : null;
}

export function createDemoComplaint({ title, description, category, latitude, longitude, address, imageDataUrl, severity }) {
  const db = readDb();
  const now = new Date().toISOString();
  const priority =
    severity >= 8.5 ? 'CRITICAL' : severity >= 6.5 ? 'HIGH' : severity >= 4 ? 'MEDIUM' : 'LOW';
  const complaint = {
    id: localId('cmp'),
    ticketNumber: `AVN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
    title,
    description,
    category,
    currentStatus: 'SUBMITTED',
    priority,
    isEscalated: false,
    escalatedAt: null,
    departmentId: null,
    department: null,
    citizen: { id: 'demo-citizen', user: { name: 'Demo Citizen', email: 'demo@avenqra.local' } },
    images: imageDataUrl
      ? [{ id: localId('img'), imageUrl: imageDataUrl, imageType: 'INITIAL', uploadedAt: now, isDemoRecord: true }]
      : [],
    location: {
      id: localId('loc'),
      latitude: Number(latitude),
      longitude: Number(longitude),
      addressFormatted: address || 'Manual / captured location',
      isDemoRecord: true,
    },
    aiAnalysis: null, // No real classifier ran — we never fake AI output.
    assignments: [],
    feedback: null,
    statusLogs: [
      {
        id: localId('log'),
        status: 'SUBMITTED',
        remarks: 'Complaint filed (demo mode — stored in this browser only)',
        changedAt: now,
        updatedBy: { name: 'Demo Citizen', role: 'CITIZEN' },
        isDemoRecord: true,
      },
    ],
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    isDemoRecord: true,
  };
  db.complaints.unshift(complaint);
  commit();
  return clone(complaint);
}

export function updateDemoComplaintStatus(id, status, remarks = '', actor = { name: 'Demo Admin', role: 'SUPER_ADMIN' }) {
  const db = readDb();
  const complaint = db.complaints.find((c) => c.id === id);
  if (!complaint) throw new Error('Complaint not found in demo store.');
  const now = new Date().toISOString();
  complaint.currentStatus = status;
  complaint.updatedAt = now;
  if (status === 'ESCALATED') {
    complaint.isEscalated = true;
    complaint.escalatedAt = now;
    complaint.priority = 'CRITICAL';
  }
  if (status === 'RESOLVED') complaint.resolvedAt = now;
  complaint.statusLogs = complaint.statusLogs || [];
  complaint.statusLogs.push({
    id: localId('log'),
    status,
    remarks: remarks || `Status updated to ${status}`,
    changedAt: now,
    updatedBy: actor,
    isDemoRecord: true,
  });
  commit();
  return clone(complaint);
}

export function assignDemoComplaint(complaintId, officerId) {
  const db = readDb();
  const complaint = db.complaints.find((c) => c.id === complaintId);
  const officer = db.officers.find((o) => o.id === officerId);
  if (!complaint) throw new Error('Complaint not found in demo store.');
  if (!officer) throw new Error('Officer not found in demo store.');
  const now = new Date().toISOString();
  complaint.assignments = complaint.assignments || [];
  complaint.assignments.push({
    id: localId('asg'),
    officerId: officer.id,
    assignedAt: now,
    completedAt: null,
    officer: { id: officer.id, badgeNumber: officer.badgeNumber, user: { name: officer.user.name } },
    isDemoRecord: true,
  });
  complaint.currentStatus = 'ASSIGNED';
  complaint.updatedAt = now;
  complaint.departmentId = officer.departmentId;
  complaint.department = officer.department || null;
  complaint.statusLogs = complaint.statusLogs || [];
  complaint.statusLogs.push({
    id: localId('log'),
    status: 'ASSIGNED',
    remarks: `Assigned to Officer Badge #${officer.badgeNumber}`,
    changedAt: now,
    updatedBy: { name: 'Demo Admin', role: 'SUPER_ADMIN' },
    isDemoRecord: true,
  });
  officer._count = officer._count || { assignments: 0 };
  officer._count.assignments += 1;
  commit();
  return clone(complaint);
}

/* ---------------- Departments ---------------- */

export function listDemoDepartments() {
  const db = readDb();
  db.departments.forEach((d) => {
    d._count = {
      officers: db.officers.filter((o) => o.departmentId === d.id).length,
      complaints: db.complaints.filter((c) => c.departmentId === d.id).length,
    };
  });
  return clone(db.departments);
}

export function createDemoDepartment({ name, code, slaHours, description, adminName }) {
  const db = readDb();
  const exists = db.departments.find(
    (d) => d.name.toLowerCase() === name.trim().toLowerCase() || d.code.toUpperCase() === code.trim().toUpperCase()
  );
  if (exists) throw new Error('Department with this name or code already exists.');
  const dept = {
    id: localId('dept'),
    name: name.trim(),
    code: code.trim().toUpperCase(),
    slaHours: Number(slaHours) || 48,
    description: description || '',
    adminName: adminName || '',
    isActive: true,
    createdAt: new Date().toISOString(),
    isDemoRecord: true,
    _count: { officers: 0, complaints: 0 },
  };
  db.departments.push(dept);
  commit();
  return clone(dept);
}

export function updateDemoDepartment(id, patch) {
  const db = readDb();
  const dept = db.departments.find((d) => d.id === id);
  if (!dept) throw new Error('Department not found in demo store.');
  if (patch.name) {
    const dup = db.departments.find((d) => d.id !== id && d.name.toLowerCase() === patch.name.trim().toLowerCase());
    if (dup) throw new Error('Another department already uses this name.');
  }
  Object.assign(dept, {
    name: patch.name ?? dept.name,
    code: patch.code ? patch.code.toUpperCase() : dept.code,
    slaHours: patch.slaHours ? Number(patch.slaHours) : dept.slaHours,
    description: patch.description ?? dept.description,
    adminName: patch.adminName ?? dept.adminName,
  });
  commit();
  return clone(dept);
}

export function deactivateDemoDepartment(id) {
  const db = readDb();
  const idx = db.departments.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error('Department not found in demo store.');
  const [removed] = db.departments.splice(idx, 1);
  commit();
  return clone(removed);
}

/* ---------------- Officers ---------------- */

export function listDemoOfficers() {
  return clone(readDb().officers);
}

export function createDemoOfficer({ name, email, phone, badgeNumber, departmentId }) {
  const db = readDb();
  if (db.officers.some((o) => o.badgeNumber.toUpperCase() === badgeNumber.trim().toUpperCase())) {
    throw new Error('An officer with this badge number already exists.');
  }
  const dept = db.departments.find((d) => d.id === departmentId) || null;
  const officer = {
    id: localId('officer'),
    badgeNumber: badgeNumber.trim(),
    status: 'ACTIVE',
    departmentId: dept?.id || null,
    department: dept ? { id: dept.id, name: dept.name, code: dept.code } : null,
    user: { id: localId('user'), name: name.trim(), email: email.trim(), phone: phone || null, avatarUrl: null },
    _count: { assignments: 0 },
    lastKnownLocation: null,
    isDemoRecord: true,
  };
  db.officers.push(officer);
  commit();
  return clone(officer);
}

export function updateDemoOfficer(id, patch) {
  const db = readDb();
  const officer = db.officers.find((o) => o.id === id);
  if (!officer) throw new Error('Officer not found in demo store.');
  if (patch.status) officer.status = patch.status;
  if (patch.departmentId !== undefined) {
    officer.departmentId = patch.departmentId;
    const dept = db.departments.find((d) => d.id === patch.departmentId);
    officer.department = dept ? { id: dept.id, name: dept.name, code: dept.code } : null;
  }
  if (patch.name) officer.user.name = patch.name;
  if (patch.phone !== undefined) officer.user.phone = patch.phone;
  commit();
  return clone(officer);
}

/* ---------------- Notifications ---------------- */

export function listDemoNotifications() {
  return clone(readDb().notifications).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function markDemoNotificationRead(id) {
  const db = readDb();
  const n = db.notifications.find((x) => x.id === id);
  if (n) {
    n.isRead = true;
    commit();
  }
  return clone(db.notifications);
}