import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMode } from '../../services/mode';
import { API_BASE_URL } from '../../services/apiClient';
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  MapPin,
  Radio,
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    label: 'Super Admin',
    email: 'admin@avenqra.com',
    password: 'admin123',
    tone: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20',
  },
  {
    label: 'Field Officer',
    email: 'officer@avenqra.com',
    password: 'officer123',
    tone: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20',
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!validate()) return;

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      if (result.note) setNotice(result.note);
      const from = location.state?.from;
      const dest = from && from !== '/login' ? from : '/dashboard';
      navigate(dest, { replace: true });
    } else {
      setError(result.error);
    }
  };

  const setPreset = (presetEmail, presetPass) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setErrors({});
    setError('');
    setNotice('');
  };

  const mode = getMode();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-navy-950">
      {/* Brand / value panel */}
      <aside className="relative hidden w-full max-w-md flex-col justify-between overflow-hidden bg-navy-900 p-10 lg:flex xl:max-w-lg">
        <div
          className="absolute inset-0 opacity-40"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(600px circle at 20% 20%, rgba(6,182,212,0.22), transparent 60%), radial-gradient(500px circle at 90% 80%, rgba(37,99,235,0.25), transparent 55%)',
          }}
        />
        <div className="relative">
          <Link to="/login" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-extrabold tracking-[0.18em] text-white">AVENQRA</span>
              <span className="block text-[11px] font-medium text-cyan-400">Civic Intelligence Platform</span>
            </span>
          </Link>

          <h1 className="mt-14 text-3xl font-extrabold leading-tight tracking-tight text-white">
            AI-driven civic
            <br />
            response &amp; resolution
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            Report, classify and dispatch municipal complaints to the nearest responsible officer —
            with a configurable 30-minute SLA escalation engine backed by server-side enforcement.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            {[
              'Intelligent complaint triage & 3-column dispatch board',
              'Live camera reporting with browser GPS tagging',
              'Automatic 30-minute SLA escalation to Super Admin',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-4 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            API: {API_BASE_URL}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            Municipal Operations
          </span>
        </div>
      </aside>

      {/* Sign-in form */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-base font-extrabold tracking-[0.16em] text-slate-900 dark:text-white">
                AVENQRA
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Sign in to the command center
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Official civic complaint &amp; dispatch management portal
          </p>

          {mode === 'demo' && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-3 text-xs text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <strong className="font-bold">Demo mode:</strong> the AVENQRA API is not reachable, so
                sign-in uses local demo accounts and all data stays in this browser.
              </span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {notice}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="login-email" className="label">
                Email address
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@avenqra.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  className={`input pl-9 ${errors.email ? 'input-invalid' : ''}`}
                />
              </div>
              {errors.email && (
                <p id="login-email-error" className="field-error" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="login-password" className="label">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                  className={`input pl-9 pr-10 ${errors.password ? 'input-invalid' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="login-password-error" className="field-error" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
              {loading ? 'Authenticating…' : 'Sign in to portal'}
              {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </form>

          <div className="mt-7 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-navy-900">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quick test credentials
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acct) => (
                <button
                  key={acct.email}
                  type="button"
                  onClick={() => setPreset(acct.email, acct.password)}
                  className={`btn btn-xs border ${acct.tone}`}
                >
                  {acct.label}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[10px] leading-relaxed text-slate-400">
              Sign-ins run against the AVENQRA API when it is reachable; otherwise a clearly-labelled
              local demo session is used.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
