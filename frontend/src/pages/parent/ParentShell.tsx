/**
 * Parent portal shell — fixed left sidebar + right content area.
 *
 * Independent from the staff shell (`layouts/AppLayout.tsx`): the sidebar
 * only knows the two parent destinations and never reads staff permissions.
 * Desktop collapses to an icon rail (persisted per browser); below `lg` the
 * sidebar becomes a slide-over drawer opened from the compact top bar.
 */
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, Menu, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { DEMO_OPEN_PARENT } from '@/config/demo';
import { ParentSidebar } from './ParentSidebar';

const COLLAPSE_KEY = 'prism.parent.sidebar.collapsed';

export default function ParentShell({ children }: { children: ReactNode }): JSX.Element {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
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
        /* storage may be unavailable — collapse still works */
      }
      return next;
    });
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
  const shellStyle = { '--parent-sidebar-width': sidebarWidth } as CSSProperties;

  return (
    <div className="min-h-screen bg-canvas" style={shellStyle}>
      <a
        href="#parent-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110] focus:rounded-control focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden border-r border-line bg-surface transition-[width] duration-200 ease-out lg:block"
        style={{ width: 'var(--parent-sidebar-width)' }}
      >
        <ParentSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-[80] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Parent portal navigation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade-in"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <div className="animate-fade-in absolute inset-y-0 left-0 w-[17.5rem] border-r border-line bg-surface shadow-lift">
            <button
              type="button"
              className="absolute right-2.5 top-4 z-10 rounded-control p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <ParentSidebar
              collapsed={false}
              onToggleCollapsed={() => undefined}
              onNavigate={() => setMobileOpen(false)}
              showCollapseToggle={false}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[var(--parent-sidebar-width)]">
        {/* Compact top bar — mobile only; desktop navigation lives in the sidebar. */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/90 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="-ml-1 rounded-control p-2 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <Link
            to="/parent"
            className="flex min-w-0 items-center gap-2 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-white">
              <GraduationCap className="h-4 w-4" aria-hidden />
            </span>
            <span className="truncate text-sm font-bold text-ink">Parent Portal</span>
          </Link>
          {DEMO_OPEN_PARENT ? (
            <Badge tone="warning" className="ml-auto">
              Demo mode
            </Badge>
          ) : null}
        </header>

        <main
          id="parent-main"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>

        <footer className="mx-auto w-full max-w-6xl px-4 pb-6 text-[11.5px] text-muted sm:px-6 lg:px-8">
          Prism College · Parent Portal — read-only
        </footer>
      </div>
    </div>
  );
}
