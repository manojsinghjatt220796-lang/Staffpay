import { useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Receipt,
  Users,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { PAYROLL_TREND_DATA } from '../data/mockData';

export function Dashboard() {
  const navigate = useNavigate();
  const {
    language,
    activeCompany,
    activeEmployees,
    attendanceRegister,
    leaves,
    expenses,
    updateLeaveStatus,
  } = useAppData();
  const { user, permissions } = useAuth();
  const { planMeta, employeeLimit } = useSubscription();

  const [chartMetric, setChartMetric] = useState<'payroll' | 'attendance'>(
    'payroll'
  );
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const todayMap = attendanceRegister['2026-11-23'] || {};
  const todayPresentCount = Object.values(todayMap).filter(
    (entry) => entry.status === 'P' || entry.status === 'HD'
  ).length;

  const pendingLeaves = leaves.filter((l) => l.status === 'Pending');
  const firstName = user.name.split(' ')[0];
  const maxPayroll = Math.max(...PAYROLL_TREND_DATA.map((d) => d.payrollLakhs));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight text-balance">
            {language === 'hi'
              ? `वापसी पर स्वागत है, ${firstName}`
              : `Welcome back, ${firstName}`}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {activeCompany.name} <span aria-hidden="true">·</span>{' '}
            {activeCompany.city} <span aria-hidden="true">·</span> Monday, 23
            Nov 2026
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/attendance')}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {language === 'hi' ? 'उपस्थिति दर्ज करें' : 'Daily Register'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {language === 'hi' ? 'टीम देखें' : 'Manage Employees'}
          </button>
        </div>
      </div>

      {/* 3 Primary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          label={language === 'hi' ? 'कुल कर्मचारी' : 'Total Employees'}
          value={activeEmployees.length}
          subtext={
            employeeLimit
              ? `${activeEmployees.length} of ${employeeLimit} seats (${planMeta.name} Plan)`
              : `${activeEmployees.length} active staff · Enterprise`
          }
          icon={Users}
          onClick={() => navigate('/employees')}
        />
        <StatCard
          label={language === 'hi' ? 'आज उपस्थित' : 'Present Today'}
          value={`${todayPresentCount} / ${activeEmployees.length}`}
          subtext={`${Math.round(
            (todayPresentCount / Math.max(activeEmployees.length, 1)) * 100
          )}% checked in for 23 Nov`}
          icon={Clock}
          tone="positive"
          onClick={() => navigate('/attendance')}
        />
        <StatCard
          label={language === 'hi' ? 'लंबित अवकाश' : 'Pending Leaves'}
          value={pendingLeaves.length}
          subtext={
            pendingLeaves.length > 0
              ? 'Awaiting manager review'
              : 'All leave requests resolved'
          }
          icon={CalendarDays}
          tone={pendingLeaves.length > 0 ? 'warning' : 'positive'}
          onClick={() => navigate('/leaves')}
        />
      </div>

      {/* Chart + Action Queues */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <section className="xl:col-span-7 bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {chartMetric === 'payroll'
                  ? 'Monthly Payroll Outflow (₹ Lakhs)'
                  : 'Monthly Attendance Rate (%)'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                6-month operational trend for {activeCompany.name}
              </p>
            </div>

            <div className="inline-flex items-center p-1 bg-gray-100 rounded-lg border border-gray-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartMetric('payroll')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  chartMetric === 'payroll'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Payroll Cost
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('attendance')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  chartMetric === 'attendance'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Attendance %
              </button>
            </div>
          </div>

          <div className="relative pt-4">
            <div className="grid grid-cols-6 gap-3 sm:gap-5 items-end h-56 border-b border-gray-200 pb-3">
              {PAYROLL_TREND_DATA.map((point) => {
                const rawVal =
                  chartMetric === 'payroll'
                    ? point.payrollLakhs
                    : point.attendancePct;
                const pctHeight =
                  chartMetric === 'payroll'
                    ? Math.round((point.payrollLakhs / (maxPayroll * 1.15)) * 100)
                    : point.attendancePct;
                const isHovered = hoveredMonth === point.month;

                return (
                  <div
                    key={point.month}
                    onMouseEnter={() => setHoveredMonth(point.month)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    className="h-full flex flex-col items-center justify-end"
                  >
                    <div className="mb-2 text-xs font-mono tabular-nums text-slate-600 font-medium">
                      {chartMetric === 'payroll'
                        ? `₹${rawVal.toFixed(2)}L`
                        : `${rawVal}%`}
                    </div>
                    <div className="w-full max-w-[44px] h-full flex items-end">
                      <div
                        style={{ height: `${pctHeight}%` }}
                        className={`w-full rounded-t-md transition-colors duration-150 ${
                          isHovered ? 'bg-blue-700' : 'bg-blue-600'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-6 gap-3 sm:gap-5 pt-2.5 text-center">
              {PAYROLL_TREND_DATA.map((point) => (
                <div
                  key={point.month}
                  className="text-xs font-medium text-slate-500"
                >
                  {point.month}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="xl:col-span-5 space-y-5">
          {/* Pending Leaves Queue */}
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-base font-semibold text-slate-900">
                Pending Leave Requests
              </h3>
              <button
                type="button"
                onClick={() => navigate('/leaves')}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer whitespace-nowrap"
              >
                View all
              </button>
            </div>

            {pendingLeaves.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500 border border-dashed border-gray-200 rounded-lg">
                No pending leave requests to review.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingLeaves.slice(0, 3).map((leave) => (
                  <div
                    key={leave.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {leave.employeeName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {leave.leaveType} <span aria-hidden="true">·</span>{' '}
                        <span className="font-mono tabular-nums">
                          {leave.days}d
                        </span>{' '}
                        <span aria-hidden="true">·</span> {leave.startDate}
                      </div>
                    </div>
                    {permissions.canApproveLeaves && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateLeaveStatus(leave.id, 'Approved')}
                          aria-label={`Approve leave for ${leave.employeeName}`}
                          className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateLeaveStatus(leave.id, 'Rejected')}
                          aria-label={`Reject leave for ${leave.employeeName}`}
                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Expenses */}
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-500" />
                <h3 className="text-base font-semibold text-slate-900">
                  Recent Expenses
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/expenses')}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer whitespace-nowrap"
              >
                Open ledger
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {expenses.slice(0, 3).map((exp) => (
                <div
                  key={exp.id}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-slate-800 font-medium truncate">
                      {exp.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {exp.category} <span aria-hidden="true">·</span> {exp.date}
                    </div>
                  </div>
                  <div className="text-sm font-mono tabular-nums font-semibold text-slate-900 shrink-0">
                    ₹{exp.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
