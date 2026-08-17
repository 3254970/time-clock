import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';

import EmployeeLayout from './layouts/EmployeeLayout.jsx';
import EmployeeHome from './pages/employee/EmployeeHome.jsx';
import AttendanceHistory from './pages/employee/AttendanceHistory.jsx';
import AttendanceEdit from './pages/employee/AttendanceEdit.jsx';

import AdminLayout from './layouts/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import EmployeesList from './pages/admin/EmployeesList.jsx';
import EmployeeDetail from './pages/admin/EmployeeDetail.jsx';
import DepartmentsPage from './pages/admin/DepartmentsPage.jsx';
import ReportsPage from './pages/admin/ReportsPage.jsx';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/employee"
          element={
            <ProtectedRoute roles={['EMPLOYEE']}>
              <EmployeeLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<EmployeeHome />} />
          <Route path="attendance" element={<AttendanceHistory />} />
          <Route path="attendance/:id" element={<AttendanceEdit />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="employees" element={<EmployeesList />} />
          <Route path="employees/:id" element={<EmployeeDetail />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ToastProvider>
  );
}
