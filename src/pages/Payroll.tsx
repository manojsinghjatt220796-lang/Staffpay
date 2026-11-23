import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileText,
  Lock,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { StatCard } from '../components/StatCard';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { evaluateLateArrivalPenalty } from './SalaryRules';

export function Payroll() {
  const {
    activeEmployees,
    activeCompany,
    salaryRules,
    attendanceRegister,
    payrollProcessedMonth,
    lastPayrollRunAt,
    markPayrollProcessed,
  } = useAppData();
  const { permissions } = useAuth();
  const {
    hasAutomatedPayroll,
    hasReportExports,
    openUpgradeModal,
  } = useSubscription();

  const [selectedMonth, setSelectedMonth] = useState('November 2026');
  const [payslipEmpId, setPayslipEmpId] = useState<string | null>(null);

  const payrollRows = useMemo(() => {
    const dayEntryMap = attendanceRegister['2026-11-23'] || {};

    return activeEmployees.map((emp) => {
      const base = emp.baseSalary;
      const bonus = salaryRules.defaultMonthlyBonus.enabled
        ? salaryRules.defaultMonthlyBonus.amount
        : 0;
      const incentive = salaryRules.defaultMonthlyIncentives.enabled
        ? salaryRules.defaultMonthlyIncentives.amount
        : 0;

      const todayRec = dayEntryMap[emp.id];
      const otHours = todayRec?.overtimeHours || 0;
      const overtimePay = salaryRules.overtimePayment.enabled
        ? Math.round(otHours * salaryRules.overtimePayment.ratePerHour)
        : 0;

      const allowances = emp.allowances + bonus + incentive + overtimePay;

      const pf = Math.min(Math.round(base * 0.12), 1800);
      const gross = base + allowances;
      const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
      const pt = 200;

      const penalty =
        todayRec?.status === 'P'
          ? evaluateLateArrivalPenalty(todayRec.lateMinutes || 0, salaryRules)
          : { isHalfDayOverride: false, lateFine: 0, halfDayDeduction: 0 };

      const absentDeduction =
        todayRec?.status === 'A' && salaryRules.absentDayDeduction.enabled
          ? salaryRules.absentDayDeduction.amountPerDay
          : (todayRec?.status === 'HD' || penalty.isHalfDayOverride) &&
              salaryRules.halfDayDeduction.enabled
            ? salaryRules.halfDayDeduction.amountPerHalfDay
            : penalty.lateFine;

      const advanceDeduction = salaryRules.defaultAdvanceDeduction.enabled
        ? salaryRules.defaultAdvanceDeduction.amount
        : 0;
      const loanDeduction = salaryRules.defaultLoanDeduction.enabled
        ? salaryRules.defaultLoanDeduction.amount
        : 0;

      const deductions =
        pf + esi + pt + absentDeduction + advanceDeduction + loanDeduction;
      const netPay = Math.max(0, gross - deductions);

      return {
        employee: emp,
        base,
        allowances,
        pf,
        pt,
        absentDeduction,
        overtimePay,
        deductions,
        netPay,
      };
    });
  }, [activeEmployees, salaryRules, attendanceRegister]);

  const totals = useMemo(() => {
    return payrollRows.reduce(
      (acc, row) => ({
        gross: acc.gross + row.base + row.allowances,
        deductions: acc.deductions + row.deductions,
        net: acc.net + row.netPay,
      }),
      { gross: 0, deductions: 0, net: 0 }
    );
  }, [payrollRows]);

  const isCurrentMonthProcessed = payrollProcessedMonth === selectedMonth;

  const handleRunPayroll = () => {
    if (!permissions.canRunPayroll) {
      return;
    }
    if (!hasAutomatedPayroll) {
      openUpgradeModal(
        'Automated Payroll & Salary Rules',
        'Free Plan provides view-only payroll estimates. Upgrade to Starter or Growth Plan to run automated payroll and apply salary rules.'
      );
      return;
    }
    markPayrollProcessed(selectedMonth);
  };

  const handleExportRegister = () => {
    if (!hasReportExports) {
      openUpgradeModal(
        'Export Payroll Register',
        'Upgrade to Growth Plan to export payroll registers and PF/ESI compliance sheets.'
      );
      return;
    }

    const header = [
      'Code',
      'Employee',
      'Department',
      'Base',
      'Allowances',
      'Deductions',
      'Net Pay',
    ].join(',');
    const lines = payrollRows.map((r) =>
      [
        r.employee.code,
        `"${r.employee.name}"`,
        `"${r.employee.department}"`,
        r.base,
        r.allowances,
        r.deductions,
        r.netPay,
      ].join(',')
    );
    const blob = new Blob([[header, ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staffpay-payroll-${selectedMonth.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activePayslip = payrollRows.find(
    (r) => r.employee.id === payslipEmpId
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Payroll Processing
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {hasAutomatedPayroll
              ? 'Linked with Salary Rules, Daily Attendance Register, and PF/ESI slabs'
              : 'View-only mode on Free Plan — upgrade to run automated payouts'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Select payroll cycle"
            className="px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900"
          >
            <option value="November 2026">November 2026</option>
            <option value="October 2026">October 2026</option>
            <option value="September 2026">September 2026</option>
          </select>

          <button
            type="button"
            onClick={handleExportRegister}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {!hasReportExports ? (
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Export CSV</span>
          </button>

          {permissions.canRunPayroll && (
            <button
              type="button"
              onClick={handleRunPayroll}
              aria-disabled={!hasAutomatedPayroll}
              className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                !hasAutomatedPayroll
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  : isCurrentMonthProcessed
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {!hasAutomatedPayroll ? (
                <Lock className="w-4 h-4 text-slate-600" />
              ) : isCurrentMonthProcessed ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>
                {isCurrentMonthProcessed && hasAutomatedPayroll
                  ? 'Payroll Processed'
                  : 'Run Payroll'}
              </span>
            </button>
          )}
        </div>
      </div>

      {!hasAutomatedPayroll && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-3 text-sm text-amber-900">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Automated payroll runs and statutory PF/ESI filings are locked on
              the Free Plan.
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              openUpgradeModal(
                'Automated Payroll Processing',
                'Upgrade to Starter or Growth Plan to unlock automated payroll runs.'
              )
            }
            className="text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Unlock Automated Payroll →
          </button>
        </div>
      )}

      {hasAutomatedPayroll && isCurrentMonthProcessed && (
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Payroll for <span className="font-semibold">{selectedMonth}</span>{' '}
              processed at{' '}
              <span className="font-mono tabular-nums">{lastPayrollRunAt}</span>{' '}
              for {payrollRows.length} employees.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          label="Gross Monthly Payroll"
          value={`₹${totals.gross.toLocaleString('en-IN')}`}
          subtext={`Base + Allowances + Salary Rules`}
          icon={FileText}
        />
        <StatCard
          label="Deductions (PF / PT / Absence)"
          value={`₹${totals.deductions.toLocaleString('en-IN')}`}
          subtext="Calculated from EPFO & Salary Rules"
          icon={ShieldCheck}
        />
        <StatCard
          label="Net Disbursal Payable"
          value={`₹${totals.net.toLocaleString('en-IN')}`}
          subtext={`Cycle: ${selectedMonth}`}
          icon={CheckCircle2}
          tone="positive"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold text-slate-500 bg-gray-50">
                <th className="py-3.5 px-5">Employee</th>
                <th className="py-3.5 px-5 text-right">Base</th>
                <th className="py-3.5 px-5 text-right">Allowances & OT</th>
                <th className="py-3.5 px-5 text-right">Deductions</th>
                <th className="py-3.5 px-5 text-right">Net Pay</th>
                <th className="py-3.5 px-5 text-right">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {payrollRows.map((row) => (
                <tr key={row.employee.id} className="hover:bg-gray-50/70">
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-slate-900">
                      {row.employee.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      <span className="font-mono">{row.employee.code}</span>{' '}
                      <span aria-hidden="true">·</span> {row.employee.role}
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums text-slate-700">
                    ₹{row.base.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums text-emerald-700">
                    +₹{row.allowances.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums text-rose-600">
                    -₹{row.deductions.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums font-semibold text-slate-900">
                    ₹{row.netPay.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (!hasAutomatedPayroll) {
                          openUpgradeModal(
                            'Employee Payslip Generation',
                            'Upgrade to Starter or Growth Plan to view and download salary slips.'
                          );
                          return;
                        }
                        setPayslipEmpId(row.employee.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
                    >
                      {!hasAutomatedPayroll && (
                        <Lock className="w-3 h-3 text-slate-500" />
                      )}
                      <span>View Slip</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={Boolean(activePayslip)}
        onClose={() => setPayslipEmpId(null)}
        title={`Salary Slip — ${selectedMonth}`}
        subtitle={
          activePayslip
            ? `${activePayslip.employee.name} · ${activePayslip.employee.code}`
            : ''
        }
      >
        {activePayslip && (
          <div className="space-y-4 text-sm">
            <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">
                  {activeCompany.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  PF Reg: {activeCompany.pfRegistration}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Department</div>
                <div className="text-slate-800 font-medium">
                  {activePayslip.employee.department}
                </div>
              </div>
            </div>

            <div className="space-y-2 border-b border-gray-200 pb-3">
              <div className="flex justify-between text-slate-700">
                <span>Basic Salary</span>
                <span className="font-mono tabular-nums">
                  ₹{activePayslip.base.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Allowances, Bonus & Overtime</span>
                <span className="font-mono tabular-nums text-emerald-700">
                  +₹{activePayslip.allowances.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>EPF + Professional Tax</span>
                <span className="font-mono tabular-nums text-rose-600">
                  -₹{(activePayslip.pf + activePayslip.pt).toLocaleString('en-IN')}
                </span>
              </div>
              {activePayslip.absentDeduction > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Attendance Deduction</span>
                  <span className="font-mono tabular-nums text-rose-600">
                    -₹{activePayslip.absentDeduction.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-base font-semibold text-slate-900">
              <span>Net Take-Home Pay</span>
              <span className="font-mono tabular-nums">
                ₹{activePayslip.netPay.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
