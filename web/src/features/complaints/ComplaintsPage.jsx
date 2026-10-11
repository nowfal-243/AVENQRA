import React, { useState } from 'react';
import { LayoutGrid, Table2, Camera, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { DataErrorBar } from '../../components/common/DemoBanner';
import ComplaintKanban from './ComplaintKanban';
import ComplaintList from './ComplaintList';
import useComplaints from '../../hooks/useComplaints';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../utils/permissions';

/**
 * ComplaintsPage — the /complaints route. Provides a board / table view
 * toggle over the same live (or demo) complaint dataset. Both sub-views read
 * from the shared DataContext, so a status change in one is reflected in the
 * other after refresh.
 */
export default function ComplaintsPage() {
  const [view, setView] = useState('board');
  const { refresh, isDemo, loading } = useComplaints();
  const { user } = useAuth();
  const canReport = can(user, 'createComplaint') || true; // any signed-in role may file

  return (
    <div>
      <PageHeader
        title="Complaints"
        description="Triage and progress civic complaints through the SLA workflow."
        badge={
          isDemo ? (
            <span className="badge border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
              demo data
            </span>
          ) : null
        }
        actions={
          <>
            <div
              className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-navy-850"
              role="tablist"
              aria-label="Complaints view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={view === 'board'}
                onClick={() => setView('board')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  view === 'board'
                    ? 'bg-white text-cyan-700 shadow-sm dark:bg-navy-800 dark:text-cyan-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" /> Board
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'table'}
                onClick={() => setView('table')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  view === 'table'
                    ? 'bg-white text-cyan-700 shadow-sm dark:bg-navy-800 dark:text-cyan-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Table2 className="h-3.5 w-3.5" aria-hidden="true" /> Triage table
              </button>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={refresh}
              disabled={loading}
              title="Refresh complaints"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
            {canReport && (
              <Link to="/reporter" className="btn btn-primary btn-sm">
                <Camera className="h-3.5 w-3.5" aria-hidden="true" /> Report issue
              </Link>
            )}
          </>
        }
      />

      {view === 'board' ? <ComplaintKanban /> : <ComplaintList />}
    </div>
  );
}
