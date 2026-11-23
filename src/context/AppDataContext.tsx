import React, { createContext, useContext, useState } from 'react';
import {
  COMPANIES,
  INITIAL_ATTENDANCE_REGISTER,
  INITIAL_EMPLOYEES,
  INITIAL_EXPENSES,
  INITIAL_LEAVES,
  INITIAL_SALARY_RULES,
  INITIAL_SHIFTS,
  INITIAL_TEAM_MEMBERS,
} from '../data/mockData';
import {
  AttendanceRegisterMap,
  CompanyProfile,
  DailyAttendanceEntry,
  Employee,
  ExpenseItem,
  Language,
  LeaveRequest,
  SalaryRulesConfig,
  ShiftDefinition,
  TeamMember,
} from '../types/staffpay';

interface AppContextValue {
  language: Language;
  toggleLanguage: () => void;
  companies: CompanyProfile[];
  activeCompany: CompanyProfile;
  setActiveCompanyId: (id: string) => void;
  updateCompanyProfile: (updates: Partial<CompanyProfile>) => void;
  createCompanyWorkspace: (input: {
    name: string;
    shortCode: string;
    city: string;
    gstin: string;
  }) => void;
  employees: Employee[];
  activeEmployees: Employee[];
  archivedEmployees: Employee[];
  addEmployee: (employee: Omit<Employee, 'id' | 'code'>) => void;
  removeEmployee: (id: string, reason?: string, leftDate?: string) => void;
  archiveEmployee: (id: string, reason?: string, leftDate?: string) => void;
  restoreEmployee: (id: string) => void;
  shifts: ShiftDefinition[];
  createShift: (shift: Omit<ShiftDefinition, 'id'>) => void;
  updateShift: (shift: ShiftDefinition) => void;
  deleteShift: (shiftId: string) => void;
  adjustShiftCapacity: (shiftId: string, delta: number) => void;
  assignShiftToEmployee: (employeeId: string, shiftName: string) => void;
  setEmployeeShift: (employeeId: string, newShift: string) => void;
  clearEmployeeShifts: (employeeId: string) => void;
  attendanceRegister: AttendanceRegisterMap;
  saveAttendanceDay: (
    date: string,
    dayEntries: Record<string, DailyAttendanceEntry>
  ) => void;
  leaves: LeaveRequest[];
  addLeaveRequest: (leave: Omit<LeaveRequest, 'id' | 'status'>) => void;
  updateLeaveStatus: (id: string, status: 'Approved' | 'Rejected') => void;
  expenses: ExpenseItem[];
  addExpense: (
    expense: Omit<ExpenseItem, 'id' | 'status'> & {
      status?: ExpenseItem['status'];
    }
  ) => void;
  updateExpenseStatus: (id: string, status: 'Approved' | 'Reimbursed') => void;
  salaryRules: SalaryRulesConfig;
  updateSalaryRules: (rules: SalaryRulesConfig) => void;
  payrollProcessedMonth: string | null;
  lastPayrollRunAt: string | null;
  markPayrollProcessed: (monthLabel: string) => void;
  teamMembers: TeamMember[];
  addTeamMember: (member: Omit<TeamMember, 'id' | 'lastActive'>) => void;
  toggleTeamPermission: (
    memberId: string,
    perm: keyof TeamMember['permissions']
  ) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
}

const AppDataContext = createContext<AppContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyProfile[]>(COMPANIES);
  const [activeCompanyId, setActiveCompanyId] = useState<string>(
    COMPANIES[0].id
  );

  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [shifts, setShifts] = useState<ShiftDefinition[]>(INITIAL_SHIFTS);
  const [attendanceRegister, setAttendanceRegister] =
    useState<AttendanceRegisterMap>(INITIAL_ATTENDANCE_REGISTER);
  const [leaves, setLeaves] = useState<LeaveRequest[]>(INITIAL_LEAVES);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(INITIAL_EXPENSES);
  const [salaryRules, setSalaryRules] =
    useState<SalaryRulesConfig>(INITIAL_SALARY_RULES);
  const [teamMembers, setTeamMembers] =
    useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);

  const [payrollProcessedMonth, setPayrollProcessedMonth] = useState<
    string | null
  >(null);
  const [lastPayrollRunAt, setLastPayrollRunAt] = useState<string | null>(null);

  const activeCompany =
    companies.find((c) => c.id === activeCompanyId) || companies[0];

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  const updateCompanyProfile = (updates: Partial<CompanyProfile>) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === activeCompany.id ? { ...c, ...updates } : c))
    );
  };

  const createCompanyWorkspace = (input: {
    name: string;
    shortCode: string;
    city: string;
    gstin: string;
  }) => {
    const id = `comp-${Date.now()}`;
    const created: CompanyProfile = {
      id,
      name: input.name,
      shortCode: input.shortCode,
      industry: 'General Business',
      gstin: input.gstin,
      pfRegistration: 'PENDING',
      esiCode: 'PENDING',
      city: input.city,
    };
    setCompanies((prev) => [created, ...prev]);
    setActiveCompanyId(id);
  };

  const activeEmployees = employees.filter((e) => e.status !== 'Archived');
  const archivedEmployees = employees.filter((e) => e.status === 'Archived');

  const addEmployee = (employee: Omit<Employee, 'id' | 'code'>) => {
    const nextNum = 101 + employees.length;
    const newEmp: Employee = {
      ...employee,
      id: `emp-${Date.now()}`,
      code: `EMP-${nextNum}`,
    };
    setEmployees((prev) => [newEmp, ...prev]);
  };

  const archiveEmployee = (
    id: string,
    reason = 'Voluntary resignation',
    leftDate = '2026-11-23'
  ) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'Archived',
              leftDate,
              leavingReason: reason.trim() || 'Voluntary resignation',
            }
          : e
      )
    );
  };

  const restoreEmployee = (id: string) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'Active',
              leftDate: undefined,
              leavingReason: undefined,
            }
          : e
      )
    );
  };

  const removeEmployee = (
    id: string,
    reason?: string,
    leftDate?: string
  ) => {
    archiveEmployee(id, reason, leftDate);
  };

  const createShift = (shift: Omit<ShiftDefinition, 'id'>) => {
    const newShift: ShiftDefinition = {
      ...shift,
      id: `shift-${Date.now()}`,
    };
    setShifts((prev) => [...prev, newShift]);
  };

  const updateShift = (updatedShift: ShiftDefinition) => {
    const previous = shifts.find((s) => s.id === updatedShift.id);
    setShifts((prev) =>
      prev.map((s) => (s.id === updatedShift.id ? updatedShift : s))
    );
    if (previous && previous.name !== updatedShift.name) {
      setEmployees((prev) =>
        prev.map((emp) => ({
          ...emp,
          shifts: emp.shifts.map((shName) =>
            shName === previous.name ? updatedShift.name : shName
          ),
        }))
      );
    }
  };

  const deleteShift = (shiftId: string) => {
    const targetShift = shifts.find((s) => s.id === shiftId);
    setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    if (targetShift) {
      setEmployees((prev) =>
        prev.map((emp) => ({
          ...emp,
          shifts: emp.shifts.filter((name) => name !== targetShift.name),
        }))
      );
    }
  };

  const adjustShiftCapacity = (shiftId: string, delta: number) => {
    setShifts((prev) =>
      prev.map((sh) =>
        sh.id === shiftId
          ? { ...sh, targetCapacity: Math.max(1, sh.targetCapacity + delta) }
          : sh
      )
    );
  };

  const assignShiftToEmployee = (employeeId: string, shiftName: string) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;
        if (emp.shifts.includes(shiftName)) return emp;
        return { ...emp, shifts: [...emp.shifts, shiftName] };
      })
    );
  };

  const setEmployeeShift = (employeeId: string, newShift: string) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? { ...emp, shifts: newShift ? [newShift] : [] }
          : emp
      )
    );
  };

  const clearEmployeeShifts = (employeeId: string) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === employeeId ? { ...emp, shifts: [] } : emp))
    );
  };

  const saveAttendanceDay = (
    date: string,
    dayEntries: Record<string, DailyAttendanceEntry>
  ) => {
    setAttendanceRegister((prev) => ({
      ...prev,
      [date]: dayEntries,
    }));
  };

  const addLeaveRequest = (leave: Omit<LeaveRequest, 'id' | 'status'>) => {
    const newLeave: LeaveRequest = {
      ...leave,
      id: `lv-${Date.now()}`,
      status: 'Pending',
    };
    setLeaves((prev) => [newLeave, ...prev]);
  };

  const updateLeaveStatus = (id: string, status: 'Approved' | 'Rejected') => {
    setLeaves((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );
  };

  const addExpense = (
    expense: Omit<ExpenseItem, 'id' | 'status'> & {
      status?: ExpenseItem['status'];
    }
  ) => {
    const newExpense: ExpenseItem = {
      ...expense,
      id: `exp-${Date.now()}`,
      status: expense.status || 'Pending',
    };
    setExpenses((prev) => [newExpense, ...prev]);
  };

  const updateExpenseStatus = (
    id: string,
    status: 'Approved' | 'Reimbursed'
  ) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e))
    );
  };

  const updateSalaryRules = (rules: SalaryRulesConfig) => {
    setSalaryRules(rules);
  };

  const markPayrollProcessed = (monthLabel: string) => {
    setPayrollProcessedMonth(monthLabel);
    setLastPayrollRunAt(
      new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  };

  const addTeamMember = (member: Omit<TeamMember, 'id' | 'lastActive'>) => {
    const created: TeamMember = {
      ...member,
      id: `tm-${Date.now()}`,
      lastActive: 'Just invited',
    };
    setTeamMembers((prev) => [...prev, created]);
  };

  const toggleTeamPermission = (
    memberId: string,
    perm: keyof TeamMember['permissions']
  ) => {
    setTeamMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              permissions: {
                ...m.permissions,
                [perm]: !m.permissions[perm],
              },
            }
          : m
      )
    );
  };

  return (
    <AppDataContext.Provider
      value={{
        language,
        toggleLanguage,
        companies,
        activeCompany,
        setActiveCompanyId,
        updateCompanyProfile,
        createCompanyWorkspace,
        employees,
        activeEmployees,
        archivedEmployees,
        addEmployee,
        removeEmployee,
        archiveEmployee,
        restoreEmployee,
        shifts,
        createShift,
        updateShift,
        deleteShift,
        adjustShiftCapacity,
        assignShiftToEmployee,
        setEmployeeShift,
        clearEmployeeShifts,
        attendanceRegister,
        saveAttendanceDay,
        leaves,
        addLeaveRequest,
        updateLeaveStatus,
        expenses,
        addExpense,
        updateExpenseStatus,
        salaryRules,
        updateSalaryRules,
        payrollProcessedMonth,
        lastPayrollRunAt,
        markPayrollProcessed,
        teamMembers,
        addTeamMember,
        toggleTeamPermission,
        mobileSidebarOpen,
        setMobileSidebarOpen,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return ctx;
}
