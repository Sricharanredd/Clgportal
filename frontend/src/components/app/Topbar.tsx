/**
 * Topbar — breadcrumbs, global search trigger (⌘/Ctrl+K), notifications and
 * the account menu. Sticky and translucent so content scrolls underneath.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  ExternalLink,
  LogOut,
  Menu,
  Megaphone,
  Search,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumbs } from './Breadcrumbs';

export function Topbar({
  onOpenMenu,
  onOpenSearch,
}: {
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}) {
  const { user, has, logout } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState<'bell' | 'user' | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menu]);

  const handleLogout = async () => {
    setMenu(null);
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const roleLabel = user?.roles?.[0]?.replace(/_/g, ' ') ?? 'Staff';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface/85 px-3 backdrop-blur-glass sm:px-5 lg:px-7">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation"
        className="-ml-1 rounded-control p-2 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Breadcrumbs />

      <div ref={containerRef} className="ml-auto flex items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={onOpenSearch}
          className="group flex items-center gap-2 rounded-control border border-line bg-surface-2/70 py-1.5 pl-2.5 pr-2 text-left text-[13px] text-muted transition-colors hover:border-line-strong hover:bg-surface hover:text-ink-soft sm:w-64"
          aria-label="Search students and pages"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden flex-1 truncate sm:block">Search students, pages…</span>
          <kbd className="hidden shrink-0 rounded border border-line-strong bg-surface px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-muted sm:block">
            ⌘K
          </kbd>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((current) => (current === 'bell' ? null : 'bell'))}
            aria-label="Notifications"
            aria-expanded={menu === 'bell'}
            aria-haspopup="true"
            className="rounded-control p-2 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Bell className="h-[18px] w-[18px]" />
          </button>
          {menu === 'bell' ? (
            <div
              role="menu"
              aria-label="Notifications"
              className="animate-scale-in absolute right-0 mt-2 w-72 origin-top-right rounded-panel border border-line bg-surface p-3 shadow-pop"
            >
              <p className="text-[13px] font-bold text-ink">Notifications</p>
              <p className="mt-1 text-[12.5px] leading-5 text-muted">
                You&apos;re all caught up — there are no new alerts.
              </p>
              {has('announcements:read') ? (
                <Link
                  to="/announcements"
                  onClick={() => setMenu(null)}
                  className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-600 hover:text-brand-700"
                >
                  <Megaphone className="h-3.5 w-3.5" aria-hidden />
                  Read announcements
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((current) => (current === 'user' ? null : 'user'))}
            aria-label="Account menu"
            aria-expanded={menu === 'user'}
            aria-haspopup="true"
            className="flex items-center gap-2 rounded-control p-1 pr-1.5 transition-colors hover:bg-surface-2"
          >
            <Avatar name={user?.full_name} size="sm" />
            <span className="hidden min-w-0 text-left md:block">
              <span className="block max-w-[9rem] truncate text-[12.5px] font-bold leading-tight text-ink">
                {user?.full_name}
              </span>
              <span className="block max-w-[9rem] truncate text-[11px] capitalize leading-tight text-muted">
                {roleLabel}
              </span>
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted md:block" aria-hidden />
          </button>
          {menu === 'user' ? (
            <div
              role="menu"
              aria-label="Account"
              className="animate-scale-in absolute right-0 mt-2 w-64 origin-top-right overflow-hidden rounded-panel border border-line bg-surface shadow-pop"
            >
              <div className="flex items-start gap-2.5 border-b border-line px-3.5 py-3">
                <Avatar name={user?.full_name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-ink">{user?.full_name}</p>
                  <p className="truncate text-[11.5px] text-muted">{user?.email}</p>
                  <Badge tone="brand" className="mt-1.5 capitalize">
                    {roleLabel}
                  </Badge>
                </div>
              </div>
              <div className="p-1">
                <Link
                  to="/"
                  onClick={() => setMenu(null)}
                  className="flex items-center gap-2 rounded-control px-2.5 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                  role="menuitem"
                >
                  <ExternalLink className="h-4 w-4 text-muted" aria-hidden />
                  Public website
                </Link>
                {has('students:read') ? (
                  <Link
                    to="/students"
                    onClick={() => setMenu(null)}
                    className="flex items-center gap-2 rounded-control px-2.5 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                    role="menuitem"
                  >
                    <UserRound className="h-4 w-4 text-muted" aria-hidden />
                    Student directory
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left text-[13px] font-medium text-ink-soft transition-colors hover:bg-danger-bg hover:text-danger"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
