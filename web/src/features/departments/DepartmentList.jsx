import React, { useMemo, useState } from 'react';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Users,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Loader2,
  Search,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import { DataErrorBar } from '../../components/common/DemoBanner';
import Modal, { ConfirmDialog } from '../../components/common/Modal';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import departmentService from '../../services/departmentService';
import { can } from '../../utils/permissions';

/**
 * DepartmentList — searchable department cards with Create / Edit / View /
 * Deactivate actions, gated by role. Complaint counts are derived from the
 * live (or demo) dataset; SLA targets come from the department record.
 */
export default function DepartmentList() {
  const { departments, complaints, officers, loading, error, isDemo, refreshDepartments } = useData();
  const { user } = useAuth();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ name: '', code: '', slaHours: 24, description: '' });

  const canCreate = can(user, 'createDepartment');
  const canEdit = can(user, 'editDepartment');
  const canDeactivate = can(user, 'deactivateDepartment');

  const enriched = useMemo(
    () =>
      departments.map((d) => {
        const deptComplaints = complaints.filter((c) => c.departmentId === d.id);
        return {
          ...d,
          open: deptComplaints.filter((c) => !['RESOLVED', 'REJECTED'].includes(c.currentStatus)).length,
          inProgress: deptComplaints.filter((c) => c.currentStatus === 'IN_PROGRESS').length,
          overdue: deptComplaints.filter((c) => c.isEscalated || c.currentStatus === 'ESCALATED').length,
          resolved: deptComplaints.filter((c) => ['RESOLVED', 'REJECTED'].includes(c.currentStatus)).length,
          officerCount: officers.filter((o) => o.departmentId === d.id).length,
        };
      }),
    [departments, complaints, officers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter(
      (d) => d.name.toLowerCase().includes(q) || (d.code || '').toLowerCase().includes(q)
    );
  }, [enriched, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', slaHours: 24, description: '' });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (dept) => {
    setEditing(dept);
    setForm({ name: dept.name, code: dept.code, slaHours: dept.slaHours || 24, description: dept.description || '' });
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    if (name.length < 3) {
      setFormError('Department name must be at least 3 characters.');
      return;
    }
    if (!/^[A-Z]{2,10}$/.test(code)) {
      setFormError('Code must be 2–10 uppercase letters (e.g. ROAD).');
      return;
    }
    if (enriched.some((d) => d.name.toLowerCase() === name.toLowerCase() && d.id !== editing?.id)) {
      setFormError('Another department already uses this name.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await departmentService.update(editing.id, { name, code, slaHours: Number(form.slaHours) });
        toast.success(`${name} updated.`);
      } else {
        await departmentService.create({ name, code, slaHours: Number(form.slaHours) });
        toast.success(`${name} created.`);
      }
      setFormOpen(false);
      await refreshDepartments();
    } catch (err) {
      setFormError(err?.message || 'Failed to save department.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await departmentService.deactivate(deactivateTarget.id);
      toast.success(`${deactivateTarget.name} deactivated.`);
      setDeactivateTarget(null);
      await refreshDepartments();
    } catch (err) {
      toast.error(err?.message || 'Failed to deactivate department.');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Configure municipal departments and their resolution SLA targets."
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
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> New department
            </button>
          )
        }
      />

      <DataErrorBar message={error} />

      <div className="card mb-4 p-3.5">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            className="input pl-9"
            placeholder="Search departments…"
            aria-label="Search departments"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && departments.length === 0 ? (
        <LoadingSkeleton variant="cards" count={4} label="Loading departments…" />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Building2 className="h-6 w-6" aria-hidden="true" />}
            title="No departments found"
            description="Create a department to start routing complaints to field officers."
            action={canCreate && <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>New department</button>}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => (
            <DeptCard
              key={d.id}
              dept={d}
              canEdit={canEdit}
              canDeactivate={canDeactivate}
              onEdit={() => openEdit(d)}
              onView={() => setViewing(d)}
              onDeactivate={() => setDeactivateTarget(d)}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <Modal
          open
          onClose={() => setFormOpen(false)}
          title={editing ? 'Edit department' : 'New department'}
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {formError}
              </div>
            )}
            <div>
              <label htmlFor="dept-name" className="label">Department name</label>
              <input id="dept-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Roads & Infrastructure" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="dept-code" className="label">Short code</label>
                <input id="dept-code" className="input uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="ROAD" required />
              </div>
              <div>
                <label htmlFor="dept-sla" className="label">Resolution SLA (hours)</label>
                <input id="dept-sla" type="number" min="1" max="168" className="input" value={form.slaHours} onChange={(e) => setForm({ ...form, slaHours: e.target.value })} required />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create department'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.name} subtitle={`Code ${viewing.code}`} icon={<Building2 className="h-5 w-5" aria-hidden="true" />}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat icon={<FileText className="h-4 w-4" />} label="Open" value={viewing.open} />
            <Stat icon={<Loader2 className="h-4 w-4" />} label="In progress" value={viewing.inProgress} />
            <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Overdue / escalated" value={viewing.overdue} />
            <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Resolved" value={viewing.resolved} />
            <Stat icon={<Users className="h-4 w-4" />} label="Officers" value={viewing.officerCount} />
            <Stat icon={<Clock className="h-4 w-4" />} label="SLA target" value={`${viewing.slaHours}h`} />
          </dl>
          {viewing.description && (
            <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{viewing.description}</p>
          )}
        </Modal>
      )}

      <ConfirmDialog
        open={!!deactivateTarget}
        loading={deactivating}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        tone="danger"
        title="Deactivate department"
        confirmLabel="Deactivate"
        message={`Deactivate ${deactivateTarget?.name}? It has ${deactivateTarget?.open || 0} open complaint(s). Existing complaints are retained but the department can no longer be assigned new work.`}
      />

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
      <dd className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <dd className="text-base font-extrabold text-slate-900 dark:text-white">{value}</dd>
      <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
    </div>
  );
}

function DeptCard({ dept, canEdit, canDeactivate, onEdit, onView, onDeactivate }) {
  return (
    <div className="card card-hover flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{dept.name}</h3>
            <p className="text-[11px] text-slate-400">{dept.code} · SLA {dept.slaHours}h</p>
          </div>
        </div>
        {dept.overdue > 0 && (
          <span className="badge shrink-0 border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {dept.overdue} overdue
          </span>
        )}
      </div>

      {dept.description && (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{dept.description}</p>
      )}

      <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 text-center dark:border-slate-800">
        <MiniStat label="Open" value={dept.open} />
        <MiniStat label="Active" value={dept.inProgress} />
        <MiniStat label="Resolved" value={dept.resolved} />
        <MiniStat label="Officers" value={dept.officerCount} />
      </dl>

      <div className="mt-3 flex items-center gap-2">
        <button type="button" className="btn btn-secondary btn-sm flex-1" onClick={onView}>View</button>
        {canEdit && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit} aria-label={`Edit ${dept.name}`}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        {canDeactivate && (
          <button type="button" className="btn btn-ghost btn-sm text-rose-600 dark:text-rose-400" onClick={onDeactivate} aria-label={`Deactivate ${dept.name}`}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

