/**
 * Prism Glass application shell: frosted sidebar + topbar around page content.
 * Navigation items are filtered by the user's REAL permissions (server is the
 * authority — this only shapes UX).
 */
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CalendarCheck2,
  ClipboardList,
  GraduationCap,
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
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: '/students', label: 'Students', icon: <GraduationCap className="h-5 w-5" />, anyOf: ['students:read'] },
  { to: '/attendance', label: 'Attendance', icon: <CalendarCheck2 className="h-5 w-5" />, anyOf: ['attendance:read', 'attendance:correct'] },
  { to: '/results', label: 'Results', icon: <ClipboardList className="h-5 w-5" />, anyOf: ['results:read', 'results:write', 'results:publish'] },
  { to: '/fees', label: 'Fees', icon: <Wallet className="h-5 w-5" />, anyOf: ['fees:read'] },
  { to: '/announcements', label: 'Announcements', icon: <Megaphone className="h-5 w-5" />, anyOf: ['announcements:read'] },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { hasAny, user, logout } = useAuth();
  const navigate = useNavigate();

  const items = NAV_ITEMS.filter((item) => !item.anyOf || hasAny(...item.anyOf));

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
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'nav-active'
                  : 'text-plum hover:bg-white/60'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/60 p-4">
        <div className="mb-3 flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet to-rose text-sm font-semibold text-white"
            aria-hidden
          >
            {user?.full_name?.charAt(0) ?? '?'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-plum">{user?.full_name}</p>
            <p className="truncate text-xs text-muted">{user?.roles.join(' · ')}</p>
          </div>
        </div>
        <button type="button" className="btn-ghost w-full justify-start" onClick={() => void handleLogout()}>
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function AppLayout(): JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="glass fixed inset-y-0 left-0 z-20 hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-plum/30"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="glass absolute inset-y-0 left-0 w-72">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-2 text-muted hover:bg-white/60"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="glass sticky top-0 z-10 flex items-center gap-3 px-4 py-3 lg:px-8">
          <button
            type="button"
            className="rounded-lg p-2 text-plum hover:bg-white/60 lg:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold text-plum">Intermediate College Management Portal</h1>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
