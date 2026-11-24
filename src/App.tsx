import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { EmployeePortalLayout } from './components/ess/EmployeePortalLayout';
import { Sidebar } from './components/Sidebar';
import { SuperAdminLayout } from './components/super-admin/SuperAdminLayout';
import { Topbar } from './components/Topbar';
import { UpgradeModal } from './components/UpgradeModal';
import { AppDataProvider } from './context/AppDataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EssProvider } from './context/EssContext';
import { SettingsProvider } from './context/SettingsContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { ArchivedEmployees } from './pages/ArchivedEmployees';
import { Attendance } from './pages/Attendance';
import { CompanySettings } from './pages/CompanySettings';
import { CompanyWorkspaceSetup } from './pages/CompanyWorkspaceSetup';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { EssAttendanceLeaves } from './pages/ess/EssAttendanceLeaves';
import { EssDashboard } from './pages/ess/EssDashboard';
import { EssProfile } from './pages/ess/EssProfile';
import { EssSalary } from './pages/ess/EssSalary';
import { Expenses } from './pages/Expenses';
import { LeaveManagement } from './pages/LeaveManagement';
import { Payroll } from './pages/Payroll';
import { Reports } from './pages/Reports';
import { SalaryRules } from './pages/SalaryRules';
import { AdminSettings } from './pages/super-admin/AdminSettings';
import { SuperAdminAuthGate } from './pages/super-admin/SuperAdminAuthGate';
import { SuperAdminCompanies } from './pages/super-admin/SuperAdminCompanies';
import { SuperAdminDashboard } from './pages/super-admin/SuperAdminDashboard';
import { SuperAdminFreeLimits } from './pages/super-admin/SuperAdminFreeLimits';
import { SuperAdminPlans } from './pages/super-admin/SuperAdminPlans';
import { SuperAdminSettings } from './pages/super-admin/SuperAdminSettings';
import { TeamAccess } from './pages/TeamAccess';

function StaffPayAdminShell() {
  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 flex">
      <Sidebar />
      <div className="flex-1 lg:pl-[260px] flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/leaves" element={<LeaveManagement />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/salary-rules" element={<SalaryRules />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/team" element={<TeamAccess />} />
            <Route path="/archived" element={<ArchivedEmployees />} />
            <Route path="/settings" element={<CompanySettings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
      <UpgradeModal />
    </div>
  );
}

function SuperAdminGuard() {
  const { superAdminSession } = useAuth();
  if (
    !superAdminSession ||
    superAdminSession.user.platformRole !== 'super_admin'
  ) {
    return <SuperAdminAuthGate />;
  }
  return <SuperAdminLayout />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Platform Super Admin Console (strictly gated by Super Admin server auth) */}
      <Route path="/super-admin" element={<SuperAdminGuard />}>
        <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="plans" element={<SuperAdminPlans />} />
        <Route path="free-limits" element={<SuperAdminFreeLimits />} />
        <Route path="companies" element={<SuperAdminCompanies />} />
        <Route path="settings" element={<SuperAdminSettings />} />
        <Route path="admin-settings" element={<AdminSettings />} />
        <Route path="*" element={<Navigate to="/super-admin/dashboard" replace />} />
      </Route>

      {user.role === 'Employee' ? (
        <>
          <Route path="/ess" element={<EmployeePortalLayout />}>
            <Route index element={<Navigate to="/ess/dashboard" replace />} />
            <Route path="dashboard" element={<EssDashboard />} />
            <Route path="attendance" element={<EssAttendanceLeaves />} />
            <Route path="salary" element={<EssSalary />} />
            <Route path="profile" element={<EssProfile />} />
          </Route>
          <Route path="*" element={<Navigate to="/ess/dashboard" replace />} />
        </>
      ) : (
        <>
          <Route path="/setup" element={<CompanyWorkspaceSetup />} />
          <Route path="/ess/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/*" element={<StaffPayAdminShell />} />
        </>
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <SubscriptionProvider>
            <AppDataProvider>
              <EssProvider>
                <AppRoutes />
              </EssProvider>
            </AppDataProvider>
          </SubscriptionProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
