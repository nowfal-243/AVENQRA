import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-navy-950">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white">
          <Shield className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
          Loading AVENQRA portal…
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Permission-aware redirect: officers to their queue, admins to overview.
    if (user.role === 'OFFICER') {
      return <Navigate to="/complaints" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
