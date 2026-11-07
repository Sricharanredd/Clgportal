/**
 * ═══════════════════════════════════════════════════════════════════════
 *  LANDING PAGE CONTENT — the single config file for the home page.
 *
 *  Every headline, label, stat, link and contact detail rendered on "/"
 *  is defined here. Edit this file to rebrand the copy, the demo numbers,
 *  the audience/feature cards and the footer details.
 *
 *  Brand COLORS are defined separately, in ONE place:
 *      src/index.css → :root → "BRAND TOKENS" block
 *  (tailwind.config.js only maps those variables to class names.)
 * ═══════════════════════════════════════════════════════════════════════
 */
import {
  CalendarCheck2,
  ChartColumn,
  ChartLine,
  Eye,
  IndianRupee,
  Lock,
  Presentation,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { DEMO_OPEN_PARENT } from '@/config/demo';

/** Existing application routes — must match src/app/App.tsx (do not change).
 *  Both flag states land on /parent: demo mode shows the portal overview,
 *  the verified flow shows the lookup screen. */
export const routes = {
  staffLogin: '/admin/login',
  parentPortal: '/parent',
} as const;

/** College identity — shown in navbar, hero and footer. */
export const college = {
  name: 'Prism College',
  address: '5-4-21, Gandhi Nagar, Hyderabad, Telangana 500032',
  phone: '+91 98490 12345',
  email: 'office@prismcollege.edu.in',
} as const;

/** Sticky navbar: anchor links + primary actions. */
export const nav = {
  links: [
    { label: 'Features', href: '#features' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ],
  staffLabel: 'Staff Login',
  parentLabel: 'Parent Portal',
};

/** Hero copy. The headline is split so the middle phrase can be gradient-highlighted. */
export const hero = {
  eyebrow: 'Built for intermediate colleges in Telangana',
  headlineLead: 'One portal for ',
  headlineAccent: 'every part of campus life',
  headlineTail: '.',
  subheading:
    'Prism College brings attendance, examinations, fees and parent updates into one secure system — so staff spend less time on registers and more time with students.',
  staffCta: 'Staff Login',
  parentCta: 'Parent Portal',
  reassurance: 'No installation needed — runs in any modern browser, on any device.',
};

/** Animated count-up figures for the stats strip (demo values). */
export const stats = [
  { label: 'Students', value: 1240, suffix: '+' },
  { label: 'Faculty', value: 86, suffix: '' },
  { label: 'Attendance Tracked', value: 48500, suffix: '+' },
  { label: 'Results Published', value: 9200, suffix: '+' },
];

/** The two audiences the portal serves — each card links to its own route. */
export type Audience = {
  id: 'staff' | 'parent';
  accent: 'brand' | 'accent';
  icon: LucideIcon;
  title: string;
  description: string;
  bullets: string[];
  cta: string;
  to: string;
};

export const audiences: Audience[] = [
  {
    id: 'staff',
    accent: 'brand',
    icon: Presentation,
    title: 'For Staff',
    description:
      'Principal, administrator, accounts and faculty — each signs in with exactly the access their role needs.',
    bullets: [
      'Mark daily attendance and correct registers in seconds',
      'Create examinations and publish verified results',
      'Track fee collection, dues and pending payments',
    ],
    cta: 'Open staff login',
    to: routes.staffLogin,
  },
  {
    id: 'parent',
    accent: 'accent',
    icon: UserRound,
    title: 'For Parents',
    description:
      'Look up your child’s record in seconds — always the college-verified version, never editable from outside.',
    bullets: [
      'View attendance and published results for your child',
      'Check fee status and pending dues at a glance',
      DEMO_OPEN_PARENT
        ? 'Demo mode: parent records are read-only'
        : 'Read-only records, shown only after college verification',
    ],
    cta: 'Open parent portal',
    to: routes.parentPortal,
  },
];

/** Six feature cards. */
export type Feature = { icon: LucideIcon; title: string; description: string };

export const features: Feature[] = [
  {
    icon: CalendarCheck2,
    title: 'Attendance',
    description: 'Period-wise daily marking with instant registers and low-attendance flags.',
  },
  {
    icon: ChartLine,
    title: 'Examinations and Results',
    description: 'Create exams, enter marks once, publish results with a full audit trail.',
  },
  {
    icon: IndianRupee,
    title: 'Fee Management',
    description: 'Record collections, concessions and outstanding dues for every student.',
  },
  {
    icon: Eye,
    title: 'Parent Visibility',
    description: 'Parents see verified attendance, results and fees — and nothing they should not.',
  },
  {
    icon: Lock,
    title: 'Role-based Access',
    description: 'Principal, administrator, accounts and faculty each work inside their own scope.',
  },
  {
    icon: ChartColumn,
    title: 'Reports',
    description: 'Class and student reports ready to filter, review and print on demand.',
  },
];

/** "How it works" — three steps. */
export type Step = { n: number; title: string; description: string };

export const steps: Step[] = [
  {
    n: 1,
    title: 'College verifies',
    description:
      'The college confirms student, class and subject records once, so every number downstream is trustworthy.',
  },
  {
    n: 2,
    title: 'Staff update records',
    description:
      'Faculty mark attendance, admin creates examinations and accounts record fees — each within their own role.',
  },
  {
    n: 3,
    title: 'Parents view securely',
    description:
      'Parents open the portal and see verified attendance, published results and fee status — read-only, always current.',
  },
];

/** Trust & security note under the steps. */
export const trust = {
  text: DEMO_OPEN_PARENT
    ? 'Demo mode: parent records are read-only.'
    : 'Parent records are read-only and shown only after college verification.',
};

/** Dashboard preview mockup shown in the hero (all decorative copy lives here). */
export const heroPreview = {
  title: 'Class II-A · Overview',
  attendance: {
    percent: 92,
    label: 'Attendance this term',
    detail: '108 of 118 days present',
  },
  results: {
    label: 'Latest results',
    rows: [
      { subject: 'Mathematics', mark: '88', grade: 'A' },
      { subject: 'Physics', mark: '81', grade: 'A' },
      { subject: 'Chemistry', mark: '76', grade: 'B+' },
    ],
  },
  fee: {
    label: 'Fee status',
    value: 'Paid for Term 2',
  },
  floatChip: 'Results published',
};

/** Footer quick links — internal routes use `to`, in-page anchors use `href`. */
export type FooterQuickLink =
  | { label: string; to: string }
  | { label: string; href: string };

/** Footer: quick links + copyright. Contact details come from `college`. */
export const footer = {
  blurb:
    'One secure portal for academics, attendance, examinations and fees — with parents kept genuinely in the loop.',
  quickLinks: [
    { label: 'Staff Login', to: routes.staffLogin },
    { label: 'Parent Portal', to: routes.parentPortal },
    { label: 'Features', href: '#features' },
    { label: 'Contact', href: '#contact' },
  ] as FooterQuickLink[],
  copyright: `© ${new Date().getFullYear()} ${college.name}. All rights reserved.`,
};
