/**
 * Role-aware dashboard: fetches the caller's own dashboard endpoint
 * (GET /dashboard/{principal|accounts|faculty|admin}) — the server decides
 * what each role may see. Presentation only; no data shaping is changed.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/app/AuthContext';
import { get } from '@/shared/api/client';
import type {
  AccountsDashboard,
  AdminDashboard,
  FacultyDashboard,
  PrincipalDashboard,
} from '@/shared/api/types';
import { ErrorState } from '@/components/ui/States';
import { PageSkeleton } from '@/components/ui/Skeleton';
import PrincipalView from './PrincipalView';
import AccountsView from './AccountsView';
import FacultyView from './FacultyView';
import AdminView from './AdminView';

type Role = 'principal' | 'accounts' | 'faculty' | 'administrator';

const ROLE_ORDER: Role[] = ['principal', 'administrator', 'accounts', 'faculty'];

const ENDPOINT: Record<Role, string> = {
  principal: '/dashboard/principal',
  administrator: '/dashboard/admin',
  accounts: '/dashboard/accounts',
  faculty: '/dashboard/faculty',
};

function greetingFor(name: string | undefined): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
}

export default function DashboardPage(): JSX.Element {
  const { user, hasRole } = useAuth();
  const role = ROLE_ORDER.find((r) => hasRole(r));

  const [data, setData] = useState<unknown | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!role) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await get<unknown>(ENDPOINT[role]);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!role) {
    return (
      <ErrorState
        title="No staff role assigned"
        error={new Error('This account has no staff role yet. Contact the administrator.')}
      />
    );
  }
  if (loading) return <PageSkeleton stats={4} panels={2} />;
  if (error) return <ErrorState error={error} onRetry={() => void load()} />;
  if (!data) return <ErrorState error={new Error('The dashboard returned no data.')} onRetry={() => void load()} />;

  const heading = greetingFor(user?.full_name);

  switch (role) {
    case 'principal':
      return <PrincipalView data={data as PrincipalDashboard} heading={heading} />;
    case 'accounts':
      return <AccountsView data={data as AccountsDashboard} heading={heading} />;
    case 'faculty':
      return <FacultyView data={data as FacultyDashboard} heading={heading} />;
    case 'administrator':
      return <AdminView data={data as AdminDashboard} heading={heading} />;
  }
}
