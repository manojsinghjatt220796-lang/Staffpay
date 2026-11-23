import React, { useEffect, useState } from 'react';
import { Edit3, ShieldAlert } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  BillingCycle,
  CompanySubscriptionSummary,
  ConfigurablePlan,
  SubscriptionStatus,
} from '../../types/staffpay';

const LIFECYCLE_STATUSES: SubscriptionStatus[] = [
  'free',
  'trial',
  'active',
  'expiring',
  'expired',
  'cancelled',
  'grace_period',
];

export function SuperAdminCompanies() {
  const { superAdminFetch } = useAuth();
  const [companies, setCompanies] = useState<CompanySubscriptionSummary[]>([]);
  const [plans, setPlans] = useState<ConfigurablePlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<CompanySubscriptionSummary | null>(null);
  const [planId, setPlanId] = useState('free');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [status, setStatus] = useState<SubscriptionStatus>('free');
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [compRes, plansRes] = await Promise.all([
        superAdminFetch('/api/v1/super-admin/companies'),
        superAdminFetch('/api/v1/super-admin/plans'),
      ]);
      const compData = await compRes.json();
      const plansData = await plansRes.json();
      if (compRes.ok && Array.isArray(compData.companies)) {
        setCompanies(compData.companies);
      }
      if (plansRes.ok && Array.isArray(plansData.plans)) {
        setPlans(plansData.plans);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openEditor = (comp: CompanySubscriptionSummary) => {
    setError('');
    setEditing(comp);
    setPlanId(comp.planId);
    setBillingCycle(comp.billingCycle);
    setStatus(comp.subscriptionStatus);
    setPaymentVerified(comp.paymentVerified);
    setPaymentRef(comp.lastPaymentRef || '');
    setPaymentAmount(
      comp.lastPaymentAmountInr ? String(comp.lastPaymentAmountInr) : ''
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError('');
    setSaving(true);
    try {
      const res = await superAdminFetch(
        `/api/v1/super-admin/companies/${editing.id}/subscription`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            planId,
            billingCycle,
            subscriptionStatus: status,
            paymentVerified,
            lastPaymentRef: paymentVerified ? paymentRef.trim() : null,
            lastPaymentAmountInr: paymentVerified
              ? Number(paymentAmount) || 0
              : null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error?.message || 'Unable to update subscription.'
        );
      }
      setEditing(null);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to update subscription.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Companies & Subscription Lifecycle
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Inspect tenant companies, monitor headcount against plan limits, and manage subscription states without deleting any company data
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-slate-500">
                <th className="py-3.5 px-5">Company</th>
                <th className="py-3.5 px-5">Plan</th>
                <th className="py-3.5 px-5">Lifecycle Status</th>
                <th className="py-3.5 px-5 text-right">Employees</th>
                <th className="py-3.5 px-5">Payment State</th>
                <th className="py-3.5 px-5 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Loading companies...
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No companies registered yet.
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/70">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500">
                        {c.shortCode} · {c.city || c.country}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-medium text-slate-800">{c.planName}</div>
                      <div className="text-xs text-slate-400 capitalize">
                        {c.billingCycle}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {c.subscriptionStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono tabular-nums text-slate-700">
                      {c.employeeCount} /{' '}
                      {c.maxEmployees === null ? '∞' : c.maxEmployees}
                    </td>
                    <td className="py-3.5 px-5 text-xs">
                      {c.paymentVerified ? (
                        <span className="text-emerald-700 font-medium">
                          Verified ({c.lastPaymentRef})
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          Unbilled / Trial / Free
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => openEditor(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Lifecycle</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Subscription: ${editing.name}` : ''}
        subtitle="Downgrades, expirations, or cancellations preserve all existing employee and payroll records."
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Assigned Plan
              </label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Billing Cycle
              </label>
              <select
                value={billingCycle}
                onChange={(e) =>
                  setBillingCycle(e.target.value as BillingCycle)
                }
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Subscription Lifecycle Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as SubscriptionStatus)
              }
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg"
            >
              {LIFECYCLE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={paymentVerified}
                onChange={(e) => setPaymentVerified(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Record Verified External Payment Reference</span>
            </label>

            {paymentVerified && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Verified Payment Ref / ID
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. pay_Px92kLm..."
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Verified Amount (₹ INR)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 text-[11px] text-slate-500">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Paid plans cannot be marked Active without verified payment data.
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Updating...' : 'Save Subscription'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
