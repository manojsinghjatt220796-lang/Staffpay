import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  BillingCycle,
  ConfigurablePlan,
  FreePlanLimits,
  PlanFeatureKey,
  PlanTier,
  PlatformSettings,
  SubscriptionStatus,
} from '../types/staffpay';
import { useSettings } from './SettingsContext';

export interface PlanDefinition {
  id: PlanTier;
  name: string;
  tagline: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  employeeRange: string;
  maxEmployees: number | null;
  features: string[];
}

export const PLAN_CATALOG: Record<PlanTier, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'For early-stage teams getting started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    employeeRange: '0–10 employees',
    maxEmployees: 10,
    features: [
      'Up to 10 employees',
      'Basic daily attendance register',
      'Leave request tracking',
      'View-only payroll estimates',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'For growing small businesses',
    monthlyPrice: 299,
    yearlyPrice: 2500,
    employeeRange: '11–25 employees',
    maxEmployees: 25,
    features: [
      '11–25 employees',
      'Automated payroll runs & salary rules',
      'Overtime & LWP deduction automation',
      'CSV register downloads',
    ],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    tagline: 'For scaling multi-department teams',
    monthlyPrice: 499,
    yearlyPrice: 4499,
    employeeRange: '26–80 employees',
    maxEmployees: 80,
    features: [
      '26–80 employees',
      'Role-based access control (Team & Access)',
      'PF / ESI compliance & PDF/Excel exports',
      'GPS geo-fenced attendance verification',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Annual volume licensing for large fleets',
    monthlyPrice: null,
    yearlyPrice: 7999,
    employeeRange: '81–149+ employees',
    maxEmployees: null,
    features: [
      '81–149+ unlimited employees',
      'Multi-entity company switching',
      'Dedicated compliance audit & priority SLA',
      'Custom statutory & loan rules',
    ],
  },
};

function makeFallbackFeatures(
  overrides: Partial<Record<PlanFeatureKey, boolean>>,
  def = false
): Record<PlanFeatureKey, boolean> {
  return {
    employeeManagement: def,
    attendanceManagement: def,
    leaveManagement: def,
    monthlyPayroll: def,
    salaryRules: def,
    employeeSelfService: def,
    reportsAnalytics: def,
    excelExport: def,
    pdfExport: def,
    expenseManagement: def,
    loanAdvanceManagement: def,
    notifications: def,
    customDepartments: def,
    customRoles: def,
    multiBranchSupport: def,
    apiAccess: def,
    mobileAppAccess: def,
    ...overrides,
  };
}

const FALLBACK_FREE_LIMITS: FreePlanLimits = {
  maxEmployees: 10,
  reportAccess: 'summary',
  allowExcelExport: false,
  allowPdfExport: false,
  trialRestrictions:
    'View-only payroll estimates; automated payroll & compliance exports locked.',
  maxMonthlyPayrollRuns: 0,
  upgradePromptMessage:
    'You have reached the Free Plan limit. Upgrade your workspace plan to unlock more employees, automated payroll, and compliance exports.',
};

const FALLBACK_CONFIG_PLANS: ConfigurablePlan[] = [
  {
    id: 'free',
    slug: 'free',
    name: 'Free',
    description: PLAN_CATALOG.free.tagline,
    monthlyPriceInr: 0,
    annualPriceInr: 0,
    isFree: true,
    trialDays: 0,
    maxEmployees: 10,
    maxCompaniesPerAccount: 1,
    status: 'active',
    displayOrder: 1,
    durationDays: 30,
    gracePeriodDays: 0,
    autoRenewDefault: false,
    features: makeFallbackFeatures({
      employeeManagement: true,
      attendanceManagement: true,
      leaveManagement: true,
      employeeSelfService: true,
      expenseManagement: true,
      notifications: true,
      mobileAppAccess: true,
    }),
    highlights: PLAN_CATALOG.free.features,
    freeLimits: FALLBACK_FREE_LIMITS,
  },
  {
    id: 'starter',
    slug: 'starter',
    name: 'Starter',
    description: PLAN_CATALOG.starter.tagline,
    monthlyPriceInr: 299,
    annualPriceInr: 2500,
    isFree: false,
    trialDays: 14,
    maxEmployees: 25,
    maxCompaniesPerAccount: 1,
    status: 'active',
    displayOrder: 2,
    durationDays: 30,
    gracePeriodDays: 5,
    autoRenewDefault: true,
    features: makeFallbackFeatures({
      employeeManagement: true,
      attendanceManagement: true,
      leaveManagement: true,
      monthlyPayroll: true,
      salaryRules: true,
      employeeSelfService: true,
      expenseManagement: true,
      loanAdvanceManagement: true,
      notifications: true,
      customDepartments: true,
      mobileAppAccess: true,
    }),
    highlights: PLAN_CATALOG.starter.features,
  },
  {
    id: 'growth',
    slug: 'growth',
    name: 'Growth',
    description: PLAN_CATALOG.growth.tagline,
    monthlyPriceInr: 499,
    annualPriceInr: 4499,
    isFree: false,
    trialDays: 14,
    maxEmployees: 80,
    maxCompaniesPerAccount: 3,
    status: 'active',
    displayOrder: 3,
    durationDays: 30,
    gracePeriodDays: 7,
    autoRenewDefault: true,
    features: makeFallbackFeatures({ multiBranchSupport: false }, true),
    highlights: PLAN_CATALOG.growth.features,
  },
  {
    id: 'enterprise',
    slug: 'enterprise',
    name: 'Enterprise',
    description: PLAN_CATALOG.enterprise.tagline,
    monthlyPriceInr: null,
    annualPriceInr: 7999,
    isFree: false,
    trialDays: 14,
    maxEmployees: null,
    maxCompaniesPerAccount: 25,
    status: 'active',
    displayOrder: 4,
    durationDays: 365,
    gracePeriodDays: 15,
    autoRenewDefault: true,
    features: makeFallbackFeatures({}, true),
    highlights: PLAN_CATALOG.enterprise.features,
  },
];

const FALLBACK_SETTINGS: PlatformSettings = {
  platformName: 'StaffPay',
  logoUrl: '',
  defaultCurrency: 'INR',
  defaultLanguage: 'en',
  supportEmail: 'support@staffpay.in',
  supportContact: '+91 22 4890 1200',
  trialEnabled: true,
  defaultTrialDays: 14,
  defaultPlanId: 'free',
  allowSelfRegistration: true,
  requireEmailVerification: false,
  autoDowngradeOnExpiry: true,
  gracePeriodDays: 5,
  enforceServerLimits: true,
};

export interface RazorpayCheckoutTarget {
  plan: string;
  planName: string;
  cycle: BillingCycle;
  amountInr: number;
  trialDays: number;
}

interface SubscriptionContextValue {
  plan: string;
  billingCycle: BillingCycle;
  planMeta: PlanDefinition;
  currentPlanConfig: ConfigurablePlan;
  plans: ConfigurablePlan[];
  freeLimits: FreePlanLimits;
  platformSettings: PlatformSettings;
  subscriptionStatus: SubscriptionStatus;
  paymentVerified: boolean;
  paymentGatewayConfigured: boolean;
  trialEndsAt: string | null;
  isFree: boolean;
  isPaid: boolean;
  hasRbacAccess: boolean;
  hasAutomatedPayroll: boolean;
  hasReportExports: boolean;
  canExportExcel: boolean;
  canExportPdf: boolean;
  reportAccessLevel: 'none' | 'summary' | 'full';
  employeeLimit: number | null;
  hasFeature: (feature: PlanFeatureKey) => boolean;
  upgradeModalOpen: boolean;
  lockedFeatureName: string;
  lockedFeatureReason: string;
  razorpayTarget: RazorpayCheckoutTarget | null;
  openUpgradeModal: (featureName?: string, reason?: string) => void;
  closeUpgradeModal: () => void;
  setPlan: (plan: string, cycle?: BillingCycle) => void;
  startTrial: (targetPlanId: string) => void;
  cancelSubscription: () => void;
  handleRazorpayPayment: (targetPlan: string, cycle: BillingCycle) => void;
  completeRazorpayPayment: () => void;
  cancelRazorpayPayment: () => void;
  refreshCatalog: () => Promise<void>;
}

const SubscriptionContext = createContext<
  SubscriptionContextValue | undefined
>(undefined);

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings: globalSettings } = useSettings();
  const [plans, setPlans] = useState<ConfigurablePlan[]>(FALLBACK_CONFIG_PLANS);
  const [freeLimits, setFreeLimits] =
    useState<FreePlanLimits>(FALLBACK_FREE_LIMITS);
  const [platformSettings, setPlatformSettings] =
    useState<PlatformSettings>(FALLBACK_SETTINGS);
  const [paymentGatewayConfigured, setPaymentGatewayConfigured] =
    useState(false);

  const [plan, setPlanState] = useState<string>('free');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>('free');
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [lockedFeatureName, setLockedFeatureName] = useState('Growth Plan');
  const [lockedFeatureReason, setLockedFeatureReason] = useState(
    'Upgrade your workspace plan to unlock this capability.'
  );
  const [razorpayTarget, setRazorpayTarget] =
    useState<RazorpayCheckoutTarget | null>(null);

  const refreshCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/platform/public');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.plans) && data.plans.length > 0) {
        setPlans(data.plans);
      }
      if (data.freeLimits) {
        setFreeLimits(data.freeLimits);
      }
      if (data.settings) {
        setPlatformSettings((prev) => ({ ...prev, ...data.settings }));
      }
      setPaymentGatewayConfigured(Boolean(data.paymentGatewayConfigured));
    } catch {
      // Keep baseline catalog if offline during isolated unit render
    }
  }, []);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  const currentPlanConfig = useMemo(() => {
    const matched = plans.find((p) => p.id === plan || p.slug === plan);
    if (matched) return matched;
    return plans.find((p) => p.isFree) || plans[0] || FALLBACK_CONFIG_PLANS[0];
  }, [plans, plan]);

  const isFree =
    currentPlanConfig.isFree ||
    subscriptionStatus === 'free' ||
    subscriptionStatus === 'expired' ||
    subscriptionStatus === 'cancelled';

  const effectivePlanConfig = useMemo(() => {
    if (isFree) {
      return plans.find((p) => p.isFree) || currentPlanConfig;
    }
    return currentPlanConfig;
  }, [isFree, plans, currentPlanConfig]);

  const planMeta: PlanDefinition = useMemo(() => {
    const staticMatch =
      PLAN_CATALOG[effectivePlanConfig.id as PlanTier] || PLAN_CATALOG.free;
    const empLimit = effectivePlanConfig.isFree
      ? freeLimits.maxEmployees
      : effectivePlanConfig.maxEmployees;

    return {
      id: (effectivePlanConfig.id as PlanTier) || 'free',
      name: effectivePlanConfig.name,
      tagline: effectivePlanConfig.description,
      monthlyPrice: effectivePlanConfig.monthlyPriceInr,
      yearlyPrice: effectivePlanConfig.annualPriceInr,
      employeeRange:
        empLimit === null
          ? 'Unlimited employees'
          : `Up to ${empLimit} employees`,
      maxEmployees: empLimit,
      features:
        effectivePlanConfig.highlights.length > 0
          ? effectivePlanConfig.highlights
          : staticMatch.features,
    };
  }, [effectivePlanConfig, freeLimits.maxEmployees]);

  const hasFeature = useCallback(
    (feature: PlanFeatureKey) => {
      if (effectivePlanConfig.isFree) {
        if (feature === 'excelExport') return freeLimits.allowExcelExport;
        if (feature === 'pdfExport') return freeLimits.allowPdfExport;
        if (feature === 'reportsAnalytics') {
          return freeLimits.reportAccess === 'full';
        }
      }
      return Boolean(effectivePlanConfig.features?.[feature]);
    },
    [effectivePlanConfig, freeLimits]
  );

  // Paid flag is strictly tied to active/expiring verified subscription (or active trial grants feature access without claiming paid status)
  const isPaid = !isFree && paymentVerified;
  const hasRbacAccess = hasFeature('customRoles');
  const hasAutomatedPayroll = hasFeature('monthlyPayroll');
  const canExportExcel = hasFeature('excelExport');
  const canExportPdf = hasFeature('pdfExport');
  const reportAccessLevel: 'none' | 'summary' | 'full' = effectivePlanConfig.isFree
    ? freeLimits.reportAccess
    : hasFeature('reportsAnalytics')
      ? 'full'
      : 'none';
  const hasReportExports =
    hasFeature('reportsAnalytics') && (canExportExcel || canExportPdf);
  const employeeLimit = effectivePlanConfig.isFree
    ? freeLimits.maxEmployees
    : effectivePlanConfig.maxEmployees;

  const setPlan = (nextPlan: string, cycle?: BillingCycle) => {
    const target = plans.find((p) => p.id === nextPlan || p.slug === nextPlan);
    if (!target || target.isFree) {
      setPlanState(target?.id || 'free');
      setSubscriptionStatus('free');
      setPaymentVerified(false);
      setTrialEndsAt(null);
      setBillingCycle('monthly');
      return;
    }

    // Never falsely claim paid without real payment verification;
    // selecting a paid plan without payment verification opens a Trial if enabled
    if (!paymentGatewayConfigured) {
      if (platformSettings.trialEnabled && (target.trialDays || platformSettings.defaultTrialDays) > 0) {
        const days = target.trialDays || platformSettings.defaultTrialDays;
        setPlanState(target.id);
        setSubscriptionStatus('trial');
        setPaymentVerified(false);
        setTrialEndsAt(new Date(Date.now() + days * 86400_000).toISOString());
        if (cycle) setBillingCycle(cycle);
      }
      return;
    }

    setPlanState(target.id);
    if (target.monthlyPriceInr === null) {
      setBillingCycle('yearly');
    } else if (cycle) {
      setBillingCycle(cycle);
    }
  };

  const startTrial = (targetPlanId: string) => {
    const target = plans.find((p) => p.id === targetPlanId && !p.isFree);
    if (!target || !platformSettings.trialEnabled) return;
    const days = target.trialDays || platformSettings.defaultTrialDays || 14;
    setPlanState(target.id);
    setSubscriptionStatus('trial');
    setPaymentVerified(false);
    setTrialEndsAt(new Date(Date.now() + days * 86400_000).toISOString());
    setUpgradeModalOpen(false);
    setRazorpayTarget(null);
  };

  const cancelSubscription = () => {
    setSubscriptionStatus('cancelled');
    setPaymentVerified(false);
    setTrialEndsAt(null);
  };

  const openUpgradeModal = (
    featureName = 'Paid Plan Feature',
    reason = freeLimits.upgradePromptMessage ||
      'Upgrade your plan to unlock this feature.'
  ) => {
    setLockedFeatureName(featureName);
    setLockedFeatureReason(reason);
    setUpgradeModalOpen(true);
  };

  const closeUpgradeModal = () => setUpgradeModalOpen(false);

  const handleRazorpayPayment = (targetPlanId: string, cycle: BillingCycle) => {
    const def = plans.find((p) => p.id === targetPlanId) || plans[0];
    if (!def) return;

    const effectiveCycle: BillingCycle =
      def.monthlyPriceInr === null ? 'yearly' : cycle;
    const amountInr =
      effectiveCycle === 'yearly'
        ? def.annualPriceInr ?? 0
        : def.monthlyPriceInr ?? def.annualPriceInr ?? 0;

    if (def.isFree || amountInr === 0) {
      setPlan(def.id, effectiveCycle);
      setUpgradeModalOpen(false);
      return;
    }

    const razorpayKeyId =
      globalSettings.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID || '';
    if (
      paymentGatewayConfigured &&
      razorpayKeyId &&
      typeof window !== 'undefined' &&
      window.Razorpay
    ) {
      try {
        const rzp = new window.Razorpay({
          key: razorpayKeyId,
          amount: amountInr * 100,
          currency: 'INR',
          name: globalSettings.appName || platformSettings.platformName,
          description: `${def.name} Plan (${effectiveCycle})`,
          handler: () => {
            setPlanState(def.id);
            setBillingCycle(effectiveCycle);
            setSubscriptionStatus('active');
            setPaymentVerified(true);
            setUpgradeModalOpen(false);
          },
          theme: { color: globalSettings.primaryThemeColor || '#2563eb' },
        });
        rzp.open();
        return;
      } catch {
        // Fallback to billing checkout modal below
      }
    }

    setUpgradeModalOpen(false);
    setRazorpayTarget({
      plan: def.id,
      planName: def.name,
      cycle: effectiveCycle,
      amountInr,
      trialDays: platformSettings.trialEnabled
        ? def.trialDays || platformSettings.defaultTrialDays
        : 0,
    });
  };

  const completeRazorpayPayment = () => {
    if (!razorpayTarget) return;
    // If live payment gateway is NOT configured, start Trial cleanly instead of faking paid verification
    if (!paymentGatewayConfigured) {
      if (razorpayTarget.trialDays > 0) {
        startTrial(razorpayTarget.plan);
      }
      setRazorpayTarget(null);
      return;
    }
    setPlanState(razorpayTarget.plan);
    setBillingCycle(razorpayTarget.cycle);
    setSubscriptionStatus('active');
    setPaymentVerified(true);
    setRazorpayTarget(null);
  };

  const cancelRazorpayPayment = () => {
    setRazorpayTarget(null);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        plan,
        billingCycle,
        planMeta,
        currentPlanConfig: effectivePlanConfig,
        plans,
        freeLimits,
        platformSettings,
        subscriptionStatus,
        paymentVerified,
        paymentGatewayConfigured,
        trialEndsAt,
        isFree,
        isPaid,
        hasRbacAccess,
        hasAutomatedPayroll,
        hasReportExports,
        canExportExcel,
        canExportPdf,
        reportAccessLevel,
        employeeLimit,
        hasFeature,
        upgradeModalOpen,
        lockedFeatureName,
        lockedFeatureReason,
        razorpayTarget,
        openUpgradeModal,
        closeUpgradeModal,
        setPlan,
        startTrial,
        cancelSubscription,
        handleRazorpayPayment,
        completeRazorpayPayment,
        cancelRazorpayPayment,
        refreshCatalog,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error(
      'useSubscription must be used within SubscriptionProvider'
    );
  }
  return ctx;
}
