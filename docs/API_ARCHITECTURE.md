# StaffPay Mobile-Ready REST API Architecture (`/api/v1`)

StaffPay exposes a versioned JSON REST API under `/api/v1/*` built on Express + SQLite. Both the web application and future **Android (Kotlin)** / **iOS (Swift)** native mobile clients share the exact same business rules, role-based access control, company tenant isolation, and subscription entitlement checks.

---

## 1. Base URL & Headers

- **Production Base URL:** `https://api.yourdomain.com/api/v1` (or `https://app.yourdomain.com/api/v1`)
- **Required Headers for Protected Endpoints:**
  ```http
  Authorization: Bearer <accessToken>
  Content-Type: application/json
  ```
- **Mobile Client CORS Note:** Native Android/iOS HTTP clients without browser `Origin` headers are permitted automatically by the API server while browser requests remain restricted to `CORS_ORIGINS`.

---

## 2. Authentication & Session Lifecycle

StaffPay uses opaque cryptographically random **Bearer Access Tokens** paired with **Rotating Refresh Tokens** (hashed with SHA-256 in the `sessions` table).

### Endpoints

| Method | Path | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/auth/bootstrap-status` | Public | Check whether a platform Super Admin exists yet |
| `POST` | `/api/v1/auth/bootstrap-super-admin` | Public (One-time) | Claim the initial Super Admin account if none exists |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user (`clientType`: `'web' \| 'android' \| 'ios'`, `deviceName`) |
| `POST` | `/api/v1/auth/refresh` | Public (Refresh Token) | Rotate access + refresh tokens for mobile persistence |
| `POST` | `/api/v1/auth/logout` | Bearer | Revoke current session |
| `GET` | `/api/v1/auth/me` | Bearer | Fetch authenticated user profile & role |
| `GET` | `/api/v1/auth/sessions` | Bearer | List active device sessions for the logged-in account |
| `DELETE` | `/api/v1/auth/sessions/:sessionId` | Bearer | Remotely revoke a specific mobile/web session |
| `POST` | `/api/v1/auth/register-company` | Public | Self-register a new Company Owner + workspace (if enabled) |

---

## 3. Platform Catalog & Tenant Isolation

All `/api/v1/companies/:companyId/*` routes enforce:
1. **Authentication (`requireAuth`)**: Valid, non-revoked, non-expired Bearer token.
2. **Company Isolation (`requireCompanyAccess`)**: Users can only read/write data belonging to their own `companyId` (cross-company access returns `403 COMPANY_ISOLATION_DENIED`).
3. **Role Permissions (`requireCompanyRole`)**: Company Owner vs HR Manager vs Payroll Admin vs Department Lead vs Employee.
4. **Plan & Feature Gates (`requirePlanFeature`)**: Dynamically checks the company's effective subscription plan (and Free plan limits) configured by the Super Admin.

### Public & Company Endpoints

- `GET /api/v1/platform/public` — Active plans, display order, Free plan limits, platform branding, `paymentGatewayConfigured`.
- `GET /api/v1/companies/:companyId/subscription` — Company's effective plan, status, employee count vs `maxEmployees`, `paymentVerified`.
- `POST /api/v1/companies/:companyId/subscription/start-trial` — Activate trial on eligible paid plans (never falsely sets `paymentVerified`).
- `POST /api/v1/companies/:companyId/subscription/cancel` — Cancel paid plan cleanly without deleting any employees or records.
- `POST /api/v1/companies/:companyId/subscription/verify-payment` — Verify Razorpay HMAC signature (`503` if gateway keys unconfigured).
- `GET /api/v1/companies/:companyId/employees` — List company staff.
- `POST /api/v1/companies/:companyId/employees` — Onboard staff (enforces `maxEmployees` & server-side Free limits).
- `PATCH /api/v1/companies/:companyId/employees/:empId/archive` — Archive (soft-remove) employee.
- `POST /api/v1/companies/:companyId/employees/:empId/restore` — Restore archived employee.
- `GET /api/v1/companies/:companyId/reports/summary` — Honors `freeLimits.reportAccess` (`none`, `summary`, `full`).
- `GET /api/v1/companies/:companyId/exports/payroll-csv` — Gated on `excelExport` plan feature.

---

## 4. Employee Self-Service (ESS) Mobile Endpoints

Scoped strictly to `req.auth.employeeId` and `req.auth.companyId`. When `clientType` is `'android'` or `'ios'`, the server also verifies the company's plan includes `mobileAppAccess`.

- `GET /api/v1/ess/profile` — Fetch own employee profile.
- `POST /api/v1/ess/attendance/check-in` — Record self-attendance check-in for today.
- `GET /api/v1/ess/leaves` — List own leave requests.
- `POST /api/v1/ess/leaves` — Submit a leave request.

---

## 5. Persistent File Uploads

- `POST /api/v1/uploads` (`multipart/form-data`, field `file`, max 5 MB, `JPG`/`PNG`/`WEBP`/`PDF`) — Stores files outside `dist/` in `UPLOAD_DIR`.
- `GET /api/v1/uploads/:fileId` — Authenticated download enforcing company ownership and path confinement.

---

## 6. Super Admin Endpoints (`/api/v1/super-admin/*`)

Protected exclusively by `requireAuth` + `requireSuperAdmin` (`platformRole === 'super_admin'`). Ordinary company accounts receive `403 FORBIDDEN_SUPER_ADMIN_ONLY`.

- `GET /api/v1/super-admin/dashboard`
- `GET /api/v1/super-admin/plans`
- `POST /api/v1/super-admin/plans`
- `PATCH /api/v1/super-admin/plans/:planId`
- `POST /api/v1/super-admin/plans/:planId/status`
- `GET /api/v1/super-admin/free-limits`
- `PATCH /api/v1/super-admin/free-limits`
- `GET /api/v1/super-admin/companies`
- `PATCH /api/v1/super-admin/companies/:companyId/subscription`
- `GET /api/v1/super-admin/settings`
- `PATCH /api/v1/super-admin/settings`

---

## 7. Standardized Error Format

All errors return sanitized JSON with zero SQL traces or stack dumps:

```json
{
  "error": {
    "code": "EMPLOYEE_LIMIT_REACHED",
    "message": "You have reached the Free Plan limit. Upgrade your workspace plan to unlock more employees."
  }
}
```
