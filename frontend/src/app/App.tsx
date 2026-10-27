import { RequireAuth, RequirePermission } from '@/app/guards';
import { AuthProvider } from '@/app/AuthContext';
import { StatePanel } from '@/components/ui/States';
import AppLayout from '@/layouts/AppLayout';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import LoginPage from '@/pages/auth/LoginPage';
import StudentsPage from '@/pages/students/StudentsPage';
import StudentDetailPage from '@/pages/students/StudentDetailPage';
import AttendancePage from '@/pages/attendance/AttendancePage';
import FeesPage from '@/pages/fees/FeesPage';
import AnnouncementsPage from '@/pages/announcements/AnnouncementsPage';
import ResultsPage from '@/pages/results/ResultsPage';
import ParentPortal from '@/pages/parent/ParentPortal';
import { Construction } from 'lucide-react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

export default function App(): JSX.Element {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Staff portal (permission-guarded feature routes) */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/students" element={<RequirePermission anyOf={['students:read']}><StudentsPage /></RequirePermission>} />
            <Route path="/students/:id" element={<RequirePermission anyOf={['students:read']}><StudentDetailPage /></RequirePermission>} />
            <Route path="/attendance" element={<RequirePermission anyOf={['attendance:read', 'attendance:correct']}><AttendancePage /></RequirePermission>} />
            <Route path="/results" element={<RequirePermission anyOf={['results:read', 'results:write', 'results:publish']}><ResultsPage /></RequirePermission>} />
            <Route path="/fees" element={<RequirePermission anyOf={['fees:read', 'fees:read_own']}><FeesPage /></RequirePermission>} />
            <Route path="/announcements" element={<RequirePermission anyOf={['announcements:read']}><AnnouncementsPage /></RequirePermission>} />
          </Route>

          {/* Parent portal (read-only, own shell) */}
          <Route path="/parent/*" element={<ParentPortal />} />

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
    </AuthProvider>
  );
}
