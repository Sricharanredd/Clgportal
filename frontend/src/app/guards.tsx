/**
 * Route guards: authentication, permissions, and role-based landing page.
 * These are UX guards only — the API enforces the same rules server-side.
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { Spinner, StatePanel } from '@/components/ui/States';
import { ShieldAlert } from 'lucide-react';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Restoring session…" />
      </div>
    );
  }
  if (status === 'anonymous') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export function RequirePermission({
  permission,
  anyOf,
  children,
}: {
  permission?: string;
  anyOf?: string[];
  children: ReactNode;
}) {
  const { has, hasAny } = useAuth();
  const allowed = permission ? has(permission) : anyOf ? hasAny(...anyOf) : true;

  if (!allowed) {
    return (
      <StatePanel
        icon={<ShieldAlert className="h-10 w-10 text-rose" aria-hidden />}
        title="Access denied"
        description="Your role does not include this permission. If you believe this is a mistake, contact the administrator."
      />
    );
  }
  return <>{children}</>;
}

/** Default landing route after login, chosen from the user's real roles. */
export function useDefaultHome(): string {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  if (roles.includes('principal')) return '/dashboard';
  if (roles.includes('accounts')) return '/dashboard';
  if (roles.includes('faculty')) return '/dashboard';
  if (roles.includes('administrator')) return '/dashboard';
  return '/dashboard';
}
