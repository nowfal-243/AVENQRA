/**
 * In-memory demo dataset used when PostgreSQL is unreachable.
 * Lets /auth/login and /assistant/ask work offline with realistic data,
 * so the AI assistant always returns a proper backend response.
 */

const now = Date.now();
const hoursAgo = (h) => new Date(now - h * 3600 * 1000).toISOString();
const minsAgo = (m) => new Date(now - m * 60 * 1000).toISOString();

const DEMO_COMPLAINTS = [
  {
    id: 'demo-c1', ticketNumber: 'AVN-2026-4561', citizenId: 'demo-cit-1',
    departmentId: 'dept-road', title: 'Large pothole on MG Road',
    description: 'Deep pothole near bus stop causing accidents',
    category: 'Road', currentStatus: 'SUBMITTED', priority: 'HIGH',
    isEscalated: false, createdAt: minsAgo(12), updatedAt: minsAgo(12),
    department: { id: 'dept-road', name: 'Roads & Transport', code: 'ROAD' },
    location: { latitude: 11.2588, longitude: 75.7804, addressFormatted: 'MG Road, Kozhikode' },
    assignments: [], statusLogs: [],
  },
  {
    id: 'demo-c2', ticketNumber: 'AVN-2026-890003', citizenId: 'demo-cit-2',
    departmentId: 'dept-road', title: 'Damaged public bench at park',
    description: 'Vandalised bench, sharp edges dangerous for kids',
    category: 'Road', currentStatus: 'ESCALATED', priority: 'CRITICAL',
    isEscalated: true, createdAt: hoursAgo(3), updatedAt: hoursAgo(1),
    department: { id: 'dept-road', name: 'Roads & Transport', code: 'ROAD' },
    location: { latitude: 11.26, longitude: 75.781, addressFormatted: 'Mananchira Park' },
    assignments: [], statusLogs: [],
  },
  {
    id: 'demo-c3', ticketNumber: 'AVN-2026-4510', citizenId: 'demo-cit-1',
    departmentId: 'dept-waste', title: 'Garbage not collected for 3 days',
    description: 'Overflowing bins on SM Street',
    category: 'Waste', currentStatus: 'IN_PROGRESS', priority: 'MEDIUM',
    isEscalated: false, createdAt: hoursAgo(5), updatedAt: hoursAgo(2),
    department: { id: 'dept-waste', name: 'Waste Management', code: 'WASTE' },
    location: { latitude: 11.257, longitude: 75.779, addressFormatted: 'SM Street' },
    assignments: [], statusLogs: [],
  },
  {
    id: 'demo-c4', ticketNumber: 'AVN-2026-890002', citizenId: 'demo-cit-3',
    departmentId: 'dept-elec', title: 'Fallen tree blocking footpath',
    description: 'Tree fell after rain, cleared by crew',
    category: 'Electrical', currentStatus: 'RESOLVED', priority: 'MEDIUM',
    isEscalated: false, createdAt: hoursAgo(26), updatedAt: hoursAgo(20),
    department: { id: 'dept-elec', name: 'Electrical', code: 'ELEC' },
    location: null, assignments: [], statusLogs: [],
  },
  {
    id: 'demo-c5', ticketNumber: 'AVN-2026-890012', citizenId: 'demo-cit-2',
    departmentId: 'dept-elec', title: 'Streetlight not working',
    description: 'Whole lane dark for 2 nights',
    category: 'Electrical', currentStatus: 'RESOLVED', priority: 'LOW',
    isEscalated: false, createdAt: hoursAgo(30), updatedAt: hoursAgo(25),
    department: { id: 'dept-elec', name: 'Electrical', code: 'ELEC' },
    location: null, assignments: [], statusLogs: [],
  },
  {
    id: 'demo-c6', ticketNumber: 'AVN-2026-4520', citizenId: 'demo-cit-3',
    departmentId: 'dept-drain', title: 'Blocked drain causing flooding',
    description: 'Water logging after short rain',
    category: 'Drainage', currentStatus: 'ASSIGNED', priority: 'HIGH',
    isEscalated: false, createdAt: minsAgo(50), updatedAt: minsAgo(40),
    department: { id: 'dept-drain', name: 'Drainage', code: 'DRAIN' },
    location: null, assignments: [], statusLogs: [],
  },
];

function getDemoComplaints() {
  return DEMO_COMPLAINTS.map((c) => ({ ...c }));
}

function getDemoComplaintById(id) {
  const found = DEMO_COMPLAINTS.find((c) => c.id === id || c.ticketNumber === id);
  return found ? { ...found } : null;
}

function createDemoComplaint(data) {
  const ticketNumber = `AVN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const newRow = {
    id: `demo-c-${Date.now()}`,
    ticketNumber,
    citizenId: data.citizenId || 'demo-cit-1',
    departmentId: data.departmentId || 'dept-road',
    title: data.title,
    description: data.description,
    category: data.category,
    currentStatus: data.currentStatus || 'SUBMITTED',
    priority: data.priority || 'MEDIUM',
    isEscalated: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    department: data.department || { id: 'dept-road', name: 'Roads & Transport', code: 'ROAD' },
    location: data.location || { latitude: data.latitude || 11.2588, longitude: data.longitude || 75.7804, addressFormatted: data.address || 'Reported Location' },
    assignments: [],
    statusLogs: [{
      id: `log-${Date.now()}`,
      status: data.currentStatus || 'SUBMITTED',
      remarks: 'Complaint filed in demo mode',
      changedAt: new Date().toISOString(),
      updatedBy: { name: 'Citizen Reporter', role: 'CITIZEN' },
    }],
  };
  DEMO_COMPLAINTS.unshift(newRow);
  return newRow;
}

function updateDemoComplaint(id, updates) {
  const idx = DEMO_COMPLAINTS.findIndex((c) => c.id === id || c.ticketNumber === id);
  if (idx === -1) return null;
  DEMO_COMPLAINTS[idx] = {
    ...DEMO_COMPLAINTS[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return { ...DEMO_COMPLAINTS[idx] };
}

const DEMO_NOTIFICATIONS = [
  {
    id: 'demo-notif-1',
    userId: 'admin-demo-uuid-101',
    title: '🚨 CRITICAL SLA BREACH: Ticket #AVN-2026-890003',
    message: 'Ticket #AVN-2026-890003 (Road) exceeded the 30-minute SLA and was escalated to Super Admin.',
    isRead: false,
    createdAt: minsAgo(45),
  },
  {
    id: 'demo-notif-2',
    userId: 'officer-demo-uuid-202',
    title: 'New Assignment #AVN-2026-4520',
    message: 'You have been dispatched to Ticket #AVN-2026-4520: Blocked drain causing flooding',
    isRead: false,
    createdAt: minsAgo(40),
  },
];

function getDemoNotifications(userId) {
  if (!userId) return [...DEMO_NOTIFICATIONS];
  return DEMO_NOTIFICATIONS.filter((n) => n.userId === userId || n.userId === 'admin-demo-uuid-101');
}

function addDemoNotification(data) {
  const notif = {
    id: `demo-notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: data.userId || 'admin-demo-uuid-101',
    title: data.title,
    message: data.message,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  DEMO_NOTIFICATIONS.unshift(notif);
  return notif;
}

function markDemoNotificationRead(id, userId) {
  const item = DEMO_NOTIFICATIONS.find((n) => n.id === id && (!userId || n.userId === userId));
  if (item) item.isRead = true;
  return item;
}

const DEMO_DEPARTMENTS = [
  { id: 'dept-road', name: 'Roads & Transport', code: 'ROAD', slaHours: 48, _count: { officers: 2, complaints: 4 } },
  { id: 'dept-waste', name: 'Waste Management', code: 'WASTE', slaHours: 24, _count: { officers: 2, complaints: 3 } },
  { id: 'dept-elec', name: 'Electrical & Power', code: 'ELEC', slaHours: 24, _count: { officers: 2, complaints: 2 } },
  { id: 'dept-water', name: 'Water Supply & Drainage', code: 'WATER', slaHours: 12, _count: { officers: 2, complaints: 2 } },
  { id: 'dept-health', name: 'Public Health & Sanitation', code: 'HEALTH', slaHours: 24, _count: { officers: 1, complaints: 1 } },
];

function getDemoDepartments() {
  return [...DEMO_DEPARTMENTS];
}

const DEMO_OFFICERS = [
  {
    id: 'officer-demo-uuid-202',
    badgeNumber: 'BDG-101',
    departmentId: 'dept-road',
    status: 'ACTIVE',
    user: { id: 'usr-202', name: 'Rajesh Kumar', email: 'rajesh.officer@avenqra.com', phone: '+91 98765 43210' },
    department: { id: 'dept-road', name: 'Roads & Transport', code: 'ROAD' },
    _count: { assignments: 3 },
  },
  {
    id: 'officer-demo-uuid-203',
    badgeNumber: 'BDG-102',
    departmentId: 'dept-waste',
    status: 'ACTIVE',
    user: { id: 'usr-203', name: 'Ananya Sharma', email: 'ananya.officer@avenqra.com', phone: '+91 98765 43211' },
    department: { id: 'dept-waste', name: 'Waste Management', code: 'WASTE' },
    _count: { assignments: 2 },
  },
  {
    id: 'officer-demo-uuid-204',
    badgeNumber: 'BDG-103',
    departmentId: 'dept-water',
    status: 'ACTIVE',
    user: { id: 'usr-204', name: 'Vikram Singh', email: 'vikram.officer@avenqra.com', phone: '+91 98765 43212' },
    department: { id: 'dept-water', name: 'Water Supply & Drainage', code: 'WATER' },
    _count: { assignments: 1 },
  },
  {
    id: 'officer-demo-uuid-205',
    badgeNumber: 'BDG-104',
    departmentId: 'dept-elec',
    status: 'ACTIVE',
    user: { id: 'usr-205', name: 'Priya Nair', email: 'priya.officer@avenqra.com', phone: '+91 98765 43213' },
    department: { id: 'dept-elec', name: 'Electrical & Power', code: 'ELEC' },
    _count: { assignments: 2 },
  },
];

function getDemoOfficers(filter = {}) {
  let list = [...DEMO_OFFICERS];
  if (filter.departmentId) list = list.filter((o) => o.departmentId === filter.departmentId);
  if (filter.status) list = list.filter((o) => o.status === filter.status);
  return list;
}

module.exports = {
  DEMO_COMPLAINTS,
  getDemoComplaints,
  getDemoComplaintById,
  createDemoComplaint,
  updateDemoComplaint,
  DEMO_NOTIFICATIONS,
  getDemoNotifications,
  addDemoNotification,
  markDemoNotificationRead,
  DEMO_DEPARTMENTS,
  getDemoDepartments,
  DEMO_OFFICERS,
  getDemoOfficers,
};

