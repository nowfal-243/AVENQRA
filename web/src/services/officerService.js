import api, { unwrap } from './apiClient';
import { isDemoMode } from './mode';
import {
  listDemoOfficers,
  createDemoOfficer,
  updateDemoOfficer,
  listDemoComplaints,
} from './demoStore';

const officerService = {
  async list(params = {}) {
    if (isDemoMode()) {
      let rows = listDemoOfficers();
      if (params.departmentId) rows = rows.filter((o) => o.departmentId === params.departmentId);
      if (params.status) rows = rows.filter((o) => o.status === params.status);
      return { rows, source: 'demo' };
    }
    const res = await api.get('/officers', { params });
    return { rows: unwrap(res) || [], source: 'live' };
  },

  /** Detail includes assignment history with complaint records. */
  async getById(id) {
    if (isDemoMode()) {
      const officer = listDemoOfficers().find((o) => o.id === id);
      if (!officer) throw new Error('Officer not found in the demo store.');
      const complaints = listDemoComplaints();
      officer.assignments = complaints
        .flatMap((c) => (c.assignments || []).filter((a) => a.officerId === id).map((a) => ({ ...a, complaint: c })))
        .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));
      return { row: officer, source: 'demo' };
    }
    const res = await api.get(`/officers/${id}`);
    return { row: unwrap(res), source: 'live' };
  },

  /** Backend requires { name, email, password, badgeNumber, departmentId?, phone? }. */
  async create(payload) {
    if (isDemoMode()) return { row: createDemoOfficer(payload), source: 'demo' };
    const res = await api.post('/officers', payload);
    return { row: unwrap(res), source: 'live' };
  },

  /** Backend supports status + departmentId updates via PATCH /officers/:id/status. */
  async updateStatus(id, payload) {
    if (isDemoMode()) return { row: updateDemoOfficer(id, payload), source: 'demo' };
    const res = await api.patch(`/officers/${id}/status`, payload);
    return { row: unwrap(res), source: 'live' };
  },
};

export default officerService;
