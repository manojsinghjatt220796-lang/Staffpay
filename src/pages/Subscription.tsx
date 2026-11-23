import { useState } from 'react';
import { Check, Clock, CreditCard, ShieldAlert, Sparkles } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { BillingCycle } from '../types/staffpay';

export function Subscription() {
  const {
    plans,
    planMeta,
    currentPlanConfig,
    billingCycle,
    subscriptionStatus,
    paymentVerified,
    paymentGatewayConfigured,
    trialEndsAt,
    setPlan,
    handleRazorpayPayment,
    cancelSubscription,
    platformSettings,
  } = useSubscription();

  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(billingCycle);

  const activePlans = plans.filter((p) => p.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header + Cycle Toggle */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500">
            Current Subscription
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-slate-900">
              {planMeta.name} Plan
            </h3>
            <span className="text-xs font-semibold text-blue-700">
              {planMeta.employeeRange}
            </span>
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Status: {subscriptionStatus.replace('_', ' ')}
            </span>
            {!currentPlanConfig.isFree && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded border ${
                  paymentVerified
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {paymentVerified ? 'Payment Verified' : 'Trial / Unbilled'}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Plans, limits, and trial periods are dynamically managed via the platform catalog.
            {trialEndsAt && subscriptionStatus === 'trial' && (
              <span className="ml-1.5 inline-flex items-center gap-1 text-amber-700 font-medium">
                <Clock className="w-3.5 h-3.5" />
                Trial ends {new Date(trialEndsAt).toLocaleDateString('en-IN')}
              </span>
            )}
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-gray-100 border border-gray-200 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSelectedCycle('monthly')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              selectedCycle === 'monthly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setSelectedCycle('yearly')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              selectedCycle === 'yearly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Yearly (Save up to 30%)
          </button>
        </div>
      </div>

      {!paymentGatewayConfigured && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            Payment gateway keys are not yet active on this environment. You can start
            a trial on eligible paid plans, and existing workspace data is always preserved
            on cancellation or downgrade.
          </span>
        </div>
      )}

      {/* Dynamic Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
        {activePlans.map((tier) => {
          const isActive = currentPlanConfig.id === tier.id;
          const isYearlyOnly = tier.monthlyPriceInr === null && tier.annualPriceInr !== null;
          const displayCycle: BillingCycle = isYearlyOnly
            ? 'yearly'
            : selectedCycle;
          const price =
            displayCycle === 'yearly' ? tier.annualPriceInr : tier.monthlyPriceInr;

          return (
            <div
              key={tier.id}
              className={`bg-white rounded-xl p-5 border flex flex-col justify-between transition-colors ${
                isActive
                  ? 'border-blue-600 ring-1 ring-blue-600'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 min-h-[20px]">
                  <span className="text-xs font-medium text-slate-500">
                    {tier.maxEmployees === null
                      ? 'Unlimited employees'
                      : `Up to ${tier.maxEmployees} employees`}
                  </span>
                  {isActive && (
                    <span className="text-xs font-semibold text-blue-600">
                      Current Plan
                    </span>
                  )}
                </div>

                <h4 className="mt-2 text-lg font-semibold text-slate-900">
                  {tier.name}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">{tier.description}</p>

                <div className="mt-4 pb-4 border-b border-gray-100">
                  <div className="text-3xl font-mono tabular-nums font-semibold text-slate-900">
                    ₹{(price ?? 0).toLocaleString('en-IN')}
                    <span className="text-xs font-sans font-normal text-slate-500">
                      {' '}
                      / {displayCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>
                  {tier.isFree ? (
                    <div className="text-[11px] text-slate-500 mt-1">
                      Forever free starter tier
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                      {tier.monthlyPriceInr !== null
                        ? `₹${tier.monthlyPriceInr.toLocaleString('en-IN')}/mo`
                        : 'Yearly billing only'}
                      {tier.annualPriceInr !== null &&
                        tier.monthlyPriceInr !== null &&
                        ` or ₹${tier.annualPriceInr.toLocaleString('en-IN')}/yr`}
                    </div>
                  )}
                </div>

                <ul className="mt-4 space-y-2.5 text-xs text-slate-600">
                  {tier.highlights.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
                {isActive ? (
                  <>
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-4 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg cursor-default"
                    >
                      Current Plan ({subscriptionStatus.replace('_', ' ')})
                    </button>
                    {!tier.isFree && subscriptionStatus !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={cancelSubscription}
                        className="w-full py-1.5 px-3 text-[11px] font-medium text-slate-500 hover:text-rose-700 cursor-pointer"
                      >
                        Cancel Subscription (keeps data safe)
                      </button>
                    )}
                  </>
                ) : tier.isFree ? (
                  <button
                    type="button"
                    onClick={() => setPlan(tier.id, 'monthly')}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-slate-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Switch to {tier.name} (preserves data)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRazorpayPayment(tier.id, displayCycle)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                  >
                    {paymentGatewayConfigured ? (
                      <CreditCard className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {paymentGatewayConfigured
                        ? `Upgrade to ${tier.name}`
                        : platformSettings.trialEnabled && tier.trialDays > 0
                          ? `Start ${tier.trialDays}-Day ${tier.name} Trial`
                          : `Select ${tier.name}`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
