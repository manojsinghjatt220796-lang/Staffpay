import React, { createContext, useCallback, useContext, useState } from 'react';
import { UserRole } from '../types/staffpay';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatarUrl: string;
}

export interface SuperAdminAccount {
  id: string;
  name: string;
  email: string;
  platformRole: 'super_admin';
}

export interface SuperAdminSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: SuperAdminAccount;
}

interface AuthContextValue {
  user: AuthUser;
  isLocked: boolean;
  setUserRole: (role: UserRole) => void;
  lockSession: () => void;
  unlockSession: () => void;
  permissions: {
    canRunPayroll: boolean;
    canApproveLeaves: boolean;
    canApproveExpenses: boolean;
    canManageStaff: boolean;
    canEditSettings: boolean;
  };
  superAdminSession: SuperAdminSession | null;
  loginSuperAdmin: (email: string, password: string) => Promise<void>;
  bootstrapSuperAdmin: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>;
  logoutSuperAdmin: () => Promise<void>;
  superAdminFetch: (path: string, init?: RequestInit) => Promise<Response>;
}

const ROLE_PERMISSIONS: Record<UserRole, AuthContextValue['permissions']> = {
  'Company Owner': {
    canRunPayroll: true,
    canApproveLeaves: true,
    canApproveExpenses: true,
    canManageStaff: true,
    canEditSettings: true,
  },
  'HR Manager': {
    canRunPayroll: false,
    canApproveLeaves: true,
    canApproveExpenses: false,
    canManageStaff: true,
    canEditSettings: false,
  },
  'Payroll Admin': {
    canRunPayroll: true,
    canApproveLeaves: false,
    canApproveExpenses: true,
    canManageStaff: false,
    canEditSettings: false,
  },
  'Department Lead': {
    canRunPayroll: false,
    canApproveLeaves: true,
    canApproveExpenses: true,
    canManageStaff: false,
    canEditSettings: false,
  },
  Employee: {
    canRunPayroll: false,
    canApproveLeaves: false,
    canApproveExpenses: false,
    canManageStaff: false,
    canEditSettings: false,
  },
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>('Company Owner');
  const [isLocked, setIsLocked] = useState(false);

  // Super Admin session is stored strictly in memory (never localStorage/sessionStorage)
  // and strictly isolated from ordinary Company Owner / HR / Employee accounts.
  const [superAdminSession, setSuperAdminSession] =
    useState<SuperAdminSession | null>(null);

  const user: AuthUser =
    role === 'Employee'
      ? {
          id: 'emp-raju',
          name: 'Raju Kumar',
          role,
          email: 'raju.kumar@bharatpay.in',
          avatarUrl: '',
        }
      : {
          id: 'usr-priya',
          name: 'Priya Sharma',
          role,
          email: 'priya@bharatpay.in',
          avatarUrl: '/src/assets/images/avatar_priya_sharma_1795417845937.jpg',
        };

  const loginSuperAdmin = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        clientType: 'web',
        deviceName: 'StaffPay Super Admin Console',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Sign-in failed.');
    }
    if (data?.user?.platformRole !== 'super_admin') {
      throw new Error(
        'Access denied: ordinary company accounts cannot enter the Super Admin Console.'
      );
    }
    setSuperAdminSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      user: {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        platformRole: 'super_admin',
      },
    });
  }, []);

  const bootstrapSuperAdmin = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch('/api/v1/auth/bootstrap-super-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error?.message || 'Unable to claim Super Admin account.'
        );
      }
      setSuperAdminSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        user: {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          platformRole: 'super_admin',
        },
      });
    },
    []
  );

  const logoutSuperAdmin = useCallback(async () => {
    if (superAdminSession?.accessToken) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${superAdminSession.accessToken}`,
          },
        });
      } catch {
        // Ignore network errors during sign-out cleanup
      }
    }
    setSuperAdminSession(null);
  }, [superAdminSession]);

  const superAdminFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      if (!superAdminSession) {
        throw new Error('Super Admin session is not active.');
      }

      const headers = new Headers(init.headers || {});
      headers.set('Authorization', `Bearer ${superAdminSession.accessToken}`);
      if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      let res = await fetch(path, { ...init, headers });

      if (res.status === 401 && superAdminSession.refreshToken) {
        const refreshRes = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken: superAdminSession.refreshToken,
          }),
        });
        if (refreshRes.ok) {
          const refreshed = await refreshRes.json();
          setSuperAdminSession((prev) =>
            prev
              ? {
                  ...prev,
                  accessToken: refreshed.accessToken,
                  refreshToken: refreshed.refreshToken,
                  expiresAt: refreshed.expiresAt,
                }
              : null
          );
          headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
          res = await fetch(path, { ...init, headers });
        } else {
          setSuperAdminSession(null);
        }
      }

      return res;
    },
    [superAdminSession]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLocked,
        setUserRole: setRole,
        lockSession: () => setIsLocked(true),
        unlockSession: () => setIsLocked(false),
        permissions: ROLE_PERMISSIONS[role],
        superAdminSession,
        loginSuperAdmin,
        bootstrapSuperAdmin,
        logoutSuperAdmin,
        superAdminFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
