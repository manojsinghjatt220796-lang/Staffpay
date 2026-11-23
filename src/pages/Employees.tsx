import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Clock,
  Lock,
  Plus,
  Search,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { RegisterEmployeeModal } from '../components/RegisterEmployeeModal';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Employee, EmployeeStatus } from '../types/staffpay';

const LEAVING_REASONS = [
  'Voluntary resignation',
  'Better opportunity / career growth',
  'Relocation',
  'Higher studies',
  'Contract ended',
  'Performance / termination',
];

export function Employees() {
  const navigate = useNavigate();
  const {
    employees,
    archivedEmployees,
    shifts,
    addEmployee,
    archiveEmployee,
    setEmployeeShift,
  } = useAppData();
  const { permissions } = useAuth();
  const { planMeta, employeeLimit, openUpgradeModal } = useSubscription();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'All' | Exclude<EmployeeStatus, 'Archived'>
  >('All');
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Soft-delete / archive confirmation state
  const [archiveTarget, setArchiveTarget] = useState<Employee | null>(null);
  const [leaveDate, setLeaveDate] = useState('2026-11-23');
  const [leaveReason, setLeaveReason] = useState('Voluntary resignation');
  const [archivedBanner, setArchivedBanner] = useState<string | null>(null);

  // Toast state for shift changes
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const availableShifts = useMemo(
    () => shifts.map((s) => s.name),
    [shifts]
  );

  // Filter strictly for active (non-archived) staff
  const activeEmployees = useMemo(
    () => employees.filter((emp) => emp.status !== 'Archived'),
    [employees]
  );

  const atPlanLimit =
    employeeLimit !== null && activeEmployees.length >= employeeLimit;

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeEmployees.filter((emp) => {
      const matchesStatus =
        statusFilter === 'All' || emp.status === statusFilter;
      const matchesSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.phone.toLowerCase().includes(q) ||
        emp.shifts.some((shift) => shift.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [activeEmployees, search, statusFilter]);

  const handleShiftChange = (employeeId: string, newShift: string) => {
    const targetEmp = activeEmployees.find((e) => e.id === employeeId);
    setEmployeeShift(employeeId, newShift);
    console.log('Shift assignment updated:', {
      employeeId,
      employeeName: targetEmp?.name,
      newShift: newShift || 'No Shift Provided',
    });

    const label = newShift ? `assigned to ${newShift}` : 'set to No Shift Provided';
    setToastMessage(
      `${targetEmp ? targetEmp.name : 'Employee'} ${label}.`
    );
  };

  const handleOpenAdd = () => {
    if (atPlanLimit) {
      openUpgradeModal(
        'Employee Capacity Limit Reached',
        `Your ${planMeta.name} Plan supports up to ${employeeLimit} active employees (${activeEmployees.length}/${employeeLimit} active). Upgrade your plan to onboard more staff.`
      );
      return;
    }
    setAddModalOpen(true);
  };

  const handleConfirmArchive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveTarget) return;
    archiveEmployee(archiveTarget.id, leaveReason, leaveDate);
    setArchivedBanner(
      `${archiveTarget.name} (${archiveTarget.code}) was moved to Leave / Archived.`
    );
    setArchiveTarget(null);
    setLeaveReason('Voluntary resignation');
    setLeaveDate('2026-11-23');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Employee Directory
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {employeeLimit ? (
              <span>
                <span className="font-mono tabular-nums font-semibold text-slate-800">
                  {activeEmployees.length} / {employeeLimit}
                </span>{' '}
                active employees on {planMeta.name} Plan
              </span>
            ) : (
              <span>
                <span className="font-mono tabular-nums font-semibold text-slate-800">
                  {activeEmployees.length}
                </span>{' '}
                active employees <span aria-hidden="true">·</span> Unlimited
                Enterprise
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {archivedEmployees.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('/archived')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Archive className="w-4 h-4 text-slate-500" />
              <span>Leave / Archived ({archivedEmployees.length})</span>
            </button>
          )}

          {permissions.canManageStaff && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                atPlanLimit
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {atPlanLimit ? (
                <Lock className="w-4 h-4 text-slate-600" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {archivedBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <span>{archivedBanner}</span>
          <button
            type="button"
            onClick={() => navigate('/archived')}
            className="text-xs font-semibold text-amber-900 underline hover:text-amber-950 whitespace-nowrap cursor-pointer"
          >
            Open Leave / Archived →
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, department, phone, or shift..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-lg self-start">
          {(['All', 'Active', 'Inactive', 'On Leave', 'Probation'] as const).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold text-slate-500 bg-gray-50">
                <th className="py-3.5 px-5">Name</th>
                <th className="py-3.5 px-5">Role</th>
                <th className="py-3.5 px-5">Phone</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 min-w-[210px]">Shift Assignment</th>
                <th className="py-3.5 px-5 text-right">Base Salary</th>
                {permissions.canManageStaff && (
                  <th className="py-3.5 px-5 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan={permissions.canManageStaff ? 7 : 6}
                    className="py-10 px-5 text-center text-slate-500"
                  >
                    No active employees match your current filter.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const currentShift = emp.shifts[0] || '';
                  const isUnassigned = currentShift === '';

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-gray-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {emp.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt={emp.name}
                              className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                              {emp.name
                                .split(' ')
                                .slice(0, 2)
                                .map((p) => p[0])
                                .join('')
                                .toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900">
                              {emp.name}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              <span className="font-mono">{emp.code}</span>{' '}
                              <span aria-hidden="true">·</span> {emp.department}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-slate-700">{emp.role}</td>

                      <td className="py-3.5 px-5 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {emp.phone}
                      </td>

                      <td className="py-3.5 px-5 whitespace-nowrap">
                        {emp.status === 'Active' && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        )}
                        {emp.status === 'Inactive' && (
                          <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Inactive</span>
                          </span>
                        )}
                        {emp.status === 'On Leave' && (
                          <span className="inline-flex items-center gap-1.5 text-amber-700 text-xs font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>On Leave</span>
                          </span>
                        )}
                        {emp.status === 'Probation' && (
                          <span className="inline-flex items-center gap-1.5 text-blue-700 text-xs font-medium">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Probation</span>
                          </span>
                        )}
                      </td>

                      {/* Interactive Shift Assignment Dropdown */}
                      <td className="py-3.5 px-5">
                        <select
                          aria-label={`Shift assignment for ${emp.name}`}
                          value={currentShift}
                          onChange={(e) =>
                            handleShiftChange(emp.id, e.target.value)
                          }
                          className={`border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 transition-colors cursor-pointer ${
                            isUnassigned
                              ? 'bg-gray-100 text-slate-600'
                              : 'bg-white text-gray-900'
                          }`}
                        >
                          <option value="">No Shift Provided</option>
                          {availableShifts.map((shiftName) => (
                            <option key={shiftName} value={shiftName}>
                              {shiftName}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3.5 px-5 text-right font-mono tabular-nums text-slate-900 font-medium">
                        ₹{emp.baseSalary.toLocaleString('en-IN')}
                      </td>

                      {permissions.canManageStaff && (
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setArchiveTarget(emp);
                              setLeaveDate('2026-11-23');
                              setLeaveReason('Voluntary resignation');
                            }}
                            title="Archive / Mark as Left"
                            aria-label={`Remove ${emp.name}`}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RegisterEmployeeModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={addEmployee}
      />

      {/* Archive Employee (Soft Delete) Modal */}
      <Modal
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title="Move Employee to Leave / Archived"
        subtitle={
          archiveTarget
            ? `${archiveTarget.name} (${archiveTarget.code}) will be archived instead of permanently deleted.`
            : ''
        }
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleConfirmArchive} className="space-y-4">
          <div>
            <label
              htmlFor="archive-leave-date"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Date of Leaving
            </label>
            <input
              id="archive-leave-date"
              type="date"
              required
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="archive-leave-reason"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Reason for Leaving
            </label>
            <select
              id="archive-leave-reason"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900"
            >
              {LEAVING_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-slate-500">
            Historical payslips and profile details remain accessible under{' '}
            <span className="font-medium text-slate-700">Leave / Archived</span>
            , and you can restore this employee anytime.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setArchiveTarget(null)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
            >
              Move to Archived
            </button>
          </div>
        </form>
      </Modal>

      {/* Shift Update Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg border border-slate-800"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss notification"
            className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
