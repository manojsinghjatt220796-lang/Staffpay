import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, FileText, Plus } from 'lucide-react';
import { RecordExpenseModal } from '../components/RecordExpenseModal';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';

export function Expenses() {
  const { expenses, activeEmployees, addExpense, updateExpenseStatus } =
    useAppData();
  const { permissions } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Pending' | 'Approved' | 'Reimbursed'
  >('All');

  const totalSpend = useMemo(
    () => expenses.reduce((sum, item) => sum + item.amount, 0),
    [expenses]
  );

  const pendingSpend = useMemo(
    () =>
      expenses
        .filter((e) => e.status === 'Pending')
        .reduce((sum, item) => sum + item.amount, 0),
    [expenses]
  );

  const filteredExpenses = useMemo(() => {
    if (statusFilter === 'All') return expenses;
    return expenses.filter((e) => e.status === statusFilter);
  }, [expenses, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Expense Management
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Total logged:{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              ₹{totalSpend.toLocaleString('en-IN')}
            </span>{' '}
            <span aria-hidden="true">·</span> Pending approval:{' '}
            <span className="font-mono tabular-nums font-semibold text-amber-700">
              ₹{pendingSpend.toLocaleString('en-IN')}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand hover:bg-brand/90 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="inline-flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-lg">
        {(['All', 'Pending', 'Approved', 'Reimbursed'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === tab
                ? 'bg-brand text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Expense Ledger Table */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            Expense Claims & Reimbursements
          </h3>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {filteredExpenses.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold text-slate-500 bg-gray-50">
                <th className="py-3 px-5">Expense</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5">Payment</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5 text-right">Amount</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 px-5 text-center text-slate-500"
                  >
                    No expenses recorded for this filter.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/70">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.receiptName && (
                          <span
                            title={`Receipt: ${item.receiptName}`}
                            className="inline-flex items-center gap-1 text-xs font-normal text-blue-600"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.submittedBy}
                        {item.vendor && (
                          <>
                            {' '}
                            <span aria-hidden="true">·</span> {item.vendor}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 whitespace-nowrap">
                      {item.category}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-slate-600 whitespace-nowrap">
                      {item.paymentMethod || 'Bank Transfer'}
                    </td>
                    <td className="py-3.5 px-5 font-mono tabular-nums text-slate-500 text-xs whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      {item.status === 'Pending' && (
                        <span className="inline-flex items-center gap-1.5 text-amber-700 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending</span>
                        </span>
                      )}
                      {item.status === 'Approved' && (
                        <span className="inline-flex items-center gap-1.5 text-blue-700 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved</span>
                        </span>
                      )}
                      {item.status === 'Reimbursed' && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Reimbursed</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      {item.status === 'Pending' &&
                      permissions.canApproveExpenses ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateExpenseStatus(item.id, 'Approved')
                          }
                          className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                      ) : item.status === 'Approved' &&
                        permissions.canApproveExpenses ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateExpenseStatus(item.id, 'Reimbursed')
                          }
                          className="px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {item.status === 'Reimbursed'
                            ? 'Settled'
                            : 'View only'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <RecordExpenseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        employees={activeEmployees}
        onSave={addExpense}
      />
    </div>
  );
}
