import api, { unwrap } from './apiClient';
import { isDemoMode } from './mode';
import {
  listDemoDepartments,
  createDemoDepartment,
  updateDemoDepartment,
  deactivateDemoDepartment,
} from './demoStore';

const departmentService = {
  async list() {
    if (isDemoMode()) return { rows: listDemoDepartments(), source: 'demo' };
    const res = await api.get('/departments');
    return { rows: unwrap(res) || [], source: 'live' };
  },

  async getById(id) {
    if (isDemoMode()) {
      const dept = listDemoDepartments().find((d) => d.id === id);
      if (!dept) throw new Error('Department not found in the demo store.');
      return { row: dept, source: 'demo' };
    }
    const res = await api.get(`/departments/${id}`);
    return { row: unwrap(res), source: 'live' };
  },

  /** Backend accepts { name, code, slaHours } only. */
  async create(payload) {
    if (isDemoMode()) return { row: createDemoDepartment(payload), source: 'demo' };
    const res = await api.post('/departments', {
      name: payload.name,
      code: payload.code,
      slaHours: payload.slaHours,
    });
    return { row: unwrap(res), source: 'live' };
  },

  async update(id, payload) {
    if (isDemoMode()) return { row: updateDemoDepartment(id, payload), source: 'demo' };
    const res = await api.put(`/departments/${id}`, {
      name: payload.name,
      code: payload.code,
      slaHours: payload.slaHours,
    });
    return { row: unwrap(res), source: 'live' };
  },

  /**
   * The backend exposes hard DELETE only (no soft-deactivate endpoint).
   * The UI labels this destructive action accordingly.
   */
  async deactivate(id) {
    if (isDemoMode()) return { row: deactivateDemoDepartment(id), source: 'demo' };
    const res = await api.delete(`/departments/${id}`);
    return { row: unwrap(res), source: 'live' };
  },
};

export default departmentService;
