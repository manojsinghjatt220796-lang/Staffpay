import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  List,
  Plus,
  XCircle,
} from 'lucide-react';
import { ApplyLeaveModal } from '../../components/ess/ApplyLeaveModal';
import { EssAttendanceStatus, useEss } from '../../context/EssContext';

function statusBadgeStyle(status: EssAttendanceStatus): string {
  switch (status) {
    case 'Present':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Absent':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Half Day':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Weekly Off':
    default:
      return 'bg-gray-100 text-slate-600 border-gray-200';
  }
}

export function EssAttendanceLeaves() {
  const { attendanceDays, leaveRequests, applyForLeave } = useEss();

  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves'>(
    'attendance'
  );
  const [attendanceView, setAttendanceView] = useState<'calendar' | 'list'>(
    'calendar'
  );
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Attendance &amp; Leaves
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track your November 2026 daily attendance and manage leave requests
          </p>
        </div>

        <button
          type="button"
          onClick={() => setLeaveModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Main Tabs: Attendance vs Leaves */}
      <div className="border-b border-gray-200 flex items-center gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'attendance'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Attendance (November 2026)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leaves')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'leaves'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Leaves ({leaveRequests.length})
        </button>
      </div>

      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Calendar / List Switch */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Showing November 1 – 23, 2026
            </div>
            <div className="inline-flex items-center p-1 bg-white border border-gray-200 rounded-lg">
              <button
                type="button"
                onClick={() => setAttendanceView('calendar')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                  attendanceView === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>
              <button
                type="button"
                onClick={() => setAttendanceView('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                  attendanceView === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
            </div>
          </div>

          {attendanceView === 'calendar' ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {attendanceDays.map((day) => (
                  <div
                    key={day.date}
                    className="p-3 rounded-lg border border-gray-200 bg-slate-50/40 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        Nov {day.dayNumber}
                      </span>
                      <span className="text-slate-400">{day.weekday}</span>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border ${statusBadgeStyle(
                          day.status
                        )}`}
                      >
                        {day.status}
                      </span>
                    </div>
                    {day.checkIn && (
                      <div className="text-[11px] font-mono tabular-nums text-slate-500">
                        {day.checkIn}
                        {day.checkOut ? ` – ${day.checkOut}` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-semibold text-slate-500 bg-gray-50">
                      <th className="py-3 px-5">Date</th>
                      <th className="py-3 px-5">Day</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5">Check-In</th>
                      <th className="py-3 px-5">Check-Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[...attendanceDays].reverse().map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50/70">
                        <td className="py-3 px-5 font-mono tabular-nums text-slate-900">
                          {day.date}
                        </td>
                        <td className="py-3 px-5 text-slate-600">
                          {day.weekday}
                        </td>
                        <td className="py-3 px-5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-md border ${statusBadgeStyle(
                              day.status
                            )}`}
                          >
                            {day.status}
                          </span>
                        </td>
                        <td className="py-3 px-5 font-mono tabular-nums text-slate-600">
                          {day.checkIn || '—'}
                        </td>
                        <td className="py-3 px-5 font-mono tabular-nums text-slate-600">
                          {day.checkOut || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'leaves' && (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-200">
          {leaveRequests.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              You have not submitted any leave requests yet.
            </div>
          ) : (
            leaveRequests.map((lv) => (
              <div
                key={lv.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      {lv.leaveType}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      ({lv.days} day{lv.days > 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-600">
                    {lv.fromDate} → {lv.toDate}
                  </div>
                  <p className="text-sm text-slate-600">{lv.reason}</p>
                  {lv.documentName && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-blue-700 pt-0.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{lv.documentName}</span>
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {lv.status === 'Pending' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pending</span>
                    </span>
                  )}
                  {lv.status === 'Approved' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approved</span>
                    </span>
                  )}
                  {lv.status === 'Rejected' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Rejected</span>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <ApplyLeaveModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onSubmitLeave={(input) => {
          applyForLeave(input);
          setActiveTab('leaves');
        }}
      />
    </div>
  );
}
