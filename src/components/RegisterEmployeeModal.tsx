import React, { useEffect, useRef, useState } from 'react';
import { Camera, Trash2, User, X } from 'lucide-react';
import { Employee, EmployeeStatus } from '../types/staffpay';

interface RegisterEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Omit<Employee, 'id' | 'code'>) => void;
}

const DEPARTMENTS = [
  'Operations',
  'Field Ops',
  'Finance',
  'Human Resources',
  'Sales',
  'Support',
  'Hardware',
];

const DESIGNATIONS: Record<string, string[]> = {
  Operations: ['Operations Manager', 'Vendor Onboarding', 'Logistics Coordinator'],
  'Field Ops': ['Field Ops Lead', 'Field Executive', 'Route Supervisor'],
  Finance: ['Payroll Accountant', 'Settlement Analyst', 'Finance Controller'],
  'Human Resources': ['HR & Compliance Lead', 'Talent Specialist', 'HR Generalist'],
  Sales: ['Account Executive', 'Business Development Lead', 'Territory Manager'],
  Support: ['Merchant Support Lead', 'Shift Supervisor', 'Support Specialist'],
  Hardware: ['Terminal Technician', 'Hardware Engineer', 'QA Inspector'],
};

interface FormErrors {
  fullName?: string;
  mobileNumber?: string;
  email?: string;
  monthlySalary?: string;
}

export function RegisterEmployeeModal({
  isOpen,
  onClose,
  onSave,
}: RegisterEmployeeModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [designation, setDesignation] = useState('Operations Manager');
  const [joiningDate, setJoiningDate] = useState('2026-11-23');
  const [employmentType, setEmploymentType] = useState<'Full-time' | 'Part-time'>('Full-time');
  const [status, setStatus] = useState<EmployeeStatus>('Active');
  const [monthlySalary, setMonthlySalary] = useState('40000');
  const [payFrequency, setPayFrequency] = useState<'Monthly' | 'Bi-weekly' | 'Weekly'>('Monthly');
  const [workLocation, setWorkLocation] = useState('Mumbai HQ');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDepartmentChange = (nextDept: string) => {
    setDepartment(nextDept);
    const options = DESIGNATIONS[nextDept] || ['Associate'];
    setDesignation(options[0]);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!fullName.trim()) {
      nextErrors.fullName = 'Full Name is required.';
    }
    const digitsOnly = mobileNumber.replace(/\D/g, '');
    if (!mobileNumber.trim()) {
      nextErrors.mobileNumber = 'Mobile Number is required.';
    } else if (digitsOnly.length < 10) {
      nextErrors.mobileNumber = 'Enter a valid mobile number (at least 10 digits).';
    }
    if (
      emailAddress.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress.trim())
    ) {
      nextErrors.email = 'Enter a valid email address.';
    }
    const salaryNum = Number(monthlySalary);
    if (!monthlySalary || Number.isNaN(salaryNum) || salaryNum <= 0) {
      nextErrors.monthlySalary = 'Monthly Salary must be greater than 0.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    setAvatarPreview('');
    setFullName('');
    setMobileNumber('');
    setEmailAddress('');
    setDepartment('Operations');
    setDesignation('Operations Manager');
    setJoiningDate('2026-11-23');
    setEmploymentType('Full-time');
    setStatus('Active');
    setMonthlySalary('40000');
    setPayFrequency('Monthly');
    setWorkLocation('Mumbai HQ');
    setResidentialAddress('');
    setEmergencyContact('');
    setErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const salaryNum = Math.round(Number(monthlySalary));
    onSave({
      name: fullName.trim(),
      phone: mobileNumber.trim(),
      email:
        emailAddress.trim() ||
        `${fullName.trim().toLowerCase().replace(/\s+/g, '.')}@bharatpay.in`,
      department,
      role: designation,
      joinedDate: joiningDate,
      employmentType,
      status,
      shifts: [],
      baseSalary: salaryNum,
      allowances: Math.round(salaryNum * 0.2),
      payFrequency,
      workLocation: workLocation.trim() || 'Mumbai HQ',
      residentialAddress: residentialAddress.trim(),
      emergencyContact: emergencyContact.trim(),
      avatarUrl: avatarPreview || undefined,
    });

    resetForm();
    onClose();
  };

  const designationOptions = DESIGNATIONS[department] || ['Associate'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-employee-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2
              id="register-employee-title"
              className="text-lg font-semibold text-slate-900 tracking-tight"
            >
              Register New Employee
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete employee profile, compensation, and address details
            </p>
          </div>
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
          noValidate
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Profile Picture Upload */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="w-16 h-16 rounded-full bg-white border border-gray-300 flex items-center justify-center overflow-hidden shrink-0">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Employee preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-7 h-7 text-slate-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  Profile Picture
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  PNG or JPG headshot for employee directory and attendance sheet
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={fileInputRef}
                  id="employee-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <label
                  htmlFor="employee-photo-upload"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  <span>Upload Photo</span>
                </label>

                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    aria-label="Remove uploaded photo"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Section 1: Identity & Contact */}
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-gray-200 w-full">
                1. Identity & Contact
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="reg-full-name"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="reg-full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) {
                        setErrors((prev) => ({ ...prev, fullName: undefined }));
                      }
                    }}
                    placeholder="e.g. Siddharth Rao"
                    className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      errors.fullName
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-gray-300 focus:border-blue-600'
                    }`}
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="reg-mobile"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Mobile Number <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="reg-mobile"
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value);
                      if (errors.mobileNumber) {
                        setErrors((prev) => ({
                          ...prev,
                          mobileNumber: undefined,
                        }));
                      }
                    }}
                    placeholder="+91 98200 12345"
                    className={`w-full px-3.5 py-2 text-sm font-mono bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      errors.mobileNumber
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-gray-300 focus:border-blue-600'
                    }`}
                  />
                  {errors.mobileNumber && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.mobileNumber}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Email Address <span className="text-slate-400">(Optional)</span>
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={emailAddress}
                  onChange={(e) => {
                    setEmailAddress(e.target.value);
                    if (errors.email) {
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="name@bharatpay.in"
                  className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    errors.email
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-gray-300 focus:border-blue-600'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-600">{errors.email}</p>
                )}
              </div>
            </fieldset>

            {/* Section 2: Department & Designation */}
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-gray-200 w-full">
                2. Department & Designation
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="reg-department"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Department
                  </label>
                  <select
                    id="reg-department"
                    value={department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reg-designation"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Designation
                  </label>
                  <select
                    id="reg-designation"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {designationOptions.map((roleOpt) => (
                      <option key={roleOpt} value={roleOpt}>
                        {roleOpt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>

            {/* Section 3: Employment & Compensation */}
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-gray-200 w-full">
                3. Employment & Compensation
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="reg-joining-date"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Joining Date
                  </label>
                  <input
                    id="reg-joining-date"
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-employment-type"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Employment Type
                  </label>
                  <select
                    id="reg-employment-type"
                    value={employmentType}
                    onChange={(e) =>
                      setEmploymentType(
                        e.target.value as 'Full-time' | 'Part-time'
                      )
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reg-status"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Status
                  </label>
                  <select
                    id="reg-status"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as EmployeeStatus)
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="reg-salary"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Monthly Salary (₹)
                  </label>
                  <input
                    id="reg-salary"
                    type="number"
                    min={1000}
                    step={500}
                    value={monthlySalary}
                    onChange={(e) => {
                      setMonthlySalary(e.target.value);
                      if (errors.monthlySalary) {
                        setErrors((prev) => ({
                          ...prev,
                          monthlySalary: undefined,
                        }));
                      }
                    }}
                    className={`w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      errors.monthlySalary
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-gray-300 focus:border-blue-600'
                    }`}
                  />
                  {errors.monthlySalary && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.monthlySalary}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="reg-pay-freq"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Pay Frequency
                  </label>
                  <select
                    id="reg-pay-freq"
                    value={payFrequency}
                    onChange={(e) =>
                      setPayFrequency(
                        e.target.value as 'Monthly' | 'Bi-weekly' | 'Weekly'
                      )
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Bi-weekly">Bi-weekly</option>
                    <option value="Weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reg-location"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Work Location
                  </label>
                  <input
                    id="reg-location"
                    type="text"
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                    placeholder="e.g. Mumbai HQ"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </fieldset>

            {/* Section 4: Address & Emergency Contact */}
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-gray-200 w-full">
                4. Address & Emergency Contact
              </legend>

              <div>
                <label
                  htmlFor="reg-address"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Residential Address
                </label>
                <textarea
                  id="reg-address"
                  rows={3}
                  value={residentialAddress}
                  onChange={(e) => setResidentialAddress(e.target.value)}
                  placeholder="House/Flat No., Street, Landmark, City, PIN Code"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-emergency"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Emergency Contact Name & Number{' '}
                  <span className="text-slate-400">(Optional)</span>
                </label>
                <input
                  id="reg-emergency"
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="e.g. Rajesh Rao · +91 98201 44556"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
            </fieldset>
          </div>

          {/* Sticky Footer */}
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
              Save Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
