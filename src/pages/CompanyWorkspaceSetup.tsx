import React, { useState } from 'react';
import { ArrowLeft, Building2, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

export interface WorkspaceSetupFormData {
  legalEntityName: string;
  workspaceDisplayName: string;
  country: string;
  primaryPayrollCurrency: string;
  companyTimezone: string;
  workspaceSlug: string;
  taxIdentifier: string;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CompanyWorkspaceSetup() {
  const navigate = useNavigate();
  const { createCompanyWorkspace } = useAppData();

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  const [formData, setFormData] = useState<WorkspaceSetupFormData>({
    legalEntityName: '',
    workspaceDisplayName: '',
    country: 'US',
    primaryPayrollCurrency: 'USD',
    companyTimezone: 'UTC',
    workspaceSlug: '',
    taxIdentifier: '',
  });
  const [slugTouched, setSlugTouched] = useState(false);

  const [inviteToken, setInviteToken] = useState('');
  const [tokenError, setTokenError] = useState('');

  const handleDisplayNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      workspaceDisplayName: value,
      workspaceSlug: slugTouched ? prev.workspaceSlug : toSlug(value),
    }));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: WorkspaceSetupFormData = {
      ...formData,
      legalEntityName: formData.legalEntityName.trim(),
      workspaceDisplayName: formData.workspaceDisplayName.trim(),
      country: formData.country.trim() || 'US',
      workspaceSlug:
        formData.workspaceSlug.trim() ||
        toSlug(formData.workspaceDisplayName) ||
        'company-workspace',
      taxIdentifier: formData.taxIdentifier.trim(),
    };

    console.log('Created Company Workspace:', payload);
    createCompanyWorkspace({
      name: payload.workspaceDisplayName || payload.legalEntityName,
      shortCode: (
        payload.workspaceDisplayName ||
        payload.legalEntityName ||
        'SP'
      )
        .slice(0, 2)
        .toUpperCase(),
      city: payload.country,
      gstin: payload.taxIdentifier || 'PENDING-VERIFICATION',
    });
    navigate('/dashboard');
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) {
      setTokenError('Please enter a valid workspace invite token.');
      return;
    }
    console.log('Joined Workspace with Invite Token:', {
      inviteToken: inviteToken.trim(),
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Top Brand + Return Link */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-display font-bold text-base">
              S
            </div>
            <span className="font-display font-bold text-lg text-slate-900 tracking-tight">
              StaffPay
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Centered Workspace Setup Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
          {/* Header */}
          <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Set up your first company workspace
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
              Create an isolated company workspace where you begin as Company
              Owner, configure payroll schedules, and invite your team.
            </p>

            {/* Tabs */}
            <div
              className="mt-5 inline-flex items-center p-1 bg-gray-100 border border-gray-200 rounded-lg"
              role="tablist"
              aria-label="Workspace setup mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'create'}
                onClick={() => setActiveTab('create')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Create Company</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'join'}
                onClick={() => setActiveTab('join')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'join'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Join with Invite Token</span>
              </button>
            </div>
          </div>

          {/* Tab Panels */}
          {activeTab === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="p-6 sm:p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="legalEntityName"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Legal Entity Name
                  </label>
                  <input
                    id="legalEntityName"
                    type="text"
                    required
                    value={formData.legalEntityName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        legalEntityName: e.target.value,
                      }))
                    }
                    placeholder="e.g. Acme Logistics Inc."
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="workspaceDisplayName"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Workspace Display Name
                  </label>
                  <input
                    id="workspaceDisplayName"
                    type="text"
                    required
                    value={formData.workspaceDisplayName}
                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                    placeholder="e.g. Acme Logistics"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label
                    htmlFor="country"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Country
                  </label>
                  <input
                    id="country"
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                    placeholder="US"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="primaryPayrollCurrency"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Primary Payroll Currency
                  </label>
                  <select
                    id="primaryPayrollCurrency"
                    value={formData.primaryPayrollCurrency}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        primaryPayrollCurrency: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="SGD">SGD (S$)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="companyTimezone"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Company Timezone
                  </label>
                  <select
                    id="companyTimezone"
                    value={formData.companyTimezone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        companyTimezone: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="workspaceSlug"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Workspace Slug
                  </label>
                  <div className="flex items-center rounded-lg border border-gray-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600">
                    <span className="px-3 py-2.5 text-xs font-mono text-slate-500 bg-gray-50 border-r border-gray-200 shrink-0">
                      staffpay.app/
                    </span>
                    <input
                      id="workspaceSlug"
                      type="text"
                      required
                      value={formData.workspaceSlug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setFormData((prev) => ({
                          ...prev,
                          workspaceSlug: toSlug(e.target.value),
                        }));
                      }}
                      placeholder="acme-logistics"
                      className="w-full px-3 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="taxIdentifier"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Tax/Registration Identifier
                  </label>
                  <input
                    id="taxIdentifier"
                    type="text"
                    required
                    value={formData.taxIdentifier}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        taxIdentifier: e.target.value,
                      }))
                    }
                    placeholder="e.g. EIN 84-2910482 / GSTIN"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex items-center justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Create Company Workspace
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleJoinSubmit} className="p-6 sm:p-8 space-y-5">
              <div>
                <label
                  htmlFor="inviteToken"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Workspace Invite Token
                </label>
                <input
                  id="inviteToken"
                  type="text"
                  value={inviteToken}
                  onChange={(e) => {
                    setInviteToken(e.target.value);
                    setTokenError('');
                  }}
                  placeholder="Paste the invite token shared by your Company Owner"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                {tokenError && (
                  <p className="mt-1.5 text-xs text-rose-600">{tokenError}</p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200 flex items-center justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Join Company Workspace
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between text-xs text-slate-400 px-1">
          <span>StaffPay Commercial SaaS</span>
          <button
            type="button"
            onClick={() => navigate('/super-admin')}
            className="text-slate-500 hover:text-slate-800 underline underline-offset-2 cursor-pointer"
          >
            Platform Super Admin Console
          </button>
        </div>
      </div>
    </div>
  );
}
