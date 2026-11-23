import React, { useState } from 'react';
import { Lock, Plus, Shield } from 'lucide-react';
import { Modal } from '../components/Modal';
import { useAppData } from '../context/AppDataContext';
import { useSubscription } from '../context/SubscriptionContext';
import { UserRole } from '../types/staffpay';

export function TeamAccess() {
  const { teamMembers, addTeamMember, toggleTeamPermission } = useAppData();
  const { hasRbacAccess, openUpgradeModal } = useSubscription();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('HR Manager');

  const handleOpenInvite = () => {
    if (!hasRbacAccess) {
      openUpgradeModal(
        'Team & Access Control',
        'Multi-user role-based access control requires the Growth Plan. Upgrade to invite HR managers, payroll admins, and department leads.'
      );
      return;
    }
    setInviteOpen(true);
  };

  const handleToggle = (
    memberId: string,
    perm: 'runPayroll' | 'approveLeaves' | 'approveExpenses' | 'manageStaff'
  ) => {
    if (!hasRbacAccess) {
      openUpgradeModal(
        'Role-Based Permissions',
        'Multi-user role-based access control requires the Growth Plan. Upgrade to customize module permissions.'
      );
      return;
    }
    toggleTeamPermission(memberId, perm);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    addTeamMember({
      name: name.trim(),
      email: email.trim(),
      role,
      permissions: {
        runPayroll: role === 'Company Owner' || role === 'Payroll Admin',
        approveLeaves:
          role === 'Company Owner' ||
          role === 'HR Manager' ||
          role === 'Department Lead',
        approveExpenses:
          role === 'Company Owner' ||
          role === 'Payroll Admin' ||
          role === 'Department Lead',
        manageStaff: role === 'Company Owner' || role === 'HR Manager',
      },
    });
    setName('');
    setEmail('');
    setInviteOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Team & Access Control
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure administrator roles and module-level permissions
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenInvite}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {!hasRbacAccess ? (
            <Lock className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>Invite Admin</span>
        </button>
      </div>

      {!hasRbacAccess && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-3 text-sm text-amber-900">
            <Shield className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Multi-user role-based access control requires the Growth Plan.
              Currently previewing access matrix.
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              openUpgradeModal(
                'Role-Based Access Control',
                'Multi-user role-based access control requires the Growth Plan.'
              )
            }
            className="text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Upgrade to Growth →
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold text-slate-500 bg-gray-50">
                <th className="py-3.5 px-5">User</th>
                <th className="py-3.5 px-5">Role</th>
                <th className="py-3.5 px-5 text-center">Run Payroll</th>
                <th className="py-3.5 px-5 text-center">Approve Leaves</th>
                <th className="py-3.5 px-5 text-center">Approve Expenses</th>
                <th className="py-3.5 px-5 text-center">Manage Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {teamMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50/70">
                  <td className="py-4 px-5">
                    <div className="font-semibold text-slate-900">
                      {member.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {member.email} <span aria-hidden="true">·</span>{' '}
                      {member.lastActive}
                    </div>
                  </td>
                  <td className="py-4 px-5 text-slate-700 font-medium whitespace-nowrap">
                    {member.role}
                  </td>
                  {(
                    [
                      'runPayroll',
                      'approveLeaves',
                      'approveExpenses',
                      'manageStaff',
                    ] as const
                  ).map((perm) => {
                    const enabled = member.permissions[perm];
                    return (
                      <td key={perm} className="py-4 px-5 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggle(member.id, perm)}
                            aria-pressed={enabled}
                            aria-disabled={!hasRbacAccess}
                            title={
                              hasRbacAccess
                                ? 'Toggle permission'
                                : 'Locked on current plan — Upgrade to Growth Plan'
                            }
                            className={`relative inline-flex items-center w-10 h-6 rounded-full transition-colors ${
                              !hasRbacAccess
                                ? 'opacity-60 cursor-not-allowed'
                                : 'cursor-pointer'
                            } ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                          >
                            <span
                              className={`inline-block w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                                enabled ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          {!hasRbacAccess && (
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Team Administrator"
        subtitle="Assign a management role for this company workspace."
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rajeshwari Nair"
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rajeshwari@bharatpay.in"
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="HR Manager">HR Manager</option>
              <option value="Payroll Admin">Payroll Admin</option>
              <option value="Department Lead">Department Lead</option>
              <option value="Company Owner">Company Owner</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Send Invite
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
