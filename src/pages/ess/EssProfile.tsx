import React, { useRef, useState } from 'react';
import { Camera, CheckCircle2, Edit3, Mail, MapPin, Phone, User } from 'lucide-react';
import { useEss } from '../../context/EssContext';

export function EssProfile() {
  const { profile, updateProfile } = useEss();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [mobile, setMobile] = useState(profile.mobile);
  const [address, setAddress] = useState(profile.address);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateProfile({ avatarUrl: reader.result });
        setSavedNotice(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.trim()) return;
    updateProfile({
      mobile: mobile.trim(),
      address: address.trim(),
    });
    setEditing(false);
    setSavedNotice(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            My Profile
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View your employment details and keep your contact information up to
            date
          </p>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={() => {
              setMobile(profile.mobile);
              setAddress(profile.address);
              setEditing(true);
              setSavedNotice(false);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-blue-600" />
            <span>Edit Contact Details</span>
          </button>
        )}
      </div>

      {savedNotice && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile updated successfully.</span>
        </div>
      )}

      {/* Identity & Photo Card */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-7 h-7 text-blue-600" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {profile.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-mono">{profile.employeeId}</span>{' '}
              <span aria-hidden="true">·</span> {profile.designation}{' '}
              <span aria-hidden="true">·</span> {profile.department}
            </p>
          </div>
        </div>

        <div>
          <input
            ref={fileInputRef}
            id="ess-avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <label
            htmlFor="ess-avatar-upload"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4 text-blue-600" />
            <span>Upload Photo</span>
          </label>
        </div>
      </section>

      {/* Personal & Work Details */}
      <form
        onSubmit={handleSaveDetails}
        className="bg-white border border-gray-200 rounded-xl p-6 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
          <div>
            <span className="block text-xs font-medium text-slate-500">
              Full Name
            </span>
            <div className="mt-1 font-medium text-slate-900">{profile.name}</div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500">
              Employee ID
            </span>
            <div className="mt-1 font-mono tabular-nums text-slate-900">
              {profile.employeeId}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500">
              Department
            </span>
            <div className="mt-1 text-slate-900">{profile.department}</div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500">
              Designation
            </span>
            <div className="mt-1 text-slate-900">{profile.designation}</div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500 inline-flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              Email Address
            </span>
            <div className="mt-1 font-mono text-slate-800">{profile.email}</div>
          </div>

          <div>
            <label
              htmlFor="ess-profile-mobile"
              className="block text-xs font-medium text-slate-500 inline-flex items-center gap-1"
            >
              <Phone className="w-3.5 h-3.5" />
              Mobile Number
            </label>
            {editing ? (
              <input
                id="ess-profile-mobile"
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            ) : (
              <div className="mt-1 font-mono tabular-nums text-slate-900">
                {profile.mobile}
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <label
            htmlFor="ess-profile-address"
            className="block text-xs font-medium text-slate-500 inline-flex items-center gap-1"
          >
            <MapPin className="w-3.5 h-3.5" />
            Residential Address
          </label>
          {editing ? (
            <textarea
              id="ess-profile-address"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1.5 w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            />
          ) : (
            <p className="mt-1 text-sm text-slate-800">{profile.address}</p>
          )}
        </div>

        {editing && (
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
