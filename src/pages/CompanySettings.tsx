import React, { useState } from 'react';
import { Building2, CheckCircle2, CreditCard } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { Subscription } from './Subscription';

export function CompanySettings() {
  const { activeCompany, updateCompanyProfile } = useAppData();

  const [tab, setTab] = useState<'subscription' | 'profile'>('subscription');
  const [name, setName] = useState(activeCompany.name);
  const [city, setCity] = useState(activeCompany.city);
  const [gstin, setGstin] = useState(activeCompany.gstin);
  const [pfReg, setPfReg] = useState(activeCompany.pfRegistration);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyProfile({
      name: name.trim() || activeCompany.name,
      city: city.trim() || activeCompany.city,
      gstin: gstin.trim() || activeCompany.gstin,
      pfRegistration: pfReg.trim() || activeCompany.pfRegistration,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Company Settings
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage subscription plan, billing cycle, and legal entity details
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setTab('subscription')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              tab === 'subscription'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Subscription & Pricing</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              tab === 'profile'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Company Profile</span>
          </button>
        </div>
      </div>

      {tab === 'subscription' ? (
        <Subscription />
      ) : (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white border border-gray-200 rounded-xl p-6 max-w-2xl space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Legal Entity Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Headquarters City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                GSTIN
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                EPFO Registration Code
              </label>
              <input
                type="text"
                value={pfReg}
                onChange={(e) => setPfReg(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="text-xs text-emerald-700 flex items-center gap-1.5">
              {savedNotice && (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Company profile updated</span>
                </>
              )}
            </div>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
