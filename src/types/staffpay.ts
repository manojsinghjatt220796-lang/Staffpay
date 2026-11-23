export type PlanTier = 'free' | 'starter' | 'growth' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type Language = 'en' | 'hi';

export type UserRole =
  | 'Company Owner'
  | 'HR Manager'
  | 'Payroll Admin'
  | 'Department Lead'
  | 'Employee';

export type EmployeeStatus =
  | 'Active'
  | 'Inactive'
  | 'On Leave'
  | 'Probation'
  | 'Archived';

export interface ShiftDefinition {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  graceMinutes: number;
  targetCapacity: number;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  status: EmployeeStatus;
  shifts: string[];
  baseSalary: number;
  allowances: number;
  joinedDate: string;
  leftDate?: string;
  leavingReason?: string;
  avatarUrl?: string;
  employmentType?: 'Full-time' | 'Part-time';
  payFrequency?: 'Monthly' | 'Bi-weekly' | 'Weekly';
  workLocation?: string;
  residentialAddress?: string;
  emergencyContact?: string;
}

export type AttendanceCode = 'P' | 'A' | 'HD' | 'PL' | 'UL' | 'WO' | 'H';

export interface DailyAttendanceEntry {
  employeeId: string;
  status: AttendanceCode;
  overtimeHours: number;
  checkInTime?: string;
  checkOutTime?: string;
  lateMinutes?: number;
  lateFine?: number;
}

export type AttendanceRegisterMap = Record<
  string,
  Record<string, DailyAttendanceEntry>
>;

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  leaveType: 'Casual Leave' | 'Sick Leave' | 'Earned Leave';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  category:
    | 'Employee Reimbursement'
    | 'Travel & Fuel'
    | 'Office Supplies'
    | 'Software & Tools'
    | 'Client Meals'
    | 'Logistics';
  date: string;
  submittedBy: string;
  status: 'Pending' | 'Approved' | 'Reimbursed';
  paymentMethod?: 'Bank Transfer' | 'Cash' | 'UPI' | 'Corporate Card' | 'Cheque';
  paidBy?: string;
  vendor?: string;
  employeeId?: string;
  notes?: string;
  receiptName?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: {
    runPayroll: boolean;
    approveLeaves: boolean;
    approveExpenses: boolean;
    manageStaff: boolean;
  };
  lastActive: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  shortCode: string;
  industry: string;
  gstin: string;
  pfRegistration: string;
  esiCode: string;
  city: string;
}

export interface SalaryRulesConfig {
  monthlyBaseSalary: {
    enabled: boolean;
    defaultAmount: number;
    basis: 'Calendar Days' | '26 Working Days' | '30 Fixed Days';
  };
  absentDayDeduction: {
    enabled: boolean;
    amountPerDay: number;
  };
  halfDayDeduction: {
    enabled: boolean;
    amountPerHalfDay: number;
  };
  unpaidLeaveDeduction: {
    enabled: boolean;
    method: 'Pro-rata Daily Salary' | 'Fixed Daily Rate' | 'Base / 26 Days';
  };
  overtimePayment: {
    enabled: boolean;
    ratePerHour: number;
  };
  sundayHolidayOvertime: {
    enabled: boolean;
    sundayMultiplier: '1.5x Hourly Rate' | '2.0x Hourly Rate';
    holidayRatePerHour: number;
  };
  lateArrivalRules: {
    enabled: boolean;
    lateFine30Min: number;
    lateFine1Hour: number;
    lateFine2Hour: number;
    halfDayThresholdMins: number;
  };
  defaultMonthlyBonus: {
    enabled: boolean;
    amount: number;
  };
  defaultMonthlyIncentives: {
    enabled: boolean;
    amount: number;
  };
  defaultAdvanceDeduction: {
    enabled: boolean;
    amount: number;
  };
  defaultLoanDeduction: {
    enabled: boolean;
    amount: number;
  };
}

export type PlatformRole = 'super_admin' | 'tenant_user';

export type PlanStatus = 'active' | 'inactive' | 'archived';

export type SubscriptionStatus =
  | 'free'
  | 'trial'
  | 'active'
  | 'expiring'
  | 'expired'
  | 'cancelled'
  | 'grace_period';

export type PlanFeatureKey =
  | 'employeeManagement'
  | 'attendanceManagement'
  | 'leaveManagement'
  | 'monthlyPayroll'
  | 'salaryRules'
  | 'employeeSelfService'
  | 'reportsAnalytics'
  | 'excelExport'
  | 'pdfExport'
  | 'expenseManagement'
  | 'loanAdvanceManagement'
  | 'notifications'
  | 'customDepartments'
  | 'customRoles'
  | 'multiBranchSupport'
  | 'apiAccess'
  | 'mobileAppAccess';

export const PLAN_FEATURE_META: {
  key: PlanFeatureKey;
  label: string;
  category: 'Core' | 'Payroll & Finance' | 'Reports' | 'Platform & Mobile';
}[] = [
  { key: 'employeeManagement', label: 'Employee Management', category: 'Core' },
  { key: 'attendanceManagement', label: 'Attendance Management', category: 'Core' },
  { key: 'leaveManagement', label: 'Leave Management', category: 'Core' },
  { key: 'employeeSelfService', label: 'Employee Self-Service Portal', category: 'Core' },
  { key: 'monthlyPayroll', label: 'Monthly Payroll', category: 'Payroll & Finance' },
  { key: 'salaryRules', label: 'Salary Rules', category: 'Payroll & Finance' },
  { key: 'expenseManagement', label: 'Expense Management', category: 'Payroll & Finance' },
  { key: 'loanAdvanceManagement', label: 'Loan & Advance Management', category: 'Payroll & Finance' },
  { key: 'reportsAnalytics', label: 'Reports & Analytics', category: 'Reports' },
  { key: 'excelExport', label: 'Excel Export', category: 'Reports' },
  { key: 'pdfExport', label: 'PDF Export', category: 'Reports' },
  { key: 'notifications', label: 'Notifications', category: 'Platform & Mobile' },
  { key: 'customDepartments', label: 'Custom Departments', category: 'Platform & Mobile' },
  { key: 'customRoles', label: 'Custom Roles', category: 'Platform & Mobile' },
  { key: 'multiBranchSupport', label: 'Multi-Branch Support', category: 'Platform & Mobile' },
  { key: 'apiAccess', label: 'API Access', category: 'Platform & Mobile' },
  { key: 'mobileAppAccess', label: 'Future Mobile App Access', category: 'Platform & Mobile' },
];

export interface FreePlanLimits {
  maxEmployees: number;
  reportAccess: 'none' | 'summary' | 'full';
  allowExcelExport: boolean;
  allowPdfExport: boolean;
  trialRestrictions: string;
  maxMonthlyPayrollRuns: number | null;
  upgradePromptMessage: string;
}

export interface ConfigurablePlan {
  id: string;
  slug: string;
  name: string;
  description: string;
  monthlyPriceInr: number | null;
  annualPriceInr: number | null;
  isFree: boolean;
  trialDays: number;
  maxEmployees: number | null;
  maxCompaniesPerAccount: number;
  status: PlanStatus;
  displayOrder: number;
  durationDays: number;
  gracePeriodDays: number;
  autoRenewDefault: boolean;
  features: Record<PlanFeatureKey, boolean>;
  highlights: string[];
  freeLimits?: FreePlanLimits;
}

export interface PlatformSettings {
  platformName: string;
  logoUrl: string;
  defaultCurrency: 'INR';
  defaultLanguage: Language;
  supportEmail: string;
  supportContact: string;
  trialEnabled: boolean;
  defaultTrialDays: number;
  defaultPlanId: string;
  allowSelfRegistration: boolean;
  requireEmailVerification: boolean;
  autoDowngradeOnExpiry: boolean;
  gracePeriodDays: number;
  enforceServerLimits: boolean;
}

export interface CompanySubscriptionSummary {
  id: string;
  name: string;
  shortCode: string;
  city: string;
  country: string;
  currency: string;
  planId: string;
  planName: string;
  billingCycle: BillingCycle;
  subscriptionStatus: SubscriptionStatus;
  employeeCount: number;
  maxEmployees: number | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  graceEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  paymentVerified: boolean;
  lastPaymentRef: string | null;
  lastPaymentAmountInr: number | null;
  lastPaymentAt: string | null;
  createdAt: string;
}

export interface SuperAdminDashboardMetrics {
  totalCompanies: number;
  activeCompanies: number;
  freePlanCompanies: number;
  paidSubscribers: number;
  trialAccounts: number;
  expiredSubscriptions: number;
  gracePeriodCompanies: number;
  cancelledCompanies: number;
  expiringCompanies: number;
  totalEmployees: number;
  monthlySubscriptionRevenueInr: number;
  verifiedTransactionCount: number;
  paymentGatewayConfigured: boolean;
  planBreakdown: {
    planId: string;
    planName: string;
    companyCount: number;
    isFree: boolean;
  }[];
  statusBreakdown: {
    status: SubscriptionStatus;
    count: number;
  }[];
}
