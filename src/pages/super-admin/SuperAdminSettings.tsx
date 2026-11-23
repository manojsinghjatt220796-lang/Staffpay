import React, { useEffect, useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { ConfigurablePlan, PlatformSettings } from '../../types/staffpay';

export function SuperAdminSettings() {
  const { superAdminFetch } = useAuth();
  const { refreshCatalog } = useSubscription();

  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [plans, setPlans] = useState<ConfigurablePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      superAdminFetch('/api/v1/super-admin/settings').then((r) => r.json()),
      superAdminFetch('/api/v1/super-admin/plans').then((r) => r.json()),
    ])
      .then(([sData, pData]) => {
        if (!active) return;
        if (sData.settings) setSettings(sData.settings);
        if (Array.isArray(pData.plans)) setPlans(pData.plans);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSavedMsg('');
    try {
      const res = await superAdminFetch('/api/v1/super-admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        await refreshCatalog();
        setSavedMsg('Platform settings saved and applied.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading platform settings...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Platform Admin Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure global SaaS branding, support details, trial defaults, registration rules, and server limit enforcement
        </p>
      </div>

      {/* Branding & Support */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          Platform Identity & Support
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Platform Name
            </label>
            <input
              type="text"
              required
              value={settings.platformName}
              onChange={(e) =>
                setSettings({ ...settings, platformName: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Logo URL (Optional)
            </label>
            <input
              type="text"
              value={settings.logoUrl}
              onChange={(e) =>
                setSettings({ ...settings, logoUrl: e.target.value })
              }
              placeholder="https://yourdomain.com/logo.png"
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Default Currency
            </label>
            <input
              type="text"
              disabled
              value="INR (₹)"
              className="w-full px-3.5 py-2 text-sm font-mono bg-gray-100 border border-gray-300 rounded-lg text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Default Language
            </label>
            <select
              value={settings.defaultLanguage}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultLanguage: e.target.value === 'hi' ? 'hi' : 'en',
                })
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg"
            >
              <option value="en">English (EN)</option>
              <option value="hi">Hindi (हिन्दी)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Support Email
            </label>
            <input
              type="email"
              required
              value={settings.supportEmail}
              onChange={(e) =>
                setSettings({ ...settings, supportEmail: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Support Contact Number
            </label>
            <input
              type="text"
              required
              value={settings.supportContact}
              onChange={(e) =>
                setSettings({ ...settings, supportContact: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Trial, Subscription & Company Registration Rules */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <h2 className="text-base font-semibold text-slate-900">
          Trial, Subscription & Registration Rules
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Default Plan for New Companies
            </label>
            <select
              value={settings.defaultPlanId}
              onChange={(e) =>
                setSettings({ ...settings, defaultPlanId: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Default Trial Duration (Days)
            </label>
            <input
              type="number"
              min={0}
              value={settings.defaultTrialDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultTrialDays: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Default Grace Period (Days)
            </label>
            <input
              type="number"
              min={0}
              value={settings.gracePeriodDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  gracePeriodDays: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {(
            [
              ['trialEnabled', 'Enable Paid Plan Free Trials'],
              ['allowSelfRegistration', 'Allow Company Self-Registration'],
              ['requireEmailVerification', 'Require Email Verification on Signup'],
              ['autoDowngradeOnExpiry', 'Auto-Downgrade to Free Plan on Expiry (Keeps Data)'],
              ['enforceServerLimits', 'Enforce Plan Feature & Employee Limits Server-Side'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-slate-700 cursor-pointer"
            >
              <span>{label}</span>
              <input
                type="checkbox"
                checked={Boolean(settings[key])}
                onChange={(e) =>
                  setSettings({ ...settings, [key]: e.target.checked })
                }
                className="rounded border-gray-300"
              />
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-xs text-emerald-700 flex items-center gap-1.5">
            {savedMsg && (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{savedMsg}</span>
              </>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Platform Settings'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
