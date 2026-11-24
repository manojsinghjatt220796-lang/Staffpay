import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  FileText,
  Home,
  LogOut,
  Shield,
  User,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEss } from '../../context/EssContext';
import { useSettings } from '../../context/SettingsContext';

const ESS_NAV_ITEMS = [
  { to: '/ess/dashboard', label: 'Home', icon: Home },
  { to: '/ess/attendance', label: 'Attendance & Leaves', icon: CalendarDays },
  { to: '/ess/salary', label: 'My Salary', icon: FileText },
  { to: '/ess/profile', label: 'My Profile', icon: User },
];

export function EmployeePortalLayout() {
  const navigate = useNavigate();
  const { setUserRole } = useAuth();
  const { profile, notifications, markAllNotificationsRead } = useEss();
  const { settings } = useSettings();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loggedOutNotice, setLoggedOutNotice] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [settings.appLogoUrl]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const initials = profile.name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => navigate('/ess/dashboard')}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer"
          >
            {settings.appLogoUrl && !logoError ? (
              <img
                src={settings.appLogoUrl}
                alt={settings.appName}
                onError={() => setLogoError(true)}
                className="w-8 h-8 rounded-lg object-cover bg-white border border-gray-200 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-brand text-white font-bold text-base flex items-center justify-center shrink-0">
                {(settings.appName.trim()[0] || 'S').toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                {settings.appName}
              </span>
              <span className="hidden sm:inline text-xs text-slate-400 ml-2">
                Employee Portal
              </span>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav
            aria-label="Employee Portal Navigation"
            className="hidden md:flex items-center gap-1"
          >
            {ESS_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-brand text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-gray-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Controls: Notification Bell + Profile Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  setProfileMenuOpen(false);
                }}
                aria-label="Notifications"
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-40">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <span className="text-xs font-semibold text-slate-900">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-gray-100 mt-1 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="py-2.5 text-xs">
                        <p
                          className={`${
                            n.read
                              ? 'text-slate-600'
                              : 'text-slate-900 font-medium'
                          }`}
                        >
                          {n.title}
                        </p>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          {n.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setNotifOpen(false);
                }}
                className="inline-flex items-center gap-2.5 p-1.5 pr-2.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-semibold flex items-center justify-center">
                    {initials}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">
                    {profile.name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {profile.employeeId}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-40">
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <div className="text-xs font-semibold text-slate-900">
                      {profile.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {profile.email}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate('/ess/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setUserRole('Company Owner');
                      navigate('/dashboard');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    <span>Switch to Admin View</span>
                  </button>

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setLoggedOutNotice(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Tab Strip */}
        <nav
          aria-label="Mobile Employee Navigation"
          className="md:hidden border-t border-gray-100 px-2 py-1.5 flex items-center justify-around bg-white overflow-x-auto"
        >
          {ESS_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap ${
                    isActive
                      ? 'text-brand bg-brand/10'
                      : 'text-slate-500 hover:text-slate-800'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </header>

      {loggedOutNotice && (
        <div
          role="alert"
          className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-4"
        >
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3">
            <span>
              You signed out of {profile.name}&apos;s session preview. Switch back
              to Admin or continue exploring.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setLoggedOutNotice(false);
                  setUserRole('Company Owner');
                  navigate('/dashboard');
                }}
                className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Admin Login
              </button>
              <button
                type="button"
                onClick={() => setLoggedOutNotice(false)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
