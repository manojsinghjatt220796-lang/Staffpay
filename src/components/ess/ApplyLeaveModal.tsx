import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { EssLeaveRecord } from '../../context/EssContext';

interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitLeave: (input: {
    leaveType: EssLeaveRecord['leaveType'];
    fromDate: string;
    toDate: string;
    reason: string;
    documentName?: string;
  }) => void;
}

export function ApplyLeaveModal({
  isOpen,
  onClose,
  onSubmitLeave,
}: ApplyLeaveModalProps) {
  const [leaveType, setLeaveType] =
    useState<EssLeaveRecord['leaveType']>('Casual Leave');
  const [fromDate, setFromDate] = useState('2026-11-26');
  const [toDate, setToDate] = useState('2026-11-27');
  const [reason, setReason] = useState('');
  const [documentName, setDocumentName] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentName(file.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onSubmitLeave({
      leaveType,
      fromDate,
      toDate,
      reason: reason.trim(),
      documentName: documentName || undefined,
    });
    setReason('');
    setDocumentName('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ess-apply-leave-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3
              id="ess-apply-leave-title"
              className="text-base font-semibold text-slate-900"
            >
              Apply for Leave
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit a leave request for manager approval
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label
              htmlFor="ess-leave-type"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Leave Type
            </label>
            <select
              id="ess-leave-type"
              value={leaveType}
              onChange={(e) =>
                setLeaveType(e.target.value as EssLeaveRecord['leaveType'])
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="Casual Leave">Casual Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Earned Leave">Earned Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="ess-from-date"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                From Date
              </label>
              <input
                id="ess-from-date"
                type="date"
                required
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label
                htmlFor="ess-to-date"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                To Date
              </label>
              <input
                id="ess-to-date"
                type="date"
                required
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="ess-leave-reason"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Reason
            </label>
            <textarea
              id="ess-leave-reason"
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly explain the reason for your leave..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700 mb-1.5">
              Upload Document <span className="text-slate-400">(Optional)</span>
            </span>
            <input
              id="ess-leave-doc"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="ess-leave-doc"
              className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-blue-50/40 hover:border-blue-400 transition-colors text-xs text-slate-600 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="truncate">
                {documentName || 'Attach medical certificate or note (PDF, JPG, PNG)'}
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
