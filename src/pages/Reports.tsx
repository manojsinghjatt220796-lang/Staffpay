import { useMemo } from 'react';
import { ArrowRight, Download, FileSpreadsheet, Lock } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useSubscription } from '../context/SubscriptionContext';

export function Reports() {
  const { activeEmployees, expenses } = useAppData();
  const {
    canExportExcel,
    canExportPdf,
    reportAccessLevel,
    freeLimits,
    openUpgradeModal,
  } = useSubscription();

  const departmentBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { department: string; headcount: number; totalCost: number }
    >();

    activeEmployees.forEach((emp) => {
      const current = map.get(emp.department) || {
        department: emp.department,
        headcount: 0,
        totalCost: 0,
      };
      current.headcount += 1;
      current.totalCost += emp.baseSalary + emp.allowances;
      map.set(emp.department, current);
    });

    return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
  }, [activeEmployees]);

  const maxDeptCost = Math.max(
    ...departmentBreakdown.map((d) => d.totalCost),
    1
  );

  const isLockedCompletely = reportAccessLevel === 'none';
  const isSummaryOnly = reportAccessLevel === 'summary';

  const handleExport = (format: 'PDF' | 'Excel') => {
    const allowed = format === 'Excel' ? canExportExcel : canExportPdf;
    if (!allowed) {
      openUpgradeModal(
        `Export ${format} Report`,
        freeLimits.upgradePromptMessage ||
          `Full analytics and ${format} exports require an upgraded subscription plan.`
      );
      return;
    }

    if (format === 'Excel') {
      const rows = [
        ['Department', 'Headcount', 'Monthly Gross Payroll (INR)'],
        ...departmentBreakdown.map((d) => [
          d.department,
          String(d.headcount),
          String(d.totalCost),
        ]),
      ];
      const csv = rows.map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'staffpay-department-payroll-report.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Reports & Analytics
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Department payroll allocation, statutory PF/ESI summaries, and
            expense audits
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleExport('Excel')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {!canExportExcel ? (
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('PDF')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {!canExportPdf ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {isSummaryOnly && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <span>
            Summary Report Access: Department overview is visible. Compliance breakdown and Excel/PDF exports require an upgraded plan.
          </span>
          <button
            type="button"
            onClick={() =>
              openUpgradeModal(
                'Full Reports & Compliance Exports',
                freeLimits.upgradePromptMessage
              )
            }
            className="text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap cursor-pointer"
          >
            Upgrade Plan →
          </button>
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white">
        <div
          className={`space-y-6 p-6 transition-all duration-200 ${
            isLockedCompletely
              ? 'blur-md select-none pointer-events-none opacity-60'
              : ''
          }`}
          aria-hidden={isLockedCompletely}
        >
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              Department-Wise Monthly Cost Distribution
            </h3>
            <div className="space-y-3.5">
              {departmentBreakdown.map((dept) => {
                const widthPct = Math.round(
                  (dept.totalCost / maxDeptCost) * 100
                );
                return (
                  <div key={dept.department} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-800 font-medium">
                        {dept.department}{' '}
                        <span className="text-slate-500 text-xs font-normal">
                          ({dept.headcount} staff)
                        </span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-900 font-medium">
                        ₹{dept.totalCost.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="h-full bg-blue-600 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className={`pt-4 border-t border-gray-200 ${
              isSummaryOnly ? 'blur-xs select-none pointer-events-none opacity-60' : ''
            }`}
          >
            <h3 className="text-base font-semibold text-slate-900 mb-3">
              Compliance & Expense Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold text-slate-500">
                    <th className="py-2.5 pr-4">Department</th>
                    <th className="py-2.5 px-4 text-right">Headcount</th>
                    <th className="py-2.5 px-4 text-right">EPF Employer (12%)</th>
                    <th className="py-2.5 pl-4 text-right">Gross Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {departmentBreakdown.map((dept) => (
                    <tr key={dept.department}>
                      <td className="py-3 pr-4 text-slate-900 font-medium">
                        {dept.department}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {dept.headcount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        ₹
                        {Math.round(dept.totalCost * 0.095).toLocaleString(
                          'en-IN'
                        )}
                      </td>
                      <td className="py-3 pl-4 text-right font-mono tabular-nums text-slate-900 font-medium">
                        ₹{dept.totalCost.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="py-3 pr-4 text-slate-900">
                      Total Operational Expenses Logged
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {expenses.length} claims
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">—</td>
                    <td className="py-3 pl-4 text-right font-mono tabular-nums text-blue-700">
                      ₹
                      {expenses
                        .reduce((s, e) => s + e.amount, 0)
                        .toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {isLockedCompletely && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-white/70 backdrop-blur-[2px]">
            <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-6 text-center shadow-lg">
              <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Upgrade to view full reports
              </h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                {freeLimits.upgradePromptMessage}
              </p>
              <button
                type="button"
                onClick={() =>
                  openUpgradeModal(
                    'Reports & Analytics Suite',
                    freeLimits.upgradePromptMessage
                  )
                }
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                <span>Upgrade Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
