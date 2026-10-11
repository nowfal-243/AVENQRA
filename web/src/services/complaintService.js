/**
 * Complaint service — real API calls when live, browser-store mutations when
 * in demo mode. Presentation components never call the API directly.
 */
import api, { unwrap } from './apiClient';
import { isDemoMode } from './mode';
import {
  listDemoComplaints,
  getDemoComplaint,
  createDemoComplaint,
  updateDemoComplaintStatus,
  assignDemoComplaint,
} from './demoStore';
import { KANBAN_COLUMNS } from '../utils/constants';

function groupKanban(complaints) {
  const buckets = {};
  KANBAN_COLUMNS.forEach((col) => {
    buckets[col.id] = complaints.filter((c) => col.statuses.includes(c.currentStatus));
  });
  return buckets;
}

const complaintService = {
  /** List complaints (admin/officer endpoint). Server supports status/category query params. */
  async list(params = {}) {
    if (isDemoMode()) {
      let rows = listDemoComplaints();
      if (params.status) rows = rows.filter((c) => c.currentStatus === params.status);
      if (params.category) rows = rows.filter((c) => c.category === params.category);
      return { rows, source: 'demo' };
    }
    const res = await api.get('/complaints', { params });
    return { rows: unwrap(res) || [], source: 'live' };
  },

  /** 3-column kanban buckets. */
  async kanban() {
    if (isDemoMode()) {
      const rows = listDemoComplaints();
      return { ...groupKanban(rows), source: 'demo' };
    }
    const res = await api.get('/complaints/kanban');
    const data = unwrap(res) || {};
    return { ...data, source: 'live' };
  },

  /** Full complaint detail incl. status logs, assignments, images. */
  async get(id) {
    if (isDemoMode()) {
      const row = getDemoComplaint(id);
      if (!row) throw new Error('Complaint not found in the demo store.');
      return { row, source: 'demo' };
    }
    const res = await api.get(`/complaints/${id}`);
    return { row: unwrap(res), source: 'live' };
  },

  /** Submit a new complaint (multipart: title, description, category, lat, lng, address, media). */
  async create(payload) {
    if (isDemoMode()) {
      return {
        row: createDemoComplaint(payload),
        source: 'demo',
        note: 'Demo mode: stored in this browser only. Nothing was sent to a server.',
      };
    }
    const form = new FormData();
    form.append('title', payload.title);
    form.append('description', payload.description);
    form.append('category', payload.category);
    form.append('latitude', String(payload.latitude));
    form.append('longitude', String(payload.longitude));
    if (payload.address) form.append('address', payload.address);
    if (payload.imageBlob) form.append('media', payload.imageBlob, 'capture.jpg');
    const res = await api.post('/complaints', form, { timeout: 30000 });
    return { row: unwrap(res), source: 'live' };
  },

  /** Status transition with optional remarks (server writes the audit log). */
  async updateStatus(id, status, remarks) {
    if (isDemoMode()) {
      return { row: updateDemoComplaintStatus(id, status, remarks), source: 'demo' };
    }
    const res = await api.patch(`/complaints/${id}/status`, { status, remarks });
    return { row: unwrap(res), source: 'live' };
  },

  /** Dispatch/reassign a field officer. */
  async assign(complaintId, officerId) {
    if (isDemoMode()) {
      return { row: assignDemoComplaint(complaintId, officerId), source: 'demo' };
    }
    const res = await api.post('/assignments', { complaintId, officerId });
    return { row: unwrap(res), source: 'live' };
  },
};

export default complaintService;
