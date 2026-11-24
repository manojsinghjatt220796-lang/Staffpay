import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Palette,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useSubscription } from '../../context/SubscriptionContext';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const THEME_PRESETS = [
  { label: 'Royal Blue', hex: '#2563eb' },
  { label: 'Indigo', hex: '#4f46e5' },
  { label: 'Emerald', hex: '#059669' },
  { label: 'Teal', hex: '#0d9488' },
  { label: 'Slate', hex: '#334155' },
  { label: 'Rose', hex: '#e11d48' },
];

export function AdminSettings() {
  const { settings, loading, updateSettings } = useSettings();
  const { refreshCatalog } = useSubscription();

  const [appName, setAppName] = useState(settings.appName);
  const [appLogoUrl, setAppLogoUrl] = useState(settings.appLogoUrl);
  const [primaryThemeColor, setPrimaryThemeColor] = useState(
    settings.primaryThemeColor
  );
  const [razorpayKeyId, setRazorpayKeyId] = useState(settings.razorpayKeyId);
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [clearRazorpaySecret, setClearRazorpaySecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setAppName(settings.appName);
    setAppLogoUrl(settings.appLogoUrl);
    setPrimaryThemeColor(settings.primaryThemeColor);
    setRazorpayKeyId(settings.razorpayKeyId);
    setLogoError(false);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg('');
    setErrorMsg('');

    const trimmedName = appName.trim();
    if (!trimmedName) {
      setErrorMsg('App Name is required.');
      return;
    }

    if (!HEX_COLOR_RE.test(primaryThemeColor.trim())) {
      setErrorMsg(
        'Primary Theme Color must be a valid 6-digit hex code (e.g. #2563eb).'
      );
      return;
    }

    setSaving(true);
    try {
      await updateSettings({
        appName: trimmedName,
        appLogoUrl: appLogoUrl.trim(),
        primaryThemeColor: primaryThemeColor.trim(),
        razorpayKeyId: razorpayKeyId.trim(),
        ...(razorpayKeySecret.trim()
          ? { razorpayKeySecret: razorpayKeySecret.trim() }
          : {}),
        ...(clearRazorpaySecret ? { clearRazorpaySecret: true } : {}),
      });
      await refreshCatalog();
      setRazorpayKeySecret('');
      setClearRazorpaySecret(false);
      setSavedMsg(
        'Global settings saved. Branding, theme color, and gateway configuration applied immediately.'
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to save settings.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading Super Admin settings...
      </div>
    );
  }

  const normalizedColor = HEX_COLOR_RE.test(primaryThemeColor)
    ? primaryThemeColor
    : '#2563eb';

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Super Admin Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage global white-label branding, primary theme color, and Razorpay
          billing credentials without redeploying code.
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {savedMsg && (
        <div
          role="status"
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* White-Label Branding & Theme */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <Palette className="w-4 h-4 text-brand" />
          <h2 className="text-base font-semibold text-slate-900">
            Branding & Global Theme
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="admin-app-name"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              App Name
            </label>
            <input
              id="admin-app-name"
              type="text"
              required
              maxLength={80}
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="StaffPay"
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-brand"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Displayed in the sidebar header and browser tab title.
            </p>
          </div>

          <div>
            <label
              htmlFor="admin-logo-url"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Logo URL (Optional)
            </label>
            <input
              id="admin-logo-url"
              type="text"
              maxLength={500}
              value={appLogoUrl}
              onChange={(e) => {
                setAppLogoUrl(e.target.value);
                setLogoError(false);
              }}
              placeholder="https://yourdomain.com/logo.png or /logo.png"
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-brand"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Leave blank to use the automatic monogram badge.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          <div>
            <label
              htmlFor="admin-theme-picker"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Primary Theme Color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="admin-theme-picker"
                type="color"
                aria-label="Choose primary theme color"
                value={normalizedColor}
                onChange={(e) => setPrimaryThemeColor(e.target.value)}
                className="w-12 h-10 p-1 rounded-lg border border-gray-300 bg-white cursor-pointer shrink-0"
              />
              <input
                type="text"
                aria-label="Primary theme hex code"
                value={primaryThemeColor}
                onChange={(e) => setPrimaryThemeColor(e.target.value)}
                placeholder="#2563eb"
                maxLength={7}
                className="w-36 px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-brand"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setPrimaryThemeColor(preset.hex)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${
                    primaryThemeColor.toLowerCase() === preset.hex.toLowerCase()
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-gray-200 bg-gray-50 text-slate-700 hover:bg-gray-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Preview Card */}
          <div className="rounded-xl border border-gray-200 bg-slate-950 p-4 text-white flex flex-col justify-between gap-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Sidebar Header Preview
            </div>
            <div className="flex items-center gap-3">
              {appLogoUrl.trim() && !logoError ? (
                <img
                  src={appLogoUrl.trim()}
                  alt={appName || 'App Logo'}
                  onError={() => setLogoError(true)}
                  className="w-9 h-9 rounded-lg object-cover bg-white border border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center text-white font-display font-bold text-lg shrink-0">
                  {(appName.trim()[0] || 'S').toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-display font-bold text-lg text-white truncate">
                  {appName.trim() || 'StaffPay'}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3" />
                  <span>
                    {appLogoUrl.trim() && !logoError
                      ? 'Custom logo active'
                      : 'Monogram badge active'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Razorpay Payment Gateway Credentials */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-4 h-4 text-brand" />
            <h2 className="text-base font-semibold text-slate-900">
              Razorpay Payment Gateway
            </h2>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border self-start ${
              settings.razorpayKeySecretConfigured && settings.razorpayKeyId
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {settings.razorpayKeySecretConfigured && settings.razorpayKeyId
                ? 'Gateway Configured'
                : 'Secret / Key Pending'}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="admin-rzp-key-id"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Razorpay Key ID
            </label>
            <input
              id="admin-rzp-key-id"
              type="text"
              maxLength={120}
              value={razorpayKeyId}
              onChange={(e) => setRazorpayKeyId(e.target.value)}
              placeholder="rzp_live_xxxxxxxxxxxxxx"
              className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-brand"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Public checkout key ID used to initialize Razorpay modal.
            </p>
          </div>

          <div>
            <label
              htmlFor="admin-rzp-key-secret"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Razorpay Key Secret (Write-Only)
            </label>
            <div className="relative">
              <input
                id="admin-rzp-key-secret"
                type={showSecret ? 'text' : 'password'}
                value={razorpayKeySecret}
                onChange={(e) => {
                  setRazorpayKeySecret(e.target.value);
                  if (e.target.value) setClearRazorpaySecret(false);
                }}
                placeholder={
                  settings.razorpayKeySecretConfigured
                    ? '•••••••••••••••• (configured on server)'
                    : 'Enter Razorpay Key Secret'
                }
                autoComplete="new-password"
                className="w-full pl-3.5 pr-10 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-brand"
              />
              <button
                type="button"
                onClick={() => setShowSecret((prev) => !prev)}
                aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showSecret ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Stored securely in SQLite on the server for HMAC verification and
              never exposed back to the browser. Leave blank to keep existing
              secret.
            </p>

            {settings.razorpayKeySecretConfigured && !razorpayKeySecret && (
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearRazorpaySecret}
                  onChange={(e) => setClearRazorpaySecret(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>Clear stored Razorpay Key Secret on save</span>
              </label>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-xs text-slate-500">
            {settings.updatedAt
              ? `Last updated: ${settings.updatedAt}`
              : 'Using initial configuration'}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand hover:bg-brand/90 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </section>
    </form>
  );
}
