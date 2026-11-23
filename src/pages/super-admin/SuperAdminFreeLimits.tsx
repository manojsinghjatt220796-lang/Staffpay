import React, { useEffect, useState } from 'react';
import { CheckCircle2, Info, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import {
  FreePlanLimits,
  PLAN_FEATURE_META,
  PlanFeatureKey,
} from '../../types/staffpay';

export function SuperAdminFreeLimits() {
  const { superAdminFetch } = useAuth();
  const { refreshCatalog } = useSubscription();

  const [limits, setLimits] = useState<FreePlanLimits>({
    maxEmployees: 10,
    reportAccess: 'summary',
    allowExcelExport: false,
    allowPdfExport: false,
    trialRestrictions: '',
    maxMonthlyPayrollRuns: 0,
    upgradePromptMessage: '',
  });
  const [features, setFeatures] = useState<Record<PlanFeatureKey, boolean>>(
    {} as Record<PlanFeatureKey, boolean>
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    let active = true;
    superAdminFetch('/api/v1/super-admin/free-limits')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.freeLimits) setLimits(data.freeLimits);
        if (data.features) setFeatures(data.features);
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
    setSaving(true);
    setSavedMsg('');
    try {
      const res = await superAdminFetch('/api/v1/super-admin/free-limits', {
        method: 'PATCH',
        body: JSON.stringify({
          ...limits,
          features,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.freeLimits) setLimits(data.freeLimits);
        if (data.features) setFeatures(data.features);
        await refreshCatalog();
        setSavedMsg('Free Plan limits and feature access updated.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading Free Plan configuration...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Free Plan Limits & Restrictions
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure maximum employees, report visibility, export permissions, and upgrade messaging for Free workspaces
        </p>
      </div>

      <div className="flex items-start gap-2.5 p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <span>
          Adjusting Free Plan limits never deletes existing company employees or historical
          records. If a company exceeds a lower limit after a downgrade or expiry,
          adding new staff is blocked cleanly with your upgrade message until they upgrade.
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Max Employees on Free Plan
            </label>
            <input
              type="number"
              min={1}
              required
              value={limits.maxEmployees}
              onChange={(e) =>
                setLimits({
                  ...limits,
                  maxEmployees: Math.max(1, Number(e.target.value) || 1),
                })
              }
              className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Report Access Level
            </label>
            <select
              value={limits.reportAccess}
              onChange={(e) =>
                setLimits({
                  ...limits,
                  reportAccess: e.target.value as FreePlanLimits['reportAccess'],
                })
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg"
            >
              <option value="none">None (Fully Locked)</option>
              <option value="summary">Summary Only (Compliance Blurred)</option>
              <option value="full">Full Report Access</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Monthly Payroll Runs Allowed
            </label>
            <input
              type="number"
              min={0}
              value={limits.maxMonthlyPayrollRuns ?? 0}
              onChange={(e) =>
                setLimits({
                  ...limits,
                  maxMonthlyPayrollRuns: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={limits.allowExcelExport}
              onChange={(e) =>
                setLimits({ ...limits, allowExcelExport: e.target.checked })
              }
              className="rounded border-gray-300"
            />
            <span>Allow Excel / CSV Export on Free Plan</span>
          </label>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={limits.allowPdfExport}
              onChange={(e) =>
                setLimits({ ...limits, allowPdfExport: e.target.checked })
              }
              className="rounded border-gray-300"
            />
            <span>Allow PDF Export on Free Plan</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Trial / Usage Restriction Summary
          </label>
          <input
            type="text"
            value={limits.trialRestrictions}
            onChange={(e) =>
              setLimits({ ...limits, trialRestrictions: e.target.value })
            }
            className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Upgrade Prompt Message (Displayed When Free Limits Are Reached)
          </label>
          <textarea
            rows={2}
            value={limits.upgradePromptMessage}
            onChange={(e) =>
              setLimits({ ...limits, upgradePromptMessage: e.target.value })
            }
            className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          Available Features on Free Plan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PLAN_FEATURE_META.map((feat) => (
            <label
              key={feat.key}
              className="flex items-center justify-between gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-slate-700 cursor-pointer"
            >
              <span>{feat.label}</span>
              <input
                type="checkbox"
                checked={Boolean(features[feat.key])}
                onChange={(e) =>
                  setFeatures({ ...features, [feat.key]: e.target.checked })
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
            <span>{saving ? 'Saving...' : 'Save Free Plan Limits'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
