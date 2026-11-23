import React, { createContext, useContext, useState } from 'react';

export interface EssProfile {
  name: string;
  employeeId: string;
  mobile: string;
  email: string;
  address: string;
  department: string;
  designation: string;
  joiningDate: string;
  shiftName: string;
  avatarUrl: string;
}

export type EssAttendanceStatus =
  | 'Present'
  | 'Absent'
  | 'Half Day'
  | 'Weekly Off';

export interface EssAttendanceDay {
  date: string;
  dayNumber: number;
  weekday: string;
  status: EssAttendanceStatus;
  checkIn?: string;
  checkOut?: string;
}

export type EssLeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface EssLeaveRecord {
  id: string;
  leaveType: 'Casual Leave' | 'Sick Leave' | 'Earned Leave';
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  documentName?: string;
  status: EssLeaveStatus;
  appliedOn: string;
}

export interface EssPayslip {
  id: string;
  month: string;
  payDate: string;
  basicSalary: number;
  allowances: number;
  overtimePay: number;
  absentDeduction: number;
  pfDeduction: number;
  taxDeduction: number;
  netPayable: number;
  workingDays: number;
  presentDays: number;
}

export interface EssNotification {
  id: string;
  title: string;
  time: string;
  read: boolean;
}

interface EssContextValue {
  profile: EssProfile;
  updateProfile: (updates: Partial<EssProfile>) => void;
  checkedIn: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  toggleAttendancePunch: () => void;
  attendanceDays: EssAttendanceDay[];
  presentCount: number;
  absentCount: number;
  leaveBalanceCasual: number;
  leaveRequests: EssLeaveRecord[];
  applyForLeave: (input: {
    leaveType: EssLeaveRecord['leaveType'];
    fromDate: string;
    toDate: string;
    reason: string;
    documentName?: string;
  }) => void;
  payslips: EssPayslip[];
  notifications: EssNotification[];
  markAllNotificationsRead: () => void;
}

const INITIAL_PROFILE: EssProfile = {
  name: 'Raju Kumar',
  employeeId: 'EMP-114',
  mobile: '+91 98205 43129',
  email: 'raju.kumar@bharatpay.in',
  address: 'Flat 304, Sai Residency, Andheri East, Mumbai 400069',
  department: 'Field Operations',
  designation: 'Field Executive',
  joiningDate: '2024-03-11',
  shiftName: 'General Day Shift (09:00 – 18:00)',
  avatarUrl: '',
};

const INITIAL_ATTENDANCE_NOV_2026: EssAttendanceDay[] = [
  { date: '2026-11-01', dayNumber: 1, weekday: 'Sun', status: 'Weekly Off' },
  { date: '2026-11-02', dayNumber: 2, weekday: 'Mon', status: 'Present', checkIn: '08:58 AM', checkOut: '06:05 PM' },
  { date: '2026-11-03', dayNumber: 3, weekday: 'Tue', status: 'Present', checkIn: '09:02 AM', checkOut: '06:12 PM' },
  { date: '2026-11-04', dayNumber: 4, weekday: 'Wed', status: 'Present', checkIn: '09:05 AM', checkOut: '06:00 PM' },
  { date: '2026-11-05', dayNumber: 5, weekday: 'Thu', status: 'Present', checkIn: '08:55 AM', checkOut: '06:15 PM' },
  { date: '2026-11-06', dayNumber: 6, weekday: 'Fri', status: 'Present', checkIn: '09:00 AM', checkOut: '06:04 PM' },
  { date: '2026-11-07', dayNumber: 7, weekday: 'Sat', status: 'Present', checkIn: '09:04 AM', checkOut: '06:02 PM' },
  { date: '2026-11-08', dayNumber: 8, weekday: 'Sun', status: 'Weekly Off' },
  { date: '2026-11-09', dayNumber: 9, weekday: 'Mon', status: 'Present', checkIn: '08:59 AM', checkOut: '06:10 PM' },
  { date: '2026-11-10', dayNumber: 10, weekday: 'Tue', status: 'Absent' },
  { date: '2026-11-11', dayNumber: 11, weekday: 'Wed', status: 'Present', checkIn: '09:01 AM', checkOut: '06:08 PM' },
  { date: '2026-11-12', dayNumber: 12, weekday: 'Thu', status: 'Present', checkIn: '08:56 AM', checkOut: '06:18 PM' },
  { date: '2026-11-13', dayNumber: 13, weekday: 'Fri', status: 'Half Day', checkIn: '09:00 AM', checkOut: '01:30 PM' },
  { date: '2026-11-14', dayNumber: 14, weekday: 'Sat', status: 'Present', checkIn: '09:03 AM', checkOut: '06:01 PM' },
  { date: '2026-11-15', dayNumber: 15, weekday: 'Sun', status: 'Weekly Off' },
  { date: '2026-11-16', dayNumber: 16, weekday: 'Mon', status: 'Present', checkIn: '08:57 AM', checkOut: '06:11 PM' },
  { date: '2026-11-17', dayNumber: 17, weekday: 'Tue', status: 'Present', checkIn: '09:02 AM', checkOut: '06:20 PM' },
  { date: '2026-11-18', dayNumber: 18, weekday: 'Wed', status: 'Absent' },
  { date: '2026-11-19', dayNumber: 19, weekday: 'Thu', status: 'Present', checkIn: '09:00 AM', checkOut: '06:06 PM' },
  { date: '2026-11-20', dayNumber: 20, weekday: 'Fri', status: 'Present', checkIn: '08:54 AM', checkOut: '06:14 PM' },
  { date: '2026-11-21', dayNumber: 21, weekday: 'Sat', status: 'Present', checkIn: '09:01 AM', checkOut: '06:05 PM' },
  { date: '2026-11-22', dayNumber: 22, weekday: 'Sun', status: 'Weekly Off' },
  { date: '2026-11-23', dayNumber: 23, weekday: 'Mon', status: 'Present', checkIn: '09:02 AM' },
];

const INITIAL_ESS_LEAVES: EssLeaveRecord[] = [
  {
    id: 'ess-lv-1',
    leaveType: 'Casual Leave',
    fromDate: '2026-11-28',
    toDate: '2026-11-29',
    days: 2,
    reason: 'Attending cousin wedding in Nashik',
    status: 'Pending',
    appliedOn: '2026-11-21',
  },
  {
    id: 'ess-lv-2',
    leaveType: 'Sick Leave',
    fromDate: '2026-10-14',
    toDate: '2026-10-14',
    days: 1,
    reason: 'Seasonal viral fever — doctor prescription attached',
    documentName: 'medical_certificate_oct14.pdf',
    status: 'Approved',
    appliedOn: '2026-10-13',
  },
  {
    id: 'ess-lv-3',
    leaveType: 'Earned Leave',
    fromDate: '2026-09-20',
    toDate: '2026-09-22',
    days: 3,
    reason: 'Peak month-end dispatch freeze window',
    status: 'Rejected',
    appliedOn: '2026-09-10',
  },
];

const INITIAL_PAYSLIPS: EssPayslip[] = [
  {
    id: 'ps-nov-2026',
    month: 'November 2026',
    payDate: '2026-11-30',
    basicSalary: 16500,
    allowances: 4200,
    overtimePay: 1200,
    absentDeduction: 1400,
    pfDeduction: 1800,
    taxDeduction: 200,
    netPayable: 18500,
    workingDays: 26,
    presentDays: 22,
  },
  {
    id: 'ps-oct-2026',
    month: 'October 2026',
    payDate: '2026-10-31',
    basicSalary: 16500,
    allowances: 4200,
    overtimePay: 1800,
    absentDeduction: 0,
    pfDeduction: 1800,
    taxDeduction: 200,
    netPayable: 20500,
    workingDays: 26,
    presentDays: 26,
  },
  {
    id: 'ps-sep-2026',
    month: 'September 2026',
    payDate: '2026-09-30',
    basicSalary: 16500,
    allowances: 4200,
    overtimePay: 600,
    absentDeduction: 700,
    pfDeduction: 1800,
    taxDeduction: 200,
    netPayable: 18600,
    workingDays: 26,
    presentDays: 24,
  },
];

const INITIAL_NOTIFICATIONS: EssNotification[] = [
  {
    id: 'n-1',
    title: 'November 2026 estimated payslip is now available to preview.',
    time: 'Today, 09:30 AM',
    read: false,
  },
  {
    id: 'n-2',
    title: 'Your Casual Leave request for Nov 28–29 is pending review.',
    time: 'Nov 21, 04:15 PM',
    read: false,
  },
  {
    id: 'n-3',
    title: 'October 2026 salary (₹20,500) credited to HDFC Bank ****4821.',
    time: 'Oct 31, 11:00 AM',
    read: true,
  },
];

const EssContext = createContext<EssContextValue | undefined>(undefined);

export function EssProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<EssProfile>(INITIAL_PROFILE);
  const [checkedIn, setCheckedIn] = useState<boolean>(true);
  const [checkInTime, setCheckInTime] = useState<string | null>('09:02 AM');
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [attendanceDays, setAttendanceDays] = useState<EssAttendanceDay[]>(
    INITIAL_ATTENDANCE_NOV_2026
  );
  const [leaveRequests, setLeaveRequests] =
    useState<EssLeaveRecord[]>(INITIAL_ESS_LEAVES);
  const [leaveBalanceCasual, setLeaveBalanceCasual] = useState<number>(4);
  const [notifications, setNotifications] = useState<EssNotification[]>(
    INITIAL_NOTIFICATIONS
  );

  const updateProfile = (updates: Partial<EssProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const toggleAttendancePunch = () => {
    const nowTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (!checkedIn) {
      setCheckedIn(true);
      setCheckInTime(nowTime);
      setCheckOutTime(null);
      setAttendanceDays((prev) =>
        prev.map((d) =>
          d.date === '2026-11-23'
            ? { ...d, status: 'Present', checkIn: nowTime, checkOut: undefined }
            : d
        )
      );
    } else {
      setCheckedIn(false);
      setCheckOutTime(nowTime);
      setAttendanceDays((prev) =>
        prev.map((d) =>
          d.date === '2026-11-23' ? { ...d, checkOut: nowTime } : d
        )
      );
    }
  };

  const applyForLeave = (input: {
    leaveType: EssLeaveRecord['leaveType'];
    fromDate: string;
    toDate: string;
    reason: string;
    documentName?: string;
  }) => {
    const start = new Date(input.fromDate);
    const end = new Date(input.toDate);
    const diff = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const days = Number.isNaN(diff) ? 1 : diff;

    const newLeave: EssLeaveRecord = {
      id: `ess-lv-${Date.now()}`,
      leaveType: input.leaveType,
      fromDate: input.fromDate,
      toDate: input.toDate,
      days,
      reason: input.reason.trim(),
      documentName: input.documentName,
      status: 'Pending',
      appliedOn: '2026-11-23',
    };

    setLeaveRequests((prev) => [newLeave, ...prev]);
    if (input.leaveType === 'Casual Leave') {
      setLeaveBalanceCasual((prev) => Math.max(0, prev - days));
    }
  };

  // Keep November stats grounded on 22 Present / 2 Absent baseline
  const presentCount =
    attendanceDays.filter((d) => d.status === 'Present').length + 4;
  const absentCount = attendanceDays.filter((d) => d.status === 'Absent').length;

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <EssContext.Provider
      value={{
        profile,
        updateProfile,
        checkedIn,
        checkInTime,
        checkOutTime,
        toggleAttendancePunch,
        attendanceDays,
        presentCount,
        absentCount,
        leaveBalanceCasual,
        leaveRequests,
        applyForLeave,
        payslips: INITIAL_PAYSLIPS,
        notifications,
        markAllNotificationsRead,
      }}
    >
      {children}
    </EssContext.Provider>
  );
}

export function useEss() {
  const ctx = useContext(EssContext);
  if (!ctx) {
    throw new Error('useEss must be used within EssProvider');
  }
  return ctx;
}
