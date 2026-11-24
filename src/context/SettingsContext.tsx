import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useAuth } from './AuthContext';

export interface GlobalSettings {
  appName: string;
  appLogoUrl: string;
  primaryThemeColor: string;
  razorpayKeyId: string;
  razorpayKeySecretConfigured: boolean;
  updatedAt?: string;
}

export interface UpdateGlobalSettingsPayload {
  appName: string;
  appLogoUrl: string;
  primaryThemeColor: string;
  razorpayKeyId: string;
  razorpayKeySecret?: string;
  clearRazorpaySecret?: boolean;
}

interface SettingsContextValue {
  settings: GlobalSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (
    payload: UpdateGlobalSettingsPayload
  ) => Promise<GlobalSettings>;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const DEFAULT_SETTINGS: GlobalSettings = {
  appName: 'StaffPay',
  appLogoUrl: '',
  primaryThemeColor: '#2563eb',
  razorpayKeyId: '',
  razorpayKeySecretConfigured: false,
};

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined
);

function applyThemeToDocument(next: GlobalSettings) {
  if (typeof document === 'undefined') return;
  const color = HEX_COLOR_RE.test(next.primaryThemeColor)
    ? next.primaryThemeColor
    : '#2563eb';
  document.documentElement.style.setProperty('--brand-primary', color);
  if (next.appName.trim()) {
    document.title = `${next.appName.trim()} — Staff & Payroll Platform`;
  }
}

export function SettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { superAdminFetch } = useAuth();
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.settings) {
        const next: GlobalSettings = {
          appName: String(data.settings.appName || 'StaffPay'),
          appLogoUrl: String(data.settings.appLogoUrl || ''),
          primaryThemeColor: HEX_COLOR_RE.test(
            String(data.settings.primaryThemeColor || '')
          )
            ? String(data.settings.primaryThemeColor)
            : '#2563eb',
          razorpayKeyId: String(data.settings.razorpayKeyId || ''),
          razorpayKeySecretConfigured: Boolean(
            data.settings.razorpayKeySecretConfigured
          ),
          updatedAt: data.settings.updatedAt,
        };
        setSettings(next);
        applyThemeToDocument(next);
      }
    } catch {
      // Keep baseline defaults if backend is unreachable during isolated render
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    applyThemeToDocument(DEFAULT_SETTINGS);
    void refreshSettings();
  }, [refreshSettings]);

  const updateSettings = useCallback(
    async (payload: UpdateGlobalSettingsPayload): Promise<GlobalSettings> => {
      const res = await superAdminFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error?.message || 'Unable to save global settings.'
        );
      }
      const next: GlobalSettings = {
        appName: String(data.settings?.appName || payload.appName),
        appLogoUrl: String(data.settings?.appLogoUrl ?? payload.appLogoUrl),
        primaryThemeColor: HEX_COLOR_RE.test(
          String(data.settings?.primaryThemeColor || '')
        )
          ? String(data.settings.primaryThemeColor)
          : payload.primaryThemeColor,
        razorpayKeyId: String(
          data.settings?.razorpayKeyId ?? payload.razorpayKeyId
        ),
        razorpayKeySecretConfigured: Boolean(
          data.settings?.razorpayKeySecretConfigured
        ),
        updatedAt: data.settings?.updatedAt,
      };
      setSettings(next);
      applyThemeToDocument(next);
      return next;
    },
    [superAdminFetch]
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings,
        updateSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
