/**
 * Parent portal entry. Two mutually exclusive flows, one flag:
 *
 *   VITE_DEMO_OPEN_PARENT=true  → /parent/students directory (no login)
 *   VITE_DEMO_OPEN_PARENT=false → verified lookup in ParentLegacy.tsx
 *
 * The verified lookup is not deleted — flipping the flag restores it.
 */
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { DEMO_OPEN_PARENT } from '@/config/demo';
import ParentDirectoryPage from './ParentDirectoryPage';
import ParentLegacy from './ParentLegacy';
import ParentStudentPage from './ParentStudentPage';

export default function ParentPortal(): JSX.Element {
  const location = useLocation();
  const { studentId } = useParams();
  const path = location.pathname;

  if (DEMO_OPEN_PARENT) {
    if (path === '/parent' || path === '/parent/') {
      return <Navigate to="/parent/students" replace />;
    }
    if (path.startsWith('/parent/student/')) {
      return <Navigate to={`/parent/students/${studentId ?? ''}`} replace />;
    }
    if (studentId) return <ParentStudentPage />;
    return <ParentDirectoryPage />;
  }

  if (path.startsWith('/parent/students')) {
    return <Navigate to="/parent" replace />;
  }

  return <ParentLegacy mode={studentId ? 'student' : 'lookup'} />;
}
