import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CreditCard,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import { Modal } from './Modal';

export function UpgradeModal() {
  const {
    plans,
    upgradeModalOpen,
    closeUpgradeModal,
    lockedFeatureName,
    lockedFeatureReason,
    handleRazorpayPayment,
    razorpayTarget,
    completeRazorpayPayment,
    cancelRazorpayPayment,
    paymentGatewayConfigured,
    platformSettings,
  } = useSubscription();

  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [processing, setProcessing] = useState(false);

  const recommendedPlan =
    plans.find((p) => p.id === 'growth' && p.status === 'active') ||
    plans.find((p) => !p.isFree && p.status === 'active') ||
    plans[0];

  const confirmBillingAction = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      completeRazorpayPayment();
    }, 350);
  };

  return (
    <>
      <Modal
        isOpen={upgradeModalOpen}
        onClose={closeUpgradeModal}
        title="Upgrade to unlock this feature"
        subtitle={lockedFeatureName}
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-sm text-slate-600 leading-relaxed">
              {lockedFeatureReason}
            </div>
          </div>

          {recommendedPlan && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-sm font-semibold text-slate-900">
                  Recommended: {platformSettings.platformName} {recommendedPlan.name} Plan
                </span>
                <span className="text-sm font-mono tabular-nums text-blue-600 font-semibold">
                  ₹
                  {(
                    recommendedPlan.monthlyPriceInr ??
                    recommendedPlan.annualPriceInr ??
                    0
                  ).toLocaleString('en-IN')}{' '}
                  / {recommendedPlan.monthlyPriceInr !== null ? 'month' : 'year'}
                </span>
              </div>
              <ul className="space-y-2.5">
                {recommendedPlan.highlights.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-slate-700"
                  >
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                closeUpgradeModal();
                navigate('/settings');
              }}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Compare all plans →
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={closeUpgradeModal}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {recommendedPlan && (
                <button
                  type="button"
                  onClick={() =>
                    handleRazorpayPayment(
                      recommendedPlan.id,
                      recommendedPlan.monthlyPriceInr !== null ? 'monthly' : 'yearly'
                    )
                  }
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                >
                  <span>
                    {paymentGatewayConfigured
                      ? 'Upgrade Now'
                      : recommendedPlan.trialDays > 0 && platformSettings.trialEnabled
                        ? `Start ${recommendedPlan.trialDays}-Day Trial`
                        : 'View Plan Details'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Billing & Trial Activation Modal */}
      <Modal
        isOpen={Boolean(razorpayTarget)}
        onClose={cancelRazorpayPayment}
        title={
          paymentGatewayConfigured
            ? 'Razorpay Checkout'
            : 'Subscription Activation & Trial'
        }
        subtitle={
          razorpayTarget
            ? `${platformSettings.platformName} ${razorpayTarget.planName} Plan (${razorpayTarget.cycle})`
            : ''
        }
        maxWidthClass="max-w-md"
      >
        {razorpayTarget && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-lg bg-[#0f172a] text-white">
              <div>
                <div className="text-xs text-slate-400">Plan Rate</div>
                <div className="text-2xl font-mono tabular-nums font-semibold mt-0.5">
                  ₹{razorpayTarget.amountInr.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="text-right text-xs text-slate-300">
                <div className="font-medium text-white">
                  {platformSettings.platformName} Billing
                </div>
                <div>
                  {razorpayTarget.cycle === 'yearly' ? 'Annual Plan' : 'Monthly Plan'}
                </div>
              </div>
            </div>

            {paymentGatewayConfigured ? (
              <>
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2">
                    Select Payment Method
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['upi', 'UPI / QR'],
                        ['card', 'Card'],
                        ['netbanking', 'NetBanking'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPaymentMethod(id)}
                        className={`py-2.5 px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                          paymentMethod === id
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-slate-600 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Verified Razorpay payment signature required before marking
                    subscription as Paid Active.
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2.5 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3.5 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">
                    Payment gateway keys not configured yet
                  </div>
                  <p className="mt-1 text-amber-800">
                    {razorpayTarget.trialDays > 0
                      ? `Live billing requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on your server. You can activate a ${razorpayTarget.trialDays}-day unbilled Trial now without falsely marking this account as Paid.`
                      : 'Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server to accept live payments.'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={cancelRazorpayPayment}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              {(paymentGatewayConfigured || razorpayTarget.trialDays > 0) && (
                <button
                  type="button"
                  disabled={processing}
                  onClick={confirmBillingAction}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                >
                  {paymentGatewayConfigured ? (
                    <CreditCard className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>
                    {processing
                      ? 'Activating...'
                      : paymentGatewayConfigured
                        ? `Pay ₹${razorpayTarget.amountInr.toLocaleString('en-IN')}`
                        : `Start ${razorpayTarget.trialDays}-Day Trial`}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
