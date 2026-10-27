/**
 * Role-aware dashboard: fetches the caller's own dashboard endpoint
 * (GET /dashboard/{principal|accounts|faculty|admin}) — the server decides
 * what each role may see.
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
import { ErrorState, Spinner } from '@/components/ui/States';
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
        error={new Error('No staff role assigned to this account. Contact the administrator.')}
      />
    );
  }
  if (loading) return <Spinner label="Loading dashboard…" />;
  if (error) return <ErrorState error={error} onRetry={() => void load()} />;
  if (!data) return <ErrorState error={new Error('Empty response')} />;

  const heading = `Welcome, ${user?.full_name ?? 'there'}`;

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
