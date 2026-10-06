import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Navbar from './components/common/Navbar';
import LoginPage from './features/auth/LoginPage';
import AdminDashboard from './features/admin/AdminDashboard';
import ManageDepartments from './features/admin/ManageDepartments';
import ManageOfficers from './features/admin/ManageOfficers';
import AnalyticsDashboard from './features/admin/AnalyticsDashboard';
import OfficerDashboard from './features/officer/OfficerDashboard';

function MainLayout({ children }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      {!isLoginPage && <Navbar />}
      <main className={!isLoginPage ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6' : ''}>
        {children}
      </main>
    </div>
  );
}

function DefaultRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (['SUPER_ADMIN', 'DEPARTMENT_ADMIN'].includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }
  if (user.role === 'OFFICER') {
    return <Navigate to="/officer" replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DEPARTMENT_ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/departments"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DEPARTMENT_ADMIN']}>
                  <ManageDepartments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/officers"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DEPARTMENT_ADMIN']}>
                  <ManageOfficers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DEPARTMENT_ADMIN']}>
                  <AnalyticsDashboard />
                </ProtectedRoute>
              }
            />

            {/* Officer Routes */}
            <Route
              path="/officer"
              element={
                <ProtectedRoute allowedRoles={['OFFICER']}>
                  <OfficerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Default Catch-all */}
            <Route path="*" element={<DefaultRedirect />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </AuthProvider>
  );
}
