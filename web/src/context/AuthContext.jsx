import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api, { TOKEN_KEY, USER_KEY, UNAUTHORIZED_EVENT, normalizeApiError } from '../services/apiClient';
import { getMode, isDemoMode, resolveMode } from '../services/mode';

const AuthContext = createContext(null);

const SESSION_MODE_KEY = 'avenqra_session_mode';

function readStoredSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (token && rawUser) {
      return { token, user: JSON.parse(rawUser) };
    }
  } catch {
    /* corrupted session */
  }
  return { token: null, user: null };
}

function persistSession(token, user, sessionMode) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_MODE_KEY, sessionMode);
  } catch {
    /* storage unavailable — session stays in memory */
  }
}

function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_MODE_KEY);
  } catch {
    /* ignore */
  }
}

const DEMO_ACCOUNTS = {
  'admin@avenqra.com': {
    user: {
      id: 'admin-demo-uuid-101',
      name: 'Super Admin Officer',
      email: 'admin@avenqra.com',
      phone: '+91 9876543210',
      role: 'SUPER_ADMIN',
      isVerified: true,
      avatarUrl: null,
    },
  },
  'officer@avenqra.com': {
    user: {
      id: 'officer-demo-uuid-202',
      name: 'Field Officer Rajesh',
      email: 'officer@avenqra.com',
      phone: '+91 9876543211',
      role: 'OFFICER',
      isVerified: true,
      avatarUrl: null,
      profile: { badgeNumber: 'OFF-901', status: 'ACTIVE' },
    },
  },
};

function localDemoLogin(email, password) {
  const account = DEMO_ACCOUNTS[String(email).trim().toLowerCase()];
  if (!account) {
    return {
      success: false,
      error:
        'Backend is unavailable and this email is not a demo account. Use admin@avenqra.com or officer@avenqra.com.',
    };
  }
  if (!password) return { success: false, error: 'Password is required.' };
  const user = { ...account.user, isDemoSession: true };
  const token = 'demo-session-token';
  persistSession(token, user, 'demo');
  return { success: true, user, token, note: 'Signed in to local demo mode — no server is involved.' };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState(null);

  /* Restore session on boot */
  useEffect(() => {
    const { token: storedToken, user: storedUser } = readStoredSession();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  /* Global 401 handling — expire the session from any API call */
  useEffect(() => {
    const onUnauthorized = (event) => {
      clearSession();
      setToken(null);
      setUser(null);
      setSessionNotice(
        event?.detail?.message || 'Your session has expired. Please sign in again.'
      );
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
    setSessionNotice(null);
  }, []);

  const login = useCallback(async (email, password) => {
    // If mode already resolved to demo (or policy forces demo), never hit the network.
    if (isDemoMode()) {
      return localDemoLogin(email, password);
    }

    try {
      const response = await api.post('/auth/login', { email, password });
      const payload = response.data?.data || {};
      const userData = payload.user;
      const authToken = payload.token;
      if (!userData || !authToken) {
        return { success: false, error: 'Login response was malformed.' };
      }
      persistSession(authToken, userData, 'live');
      setToken(authToken);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const normalized = normalizeApiError(error);

      // Network-level failure: in auto mode, fall back to a labelled demo session.
      if (normalized.isNetworkError) {
        const resolved = await resolveMode();
        if (resolved.mode === 'demo') {
          const demoResult = localDemoLogin(email, password);
          if (demoResult.success) {
            return {
              ...demoResult,
              note: `AVENQRA API unreachable — signed in to local demo mode instead.`,
            };
          }
          return demoResult;
        }
      }
      return { success: false, error: normalized.message };
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      sessionNotice,
      clearNotice: () => setSessionNotice(null),
      isDemoSession: !!user?.isDemoSession,
      mode: getMode(),
    }),
    [user, token, loading, login, logout, sessionNotice]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;