import React, { useMemo, useState } from 'react';
import {
  Archive,
  Calendar,
  FileText,
  Mail,
  Phone,
  RotateCcw,
  Search,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { useAppData } from '../context/AppDataContext';
import { Employee } from '../types/staffpay';

function formatTenure(joinedDate: string, leftDate?: string): string {
  if (!joinedDate || !leftDate) return '—';
  const start = new Date(joinedDate);
  const end = new Date(leftDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—';
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  if (months < 1) return 'Under 1 month';
  const yrs = Math.floor(months / 12);
  const rem = months % 12;
  if (yrs === 0) return `${rem} mo${rem > 1 ? 's' : ''}`;
  if (rem === 0) return `${yrs} yr${yrs > 1 ? 's' : ''}`;
  return `${yrs} yr${yrs > 1 ? 's' : ''} ${rem} mo${rem > 1 ? 's' : ''}`;
}

export function ArchivedEmployees() {
  const navigate = useNavigate();
  const { employees, restoreEmployee, activeCompany } = useAppData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<Employee | null>(null);
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);

  // Filter strictly for employees whose status is 'Archived'
  const archivedList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees
      .filter((emp) => emp.status === 'Archived')
      .filter((emp) => {
        if (!q) return true;
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.role.toLowerCase().includes(q) ||
          emp.code.toLowerCase().includes(q) ||
          emp.department.toLowerCase().includes(q) ||
          (emp.leavingReason || '').toLowerCase().includes(q)
        );
      });
  }, [employees, searchQuery]);

  const totalArchivedCount = useMemo(
    () => employees.filter((emp) => emp.status === 'Archived').length,
    [employees]
  );

  const handleRestore = (emp: Employee) => {
    restoreEmployee(emp.id);
    setSelectedRecord(null);
    setRestoredNotice(
      `${emp.name} (${emp.code}) has been restored to Active Employees.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Archived Employees (Leave)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Former employees who have left {activeCompany.name} — records are
            retained for payroll audits, compliance, and re-hiring
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {totalArchivedCount} archived record
            {totalArchivedCount === 1 ? '' : 's'}
          </div>
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>Active Directory</span>
          </button>
        </div>
      </div>

      {restoredNotice && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
          <span>{restoredNotice}</span>
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="text-xs font-semibold text-emerald-800 underline hover:text-emerald-950 whitespace-nowrap cursor-pointer"
          >
            View in Active Employees →
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past employees by name, role, code, or reason..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>

        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 self-start sm:self-auto cursor-pointer"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold text-slate-500 bg-gray-50">
                <th className="py-3.5 px-5">Employee Name</th>
                <th className="py-3.5 px-5">Role</th>
                <th className="py-3.5 px-5">Joining Date</th>
                <th className="py-3.5 px-5">Date of Leaving</th>
                <th className="py-3.5 px-5">Reason for Leaving</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {archivedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-5 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <Archive className="w-8 h-8 text-slate-300 mb-3" />
                      <div className="text-sm font-medium text-slate-800">
                        {totalArchivedCount === 0
                          ? 'No archived employees yet'
                          : 'No matching archived employees'}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {totalArchivedCount === 0
                          ? 'When an active employee is removed from the directory, their profile moves here instead of being permanently deleted.'
                          : 'Try adjusting your search query to find a former team member.'}
                      </p>
                      {totalArchivedCount === 0 && (
                        <button
                          type="button"
                          onClick={() => navigate('/employees')}
                          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                        >
                          Go to Employees Directory
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                archivedList.map((emp) => (
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
                            className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0 grayscale"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center shrink-0">
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

                    <td className="py-3.5 px-5 text-slate-700 whitespace-nowrap">
                      {emp.role}
                    </td>

                    <td className="py-3.5 px-5 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {emp.joinedDate}
                    </td>

                    <td className="py-3.5 px-5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {emp.leftDate || '2026-11-23'}
                    </td>

                    <td className="py-3.5 px-5 text-slate-600 max-w-xs">
                      <span className="line-clamp-2">
                        {emp.leavingReason || 'Voluntary resignation'}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>View Past Records</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRestore(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore to Active</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Past Records Modal */}
      <Modal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title="Past Employment Record"
        subtitle={
          selectedRecord
            ? `${selectedRecord.name} · ${selectedRecord.code} · ${selectedRecord.department}`
            : ''
        }
        maxWidthClass="max-w-lg"
      >
        {selectedRecord && (
          <div className="space-y-5 text-sm">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Designation
                </span>
                <span className="font-semibold text-slate-900">
                  {selectedRecord.role}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Total Tenure
                </span>
                <span className="font-mono tabular-nums text-slate-800">
                  {formatTenure(
                    selectedRecord.joinedDate,
                    selectedRecord.leftDate
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Employment Dates
                </span>
                <span className="font-mono tabular-nums text-slate-700 inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {selectedRecord.joinedDate} →{' '}
                  {selectedRecord.leftDate || '2026-11-23'}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Separation & Contact Snapshot
              </h4>
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-200">
                <div className="px-4 py-3 flex items-start justify-between gap-4">
                  <span className="text-slate-500 text-xs">
                    Reason for Leaving
                  </span>
                  <span className="text-slate-900 text-right font-medium">
                    {selectedRecord.leavingReason || 'Voluntary resignation'}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <span className="text-slate-500 text-xs inline-flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </span>
                  <span className="text-slate-700 font-mono text-xs">
                    {selectedRecord.email}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <span className="text-slate-500 text-xs inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    Phone
                  </span>
                  <span className="text-slate-700 font-mono tabular-nums text-xs">
                    {selectedRecord.phone}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Final Drawn Compensation
              </h4>
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-200">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-slate-600">Last Monthly Basic</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900">
                    ₹{selectedRecord.baseSalary.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-slate-600">Last Allowances</span>
                  <span className="font-mono tabular-nums text-slate-700">
                    ₹{selectedRecord.allowances.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between bg-gray-50 font-semibold">
                  <span className="text-slate-900">Gross Monthly CTC</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    ₹
                    {(
                      selectedRecord.baseSalary + selectedRecord.allowances
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleRestore(selectedRecord)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restore to Active</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
