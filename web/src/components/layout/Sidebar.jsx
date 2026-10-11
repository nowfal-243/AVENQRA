import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Shield, ChevronLeft, Radio } from 'lucide-react';
import { visibleNavItems } from '../../app/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

/**
 * Sidebar — collapsible primary navigation with active-route highlighting,
 * role-aware items and a mobile drawer variant.
 */
export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { user } = useAuth();
  const { slaMinutes, isDemo } = useData();
  const location = useLocation();
  const items = visibleNavItems(user);

  const nav = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-slate-200 dark:border-slate-800 ${
          collapsed && !mobileOpen ? 'justify-center px-2' : 'gap-3 px-5'
        }`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-md shadow-cyan-500/20">
          <Shield className="h-5 w-5" aria-hidden="true" />
        </div>
        {(!collapsed || mobileOpen) && (
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold tracking-[0.12em] text-slate-900 dark:text-white">
              AVENQRA
            </p>
            <p className="truncate text-[10px] font-medium text-slate-400">Civic Intelligence</p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="ml-auto hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:block dark:hover:bg-navy-800 dark:hover:text-slate-200"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Primary">
        {(!collapsed || mobileOpen) && (
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            Operations
          </p>
        )}
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={onCloseMobile}
              title={collapsed && !mobileOpen ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex items-center rounded-lg text-sm font-medium transition-colors ${
                collapsed && !mobileOpen ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
              } ${
                active
                  ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-700 dark:from-cyan-500/20 dark:to-blue-500/10 dark:text-cyan-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-slate-100'
              }`}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-cyan-500"
                  aria-hidden="true"
                />
              )}
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-cyan-600 dark:text-cyan-400' : ''}`}
                aria-hidden="true"
              />
              {(!collapsed || mobileOpen) && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto rounded border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer status */}
      <div
        className={`border-t border-slate-200 p-4 dark:border-slate-800 ${
          collapsed && !mobileOpen ? 'px-2' : ''
        }`}
      >
        {collapsed && !mobileOpen ? (
          <div className="flex justify-center" title={isDemo ? 'Demo data source' : 'Live API connected'}>
            <span
              className={`h-2.5 w-2.5 rounded-full ${isDemo ? 'bg-violet-500' : 'bg-emerald-500'}`}
              aria-hidden="true"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-navy-850">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <Radio
                className={`h-3.5 w-3.5 ${isDemo ? 'text-violet-500' : 'text-emerald-500'}`}
                aria-hidden="true"
              />
              {isDemo ? 'Demo data source' : 'Live API connected'}
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
              SLA engine: {slaMinutes}-min policy · escalations run server-side.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 z-40 hidden h-screen shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 lg:block dark:border-slate-800 dark:bg-navy-900 ${
          collapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {nav}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-slide-in-right border-r border-slate-200 bg-white shadow-panel dark:border-slate-800 dark:bg-navy-900">
            <div className="relative h-full">
              <button
                type="button"
                onClick={onCloseMobile}
                className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800"
                aria-label="Close navigation menu"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {nav}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
