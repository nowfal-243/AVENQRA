import React, { useMemo, useState } from 'react';
import {
  HardHat,
  Plus,
  Pencil,
  Phone,
  Mail,
  Search,
  UserCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import { DataErrorBar } from '../../components/common/DemoBanner';
import Modal from '../../components/common/Modal';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import officerService from '../../services/officerService';
import { can } from '../../utils/permissions';
import { OFFICER_STATUSES, OFFICER_STATUS_META } from '../../utils/constants';
import { initials } from '../../utils/formatters';

/**
 * OfficerList — searchable field-officer directory with department and
 * availability filters, detail views, and admin actions (add, edit,
 * availability update). Availability changes and officer creation route
 * through officerService; the backend re-authorises.
 */
export default function OfficerList() {
  const { officers, departments, complaints, loading, error, isDemo, refreshOfficers } = useData();
  const { user } = useAuth();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewing, setViewing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [statusTarget, setStatusTarget] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    badgeNumber: '',
    phone: '',
    departmentId: '',
    status: 'ACTIVE',
  });

  const canCreate = can(user, 'createOfficer');
  const canEdit = can(user, 'editOfficer');
  const canUpdateAvailability = can(user, 'updateOfficerAvailability');
  const canViewContacts = can(user, 'viewContacts');

  const enriched = useMemo(
    () =>
      officers.map((o) => {
        const assigned = complaints.filter((c) =>
          (c.assignments || []).some((a) => a.officerId === o.id || a.officer?.id === o.id)
        );
        return {
          ...o,
          activeCount: assigned.filter((c) => !['RESOLVED', 'REJECTED'].includes(c.currentStatus)).length,
          completedCount: assigned.filter((c) => ['RESOLVED', 'REJECTED'].includes(c.currentStatus)).length,
          workload: assigned.filter((c) => !['RESOLVED', 'REJECTED'].includes(c.currentStatus)).length,
        };
      }),
    [officers, complaints]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((o) => {
      if (deptFilter && o.departmentId !== deptFilter) return false;
      if (statusFilter && o.status !== statusFilter) return false;
      if (q) {
        const hay = `${o.user?.name || ''} ${o.badgeNumber || ''} ${o.user?.email || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enriched, search, deptFilter, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', badgeNumber: '', phone: '', departmentId: departments[0]?.id || '', status: 'ACTIVE' });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (officer) => {
    setEditing(officer);
    setForm({
      name: officer.user?.name || '',
      email: officer.user?.email || '',
      password: '',
      badgeNumber: officer.badgeNumber || '',
      phone: officer.user?.phone || '',
      departmentId: officer.departmentId || '',
      status: officer.status || 'ACTIVE',
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (form.name.trim().length < 3) {
      setFormError('Officer name is required.');
      return;
    }
    if (!editing && !/^\S+@\S+\.\S+$/.test(form.email)) {
      setFormError('A valid email is required.');
      return;
    }
    if (!editing && form.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await officerService.updateStatus(editing.id, {
          status: form.status,
          departmentId: form.departmentId || null,
        });
        toast.success(`${form.name} updated.`);
      } else {
        await officerService.create({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          badgeNumber: form.badgeNumber.trim(),
          departmentId: form.departmentId || null,
          phone: form.phone.trim() || undefined,
        });
        toast.success(`${form.name} added.`);
      }
      setFormOpen(false);
      await refreshOfficers();
    } catch (err) {
      setFormError(err?.message || 'Failed to save officer.');
    } finally {
      setSaving(false);
    }
  };

  const applyAvailability = async (officer, status) => {
    try {
      await officerService.updateStatus(officer.id, { status });
      toast.success(`${officer.user?.name} set to ${OFFICER_STATUS_META[status]?.label || status}.`);
      setStatusTarget(null);
      await refreshOfficers();
    } catch (err) {
      toast.error(err?.message || 'Failed to update availability.');
    }
  };


  return (
    <div>
      <PageHeader
        title="Field Officers"
        description="Manage field officers, their availability and current workload."
        badge={
          isDemo ? (
            <span className="badge border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
              demo data
            </span>
          ) : null
        }
        actions={
          canCreate && (
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add officer
            </button>
          )
        }
      />

      <DataErrorBar message={error} />

      <div className="card mb-4 grid gap-3 p-3.5 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            className="input pl-9"
            placeholder="Search name, badge, email…"
            aria-label="Search officers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} aria-label="Filter by department">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by availability">
          <option value="">All availability</option>
          {OFFICER_STATUSES.map((s) => (
            <option key={s} value={s}>{OFFICER_STATUS_META[s]?.label || s}</option>
          ))}
        </select>
      </div>

      {loading && officers.length === 0 ? (
        <LoadingSkeleton variant="cards" count={4} label="Loading officers…" />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<HardHat className="h-6 w-6" aria-hidden="true" />}
            title="No officers found"
            description="Add field officers or adjust your filters."
            action={canCreate && <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>Add officer</button>}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o) => (
            <OfficerCard
              key={o.id}
              officer={o}
              canViewContacts={canViewContacts}
              canEdit={canEdit}
              canUpdateAvailability={canUpdateAvailability}
              onView={() => setViewing(o)}
              onEdit={() => openEdit(o)}
              onAvailability={() => setStatusTarget(o)}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <Modal
          open
          onClose={() => setFormOpen(false)}
          title={editing ? 'Edit officer' : 'Add field officer'}
          icon={<UserCheck className="h-5 w-5" aria-hidden="true" />}
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {formError}
              </div>
            )}
            <div>
              <label htmlFor="off-name" className="label">Full name</label>
              <input id="off-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            {!editing && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="off-email" className="label">Email</label>
                  <input id="off-email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div>
                  <label htmlFor="off-pw" className="label">Password</label>
                  <input id="off-pw" type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="off-badge" className="label">Badge #</label>
                <input id="off-badge" className="input font-mono" value={form.badgeNumber} onChange={(e) => setForm({ ...form, badgeNumber: e.target.value })} required={!editing} />
              </div>
              <div>
                <label htmlFor="off-phone" className="label">Phone</label>
                <input id="off-phone" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91…" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="off-dept" className="label">Department</label>
                <select id="off-dept" className="select" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                  <option value="">Unassigned</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="off-status" className="label">Availability</label>
                <select id="off-status" className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {OFFICER_STATUSES.map((s) => (
                    <option key={s} value={s}>{OFFICER_STATUS_META[s]?.label || s}</option>
                  ))}
                </select>
              </div>
            </div>
            {editing && (
              <p className="text-[10px] text-slate-400">
                The backend exposes status and department updates for existing officers. Name and contact
                changes are handled through the officer account profile.
              </p>
            )}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add officer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.user?.name || 'Officer'} subtitle={`Badge #${viewing.badgeNumber}`} icon={<HardHat className="h-5 w-5" aria-hidden="true" />}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat icon={<UserCheck className="h-4 w-4" />} label="Availability" value={OFFICER_STATUS_META[viewing.status]?.label || viewing.status} />
            <Stat icon={<HardHat className="h-4 w-4" />} label="Department" value={viewing.department?.name || 'Unassigned'} />
            <Stat icon={<Clock className="h-4 w-4" />} label="Active workload" value={viewing.workload} />
            <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={viewing.completedCount} />
          </dl>
          {canViewContacts && (viewing.user?.email || viewing.user?.phone) && (
            <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              {viewing.user?.email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" aria-hidden="true" /> {viewing.user.email}</p>}
              {viewing.user?.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" aria-hidden="true" /> {viewing.user.phone}</p>}
            </div>
          )}
          {viewing.lastKnownLocation ? (
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Last known: {Number(viewing.lastKnownLocation.latitude).toFixed(4)}, {Number(viewing.lastKnownLocation.longitude).toFixed(4)}
            </p>
          ) : (
            <p className="mt-3 text-[11px] text-slate-400">No location telemetry collected for this officer.</p>
          )}
        </Modal>
      )}

      {statusTarget && (
        <Modal open onClose={() => setStatusTarget(null)} title="Update availability" subtitle={statusTarget.user?.name} icon={<UserCheck className="h-5 w-5" aria-hidden="true" />} size="sm">
          <div className="space-y-2">
            {OFFICER_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className="btn btn-secondary w-full justify-start"
                onClick={() => applyAvailability(statusTarget, s)}
              >
                <span className={`h-2 w-2 rounded-full ${s === 'ACTIVE' ? 'bg-emerald-500' : s === 'BUSY' ? 'bg-amber-500' : 'bg-slate-400'}`} aria-hidden="true" />
                Set to {OFFICER_STATUS_META[s]?.label || s}
              </button>
            ))}
          </div>
        </Modal>
      )}

    </div>
  );
}


function Stat({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <dt className="flex items-center gap-1.5 text-[11px] text-slate-400">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 truncate text-base font-extrabold text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

function OfficerCard({ officer, canViewContacts, canEdit, canUpdateAvailability, onView, onEdit, onAvailability }) {
  const meta = OFFICER_STATUS_META[officer.status] || OFFICER_STATUS_META.ACTIVE;
  return (
    <div className="card card-hover flex flex-col p-4">
      <div className="flex items-start gap-3">
        {officer.user?.avatarUrl ? (
          <img src={officer.user.avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold text-white">
            {initials(officer.user?.name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{officer.user?.name || 'Officer'}</h3>
          <p className="font-mono text-[11px] text-slate-400">#{officer.badgeNumber}</p>
        </div>
        <span className={`badge shrink-0 ${meta.classes}`} title={`Availability: ${meta.label}`}>
          {meta.label}
        </span>
      </div>

      <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">{officer.department?.name || 'No department'}</p>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center dark:border-slate-800">
        <div>
          <dd className="text-base font-extrabold text-slate-900 dark:text-white">{officer.workload}</dd>
          <dt className="text-[10px] uppercase tracking-wide text-slate-400">Active</dt>
        </div>
        <div>
          <dd className="text-base font-extrabold text-slate-900 dark:text-white">{officer.completedCount}</dd>
          <dt className="text-[10px] uppercase tracking-wide text-slate-400">Done</dt>
        </div>
        <div>
          <dd className="text-base font-extrabold text-slate-900 dark:text-white">{meta.label}</dd>
          <dt className="text-[10px] uppercase tracking-wide text-slate-400">Status</dt>
        </div>
      </dl>

      {canViewContacts && (officer.user?.email || officer.user?.phone) && (
        <div className="mt-2.5 space-y-0.5 text-[11px] text-slate-400">
          {officer.user?.email && <p className="truncate">{officer.user.email}</p>}
          {officer.user?.phone && <p className="truncate">{officer.user.phone}</p>}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button type="button" className="btn btn-secondary btn-sm flex-1" onClick={onView}>View</button>
        {canEdit && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit} aria-label={`Edit ${officer.user?.name}`}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        {canUpdateAvailability && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onAvailability} aria-label={`Update availability for ${officer.user?.name}`}>
            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

