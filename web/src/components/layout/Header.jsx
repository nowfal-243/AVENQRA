import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  LogOut,
  UserCircle2,
  Settings,
  ShieldCheck,
  Timer,
  Activity,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLE_LABELS } from '../../utils/constants';
import { initials, timeAgo } from '../../utils/formatters';
import { visibleNavItems } from '../../app/navigation';

/** Close-on-outside-click helper shared by the header dropdowns. */
function useDismissable(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
}

/**
 * Header — platform identity, global search (⌘K), system health, SLA engine
 * status, notifications, theme toggle and the user menu.
 */
export default function Header({ onOpenMobile }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const {
    health,
    isDemo,
    slaMinutes,
    notifications,
    unreadCount,
    markNotificationRead,
  } = useData();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useRef(null);

  const notifRef = useDismissable(notifOpen, () => setNotifOpen(false));
  const profileRef = useDismissable(profileOpen, () => setProfileOpen(false));
  const searchRefWrap = useDismissable(searchFocused, () => setSearchFocused(false));

  const { complaints } = useData();

  /* ⌘K / Ctrl+K global shortcut */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return complaints
      .filter(
        (c) =>
          (c.ticketNumber || '').toLowerCase().includes(q) ||
          (c.title || '').toLowerCase().includes(q) ||
          (c.location?.addressFormatted || '').toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, complaints]);

  const submitSearch = useCallback(
    (e) => {
      e?.preventDefault();
      const q = query.trim();
      setSearchFocused(false);
      searchRef.current?.blur();
      navigate(q ? `/complaints?q=${encodeURIComponent(q)}` : '/complaints');
    },
    [navigate, query]
  );

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
    } catch (error) {
      console.warn('Could not mark notification read:', error.message);
    }
  };

  const healthDot = health === null ? 'bg-amber-400 animate-pulse' : health.ok ? 'bg-emerald-500' : 'bg-rose-500';
  const healthLabel = health === null ? 'Checking…' : health.ok ? `API ${health.latencyMs}ms` : 'API offline';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-navy-900/85">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
        {/* Mobile: menu + brand */}
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-navy-800"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <Link to="/dashboard" className="flex items-center gap-2 lg:hidden" aria-label="AVENQRA home">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-white">
            <ShieldCheck className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden="true" />
          </div>
          <span className="text-sm font-extrabold tracking-[0.12em] text-slate-900 dark:text-white">AVENQRA</span>
        </Link>

        {/* Global search */}
        <div ref={searchRefWrap} className="relative min-w-0 flex-1 max-w-xl">
          <form onSubmit={submitSearch} role="search">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search tickets, titles, locations…"
              aria-label="Search complaints"
              className="input h-9 w-full border-slate-200 bg-slate-50 pl-9 pr-14 text-sm dark:border-slate-700 dark:bg-navy-850"
            />
            <span className="kbd pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 sm:inline-flex" aria-hidden="true">
              ⌘K
            </span>
          </form>

          {searchFocused && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-panel dark:border-slate-700 dark:bg-navy-850">
              <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                Complaints
              </div>
              {results.length === 0 ? (
                <p className="px-3 py-4 text-xs text-slate-500">No matching complaints.</p>
              ) : (
                <ul>
                  {results.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-navy-800"
                        onClick={() => {
                          setSearchFocused(false);
                          setQuery('');
                          navigate(`/complaints?focus=${encodeURIComponent(c.id)}`);
                        }}
                      >
                        <Inbox className="h-4 w-4 shrink-0 text-cyan-500" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {c.ticketNumber} · {c.title}
                          </span>
                          <span className="block truncate text-[11px] text-slate-400">
                            {c.location?.addressFormatted || 'No location'} · {timeAgo(c.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
                <button
                  type="button"
                  className="text-[11px] font-semibold text-cyan-600 hover:underline dark:text-cyan-400"
                  onClick={submitSearch}
                >
                  Open triage with this search →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* SLA engine status */}
          <Link
            to="/settings"
            className="hidden items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-[11px] font-bold text-cyan-700 transition hover:border-cyan-300 md:inline-flex dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300"
            title={`Configurable ${slaMinutes}-minute SLA window. Deadline checks and escalations run on the server; browser countdowns are display-only.`}
          >
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            {slaMinutes}m SLA
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          </Link>

          {/* System health */}
          <div
            className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 sm:inline-flex dark:border-slate-700 dark:bg-navy-850 dark:text-slate-300"
            title={
              health
                ? `AVENQRA API health: ${health.ok ? 'OK' : 'unreachable'} (${health.latencyMs}ms)`
                : 'Probing AVENQRA API health…'
            }
          >
            <span className={`h-2 w-2 rounded-full ${healthDot}`} aria-hidden="true" />
            {healthLabel}
            {isDemo && (
              <span className="badge border-violet-200 bg-violet-100 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                demo
              </span>
            )}
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-navy-800 dark:hover:text-white"
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="h-[18px] w-[18px]" aria-hidden="true" /> : <Moon className="h-[18px] w-[18px]" aria-hidden="true" />}
          </button>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((v) => !v);
                setProfileOpen(false);
              }}
              className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-navy-800 dark:hover:text-white"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={notifOpen}
              aria-haspopup="true"
            >
              <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 z-50 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-panel dark:border-slate-700 dark:bg-navy-850">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Notifications</p>
                  <span className="text-[10px] text-slate-400">{unreadCount} unread</span>
                </div>
                <ul className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 && (
                    <li className="flex flex-col items-center px-4 py-8 text-center">
                      <CheckCircle2 className="mb-2 h-6 w-6 text-slate-300" aria-hidden="true" />
                      <p className="text-xs text-slate-500">You're all caught up.</p>
                    </li>
                  )}
                  {notifications.slice(0, 12).map((n) => (
                    <li
                      key={n.id}
                      className={`border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800/70 ${
                        n.isRead ? 'opacity-60' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!n.isRead) handleMarkRead(n.id);
                          setNotifOpen(false);
                        }}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-2">
                          {!n.isRead && (
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" aria-hidden="true" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {n.title}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                              {n.message}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* User menu */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((v) => !v);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg p-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-navy-800"
              aria-expanded={profileOpen}
              aria-haspopup="true"
              aria-label="Account menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white">
                {initials(user?.name)}
              </span>
              <span className="hidden text-left md:block">
                <span className="block max-w-[140px] truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                  {user?.name || 'User'}
                </span>
                <span className="block text-[10px] font-semibold text-cyan-600 dark:text-cyan-400">
                  {ROLE_LABELS[user?.role] || user?.role}
                </span>
              </span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-panel dark:border-slate-700 dark:bg-navy-850">
                <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{user?.name}</p>
                  <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
                  <span className="badge mt-1.5 border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
                    {ROLE_LABELS[user?.role] || user?.role}
                  </span>
                  {user?.isDemoSession && (
                    <span className="badge ml-1 border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                      demo session
                    </span>
                  )}
                </div>
                <div className="p-1.5">
                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-navy-800"
                  >
                    <UserCircle2 className="h-4 w-4" aria-hidden="true" /> Profile & preferences
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-navy-800"
                  >
                    <Settings className="h-4 w-4" aria-hidden="true" /> Portal settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
                  </button>
                </div>
                <div className="flex items-center gap-1.5 border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10px] text-slate-400 dark:border-slate-800 dark:bg-navy-900">
                  <Activity className="h-3 w-3" aria-hidden="true" />
                  {isDemo ? 'Demo data source active' : 'Connected to live API'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
