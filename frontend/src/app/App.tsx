import { RequireAuth, RequirePermission } from '@/app/guards';
import { AuthProvider } from '@/app/AuthContext';
import { StatePanel } from '@/components/ui/States';
import { ToastProvider } from '@/components/ui/Toast';
import AppLayout from '@/layouts/AppLayout';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import HomePage from '@/pages/home/HomePage';
import LoginPage from '@/pages/auth/LoginPage';
import StudentsPage from '@/pages/students/StudentsPage';
import StudentDetailPage from '@/pages/students/StudentDetailPage';
import AttendancePage from '@/pages/attendance/AttendancePage';
import FeesPage from '@/pages/fees/FeesPage';
import AnnouncementsPage from '@/pages/announcements/AnnouncementsPage';
import ResultsPage from '@/pages/results/ResultsPage';
import StudentInfoPage from '@/pages/student-info/StudentInfoPage';
import ParentPortal from '@/pages/parent/ParentPortal';
import { Construction } from 'lucide-react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

export default function App(): JSX.Element {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
        <Routes>
          {/* Public routes (no authentication) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          {/* Bookmarks: the staff login moved to /admin/login */}
          <Route path="/login" element={<Navigate to="/admin/login" replace />} />

          {/* Public student-information dashboard (read-only visitor view) */}
          <Route element={<AppLayout />}>
            <Route path="/student-info" element={<StudentInfoPage />} />
          </Route>

          {/* Staff portal (permission-guarded feature routes) */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/students" element={<RequirePermission anyOf={['students:read']}><StudentsPage /></RequirePermission>} />
            <Route path="/students/:id" element={<RequirePermission anyOf={['students:read']}><StudentDetailPage /></RequirePermission>} />
            <Route path="/attendance" element={<RequirePermission anyOf={['attendance:read', 'attendance:correct']}><AttendancePage /></RequirePermission>} />
            <Route path="/results" element={<RequirePermission anyOf={['results:read', 'results:write', 'results:publish']}><ResultsPage /></RequirePermission>} />
            <Route path="/fees" element={<RequirePermission anyOf={['fees:read', 'fees:read_own']}><FeesPage /></RequirePermission>} />
            <Route path="/announcements" element={<RequirePermission anyOf={['announcements:read']}><AnnouncementsPage /></RequirePermission>} />
          </Route>

          {/* Parent portal (read-only, own shell, URL-driven).
              Demo Mode is the only parent frontend architecture:
              /parent overview → /parent/students directory
              → /parent/students/:studentId record. */}
          <Route path="/parent" element={<ParentPortal />} />
          <Route path="/parent/students" element={<ParentPortal />} />
          <Route path="/parent/students/:studentId" element={<ParentPortal />} />
          <Route path="/parent/student/:studentId" element={<ParentPortal />} />
          <Route path="/parent/*" element={<Navigate to="/parent" replace />} />

          <Route
            path="*"
            element={
              <div className="flex min-h-screen items-center justify-center p-6">
                <StatePanel
                  icon={<Construction className="h-10 w-10 text-periwinkle" aria-hidden />}
                  title="Page not found"
                  description="The page you requested does not exist."
                />
              </div>
            }
          />
        </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
