import React from 'react';

export default function Dashboard() {
  const stats = [
    { label: 'Total Complaints', count: 128, color: '#3b82f6' },
    { label: 'Pending Review', count: 34, color: '#f59e0b' },
    { label: 'In Progress', count: 42, color: '#8b5cf6' },
    { label: 'Resolved', count: 52, color: '#10b981' },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h2>Civic Overview & Analytics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
        {stats.map((stat, idx) => (
          <div key={idx} style={{ padding: '20px', borderRadius: '8px', borderLeft: `5px solid ${stat.color}`, background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{stat.label}</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '28px', color: '#0f172a' }}>{stat.count}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
