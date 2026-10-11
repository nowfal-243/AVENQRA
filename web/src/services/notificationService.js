import api, { unwrap } from './apiClient';
import { isDemoMode } from './mode';
import { listDemoNotifications, markDemoNotificationRead } from './demoStore';

const notificationService = {
  async list() {
    if (isDemoMode()) return { rows: listDemoNotifications(), source: 'demo' };
    const res = await api.get('/notifications');
    return { rows: unwrap(res) || [], source: 'live' };
  },

  async markRead(id) {
    if (isDemoMode()) return { rows: markDemoNotificationRead(id), source: 'demo' };
    const res = await api.patch(`/notifications/${id}/read`);
    return { rows: unwrap(res), source: 'live' };
  },
};

export default notificationService;
