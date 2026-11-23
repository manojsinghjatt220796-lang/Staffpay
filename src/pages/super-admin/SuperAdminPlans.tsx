import React, { useEffect, useState } from 'react';
import {
  Archive,
  Check,
  Edit3,
  PauseCircle,
  PlayCircle,
  Plus,
} from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import {
  ConfigurablePlan,
  PLAN_FEATURE_META,
  PlanFeatureKey,
  PlanStatus,
} from '../../types/staffpay';

function emptyFeatures(): Record<PlanFeatureKey, boolean> {
  return {
    employeeManagement: true,
    attendanceManagement: true,
    leaveManagement: true,
    monthlyPayroll: false,
    salaryRules: false,
    employeeSelfService: true,
    reportsAnalytics: false,
    excelExport: false,
    pdfExport: false,
    expenseManagement: true,
    loanAdvanceManagement: false,
    notifications: true,
    customDepartments: false,
    customRoles: false,
    multiBranchSupport: false,
    apiAccess: false,
    mobileAppAccess: true,
  };
}

interface PlanFormState {
  id: string | null;
  name: string;
  description: string;
  monthlyPriceInr: string;
  annualPriceInr: string;
  isFree: boolean;
  trialDays: number;
  maxEmployees: string;
  maxCompaniesPerAccount: number;
  status: PlanStatus;
  displayOrder: number;
  durationDays: number;
  gracePeriodDays: number;
  autoRenewDefault: boolean;
  highlightsText: string;
  features: Record<PlanFeatureKey, boolean>;
}

const DEFAULT_FORM: PlanFormState = {
  id: null,
  name: '',
  description: '',
  monthlyPriceInr: '999',
  annualPriceInr: '9999',
  isFree: false,
  trialDays: 14,
  maxEmployees: '100',
  maxCompaniesPerAccount: 1,
  status: 'active',
  displayOrder: 5,
  durationDays: 30,
  gracePeriodDays: 5,
  autoRenewDefault: true,
  highlightsText: '',
  features: emptyFeatures(),
};

const FEATURE_CATEGORIES = [
  'Core',
  'Payroll & Finance',
  'Reports',
  'Platform & Mobile',
] as const;

export function SuperAdminPlans() {
  const { superAdminFetch } = useAuth();
  const { refreshCatalog } = useSubscription();

  const [plans, setPlans] = useState<ConfigurablePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PlanFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await superAdminFetch('/api/v1/super-admin/plans');
      const data = await res.json();
      if (res.ok && Array.isArray(data.plans)) {
        setPlans(data.plans);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlans();
  }, []);

  const openCreateModal = () => {
    setError('');
    setForm({
      ...DEFAULT_FORM,
      displayOrder: plans.length + 1,
      features: emptyFeatures(),
    });
    setModalOpen(true);
  };

  const openEditModal = (plan: ConfigurablePlan) => {
    setError('');
    setForm({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      monthlyPriceInr:
        plan.monthlyPriceInr === null ? '' : String(plan.monthlyPriceInr),
      annualPriceInr:
        plan.annualPriceInr === null ? '' : String(plan.annualPriceInr),
      isFree: plan.isFree,
      trialDays: plan.trialDays,
      maxEmployees: plan.maxEmployees === null ? '' : String(plan.maxEmployees),
      maxCompaniesPerAccount: plan.maxCompaniesPerAccount,
      status: plan.status,
      displayOrder: plan.displayOrder,
      durationDays: plan.durationDays,
      gracePeriodDays: plan.gracePeriodDays,
      autoRenewDefault: plan.autoRenewDefault,
      highlightsText: plan.highlights.join('\n'),
      features: { ...emptyFeatures(), ...plan.features },
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        monthlyPriceInr: form.isFree
          ? 0
          : form.monthlyPriceInr.trim() === ''
            ? null
            : Number(form.monthlyPriceInr),
        annualPriceInr: form.isFree
          ? 0
          : form.annualPriceInr.trim() === ''
            ? null
            : Number(form.annualPriceInr),
        isFree: form.isFree,
        trialDays: Number(form.trialDays) || 0,
        maxEmployees:
          form.maxEmployees.trim() === '' ? null : Number(form.maxEmployees),
        maxCompaniesPerAccount: Number(form.maxCompaniesPerAccount) || 1,
        status: form.status,
        displayOrder: Number(form.displayOrder) || 1,
        durationDays: Number(form.durationDays) || 30,
        gracePeriodDays: Number(form.gracePeriodDays) || 0,
        autoRenewDefault: form.autoRenewDefault,
        highlights: form.highlightsText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        features: form.features,
      };

      const url = form.id
        ? `/api/v1/super-admin/plans/${form.id}`
        : '/api/v1/super-admin/plans';
      const method = form.id ? 'PATCH' : 'POST';

      const res = await superAdminFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to save plan.');
      }

      setModalOpen(false);
      await loadPlans();
      await refreshCatalog();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save plan.');
    } finally {
      setSaving(false);
    }
  };

  const updatePlanStatus = async (planId: string, status: PlanStatus) => {
    const res = await superAdminFetch(
      `/api/v1/super-admin/plans/${planId}/status`,
      {
        method: 'POST',
        body: JSON.stringify({ status }),
      }
    );
    if (res.ok) {
      await loadPlans();
      await refreshCatalog();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Subscription Plan Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create, edit, price, activate, deactivate, or archive subscription plans and toggle all 17 module features without code changes
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Plan</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Loading subscription plans...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {plans.map((plan) => {
            const enabledCount = PLAN_FEATURE_META.filter(
              (f) => plan.features[f.key]
            ).length;

            return (
              <div
                key={plan.id}
                className={`bg-white border rounded-xl p-6 flex flex-col justify-between ${
                  plan.status === 'archived'
                    ? 'border-gray-200 opacity-70'
                    : 'border-gray-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-900">
                          {plan.name}
                        </h2>
                        <span
                          className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded border ${
                            plan.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : plan.status === 'inactive'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-gray-100 text-slate-600 border-gray-300'
                          }`}
                        >
                          {plan.status}
                        </span>
                        {plan.isFree && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Free Tier
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {plan.description}
                      </p>
                    </div>

                    <span className="text-xs font-mono text-slate-400">
                      #{plan.displayOrder}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                    <div>
                      <div className="text-slate-400">Monthly</div>
                      <div className="font-mono font-semibold text-slate-900 mt-0.5">
                        {plan.monthlyPriceInr === null
                          ? 'Annual Only'
                          : `₹${plan.monthlyPriceInr.toLocaleString('en-IN')}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Annual</div>
                      <div className="font-mono font-semibold text-slate-900 mt-0.5">
                        {plan.annualPriceInr === null
                          ? '—'
                          : `₹${plan.annualPriceInr.toLocaleString('en-IN')}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Max Employees</div>
                      <div className="font-mono font-semibold text-slate-900 mt-0.5">
                        {plan.maxEmployees === null
                          ? 'Unlimited'
                          : plan.maxEmployees}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>Trial: {plan.trialDays}d</span>
                    <span>Grace: {plan.gracePeriodDays}d</span>
                    <span>Companies/acct: {plan.maxCompaniesPerAccount}</span>
                    <span>
                      Features: {enabledCount}/{PLAN_FEATURE_META.length}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {PLAN_FEATURE_META.filter((f) => plan.features[f.key]).map(
                      (f) => (
                        <span
                          key={f.key}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                          {f.label}
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(plan)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Plan & Features</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {plan.status !== 'active' && (
                      <button
                        type="button"
                        onClick={() => void updatePlanStatus(plan.id, 'active')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Activate</span>
                      </button>
                    )}
                    {plan.status === 'active' && !plan.isFree && (
                      <button
                        type="button"
                        onClick={() =>
                          void updatePlanStatus(plan.id, 'inactive')
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>Deactivate</span>
                      </button>
                    )}
                    {plan.status !== 'archived' && !plan.isFree && (
                      <button
                        type="button"
                        onClick={() =>
                          void updatePlanStatus(plan.id, 'archived')
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-gray-100 rounded-lg cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archive</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? `Edit Plan: ${form.name}` : 'Create Subscription Plan'}
        subtitle="Changes update live SaaS billing & feature entitlements immediately."
        maxWidthClass="max-w-3xl"
      >
        <form onSubmit={handleSave} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Plan Name
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Plan Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as PlanStatus })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg"
              >
                <option value="active">Active (Visible to customers)</option>
                <option value="inactive">Inactive (Hidden from new signups)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Description
            </label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span>Free Plan Tier (₹0)</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoRenewDefault}
                onChange={(e) =>
                  setForm({ ...form, autoRenewDefault: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <span>Auto-Renewal Enabled by Default</span>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Monthly Price (₹)
              </label>
              <input
                type="number"
                min={0}
                disabled={form.isFree}
                value={form.isFree ? '0' : form.monthlyPriceInr}
                onChange={(e) =>
                  setForm({ ...form, monthlyPriceInr: e.target.value })
                }
                placeholder="Blank = Annual only"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Annual Price (₹)
              </label>
              <input
                type="number"
                min={0}
                disabled={form.isFree}
                value={form.isFree ? '0' : form.annualPriceInr}
                onChange={(e) =>
                  setForm({ ...form, annualPriceInr: e.target.value })
                }
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Max Employees
              </label>
              <input
                type="number"
                min={1}
                value={form.maxEmployees}
                onChange={(e) =>
                  setForm({ ...form, maxEmployees: e.target.value })
                }
                placeholder="Blank = Unlimited"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Max Companies / Acct
              </label>
              <input
                type="number"
                min={1}
                value={form.maxCompaniesPerAccount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxCompaniesPerAccount: Number(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Trial Days
              </label>
              <input
                type="number"
                min={0}
                value={form.trialDays}
                onChange={(e) =>
                  setForm({ ...form, trialDays: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Grace Period (Days)
              </label>
              <input
                type="number"
                min={0}
                value={form.gracePeriodDays}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gracePeriodDays: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Cycle Duration (Days)
              </label>
              <input
                type="number"
                min={1}
                value={form.durationDays}
                onChange={(e) =>
                  setForm({
                    ...form,
                    durationDays: Number(e.target.value) || 30,
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                min={1}
                value={form.displayOrder}
                onChange={(e) =>
                  setForm({
                    ...form,
                    displayOrder: Number(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Marketing Highlights (one per line)
            </label>
            <textarea
              rows={3}
              value={form.highlightsText}
              onChange={(e) =>
                setForm({ ...form, highlightsText: e.target.value })
              }
              className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
            />
          </div>

          {/* 17 Configurable Plan Features */}
          <div className="border-t border-gray-200 pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Configurable Plan Features (17 Capabilities)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURE_CATEGORIES.map((category) => (
                <div
                  key={category}
                  className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-2.5"
                >
                  <div className="text-xs font-semibold text-slate-700">
                    {category}
                  </div>
                  {PLAN_FEATURE_META.filter((f) => f.category === category).map(
                    (feat) => (
                      <label
                        key={feat.key}
                        className="flex items-center justify-between gap-2 text-xs text-slate-700 cursor-pointer"
                      >
                        <span>{feat.label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean(form.features[feat.key])}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              features: {
                                ...form.features,
                                [feat.key]: e.target.checked,
                              },
                            })
                          }
                          className="rounded border-gray-300"
                        />
                      </label>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
