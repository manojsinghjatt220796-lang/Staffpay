import { Router } from 'express';
import type Database from 'better-sqlite3';
import { serverConfig } from '../config.ts';
import { computeEffectivePlanForCompany, mapSettingsRow } from '../db.ts';
import { createAuthMiddleware } from '../middleware.ts';
import {
  createRateLimiter,
  generateOpaqueToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from '../security.ts';

export function createAuthRouter(getDbFn: () => Database.Database) {
  const router = Router();
  const { requireAuth } = createAuthMiddleware(getDbFn);
  const authLimiter = createRateLimiter(30, 15 * 60 * 1000);

  function issueSession(
    db: Database.Database,
    userId: string,
    clientType: 'web' | 'android' | 'ios' = 'web',
    deviceName = 'Browser'
  ) {
    const accessToken = generateOpaqueToken(32);
    const refreshToken = generateOpaqueToken(40);
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const expiresAt = new Date(
      Date.now() + serverConfig.accessTokenTtlMinutes * 60_000
    ).toISOString();
    const refreshExpiresAt = new Date(
      Date.now() + serverConfig.refreshTokenTtlDays * 86400_000
    ).toISOString();

    db.prepare(
      `INSERT INTO sessions (
        id, user_id, token_hash, refresh_token_hash, client_type, device_name, expires_at, refresh_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      sessionId,
      userId,
      hashToken(accessToken),
      hashToken(refreshToken),
      clientType,
      deviceName.slice(0, 80),
      expiresAt,
      refreshExpiresAt
    );

    return { sessionId, accessToken, refreshToken, expiresAt, refreshExpiresAt };
  }

  function sanitizeUser(userRow: Record<string, unknown>) {
    return {
      id: String(userRow.id),
      name: String(userRow.name),
      email: String(userRow.email),
      platformRole: String(userRow.platform_role),
      companyId: userRow.company_id ? String(userRow.company_id) : null,
      companyRole: userRow.company_role ? String(userRow.company_role) : null,
      employeeId: userRow.employee_id ? String(userRow.employee_id) : null,
      avatarUrl: String(userRow.avatar_url || ''),
    };
  }

  router.get('/bootstrap-status', (_req, res) => {
    const db = getDbFn();
    const superCount = (
      db
        .prepare(
          `SELECT COUNT(*) AS cnt FROM users WHERE platform_role = 'super_admin' AND is_active = 1`
        )
        .get() as { cnt: number }
    ).cnt;
    const settingsRow = db
      .prepare('SELECT * FROM platform_settings WHERE id = 1')
      .get() as Record<string, unknown>;
    const settings = mapSettingsRow(settingsRow);

    res.json({
      superAdminExists: superCount > 0,
      envConfigured: Boolean(
        serverConfig.superAdminEmail && serverConfig.superAdminPassword
      ),
      allowSelfRegistration: settings.allowSelfRegistration,
    });
  });

  router.post('/bootstrap-super-admin', authLimiter, (req, res) => {
    const db = getDbFn();
    const existingCount = (
      db
        .prepare(
          `SELECT COUNT(*) AS cnt FROM users WHERE platform_role = 'super_admin'`
        )
        .get() as { cnt: number }
    ).cnt;

    if (existingCount > 0 || (serverConfig.superAdminEmail && serverConfig.superAdminPassword)) {
      res.status(409).json({
        error: {
          code: 'SUPER_ADMIN_ALREADY_CLAIMED',
          message:
            'A platform Super Admin account is already configured. Please sign in.',
        },
      });
      return;
    }

    const name = String(req.body?.name || '').trim() || 'Platform Super Admin';
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !email.includes('@')) {
      res.status(400).json({
        error: { code: 'INVALID_EMAIL', message: 'Valid email is required.' },
      });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters long.',
        },
      });
      return;
    }

    const userId = `usr-super-${Date.now()}`;
    try {
      db.prepare(
        `INSERT INTO users (id, name, email, password_hash, platform_role, is_active)
         VALUES (?, ?, ?, ?, 'super_admin', 1)`
      ).run(userId, name, email, hashPassword(password));
    } catch {
      res.status(409).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'That email address is already registered.',
        },
      });
      return;
    }

    const userRow = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(userId) as Record<string, unknown>;
    const tokens = issueSession(db, userId, 'web', 'Super Admin Web Console');

    res.status(201).json({
      ...tokens,
      user: sanitizeUser(userRow),
    });
  });

  router.post('/login', authLimiter, (req, res) => {
    const db = getDbFn();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const rawClient = String(req.body?.clientType || 'web');
    const clientType: 'web' | 'android' | 'ios' =
      rawClient === 'android' || rawClient === 'ios' ? rawClient : 'web';
    const deviceName = String(req.body?.deviceName || 'Browser');

    if (!email || !password) {
      res.status(400).json({
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Email and password are required.',
        },
      });
      return;
    }

    const userRow = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as Record<string, unknown> | undefined;

    if (
      !userRow ||
      !userRow.is_active ||
      !verifyPassword(password, String(userRow.password_hash))
    ) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
      return;
    }

    const tokens = issueSession(
      db,
      String(userRow.id),
      clientType,
      deviceName
    );
    const user = sanitizeUser(userRow);

    let companySummary = null;
    if (user.companyId) {
      const compRow = db
        .prepare('SELECT * FROM companies WHERE id = ?')
        .get(user.companyId) as Record<string, unknown> | undefined;
      if (compRow) {
        const { plan, effectiveStatus } = computeEffectivePlanForCompany(
          db,
          compRow
        );
        companySummary = {
          id: String(compRow.id),
          name: String(compRow.name),
          subscriptionStatus: effectiveStatus,
          planId: plan.id,
          planName: plan.name,
        };
      }
    }

    res.json({
      ...tokens,
      user,
      company: companySummary,
    });
  });

  router.post('/refresh', authLimiter, (req, res) => {
    const db = getDbFn();
    const refreshToken = String(req.body?.refreshToken || '').trim();
    if (!refreshToken) {
      res.status(400).json({
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required.',
        },
      });
      return;
    }

    const refreshHash = hashToken(refreshToken);
    const row = db
      .prepare(
        `SELECT s.*, u.is_active
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.refresh_token_hash = ?`
      )
      .get(refreshHash) as Record<string, unknown> | undefined;

    if (!row || row.revoked_at || !row.is_active) {
      res.status(401).json({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is invalid or revoked.',
        },
      });
      return;
    }

    if (new Date(String(row.refresh_expires_at)).getTime() <= Date.now()) {
      res.status(401).json({
        error: {
          code: 'REFRESH_TOKEN_EXPIRED',
          message: 'Refresh token expired. Please sign in again.',
        },
      });
      return;
    }

    // Rotate tokens atomically
    const newAccess = generateOpaqueToken(32);
    const newRefresh = generateOpaqueToken(40);
    const expiresAt = new Date(
      Date.now() + serverConfig.accessTokenTtlMinutes * 60_000
    ).toISOString();
    const refreshExpiresAt = new Date(
      Date.now() + serverConfig.refreshTokenTtlDays * 86400_000
    ).toISOString();

    db.prepare(
      `UPDATE sessions
       SET token_hash = ?, refresh_token_hash = ?, expires_at = ?, refresh_expires_at = ?
       WHERE id = ?`
    ).run(
      hashToken(newAccess),
      hashToken(newRefresh),
      expiresAt,
      refreshExpiresAt,
      String(row.id)
    );

    res.json({
      accessToken: newAccess,
      refreshToken: newRefresh,
      expiresAt,
      refreshExpiresAt,
    });
  });

  router.post('/logout', requireAuth, (req, res) => {
    const db = getDbFn();
    db.prepare(
      `UPDATE sessions SET revoked_at = datetime('now') WHERE id = ?`
    ).run(req.auth!.sessionId);
    res.json({ success: true });
  });

  router.get('/me', requireAuth, (req, res) => {
    const db = getDbFn();
    const userRow = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(req.auth!.userId) as Record<string, unknown> | undefined;

    if (!userRow) {
      res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User account not found.' },
      });
      return;
    }

    res.json({ user: sanitizeUser(userRow) });
  });

  router.get('/sessions', requireAuth, (req, res) => {
    const db = getDbFn();
    const rows = db
      .prepare(
        `SELECT id, client_type, device_name, expires_at, created_at
         FROM sessions
         WHERE user_id = ? AND revoked_at IS NULL
         ORDER BY created_at DESC`
      )
      .all(req.auth!.userId) as Record<string, unknown>[];

    res.json({
      sessions: rows.map((r) => ({
        id: String(r.id),
        clientType: String(r.client_type),
        deviceName: String(r.device_name),
        expiresAt: String(r.expires_at),
        createdAt: String(r.created_at),
        current: String(r.id) === req.auth!.sessionId,
      })),
    });
  });

  router.delete('/sessions/:sessionId', requireAuth, (req, res) => {
    const db = getDbFn();
    const result = db
      .prepare(
        `UPDATE sessions SET revoked_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      )
      .run(String(req.params.sessionId), req.auth!.userId);

    if (result.changes === 0) {
      res.status(404).json({
        error: { code: 'SESSION_NOT_FOUND', message: 'Session not found.' },
      });
      return;
    }
    res.json({ success: true });
  });

  router.post('/register-company', authLimiter, (req, res) => {
    const db = getDbFn();
    const settingsRow = db
      .prepare('SELECT * FROM platform_settings WHERE id = 1')
      .get() as Record<string, unknown>;
    const settings = mapSettingsRow(settingsRow);

    if (!settings.allowSelfRegistration) {
      res.status(403).json({
        error: {
          code: 'REGISTRATION_DISABLED',
          message:
            'New company self-registration is currently disabled by the platform administrator.',
        },
      });
      return;
    }

    const ownerName = String(req.body?.ownerName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const companyName = String(req.body?.companyName || '').trim();
    const country = String(req.body?.country || 'IN').trim() || 'IN';
    const currency = String(req.body?.currency || settings.defaultCurrency).trim() || 'INR';
    const timezone = String(req.body?.timezone || 'Asia/Kolkata').trim() || 'Asia/Kolkata';
    const rawSlug = String(req.body?.slug || companyName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = `${rawSlug || 'workspace'}-${Math.random().toString(36).slice(2, 6)}`;

    if (!ownerName || !email || password.length < 8 || !companyName) {
      res.status(400).json({
        error: {
          code: 'INVALID_REGISTRATION_DATA',
          message:
            'Owner name, valid email, password (min 8 chars), and company name are required.',
        },
      });
      return;
    }

    const existingEmail = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email);
    if (existingEmail) {
      res.status(409).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists.',
        },
      });
      return;
    }

    const defaultPlanRow = db
      .prepare(`SELECT * FROM subscription_plans WHERE id = ? AND status = 'active'`)
      .get(settings.defaultPlanId) as Record<string, unknown> | undefined;
    const planId = defaultPlanRow ? String(defaultPlanRow.id) : 'free';
    const isFree = defaultPlanRow ? Boolean(defaultPlanRow.is_free) : true;
    const startTrial = settings.trialEnabled && !isFree && settings.defaultTrialDays > 0;
    const trialEndsAt = startTrial
      ? new Date(Date.now() + settings.defaultTrialDays * 86400_000).toISOString()
      : null;

    const companyId = `comp-${Date.now()}`;
    const userId = `usr-${Date.now()}`;
    const shortCode = companyName.slice(0, 2).toUpperCase() || 'SP';

    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO companies (
          id, name, short_code, country, currency, timezone, slug, city,
          owner_user_id, plan_id, billing_cycle, subscription_status, trial_ends_at, payment_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'monthly', ?, ?, 0)`
      ).run(
        companyId,
        companyName,
        shortCode,
        country,
        currency,
        timezone,
        slug,
        country,
        userId,
        planId,
        startTrial ? 'trial' : isFree ? 'free' : 'trial',
        trialEndsAt
      );

      db.prepare(
        `INSERT INTO users (
          id, name, email, password_hash, platform_role, company_id, company_role, is_active
        ) VALUES (?, ?, ?, ?, 'tenant_user', ?, 'Company Owner', 1)`
      ).run(userId, ownerName, email, hashPassword(password), companyId);
    });
    tx();

    const userRow = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(userId) as Record<string, unknown>;
    const tokens = issueSession(db, userId, 'web', 'Company Registration');

    res.status(201).json({
      ...tokens,
      user: sanitizeUser(userRow),
      company: {
        id: companyId,
        name: companyName,
        planId,
        subscriptionStatus: startTrial ? 'trial' : 'free',
        trialEndsAt,
      },
    });
  });

  return router;
}
