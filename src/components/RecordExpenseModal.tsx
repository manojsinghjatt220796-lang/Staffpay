import React, { useEffect, useRef, useState } from 'react';
import { FileText, Trash2, Upload, X } from 'lucide-react';
import { Employee, ExpenseItem } from '../types/staffpay';

export type RecordExpensePayload = Omit<ExpenseItem, 'id' | 'status'> & {
  status: 'Approved' | 'Pending';
};

interface RecordExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onSave: (expense: RecordExpensePayload) => void;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export function RecordExpenseModal({
  isOpen,
  onClose,
  employees,
  onSave,
}: RecordExpenseModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseItem['category']>(
    'Employee Reimbursement'
  );
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('2026-11-23');
  const [paymentMethod, setPaymentMethod] = useState<
    NonNullable<ExpenseItem['paymentMethod']>
  >('Bank Transfer');
  const [status, setStatus] = useState<'Approved' | 'Pending'>('Pending');
  const [paidBy, setPaidBy] = useState('Company Account');
  const [vendor, setVendor] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setReceiptError('');
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setReceiptError('File exceeds 5 MB limit. Please select a smaller file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setReceiptName(file.name);
  };

  const clearReceipt = () => {
    setReceiptName('');
    setReceiptError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetForm = () => {
    setTitle('');
    setCategory('Employee Reimbursement');
    setAmount('');
    setDate('2026-11-23');
    setPaymentMethod('Bank Transfer');
    setStatus('Pending');
    setPaidBy('Company Account');
    setVendor('');
    setEmployeeId('');
    setNotes('');
    clearReceipt();
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!title.trim() || !numericAmount || numericAmount <= 0) {
      setFormError('Please provide an expense title and an amount above ₹0.');
      return;
    }

    const selectedEmp = employees.find((emp) => emp.id === employeeId);

    onSave({
      title: title.trim(),
      category,
      amount: Math.round(numericAmount),
      date,
      paymentMethod,
      status,
      paidBy: paidBy.trim() || 'Company Account',
      vendor: vendor.trim() || undefined,
      employeeId: selectedEmp?.id,
      submittedBy: selectedEmp?.name || paidBy.trim() || 'Priya Sharma',
      notes: notes.trim() || undefined,
      receiptName: receiptName || undefined,
    });

    resetForm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-expense-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4 shrink-0">
          <h2
            id="record-expense-title"
            className="text-lg font-semibold text-slate-900 tracking-tight"
          >
            Record Expense
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 -mr-2 text-slate-400 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {formError && (
              <div className="px-3.5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                {formError}
              </div>
            )}

            {/* Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="exp-title"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Expense Title
                </label>
                <input
                  id="exp-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setFormError('');
                  }}
                  placeholder="e.g. Field Travel Reimbursement"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="exp-category"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Category
                </label>
                <select
                  id="exp-category"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as ExpenseItem['category'])
                  }
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="Employee Reimbursement">
                    Employee Reimbursement
                  </option>
                  <option value="Travel & Fuel">Travel & Fuel</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Software & Tools">Software & Tools</option>
                  <option value="Client Meals">Client Meals</option>
                  <option value="Logistics">Logistics</option>
                </select>
              </div>
            </div>

            {/* Amount & Expense Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="exp-amount"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Amount
                </label>
                <div className="flex items-center rounded-lg border border-gray-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600">
                  <span className="px-3 py-2 text-sm font-semibold text-slate-500 bg-gray-50 border-r border-gray-200 select-none">
                    ₹
                  </span>
                  <input
                    id="exp-amount"
                    type="number"
                    min={1}
                    required
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setFormError('');
                    }}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="exp-date"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Expense Date
                </label>
                <input
                  id="exp-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            {/* Payment Method & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="exp-payment-method"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Payment Method
                </label>
                <select
                  id="exp-payment-method"
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(
                      e.target.value as NonNullable<ExpenseItem['paymentMethod']>
                    )
                  }
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Corporate Card">Corporate Card</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="exp-status"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Status
                </label>
                <select
                  id="exp-status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as 'Approved' | 'Pending')
                  }
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                </select>
              </div>
            </div>

            {/* Paid By & Vendor / Merchant */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="exp-paid-by"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Paid By
                </label>
                <input
                  id="exp-paid-by"
                  type="text"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  placeholder="e.g. Company Account / Priya Sharma"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="exp-vendor"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Vendor / Merchant
                </label>
                <input
                  id="exp-vendor"
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. IndianOil / Amazon Business"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            {/* Optional Employee Dropdown */}
            <div>
              <label
                htmlFor="exp-employee"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Employee <span className="text-slate-400">(Optional)</span>
              </label>
              <select
                id="exp-employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="">None (General Company Expense)</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Description / Notes */}
            <div>
              <label
                htmlFor="exp-notes"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Description / Notes
              </label>
              <textarea
                id="exp-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add invoice reference, GST notes, or reimbursement context..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            {/* Receipts / Bills Upload */}
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">
                Receipts / Bills
              </span>
              <input
                ref={fileInputRef}
                id="expense-receipt-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {!receiptName ? (
                <label
                  htmlFor="expense-receipt-upload"
                  className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 bg-gray-50/70 hover:bg-blue-50/30 transition-colors cursor-pointer text-center"
                >
                  <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                    <Upload className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    Attach Receipt / Bill (JPG, PNG, WEBP, PDF - max 5 MB)
                  </span>
                </label>
              ) : (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-blue-50/60 border border-blue-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 truncate">
                      {receiptName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearReceipt}
                    aria-label="Remove attached receipt"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {receiptError && (
                <p className="mt-1.5 text-xs text-rose-600">{receiptError}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-gray-200/70 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
