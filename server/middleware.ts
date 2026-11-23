import type Database from 'better-sqlite3';
import type { NextFunction, Request, Response } from 'express';
import { computeEffectivePlanForCompany, mapSettingsRow } from './db.ts';
import { hashToken } from './security.ts';
import type {
  PlanFeatureKey,
  PlatformRole,
  UserRole,
} from '../src/types/staffpay.ts';

export interface AuthenticatedPrincipal {
  userId: string;
  sessionId: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
  companyId: string | null;
  companyRole: UserRole | null;
  employeeId: string | null;
  clientType: 'web' | 'android' | 'ios';
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedPrincipal;
    }
  }
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

export function createAuthMiddleware(getDbFn: () => Database.Database) {
  function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Provide a valid Bearer token.',
        },
      });
      return;
    }

    const db = getDbFn();
    const tokenHash = hashToken(token);
    const row = db
      .prepare(
        `SELECT
           s.id AS session_id,
           s.client_type,
           s.expires_at,
           s.revoked_at,
           u.id AS user_id,
           u.name,
           u.email,
           u.platform_role,
           u.company_id,
           u.company_role,
           u.employee_id,
           u.is_active
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`
      )
      .get(tokenHash) as Record<string, unknown> | undefined;

    if (!row || row.revoked_at || !row.is_active) {
      res.status(401).json({
        error: {
          code: 'INVALID_SESSION',
          message: 'Session is invalid or has been revoked.',
        },
      });
      return;
    }

    if (new Date(String(row.expires_at)).getTime() <= Date.now()) {
      res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token expired. Use refresh token to renew.',
        },
      });
      return;
    }

    req.auth = {
      userId: String(row.user_id),
      sessionId: String(row.session_id),
      name: String(row.name),
      email: String(row.email),
      platformRole: row.platform_role as PlatformRole,
      companyId: row.company_id ? String(row.company_id) : null,
      companyRole: row.company_role ? (row.company_role as UserRole) : null,
      employeeId: row.employee_id ? String(row.employee_id) : null,
      clientType: (row.client_type as AuthenticatedPrincipal['clientType']) || 'web',
    };
    next();
  }

  function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.auth) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
      return;
    }
    if (req.auth.platformRole !== 'super_admin') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN_SUPER_ADMIN_ONLY',
          message:
            'Super Admin privileges are required. Ordinary company accounts cannot access platform administration.',
        },
      });
      return;
    }
    next();
  }

  function requireCompanyAccess(req: Request, res: Response, next: NextFunction) {
    if (!req.auth) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
      return;
    }
    const targetCompanyId = String(req.params.companyId || '');
    if (!targetCompanyId) {
      res.status(400).json({
        error: { code: 'MISSING_COMPANY_ID', message: 'Company ID is required.' },
      });
      return;
    }

    // Strict company-level tenant isolation
    if (
      req.auth.platformRole !== 'super_admin' &&
      req.auth.companyId !== targetCompanyId
    ) {
      res.status(403).json({
        error: {
          code: 'COMPANY_ISOLATION_DENIED',
          message: 'You do not have access to this company workspace.',
        },
      });
      return;
    }
    next();
  }

  function requireCompanyRole(allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.auth) {
        res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
        });
        return;
      }
      if (req.auth.platformRole === 'super_admin') {
        next();
        return;
      }
      if (
        !req.auth.companyRole ||
        !allowedRoles.includes(req.auth.companyRole)
      ) {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_ROLE_PERMISSION',
            message: `Role "${req.auth.companyRole || 'None'}" does not have permission for this action.`,
          },
        });
        return;
      }
      next();
    };
  }

  function requirePlanFeature(featureKey: PlanFeatureKey) {
    return (req: Request, res: Response, next: NextFunction) => {
      const targetCompanyId = String(
        req.params.companyId || req.auth?.companyId || ''
      );
      if (!targetCompanyId) {
        res.status(400).json({
          error: { code: 'MISSING_COMPANY_ID', message: 'Company ID required.' },
        });
        return;
      }

      const db = getDbFn();
      const settingsRow = db
        .prepare('SELECT * FROM platform_settings WHERE id = 1')
        .get() as Record<string, unknown>;
      const settings = mapSettingsRow(settingsRow);
      if (!settings.enforceServerLimits) {
        next();
        return;
      }

      const companyRow = db
        .prepare('SELECT * FROM companies WHERE id = ?')
        .get(targetCompanyId) as Record<string, unknown> | undefined;

      if (!companyRow) {
        res.status(404).json({
          error: { code: 'COMPANY_NOT_FOUND', message: 'Company not found.' },
        });
        return;
      }

      const { plan } = computeEffectivePlanForCompany(db, companyRow);
      if (!plan.features[featureKey]) {
        res.status(403).json({
          error: {
            code: 'PLAN_FEATURE_LOCKED',
            feature: featureKey,
            currentPlan: plan.name,
            message:
              plan.freeLimits?.upgradePromptMessage ||
              `Your current ${plan.name} Plan does not include "${featureKey}". Upgrade your subscription plan to unlock it.`,
          },
        });
        return;
      }

      next();
    };
  }

  return {
    requireAuth,
    requireSuperAdmin,
    requireCompanyAccess,
    requireCompanyRole,
    requirePlanFeature,
  };
}
