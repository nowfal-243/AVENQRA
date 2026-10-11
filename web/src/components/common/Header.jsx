import React from 'react';

export default function Header({ userRole, setUserRole }) {
  return (
    <header style={{ padding: '16px 24px', backgroundColor: '#0f172a', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>🛡️</span>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#38bdf8', letterSpacing: '0.5px' }}>AVENQRA</h1>
        </div>
        <span style={{ fontSize: '11px', backgroundColor: '#0284c7', color: '#ffffff', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
          Command Portal
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', color: '#fbbf24', fontWeight: 'bold' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
          30-MIN SLA ESCALATION ENGINE ACTIVE
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', padding: '4px 8px', borderRadius: '6px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Role:</span>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
            style={{ background: 'transparent', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}
          >
            <option value="SUPER_ADMIN" style={{ background: '#0f172a' }}>Super Admin (Highest Authority)</option>
            <option value="DEPARTMENT_ADMIN" style={{ background: '#0f172a' }}>Department Admin</option>
            <option value="OFFICER" style={{ background: '#0f172a' }}>Field Officer</option>
          </select>
        </div>

        <button style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
          Logout 🚪
        </button>
      </div>
    </header>
  );
}
