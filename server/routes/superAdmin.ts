import { Router } from 'express';
import type Database from 'better-sqlite3';
import {
  buildFeatureMap,
  DEFAULT_FREE_LIMITS,
  getEffectiveRazorpayConfig,
  mapPlanRow,
  mapSettingsRow,
} from '../db.ts';
import { createAuthMiddleware } from '../middleware.ts';
import type {
  FreePlanLimits,
  PlanFeatureKey,
  PlanStatus,
  SubscriptionStatus,
} from '../../src/types/staffpay.ts';

const VALID_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'free',
  'trial',
  'active',
  'expiring',
  'expired',
  'cancelled',
  'grace_period',
];

const VALID_PLAN_STATUSES: PlanStatus[] = ['active', 'inactive', 'archived'];

export function createSuperAdminRouter(getDbFn: () => Database.Database) {
  const router = Router();
  const { requireAuth, requireSuperAdmin } = createAuthMiddleware(getDbFn);

  // Enforce Super Admin isolation across every route in this router
  router.use(requireAuth, requireSuperAdmin);

  router.get('/dashboard', (_req, res) => {
    const db = getDbFn();

    const companies = db
      .prepare(
        `SELECT c.*, p.name AS plan_name, p.is_free
         FROM companies c
         JOIN subscription_plans p ON p.id = c.plan_id`
      )
      .all() as Record<string, unknown>[];

    const totalCompanies = companies.length;
    const freePlanCompanies = companies.filter(
      (c) => Boolean(c.is_free) || c.subscription_status === 'free'
    ).length;
    const trialAccounts = companies.filter(
      (c) => c.subscription_status === 'trial'
    ).length;
    const expiredSubscriptions = companies.filter(
      (c) => c.subscription_status === 'expired'
    ).length;
    const gracePeriodCompanies = companies.filter(
      (c) => c.subscription_status === 'grace_period'
    ).length;
    const cancelledCompanies = companies.filter(
      (c) => c.subscription_status === 'cancelled'
    ).length;
    const expiringCompanies = companies.filter(
      (c) => c.subscription_status === 'expiring'
    ).length;

    // Paid subscribers ONLY counted when payment_verified === 1 and not free/expired/cancelled
    const paidSubscribers = companies.filter(
      (c) =>
        !Boolean(c.is_free) &&
        Boolean(c.payment_verified) &&
        (c.subscription_status === 'active' ||
          c.subscription_status === 'expiring' ||
          c.subscription_status === 'grace_period')
    ).length;

    const activeCompanies = companies.filter(
      (c) =>
        c.subscription_status !== 'expired' &&
        c.subscription_status !== 'cancelled'
    ).length;

    const totalEmployees = (
      db
        .prepare(
          `SELECT COUNT(*) AS cnt FROM employees WHERE status != 'Archived'`
        )
        .get() as { cnt: number }
    ).cnt;

    const revenueRow = db
      .prepare(
        `SELECT
           COALESCE(SUM(amount_inr), 0) AS total_revenue,
           COUNT(*) AS tx_count
         FROM payment_transactions
         WHERE verified = 1
           AND strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')`
      )
      .get() as { total_revenue: number; tx_count: number };

    const planRows = db
      .prepare(
        `SELECT p.id, p.name, p.is_free, COUNT(c.id) AS company_count
         FROM subscription_plans p
         LEFT JOIN companies c ON c.plan_id = p.id
         GROUP BY p.id
         ORDER BY p.display_order ASC`
      )
      .all() as Record<string, unknown>[];

    const statusBreakdown = VALID_SUBSCRIPTION_STATUSES.map((st) => ({
      status: st,
      count: companies.filter((c) => c.subscription_status === st).length,
    }));

    res.json({
      totalCompanies,
      activeCompanies,
      freePlanCompanies,
      paidSubscribers,
      trialAccounts,
      expiredSubscriptions,
      gracePeriodCompanies,
      cancelledCompanies,
      expiringCompanies,
      totalEmployees,
      monthlySubscriptionRevenueInr: Number(revenueRow.total_revenue || 0),
      verifiedTransactionCount: Number(revenueRow.tx_count || 0),
      paymentGatewayConfigured: getEffectiveRazorpayConfig(db).configured,
      planBreakdown: planRows.map((p) => ({
        planId: String(p.id),
        planName: String(p.name),
        companyCount: Number(p.company_count || 0),
        isFree: Boolean(p.is_free),
      })),
      statusBreakdown,
    });
  });

  // Subscription Plans CRUD
  router.get('/plans', (_req, res) => {
    const db = getDbFn();
    const rows = db
      .prepare(
        `SELECT * FROM subscription_plans ORDER BY display_order ASC, created_at ASC`
      )
      .all() as Record<string, unknown>[];
    res.json({ plans: rows.map(mapPlanRow) });
  });

  router.post('/plans', (req, res) => {
    const db = getDbFn();
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const description = String(body.description || '').trim();

    if (!name) {
      res.status(400).json({
        error: { code: 'INVALID_PLAN', message: 'Plan name is required.' },
      });
      return;
    }

    const baseSlug = String(body.slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const id = `${baseSlug || 'plan'}-${Date.now().toString(36)}`;
    const slug = `${baseSlug || 'plan'}-${Date.now().toString(36)}`;

    const isFree = Boolean(body.isFree);
    const monthlyPriceInr = isFree
      ? 0
      : body.monthlyPriceInr === null || body.monthlyPriceInr === ''
        ? null
        : Math.max(0, Number(body.monthlyPriceInr) || 0);
    const annualPriceInr = isFree
      ? 0
      : body.annualPriceInr === null || body.annualPriceInr === ''
        ? null
        : Math.max(0, Number(body.annualPriceInr) || 0);
    const trialDays = Math.max(0, Number(body.trialDays) || 0);
    const maxEmployees =
      body.maxEmployees === null || body.maxEmployees === ''
        ? null
        : Math.max(1, Number(body.maxEmployees) || 1);
    const maxCompaniesPerAccount = Math.max(
      1,
      Number(body.maxCompaniesPerAccount) || 1
    );
    const status: PlanStatus = VALID_PLAN_STATUSES.includes(body.status)
      ? body.status
      : 'active';
    const displayOrder = Math.max(1, Number(body.displayOrder) || 10);
    const durationDays = Math.max(1, Number(body.durationDays) || 30);
    const gracePeriodDays = Math.max(0, Number(body.gracePeriodDays) || 5);
    const autoRenewDefault =
      body.autoRenewDefault !== undefined ? Boolean(body.autoRenewDefault) : true;
    const features = buildFeatureMap(
      (body.features || {}) as Partial<Record<PlanFeatureKey, boolean>>
    );
    const highlights = Array.isArray(body.highlights)
      ? body.highlights.map((h: unknown) => String(h).trim()).filter(Boolean)
      : [];
    const freeLimits = isFree
      ? ({
          ...DEFAULT_FREE_LIMITS,
          ...(body.freeLimits || {}),
          maxEmployees: maxEmployees ?? DEFAULT_FREE_LIMITS.maxEmployees,
        } satisfies FreePlanLimits)
      : null;

    db.prepare(
      `INSERT INTO subscription_plans (
        id, slug, name, description, monthly_price_inr, annual_price_inr,
        is_free, trial_days, max_employees, max_companies_per_account,
        status, display_order, duration_days, grace_period_days,
        auto_renew_default, features_json, highlights_json, free_limits_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      slug,
      name,
      description || `${name} subscription tier`,
      monthlyPriceInr,
      annualPriceInr,
      isFree ? 1 : 0,
      trialDays,
      maxEmployees,
      maxCompaniesPerAccount,
      status,
      displayOrder,
      durationDays,
      gracePeriodDays,
      autoRenewDefault ? 1 : 0,
      JSON.stringify(features),
      JSON.stringify(highlights),
      freeLimits ? JSON.stringify(freeLimits) : null
    );

    const created = db
      .prepare('SELECT * FROM subscription_plans WHERE id = ?')
      .get(id) as Record<string, unknown>;
    res.status(201).json({ plan: mapPlanRow(created) });
  });

  router.patch('/plans/:planId', (req, res) => {
    const db = getDbFn();
    const planId = String(req.params.planId);
    const existingRow = db
      .prepare('SELECT * FROM subscription_plans WHERE id = ?')
      .get(planId) as Record<string, unknown> | undefined;

    if (!existingRow) {
      res.status(404).json({
        error: { code: 'PLAN_NOT_FOUND', message: 'Subscription plan not found.' },
      });
      return;
    }

    const existing = mapPlanRow(existingRow);
    const body = req.body || {};
    const isFree =
      body.isFree !== undefined ? Boolean(body.isFree) : existing.isFree;

    const name =
      body.name !== undefined ? String(body.name).trim() || existing.name : existing.name;
    const description =
      body.description !== undefined
        ? String(body.description).trim()
        : existing.description;
    const monthlyPriceInr = isFree
      ? 0
      : body.monthlyPriceInr !== undefined
        ? body.monthlyPriceInr === null || body.monthlyPriceInr === ''
          ? null
          : Math.max(0, Number(body.monthlyPriceInr) || 0)
        : existing.monthlyPriceInr;
    const annualPriceInr = isFree
      ? 0
      : body.annualPriceInr !== undefined
        ? body.annualPriceInr === null || body.annualPriceInr === ''
          ? null
          : Math.max(0, Number(body.annualPriceInr) || 0)
        : existing.annualPriceInr;
    const trialDays =
      body.trialDays !== undefined
        ? Math.max(0, Number(body.trialDays) || 0)
        : existing.trialDays;
    const maxEmployees =
      body.maxEmployees !== undefined
        ? body.maxEmployees === null || body.maxEmployees === ''
          ? null
          : Math.max(1, Number(body.maxEmployees) || 1)
        : existing.maxEmployees;
    const maxCompaniesPerAccount =
      body.maxCompaniesPerAccount !== undefined
        ? Math.max(1, Number(body.maxCompaniesPerAccount) || 1)
        : existing.maxCompaniesPerAccount;
    const status: PlanStatus = VALID_PLAN_STATUSES.includes(body.status)
      ? body.status
      : existing.status;
    const displayOrder =
      body.displayOrder !== undefined
        ? Math.max(1, Number(body.displayOrder) || 1)
        : existing.displayOrder;
    const durationDays =
      body.durationDays !== undefined
        ? Math.max(1, Number(body.durationDays) || 30)
        : existing.durationDays;
    const gracePeriodDays =
      body.gracePeriodDays !== undefined
        ? Math.max(0, Number(body.gracePeriodDays) || 0)
        : existing.gracePeriodDays;
    const autoRenewDefault =
      body.autoRenewDefault !== undefined
        ? Boolean(body.autoRenewDefault)
        : existing.autoRenewDefault;
    const features = body.features
      ? { ...existing.features, ...body.features }
      : existing.features;
    const highlights = Array.isArray(body.highlights)
      ? body.highlights.map((h: unknown) => String(h).trim()).filter(Boolean)
      : existing.highlights;
    const freeLimits = isFree
      ? {
          ...(existing.freeLimits || DEFAULT_FREE_LIMITS),
          ...(body.freeLimits || {}),
          maxEmployees:
            maxEmployees ??
            body.freeLimits?.maxEmployees ??
            existing.freeLimits?.maxEmployees ??
            DEFAULT_FREE_LIMITS.maxEmployees,
        }
      : existing.freeLimits || null;

    db.prepare(
      `UPDATE subscription_plans
       SET name = ?, description = ?, monthly_price_inr = ?, annual_price_inr = ?,
           is_free = ?, trial_days = ?, max_employees = ?, max_companies_per_account = ?,
           status = ?, display_order = ?, duration_days = ?, grace_period_days = ?,
           auto_renew_default = ?, features_json = ?, highlights_json = ?,
           free_limits_json = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      name,
      description,
      monthlyPriceInr,
      annualPriceInr,
      isFree ? 1 : 0,
      trialDays,
      maxEmployees,
      maxCompaniesPerAccount,
      status,
      displayOrder,
      durationDays,
      gracePeriodDays,
      autoRenewDefault ? 1 : 0,
      JSON.stringify(features),
      JSON.stringify(highlights),
      freeLimits ? JSON.stringify(freeLimits) : null,
      planId
    );

    const updated = db
      .prepare('SELECT * FROM subscription_plans WHERE id = ?')
      .get(planId) as Record<string, unknown>;
    res.json({ plan: mapPlanRow(updated) });
  });

  router.post('/plans/:planId/status', (req, res) => {
    const db = getDbFn();
    const planId = String(req.params.planId);
    const status = req.body?.status as PlanStatus;

    if (!VALID_PLAN_STATUSES.includes(status)) {
      res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Status must be active, inactive, or archived.',
        },
      });
      return;
    }

    const result = db
      .prepare(
        `UPDATE subscription_plans SET status = ?, updated_at = datetime('now') WHERE id = ?`
      )
      .run(status, planId);

    if (result.changes === 0) {
      res.status(404).json({
        error: { code: 'PLAN_NOT_FOUND', message: 'Plan not found.' },
      });
      return;
    }

    const updated = db
      .prepare('SELECT * FROM subscription_plans WHERE id = ?')
      .get(planId) as Record<string, unknown>;
    res.json({ plan: mapPlanRow(updated) });
  });

  // Dedicated Free Plan Limits Configuration
  router.get('/free-limits', (_req, res) => {
    const db = getDbFn();
    const freeRow = db
      .prepare(
        `SELECT * FROM subscription_plans WHERE is_free = 1 ORDER BY display_order ASC LIMIT 1`
      )
      .get() as Record<string, unknown> | undefined;

    if (!freeRow) {
      res.status(404).json({
        error: { code: 'FREE_PLAN_NOT_FOUND', message: 'Free plan not configured.' },
      });
      return;
    }
    const plan = mapPlanRow(freeRow);
    res.json({
      planId: plan.id,
      freeLimits: plan.freeLimits || DEFAULT_FREE_LIMITS,
      features: plan.features,
    });
  });

  router.patch('/free-limits', (req, res) => {
    const db = getDbFn();
    const freeRow = db
      .prepare(
        `SELECT * FROM subscription_plans WHERE is_free = 1 ORDER BY display_order ASC LIMIT 1`
      )
      .get() as Record<string, unknown> | undefined;

    if (!freeRow) {
      res.status(404).json({
        error: { code: 'FREE_PLAN_NOT_FOUND', message: 'Free plan not configured.' },
      });
      return;
    }

    const existing = mapPlanRow(freeRow);
    const body = req.body || {};
    const prevLimits = existing.freeLimits || DEFAULT_FREE_LIMITS;
    const nextMaxEmployees = Math.max(
      1,
      Number(body.maxEmployees ?? prevLimits.maxEmployees) || 1
    );

    const nextLimits: FreePlanLimits = {
      maxEmployees: nextMaxEmployees,
      reportAccess:
        body.reportAccess === 'none' ||
        body.reportAccess === 'summary' ||
        body.reportAccess === 'full'
          ? body.reportAccess
          : prevLimits.reportAccess,
      allowExcelExport:
        body.allowExcelExport !== undefined
          ? Boolean(body.allowExcelExport)
          : prevLimits.allowExcelExport,
      allowPdfExport:
        body.allowPdfExport !== undefined
          ? Boolean(body.allowPdfExport)
          : prevLimits.allowPdfExport,
      trialRestrictions:
        body.trialRestrictions !== undefined
          ? String(body.trialRestrictions)
          : prevLimits.trialRestrictions,
      maxMonthlyPayrollRuns:
        body.maxMonthlyPayrollRuns === null || body.maxMonthlyPayrollRuns === ''
          ? null
          : body.maxMonthlyPayrollRuns !== undefined
            ? Math.max(0, Number(body.maxMonthlyPayrollRuns) || 0)
            : prevLimits.maxMonthlyPayrollRuns,
      upgradePromptMessage:
        body.upgradePromptMessage !== undefined
          ? String(body.upgradePromptMessage).trim() ||
            prevLimits.upgradePromptMessage
          : prevLimits.upgradePromptMessage,
    };

    const nextFeatures = body.features
      ? {
          ...existing.features,
          ...body.features,
          excelExport: nextLimits.allowExcelExport,
          pdfExport: nextLimits.allowPdfExport,
          reportsAnalytics: nextLimits.reportAccess === 'full',
        }
      : {
          ...existing.features,
          excelExport: nextLimits.allowExcelExport,
          pdfExport: nextLimits.allowPdfExport,
          reportsAnalytics: nextLimits.reportAccess === 'full',
        };

    db.prepare(
      `UPDATE subscription_plans
       SET max_employees = ?, features_json = ?, free_limits_json = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      nextMaxEmployees,
      JSON.stringify(nextFeatures),
      JSON.stringify(nextLimits),
      existing.id
    );

    const updated = db
      .prepare('SELECT * FROM subscription_plans WHERE id = ?')
      .get(existing.id) as Record<string, unknown>;
    const updatedPlan = mapPlanRow(updated);
    res.json({
      plan: updatedPlan,
      freeLimits: updatedPlan.freeLimits,
      features: updatedPlan.features,
    });
  });

  // Company Subscriptions Management (no automatic data deletion!)
  router.get('/companies', (_req, res) => {
    const db = getDbFn();
    const rows = db
      .prepare(
        `SELECT
           c.*,
           p.name AS plan_name,
           p.max_employees,
           (SELECT COUNT(*) FROM employees e WHERE e.company_id = c.id AND e.status != 'Archived') AS employee_count
         FROM companies c
         JOIN subscription_plans p ON p.id = c.plan_id
         ORDER BY c.created_at DESC`
      )
      .all() as Record<string, unknown>[];

    res.json({
      companies: rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        shortCode: String(r.short_code),
        city: String(r.city),
        country: String(r.country),
        currency: String(r.currency),
        planId: String(r.plan_id),
        planName: String(r.plan_name),
        billingCycle: r.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
        subscriptionStatus: String(r.subscription_status),
        employeeCount: Number(r.employee_count || 0),
        maxEmployees: r.max_employees === null ? null : Number(r.max_employees),
        trialEndsAt: r.trial_ends_at ? String(r.trial_ends_at) : null,
        currentPeriodStart: r.current_period_start
          ? String(r.current_period_start)
          : null,
        currentPeriodEnd: r.current_period_end
          ? String(r.current_period_end)
          : null,
        graceEndsAt: r.grace_ends_at ? String(r.grace_ends_at) : null,
        cancelAtPeriodEnd: Boolean(r.cancel_at_period_end),
        paymentVerified: Boolean(r.payment_verified),
        lastPaymentRef: r.last_payment_ref ? String(r.last_payment_ref) : null,
        lastPaymentAmountInr:
          r.last_payment_amount_inr === null
            ? null
            : Number(r.last_payment_amount_inr),
        lastPaymentAt: r.last_payment_at ? String(r.last_payment_at) : null,
        createdAt: String(r.created_at),
      })),
    });
  });

  router.patch('/companies/:companyId/subscription', (req, res) => {
    const db = getDbFn();
    const companyId = String(req.params.companyId);
    const existing = db
      .prepare('SELECT * FROM companies WHERE id = ?')
      .get(companyId) as Record<string, unknown> | undefined;

    if (!existing) {
      res.status(404).json({
        error: { code: 'COMPANY_NOT_FOUND', message: 'Company not found.' },
      });
      return;
    }

    const body = req.body || {};
    const nextPlanId = String(body.planId || existing.plan_id);
    const planRow = db
      .prepare('SELECT * FROM subscription_plans WHERE id = ?')
      .get(nextPlanId) as Record<string, unknown> | undefined;

    if (!planRow) {
      res.status(400).json({
        error: { code: 'INVALID_PLAN', message: 'Target plan does not exist.' },
      });
      return;
    }

    const nextStatus = body.subscriptionStatus as SubscriptionStatus;
    if (nextStatus && !VALID_SUBSCRIPTION_STATUSES.includes(nextStatus)) {
      res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Unsupported subscription status.',
        },
      });
      return;
    }

    const effectiveStatus: SubscriptionStatus =
      nextStatus || (String(existing.subscription_status) as SubscriptionStatus);
    const isFreePlan = Boolean(planRow.is_free);

    // Strictly refuse marking a paid subscription as paymentVerified without verified payment reference & amount
    let paymentVerified = Boolean(existing.payment_verified);
    let lastPaymentRef = existing.last_payment_ref
      ? String(existing.last_payment_ref)
      : null;
    let lastPaymentAmountInr =
      existing.last_payment_amount_inr === null
        ? null
        : Number(existing.last_payment_amount_inr);
    let lastPaymentAt = existing.last_payment_at
      ? String(existing.last_payment_at)
      : null;

    if (body.paymentVerified === true) {
      const ref = String(body.lastPaymentRef || '').trim();
      const amount = Number(body.lastPaymentAmountInr || 0);
      if (!ref || amount <= 0) {
        res.status(400).json({
          error: {
            code: 'PAYMENT_VERIFICATION_REQUIRED',
            message:
              'Cannot mark subscription as paid/verified without a valid payment reference and verified INR amount.',
          },
        });
        return;
      }
      paymentVerified = true;
      lastPaymentRef = ref;
      lastPaymentAmountInr = amount;
      lastPaymentAt = new Date().toISOString();
    } else if (body.paymentVerified === false || isFreePlan || effectiveStatus === 'trial') {
      paymentVerified = false;
    }

    if (
      !isFreePlan &&
      effectiveStatus === 'active' &&
      !paymentVerified
    ) {
      res.status(400).json({
        error: {
          code: 'UNVERIFIED_PAID_SUBSCRIPTION',
          message:
            'Paid plans require verified payment data before setting status to Active. Use Trial or provide a verified payment reference.',
        },
      });
      return;
    }

    const billingCycle =
      body.billingCycle === 'yearly' || body.billingCycle === 'monthly'
        ? body.billingCycle
        : String(existing.billing_cycle);

    const trialEndsAt =
      body.trialEndsAt !== undefined
        ? body.trialEndsAt
        : effectiveStatus === 'trial' && !existing.trial_ends_at
          ? new Date(
              Date.now() + (Number(planRow.trial_days) || 14) * 86400_000
            ).toISOString()
          : existing.trial_ends_at;

    const graceEndsAt =
      body.graceEndsAt !== undefined
        ? body.graceEndsAt
        : effectiveStatus === 'grace_period' && !existing.grace_ends_at
          ? new Date(
              Date.now() + (Number(planRow.grace_period_days) || 5) * 86400_000
            ).toISOString()
          : existing.grace_ends_at;

    db.prepare(
      `UPDATE companies
       SET plan_id = ?, billing_cycle = ?, subscription_status = ?,
           trial_ends_at = ?, grace_ends_at = ?,
           payment_verified = ?, last_payment_ref = ?,
           last_payment_amount_inr = ?, last_payment_at = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      nextPlanId,
      billingCycle,
      effectiveStatus,
      trialEndsAt,
      graceEndsAt,
      paymentVerified ? 1 : 0,
      lastPaymentRef,
      lastPaymentAmountInr,
      lastPaymentAt,
      companyId
    );

    const updated = db
      .prepare(
        `SELECT c.*, p.name AS plan_name, p.max_employees,
                (SELECT COUNT(*) FROM employees e WHERE e.company_id = c.id AND e.status != 'Archived') AS employee_count
         FROM companies c JOIN subscription_plans p ON p.id = c.plan_id
         WHERE c.id = ?`
      )
      .get(companyId) as Record<string, unknown>;

    res.json({
      company: {
        id: String(updated.id),
        name: String(updated.name),
        shortCode: String(updated.short_code),
        city: String(updated.city),
        country: String(updated.country),
        currency: String(updated.currency),
        planId: String(updated.plan_id),
        planName: String(updated.plan_name),
        billingCycle: updated.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
        subscriptionStatus: String(updated.subscription_status),
        employeeCount: Number(updated.employee_count || 0),
        maxEmployees:
          updated.max_employees === null ? null : Number(updated.max_employees),
        trialEndsAt: updated.trial_ends_at ? String(updated.trial_ends_at) : null,
        currentPeriodStart: updated.current_period_start
          ? String(updated.current_period_start)
          : null,
        currentPeriodEnd: updated.current_period_end
          ? String(updated.current_period_end)
          : null,
        graceEndsAt: updated.grace_ends_at ? String(updated.grace_ends_at) : null,
        cancelAtPeriodEnd: Boolean(updated.cancel_at_period_end),
        paymentVerified: Boolean(updated.payment_verified),
        lastPaymentRef: updated.last_payment_ref
          ? String(updated.last_payment_ref)
          : null,
        lastPaymentAmountInr:
          updated.last_payment_amount_inr === null
            ? null
            : Number(updated.last_payment_amount_inr),
        lastPaymentAt: updated.last_payment_at
          ? String(updated.last_payment_at)
          : null,
        createdAt: String(updated.created_at),
      },
    });
  });

  // Platform Admin Settings
  router.get('/settings', (_req, res) => {
    const db = getDbFn();
    const row = db
      .prepare('SELECT * FROM platform_settings WHERE id = 1')
      .get() as Record<string, unknown>;
    res.json({ settings: mapSettingsRow(row) });
  });

  router.patch('/settings', (req, res) => {
    const db = getDbFn();
    const existingRow = db
      .prepare('SELECT * FROM platform_settings WHERE id = 1')
      .get() as Record<string, unknown>;
    const existing = mapSettingsRow(existingRow);
    const body = req.body || {};

    const next = {
      platformName:
        body.platformName !== undefined
          ? String(body.platformName).trim() || existing.platformName
          : existing.platformName,
      logoUrl:
        body.logoUrl !== undefined ? String(body.logoUrl).trim() : existing.logoUrl,
      defaultCurrency: 'INR' as const,
      defaultLanguage:
        body.defaultLanguage === 'hi' || body.defaultLanguage === 'en'
          ? body.defaultLanguage
          : existing.defaultLanguage,
      supportEmail:
        body.supportEmail !== undefined
          ? String(body.supportEmail).trim() || existing.supportEmail
          : existing.supportEmail,
      supportContact:
        body.supportContact !== undefined
          ? String(body.supportContact).trim() || existing.supportContact
          : existing.supportContact,
      trialEnabled:
        body.trialEnabled !== undefined
          ? Boolean(body.trialEnabled)
          : existing.trialEnabled,
      defaultTrialDays:
        body.defaultTrialDays !== undefined
          ? Math.max(0, Number(body.defaultTrialDays) || 0)
          : existing.defaultTrialDays,
      defaultPlanId:
        body.defaultPlanId !== undefined
          ? String(body.defaultPlanId)
          : existing.defaultPlanId,
      allowSelfRegistration:
        body.allowSelfRegistration !== undefined
          ? Boolean(body.allowSelfRegistration)
          : existing.allowSelfRegistration,
      requireEmailVerification:
        body.requireEmailVerification !== undefined
          ? Boolean(body.requireEmailVerification)
          : existing.requireEmailVerification,
      autoDowngradeOnExpiry:
        body.autoDowngradeOnExpiry !== undefined
          ? Boolean(body.autoDowngradeOnExpiry)
          : existing.autoDowngradeOnExpiry,
      gracePeriodDays:
        body.gracePeriodDays !== undefined
          ? Math.max(0, Number(body.gracePeriodDays) || 0)
          : existing.gracePeriodDays,
      enforceServerLimits:
        body.enforceServerLimits !== undefined
          ? Boolean(body.enforceServerLimits)
          : existing.enforceServerLimits,
    };

    db.prepare(
      `UPDATE platform_settings
       SET platform_name = ?, logo_url = ?, default_currency = ?, default_language = ?,
           support_email = ?, support_contact = ?, trial_enabled = ?, default_trial_days = ?,
           default_plan_id = ?, allow_self_registration = ?, require_email_verification = ?,
           auto_downgrade_on_expiry = ?, grace_period_days = ?, enforce_server_limits = ?,
           updated_at = datetime('now')
       WHERE id = 1`
    ).run(
      next.platformName,
      next.logoUrl,
      next.defaultCurrency,
      next.defaultLanguage,
      next.supportEmail,
      next.supportContact,
      next.trialEnabled ? 1 : 0,
      next.defaultTrialDays,
      next.defaultPlanId,
      next.allowSelfRegistration ? 1 : 0,
      next.requireEmailVerification ? 1 : 0,
      next.autoDowngradeOnExpiry ? 1 : 0,
      next.gracePeriodDays,
      next.enforceServerLimits ? 1 : 0
    );

    res.json({ settings: next });
  });

  return router;
}
