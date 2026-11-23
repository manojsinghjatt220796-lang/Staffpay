import { ArrowUpRight, Menu, Play } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';

const PATH_TITLES: Record<string, { en: string; hi: string }> = {
  '/dashboard': { en: 'Dashboard', hi: 'डैशबोर्ड' },
  '/employees': { en: 'Employees', hi: 'कर्मचारी' },
  '/attendance': { en: 'Attendance & Shifts', hi: 'उपस्थिति व शिफ्ट' },
  '/leaves': { en: 'Leave Management', hi: 'अवकाश प्रबंधन' },
  '/payroll': { en: 'Payroll', hi: 'पेरोल' },
  '/salary-rules': { en: 'Salary Rules', hi: 'वेतन नियम' },
  '/expenses': { en: 'Expenses', hi: 'व्यय' },
  '/reports': { en: 'Reports & Analytics', hi: 'रिपोर्ट व विश्लेषण' },
  '/team': { en: 'Team & Access', hi: 'टीम व एक्सेस' },
  '/archived': { en: 'Archived Employees (Leave)', hi: 'पूर्व कर्मचारी (आर्काइव)' },
  '/settings': { en: 'Company Settings', hi: 'कंपनी सेटिंग्स' },
};

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, toggleLanguage, activeCompany, setMobileSidebarOpen } =
    useAppData();
  const { permissions } = useAuth();
  const { isFree, hasAutomatedPayroll, openUpgradeModal } = useSubscription();

  const titleObj = PATH_TITLES[location.pathname] || PATH_TITLES['/dashboard'];
  const pageTitle = language === 'hi' ? titleObj.hi : titleObj.en;

  const handleQuickRunPayroll = () => {
    if (!hasAutomatedPayroll) {
      openUpgradeModal(
        'Automated Payroll Processing',
        'Free Plan provides view-only payroll estimates. Upgrade to Starter or Growth Plan to run automated payroll.'
      );
      return;
    }
    navigate('/payroll');
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile toggle + Breadcrumb navigation */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-sm min-w-0 truncate"
          >
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="hidden sm:inline text-slate-500 hover:text-slate-800 truncate cursor-pointer"
            >
              {activeCompany.name}
            </button>
            <span className="hidden sm:inline text-slate-300" aria-hidden="true">
              /
            </span>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
              {pageTitle}
            </h1>
          </nav>
        </div>

        {/* Right: Language toggle (EN/हिं), Run Payroll, Upgrade Plan (if Free) */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div
            className="inline-flex items-center p-0.5 bg-gray-100 border border-gray-200 rounded-lg"
            role="group"
            aria-label="Language toggle"
          >
            <button
              type="button"
              onClick={() => language !== 'en' && toggleLanguage()}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => language !== 'hi' && toggleLanguage()}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                language === 'hi'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              हिं
            </button>
          </div>

          {permissions.canRunPayroll && (
            <button
              type="button"
              onClick={handleQuickRunPayroll}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-blue-600" />
              <span>{language === 'hi' ? 'पेरोल चलाएं' : 'Run Payroll'}</span>
            </button>
          )}

          {isFree && (
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{language === 'hi' ? 'प्लान अपग्रेड' : 'Upgrade Plan'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
