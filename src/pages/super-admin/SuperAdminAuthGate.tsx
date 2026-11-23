import React, { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function SuperAdminAuthGate() {
  const navigate = useNavigate();
  const { loginSuperAdmin, bootstrapSuperAdmin } = useAuth();

  const [checking, setChecking] = useState(true);
  const [superAdminExists, setSuperAdminExists] = useState(true);
  const [envConfigured, setEnvConfigured] = useState(false);

  const [name, setName] = useState('Platform Super Admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/v1/auth/bootstrap-status')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setSuperAdminExists(Boolean(data.superAdminExists));
        setEnvConfigured(Boolean(data.envConfigured));
      })
      .catch(() => {
        if (!active) return;
        setSuperAdminExists(true);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isBootstrapMode = !checking && !superAdminExists && !envConfigured;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isBootstrapMode) {
        await bootstrapSuperAdmin(name.trim(), email.trim(), password);
      } else {
        await loginSuperAdmin(email.trim(), password);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Authentication failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-display font-bold text-lg">
              S
            </div>
            <div>
              <div className="font-display font-bold text-base text-white leading-tight">
                StaffPay Platform
              </div>
              <div className="text-[11px] text-slate-400">
                Super Admin Control Plane
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Workspace</span>
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
              {isBootstrapMode ? (
                <KeyRound className="w-5 h-5 text-blue-400" />
              ) : (
                <Lock className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                {isBootstrapMode
                  ? 'Initialize Platform Super Admin'
                  : 'Super Admin Sign In'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBootstrapMode
                  ? 'First-time setup: claim the sole platform owner account.'
                  : 'Restricted to platform-level Super Admin credentials.'}
              </p>
            </div>
          </div>

          {checking ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Checking platform security status...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isBootstrapMode && (
                <div>
                  <label
                    htmlFor="sa-name"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Administrator Name
                  </label>
                  <input
                    id="sa-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="sa-email"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Super Admin Email
                </label>
                <input
                  id="sa-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@yourdomain.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="sa-password"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Password
                </label>
                <input
                  id="sa-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={isBootstrapMode ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-200"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting
                  ? 'Verifying...'
                  : isBootstrapMode
                    ? 'Claim Super Admin Access'
                    : 'Sign In to Super Admin'}
              </button>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-start gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              Ordinary Company Owners, HR Managers, and Employees are strictly
              isolated and cannot access platform controls.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
