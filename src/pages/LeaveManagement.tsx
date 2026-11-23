import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Plus, XCircle } from 'lucide-react';
import { Modal } from '../components/Modal';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { LeaveRequest, LeaveStatus } from '../types/staffpay';

export function LeaveManagement() {
  const { activeEmployees, leaves, addLeaveRequest, updateLeaveStatus } =
    useAppData();
  const { permissions } = useAuth();

  const [filter, setFilter] = useState<'All' | LeaveStatus>('All');
  const [modalOpen, setModalOpen] = useState(false);

  const [empId, setEmpId] = useState(activeEmployees[0]?.id || '');
  const [leaveType, setLeaveType] =
    useState<LeaveRequest['leaveType']>('Casual Leave');
  const [startDate, setStartDate] = useState('2026-11-28');
  const [endDate, setEndDate] = useState('2026-11-29');
  const [reason, setReason] = useState('');

  const filteredLeaves = useMemo(() => {
    if (filter === 'All') return leaves;
    return leaves.filter((l) => l.status === filter);
  }, [leaves, filter]);

  const pendingCount = leaves.filter((l) => l.status === 'Pending').length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp =
      activeEmployees.find((item) => item.id === empId) || activeEmployees[0];
    if (!emp || !reason.trim()) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    addLeaveRequest({
      employeeId: emp.id,
      employeeName: emp.name,
      role: emp.role,
      leaveType,
      startDate,
      endDate,
      days: Number.isNaN(diffDays) ? 1 : diffDays,
      reason: reason.trim(),
    });

    setReason('');
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Leave Management
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            <span className="font-mono tabular-nums font-semibold text-amber-700">
              {pendingCount}
            </span>{' '}
            pending requests <span aria-hidden="true">·</span>{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-800">
              {leaves.length}
            </span>{' '}
            total this month
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Leave Request</span>
        </button>
      </div>

      <div className="inline-flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-lg">
        {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              filter === tab
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold text-slate-500 bg-gray-50">
                <th className="py-3.5 px-5">Employee</th>
                <th className="py-3.5 px-5">Leave Type</th>
                <th className="py-3.5 px-5">Dates</th>
                <th className="py-3.5 px-5">Reason</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 px-5 text-center text-slate-500"
                  >
                    No leave requests in this view.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50/70">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900">
                        {leave.employeeName}
                      </div>
                      <div className="text-xs text-slate-500">{leave.role}</div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 whitespace-nowrap">
                      {leave.leaveType}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="font-mono tabular-nums text-slate-800 text-xs">
                        {leave.startDate} → {leave.endDate}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                        {leave.days} {leave.days === 1 ? 'day' : 'days'}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 max-w-xs truncate">
                      {leave.reason}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      {leave.status === 'Pending' && (
                        <span className="inline-flex items-center gap-1.5 text-amber-700 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending</span>
                        </span>
                      )}
                      {leave.status === 'Approved' && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved</span>
                        </span>
                      )}
                      {leave.status === 'Rejected' && (
                        <span className="inline-flex items-center gap-1.5 text-rose-700 text-xs font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      {leave.status === 'Pending' &&
                      permissions.canApproveLeaves ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateLeaveStatus(leave.id, 'Approved')
                            }
                            className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateLeaveStatus(leave.id, 'Rejected')
                            }
                            className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {leave.status === 'Pending'
                            ? 'No permission'
                            : 'Reviewed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Submit Leave Request"
        subtitle="Log an upcoming leave entry for manager approval."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Employee
              </label>
              <select
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900"
              >
                {activeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Leave Type
              </label>
              <select
                value={leaveType}
                onChange={(e) =>
                  setLeaveType(e.target.value as LeaveRequest['leaveType'])
                }
                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900"
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Earned Leave">Earned Leave</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Reason
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief reason for time off..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
