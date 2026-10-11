/**
 * AVENQRA shared constants — centralized configuration for categories,
 * complaint statuses, priorities and roles.
 *
 * The 15 civic issue categories below are the single source of truth for the
 * whole portal. Their labels are intentionally phrased so the backend's
 * keyword-based department routing (see backend/src/controllers/
 * complaint.controller.js) resolves them to the sensible municipal department.
 */

export const CATEGORIES = [
  { id: 'pothole', label: 'Pothole', deptCode: 'ROAD' },
  { id: 'damaged-road', label: 'Damaged Road', deptCode: 'ROAD' },
  { id: 'waste-accumulation', label: 'Waste Accumulation', deptCode: 'WASTE' },
  { id: 'drainage-blockage', label: 'Drainage Blockage', deptCode: 'DRAIN' },
  { id: 'water-leakage', label: 'Water Leakage', deptCode: 'WATER' },
  { id: 'streetlight-failure', label: 'Streetlight Electrical Failure', deptCode: 'ELEC' },
  { id: 'overflowing-bin', label: 'Overflowing Waste Bin', deptCode: 'WASTE' },
  { id: 'sewage-overflow', label: 'Sewage Overflow', deptCode: 'WATER' },
  { id: 'damaged-footpath', label: 'Damaged Footpath', deptCode: 'ROAD' },
  { id: 'traffic-signal-failure', label: 'Traffic Signal Failure (Electrical)', deptCode: 'ELEC' },
  { id: 'illegal-dumping', label: 'Illegal Waste Dumping', deptCode: 'WASTE' },
  { id: 'water-supply', label: 'Water Supply Interruption', deptCode: 'WATER' },
  { id: 'public-property', label: 'Public Property Damage', deptCode: 'ROAD' },
  { id: 'fallen-tree', label: 'Fallen Tree', deptCode: 'ROAD' },
  { id: 'other', label: 'Other Civic Issue', deptCode: 'ROAD' },
];

export const CATEGORY_LABELS = CATEGORIES.map((c) => c.label);

/** Department codes used by the backend routing. */
export const DEPARTMENT_CODES = {
  ROAD: { name: 'Roads & Infrastructure', icon: 'Route' },
  WASTE: { name: 'Waste Management', icon: 'Trash2' },
  WATER: { name: 'Water Supply', icon: 'Droplets' },
  ELEC: { name: 'Electrical', icon: 'Lightbulb' },
  DRAIN: { name: 'Drainage', icon: 'Waves' },
};

export const STATUSES = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'REJECTED'];

export const STATUS_META = {
  SUBMITTED: { label: 'Submitted', dot: 'bg-amber-500', classes: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300' },
  ASSIGNED: { label: 'Assigned', dot: 'bg-sky-500', classes: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300' },
  IN_PROGRESS: { label: 'In Progress', dot: 'bg-blue-500', classes: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300' },
  ESCALATED: { label: 'Escalated', dot: 'bg-rose-500', classes: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300' },
  RESOLVED: { label: 'Resolved', dot: 'bg-emerald-500', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' },
  REJECTED: { label: 'Rejected', dot: 'bg-slate-400', classes: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/40 dark:bg-slate-500/10 dark:text-slate-300' },
};

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const PRIORITY_META = {
  LOW: { label: 'Low', classes: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/40 dark:bg-slate-500/10 dark:text-slate-300', bar: 'bg-slate-400' },
  MEDIUM: { label: 'Medium', classes: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300', bar: 'bg-sky-500' },
  HIGH: { label: 'High', classes: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300', bar: 'bg-orange-500' },
  CRITICAL: { label: 'Critical', classes: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300', bar: 'bg-rose-500' },
};

export const OFFICER_STATUSES = ['ACTIVE', 'BUSY', 'ON_LEAVE'];

export const OFFICER_STATUS_META = {
  ACTIVE: { label: 'Active', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' },
  BUSY: { label: 'Busy', classes: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300' },
  ON_LEAVE: { label: 'On Leave', classes: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/40 dark:bg-slate-500/10 dark:text-slate-300' },
};

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  DEPARTMENT_ADMIN: 'DEPARTMENT_ADMIN',
  OFFICER: 'OFFICER',
  CITIZEN: 'CITIZEN',
};

export const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  DEPARTMENT_ADMIN: 'Department Admin',
  OFFICER: 'Field Officer',
  CITIZEN: 'Citizen',
};

/** Default SLA policy (minutes). The server-side escalation worker enforces
 *  this independently — the browser countdown is display-only. */
export const DEFAULT_SLA_MINUTES = 30;

export const STATUS_FLOW = {
  SUBMITTED: ['ASSIGNED', 'ESCALATED', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS', 'ESCALATED', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'ESCALATED', 'REJECTED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  RESOLVED: ['IN_PROGRESS'],
  REJECTED: ['SUBMITTED'],
};

export const KANBAN_COLUMNS = [
  { id: 'newlyAssigned', title: 'Newly Assigned', statuses: ['SUBMITTED', 'ASSIGNED'], accent: 'bg-cyan-500' },
  { id: 'pending', title: 'Pending / Escalated', statuses: ['IN_PROGRESS', 'ESCALATED'], accent: 'bg-amber-500' },
  { id: 'completed', title: 'Completed', statuses: ['RESOLVED', 'REJECTED'], accent: 'bg-emerald-500' },
];

/**
 * Mirrors the backend keyword routing exactly so the UI never promises a
 * department the API would not actually pick.
 */
export function recommendDeptCode(category = '') {
  const cat = String(category).toLowerCase();
  if (cat.includes('waste') || cat.includes('garbage')) return 'WASTE';
  if (cat.includes('water') || cat.includes('sewage')) return 'WATER';
  if (cat.includes('light') || cat.includes('electrical')) return 'ELEC';
  if (cat.includes('drain') || cat.includes('flood')) return 'DRAIN';
  return 'ROAD';
}
