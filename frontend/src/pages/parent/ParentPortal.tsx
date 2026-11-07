/**
 * Parent portal entry. Two mutually exclusive flows, one flag:
 *
 *   VITE_DEMO_OPEN_PARENT=true  → /parent (overview) → /parent/students
 *                                 (directory) → /parent/students/:id (record)
 *   VITE_DEMO_OPEN_PARENT=false → verified lookup in ParentLegacy.tsx
 *
 * The verified lookup is not deleted — flipping the flag restores it.
 */
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { DEMO_OPEN_PARENT } from '@/config/demo';
import ParentDirectoryPage from './ParentDirectoryPage';
import ParentLegacy from './ParentLegacy';
import ParentOverviewPage from './ParentOverviewPage';
import ParentStudentPage from './ParentStudentPage';

export default function ParentPortal(): JSX.Element {
  const { pathname } = useLocation();
  const { studentId } = useParams();

  if (DEMO_OPEN_PARENT) {
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

  // Verified flow: the open directory does not exist, so send those URLs back
  // to the lookup screen instead of showing a demo-only page.
  if (pathname.startsWith('/parent/students')) {
    return <Navigate to="/parent" replace />;
  }

  return <ParentLegacy mode={studentId ? 'student' : 'lookup'} />;
}
