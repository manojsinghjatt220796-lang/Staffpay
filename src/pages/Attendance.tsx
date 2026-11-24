import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { StatCard } from '../components/StatCard';
import { useAppData } from '../context/AppDataContext';
import { evaluateLateArrivalPenalty } from './SalaryRules';
import {
  AttendanceCode,
  DailyAttendanceEntry,
  ShiftDefinition,
} from '../types/staffpay';

interface AttendanceEntry {
  status: AttendanceCode | null;
  overtimeHours: number;
  checkInTime?: string;
  checkOutTime?: string;
}

const STATUS_CODES: {
  code: AttendanceCode;
  label: string;
  activeClass: string;
}[] = [
  { code: 'P', label: 'Present', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
  { code: 'A', label: 'Absent', activeClass: 'bg-rose-600 text-white border-rose-600' },
  { code: 'HD', label: 'Half Day', activeClass: 'bg-amber-500 text-white border-amber-500' },
  { code: 'PL', label: 'Paid Leave', activeClass: 'bg-blue-600 text-white border-blue-600' },
  { code: 'UL', label: 'Unpaid Leave', activeClass: 'bg-orange-600 text-white border-orange-600' },
  { code: 'WO', label: 'Weekly Off', activeClass: 'bg-slate-700 text-white border-slate-700' },
  { code: 'H', label: 'Holiday', activeClass: 'bg-indigo-600 text-white border-indigo-600' },
];

const AUDIT_ITEMS = [
  { id: 'aud-1', rule: 'Late Grace Window', value: '15 mins after shift start', updatedBy: 'Priya Sharma · Nov 20' },
  { id: 'aud-2', rule: 'Half-Day Threshold', value: 'Check-in > 2 hrs late or < 4.5 hrs worked', updatedBy: 'Ananya Iyer · Nov 19' },
  { id: 'aud-3', rule: 'Overtime Minimum', value: '30 mins minimum post-shift block', updatedBy: 'Priya Sharma · Nov 18' },
  { id: 'aud-4', rule: 'Night Shift Allowance', value: '₹150 / shift for 22:00 – 06:30', updatedBy: 'Neha Kulkarni · Nov 15' },
  { id: 'aud-5', rule: 'Weekly Off Auto-Lock', value: 'Sunday defaults to WO unless marked P', updatedBy: 'System Policy · Nov 10' },
  { id: 'aud-6', rule: 'Shift Swap Approval', value: 'Requires Department Lead sign-off', updatedBy: 'Priya Sharma · Nov 04' },
];

function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

/**
 * Calculates how many minutes late an employee checked in compared to their shift start time,
 * after subtracting the shift's grace window (handles overnight shifts cleanly).
 */
export function calculateLateMinutes(
  shiftStartTime: string,
  checkInTime: string,
  graceMinutes = 0,
  shiftEndTime?: string
): number {
  if (!shiftStartTime || !checkInTime) return 0;

  const [startHours, startMins] = shiftStartTime.split(':').map(Number);
  const [checkHours, checkMins] = checkInTime.split(':').map(Number);

  if (
    Number.isNaN(startHours) ||
    Number.isNaN(startMins) ||
    Number.isNaN(checkHours) ||
    Number.isNaN(checkMins)
  ) {
    return 0;
  }

  const shiftStartTotalMins = startHours * 60 + startMins;
  let checkInTotalMins = checkHours * 60 + checkMins;

  if (shiftEndTime) {
    const [endHours, endMins] = shiftEndTime.split(':').map(Number);
    if (!Number.isNaN(endHours) && !Number.isNaN(endMins)) {
      const shiftEndTotalMins = endHours * 60 + endMins;
      if (
        shiftEndTotalMins < shiftStartTotalMins &&
        checkInTotalMins < shiftEndTotalMins
      ) {
        checkInTotalMins += 24 * 60;
      }
    }
  }

  const diffMinutes = checkInTotalMins - shiftStartTotalMins;
  return Math.max(0, diffMinutes - graceMinutes);
}

export function Attendance() {
  const {
    activeEmployees,
    shifts,
    salaryRules,
    attendanceRegister,
    saveAttendanceDay,
    createShift,
    updateShift,
    deleteShift,
    adjustShiftCapacity,
    assignShiftToEmployee,
    clearEmployeeShifts,
  } = useAppData();

  const [attendanceByDate, setAttendanceByDate] = useState<
    Record<string, Record<string, AttendanceEntry>>
  >(() => {
    const hydrated: Record<string, Record<string, AttendanceEntry>> = {};
    Object.entries(attendanceRegister).forEach(([date, entries]) => {
      hydrated[date] = {};
      Object.entries(entries).forEach(([empId, entry]) => {
        hydrated[date][empId] = {
          status: entry.status,
          overtimeHours: entry.overtimeHours,
          checkInTime: entry.checkInTime,
          checkOutTime: entry.checkOutTime,
        };
      });
    });
    return hydrated;
  });
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'daily' | 'shifts' | 'planner' | 'audit'
  >('daily');

  const [selectedDate, setSelectedDate] = useState('2026-11-23');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [shiftFilter, setShiftFilter] = useState('All');
  const [deletedShiftBanner, setDeletedShiftBanner] = useState<string | null>(
    null
  );

  // Modals
  const [newShiftModalOpen, setNewShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftDefinition | null>(
    null
  );
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // Shift form state
  const [shiftName, setShiftName] = useState('');
  const [shiftStart, setShiftStart] = useState('09:30');
  const [shiftEnd, setShiftEnd] = useState('18:30');
  const [shiftBreakMinutes, setShiftBreakMinutes] = useState('45');
  const [shiftGrace, setShiftGrace] = useState('15');
  const [shiftTarget, setShiftTarget] = useState('4');

  // Assign Shift form state
  const [assignStaffId, setAssignStaffId] = useState(
    activeEmployees[0]?.id || ''
  );
  const [assignShiftName, setAssignShiftName] = useState(
    shifts[0]?.name || 'unassigned'
  );

  // Bulk Mark Attendance state
  const [bulkStatus, setBulkStatus] = useState<AttendanceCode>('P');
  const [bulkOvertime, setBulkOvertime] = useState('0');

  const dayEntries = useMemo(
    () => attendanceByDate[selectedDate] || {},
    [attendanceByDate, selectedDate]
  );

  const assignedCount = useMemo(
    () => activeEmployees.filter((e) => e.shifts.length > 0).length,
    [activeEmployees]
  );
  const unassignedCount = activeEmployees.length - assignedCount;

  const presentCount = useMemo(
    () =>
      activeEmployees.filter((e) => {
        const st = dayEntries[e.id]?.status;
        return st === 'P' || st === 'HD';
      }).length,
    [activeEmployees, dayEntries]
  );

  const totalOvertimeHours = useMemo(
    () =>
      activeEmployees.reduce(
        (sum, e) => sum + (dayEntries[e.id]?.overtimeHours || 0),
        0
      ),
    [activeEmployees, dayEntries]
  );

  const departments = useMemo(
    () => Array.from(new Set(activeEmployees.map((e) => e.department))),
    [activeEmployees]
  );

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeEmployees.filter((member) => {
      const matchesSearch =
        !q ||
        member.name.toLowerCase().includes(q) ||
        member.code.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q);
      const matchesDept =
        departmentFilter === 'All' || member.department === departmentFilter;
      const matchesShift =
        shiftFilter === 'All' ||
        (shiftFilter === 'unassigned' && member.shifts.length === 0) ||
        member.shifts.includes(shiftFilter);
      return matchesSearch && matchesDept && matchesShift;
    });
  }, [activeEmployees, searchQuery, departmentFilter, shiftFilter]);

  const getEmployeeShiftDefaults = (staffId: string) => {
    const member = activeEmployees.find((e) => e.id === staffId);
    const primaryShift = member?.shifts.length
      ? shifts.find((s) => s.name === member.shifts[0])
      : undefined;
    return {
      startTime: primaryShift?.startTime ?? '09:00',
      endTime: primaryShift?.endTime ?? '18:00',
      graceMinutes: primaryShift?.graceMinutes ?? 15,
    };
  };

  const totalLateFines = useMemo(() => {
    return activeEmployees.reduce((sum, member) => {
      const entry = dayEntries[member.id];
      if (!entry || entry.status !== 'P') return sum;
      const primaryShift = member.shifts.length
        ? shifts.find((s) => s.name === member.shifts[0])
        : undefined;
      const startTime = primaryShift?.startTime ?? '09:00';
      const endTime = primaryShift?.endTime ?? '18:00';
      const graceMinutes = primaryShift?.graceMinutes ?? 15;
      const checkIn = entry.checkInTime || startTime;
      const lateMins = calculateLateMinutes(
        startTime,
        checkIn,
        graceMinutes,
        endTime
      );
      const { lateFine } = evaluateLateArrivalPenalty(lateMins, salaryRules);
      return sum + lateFine;
    }, 0);
  }, [activeEmployees, dayEntries, shifts, salaryRules]);

  const setStaffStatus = (staffId: string, status: AttendanceCode) => {
    const defaults = getEmployeeShiftDefaults(staffId);
    setAttendanceByDate((prev) => {
      const currDay = prev[selectedDate] || {};
      const existing = currDay[staffId] || { status: null, overtimeHours: 0 };
      const nextStatus = existing.status === status ? null : status;
      return {
        ...prev,
        [selectedDate]: {
          ...currDay,
          [staffId]: {
            ...existing,
            status: nextStatus,
            checkInTime:
              nextStatus === 'P'
                ? existing.checkInTime || defaults.startTime
                : existing.checkInTime,
            checkOutTime:
              nextStatus === 'P'
                ? existing.checkOutTime || defaults.endTime
                : existing.checkOutTime,
          },
        },
      };
    });
  };

  const setStaffCheckTime = (
    staffId: string,
    field: 'checkInTime' | 'checkOutTime',
    value: string
  ) => {
    const defaults = getEmployeeShiftDefaults(staffId);
    setAttendanceByDate((prev) => {
      const currDay = prev[selectedDate] || {};
      const existing = currDay[staffId] || { status: 'P', overtimeHours: 0 };
      return {
        ...prev,
        [selectedDate]: {
          ...currDay,
          [staffId]: {
            ...existing,
            checkInTime: existing.checkInTime || defaults.startTime,
            checkOutTime: existing.checkOutTime || defaults.endTime,
            [field]: value,
          },
        },
      };
    });
  };

  const setStaffOvertime = (staffId: string, hoursRaw: string) => {
    const hours = Math.max(0, Math.min(16, Number(hoursRaw) || 0));
    setAttendanceByDate((prev) => {
      const currDay = prev[selectedDate] || {};
      const existing = currDay[staffId] || { status: null, overtimeHours: 0 };
      return {
        ...prev,
        [selectedDate]: {
          ...currDay,
          [staffId]: { ...existing, overtimeHours: hours },
        },
      };
    });
  };

  const handleSaveAttendance = () => {
    const payload: Record<string, DailyAttendanceEntry> = {};

    activeEmployees.forEach((member) => {
      const entry = dayEntries[member.id];
      if (!entry || !entry.status) return;

      const primaryShift = member.shifts.length
        ? shifts.find((s) => s.name === member.shifts[0])
        : undefined;
      const startTime = primaryShift?.startTime ?? '09:00';
      const endTime = primaryShift?.endTime ?? '18:00';
      const graceMinutes = primaryShift?.graceMinutes ?? 15;

      const checkInTime =
        entry.status === 'P' ? entry.checkInTime || startTime : undefined;
      const checkOutTime =
        entry.status === 'P' ? entry.checkOutTime || endTime : undefined;
      const lateMinutes =
        entry.status === 'P' && checkInTime
          ? calculateLateMinutes(startTime, checkInTime, graceMinutes, endTime)
          : 0;
      const { lateFine } =
        entry.status === 'P'
          ? evaluateLateArrivalPenalty(lateMinutes, salaryRules)
          : { lateFine: 0 };

      payload[member.id] = {
        employeeId: member.id,
        status: entry.status,
        overtimeHours: entry.overtimeHours,
        ...(entry.status === 'P'
          ? {
              checkInTime,
              checkOutTime,
              lateMinutes,
              lateFine,
            }
          : {}),
      };
    });

    saveAttendanceDay(selectedDate, payload);
    console.log('Saved Daily Attendance Register:', {
      date: selectedDate,
      totalLateFines,
      entries: payload,
    });
    setSavedToast(
      `Attendance saved for ${selectedDate} (Total Late Fines: ₹${totalLateFines.toLocaleString('en-IN')}).`
    );
    setTimeout(() => setSavedToast(null), 4000);
  };

  const openCreateShift = () => {
    setShiftName('');
    setShiftStart('09:30');
    setShiftEnd('18:30');
    setShiftBreakMinutes('45');
    setShiftGrace('15');
    setShiftTarget('4');
    setEditingShift(null);
    setNewShiftModalOpen(true);
  };

  const openEditShift = (shift: ShiftDefinition) => {
    setShiftName(shift.name);
    setShiftStart(shift.startTime);
    setShiftEnd(shift.endTime);
    setShiftBreakMinutes(String(shift.breakMinutes));
    setShiftGrace(String(shift.graceMinutes));
    setShiftTarget(String(shift.targetCapacity));
    setEditingShift(shift);
    setNewShiftModalOpen(true);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftName.trim()) return;

    const shiftPayload = {
      name: shiftName.trim(),
      startTime: shiftStart,
      endTime: shiftEnd,
      breakMinutes: Math.max(0, Number(shiftBreakMinutes) || 0),
      graceMinutes: Math.max(0, Number(shiftGrace) || 0),
      targetCapacity: Math.max(1, Number(shiftTarget) || 1),
    };

    if (editingShift) {
      updateShift({
        ...editingShift,
        ...shiftPayload,
      });
    } else {
      createShift(shiftPayload);
    }
    setNewShiftModalOpen(false);
    setEditingShift(null);
  };

  const handleDeleteShift = (shift: ShiftDefinition) => {
    deleteShift(shift.id);
    if (shiftFilter === shift.name) {
      setShiftFilter('All');
    }
    setDeletedShiftBanner(
      `"${shift.name}" was deleted and removed from all employees' shift assignments.`
    );
  };

  const handleAssignShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStaffId) return;
    if (assignShiftName === 'unassigned') {
      clearEmployeeShifts(assignStaffId);
    } else {
      assignShiftToEmployee(assignStaffId, assignShiftName);
    }
    setAssignModalOpen(false);
  };

  const handleBulkMarkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otNum = Math.max(0, Math.min(16, Number(bulkOvertime) || 0));
    setAttendanceByDate((prev) => {
      const currDay = { ...(prev[selectedDate] || {}) };
      filteredStaff.forEach((member) => {
        const defaults = getEmployeeShiftDefaults(member.id);
        currDay[member.id] = {
          status: bulkStatus,
          overtimeHours: otNum,
          checkInTime:
            bulkStatus === 'P'
              ? currDay[member.id]?.checkInTime || defaults.startTime
              : currDay[member.id]?.checkInTime,
          checkOutTime:
            bulkStatus === 'P'
              ? currDay[member.id]?.checkOutTime || defaults.endTime
              : currDay[member.id]?.checkOutTime,
        };
      });
      return {
        ...prev,
        [selectedDate]: currDay,
      };
    });
    setBulkModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Attendance & Shifts
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage shift schedules, daily attendance registers, and overtime
            hours
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              const firstUnassigned = activeEmployees.find(
                (e) => e.shifts.length === 0
              );
              setAssignStaffId(
                firstUnassigned?.id || activeEmployees[0]?.id || ''
              );
              setAssignShiftName(shifts[0]?.name || 'unassigned');
              setAssignModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>Assign Shift</span>
          </button>
          <button
            type="button"
            onClick={openCreateShift}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand hover:bg-brand/90 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Shift</span>
          </button>
        </div>
      </div>

      {deletedShiftBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <span>{deletedShiftBanner}</span>
          <button
            type="button"
            onClick={() => setDeletedShiftBanner(null)}
            className="text-xs font-medium text-amber-800 hover:text-amber-950 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Shifts"
          value={shifts.length}
          subtext="Configured active shift templates"
          icon={Clock}
          onClick={() => setActiveTab('shifts')}
        />
        <StatCard
          label="Assigned Staff"
          value={assignedCount}
          subtext="Mapped to daily shift schedules"
          icon={UserCheck}
          tone="positive"
        />
        <StatCard
          label="Unassigned Staff"
          value={unassignedCount}
          subtext={
            unassignedCount > 0
              ? 'No shift provided yet'
              : 'All active staff assigned'
          }
          icon={UserMinus}
          tone={unassignedCount > 0 ? 'warning' : 'positive'}
          onClick={() => setAssignModalOpen(true)}
        />
        <StatCard
          label="Attendance & Overtime"
          value={`${presentCount}/${activeEmployees.length}`}
          subtext={`${totalOvertimeHours} hrs overtime logged`}
          icon={Users}
          tone={presentCount > 0 ? 'positive' : 'default'}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 flex items-center gap-6 overflow-x-auto">
        {(
          [
            ['daily', `Daily Attendance (${activeEmployees.length})`],
            ['shifts', `Shifts (${shifts.length})`],
            ['planner', 'Shift Planner (12)'],
            ['audit', `Rules & Audit (${AUDIT_ITEMS.length})`],
          ] as const
        ).map(([id, label]) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'border-brand text-brand'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {activeTab === 'daily' && (
        <div className="space-y-5">
          {/* Editable Shift Overview Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {shifts.map((shift) => {
              const assignedToShift = activeEmployees.filter((e) =>
                e.shifts.includes(shift.name)
              );
              const presentInShift = assignedToShift.filter((e) => {
                const st = dayEntries[e.id]?.status;
                return st === 'P' || st === 'HD';
              }).length;

              return (
                <div
                  key={shift.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {shift.name}
                      </h3>
                      <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                        {shift.startTime} – {shift.endTime}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditShift(shift)}
                      aria-label={`Edit ${shift.name}`}
                      title="Edit shift"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors shrink-0 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                    <span className="text-slate-600 font-mono tabular-nums">
                      {assignedToShift.length} assigned{' '}
                      <span aria-hidden="true">·</span> {presentInShift} present
                    </span>

                    <div className="inline-flex items-center gap-1 text-slate-500">
                      <button
                        type="button"
                        onClick={() => adjustShiftCapacity(shift.id, -1)}
                        aria-label={`Decrease target for ${shift.name}`}
                        className="w-5 h-5 rounded border border-gray-200 hover:bg-gray-100 text-slate-600 flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono tabular-nums px-1 text-[11px]">
                        Cap {shift.targetCapacity}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustShiftCapacity(shift.id, 1)}
                        aria-label={`Increase target for ${shift.name}`}
                        className="w-5 h-5 rounded border border-gray-200 hover:bg-gray-100 text-slate-600 flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters + Bulk Mark Attendance Toolbar */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Date Picker */}
              <div className="inline-flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSelectedDate((d) => shiftIsoDate(d, -1))}
                  aria-label="Previous day"
                  className="p-2 text-slate-600 hover:bg-gray-100 border-r border-gray-300 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) =>
                    e.target.value && setSelectedDate(e.target.value)
                  }
                  aria-label="Attendance date"
                  className="px-3 py-1.5 text-sm font-mono tabular-nums text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate((d) => shiftIsoDate(d, 1))}
                  aria-label="Next day"
                  className="p-2 text-slate-600 hover:bg-gray-100 border-l border-gray-300 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Search Employee */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search employee..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Department Dropdown */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                aria-label="Filter by department"
                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="All">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              {/* All Shifts Dropdown */}
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                aria-label="Filter by shift"
                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="All">All Shifts</option>
                {shifts.map((sh) => (
                  <option key={sh.id} value={sh.name}>
                    {sh.name}
                  </option>
                ))}
                <option value="unassigned">Unassigned</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand hover:bg-brand/90 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Bulk Mark Attendance</span>
            </button>
          </div>

          {/* Daily Attendance Roster */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold text-slate-500 bg-gray-50">
                    <th className="py-3.5 px-5">Employee</th>
                    <th className="py-3.5 px-5">Department</th>
                    <th className="py-3.5 px-5">Shift Assignment</th>
                    <th className="py-3.5 px-5">Daily Status</th>
                    <th className="py-3.5 px-5 text-right">Overtime (hrs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 px-5 text-center text-slate-500"
                      >
                        No employees match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((member) => {
                      const entry = dayEntries[member.id] || {
                        status: null,
                        overtimeHours: 0,
                      };
                      const primaryShift = member.shifts.length
                        ? shifts.find((s) => s.name === member.shifts[0])
                        : undefined;
                      const shiftStartTime = primaryShift?.startTime ?? '09:00';
                      const shiftEndTime = primaryShift?.endTime ?? '18:00';
                      const graceMinutes = primaryShift?.graceMinutes ?? 15;

                      const checkInValue = entry.checkInTime || shiftStartTime;
                      const checkOutValue = entry.checkOutTime || shiftEndTime;
                      const lateMins =
                        entry.status === 'P'
                          ? calculateLateMinutes(
                              shiftStartTime,
                              checkInValue,
                              graceMinutes,
                              shiftEndTime
                            )
                          : 0;
                      const { isHalfDayOverride, lateFine: appliedFine } =
                        entry.status === 'P'
                          ? evaluateLateArrivalPenalty(lateMins, salaryRules)
                          : { isHalfDayOverride: false, lateFine: 0 };

                      return (
                        <tr key={member.id} className="hover:bg-gray-50/70">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                                {getInitials(member.name)}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {member.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  <span className="font-mono">
                                    {member.code}
                                  </span>{' '}
                                  <span aria-hidden="true">·</span> {member.role}
                                </div>
                                {isHalfDayOverride ? (
                                  <div className="text-xs font-medium text-amber-700 mt-0.5">
                                    Half-Day Triggered (&gt;{' '}
                                    {(
                                      salaryRules.lateArrivalRules
                                        .halfDayThresholdMins / 60
                                    ).toFixed(1).replace(/\.0$/, '')}{' '}
                                    hrs late): Half-Day Deduction Applied
                                  </div>
                                ) : (
                                  appliedFine > 0 && (
                                    <div className="text-xs font-medium text-rose-600 mt-0.5">
                                      Late Fine Applied: ₹
                                      {appliedFine.toLocaleString('en-IN')}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-slate-700 whitespace-nowrap">
                            {member.department}
                          </td>
                          <td className="py-3.5 px-5">
                            {member.shifts.length > 0 ? (
                              <div className="flex flex-col items-start gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Assigned
                                </span>
                                <span className="text-xs text-slate-600">
                                  {member.shifts.join(', ')}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md bg-gray-100 text-slate-600 border border-gray-200">
                                  No Shift Provided
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAssignStaffId(member.id);
                                    setAssignShiftName(
                                      shifts[0]?.name || 'unassigned'
                                    );
                                    setAssignModalOpen(true);
                                  }}
                                  className="text-xs font-medium text-blue-600 hover:text-blue-700 underline cursor-pointer"
                                >
                                  Assign
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <div className="inline-flex items-center gap-1">
                                {STATUS_CODES.map((btn) => {
                                  const selected = entry.status === btn.code;
                                  return (
                                    <button
                                      key={btn.code}
                                      type="button"
                                      title={btn.label}
                                      onClick={() =>
                                        setStaffStatus(member.id, btn.code)
                                      }
                                      className={`min-w-[32px] h-8 px-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                                        selected
                                          ? btn.activeClass
                                          : 'bg-white text-slate-600 border-gray-200 hover:bg-gray-100'
                                      }`}
                                    >
                                      {btn.code}
                                    </button>
                                  );
                                })}
                              </div>

                              {entry.status === 'P' && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <label className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                    <span>Check-in</span>
                                    <input
                                      type="time"
                                      aria-label={`Check-in time for ${member.name}`}
                                      value={checkInValue}
                                      onChange={(e) =>
                                        setStaffCheckTime(
                                          member.id,
                                          'checkInTime',
                                          e.target.value
                                        )
                                      }
                                      className="px-2 py-1 text-xs font-mono tabular-nums bg-white border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
                                    />
                                  </label>
                                  <label className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                    <span>Check-out</span>
                                    <input
                                      type="time"
                                      aria-label={`Check-out time for ${member.name}`}
                                      value={checkOutValue}
                                      onChange={(e) =>
                                        setStaffCheckTime(
                                          member.id,
                                          'checkOutTime',
                                          e.target.value
                                        )
                                      }
                                      className="px-2 py-1 text-xs font-mono tabular-nums bg-white border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
                                    />
                                  </label>
                                  <span
                                    title={`Shift start ${shiftStartTime} + ${graceMinutes}m grace`}
                                    className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-mono tabular-nums font-medium border ${
                                      lateMins > 30
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : lateMins > 0
                                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}
                                  >
                                    Late: {lateMins} mins
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <input
                              type="number"
                              min={0}
                              max={16}
                              step={0.5}
                              aria-label={`Overtime hours for ${member.name}`}
                              value={entry.overtimeHours}
                              onChange={(e) =>
                                setStaffOvertime(member.id, e.target.value)
                              }
                              className="w-16 px-2.5 py-1.5 text-sm font-mono tabular-nums text-right bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Summary Footer + Save Attendance */}
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-slate-800">
                  Total Late Fines this day:{' '}
                  <span
                    className={`font-mono tabular-nums ${
                      totalLateFines > 0 ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    ₹{totalLateFines.toLocaleString('en-IN')}
                  </span>
                </span>
                <span className="text-xs text-slate-500">
                  (Salary Rules: ₹
                  {salaryRules.lateArrivalRules.lateFine30Min} / ₹
                  {salaryRules.lateArrivalRules.lateFine1Hour} / ₹
                  {salaryRules.lateArrivalRules.lateFine2Hour} within{' '}
                  {(
                    salaryRules.lateArrivalRules.halfDayThresholdMins / 60
                  )
                    .toFixed(1)
                    .replace(/\.0$/, '')}{' '}
                  hrs)
                </span>
              </div>

              <div className="flex items-center gap-3">
                {savedToast && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{savedToast}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand hover:bg-brand/90 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Attendance</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shifts' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold text-slate-500 bg-gray-50">
                  <th className="py-3.5 px-5">Shift Name</th>
                  <th className="py-3.5 px-5">Timings</th>
                  <th className="py-3.5 px-5">Break / Lunch</th>
                  <th className="py-3.5 px-5">Grace Window</th>
                  <th className="py-3.5 px-5 text-right">Assigned / Cap</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {shifts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 px-5 text-center text-slate-500"
                    >
                      No shifts configured. Click &quot;+ New Shift&quot; to add
                      a schedule.
                    </td>
                  </tr>
                ) : (
                  shifts.map((shift) => {
                    const assigned = activeEmployees.filter((e) =>
                      e.shifts.includes(shift.name)
                    ).length;
                    return (
                      <tr key={shift.id} className="hover:bg-gray-50/70">
                        <td className="py-3.5 px-5 font-semibold text-slate-900">
                          {shift.name}
                        </td>
                        <td className="py-3.5 px-5 font-mono tabular-nums text-slate-700">
                          {shift.startTime} – {shift.endTime}
                        </td>
                        <td className="py-3.5 px-5 font-mono tabular-nums text-slate-600">
                          {shift.breakMinutes} mins
                        </td>
                        <td className="py-3.5 px-5 font-mono tabular-nums text-slate-600">
                          {shift.graceMinutes} mins
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono tabular-nums text-slate-900">
                          {assigned} / {shift.targetCapacity}
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditShift(shift)}
                              className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer"
                            >
                              Edit Shift
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteShift(shift)}
                              aria-label={`Delete ${shift.name}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'planner' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="text-base font-semibold text-slate-900">
              Weekly Shift Rotation Planner
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-slate-500 bg-gray-50">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Mon</th>
                  <th className="py-3 px-3">Tue</th>
                  <th className="py-3 px-3">Wed</th>
                  <th className="py-3 px-3">Thu</th>
                  <th className="py-3 px-3">Fri</th>
                  <th className="py-3 px-3">Sat</th>
                  <th className="py-3 px-3">Sun</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeEmployees.map((member) => {
                  const primaryShift = member.shifts[0];
                  const shortShift = primaryShift
                    ? primaryShift.split(' ')[0]
                    : 'No Shift';
                  return (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {member.name}
                      </td>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <td key={day} className="py-3 px-3 text-slate-700">
                          {shortShift}
                        </td>
                      ))}
                      <td className="py-3 px-3 text-slate-400">WO</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-200">
          {AUDIT_ITEMS.map((item) => (
            <div
              key={item.id}
              className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {item.rule}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {item.value}
                  </div>
                </div>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {item.updatedBy}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Shift Modal */}
      <Modal
        isOpen={newShiftModalOpen}
        onClose={() => {
          setNewShiftModalOpen(false);
          setEditingShift(null);
        }}
        title={editingShift ? 'Edit Shift Schedule' : 'Create New Shift'}
        subtitle="Configure shift timings, grace period, and target headcount."
      >
        <form onSubmit={handleSaveShift} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Shift Name
            </label>
            <input
              type="text"
              required
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              placeholder="e.g. Morning Warehouse Shift"
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="shift-start-time"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Start Time
              </label>
              <input
                id="shift-start-time"
                type="time"
                required
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label
                htmlFor="shift-end-time"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                End Time
              </label>
              <input
                id="shift-end-time"
                type="time"
                required
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label
                htmlFor="shift-break-duration"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Break Duration (mins)
              </label>
              <input
                id="shift-break-duration"
                type="number"
                min={0}
                max={180}
                step={5}
                value={shiftBreakMinutes}
                onChange={(e) => setShiftBreakMinutes(e.target.value)}
                placeholder="45"
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-white border border-gray-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Grace Window (minutes)
              </label>
              <input
                type="number"
                min={0}
                max={60}
                value={shiftGrace}
                onChange={(e) => setShiftGrace(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Target Capacity
              </label>
              <input
                type="number"
                min={1}
                value={shiftTarget}
                onChange={(e) => setShiftTarget(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setNewShiftModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              {editingShift ? 'Update Shift' : 'Create Shift'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Shift Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Staff to Shift"
        subtitle="Add a scheduled shift to an employee or clear existing assignments."
      >
        <form onSubmit={handleAssignShiftSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Employee
            </label>
            <select
              value={assignStaffId}
              onChange={(e) => setAssignStaffId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900"
            >
              {activeEmployees.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.code}) — {member.department}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Target Shift
            </label>
            <select
              value={assignShiftName}
              onChange={(e) => setAssignShiftName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900"
            >
              {shifts.map((sh) => (
                <option key={sh.id} value={sh.name}>
                  {sh.name} ({sh.startTime} – {sh.endTime})
                </option>
              ))}
              <option value="unassigned">Clear All Shifts (No Shift Provided)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Save Assignment
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Mark Attendance Modal */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Bulk Mark Attendance"
        subtitle={`Apply status to ${filteredStaff.length} filtered staff for ${selectedDate}.`}
      >
        <form onSubmit={handleBulkMarkSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Attendance Status
            </label>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as AttendanceCode)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900"
            >
              {STATUS_CODES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Overtime Hours (optional)
            </label>
            <input
              type="number"
              min={0}
              max={16}
              step={0.5}
              value={bulkOvertime}
              onChange={(e) => setBulkOvertime(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setBulkModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Apply to {filteredStaff.length} Staff
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
