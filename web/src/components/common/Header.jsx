import React from 'react';

export default function Header() {
  return (
    <header style={{ padding: '16px 24px', backgroundColor: '#1e293b', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>AVENQRA</h1>
        <span style={{ fontSize: '12px', background: '#3b82f6', padding: '2px 8px', borderRadius: '4px' }}>Admin Dashboard</span>
      </div>
      <div>
        <span style={{ fontSize: '14px', marginRight: '16px' }}>Officer Portal</span>
        <button style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
          Logout
        </button>
      </div>
    </header>
  );
}
