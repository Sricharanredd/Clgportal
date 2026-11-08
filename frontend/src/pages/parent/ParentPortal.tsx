/**
 * Parent portal entry — Demo Mode is the only parent frontend architecture.
 *
 *   /parent                     → overview
 *   /parent/students            → student directory
 *   /parent/students/:studentId → read-only student record
 *   /parent/student/:studentId  → legacy bookmark alias
 *
 * The server gates `/parent/demo/*` behind `DEMO_OPEN_PARENT`; when the
 * frontend flag is off this route explains that the open portal is disabled
 * instead of falling back to a second implementation.
 */
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { DEMO_OPEN_PARENT } from '@/config/demo';
import { StatePanel } from '@/components/ui/States';
import { buttonClass } from '@/components/ui/Button';
import ParentDirectoryPage from './ParentDirectoryPage';
import ParentOverviewPage from './ParentOverviewPage';
import ParentStudentPage from './ParentStudentPage';

export default function ParentPortal(): JSX.Element {
  const { pathname } = useLocation();
  const { studentId } = useParams();

  if (!DEMO_OPEN_PARENT) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <StatePanel
          icon={<ShieldAlert className="h-10 w-10 text-brand-500" aria-hidden />}
          title="Parent portal is unavailable"
          description="The open demo portal is disabled on this deployment. Please contact the college office for student records."
          action={
            <Link to="/" className={buttonClass({ variant: 'secondary' })}>
              Back to home
            </Link>
          }
        />
      </div>
    );
  }

  // Legacy bookmark (/parent/student/:id) → canonical record URL.
  if (pathname.startsWith('/parent/student/')) {
    return <Navigate to={`/parent/students/${studentId ?? ''}`} replace />;
  }
  // The directory renders only when the URL asks for it; /parent itself
  // always stays on the overview page.
  if (pathname === '/parent/students' || pathname === '/parent/students/') {
    return <ParentDirectoryPage />;
  }
  if (studentId) return <ParentStudentPage />;
  return <ParentOverviewPage />;
}
