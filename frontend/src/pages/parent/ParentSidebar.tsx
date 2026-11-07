/**
 * Parent portal sidebar — deliberately independent of the staff Sidebar
 * (`components/app/Sidebar.tsx`) so parent navigation never inherits staff
 * permissions or staff-only destinations.
 *
 * Exactly two destinations:
 *   Overview  → Dashboard     → /parent
 *   Academics → All Students  → /parent/students
 */
import { Link, NavLink } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { BRAND } from '@/config/brand';
import { DEMO_OPEN_PARENT } from '@/config/demo';

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{
    to: string;
    label: string;
    icon: typeof LayoutDashboard;
    end?: boolean;
  }>;
}> = [
  {
    label: 'Overview',
    items: [{ to: '/parent', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Academics',
    items: [{ to: '/parent/students', label: 'All Students', icon: Users }],
  },
];

export function ParentSidebar({
  collapsed,
  onToggleCollapsed,
  onNavigate,
  showCollapseToggle = true,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate?: () => void;
  showCollapseToggle?: boolean;
}): JSX.Element {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div
        className={`flex h-16 shrink-0 items-center border-b border-line px-3 ${
          collapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        <Link
          to="/parent"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-panel bg-brand-500 text-white shadow-[0_8px_18px_-10px_rgb(var(--brand-500))]"
            aria-hidden
          >
            {BRAND.logo ? (
              <img src={BRAND.logo} alt="" className="h-6 w-6 object-contain" />
            ) : (
              <GraduationCap className="h-5 w-5" />
            )}
          </span>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-extrabold leading-tight tracking-tight text-ink">
                {BRAND.collegeName}
              </span>
              <span className="block truncate text-[10.5px] font-medium text-muted">
                {BRAND.tagline}
              </span>
            </span>
          ) : null}
        </Link>

        {!collapsed && showCollapseToggle ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="hidden rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:block"
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3"
        aria-label="Parent portal"
      >
        {collapsed && showCollapseToggle ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="mx-auto mb-2 hidden rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:block"
          >
            <PanelLeftOpen className="h-4 w-4" aria-hidden />
          </button>
        ) : null}

        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.label} className={groupIndex > 0 ? 'mt-4' : ''}>
            {collapsed ? (
              groupIndex > 0 ? <div className="mx-auto mb-2 h-px w-6 bg-line" /> : null
            ) : (
              <p className="mb-1.5 px-2.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to} className="relative">
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-2.5 rounded-control py-2 text-[13.5px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                          collapsed ? 'justify-center px-2' : 'px-2.5'
                        } ${
                          isActive
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive ? (
                            <span
                              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-500"
                              aria-hidden
                            />
                          ) : null}
                          <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                          {!collapsed ? <span className="truncate">{item.label}</span> : null}
                          {collapsed ? (
                            <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11.5px] font-semibold text-white shadow-lift group-hover:block group-focus-visible:block">
                              {item.label}
                            </span>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-line p-2">
        {DEMO_OPEN_PARENT ? (
          collapsed ? (
            <span
              title="Demo mode — read-only"
              className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-warning-bg text-[11px] font-bold text-warning"
            >
              D
            </span>
          ) : (
            <div className="rounded-panel border border-line bg-surface-2/60 p-2.5">
              <Badge tone="warning">Demo mode</Badge>
              <p className="mt-1.5 text-[11px] leading-4 text-muted">
                Read-only parent access. No edits, payments or waivers.
              </p>
            </div>
          )
        ) : !collapsed ? (
          <p className="px-2 py-1 text-[11px] text-muted">Read-only parent access</p>
        ) : null}
      </div>
    </div>
  );
}
