import {
  LayoutDashboard,
  ListChecks,
  Camera,
  Building2,
  HardHat,
  Map,
  BarChart3,
  Settings,
} from 'lucide-react';

/**
 * Central navigation manifest — consumed by the sidebar, header search and
 * route guards so they can never drift apart.
 * `roles` null = visible to every signed-in portal role.
 */
export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Overview Dashboard',
    shortLabel: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: null,
  },
  {
    id: 'complaints',
    label: 'Complaints Triage',
    shortLabel: 'Triage',
    path: '/complaints',
    icon: ListChecks,
    roles: null,
  },
  {
    id: 'reporter',
    label: 'Live Camera Reporter',
    shortLabel: 'Reporter',
    path: '/reporter',
    icon: Camera,
    roles: null,
    badge: 'Live',
  },
  {
    id: 'departments',
    label: 'Departments',
    shortLabel: 'Departments',
    path: '/departments',
    icon: Building2,
    roles: ['SUPER_ADMIN', 'DEPARTMENT_ADMIN'],
  },
  {
    id: 'officers',
    label: 'Field Officers',
    shortLabel: 'Officers',
    path: '/officers',
    icon: HardHat,
    roles: null,
  },
  {
    id: 'map',
    label: 'Live Issue Map',
    shortLabel: 'Map',
    path: '/map',
    icon: Map,
    roles: null,
  },
  {
    id: 'analytics',
    label: 'Analytics & Reports',
    shortLabel: 'Analytics',
    path: '/analytics',
    icon: BarChart3,
    roles: null,
  },
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Settings',
    path: '/settings',
    icon: Settings,
    roles: null,
  },
];

export function visibleNavItems(user) {
  if (!user) return [];
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));
}
