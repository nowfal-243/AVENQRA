import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import DashboardLayout from './components/layout/DashboardLayout';

import LoginPage from './features/auth/LoginPage';
import Dashboard from './features/dashboard/Dashboard';
import ComplaintsPage from './features/complaints/ComplaintsPage';
import LiveReporterSimulator from './features/complaints/LiveReporterSimulator';
import DepartmentList from './features/departments/DepartmentList';
import OfficerList from './features/officers/OfficerList';
import LiveIssueMap from './features/map/LiveIssueMap';
import AnalyticsView from './features/analytics/AnalyticsView';
import SettingsPage from './features/settings/SettingsPage';
import { ROLES } from './utils/constants';

function NotFoundPage() {
  return (
    <div className="card mx-auto mt-16 max-w-md p-10 text-center">
      <p className="text-4xl font-extrabold text-cyan-500">404</p>
      <h1 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        The route you requested does not exist in the AVENQRA portal.
      </p>
      <a href="#/dashboard" className="btn btn-primary mt-5 inline-flex">
        Go to dashboard
      </a>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated application shell */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/complaints" element={<ComplaintsPage />} />
        <Route path="/reporter" element={<LiveReporterSimulator />} />
        <Route
          path="/departments"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN]}>
              <DepartmentList />
            </ProtectedRoute>
          }
        />
        <Route path="/officers" element={<OfficerList />} />
        <Route path="/map" element={<LiveIssueMap />} />
        <Route path="/analytics" element={<AnalyticsView />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Legacy routes from earlier revisions of the portal */}
      <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admin/complaints" element={<Navigate to="/complaints" replace />} />
      <Route path="/admin/departments" element={<Navigate to="/departments" replace />} />
      <Route path="/admin/officers" element={<Navigate to="/officers" replace />} />
      <Route path="/admin/analytics" element={<Navigate to="/analytics" replace />} />
      <Route path="/officer" element={<Navigate to="/complaints" replace />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <DataProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </DataProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}