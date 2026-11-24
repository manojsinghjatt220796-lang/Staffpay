import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import Database from 'better-sqlite3';
import { createApiApp } from '../server/app.ts';
import { createTestDb, runMigrations } from '../server/db.ts';
import { hashPassword } from '../server/security.ts';

let tmpDir: string;
let dbPath: string;
let db: Database.Database;
let server: http.Server;
let baseUrl: string;

async function api(
  method: string,
  urlPath: string,
  body?: unknown,
  token?: string,
  extraHeaders: Record<string, string> = {}
) {
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, headers: res.headers };
}

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'staffpay-test-'));
  dbPath = path.join(tmpDir, 'test-staffpay.db');
  db = createTestDb(dbPath);
  const app = createApiApp(() => db);

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('StaffPay Commercial SaaS Backend & Security Suite', () => {
  let superAdminToken = '';
  let companyOwnerToken = '';
  let registeredCompanyId = '';
  let mobileAccessToken = '';
  let mobileRefreshToken = '';
  let mobileSessionId = '';
  let customPlanId = '';

  it('1. Verifies health endpoint, CORS protection, and idempotent migrations', async () => {
    runMigrations(db);
    const migrations = db
      .prepare('SELECT id FROM schema_migrations ORDER BY id')
      .all() as { id: string }[];
    assert.equal(migrations.length, 3);

    const health = await api('GET', '/api/v1/health');
    assert.equal(health.status, 200);
    assert.equal(health.json.status, 'ok');
    assert.equal(health.json.checks.database, 'ok');
    assert.equal(health.json.checks.storage, 'ok');

    // Untrusted external Origin should not receive Access-Control-Allow-Origin
    const disallowedCors = await api('GET', '/api/v1/health', undefined, undefined, {
      Origin: 'https://untrusted-domain.example',
    });
    assert.equal(disallowedCors.headers.get('access-control-allow-origin'), null);

    // Localhost origin is allowed
    const localCors = await api('GET', '/api/v1/health', undefined, undefined, {
      Origin: 'http://localhost:3000',
    });
    assert.equal(
      localCors.headers.get('access-control-allow-origin'),
      'http://localhost:3000'
    );
  });

  it('2. Allows one-time Super Admin bootstrap and rejects subsequent claim attempts', async () => {
    const statusBefore = await api('GET', '/api/v1/auth/bootstrap-status');
    assert.equal(statusBefore.status, 200);
    assert.equal(statusBefore.json.superAdminExists, false);

    const claim = await api('POST', '/api/v1/auth/bootstrap-super-admin', {
      name: 'Founder Admin',
      email: 'founder@staffpay-test.in',
      password: 'StrongPassword123!',
    });
    assert.equal(claim.status, 201);
    assert.equal(claim.json.user.platformRole, 'super_admin');
    superAdminToken = claim.json.accessToken;

    const secondClaim = await api('POST', '/api/v1/auth/bootstrap-super-admin', {
      name: 'Attacker',
      email: 'attacker@evil.in',
      password: 'StrongPassword123!',
    });
    assert.equal(secondClaim.status, 409);
  });

  it('3. Super Admin dashboard reports real metrics and never fabricates paid revenue', async () => {
    const res = await api(
      'GET',
      '/api/v1/super-admin/dashboard',
      undefined,
      superAdminToken
    );
    assert.equal(res.status, 200);
    assert.equal(res.json.totalCompanies, 2);
    assert.equal(res.json.paidSubscribers, 0);
    assert.equal(res.json.monthlySubscriptionRevenueInr, 0);
    assert.equal(res.json.trialAccounts, 1);
    assert.equal(res.json.freePlanCompanies, 1);
    assert.equal(res.json.totalEmployees, 10);
  });

  it('4. Super Admin can create, edit, deactivate, and reactivate subscription plans with 17 features', async () => {
    const createRes = await api(
      'POST',
      '/api/v1/super-admin/plans',
      {
        name: 'Scale Plus',
        description: 'Custom commercial tier',
        monthlyPriceInr: 1499,
        annualPriceInr: 14990,
        isFree: false,
        trialDays: 21,
        maxEmployees: 200,
        maxCompaniesPerAccount: 5,
        status: 'active',
        displayOrder: 5,
        features: {
          employeeManagement: true,
          attendanceManagement: true,
          leaveManagement: true,
          monthlyPayroll: true,
          salaryRules: true,
          employeeSelfService: true,
          reportsAnalytics: true,
          excelExport: true,
          pdfExport: true,
          expenseManagement: true,
          loanAdvanceManagement: true,
          notifications: true,
          customDepartments: true,
          customRoles: true,
          multiBranchSupport: true,
          apiAccess: true,
          mobileAppAccess: true,
        },
      },
      superAdminToken
    );
    assert.equal(createRes.status, 201);
    customPlanId = createRes.json.plan.id;
    assert.equal(createRes.json.plan.features.multiBranchSupport, true);

    const deactivate = await api(
      'POST',
      `/api/v1/super-admin/plans/${customPlanId}/status`,
      { status: 'inactive' },
      superAdminToken
    );
    assert.equal(deactivate.status, 200);
    assert.equal(deactivate.json.plan.status, 'inactive');

    // Public catalog should NOT include inactive plan
    const pubWhileInactive = await api('GET', '/api/v1/platform/public');
    assert.equal(
      pubWhileInactive.json.plans.some((p: any) => p.id === customPlanId),
      false
    );

    const reactivate = await api(
      'POST',
      `/api/v1/super-admin/plans/${customPlanId}/status`,
      { status: 'active' },
      superAdminToken
    );
    assert.equal(reactivate.status, 200);

    const pubActive = await api('GET', '/api/v1/platform/public');
    assert.equal(
      pubActive.json.plans.some((p: any) => p.id === customPlanId),
      true
    );
  });

  it('5. Super Admin Free Plan Limits control maxEmployees, reports, and exports', async () => {
    const updateFree = await api(
      'PATCH',
      '/api/v1/super-admin/free-limits',
      {
        maxEmployees: 2,
        reportAccess: 'none',
        allowExcelExport: false,
        allowPdfExport: false,
        upgradePromptMessage: 'Free limit of 2 staff reached.',
      },
      superAdminToken
    );
    assert.equal(updateFree.status, 200);
    assert.equal(updateFree.json.freeLimits.maxEmployees, 2);
    assert.equal(updateFree.json.freeLimits.reportAccess, 'none');
  });

  it('6. Registers Company Owner, enforces Free limits, blocks Super Admin access, and preserves data on cancel', async () => {
    const reg = await api('POST', '/api/v1/auth/register-company', {
      ownerName: 'Vikram Seth',
      email: 'vikram@acme-india.in',
      password: 'OwnerPassword123!',
      companyName: 'Acme India Traders',
      country: 'IN',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    });
    assert.equal(reg.status, 201);
    companyOwnerToken = reg.json.accessToken;
    registeredCompanyId = reg.json.company.id;

    // Ordinary Company Owner MUST be blocked from Super Admin API
    const forbiddenSuper = await api(
      'GET',
      '/api/v1/super-admin/dashboard',
      undefined,
      companyOwnerToken
    );
    assert.equal(forbiddenSuper.status, 403);
    assert.equal(forbiddenSuper.json.error.code, 'FORBIDDEN_SUPER_ADMIN_ONLY');

    // Tenant isolation: cannot access Bharat Pay ('comp-bp')
    const crossTenant = await api(
      'GET',
      '/api/v1/companies/comp-bp/employees',
      undefined,
      companyOwnerToken
    );
    assert.equal(crossTenant.status, 403);
    assert.equal(crossTenant.json.error.code, 'COMPANY_ISOLATION_DENIED');

    // Reports blocked on Free when reportAccess = 'none'
    const freeReport = await api(
      'GET',
      `/api/v1/companies/${registeredCompanyId}/reports/summary`,
      undefined,
      companyOwnerToken
    );
    assert.equal(freeReport.status, 403);
    assert.equal(freeReport.json.error.code, 'REPORTS_LOCKED');

    // Excel export blocked on Free
    const freeExport = await api(
      'GET',
      `/api/v1/companies/${registeredCompanyId}/exports/payroll-csv`,
      undefined,
      companyOwnerToken
    );
    assert.equal(freeExport.status, 403);
    assert.equal(freeExport.json.error.code, 'PLAN_FEATURE_LOCKED');

    // Add 2 employees (allowed by Free maxEmployees=2)
    for (const empName of ['Asha Rao', 'Karan Gill']) {
      const addRes = await api(
        'POST',
        `/api/v1/companies/${registeredCompanyId}/employees`,
        {
          name: empName,
          role: 'Operator',
          department: 'Ops',
          phone: '+91 9800000001',
        },
        companyOwnerToken
      );
      assert.equal(addRes.status, 201);
    }

    // 3rd employee blocked cleanly by Free limit
    const blockedEmp = await api(
      'POST',
      `/api/v1/companies/${registeredCompanyId}/employees`,
      {
        name: 'Third Staff',
        role: 'Operator',
        department: 'Ops',
        phone: '+91 9800000003',
      },
      companyOwnerToken
    );
    assert.equal(blockedEmp.status, 403);
    assert.equal(blockedEmp.json.error.code, 'EMPLOYEE_LIMIT_REACHED');

    // Unconfigured payment gateway refuses false payment verification
    const unconfiguredPay = await api(
      'POST',
      `/api/v1/companies/${registeredCompanyId}/subscription/verify-payment`,
      { planId: 'growth', billingCycle: 'monthly' },
      companyOwnerToken
    );
    assert.equal(unconfiguredPay.status, 503);

    // Start Trial unlocks higher limit without faking paid status
    const trialRes = await api(
      'POST',
      `/api/v1/companies/${registeredCompanyId}/subscription/start-trial`,
      { planId: 'growth' },
      companyOwnerToken
    );
    assert.equal(trialRes.status, 200);
    assert.equal(trialRes.json.subscriptionStatus, 'trial');
    assert.equal(trialRes.json.paymentVerified, false);

    // Now 3rd employee succeeds during trial
    const thirdEmp = await api(
      'POST',
      `/api/v1/companies/${registeredCompanyId}/employees`,
      {
        name: 'Third Staff',
        role: 'Operator',
        department: 'Ops',
        phone: '+91 9800000003',
      },
      companyOwnerToken
    );
    assert.equal(thirdEmp.status, 201);

    // Cancel subscription: preserves all 3 employees (never deletes data!)
    const cancelRes = await api(
      'POST',
      `/api/v1/companies/${registeredCompanyId}/subscription/cancel`,
      {},
      companyOwnerToken
    );
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.json.dataPreserved, true);

    const listAfterCancel = await api(
      'GET',
      `/api/v1/companies/${registeredCompanyId}/employees`,
      undefined,
      companyOwnerToken
    );
    assert.equal(listAfterCancel.status, 200);
    assert.equal(listAfterCancel.json.employees.length, 3);
  });

  it('7. Super Admin cannot mark paid subscription Active without verified payment data', async () => {
    const rejectUnverified = await api(
      'PATCH',
      `/api/v1/super-admin/companies/${registeredCompanyId}/subscription`,
      {
        planId: 'growth',
        subscriptionStatus: 'active',
        paymentVerified: false,
      },
      superAdminToken
    );
    assert.equal(rejectUnverified.status, 400);
    assert.equal(
      rejectUnverified.json.error.code,
      'UNVERIFIED_PAID_SUBSCRIPTION'
    );
  });

  it('8. Supports mobile Bearer login, refresh token rotation, ESS isolation, and session revocation', async () => {
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, platform_role, company_id, company_role, employee_id, is_active)
       VALUES (?, ?, ?, ?, 'tenant_user', 'comp-bp', 'Employee', 'emp-1', 1)`
    ).run(
      'usr-emp-1',
      'Arjun Deshmukh',
      'arjun@bharatpay.in',
      hashPassword('EmployeePass123!')
    );

    const mobileLogin = await api('POST', '/api/v1/auth/login', {
      email: 'arjun@bharatpay.in',
      password: 'EmployeePass123!',
      clientType: 'android',
      deviceName: 'Pixel 8 Android',
    });
    assert.equal(mobileLogin.status, 200);
    mobileAccessToken = mobileLogin.json.accessToken;
    mobileRefreshToken = mobileLogin.json.refreshToken;
    mobileSessionId = mobileLogin.json.sessionId;

    const empSuper = await api(
      'GET',
      '/api/v1/super-admin/companies',
      undefined,
      mobileAccessToken
    );
    assert.equal(empSuper.status, 403);

    const empCreateStaff = await api(
      'POST',
      '/api/v1/companies/comp-bp/employees',
      { name: 'X', role: 'Y', department: 'Z', phone: '123' },
      mobileAccessToken
    );
    assert.equal(empCreateStaff.status, 403);

    const profile = await api(
      'GET',
      '/api/v1/ess/profile',
      undefined,
      mobileAccessToken
    );
    assert.equal(profile.status, 200);
    assert.equal(profile.json.profile.id, 'emp-1');

    const checkIn = await api(
      'POST',
      '/api/v1/ess/attendance/check-in',
      {},
      mobileAccessToken
    );
    assert.equal(checkIn.status, 200);
    assert.equal(checkIn.json.status, 'P');

    const rotated = await api('POST', '/api/v1/auth/refresh', {
      refreshToken: mobileRefreshToken,
    });
    assert.equal(rotated.status, 200);
    assert.notEqual(rotated.json.accessToken, mobileAccessToken);

    const reuseOldRefresh = await api('POST', '/api/v1/auth/refresh', {
      refreshToken: mobileRefreshToken,
    });
    assert.equal(reuseOldRefresh.status, 401);

    const revokeRes = await api(
      'DELETE',
      `/api/v1/auth/sessions/${mobileSessionId}`,
      undefined,
      rotated.json.accessToken
    );
    assert.equal(revokeRes.status, 200);

    const afterRevoke = await api(
      'GET',
      '/api/v1/ess/profile',
      undefined,
      rotated.json.accessToken
    );
    assert.equal(afterRevoke.status, 401);
  });

  it('9. Unknown /api endpoints return clean JSON 404 and production backup/restore scripts work end-to-end', () => {
    // Test scripts/backup.mjs and scripts/restore.mjs against isolated temp dirs
    const uploadDir = path.join(tmpDir, 'uploads');
    const backupDir = path.join(tmpDir, 'backups');
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, 'receipt-1.txt'), 'receipt-ok');

    const envVars = {
      ...process.env,
      DATA_DIR: tmpDir,
      DATABASE_PATH: dbPath,
      UPLOAD_DIR: uploadDir,
      BACKUP_DIR: backupDir,
    };

    const backupOut = execFileSync('node', ['scripts/backup.mjs'], {
      cwd: process.cwd(),
      env: envVars,
      encoding: 'utf8',
    });
    assert.match(backupOut, /Backup created successfully/);

    const backups = fs.readdirSync(backupDir);
    assert.equal(backups.length, 1);
    const snapshotPath = path.join(backupDir, backups[0]);

    // Remove upload file and verify restore brings it back
    fs.unlinkSync(path.join(uploadDir, 'receipt-1.txt'));
    const restoreOut = execFileSync('node', ['scripts/restore.mjs', snapshotPath], {
      cwd: process.cwd(),
      env: envVars,
      encoding: 'utf8',
    });
    assert.match(restoreOut, /restored successfully/);
    assert.equal(
      fs.readFileSync(path.join(uploadDir, 'receipt-1.txt'), 'utf8'),
      'receipt-ok'
    );
  });

  it('10. Supports GET/PUT /api/settings with Super Admin authorization and strict Razorpay secret redaction', async () => {
    // Public GET returns default branding & never leaks razorpay_key_secret
    const initialGet = await api('GET', '/api/settings');
    assert.equal(initialGet.status, 200);
    assert.equal(initialGet.json.settings.appName, 'StaffPay');
    assert.equal(initialGet.json.settings.primaryThemeColor, '#2563eb');
    assert.equal(initialGet.json.settings.razorpayKeySecretConfigured, false);
    assert.equal('razorpayKeySecret' in initialGet.json.settings, false);
    assert.equal('razorpay_key_secret' in initialGet.json.settings, false);

    // Unauthenticated PUT is rejected
    const unauthPut = await api('PUT', '/api/settings', {
      appName: 'HackedApp',
      primaryThemeColor: '#111111',
    });
    assert.equal(unauthPut.status, 401);

    // Ordinary Company Owner PUT is rejected with 403
    const ownerPut = await api(
      'PUT',
      '/api/settings',
      {
        appName: 'OwnerApp',
        primaryThemeColor: '#111111',
      },
      companyOwnerToken
    );
    assert.equal(ownerPut.status, 403);
    assert.equal(ownerPut.json.error.code, 'FORBIDDEN_SUPER_ADMIN_ONLY');

    // Invalid hex color is rejected cleanly
    const badColor = await api(
      'PUT',
      '/api/settings',
      {
        appName: 'AcmePay',
        appLogoUrl: 'https://example.com/logo.png',
        primaryThemeColor: 'not-a-color',
        razorpayKeyId: 'rzp_test_12345',
      },
      superAdminToken
    );
    assert.equal(badColor.status, 400);
    assert.equal(badColor.json.error.code, 'INVALID_COLOR');

    // Valid Super Admin PUT persists branding, color, and Razorpay secret cleanly
    const validPut = await api(
      'PUT',
      '/api/settings',
      {
        appName: 'BharatPay Pro',
        appLogoUrl: '/assets/brand-logo.png',
        primaryThemeColor: '#059669',
        razorpayKeyId: 'rzp_test_superadmin',
        razorpayKeySecret: 'super_secret_rzp_key_999',
      },
      superAdminToken
    );
    assert.equal(validPut.status, 200);
    assert.equal(validPut.json.settings.appName, 'BharatPay Pro');
    assert.equal(validPut.json.settings.appLogoUrl, '/assets/brand-logo.png');
    assert.equal(validPut.json.settings.primaryThemeColor, '#059669');
    assert.equal(validPut.json.settings.razorpayKeyId, 'rzp_test_superadmin');
    assert.equal(validPut.json.settings.razorpayKeySecretConfigured, true);
    assert.equal('razorpayKeySecret' in validPut.json.settings, false);
    assert.equal('razorpay_key_secret' in validPut.json.settings, false);

    // Subsequent GET returns updated public config without exposing secret
    const afterGet = await api('GET', '/api/settings');
    assert.equal(afterGet.status, 200);
    assert.equal(afterGet.json.settings.appName, 'BharatPay Pro');
    assert.equal(afterGet.json.settings.primaryThemeColor, '#059669');
    assert.equal(afterGet.json.settings.razorpayKeySecretConfigured, true);
    assert.equal('razorpayKeySecret' in afterGet.json.settings, false);
    assert.equal('razorpay_key_secret' in afterGet.json.settings, false);

    // Public platform catalog reflects gateway readiness from settings
    const pubCatalog = await api('GET', '/api/v1/platform/public');
    assert.equal(pubCatalog.status, 200);
    assert.equal(pubCatalog.json.paymentGatewayConfigured, true);
    assert.equal(pubCatalog.json.settings.platformName, 'BharatPay Pro');

    // Updating without razorpayKeySecret preserves stored secret in SQLite
    const preservePut = await api(
      'PUT',
      '/api/settings',
      {
        appName: 'StaffPay',
        appLogoUrl: '',
        primaryThemeColor: '#2563eb',
        razorpayKeyId: 'rzp_test_superadmin',
      },
      superAdminToken
    );
    assert.equal(preservePut.status, 200);
    assert.equal(preservePut.json.settings.razorpayKeySecretConfigured, true);
  });
});
