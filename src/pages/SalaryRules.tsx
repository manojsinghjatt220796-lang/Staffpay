import React, { useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { SalaryRulesConfig } from '../types/staffpay';

interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}

function RuleToggle({ enabled, onToggle, label }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={`Toggle ${label}`}
      className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
        enabled ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function evaluateLateArrivalPenalty(
  lateMinutes: number,
  rules: SalaryRulesConfig
): {
  isHalfDayOverride: boolean;
  lateFine: number;
  halfDayDeduction: number;
} {
  if (!rules.lateArrivalRules.enabled || lateMinutes <= 0) {
    return { isHalfDayOverride: false, lateFine: 0, halfDayDeduction: 0 };
  }

  const {
    lateFine30Min,
    lateFine1Hour,
    lateFine2Hour,
    halfDayThresholdMins,
  } = rules.lateArrivalRules;

  // Late fine ONLY applies if late arrival is within the Half-Day threshold.
  // If late time exceeds the threshold, Half-Day deduction overrides the Late Fine.
  if (lateMinutes > halfDayThresholdMins) {
    return {
      isHalfDayOverride: true,
      lateFine: 0,
      halfDayDeduction: rules.halfDayDeduction.enabled
        ? rules.halfDayDeduction.amountPerHalfDay
        : 0,
    };
  }

  let lateFine = 0;
  if (lateMinutes >= 120) {
    lateFine = lateFine2Hour;
  } else if (lateMinutes >= 60) {
    lateFine = lateFine1Hour;
  } else if (lateMinutes >= 30) {
    lateFine = lateFine30Min;
  }

  return {
    isHalfDayOverride: false,
    lateFine,
    halfDayDeduction: 0,
  };
}

export function SalaryRules() {
  const { salaryRules, updateSalaryRules } = useAppData();

  const [draft, setDraft] = useState<SalaryRulesConfig>(salaryRules);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saved Salary Rules:', draft);
    updateSalaryRules(draft);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header + Save Button at Top Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Salary Rules & Policies
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure attendance deductions, overtime multipliers, bonuses, and
            recurring loan recoveries
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Rules saved</span>
            </span>
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Salary Rules</span>
          </button>
        </div>
      </div>

      {/* Section 1: Base Pay & Attendance Deductions */}
      <section className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-200">
        <div className="px-6 py-4 bg-gray-50/70">
          <h3 className="text-sm font-semibold text-slate-900">
            Base Salary & Attendance Deductions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Rules automatically applied when running monthly payroll cycles
          </p>
        </div>

        {/* Monthly Base Salary */}
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-md">
            <div className="text-sm font-semibold text-slate-900">
              Monthly Base Salary
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Default base salary template and working-day divisor for new hires
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">₹</span>
              <input
                type="number"
                min={0}
                disabled={!draft.monthlyBaseSalary.enabled}
                value={draft.monthlyBaseSalary.defaultAmount}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    monthlyBaseSalary: {
                      ...draft.monthlyBaseSalary,
                      defaultAmount: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-32 px-3 py-2 text-sm font-mono tabular-nums bg-white border border-gray-300 rounded-lg text-slate-900 disabled:bg-gray-100 disabled:text-slate-400"
              />
            </div>
            <select
              disabled={!draft.monthlyBaseSalary.enabled}
              value={draft.monthlyBaseSalary.basis}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  monthlyBaseSalary: {
                    ...draft.monthlyBaseSalary,
                    basis: e.target.value as SalaryRulesConfig['monthlyBaseSalary']['basis'],
                  },
                })
              }
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 disabled:bg-gray-100"
            >
              <option value="30 Fixed Days">30 Fixed Days</option>
              <option value="26 Working Days">26 Working Days</option>
              <option value="Calendar Days">Calendar Days</option>
            </select>
            <RuleToggle
              label="Monthly Base Salary"
              enabled={draft.monthlyBaseSalary.enabled}
              onToggle={() =>
                setDraft({
                  ...draft,
                  monthlyBaseSalary: {
                    ...draft.monthlyBaseSalary,
                    enabled: !draft.monthlyBaseSalary.enabled,
                  },
                })
              }
            />
          </div>
        </div>

        {/* Absent Day Deduction */}
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-md">
            <div className="text-sm font-semibold text-slate-900">
              Absent Day Deduction
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Flat deduction per marked Absent (A) day
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">₹ / day</span>
              <input
                type="number"
                min={0}
                disabled={!draft.absentDayDeduction.enabled}
                value={draft.absentDayDeduction.amountPerDay}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    absentDayDeduction: {
                      ...draft.absentDayDeduction,
                      amountPerDay: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-32 px-3 py-2 text-sm font-mono tabular-nums bg-white border border-gray-300 rounded-lg text-slate-900 disabled:bg-gray-100 disabled:text-slate-400"
              />
            </div>
            <RuleToggle
              label="Absent Day Deduction"
              enabled={draft.absentDayDeduction.enabled}
              onToggle={() =>
                setDraft({
                  ...draft,
                  absentDayDeduction: {
                    ...draft.absentDayDeduction,
                    enabled: !draft.absentDayDeduction.enabled,
                  },
                })
              }
            />
          </div>
        </div>

        {/* Half Day Deduction */}
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-md">
            <div className="text-sm font-semibold text-slate-900">
              Half Day Deduction
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Deduction applied for each Half Day (HD) attendance record
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">₹ / half day</span>
              <input
                type="number"
                min={0}
                disabled={!draft.halfDayDeduction.enabled}
                value={draft.halfDayDeduction.amountPerHalfDay}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    halfDayDeduction: {
                      ...draft.halfDayDeduction,
                      amountPerHalfDay: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-32 px-3 py-2 text-sm font-mono tabular-nums bg-white border border-gray-300 rounded-lg text-slate-900 disabled:bg-gray-100 disabled:text-slate-400"
              />
            </div>
            <RuleToggle
              label="Half Day Deduction"
              enabled={draft.halfDayDeduction.enabled}
              onToggle={() =>
                setDraft({
                  ...draft,
                  halfDayDeduction: {
                    ...draft.halfDayDeduction,
                    enabled: !draft.halfDayDeduction.enabled,
                  },
                })
              }
            />
          </div>
        </div>

        {/* Unpaid Leave (LWP) Deduction */}
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-md">
            <div className="text-sm font-semibold text-slate-900">
              Unpaid Leave (LWP) Deduction
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculation formula for Unpaid Leave (UL) days
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              disabled={!draft.unpaidLeaveDeduction.enabled}
              value={draft.unpaidLeaveDeduction.method}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  unpaidLeaveDeduction: {
                    ...draft.unpaidLeaveDeduction,
                    method: e.target.value as SalaryRulesConfig['unpaidLeaveDeduction']['method'],
                  },
                })
              }
              className="px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 disabled:bg-gray-100"
            >
              <option value="Pro-rata Daily Salary">
                Pro-rata Daily Salary
              </option>
              <option value="Base / 26 Days">Base / 26 Days</option>
              <option value="Fixed Daily Rate">Fixed Daily Rate</option>
            </select>
            <RuleToggle
              label="Unpaid Leave Deduction"
              enabled={draft.unpaidLeaveDeduction.enabled}
              onToggle={() =>
                setDraft({
                  ...draft,
                  unpaidLeaveDeduction: {
                    ...draft.unpaidLeaveDeduction,
                    enabled: !draft.unpaidLeaveDeduction.enabled,
                  },
                })
              }
            />
          </div>
        </div>
      </section>

      {/* Section 2: Overtime & Holiday Pay */}
      <section className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-200">
        <div className="px-6 py-4 bg-gray-50/70">
          <h3 className="text-sm font-semibold text-slate-900">
            Overtime Payment & Sunday / Holiday Rates
          </h3>
        </div>

        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-md">
            <div className="text-sm font-semibold text-slate-900">
              Overtime Payment
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hourly compensation for extra shift hours logged in Daily Register
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">₹ / hr</span>
              <input
                type="number"
                min={0}
                disabled={!draft.overtimePayment.enabled}
                value={draft.overtimePayment.ratePerHour}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    overtimePayment: {
                      ...draft.overtimePayment,
                      ratePerHour: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-28 px-3 py-2 text-sm font-mono tabular-nums bg-white border border-gray-300 rounded-lg text-slate-900 disabled:bg-gray-100"
              />
            </div>
            <RuleToggle
              label="Overtime Payment"
              enabled={draft.overtimePayment.enabled}
              onToggle={() =>
                setDraft({
                  ...draft,
                  overtimePayment: {
                    ...draft.overtimePayment,
                    enabled: !draft.overtimePayment.enabled,
                  },
                })
              }
            />
          </div>
        </div>

        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-md">
            <div className="text-sm font-semibold text-slate-900">
              Sunday & Holiday Overtime Rates
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Multiplier for Sunday work and flat hourly rate on public holidays
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              disabled={!draft.sundayHolidayOvertime.enabled}
              value={draft.sundayHolidayOvertime.sundayMultiplier}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  sundayHolidayOvertime: {
                    ...draft.sundayHolidayOvertime,
                    sundayMultiplier: e.target.value as SalaryRulesConfig['sundayHolidayOvertime']['sundayMultiplier'],
                  },
                })
              }
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 disabled:bg-gray-100"
            >
              <option value="1.5x Hourly Rate">Sunday: 1.5x Hourly</option>
              <option value="2.0x Hourly Rate">Sunday: 2.0x Hourly</option>
            </select>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Holiday ₹/hr</span>
              <input
                type="number"
                min={0}
                disabled={!draft.sundayHolidayOvertime.enabled}
                value={draft.sundayHolidayOvertime.holidayRatePerHour}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    sundayHolidayOvertime: {
                      ...draft.sundayHolidayOvertime,
                      holidayRatePerHour: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-24 px-3 py-2 text-sm font-mono tabular-nums bg-white border border-gray-300 rounded-lg text-slate-900 disabled:bg-gray-100"
              />
            </div>
            <RuleToggle
              label="Sunday & Holiday Overtime"
              enabled={draft.sundayHolidayOvertime.enabled}
              onToggle={() =>
                setDraft({
                  ...draft,
                  sundayHolidayOvertime: {
                    ...draft.sundayHolidayOvertime,
                    enabled: !draft.sundayHolidayOvertime.enabled,
                  },
                })
              }
            />
          </div>
        </div>
      </section>

      {/* Section 3: Late Arrival Fines & Half-Day Rules */}
      <section className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-200">
        <div className="px-6 py-4 bg-gray-50/70 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Late Arrival Fines & Half-Day Rules
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tiered late arrival penalties and automatic Half-Day cutoff
              threshold
            </p>
          </div>
          <RuleToggle
            label="Late Arrival Fines & Half-Day Rules"
            enabled={draft.lateArrivalRules.enabled}
            onToggle={() =>
              setDraft({
                ...draft,
                lateArrivalRules: {
                  ...draft.lateArrivalRules,
                  enabled: !draft.lateArrivalRules.enabled,
                },
              })
            }
          />
        </div>

        {draft.lateArrivalRules.enabled ? (
          <>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label
                  htmlFor="late-fine-30m"
                  className="block text-sm font-semibold text-slate-900 mb-1"
                >
                  Late Fine (30 Mins)
                </label>
                <p className="text-xs text-slate-500 mb-2.5">
                  Applied for 30–59 mins late
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">₹</span>
                  <input
                    id="late-fine-30m"
                    type="number"
                    min={0}
                    value={draft.lateArrivalRules.lateFine30Min}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        lateArrivalRules: {
                          ...draft.lateArrivalRules,
                          lateFine30Min: Math.max(0, Number(e.target.value) || 0),
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="late-fine-1h"
                  className="block text-sm font-semibold text-slate-900 mb-1"
                >
                  Late Fine (1 Hour)
                </label>
                <p className="text-xs text-slate-500 mb-2.5">
                  Applied for 60–119 mins late
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">₹</span>
                  <input
                    id="late-fine-1h"
                    type="number"
                    min={0}
                    value={draft.lateArrivalRules.lateFine1Hour}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        lateArrivalRules: {
                          ...draft.lateArrivalRules,
                          lateFine1Hour: Math.max(0, Number(e.target.value) || 0),
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="late-fine-2h"
                  className="block text-sm font-semibold text-slate-900 mb-1"
                >
                  Late Fine (2 Hours)
                </label>
                <p className="text-xs text-slate-500 mb-2.5">
                  Applied for 120+ mins within threshold
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">₹</span>
                  <input
                    id="late-fine-2h"
                    type="number"
                    min={0}
                    value={draft.lateArrivalRules.lateFine2Hour}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        lateArrivalRules: {
                          ...draft.lateArrivalRules,
                          lateFine2Hour: Math.max(0, Number(e.target.value) || 0),
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Half-Day Trigger Threshold
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <span>If late by more than</span>
                    <select
                      id="half-day-threshold"
                      aria-label="Half-Day Trigger Threshold"
                      value={draft.lateArrivalRules.halfDayThresholdMins}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          lateArrivalRules: {
                            ...draft.lateArrivalRules,
                            halfDayThresholdMins: Number(e.target.value),
                          },
                        })
                      }
                      className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                    >
                      <option value={90}>1.5 Hours (90 mins)</option>
                      <option value={120}>2 Hours (120 mins)</option>
                      <option value={150}>2.5 Hours (150 mins)</option>
                      <option value={180}>3 Hours (180 mins)</option>
                      <option value={240}>4 Hours (240 mins)</option>
                    </select>
                    <span>mark as Half-Day.</span>
                  </div>
                </div>
              </div>

              <div className="px-3.5 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Note: If an employee&apos;s late arrival exceeds the Half-Day
                threshold, the &apos;Half Day Deduction&apos; rule (from above)
                will be applied instead of the Late Fine.
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-4 text-xs text-slate-500">
            Late arrival fines and automatic half-day late thresholds are
            currently disabled. Enable the toggle above to configure slab fines.
          </div>
        )}
      </section>

      {/* Section 4: Bonuses, Incentives, Advance & Loan Defaults */}
      <section className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-200">
        <div className="px-6 py-4 bg-gray-50/70">
          <h3 className="text-sm font-semibold text-slate-900">
            Monthly Defaults: Bonus, Incentives, Advances & Loans
          </h3>
        </div>

        {(
          [
            [
              'defaultMonthlyBonus',
              'Default Monthly Bonus',
              'Fixed monthly attendance or retention bonus',
            ],
            [
              'defaultMonthlyIncentives',
              'Default Monthly Incentives',
              'Standard monthly performance allowance',
            ],
            [
              'defaultAdvanceDeduction',
              'Default Advance Deduction',
              'Recurring monthly recovery against salary advance',
            ],
            [
              'defaultLoanDeduction',
              'Default Loan Deduction',
              'Monthly EMI deduction for staff welfare loans',
            ],
          ] as const
        ).map(([key, title, desc]) => {
          const item = draft[key];
          return (
            <div
              key={key}
              className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="max-w-md">
                <div className="text-sm font-semibold text-slate-900">
                  {title}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">₹ / mo</span>
                  <input
                    type="number"
                    min={0}
                    disabled={!item.enabled}
                    value={item.amount}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [key]: {
                          ...item,
                          amount: Number(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-32 px-3 py-2 text-sm font-mono tabular-nums bg-white border border-gray-300 rounded-lg text-slate-900 disabled:bg-gray-100 disabled:text-slate-400"
                  />
                </div>
                <RuleToggle
                  label={title}
                  enabled={item.enabled}
                  onToggle={() =>
                    setDraft({
                      ...draft,
                      [key]: {
                        ...item,
                        enabled: !item.enabled,
                      },
                    })
                  }
                />
              </div>
            </div>
          );
        })}
      </section>
    </form>
  );
}
