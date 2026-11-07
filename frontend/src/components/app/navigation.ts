/** Navigation model for the staff shell (permission-filtered at render). */
import type { LucideIcon } from 'lucide-react';
import {
  CalendarCheck2,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Wallet,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  anyOf?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        description: 'Today at a glance',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: 'Academics',
    items: [
      {
        to: '/students',
        label: 'Students',
        description: 'Directory and profiles',
        icon: GraduationCap,
        anyOf: ['students:read'],
      },
      {
        to: '/attendance',
        label: 'Attendance',
        description: 'Mark and review sessions',
        icon: CalendarCheck2,
        anyOf: ['attendance:read', 'attendance:correct'],
      },
      {
        to: '/results',
        label: 'Results',
        description: 'Exams, marks and publishing',
        icon: ClipboardList,
        anyOf: ['results:read', 'results:write', 'results:publish'],
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        to: '/fees',
        label: 'Fees',
        description: 'Collections and receipts',
        icon: Wallet,
        anyOf: ['fees:read'],
      },
      {
        to: '/announcements',
        label: 'Announcements',
        description: 'Notices for staff and parents',
        icon: Megaphone,
        anyOf: ['announcements:read'],
      },
    ],
  },
];

/** Flat list of pages for the command palette. */
export const PAGES: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  students: 'Students',
  attendance: 'Attendance',
  results: 'Results',
  fees: 'Fees',
  announcements: 'Announcements',
  profile: 'Profile',
};
