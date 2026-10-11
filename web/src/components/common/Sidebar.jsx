import React from 'react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: '📊 Executive Command Board', badge: null },
    { id: 'kanban', label: '📋 3-Column Task Kanban', badge: 'Live' },
    { id: 'live-reporter', label: '📷 Live Camera Reporter Sim', badge: '15 AI Cats' },
    { id: 'triage', label: '🔍 Complaints Triage Queue', badge: null },
    { id: 'departments', label: '🏢 Municipal Departments', badge: '5 Depts' },
    { id: 'officers', label: '👷 Field Officers Directory', badge: null },
    { id: 'analytics', label: '📈 SLA & Category Analytics', badge: null },
  ];

  return (
    <aside style={{ width: '260px', backgroundColor: '#0f172a', borderRight: '1px solid #1e293b', minHeight: 'calc(100vh - 65px)', padding: '16px 12px' }}>
      <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', padding: '0 12px 12px 12px', letterSpacing: '1px' }}>
        Navigation Menu
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => {
          const isSelected = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isSelected ? '#0284c7' : 'transparent',
                color: isSelected ? '#ffffff' : '#94a3b8',
                fontWeight: isSelected ? 'bold' : 'normal',
                fontSize: '13px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{item.label}</span>
              {item.badge && (
                <span style={{ fontSize: '10px', backgroundColor: isSelected ? '#0369a1' : '#1e293b', color: isSelected ? '#ffffff' : '#38bdf8', padding: '2px 6px', borderRadius: '4px' }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
