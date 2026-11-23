import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  IndianRupee,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SuperAdminDashboardMetrics } from '../../types/staffpay';

export function SuperAdminDashboard() {
  const { superAdminFetch } = useAuth();
  const [metrics, setMetrics] = useState<SuperAdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await superAdminFetch('/api/v1/super-admin/dashboard');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to load metrics.');
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMetrics();
  }, []);

  if (loading && !metrics) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">
        Loading platform telemetry...
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6 bg-white border border-rose-200 rounded-xl text-sm text-rose-700">
        {error || 'Unable to load dashboard metrics.'}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Registered Companies',
      value: metrics.totalCompanies,
      icon: Building2,
      sub: 'All tenant organizations',
    },
    {
      label: 'Active Companies',
      value: metrics.activeCompanies,
      icon: CheckCircle2,
      sub: 'Free, trial, active & grace',
    },
    {
      label: 'Free Plan Companies',
      value: metrics.freePlanCompanies,
      icon: Building2,
      sub: 'Unbilled starter tier',
    },
    {
      label: 'Paid Subscribers',
      value: metrics.paidSubscribers,
      icon: CreditCard,
      sub: 'Verified payment accounts only',
    },
    {
      label: 'Trial Accounts',
      value: metrics.trialAccounts,
      icon: Clock,
      sub: 'Active evaluation periods',
    },
    {
      label: 'Expired Subscriptions',
      value: metrics.expiredSubscriptions,
      icon: XCircle,
      sub: 'Requires renewal or downgrade',
    },
    {
      label: 'Total Employees Across Platform',
      value: metrics.totalEmployees,
      icon: Users,
      sub: 'Non-archived active staff',
    },
    {
      label: 'Monthly Subscription Revenue',
      value:
        metrics.verifiedTransactionCount > 0
          ? `₹${metrics.monthlySubscriptionRevenueInr.toLocaleString('en-IN')}`
          : '₹0',
      icon: IndianRupee,
      sub: metrics.paymentGatewayConfigured
        ? `${metrics.verifiedTransactionCount} verified transactions this month`
        : 'Awaiting configured payment gateway data',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Platform Super Admin Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time overview of registered companies, subscription tiers, and verified revenue
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadMetrics()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {!metrics.paymentGatewayConfigured && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Payment gateway not connected:</span>{' '}
            Monthly subscription revenue only counts real verified transactions from
            your configured payment gateway (`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`).
            Unverified accounts are never marked as Paid Subscribers.
          </div>
        </div>
      )}

      {/* 8 Key KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                  {card.label}
                </span>
                <Icon className="w-4 h-4 text-blue-600 shrink-0" />
              </div>
              <div className="mt-3 text-2xl font-mono tabular-nums font-semibold text-slate-900">
                {card.value}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Subscription Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Subscription Overview by Plan
          </h2>
          <div className="space-y-3">
            {metrics.planBreakdown.map((item) => {
              const pct =
                metrics.totalCompanies > 0
                  ? Math.round((item.companyCount / metrics.totalCompanies) * 100)
                  : 0;
              return (
                <div key={item.planId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">
                      {item.planName}{' '}
                      <span className="text-xs text-slate-400">
                        ({item.isFree ? 'Free' : 'Paid Tier'})
                      </span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-700 font-medium">
                      {item.companyCount} companies ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-blue-600 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Subscription Lifecycle Breakdown
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {metrics.statusBreakdown.map((st) => (
              <div
                key={st.status}
                className="p-3.5 rounded-lg bg-gray-50 border border-gray-200"
              >
                <div className="text-[11px] font-mono uppercase text-slate-500">
                  {st.status.replace('_', ' ')}
                </div>
                <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-slate-900">
                  {st.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
