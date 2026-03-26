import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import StaffLoginPage from './pages/StaffLoginPage';
import InvitePage from './pages/InvitePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ClientDashboard from './pages/ClientDashboard';
import ClientProfilePage from './pages/ClientProfilePage';
import ClientServicesPage from './pages/ClientServicesPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import SidebarLayout from './components/layout/SidebarLayout';
import AdminClients from './pages/AdminClients';
import AdminClientDetail from './pages/AdminClientDetail';
import RegulatorsPage from './pages/RegulatorsPage';
import ServiceTypesPage from './pages/ServiceTypesPage';
import IndustrySectorsPage from './pages/IndustrySectorsPage';
import UsersPage from './pages/UsersPage';
import AuditLogPage from './pages/AuditLogPage';
import ReportPage from './pages/ReportPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import MessagePage from './pages/MessagePage';

function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const loginPath = pathname.startsWith('/admin') ? '/admin/login' : '/login';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={loginPath} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo ?? '/'} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<StaffLoginPage />} />
      <Route path="/invite" element={<InvitePage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        element={
          <ProtectedRoute>
            <SidebarLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="services"
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientServicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="services/:id"
          element={
            <ProtectedRoute allowedRoles={['client', 'admin', 'staff', 'super_admin']}>
              <ServiceDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="messages"
          element={
            <ProtectedRoute allowedRoles={['client', 'admin', 'staff', 'super_admin']}>
              <MessagePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={['admin', 'staff', 'super_admin']}>
              <Outlet />
            </ProtectedRoute>
          }
        >
          <Route index element={<SuperAdminDashboard />} />
          <Route
            path="clients"
            element={
              <ProtectedRoute allowedRoles={['staff', 'super_admin']} redirectTo="/admin">
                <AdminClients />
              </ProtectedRoute>
            }
          />
          <Route
            path="clients/:id"
            element={
              <ProtectedRoute allowedRoles={['staff', 'super_admin']} redirectTo="/admin">
                <AdminClientDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="regulators"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']} redirectTo="/admin">
                <RegulatorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="service-types"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']} redirectTo="/admin">
                <ServiceTypesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="report"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']} redirectTo="/admin">
                <ReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="industry-sectors"
            element={
              <ProtectedRoute allowedRoles={['super_admin']} redirectTo="/admin">
                <IndustrySectorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={['super_admin']} redirectTo="/admin">
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="audit-log"
            element={
              <ProtectedRoute allowedRoles={['super_admin']} redirectTo="/admin">
                <AuditLogPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
