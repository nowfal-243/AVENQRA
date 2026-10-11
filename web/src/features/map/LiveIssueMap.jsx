import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Map as MapIcon, List, MapPin, Info, Crosshair, AlertTriangle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import { DataErrorBar } from '../../components/common/DemoBanner';
import StatusBadge from '../../components/common/StatusBadge';
import { useData } from '../../context/DataContext';
import { CATEGORIES, STATUSES, STATUS_META, PRIORITY_META } from '../../utils/constants';
import { timeAgo, formatCoords } from '../../utils/formatters';

/* Severity → marker colour (distinct from status for quick scanning). */
const SEVERITY_COLORS = {
  CRITICAL: '#f43f5e',
  HIGH: '#f97316',
  MEDIUM: '#0ea5e9',
  LOW: '#64748b',
};

/**
 * LiveIssueMap — a Leaflet/OpenStreetMap view of geolocated complaints.
 *
 * It never claims precise proximity or automatic routing: this API provides no
 * officer GPS telemetry, so “nearest officer” is shown only as an honest
 * department-level availability count, clearly labelled. Real coordinates are
 * distinguished from demo locations via the isDemoRecord flag.
 */
export default function LiveIssueMap() {
  const { complaints, departments, officers, loading, error, isDemo } = useData();

  const [category, setCategory] = useState('');
  const [deptId, setDeptId] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [split, setSplit] = useState(true);

  const geolocated = useMemo(
    () => complaints.filter((c) => c.location?.latitude != null && c.location?.longitude != null),
    [complaints]
  );
  const missingCoords = complaints.length - geolocated.length;

  const filtered = useMemo(
    () =>
      geolocated.filter((c) => {
        if (category && c.category !== category) return false;
        if (deptId && c.departmentId !== deptId) return false;
        if (severity && c.priority !== severity) return false;
        if (status && c.currentStatus !== status) return false;
        return true;
      }),
    [geolocated, category, deptId, severity, status]
  );

  const selected = filtered.find((c) => c.id === selectedId) || null;

  const nearbyOfficers = useMemo(() => {
    if (!selected) return { active: 0, total: 0, deptName: '' };
    const dept = departments.find((d) => d.id === selected.departmentId);
    const eligible = officers.filter((o) => o.departmentId === selected.departmentId);
    return {
      active: eligible.filter((o) => o.status === 'ACTIVE').length,
      total: eligible.length,
      deptName: dept?.name || 'Unknown department',
    };
  }, [selected, departments, officers]);

  const clearFilters = () => {
    setCategory('');
    setDeptId('');
    setSeverity('');
    setStatus('');
  };
  const activeFilterCount = [category, deptId, severity, status].filter(Boolean).length;

  return (
    <div>
      <PageHeader
        title="Live Issue Map"
        description="Geolocated complaints on an interactive OpenStreetMap view."
        badge={
          isDemo ? (
            <span className="badge border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
              demo locations
            </span>
          ) : null
        }
        actions={
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSplit((s) => !s)} aria-pressed={split}>
            {split ? <MapIcon className="h-3.5 w-3.5" aria-hidden="true" /> : <List className="h-3.5 w-3.5" aria-hidden="true" />}
            {split ? 'Map focus' : 'Split view'}
          </button>
        }
      />

      <DataErrorBar message={error} />

      <div className="card mb-4 grid gap-3 p-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.label}>{c.label}</option>
          ))}
        </select>
        <select className="select" value={deptId} onChange={(e) => setDeptId(e.target.value)} aria-label="Filter by department">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select className="select" value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Filter by severity">
          <option value="">All severities</option>
          {Object.keys(PRIORITY_META).map((p) => (
            <option key={p} value={p}>{PRIORITY_META[p].label}</option>
          ))}
        </select>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {filtered.length} shown{activeFilterCount > 0 ? ` · ${activeFilterCount} filter(s)` : ''}
          </span>
          {activeFilterCount > 0 && (
            <button type="button" className="btn btn-xs btn-ghost ml-auto" onClick={clearFilters}>Clear</button>
          )}
        </div>
      </div>

      {missingCoords > 0 && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {missingCoords} complaint(s) have no coordinates and are hidden from the map.
        </p>
      )}

      <div className={`grid gap-4 ${split ? 'lg:grid-cols-3' : ''}`}>
        <div className={`card overflow-hidden p-0 ${split ? 'lg:col-span-2' : ''}`}>
          {loading && complaints.length === 0 ? (
            <div className="p-4">
              <LoadingSkeleton variant="chart" height={420} label="Loading map…" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<MapIcon className="h-6 w-6" aria-hidden="true" />}
              title="No geolocated complaints match these filters"
              description="Adjust the filters or clear them to see all mapped complaints."
            />
          ) : (
            <LeafletMap complaints={filtered} selectedId={selectedId} onSelect={setSelectedId} isDemo={isDemo} />
          )}
        </div>

        <div className={split ? '' : 'mt-4'}>
          {selected ? (
            <SelectedPanel
              complaint={selected}
              isDemo={isDemo}
              nearbyOfficers={nearbyOfficers}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="card max-h-[520px] overflow-y-auto p-3">
              <h3 className="panel-title mb-2 px-1">Mapped complaints</h3>
              <ul className="space-y-1.5">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-navy-850"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: SEVERITY_COLORS[c.priority] || '#64748b' }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{c.title}</span>
                        <span className="block truncate text-[10px] text-slate-400">{c.ticketNumber} · {timeAgo(c.createdAt)}</span>
                      </span>
                      <StatusBadge status={c.currentStatus} size="sm" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

      </div>

      <p className="mt-4 flex items-start gap-1.5 text-[11px] text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Marker colour reflects severity. This API does not provide officer GPS telemetry or routing, so
        proximity and automatic dispatch are not computed here.
      </p>
    </div>
  );
}


function SelectedPanel({ complaint, isDemo, nearbyOfficers, onClose }) {
  const loc = complaint.location || {};
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-bold text-cyan-600 dark:text-cyan-400">{complaint.ticketNumber}</p>
          <h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{complaint.title}</h3>
        </div>
        <button type="button" className="btn btn-xs btn-ghost" onClick={onClose} aria-label="Clear selection">
          Back to list
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <StatusBadge priority={complaint.priority} size="sm" />
        <StatusBadge status={complaint.currentStatus} size="sm" />
      </div>

      <dl className="mt-3 space-y-2 text-xs">
        <div>
          <dt className="text-slate-400">Category</dt>
          <dd className="font-semibold text-slate-700 dark:text-slate-200">{complaint.category}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Address</dt>
          <dd className="font-semibold text-slate-700 dark:text-slate-200">{loc.addressFormatted || 'Pinned location'}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Coordinates</dt>
          <dd className="font-mono text-slate-700 dark:text-slate-200">{formatCoords(loc.latitude, loc.longitude)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Filed</dt>
          <dd className="text-slate-700 dark:text-slate-200">{timeAgo(complaint.createdAt)}</dd>
        </div>
      </dl>

      <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50/50 p-3 dark:border-cyan-500/30 dark:bg-cyan-500/5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-800 dark:text-cyan-200">
          <Crosshair className="h-3.5 w-3.5" aria-hidden="true" /> Department availability
        </p>
        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
          {nearbyOfficers.deptName}: {nearbyOfficers.active} active / {nearbyOfficers.total} total officers.
        </p>
        <p className="mt-1 text-[10px] text-slate-400">
          Officer GPS telemetry is not provided by this API, so true nearest-officer distance cannot be
          computed. This shows department-level availability only.
        </p>
      </div>

      {isDemo && complaint.isDemoRecord && (
        <p className="mt-2 text-[10px] text-violet-500">Simulated demo coordinates.</p>
      )}

      <Link
        to={`/complaints?focus=${complaint.id}`}
        className="btn btn-primary btn-sm mt-3 w-full"
      >
        <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Open full complaint
      </Link>
    </div>
  );
}

/* Raw Leaflet wrapper — mirrors the existing ComplaintMapView approach. */
function LeafletMap({ complaints, selectedId, onSelect }) {
  const ref = React.useRef(null);
  const instance = React.useRef(null);

  React.useEffect(() => {
    let cancelled = false;
    let L;
    import('leaflet').then((mod) => {
      if (cancelled || !ref.current) return;
      L = mod.default;
      import('leaflet/dist/leaflet.css');
      if (instance.current) {
        instance.current.remove();
        instance.current = null;
      }
      const first = complaints[0]?.location || {};
      const map = L.map(ref.current).setView([first.latitude || 12.97, first.longitude || 77.59], 12);
      instance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const bounds = L.latLngBounds();
      complaints.forEach((c) => {
        const { latitude, longitude } = c.location;
        bounds.extend([latitude, longitude]);
        const color = SEVERITY_COLORS[c.priority] || '#64748b';
        const icon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const marker = L.marker([latitude, longitude], { icon }).addTo(map);
        marker.on('click', () => onSelect(c.id));
        marker.bindTooltip(`${c.ticketNumber} — ${c.title}`, { direction: 'top' });
        if (c.id === selectedId) marker.openTooltip();
      });

      if (complaints.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
    });
    return () => {
      cancelled = true;
      if (instance.current) {
        instance.current.remove();
        instance.current = null;
      }
    };
  }, [complaints, selectedId, onSelect]);

  return <div ref={ref} style={{ height: '60vh', minHeight: 420, width: '100%' }} className="z-0 bg-slate-100 dark:bg-navy-950" />;
}

