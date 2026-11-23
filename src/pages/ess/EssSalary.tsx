import React, { useState } from 'react';
import { CheckCircle2, Download, FileText } from 'lucide-react';
import { EssPayslip, useEss } from '../../context/EssContext';

export function EssSalary() {
  const { payslips, profile } = useEss();
  const [selectedSlip, setSelectedSlip] = useState<EssPayslip>(payslips[0]);
  const [downloadAlert, setDownloadAlert] = useState<string | null>(null);

  const totalEarnings =
    selectedSlip.basicSalary +
    selectedSlip.allowances +
    selectedSlip.overtimePay;
  const totalDeductions =
    selectedSlip.absentDeduction +
    selectedSlip.pfDeduction +
    selectedSlip.taxDeduction;

  const handleDownloadPdf = () => {
    setDownloadAlert(
      `Payslip PDF for ${selectedSlip.month} (${profile.employeeId}) prepared for download.`
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
          My Salary &amp; Payslips
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Review monthly salary breakdowns, deductions, and download PDF slips
        </p>
      </div>

      {downloadAlert && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-900 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{downloadAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setDownloadAlert(null)}
            className="text-xs font-medium text-blue-800 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Monthly Payslips List */}
        <section className="lg:col-span-5 bg-white border border-gray-200 rounded-xl divide-y divide-gray-200 self-start overflow-hidden">
          <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-slate-500">
            Monthly Payslips
          </div>
          {payslips.map((slip) => {
            const active = slip.id === selectedSlip.id;
            return (
              <button
                key={slip.id}
                type="button"
                onClick={() => {
                  setSelectedSlip(slip);
                  setDownloadAlert(null);
                }}
                className={`w-full px-5 py-4 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                  active ? 'bg-blue-50/70' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-slate-600'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {slip.month}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                      {slip.presentDays}/{slip.workingDays} days paid
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono tabular-nums font-semibold text-slate-900">
                    ₹{slip.netPayable.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-slate-400">Net Pay</div>
                </div>
              </button>
            );
          })}
        </section>

        {/* Detailed Breakdown */}
        <section className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Payslip — {selectedSlip.month}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {profile.name} <span aria-hidden="true">·</span>{' '}
                <span className="font-mono">{profile.employeeId}</span>{' '}
                <span aria-hidden="true">·</span> Pay Date {selectedSlip.payDate}
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>

          {/* Earnings */}
          <div className="space-y-2.5 text-sm">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Earnings
            </h3>
            <div className="flex justify-between text-slate-700">
              <span>Basic Salary</span>
              <span className="font-mono tabular-nums">
                ₹{selectedSlip.basicSalary.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Allowances (HRA &amp; Conveyance)</span>
              <span className="font-mono tabular-nums">
                ₹{selectedSlip.allowances.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Overtime Pay</span>
              <span className="font-mono tabular-nums text-emerald-700">
                +₹{selectedSlip.overtimePay.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100 font-medium text-slate-900">
              <span>Total Earnings</span>
              <span className="font-mono tabular-nums">
                ₹{totalEarnings.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Deductions */}
          <div className="space-y-2.5 text-sm pt-2 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Deductions
            </h3>
            <div className="flex justify-between text-slate-700">
              <span>Absent Days Cut</span>
              <span className="font-mono tabular-nums text-rose-600">
                -₹{selectedSlip.absentDeduction.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>PF (Provident Fund)</span>
              <span className="font-mono tabular-nums text-rose-600">
                -₹{selectedSlip.pfDeduction.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Tax (Professional Tax / TDS)</span>
              <span className="font-mono tabular-nums text-rose-600">
                -₹{selectedSlip.taxDeduction.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100 font-medium text-slate-900">
              <span>Total Deductions</span>
              <span className="font-mono tabular-nums text-rose-600">
                -₹{totalDeductions.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Net Payable */}
          <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Net Payable Amount</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Direct bank transfer
              </div>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              ₹{selectedSlip.netPayable.toLocaleString('en-IN')}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
