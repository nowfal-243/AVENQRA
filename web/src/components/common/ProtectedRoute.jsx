import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', color: '#3b82f6' }}>Loading AVENQRA...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect officer to officer dashboard, admin to admin dashboard
    if (user.role === 'OFFICER') {
      return <Navigate to="/officer" replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  return children;
}
