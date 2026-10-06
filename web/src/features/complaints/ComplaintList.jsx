import React from 'react';

export default function ComplaintList() {
  const sampleComplaints = [
    { id: '1', ticket: 'AVN-849102-12', title: 'Pothole on Main St', category: 'POTHOLE', status: 'IN_PROGRESS', severity: '8.2' },
    { id: '2', ticket: 'AVN-912341-89', title: 'Water leakage near park', category: 'WATER_LEAK', status: 'SUBMITTED', severity: '6.5' },
    { id: '3', ticket: 'AVN-102934-44', title: 'Uncollected waste dump', category: 'WASTE', status: 'RESOLVED', severity: '4.0' },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h3>Recent Complaints Queue</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', background: '#fff' }}>
        <thead>
          <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
            <th style={{ padding: '12px' }}>Ticket #</th>
            <th style={{ padding: '12px' }}>Title</th>
            <th style={{ padding: '12px' }}>Category</th>
            <th style={{ padding: '12px' }}>Severity</th>
            <th style={{ padding: '12px' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {sampleComplaints.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.ticket}</td>
              <td style={{ padding: '12px' }}>{item.title}</td>
              <td style={{ padding: '12px' }}>{item.category}</td>
              <td style={{ padding: '12px' }}>{item.severity}</td>
              <td style={{ padding: '12px' }}>
                <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontSize: '12px' }}>
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
