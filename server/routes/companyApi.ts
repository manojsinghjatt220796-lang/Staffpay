import { Router } from 'express';
import type Database from 'better-sqlite3';
import {
  computeEffectivePlanForCompany,
  DEFAULT_FREE_LIMITS,
  getEffectiveRazorpayConfig,
  mapPlanRow,
  mapSettingsRow,
} from '../db.ts';
import { createAuthMiddleware } from '../middleware.ts';
import { verifyRazorpaySignature } from '../security.ts';

export function createCompanyApiRouter(getDbFn: () => Database.Database) {
  const router = Router();
  const {
    requireAuth,
    requireCompanyAccess,
    requireCompanyRole,
    requirePlanFeature,
  } = createAuthMiddleware(getDbFn);

  // Public platform catalog (non-sensitive branding + active plans + Free limits)
  router.get('/platform/public', (_req, res) => {
    const db = getDbFn();
    const settingsRow = db
      .prepare('SELECT * FROM platform_settings WHERE id = 1')
      .get() as Record<string, unknown>;
    const settings = mapSettingsRow(settingsRow);

    const activePlans = (
      db
        .prepare(
          `SELECT * FROM subscription_plans
           WHERE status = 'active'
           ORDER BY display_order ASC, created_at ASC`
        )
        .all() as Record<string, unknown>[]
    ).map(mapPlanRow);

    const freePlanRow = db
      .prepare(
        `SELECT * FROM subscription_plans WHERE is_free = 1 ORDER BY display_order ASC LIMIT 1`
      )
      .get() as Record<string, unknown> | undefined;
    const freePlan = freePlanRow ? mapPlanRow(freePlanRow) : null;

    res.json({
      settings: {
        platformName: settings.platformName,
        logoUrl: settings.logoUrl,
        defaultCurrency: settings.defaultCurrency,
        defaultLanguage: settings.defaultLanguage,
        supportEmail: settings.supportEmail,
        supportContact: settings.supportContact,
        trialEnabled: settings.trialEnabled,
        defaultTrialDays: settings.defaultTrialDays,
        defaultPlanId: settings.defaultPlanId,
        allowSelfRegistration: settings.allowSelfRegistration,
        gracePeriodDays: settings.gracePeriodDays,
        enforceServerLimits: settings.enforceServerLimits,
      },
      plans: activePlans,
      freeLimits: freePlan?.freeLimits || DEFAULT_FREE_LIMITS,
      paymentGatewayConfigured: getEffectiveRazorpayConfig(db).configured,
    });
  });

  // Company Subscription Status
  router.get(
    '/companies/:companyId/subscription',
    requireAuth,
    requireCompanyAccess,
    (req, res) => {
      const db = getDbFn();
      const companyId = String(req.params.companyId);
      const companyRow = db
        .prepare('SELECT * FROM companies WHERE id = ?')
        .get(companyId) as Record<string, unknown> | undefined;

      if (!companyRow) {
        res.status(404).json({
          error: { code: 'COMPANY_NOT_FOUND', message: 'Company not found.' },
        });
        return;
      }

      const { plan, effectiveStatus } = computeEffectivePlanForCompany(
        db,
        companyRow
      );
      const employeeCount = (
        db
          .prepare(
            `SELECT COUNT(*) AS cnt FROM employees WHERE company_id = ? AND status != 'Archived'`
          )
          .get(companyId) as { cnt: number }
      ).cnt;

      res.json({
        companyId,
        plan,
        subscriptionStatus: effectiveStatus,
        billingCycle: companyRow.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
        paymentVerified: Boolean(companyRow.payment_verified),
        trialEndsAt: companyRow.trial_ends_at
          ? String(companyRow.trial_ends_at)
          : null,
        currentPeriodEnd: companyRow.current_period_end
          ? String(companyRow.current_period_end)
          : null,
        graceEndsAt: companyRow.grace_ends_at
          ? String(companyRow.grace_ends_at)
          : null,
        cancelAtPeriodEnd: Boolean(companyRow.cancel_at_period_end),
        employeeCount,
        maxEmployees: plan.maxEmployees,
      });
    }
  );

  // Start Trial for a non-free plan (never fakes payment verification)
  router.post(
    '/companies/:companyId/subscription/start-trial',
    requireAuth,
    requireCompanyAccess,
    requireCompanyRole(['Company Owner']),
    (req, res) => {
      const db = getDbFn();
      const companyId = String(req.params.companyId);
      const planId = String(req.body?.planId || '');

      const settingsRow = db
        .prepare('SELECT * FROM platform_settings WHERE id = 1')
        .get() as Record<string, unknown>;
      const settings = mapSettingsRow(settingsRow);
      if (!settings.trialEnabled) {
        res.status(403).json({
          error: {
            code: 'TRIALS_DISABLED',
            message: 'Trials are currently disabled by platform administration.',
          },
        });
        return;
      }

      const planRow = db
        .prepare(`SELECT * FROM subscription_plans WHERE id = ? AND status = 'active'`)
        .get(planId) as Record<string, unknown> | undefined;
      if (!planRow) {
        res.status(404).json({
          error: { code: 'PLAN_NOT_FOUND', message: 'Active plan not found.' },
        });
        return;
      }

      const plan = mapPlanRow(planRow);
      const trialDays = plan.trialDays || settings.defaultTrialDays;
      if (plan.isFree || trialDays <= 0) {
        res.status(400).json({
          error: {
            code: 'TRIAL_UNAVAILABLE',
            message: 'This plan does not offer a trial period.',
          },
        });
        return;
      }

      const trialEndsAt = new Date(Date.now() + trialDays * 86400_000).toISOString();
      db.prepare(
        `UPDATE companies
         SET plan_id = ?, subscription_status = 'trial', trial_ends_at = ?,
             payment_verified = 0, cancel_at_period_end = 0, updated_at = datetime('now')
         WHERE id = ?`
      ).run(plan.id, trialEndsAt, companyId);

      res.json({
        companyId,
        planId: plan.id,
        subscriptionStatus: 'trial',
        trialEndsAt,
        paymentVerified: false,
      });
    }
  );

  // Cancel subscription (preserves all company and employee data)
  router.post(
    '/companies/:companyId/subscription/cancel',
    requireAuth,
    requireCompanyAccess,
    requireCompanyRole(['Company Owner']),
    (req, res) => {
      const db = getDbFn();
      const companyId = String(req.params.companyId);
      const freeRow = db
        .prepare(
          `SELECT id FROM subscription_plans WHERE is_free = 1 ORDER BY display_order ASC LIMIT 1`
        )
        .get() as { id: string } | undefined;

      db.prepare(
        `UPDATE companies
         SET subscription_status = 'cancelled',
             plan_id = ?,
             cancel_at_period_end = 1,
             payment_verified = 0,
             updated_at = datetime('now')
         WHERE id = ?`
      ).run(freeRow?.id || 'free', companyId);

      res.json({
        companyId,
        subscriptionStatus: 'cancelled',
        dataPreserved: true,
      });
    }
  );

  // Payment Verification Endpoint (strictly rejects unverified / unconfigured gateways)
  router.post(
    '/companies/:companyId/subscription/verify-payment',
    requireAuth,
    requireCompanyAccess,
    requireCompanyRole(['Company Owner']),
    (req, res) => {
      const db = getDbFn();
      const razorpay = getEffectiveRazorpayConfig(db);
      if (!razorpay.configured) {
        res.status(503).json({
          error: {
            code: 'PAYMENT_GATEWAY_NOT_CONFIGURED',
            message:
              'Payment gateway credentials are not configured on the server. Cannot verify paid subscription without live Razorpay keys.',
          },
        });
        return;
      }

      const { planId, billingCycle, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
        req.body || {};

      if (
        !verifyRazorpaySignature(
          String(razorpayOrderId || ''),
          String(razorpayPaymentId || ''),
          String(razorpaySignature || ''),
          razorpay.keySecret
        )
      ) {
        res.status(400).json({
          error: {
            code: 'INVALID_PAYMENT_SIGNATURE',
            message: 'Payment signature verification failed.',
          },
        });
        return;
      }

      const companyId = String(req.params.companyId);
      const planRow = db
        .prepare(`SELECT * FROM subscription_plans WHERE id = ? AND status = 'active'`)
        .get(String(planId || '')) as Record<string, unknown> | undefined;

      if (!planRow) {
        res.status(404).json({
          error: { code: 'PLAN_NOT_FOUND', message: 'Selected plan not found.' },
        });
        return;
      }

      const plan = mapPlanRow(planRow);
      const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
      const amountInr =
        cycle === 'yearly'
          ? plan.annualPriceInr ?? 0
          : plan.monthlyPriceInr ?? plan.annualPriceInr ?? 0;

      const periodDays = cycle === 'yearly' ? 365 : plan.durationDays || 30;
      const periodStart = new Date().toISOString();
      const periodEnd = new Date(Date.now() + periodDays * 86400_000).toISOString();
      const txId = `pay-${Date.now()}`;

      const tx = db.transaction(() => {
        db.prepare(
          `INSERT INTO payment_transactions (
            id, company_id, plan_id, billing_cycle, amount_inr, currency, gateway,
            gateway_order_id, gateway_payment_id, verified
          ) VALUES (?, ?, ?, ?, ?, 'INR', 'razorpay', ?, ?, 1)`
        ).run(
          txId,
          companyId,
          plan.id,
          cycle,
          amountInr,
          String(razorpayOrderId),
          String(razorpayPaymentId)
        );

        db.prepare(
          `UPDATE companies
           SET plan_id = ?, billing_cycle = ?, subscription_status = 'active',
               current_period_start = ?, current_period_end = ?,
               payment_verified = 1, last_payment_ref = ?,
               last_payment_amount_inr = ?, last_payment_at = datetime('now'),
               cancel_at_period_end = 0, updated_at = datetime('now')
           WHERE id = ?`
        ).run(
          plan.id,
          cycle,
          periodStart,
          periodEnd,
          String(razorpayPaymentId),
          amountInr,
          companyId
        );
      });
      tx();

      res.json({
        verified: true,
        transactionId: txId,
        planId: plan.id,
        subscriptionStatus: 'active',
        currentPeriodEnd: periodEnd,
      });
    }
  );

  // Company Employees (with company isolation & plan employee limit enforcement)
  router.get(
    '/companies/:companyId/employees',
    requireAuth,
    requireCompanyAccess,
    requirePlanFeature('employeeManagement'),
    (req, res) => {
      const db = getDbFn();
      const companyId = String(req.params.companyId);
      const includeArchived = req.query.includeArchived === 'true';

      const rows = db
        .prepare(
          includeArchived
            ? `SELECT * FROM employees WHERE company_id = ? ORDER BY code ASC`
            : `SELECT * FROM employees WHERE company_id = ? AND status != 'Archived' ORDER BY code ASC`
        )
        .all(companyId) as Record<string, unknown>[];

      res.json({
        employees: rows.map((r) => ({
          id: String(r.id),
          companyId: String(r.company_id),
          code: String(r.code),
          name: String(r.name),
          role: String(r.role),
          department: String(r.department),
          phone: String(r.phone),
          email: String(r.email || ''),
          status: String(r.status),
          shifts: JSON.parse(String(r.shifts_json || '[]')) as string[],
          baseSalary: Number(r.base_salary || 0),
          allowances: Number(r.allowances || 0),
          joinedDate: String(r.joined_date),
          leftDate: r.left_date ? String(r.left_date) : undefined,
          leavingReason: r.leaving_reason ? String(r.leaving_reason) : undefined,
        })),
      });
    }
  );

  router.post(
    '/companies/:companyId/employees',
    requireAuth,
    requireCompanyAccess,
    requireCompanyRole(['Company Owner', 'HR Manager']),
    requirePlanFeature('employeeManagement'),
    (req, res) => {
      const db = getDbFn();
      const companyId = String(req.params.companyId);
      const companyRow = db
        .prepare('SELECT * FROM companies WHERE id = ?')
        .get(companyId) as Record<string, unknown>;
      const settingsRow = db
        .prepare('SELECT * FROM platform_settings WHERE id = 1')
        .get() as Record<string, unknown>;
      const settings = mapSettingsRow(settingsRow);
      const { plan } = computeEffectivePlanForCompany(db, companyRow);

      const activeCount = (
        db
          .prepare(
            `SELECT COUNT(*) AS cnt FROM employees WHERE company_id = ? AND status != 'Archived'`
          )
          .get(companyId) as { cnt: number }
      ).cnt;

      const limit = plan.isFree
        ? plan.freeLimits?.maxEmployees ?? plan.maxEmployees
        : plan.maxEmployees;

      if (settings.enforceServerLimits && limit !== null && activeCount >= limit) {
        res.status(403).json({
          error: {
            code: 'EMPLOYEE_LIMIT_REACHED',
            currentCount: activeCount,
            maxEmployees: limit,
            planName: plan.name,
            message:
              plan.freeLimits?.upgradePromptMessage ||
              `Employee limit reached (${activeCount}/${limit}) on ${plan.name} Plan. Upgrade to add more employees.`,
          },
        });
        return;
      }

      const body = req.body || {};
      const name = String(body.name || '').trim();
      const role = String(body.role || '').trim();
      const department = String(body.department || '').trim();
      const phone = String(body.phone || '').trim();

      if (!name || !role || !department || !phone) {
        res.status(400).json({
          error: {
            code: 'INVALID_EMPLOYEE',
            message: 'Name, role, department, and phone are required.',
          },
        });
        return;
      }

      const id = `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const code = String(body.code || `EMP-${Math.floor(200 + Math.random() * 800)}`);
      const shifts = Array.isArray(body.shifts) ? body.shifts : [];
      const baseSalary = Math.max(0, Number(body.baseSalary) || 0);
      const allowances = Math.max(0, Number(body.allowances) || 0);
      const joinedDate = String(
        body.joinedDate || new Date().toISOString().slice(0, 10)
      );

      db.prepare(
        `INSERT INTO employees (
          id, company_id, code, name, role, department, phone, email, status,
          shifts_json, base_salary, allowances, joined_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        companyId,
        code,
        name,
        role,
        department,
        phone,
        String(body.email || ''),
        'Active',
        JSON.stringify(shifts),
        baseSalary,
        allowances,
        joinedDate
      );

      res.status(201).json({
        employee: {
          id,
          companyId,
          code,
          name,
          role,
          department,
          phone,
          email: String(body.email || ''),
          status: 'Active',
          shifts,
          baseSalary,
          allowances,
          joinedDate,
        },
      });
    }
  );

  router.patch(
    '/companies/:companyId/employees/:empId/archive',
    requireAuth,
    requireCompanyAccess,
    requireCompanyRole(['Company Owner', 'HR Manager']),
    (req, res) => {
      const db = getDbFn();
      const companyId = String(req.params.companyId);
      const empId = String(req.params.empId);
      const reason = String(req.body?.reason || 'Resigned');
      const leftDate = String(
        req.body?.leftDate || new Date().toISOString().slice(0, 10)
      );

      const result = db
        .prepare(
          `UPDATE employees
           SET status = 'Archived', left_date = ?, leaving_reason = ?, shifts_json = '[]'
           WHERE id = ? AND company_id = ?`
        )
        .run(leftDate, reason, empId, companyId);

      if (result.changes === 0) {
        res.status(404).json({
          error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found.' },
        });
        return;
      }

      res.json({ success: true, id: empId, status: 'Archived' });
    }
  );

  router.post(
    '/companies/:companyId/employees/:empId/restore',
    requireAuth,
    requireCompanyAccess,
    requireCompanyRole(['Company Owner', 'HR Manager']),
    (req, res) => {
      const db = getDbFn();
      const companyId = String(req.params.companyId);
      const empId = String(req.params.empId);

      const result = db
        .prepare(
          `UPDATE employees
           SET status = 'Active', left_date = NULL, leaving_reason = NULL
           WHERE id = ? AND company_id = ?`
        )
        .run(empId, companyId);

      if (result.changes === 0) {
        res.status(404).json({
          error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found.' },
        });
        return;
      }

      res.json({ success: true, id: empId, status: 'Active' });
    }
  );

  // Reports & Exports (Honors Free Plan reportAccess + excelExport/pdfExport)
  router.get(
    '/companies/:companyId/reports/summary',
    requireAuth,
    requireCompanyAccess,
    (req, res) => {
      const db = getDbFn();
      const companyId = String(req.params.companyId);
      const companyRow = db
        .prepare('SELECT * FROM companies WHERE id = ?')
        .get(companyId) as Record<string, unknown>;
      const { plan } = computeEffectivePlanForCompany(db, companyRow);

      const reportAccess = plan.isFree
        ? plan.freeLimits?.reportAccess || 'summary'
        : plan.features.reportsAnalytics
          ? 'full'
          : 'none';

      if (reportAccess === 'none') {
        res.status(403).json({
          error: {
            code: 'REPORTS_LOCKED',
            message:
              plan.freeLimits?.upgradePromptMessage ||
              'Reports are locked on your current subscription plan.',
          },
        });
        return;
      }

      const activeEmployees = (
        db
          .prepare(
            `SELECT COUNT(*) AS cnt, COALESCE(SUM(base_salary + allowances), 0) AS gross
             FROM employees WHERE company_id = ? AND status != 'Archived'`
          )
          .get(companyId) as { cnt: number; gross: number }
      );

      res.json({
        accessLevel: reportAccess,
        activeEmployeeCount: Number(activeEmployees.cnt || 0),
        estimatedMonthlyGrossInr: Number(activeEmployees.gross || 0),
        canExportExcel: plan.features.excelExport,
        canExportPdf: plan.features.pdfExport,
      });
    }
  );

  router.get(
    '/companies/:companyId/exports/payroll-csv',
    requireAuth,
    requireCompanyAccess,
    requirePlanFeature('excelExport'),
    (req, res) => {
      const db = getDbFn();
      const companyId = String(req.params.companyId);
      const rows = db
        .prepare(
          `SELECT code, name, department, role, base_salary, allowances
           FROM employees WHERE company_id = ? AND status != 'Archived' ORDER BY code ASC`
        )
        .all(companyId) as Record<string, unknown>[];

      const csvLines = [
        'Code,Name,Department,Role,BaseSalaryINR,AllowancesINR,GrossINR',
        ...rows.map((r) => {
          const base = Number(r.base_salary || 0);
          const allow = Number(r.allowances || 0);
          return `${r.code},"${String(r.name).replace(/"/g, '""')}",${r.department},${r.role},${base},${allow},${base + allow}`;
        }),
      ];

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="staffpay-payroll-${companyId}.csv"`
      );
      res.send(csvLines.join('\n'));
    }
  );

  // Mobile-Ready Employee Self-Service (ESS) API
  const enforceMobileAccessIfNonWeb = (
    req: Parameters<typeof requireAuth>[0],
    res: Parameters<typeof requireAuth>[1],
    next: Parameters<typeof requireAuth>[2]
  ) => {
    if (req.auth && req.auth.clientType !== 'web') {
      return requirePlanFeature('mobileAppAccess')(req, res, next);
    }
    next();
  };

  router.get(
    '/ess/profile',
    requireAuth,
    enforceMobileAccessIfNonWeb,
    requirePlanFeature('employeeSelfService'),
    (req, res) => {
      const db = getDbFn();
      if (!req.auth!.employeeId || !req.auth!.companyId) {
        res.status(403).json({
          error: {
            code: 'ESS_EMPLOYEE_CONTEXT_REQUIRED',
            message: 'Employee account linkage required for ESS endpoints.',
          },
        });
        return;
      }

      const emp = db
        .prepare(`SELECT * FROM employees WHERE id = ? AND company_id = ?`)
        .get(req.auth!.employeeId, req.auth!.companyId) as
        | Record<string, unknown>
        | undefined;
      if (!emp) {
        res.status(404).json({
          error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found.' },
        });
        return;
      }

      res.json({
        profile: {
          id: String(emp.id),
          code: String(emp.code),
          name: String(emp.name),
          role: String(emp.role),
          department: String(emp.department),
          phone: String(emp.phone),
          email: String(emp.email || ''),
          status: String(emp.status),
          joinedDate: String(emp.joined_date),
          residentialAddress: String(emp.residential_address || ''),
        },
      });
    }
  );

  router.post(
    '/ess/attendance/check-in',
    requireAuth,
    enforceMobileAccessIfNonWeb,
    requirePlanFeature('employeeSelfService'),
    (req, res) => {
      const db = getDbFn();
      if (!req.auth!.employeeId || !req.auth!.companyId) {
        res.status(403).json({
          error: {
            code: 'ESS_EMPLOYEE_CONTEXT_REQUIRED',
            message: 'Employee linkage required to mark self attendance.',
          },
        });
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const nowTime = new Date().toTimeString().slice(0, 5);
      const id = `att-${Date.now()}`;

      db.prepare(
        `INSERT INTO attendance_records (
          id, company_id, employee_id, attendance_date, status, check_in_time
        ) VALUES (?, ?, ?, ?, 'P', ?)
        ON CONFLICT(company_id, employee_id, attendance_date)
        DO UPDATE SET status = 'P', check_in_time = COALESCE(attendance_records.check_in_time, excluded.check_in_time)`
      ).run(id, req.auth!.companyId, req.auth!.employeeId, today, nowTime);

      res.json({
        date: today,
        status: 'P',
        checkInTime: nowTime,
      });
    }
  );

  router.get(
    '/ess/leaves',
    requireAuth,
    enforceMobileAccessIfNonWeb,
    requirePlanFeature('employeeSelfService'),
    (req, res) => {
      const db = getDbFn();
      if (!req.auth!.employeeId || !req.auth!.companyId) {
        res.status(403).json({
          error: {
            code: 'ESS_EMPLOYEE_CONTEXT_REQUIRED',
            message: 'Employee linkage required.',
          },
        });
        return;
      }

      const rows = db
        .prepare(
          `SELECT * FROM leave_requests WHERE employee_id = ? AND company_id = ? ORDER BY start_date DESC`
        )
        .all(req.auth!.employeeId, req.auth!.companyId) as Record<string, unknown>[];

      res.json({
        leaves: rows.map((r) => ({
          id: String(r.id),
          leaveType: String(r.leave_type),
          startDate: String(r.start_date),
          endDate: String(r.end_date),
          days: Number(r.days),
          reason: String(r.reason),
          status: String(r.status),
        })),
      });
    }
  );

  router.post(
    '/ess/leaves',
    requireAuth,
    enforceMobileAccessIfNonWeb,
    requirePlanFeature('employeeSelfService'),
    (req, res) => {
      const db = getDbFn();
      if (!req.auth!.employeeId || !req.auth!.companyId) {
        res.status(403).json({
          error: {
            code: 'ESS_EMPLOYEE_CONTEXT_REQUIRED',
            message: 'Employee linkage required.',
          },
        });
        return;
      }

      const body = req.body || {};
      const leaveType = String(body.leaveType || 'Casual Leave');
      const startDate = String(body.startDate || '');
      const endDate = String(body.endDate || '');
      const days = Math.max(1, Number(body.days) || 1);
      const reason = String(body.reason || '').trim();

      if (!startDate || !endDate || !reason) {
        res.status(400).json({
          error: {
            code: 'INVALID_LEAVE_REQUEST',
            message: 'Start date, end date, and reason are required.',
          },
        });
        return;
      }

      const emp = db
        .prepare(`SELECT name, role FROM employees WHERE id = ? AND company_id = ?`)
        .get(req.auth!.employeeId, req.auth!.companyId) as
        | { name: string; role: string }
        | undefined;

      const id = `lr-${Date.now()}`;
      db.prepare(
        `INSERT INTO leave_requests (
          id, company_id, employee_id, employee_name, role, leave_type, start_date, end_date, days, reason, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`
      ).run(
        id,
        req.auth!.companyId,
        req.auth!.employeeId,
        emp?.name || req.auth!.name,
        emp?.role || 'Staff',
        leaveType,
        startDate,
        endDate,
        days,
        reason
      );

      res.status(201).json({
        leave: {
          id,
          leaveType,
          startDate,
          endDate,
          days,
          reason,
          status: 'Pending',
        },
      });
    }
  );

  return router;
}
