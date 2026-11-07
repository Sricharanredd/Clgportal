/**
 * Application shell: collapsible grouped sidebar + sticky topbar + content.
 * Mobile gets a slide-over drawer; navigation is filtered by real permissions.
 */
<<<<<<< HEAD
import { useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarCheck2,
  ClipboardList,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '@/app/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  anyOf?: string[];
  /** Student Info sections are held in the ?tab= query string. */
  tab?: string;
  /** Keep the currently selected student when switching Student Info tabs. */
  preserveStudent?: boolean;
}

const VISITOR_NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  {
    to: '/student-info',
    label: 'Student Info',
    icon: <IdCard className="h-5 w-5" />,
    tab: 'overview',
  },
];

const STAFF_NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  {
    to: '/student-info',
    label: 'Student Info',
    icon: <IdCard className="h-5 w-5" />,
    tab: 'overview',
  },
  { to: '/students', label: 'Students', icon: <GraduationCap className="h-5 w-5" />, anyOf: ['students:read'] },
  { to: '/attendance', label: 'Attendance', icon: <CalendarCheck2 className="h-5 w-5" />, anyOf: ['attendance:read', 'attendance:correct'] },
  { to: '/results', label: 'Results', icon: <ClipboardList className="h-5 w-5" />, anyOf: ['results:read', 'results:write', 'results:publish'] },
  { to: '/fees', label: 'Fees', icon: <Wallet className="h-5 w-5" />, anyOf: ['fees:read'] },
  { to: '/announcements', label: 'Announcements', icon: <Megaphone className="h-5 w-5" />, anyOf: ['announcements:read'] },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { hasAny, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') ?? 'overview';
  const selectedStudent = searchParams.get('student');

  // Parents/students get the dedicated portal menu; staff keep the existing
  // permission-filtered tools.
  const items = user
    ? STAFF_NAV_ITEMS.filter((item) => !item.anyOf || hasAny(...item.anyOf))
    : VISITOR_NAV_ITEMS;

  const itemTo = (item: NavItem): string => {
    if (!item.tab) return item.to;
    const params = new URLSearchParams();
    if (item.preserveStudent && selectedStudent) params.set('student', selectedStudent);
    params.set('tab', item.tab);
    return `/student-info?${params.toString()}`;
  };

  const isActive = (item: NavItem): boolean => {
    if (location.pathname === '/student-info') {
      return item.tab !== undefined && item.tab === currentTab;
    }
    const basePath = item.to.split('?')[0];
    return location.pathname === basePath || location.pathname.startsWith(`${basePath}/`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <p className="text-lg font-bold leading-tight text-plum">Prism College</p>
        <p className="text-xs text-muted">Intermediate Management Portal</p>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Primary">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.label}
              to={itemTo(item)}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? 'nav-active' : 'text-plum hover:bg-white/60'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/60 p-4">
        <div className="mb-3 flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-forest to-leaf text-sm font-semibold text-white"
            aria-hidden
          >
            {user?.full_name?.charAt(0) ?? 'V'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-plum">{user?.full_name ?? 'Visitor'}</p>
            <p className="truncate text-xs text-muted">{user ? user.roles.join(' · ') : 'Parent / Student'}</p>
          </div>
        </div>
        {user ? (
          <button type="button" className="btn-ghost w-full justify-start" onClick={() => void handleLogout()}>
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        ) : null}
      </div>
    </div>
  );
}
=======
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Sidebar } from '@/components/app/Sidebar';
import { Topbar } from '@/components/app/Topbar';
import { CommandPalette } from '@/components/app/CommandPalette';

const COLLAPSE_KEY = 'prism.sidebar.collapsed';
>>>>>>> origin/main

export default function AppLayout(): JSX.Element {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* storage may be unavailable in private mode — collapse still works */
      }
      return next;
    });
  }, []);

  // ⌘K / Ctrl+K opens the command palette from anywhere in the shell.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock scroll + allow Escape while the drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  const sidebarWidth = collapsed ? '4.75rem' : '16.5rem';
  const shellStyle = { '--sidebar-width': sidebarWidth } as CSSProperties;

  return (
    <div className="min-h-screen" style={shellStyle}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110] focus:rounded-control focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden border-r border-line bg-surface transition-[width] duration-200 ease-out lg:block"
        style={{ width: 'var(--sidebar-width)' }}
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade-in"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <div className="animate-fade-in absolute inset-y-0 left-0 w-[17.5rem] border-r border-line bg-surface shadow-lift">
            <button
              type="button"
              className="absolute right-2.5 top-4 z-10 rounded-control p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar
              collapsed={false}
              onToggleCollapsed={() => undefined}
              onNavigate={() => setMobileOpen(false)}
              showCollapseToggle={false}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[var(--sidebar-width)]">
        <Topbar onOpenMenu={() => setMobileOpen(true)} onOpenSearch={() => setSearchOpen(true)} />

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 outline-none sm:px-5 lg:px-7 lg:py-7"
        >
          <div key={location.pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </main>

        <footer className="mx-auto w-full max-w-[1440px] px-4 pb-6 text-[11.5px] text-muted sm:px-5 lg:px-7">
          Prism College Portal · Demo environment
        </footer>
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
