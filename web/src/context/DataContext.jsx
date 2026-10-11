import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import complaintService from '../services/complaintService';
import departmentService from '../services/departmentService';
import officerService from '../services/officerService';
import notificationService from '../services/notificationService';
import { getMode, resolveMode, setMode, subscribeMode, getLastError } from '../services/mode';
import { checkHealth } from '../services/apiClient';
import { subscribeDemoStore } from '../services/demoStore';
import { getSlaMinutes, setSlaMinutes as persistSlaMinutes } from '../utils/permissions';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

const POLL_INTERVAL_MS = 30000; // complaint refresh cadence (paused when tab hidden)
const HEALTH_INTERVAL_MS = 60000;

const initialLoading = { complaints: false, departments: false, officers: false, notifications: false };
const initialErrors = { complaints: null, departments: null, officers: null, notifications: null };

export function DataProvider({ children }) {
  const { token } = useAuth();
  const [mode, setModeState] = useState(getMode());
  const [modeError, setModeError] = useState(getLastError());
  const [health, setHealth] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(initialLoading);
  const [errors, setErrors] = useState(initialErrors);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [slaMinutes, setSlaMinutesState] = useState(getSlaMinutes());
  const [demoNotice, setDemoNotice] = useState(null);

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const fetchingRef = useRef(false);

  useEffect(
    () =>
      subscribeMode((nextMode, err) => {
        setModeState(nextMode);
        setModeError(err);
      }),
    []
  );

  const markLoading = useCallback((key, value) => {
    setLoading((prev) => ({ ...prev, [key]: value }));
  }, []);

  const markError = useCallback((key, value) => {
    setErrors((prev) => ({ ...prev, [key]: value }));
  }, []);

  /** Fall back to demo data with an explicit, visible notice. */
  const enterDemoMode = useCallback((reason) => {
    setMode('demo', reason);
    setDemoNotice(reason || 'Live API unavailable.');
  }, []);

  const loadComplaints = useCallback(async () => {
    markLoading('complaints', true);
    markError('complaints', null);
    try {
      const { rows } = await complaintService.list();
      setComplaints(rows);
      setLastUpdated(new Date());
      return rows;
    } catch (error) {
      markError('complaints', error.message);
      if (modeRef.current === 'live' && (error.isNetworkError || (error.status && error.status >= 500))) {
        enterDemoMode(`Live API error: ${error.message}`);
      }
      return null;
    } finally {
      markLoading('complaints', false);
    }
  }, [enterDemoMode, markError, markLoading]);

  const loadDepartments = useCallback(async () => {
    markLoading('departments', true);
    markError('departments', null);
    try {
      const { rows } = await departmentService.list();
      setDepartments(rows);
      return rows;
    } catch (error) {
      markError('departments', error.message);
      return null;
    } finally {
      markLoading('departments', false);
    }
  }, [markError, markLoading]);

    const loadOfficers = useCallback(async () => {
    markLoading('officers', true);
    markError('officers', null);
    try {
      const { rows } = await officerService.list();
      setOfficers(rows);
      return rows;
    } catch (error) {
      markError('officers', error.message);
      return null;
    } finally {
      markLoading('officers', false);
    }
  }, [markError, markLoading]);

  const loadNotifications = useCallback(async () => {
    if (!token) return [];
    markLoading('notifications', true);
    markError('notifications', null);
    try {
      const { rows } = await notificationService.list();
      setNotifications(rows);
      return rows;
    } catch (error) {
      markError('notifications', error.message);
      return [];
    } finally {
      markLoading('notifications', false);
    }
  }, [markError, markLoading, token]);

  const refreshAll = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      await Promise.all([loadComplaints(), loadDepartments(), loadOfficers(), loadNotifications()]);
    } finally {
      fetchingRef.current = false;
    }
  }, [loadComplaints, loadDepartments, loadOfficers, loadNotifications]);

  /* Initial mode resolution + first data load */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { mode: resolved, health: healthResult } = await resolveMode();
      if (cancelled) return;
      setModeState(resolved);
      setHealth(healthResult);
      if (resolved === 'demo' && healthResult && !healthResult.ok) {
        setDemoNotice(
          `Backend unreachable at startup (${healthResult.error}). Showing clearly-labelled demo data.`
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Reload when a session appears; clear private data on logout */
  useEffect(() => {
    if (token) {
      refreshAll();
    } else {
      setComplaints([]);
      setNotifications([]);
      setLastUpdated(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, mode]);

  /* Demo store subscription — reflect local mutations immediately */
  useEffect(() => {
    if (mode !== 'demo') return undefined;
    const unsubscribe = subscribeDemoStore(() => {
      complaintService.list().then(({ rows }) => setComplaints(rows)).catch(() => {});
      departmentService.list().then(({ rows }) => setDepartments(rows)).catch(() => {});
      officerService.list().then(({ rows }) => setOfficers(rows)).catch(() => {});
    });
    return unsubscribe;
  }, [mode]);

    /* Single polling timer for live data (paused while tab hidden) */
  useEffect(() => {
    if (mode !== 'live' || !token) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !fetchingRef.current) {
        loadComplaints();
        loadNotifications();
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [mode, token, loadComplaints, loadNotifications]);

  /* Single health probe timer */
  useEffect(() => {
    const timer = setInterval(async () => {
      const result = await checkHealth();
      setHealth(result);
      if (!result.ok && modeRef.current === 'live') {
        enterDemoMode(`Backend health check failed: ${result.error}`);
      }
    }, HEALTH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enterDemoMode]);

  /** Manually re-probe the backend and reload everything. */
  const retryConnection = useCallback(async () => {
    setDemoNotice(null);
    const { mode: resolved, health: healthResult } = await resolveMode();
    setModeState(resolved);
    setHealth(healthResult);
    await refreshAll();
    return resolved;
  }, [refreshAll]);

  const updateSlaMinutes = useCallback((minutes) => {
    persistSlaMinutes(minutes);
    setSlaMinutesState(minutes);
  }, []);

  const patchComplaint = useCallback((updated) => {
    setComplaints((list) => {
      if (!updated || !updated.id) return list;
      const idx = list.findIndex((c) => c.id === updated.id);
      if (idx === -1) return [updated, ...list];
      const next = [...list];
      next[idx] = { ...next[idx], ...updated };
      return next;
    });
    setLastUpdated(new Date());
  }, []);

  const markNotificationRead = useCallback(async (id) => {
    try {
      await notificationService.markRead(id);
      setNotifications((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (error) {
      throw error;
    }
  }, []);

  const isDemo = mode === 'demo';

  const value = useMemo(
    () => ({
      mode,
      modeError,
      isDemo,
      demoNotice,
      health,
      complaints,
      departments,
      officers,
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
      loading,
      errors,
      lastUpdated,
      slaMinutes,
      updateSlaMinutes,
      refreshAll,
      refreshComplaints: loadComplaints,
      refreshDepartments: loadDepartments,
      refreshOfficers: loadOfficers,
      refreshNotifications: loadNotifications,
      retryConnection,
      patchComplaint,
      markNotificationRead,
    }),
    [
      mode, modeError, isDemo, demoNotice, health, complaints, departments, officers, notifications,
      loading, errors, lastUpdated, slaMinutes, updateSlaMinutes, refreshAll, loadComplaints,
      loadDepartments, loadOfficers, loadNotifications, retryConnection, patchComplaint,
      markNotificationRead,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}

export default DataContext;

