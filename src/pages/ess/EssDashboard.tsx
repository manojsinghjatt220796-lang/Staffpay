import React, { useState } from 'react';
import {
  CalendarPlus,
  Clock,
  FileText,
  IndianRupee,
  LogIn,
  LogOut,
  PlaneTakeoff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ApplyLeaveModal } from '../../components/ess/ApplyLeaveModal';
import { useEss } from '../../context/EssContext';

export function EssDashboard() {
  const navigate = useNavigate();
  const {
    profile,
    checkedIn,
    checkInTime,
    checkOutTime,
    toggleAttendancePunch,
    presentCount,
    absentCount,
    leaveBalanceCasual,
    payslips,
    applyForLeave,
  } = useEss();

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const firstName = profile.name.split(' ')[0];
  const latestPayslip = payslips[0];

  const handlePunch = () => {
    toggleAttendancePunch();
    setActionFeedback(
      checkedIn
        ? 'Checked out for Monday, 23 Nov 2026.'
        : 'Checked in successfully for Monday, 23 Nov 2026.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Hello, {firstName}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {profile.designation} <span aria-hidden="true">·</span>{' '}
            {profile.department} <span aria-hidden="true">·</span>{' '}
            <span className="font-mono">{profile.employeeId}</span>
          </p>
        </div>

        <div className="text-left sm:text-right text-xs text-slate-600 bg-slate-50 border border-gray-200 rounded-lg px-4 py-2.5">
          <div className="font-medium text-slate-800">{profile.shiftName}</div>
          <div className="font-mono tabular-nums text-slate-500 mt-0.5">
            {checkedIn
              ? `Checked in at ${checkInTime}`
              : checkOutTime
                ? `Checked out at ${checkOutTime}`
                : 'Not checked in yet today'}
          </div>
        </div>
      </section>

      {actionFeedback && (
        <div
          role="status"
          className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center justify-between gap-3"
        >
          <span>{actionFeedback}</span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-xs font-medium text-emerald-800 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/ess/attendance')}
          className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              This Month&apos;s Attendance
            </span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 text-xl font-semibold font-mono tabular-nums text-slate-900">
            {presentCount} Present, {absentCount} Absent
          </div>
          <p className="mt-1 text-xs text-slate-500">
            November 2026 attendance summary
          </p>
        </div>

        <div
          onClick={() => navigate('/ess/salary')}
          className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Current Month Salary (Estimated)
            </span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-xl font-semibold font-mono tabular-nums text-slate-900">
            ₹{latestPayslip.netPayable.toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            After PF &amp; attendance deductions
          </p>
        </div>

        <div
          onClick={() => navigate('/ess/attendance')}
          className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Pending Leave Balance
            </span>
            <PlaneTakeoff className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 text-xl font-semibold font-mono tabular-nums text-slate-900">
            {leaveBalanceCasual} Casual Leaves
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Available for FY 2026–27
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={handlePunch}
            className={`p-5 rounded-xl border text-left transition-colors flex items-center gap-4 cursor-pointer ${
              checkedIn
                ? 'bg-amber-50 border-amber-200 hover:bg-amber-100/70'
                : 'bg-blue-600 border-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                checkedIn ? 'bg-amber-100 text-amber-700' : 'bg-blue-500 text-white'
              }`}
            >
              {checkedIn ? (
                <LogOut className="w-5 h-5" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
            </div>
            <div>
              <div
                className={`text-sm font-semibold ${
                  checkedIn ? 'text-slate-900' : 'text-white'
                }`}
              >
                {checkedIn ? 'Check-Out Now' : 'Mark Attendance'}
              </div>
              <div
                className={`text-xs mt-0.5 ${
                  checkedIn ? 'text-slate-600' : 'text-blue-100'
                }`}
              >
                {checkedIn
                  ? `Punched in at ${checkInTime}`
                  : 'Record today’s Check-In'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setLeaveModalOpen(true)}
            className="p-5 rounded-xl bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 text-left transition-colors flex items-center gap-4 cursor-pointer"
          >
            <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Apply for Leave
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Request casual, sick, or earned leave
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/ess/salary')}
            className="p-5 rounded-xl bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 text-left transition-colors flex items-center gap-4 cursor-pointer"
          >
            <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                View Payslip
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Salary breakdown &amp; PDF slips
              </div>
            </div>
          </button>
        </div>
      </section>

      <ApplyLeaveModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onSubmitLeave={(input) => {
          applyForLeave(input);
          setActionFeedback(
            `${input.leaveType} request (${input.fromDate} to ${input.toDate}) submitted.`
          );
        }}
      />
    </div>
  );
}
