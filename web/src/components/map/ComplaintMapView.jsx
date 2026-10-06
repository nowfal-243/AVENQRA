import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Marker Colors based on status
const createStatusIcon = (status) => {
  let color = '#3b82f6'; // Blue for default/assigned
  if (status === 'SUBMITTED') color = '#f59e0b'; // Amber
  if (status === 'IN_PROGRESS') color = '#8b5cf6'; // Purple
  if (status === 'RESOLVED') color = '#10b981'; // Green
  if (status === 'REJECTED') color = '#ef4444'; // Red

  const svgMarker = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="36" height="36" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
    </svg>
  `;

  return L.divIcon({
    html: svgMarker,
    className: 'custom-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -32],
  });
};

export default function ComplaintMapView({ complaints = [], onSelectComplaint, height = '500px' }) {
  const mapRef = useRef(null);
  const leafletInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Destroy previous instance if exists
    if (leafletInstance.current) {
      leafletInstance.current.remove();
      leafletInstance.current = null;
    }

    // Default center (Bangalore/Generic City or first complaint location)
    let centerLat = 12.9716;
    let centerLng = 77.5946;

    const validComplaints = complaints.filter(c => c.location && c.location.latitude && c.location.longitude);

    if (validComplaints.length > 0) {
      centerLat = validComplaints[0].location.latitude;
      centerLng = validComplaints[0].location.longitude;
    }

    const map = L.map(mapRef.current).setView([centerLat, centerLng], 12);
    leafletInstance.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const bounds = L.latLngBounds();

    validComplaints.forEach((complaint) => {
      const { latitude, longitude, addressFormatted } = complaint.location;
      bounds.extend([latitude, longitude]);

      const icon = createStatusIcon(complaint.currentStatus);
      const marker = L.marker([latitude, longitude], { icon }).addTo(map);

      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 font-sans text-xs';
      popupContent.innerHTML = `
        <div class="font-bold text-slate-800 text-sm mb-1">${complaint.ticketNumber}</div>
        <div class="font-semibold text-slate-700 mb-1">${complaint.title}</div>
        <div class="text-slate-500 mb-2">${addressFormatted || 'Location pinned'}</div>
        <div class="flex items-center space-x-2 mb-2">
          <span class="px-2 py-0.5 rounded font-bold text-xs" style="background:#e2e8f0; color:#334155;">
            ${complaint.category}
          </span>
          <span class="px-2 py-0.5 rounded font-bold text-xs" style="background:#fef3c7; color:#b45309;">
            ${complaint.priority}
          </span>
        </div>
        <button id="btn-${complaint.id}" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-2 rounded text-center cursor-pointer">
          Manage Complaint
        </button>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-${complaint.id}`);
        if (btn && onSelectComplaint) {
          btn.onclick = () => onSelectComplaint(complaint);
        }
      });
    });

    if (validComplaints.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      if (leafletInstance.current) {
        leafletInstance.current.remove();
        leafletInstance.current = null;
      }
    };
  }, [complaints]);

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-md border border-slate-200">
      <div ref={mapRef} style={{ height }} className="w-full bg-slate-100 z-0" />
    </div>
  );
}
