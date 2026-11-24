import { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

const SUPER_NAV = [
  { to: '/super-admin/dashboard', label: 'Platform Overview', icon: LayoutDashboard },
  { to: '/super-admin/plans', label: 'Subscription Plans', icon: CreditCard },
  { to: '/super-admin/free-limits', label: 'Free Plan Limits', icon: SlidersHorizontal },
  { to: '/super-admin/companies', label: 'Companies & Lifecycle', icon: Building2 },
  { to: '/super-admin/settings', label: 'Platform Settings', icon: Settings },
  { to: '/super-admin/admin-settings', label: 'Admin Settings', icon: Palette },
];

export function SuperAdminLayout() {
  const navigate = useNavigate();
  const { superAdminSession, logoutSuperAdmin } = useAuth();
  const { settings } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleLogout = async () => {
    await logoutSuperAdmin();
    navigate('/super-admin');
  };

  const sidebarBody = (
    <aside className="w-[260px] h-full bg-slate-950 border-r border-slate-800 flex flex-col justify-between text-slate-100 select-none">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            {settings.appLogoUrl && !logoError ? (
              <img
                src={settings.appLogoUrl}
                alt={settings.appName}
                onError={() => setLogoError(true)}
                className="w-9 h-9 rounded-lg object-cover bg-white border border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center text-white shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-display font-bold text-base text-white leading-tight truncate">
                {settings.appName} Admin
              </div>
              <div className="text-[11px] text-brand font-medium">
                Super Admin Console
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {SUPER_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand text-white'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-slate-800 space-y-2">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Company App</span>
        </button>

        <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {superAdminSession?.user.name || 'Super Admin'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {superAdminSession?.user.email}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out Super Admin"
            aria-label="Sign out Super Admin"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 flex">
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30 w-[260px]">
        {sidebarBody}
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full">{sidebarBody}</div>
        </div>
      )}

      <div className="flex-1 lg:pl-[260px] flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-slate-900">
                {settings.appName} Commercial SaaS Control Plane
              </span>
            </div>
          </div>

          <div className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
            Platform Super Admin
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
