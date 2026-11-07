/**
 * Sidebar — grouped, collapsible navigation. Items are filtered by the
 * caller's REAL permissions (the server stays the authority).
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { BRAND } from '@/config/brand';
import { Avatar } from '@/components/ui/Avatar';
import { NAV_GROUPS } from './navigation';

function BrandMark({ compact }: { compact: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${compact ? 'justify-center' : ''}`}>
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
      {!compact ? (
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-extrabold leading-tight tracking-tight text-ink">
            {BRAND.collegeName}
          </span>
          <span className="block truncate text-[11px] font-medium text-muted">{BRAND.tagline}</span>
        </span>
      ) : null}
    </div>
  );
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  onNavigate,
  showCollapseToggle = true,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate?: () => void;
  showCollapseToggle?: boolean;
}) {
  const { user, hasAny, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const roleLabel = user?.roles?.[0] ? user.roles[0].replace(/_/g, ' ') : 'Staff';

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className={`flex h-16 shrink-0 items-center border-b border-line px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <BrandMark compact={collapsed} />
        {!collapsed && showCollapseToggle ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Collapse sidebar"
            className="hidden rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink lg:block"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3" aria-label="Primary">
        {collapsed && showCollapseToggle ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Expand sidebar"
            className="mx-auto mb-2 hidden rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink lg:block"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : null}

        {NAV_GROUPS.map((group, groupIndex) => {
          const items = group.items.filter((item) => !item.anyOf || hasAny(...item.anyOf));
          if (items.length === 0) return null;
          return (
            <div key={group.label} className={groupIndex > 0 ? 'mt-4' : ''}>
              {collapsed ? (
                groupIndex > 0 ? <div className="mx-auto mb-2 h-px w-6 bg-line" /> : null
              ) : (
                <p className="mb-1.5 px-2.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to} className="relative">
                      <NavLink
                        to={item.to}
                        onClick={onNavigate}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          `group relative flex items-center gap-2.5 rounded-control py-2 text-[13.5px] font-semibold transition-colors duration-150 ${
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
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-line p-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <span title={user?.full_name ?? 'Signed in'}>
              <Avatar name={user?.full_name} size="sm" />
            </span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label="Sign out"
              title="Sign out"
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="rounded-panel border border-line bg-surface-2/60 p-2.5">
            <div className="flex items-center gap-2.5">
              <Avatar name={user?.full_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold leading-tight text-ink">
                  {user?.full_name ?? 'Signed in'}
                </p>
                <p className="truncate text-[11.5px] capitalize text-muted">{roleLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                aria-label="Sign out"
                title="Sign out"
                className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-danger"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
