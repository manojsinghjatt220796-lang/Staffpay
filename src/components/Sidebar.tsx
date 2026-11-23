import React, { useEffect, useRef, useState } from 'react';
import {
  Archive,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  Receipt,
  Settings,
  Shield,
  Sliders,
  Users,
  X,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { UserRole } from '../types/staffpay';
import { Modal } from './Modal';

interface NavItem {
  to: string;
  labelEn: string;
  labelHi: string;
  icon: React.ComponentType<{ className?: string }>;
  rbacHint?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', labelEn: 'Dashboard', labelHi: 'डैशबोर्ड', icon: LayoutDashboard },
  { to: '/employees', labelEn: 'Employees', labelHi: 'कर्मचारी', icon: Users },
  { to: '/attendance', labelEn: 'Attendance & Shifts', labelHi: 'उपस्थिति व शिफ्ट', icon: Clock },
  { to: '/leaves', labelEn: 'Leave Management', labelHi: 'अवकाश प्रबंधन', icon: CalendarDays },
  { to: '/payroll', labelEn: 'Payroll', labelHi: 'पेरोल', icon: FileText },
  { to: '/salary-rules', labelEn: 'Salary Rules', labelHi: 'वेतन नियम', icon: Sliders },
  { to: '/expenses', labelEn: 'Expenses', labelHi: 'व्यय', icon: Receipt },
  { to: '/reports', labelEn: 'Reports & Analytics', labelHi: 'रिपोर्ट व विश्लेषण', icon: BarChart3 },
  { to: '/team', labelEn: 'Team & Access', labelHi: 'टीम व एक्सेस', icon: Shield, rbacHint: true },
  { to: '/archived', labelEn: 'Leave / Archived', labelHi: 'पूर्व कर्मचारी', icon: Archive },
  { to: '/settings', labelEn: 'Company Settings', labelHi: 'कंपनी सेटिंग्स', icon: Settings },
];

const ROLES: UserRole[] = [
  'Company Owner',
  'HR Manager',
  'Payroll Admin',
  'Department Lead',
  'Employee',
];

export function Sidebar() {
  const navigate = useNavigate();
  const {
    language,
    companies,
    activeCompany,
    setActiveCompanyId,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useAppData();
  const { user, setUserRole, lockSession, isLocked, unlockSession } = useAuth();
  const { planMeta, hasRbacAccess } = useSubscription();

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(e.target as Node)
      ) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const sidebarContent = (
    <aside className="w-[260px] h-full bg-[#0f172a] border-r border-slate-800 flex flex-col justify-between select-none shrink-0 text-slate-100">
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand Header */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              navigate('/dashboard');
              setMobileSidebarOpen(false);
            }}
            className="flex items-center gap-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-display font-bold text-lg">
              S
            </div>
            <span className="font-display font-bold text-xl text-white tracking-tight">
              StaffPay
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Company Switcher */}
        <div className="px-4 pb-4 relative" ref={switcherRef}>
          <button
            type="button"
            onClick={() => setSwitcherOpen((prev) => !prev)}
            aria-expanded={switcherOpen}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate">
                {activeCompany.name}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 truncate">
                {planMeta.name} Plan <span aria-hidden="true">·</span>{' '}
                {activeCompany.shortCode}
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
                switcherOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {switcherOpen && (
            <div className="absolute left-4 right-4 top-[calc(100%-8px)] z-30 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1.5 space-y-1">
              <div className="px-2.5 py-1 text-xs font-medium text-slate-400">
                Switch Company
              </div>
              {companies.map((company) => {
                const selected = company.id === activeCompany.id;
                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => {
                      setActiveCompanyId(company.id);
                      setSwitcherOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-left text-xs transition-colors cursor-pointer ${
                      selected
                        ? 'bg-slate-800 text-white font-medium'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{company.name}</span>
                    {selected && (
                      <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setSwitcherOpen(false);
                  setMobileSidebarOpen(false);
                  navigate('/setup');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-xs font-medium text-blue-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Create Company Workspace</span>
              </button>

              <div className="my-1 border-t border-slate-800" />
              <div className="px-2.5 py-1 text-xs font-medium text-slate-400">
                Active Role Preview
              </div>
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setUserRole(r);
                    setSwitcherOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-xs transition-colors cursor-pointer ${
                    user.role === r
                      ? 'bg-blue-600/20 text-blue-300 font-medium'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <span>{r}</span>
                  {user.role === r && <Check className="w-3 h-3 text-blue-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav
          aria-label="Primary Sidebar Navigation"
          className="flex-1 overflow-y-auto px-3 space-y-1"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const label = language === 'hi' ? item.labelHi : item.labelEn;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileSidebarOpen(false)}
                className={({ isActive }) =>
                  `w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#2563eb] text-white'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{label}</span>
                    </span>
                    {item.rbacHint && !hasRbacAccess && (
                      <Lock
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile + Logout */}
      <div className="px-3 pt-3 pb-4 border-t border-slate-800">
        <div className="flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg bg-slate-800/60 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            {!avatarError ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                PS
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {user.name}
              </div>
              <div className="text-xs text-slate-400 truncate">{user.role}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLogoutModalOpen(true)}
            title="Logout"
            aria-label="Logout"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Modal
        isOpen={logoutModalOpen}
        onClose={() => {
          setLogoutModalOpen(false);
          unlockSession();
        }}
        title={isLocked ? 'Session Locked' : 'Sign out of StaffPay'}
        subtitle={user.email}
        maxWidthClass="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {isLocked
              ? `Your workspace for ${activeCompany.name} is paused. Click Resume Session to continue.`
              : `Signed in as ${user.name} (${user.role}) on ${activeCompany.name}.`}
          </p>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setLogoutModalOpen(false);
                unlockSession();
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              {isLocked ? 'Resume Session' : 'Cancel'}
            </button>
            {!isLocked && (
              <button
                type="button"
                onClick={lockSession}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Lock Session
              </button>
            )}
          </div>
        </div>
      </Modal>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30 w-[260px]">
        {sidebarContent}
      </div>

      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-slate-900/60"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
