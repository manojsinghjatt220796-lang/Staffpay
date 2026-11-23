import Database from 'better-sqlite3';
import { ensureStorageDirectories, serverConfig } from './config.ts';
import { hashPassword } from './security.ts';
import type {
  ConfigurablePlan,
  FreePlanLimits,
  PlanFeatureKey,
  PlatformSettings,
  SubscriptionStatus,
} from '../src/types/staffpay.ts';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  ensureStorageDirectories();
  const db = new Database(serverConfig.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  dbInstance = db;
  runMigrations(db);
  ensureBaselineData(db);
  return db;
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function createTestDb(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  runMigrations(db);
  ensureBaselineData(db);
  return db;
}

const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: '001_initial_saas_platform',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        platform_role TEXT NOT NULL CHECK(platform_role IN ('super_admin', 'tenant_user')),
        company_id TEXT,
        company_role TEXT,
        employee_id TEXT,
        avatar_url TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        refresh_token_hash TEXT NOT NULL UNIQUE,
        client_type TEXT NOT NULL DEFAULT 'web' CHECK(client_type IN ('web', 'android', 'ios')),
        device_name TEXT NOT NULL DEFAULT 'Browser',
        expires_at TEXT NOT NULL,
        refresh_expires_at TEXT NOT NULL,
        revoked_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_sessions_refresh_hash ON sessions(refresh_token_hash);

      CREATE TABLE IF NOT EXISTS platform_settings (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        platform_name TEXT NOT NULL DEFAULT 'StaffPay',
        logo_url TEXT NOT NULL DEFAULT '',
        default_currency TEXT NOT NULL DEFAULT 'INR',
        default_language TEXT NOT NULL DEFAULT 'en',
        support_email TEXT NOT NULL DEFAULT 'support@staffpay.in',
        support_contact TEXT NOT NULL DEFAULT '+91 22 4890 1200',
        trial_enabled INTEGER NOT NULL DEFAULT 1,
        default_trial_days INTEGER NOT NULL DEFAULT 14,
        default_plan_id TEXT NOT NULL DEFAULT 'free',
        allow_self_registration INTEGER NOT NULL DEFAULT 1,
        require_email_verification INTEGER NOT NULL DEFAULT 0,
        auto_downgrade_on_expiry INTEGER NOT NULL DEFAULT 1,
        grace_period_days INTEGER NOT NULL DEFAULT 5,
        enforce_server_limits INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        monthly_price_inr REAL,
        annual_price_inr REAL,
        is_free INTEGER NOT NULL DEFAULT 0,
        trial_days INTEGER NOT NULL DEFAULT 0,
        max_employees INTEGER,
        max_companies_per_account INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'archived')),
        display_order INTEGER NOT NULL DEFAULT 1,
        duration_days INTEGER NOT NULL DEFAULT 30,
        grace_period_days INTEGER NOT NULL DEFAULT 5,
        auto_renew_default INTEGER NOT NULL DEFAULT 1,
        features_json TEXT NOT NULL,
        highlights_json TEXT NOT NULL DEFAULT '[]',
        free_limits_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        short_code TEXT NOT NULL,
        country TEXT NOT NULL DEFAULT 'IN',
        currency TEXT NOT NULL DEFAULT 'INR',
        timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
        slug TEXT NOT NULL UNIQUE,
        industry TEXT NOT NULL DEFAULT 'General Business',
        gstin TEXT NOT NULL DEFAULT '',
        pf_registration TEXT NOT NULL DEFAULT '',
        esi_code TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        owner_user_id TEXT,
        plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
        billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK(billing_cycle IN ('monthly', 'yearly')),
        subscription_status TEXT NOT NULL DEFAULT 'free' CHECK(subscription_status IN ('free', 'trial', 'active', 'expiring', 'expired', 'cancelled', 'grace_period')),
        trial_ends_at TEXT,
        current_period_start TEXT,
        current_period_end TEXT,
        grace_ends_at TEXT,
        cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
        payment_verified INTEGER NOT NULL DEFAULT 0,
        last_payment_ref TEXT,
        last_payment_amount_inr REAL,
        last_payment_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS payment_transactions (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
        billing_cycle TEXT NOT NULL CHECK(billing_cycle IN ('monthly', 'yearly')),
        amount_inr REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        gateway TEXT NOT NULL DEFAULT 'razorpay',
        gateway_order_id TEXT NOT NULL,
        gateway_payment_id TEXT NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0,
        paid_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
  {
    id: '002_company_workforce_operations',
    sql: `
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive', 'On Leave', 'Probation', 'Archived')),
        shifts_json TEXT NOT NULL DEFAULT '[]',
        base_salary REAL NOT NULL DEFAULT 0,
        allowances REAL NOT NULL DEFAULT 0,
        joined_date TEXT NOT NULL,
        left_date TEXT,
        leaving_reason TEXT,
        avatar_url TEXT,
        employment_type TEXT DEFAULT 'Full-time',
        pay_frequency TEXT DEFAULT 'Monthly',
        work_location TEXT,
        residential_address TEXT,
        emergency_contact TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);

      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        break_minutes INTEGER NOT NULL DEFAULT 45,
        grace_minutes INTEGER NOT NULL DEFAULT 15,
        target_capacity INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        attendance_date TEXT NOT NULL,
        status TEXT NOT NULL,
        overtime_hours REAL NOT NULL DEFAULT 0,
        check_in_time TEXT,
        check_out_time TEXT,
        late_minutes INTEGER NOT NULL DEFAULT 0,
        late_fine REAL NOT NULL DEFAULT 0,
        UNIQUE(company_id, employee_id, attendance_date)
      );

      CREATE TABLE IF NOT EXISTS leave_requests (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        employee_name TEXT NOT NULL,
        role TEXT NOT NULL,
        leave_type TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        days INTEGER NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected'))
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        expense_date TEXT NOT NULL,
        submitted_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        payment_method TEXT,
        paid_by TEXT,
        vendor TEXT,
        employee_id TEXT,
        notes TEXT,
        receipt_file_id TEXT
      );

      CREATE TABLE IF NOT EXISTS salary_rules (
        company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
        rules_json TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS uploaded_files (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        uploaded_by_user_id TEXT NOT NULL,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        purpose TEXT NOT NULL DEFAULT 'general',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
];

export function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    (
      db.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]
    ).map((r) => r.id)
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    const tx = db.transaction(() => {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(
        migration.id
      );
    });
    tx();
  }
}

export function buildFeatureMap(
  overrides: Partial<Record<PlanFeatureKey, boolean>> = {},
  defaultValue = false
): Record<PlanFeatureKey, boolean> {
  return {
    employeeManagement: defaultValue,
    attendanceManagement: defaultValue,
    leaveManagement: defaultValue,
    monthlyPayroll: defaultValue,
    salaryRules: defaultValue,
    employeeSelfService: defaultValue,
    reportsAnalytics: defaultValue,
    excelExport: defaultValue,
    pdfExport: defaultValue,
    expenseManagement: defaultValue,
    loanAdvanceManagement: defaultValue,
    notifications: defaultValue,
    customDepartments: defaultValue,
    customRoles: defaultValue,
    multiBranchSupport: defaultValue,
    apiAccess: defaultValue,
    mobileAppAccess: defaultValue,
    ...overrides,
  };
}

export const DEFAULT_FREE_LIMITS: FreePlanLimits = {
  maxEmployees: 10,
  reportAccess: 'summary',
  allowExcelExport: false,
  allowPdfExport: false,
  trialRestrictions: 'View-only payroll estimates; automated payroll & compliance exports locked.',
  maxMonthlyPayrollRuns: 0,
  upgradePromptMessage:
    'You have reached the Free Plan limit. Upgrade your workspace plan to unlock more employees, automated payroll, and compliance exports.',
};

const DEFAULT_PLANS: ConfigurablePlan[] = [
  {
    id: 'free',
    slug: 'free',
    name: 'Free',
    description: 'For early-stage teams getting started with digital attendance',
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
    features: buildFeatureMap({
      employeeManagement: true,
      attendanceManagement: true,
      leaveManagement: true,
      employeeSelfService: true,
      expenseManagement: true,
      notifications: true,
      mobileAppAccess: true,
    }),
    highlights: [
      'Up to 10 active employees',
      'Daily attendance register & shift timing',
      'Leave request tracking & Employee portal',
      'View-only payroll estimates',
    ],
    freeLimits: DEFAULT_FREE_LIMITS,
  },
  {
    id: 'starter',
    slug: 'starter',
    name: 'Starter',
    description: 'For growing small businesses automating monthly payroll',
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
    features: buildFeatureMap({
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
    highlights: [
      'Up to 25 active employees',
      'Automated payroll runs & salary rules',
      'Overtime, late-fine & LWP automation',
      'Expense claims & loan deductions',
    ],
  },
  {
    id: 'growth',
    slug: 'growth',
    name: 'Growth',
    description: 'For scaling multi-department teams needing RBAC & exports',
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
    features: buildFeatureMap(
      {
        multiBranchSupport: false,
      },
      true
    ),
    highlights: [
      'Up to 80 active employees',
      'Role-based Team & Access Control',
      'Full Reports, PDF & Excel exports',
      'API Access & Mobile App support',
    ],
  },
  {
    id: 'enterprise',
    slug: 'enterprise',
    name: 'Enterprise',
    description: 'Annual volume licensing for large fleets and multi-branch groups',
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
    features: buildFeatureMap({}, true),
    highlights: [
      'Unlimited active employees',
      'Multi-branch & multi-entity switching',
      'Custom roles, API & mobile access',
      'Dedicated compliance audit & priority SLA',
    ],
  },
];

export function ensureBaselineData(db: Database.Database) {
  // 1. Platform settings row (idempotent)
  db.prepare(
    `INSERT OR IGNORE INTO platform_settings (id) VALUES (1)`
  ).run();

  // 2. Baseline subscription plans (only inserted if plan id missing)
  const insertPlan = db.prepare(`
    INSERT OR IGNORE INTO subscription_plans (
      id, slug, name, description, monthly_price_inr, annual_price_inr,
      is_free, trial_days, max_employees, max_companies_per_account,
      status, display_order, duration_days, grace_period_days,
      auto_renew_default, features_json, highlights_json, free_limits_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const plan of DEFAULT_PLANS) {
    insertPlan.run(
      plan.id,
      plan.slug,
      plan.name,
      plan.description,
      plan.monthlyPriceInr,
      plan.annualPriceInr,
      plan.isFree ? 1 : 0,
      plan.trialDays,
      plan.maxEmployees,
      plan.maxCompaniesPerAccount,
      plan.status,
      plan.displayOrder,
      plan.durationDays,
      plan.gracePeriodDays,
      plan.autoRenewDefault ? 1 : 0,
      JSON.stringify(plan.features),
      JSON.stringify(plan.highlights),
      plan.freeLimits ? JSON.stringify(plan.freeLimits) : null
    );
  }

  // 3. Optional env-configured Super Admin bootstrap (never hardcoded in source)
  if (serverConfig.superAdminEmail && serverConfig.superAdminPassword) {
    const existingAdmin = db
      .prepare(`SELECT id FROM users WHERE email = ?`)
      .get(serverConfig.superAdminEmail) as { id: string } | undefined;

    if (!existingAdmin) {
      db.prepare(
        `INSERT INTO users (id, name, email, password_hash, platform_role, is_active)
         VALUES (?, ?, ?, ?, 'super_admin', 1)`
      ).run(
        `usr-super-${Date.now()}`,
        'Platform Super Admin',
        serverConfig.superAdminEmail,
        hashPassword(serverConfig.superAdminPassword)
      );
    }
  }

  // 4. Preserve existing data: seed initial workspace records ONLY when companies table is empty
  const companyCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM companies').get() as { cnt: number }
  ).cnt;

  if (companyCount === 0) {
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO companies (
          id, name, short_code, country, currency, timezone, slug,
          industry, gstin, pf_registration, esi_code, city,
          plan_id, billing_cycle, subscription_status, payment_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        'comp-bp',
        'Bharat Pay',
        'BP',
        'IN',
        'INR',
        'Asia/Kolkata',
        'bharat-pay',
        'Fintech & Merchant Services',
        '27AABCB9182M1Z4',
        'MHBAN2498100110',
        '31000847210000881',
        'Mumbai, Maharashtra',
        'free',
        'monthly',
        'free',
        0
      );

      const trialEnd = new Date(Date.now() + 14 * 86400_000).toISOString();
      db.prepare(
        `INSERT INTO companies (
          id, name, short_code, country, currency, timezone, slug,
          industry, gstin, pf_registration, esi_code, city,
          plan_id, billing_cycle, subscription_status, trial_ends_at, payment_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        'comp-ml',
        'Meridian Logistics Pvt. Ltd.',
        'ML',
        'IN',
        'INR',
        'Asia/Kolkata',
        'meridian-logistics',
        'Supply Chain & Freight',
        '27AABCM4821K1Z5',
        'MHBAN2498100000',
        '31000847210000999',
        'Pune, Maharashtra',
        'starter',
        'monthly',
        'trial',
        trialEnd,
        0
      );

      // Baseline active employees for Bharat Pay (10 active employees matching Free Plan limit)
      const insertEmp = db.prepare(
        `INSERT INTO employees (
          id, company_id, code, name, role, department, phone, email, status,
          shifts_json, base_salary, allowances, joined_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const seedEmployees = [
        ['emp-1', 'EMP-101', 'Arjun Deshmukh', 'Operations Manager', 'Operations', '+91 98204 11230', 'arjun@bharatpay.in', 'Active', ['General Day Shift'], 68000, 14500, '2023-03-14'],
        ['emp-2', 'EMP-102', 'Neha Kulkarni', 'Payroll Accountant', 'Finance', '+91 98204 22819', 'neha@bharatpay.in', 'Active', ['General Day Shift'], 56000, 11200, '2023-05-02'],
        ['emp-3', 'EMP-103', 'Vikramaditya Nair', 'Field Ops Lead', 'Field Ops', '+91 98192 44018', 'vikram@bharatpay.in', 'Active', ['General Day Shift', 'Weekend Support'], 42000, 8400, '2023-08-21'],
        ['emp-4', 'EMP-104', 'Rohan Malhotra', 'Merchant Support Lead', 'Support', '+91 99675 88310', 'rohan@bharatpay.in', 'On Leave', ['Evening Dispatch'], 36000, 6800, '2024-01-10'],
        ['emp-5', 'EMP-105', 'Ananya Iyer', 'HR & Compliance Lead', 'Human Resources', '+91 98330 76204', 'ananya@bharatpay.in', 'Active', [], 48000, 9600, '2023-11-06'],
        ['emp-6', 'EMP-106', 'Suresh Jadhav', 'Terminal Technician', 'Hardware', '+91 97690 31542', 'suresh@bharatpay.in', 'Active', ['General Day Shift', 'Night Hub Shift'], 34000, 5500, '2024-02-19'],
        ['emp-7', 'EMP-107', 'Kavita Verma', 'Account Executive', 'Sales', '+91 98211 65093', 'kavita@bharatpay.in', 'Active', [], 44000, 8800, '2024-04-08'],
        ['emp-8', 'EMP-108', 'Deepak Joshi', 'Settlement Analyst', 'Finance', '+91 98672 90124', 'deepak@bharatpay.in', 'Probation', ['Evening Dispatch'], 31000, 4900, '2026-09-01'],
        ['emp-9', 'EMP-109', 'Meera Menon', 'Vendor Onboarding', 'Operations', '+91 98450 53712', 'meera@bharatpay.in', 'Active', ['General Day Shift'], 46000, 9200, '2024-06-17'],
        ['emp-10', 'EMP-110', 'Farhan Siddiqui', 'Shift Supervisor', 'Support', '+91 98207 19480', 'farhan@bharatpay.in', 'Active', ['Night Hub Shift'], 38000, 7600, '2025-01-13'],
      ] as const;

      for (const e of seedEmployees) {
        insertEmp.run(
          e[0],
          'comp-bp',
          e[1],
          e[2],
          e[3],
          e[4],
          e[5],
          e[6],
          e[7],
          JSON.stringify(e[8]),
          e[9],
          e[10],
          e[11]
        );
      }

      const insertShift = db.prepare(
        `INSERT INTO shifts (id, company_id, name, start_time, end_time, break_minutes, grace_minutes, target_capacity)
         VALUES (?, 'comp-bp', ?, ?, ?, ?, ?, ?)`
      );
      insertShift.run('shift-general', 'General Day Shift', '09:00', '18:00', 60, 15, 5);
      insertShift.run('shift-evening', 'Evening Dispatch', '14:00', '22:30', 45, 10, 3);
      insertShift.run('shift-night', 'Night Hub Shift', '22:00', '06:30', 45, 15, 2);
      insertShift.run('shift-weekend', 'Weekend Support', '10:00', '19:00', 45, 15, 2);
    });
    tx();
  }
}

export function mapPlanRow(row: Record<string, unknown>): ConfigurablePlan {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description),
    monthlyPriceInr:
      row.monthly_price_inr === null ? null : Number(row.monthly_price_inr),
    annualPriceInr:
      row.annual_price_inr === null ? null : Number(row.annual_price_inr),
    isFree: Boolean(row.is_free),
    trialDays: Number(row.trial_days),
    maxEmployees:
      row.max_employees === null ? null : Number(row.max_employees),
    maxCompaniesPerAccount: Number(row.max_companies_per_account),
    status: row.status as ConfigurablePlan['status'],
    displayOrder: Number(row.display_order),
    durationDays: Number(row.duration_days),
    gracePeriodDays: Number(row.grace_period_days),
    autoRenewDefault: Boolean(row.auto_renew_default),
    features: JSON.parse(String(row.features_json)) as Record<
      PlanFeatureKey,
      boolean
    >,
    highlights: JSON.parse(String(row.highlights_json || '[]')) as string[],
    freeLimits: row.free_limits_json
      ? (JSON.parse(String(row.free_limits_json)) as FreePlanLimits)
      : undefined,
  };
}

export function mapSettingsRow(row: Record<string, unknown>): PlatformSettings {
  return {
    platformName: String(row.platform_name),
    logoUrl: String(row.logo_url || ''),
    defaultCurrency: 'INR',
    defaultLanguage: (row.default_language === 'hi' ? 'hi' : 'en'),
    supportEmail: String(row.support_email),
    supportContact: String(row.support_contact),
    trialEnabled: Boolean(row.trial_enabled),
    defaultTrialDays: Number(row.default_trial_days),
    defaultPlanId: String(row.default_plan_id),
    allowSelfRegistration: Boolean(row.allow_self_registration),
    requireEmailVerification: Boolean(row.require_email_verification),
    autoDowngradeOnExpiry: Boolean(row.auto_downgrade_on_expiry),
    gracePeriodDays: Number(row.grace_period_days),
    enforceServerLimits: Boolean(row.enforce_server_limits),
  };
}

export function computeEffectivePlanForCompany(
  db: Database.Database,
  companyRow: Record<string, unknown>
): {
  plan: ConfigurablePlan;
  effectiveStatus: SubscriptionStatus;
} {
  const status = String(companyRow.subscription_status) as SubscriptionStatus;
  const assignedPlanRow = db
    .prepare('SELECT * FROM subscription_plans WHERE id = ?')
    .get(String(companyRow.plan_id)) as Record<string, unknown> | undefined;

  const freePlanRow = db
    .prepare('SELECT * FROM subscription_plans WHERE is_free = 1 ORDER BY display_order ASC LIMIT 1')
    .get() as Record<string, unknown>;

  const fallbackFreePlan = mapPlanRow(freePlanRow);
  const assignedPlan = assignedPlanRow
    ? mapPlanRow(assignedPlanRow)
    : fallbackFreePlan;

  // Never falsely treat an expired or cancelled subscription as paid active;
  // enforce Free Plan limits while keeping all existing company data intact.
  if (status === 'expired' || status === 'cancelled') {
    return { plan: fallbackFreePlan, effectiveStatus: status };
  }

  // If paid status is claimed without verified payment and not trial/grace/free, treat features safely
  if (
    (status === 'active' || status === 'expiring') &&
    !assignedPlan.isFree &&
    !Boolean(companyRow.payment_verified)
  ) {
    return { plan: fallbackFreePlan, effectiveStatus: 'free' };
  }

  return { plan: assignedPlan, effectiveStatus: status };
}
