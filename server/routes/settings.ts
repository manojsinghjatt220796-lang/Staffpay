import { Router, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import { createAuthMiddleware } from '../middleware.ts';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function isSafeLogoUrl(url: string): boolean {
  if (!url) return true;
  if (url.startsWith('/')) return !url.startsWith('//');
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function mapPublicSettingsRow(row: Record<string, unknown>) {
  const color = String(row.primary_theme_color || '#2563eb');
  return {
    appName: String(row.app_name || 'StaffPay'),
    appLogoUrl: String(row.app_logo_url || ''),
    primaryThemeColor: HEX_COLOR_RE.test(color) ? color : '#2563eb',
    razorpayKeyId: String(row.razorpay_key_id || ''),
    // Crucial security rule: NEVER expose razorpay_key_secret to the frontend
    razorpayKeySecretConfigured: Boolean(
      String(row.razorpay_key_secret || '').trim()
    ),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export function createSettingsRouter(getDbFn: () => Database.Database) {
  const router = Router();
  const { requireAuth, requireSuperAdmin } = createAuthMiddleware(getDbFn);

  // GET /api/settings (public read, strictly omits razorpay_key_secret)
  router.get('/', (_req: Request, res: Response) => {
    const db = getDbFn();
    db.prepare('INSERT OR IGNORE INTO settings (id) VALUES (1)').run();
    const row = db
      .prepare('SELECT * FROM settings WHERE id = 1')
      .get() as Record<string, unknown>;
    res.json({ settings: mapPublicSettingsRow(row) });
  });

  // PUT /api/settings (Super Admin only)
  router.put(
    '/',
    requireAuth,
    requireSuperAdmin,
    (req: Request, res: Response) => {
      const db = getDbFn();
      db.prepare('INSERT OR IGNORE INTO settings (id) VALUES (1)').run();
      const existing = db
        .prepare('SELECT * FROM settings WHERE id = 1')
        .get() as Record<string, unknown>;

      const body = req.body || {};
      const appName =
        body.appName !== undefined
          ? String(body.appName).trim().slice(0, 80)
          : String(existing.app_name || 'StaffPay');
      const appLogoUrl =
        body.appLogoUrl !== undefined
          ? String(body.appLogoUrl).trim().slice(0, 500)
          : String(existing.app_logo_url || '');
      const primaryThemeColor =
        body.primaryThemeColor !== undefined
          ? String(body.primaryThemeColor).trim()
          : String(existing.primary_theme_color || '#2563eb');
      const razorpayKeyId =
        body.razorpayKeyId !== undefined
          ? String(body.razorpayKeyId).trim().slice(0, 120)
          : String(existing.razorpay_key_id || '');

      let razorpayKeySecret = String(existing.razorpay_key_secret || '');
      if (body.clearRazorpaySecret === true) {
        razorpayKeySecret = '';
      } else if (
        typeof body.razorpayKeySecret === 'string' &&
        body.razorpayKeySecret.trim().length > 0
      ) {
        razorpayKeySecret = body.razorpayKeySecret.trim();
      }

      if (!appName) {
        res.status(400).json({
          error: {
            code: 'INVALID_APP_NAME',
            message: 'App Name is required.',
          },
        });
        return;
      }

      if (!HEX_COLOR_RE.test(primaryThemeColor)) {
        res.status(400).json({
          error: {
            code: 'INVALID_COLOR',
            message:
              'Primary Theme Color must be a valid 6-digit hex code (e.g. #2563eb).',
          },
        });
        return;
      }

      if (!isSafeLogoUrl(appLogoUrl)) {
        res.status(400).json({
          error: {
            code: 'INVALID_LOGO_URL',
            message: 'Logo URL must be an http(s) URL or relative / path.',
          },
        });
        return;
      }

      db.prepare(
        `UPDATE settings
         SET app_name = ?, app_logo_url = ?, primary_theme_color = ?,
             razorpay_key_id = ?, razorpay_key_secret = ?, updated_at = datetime('now')
         WHERE id = 1`
      ).run(
        appName,
        appLogoUrl,
        primaryThemeColor,
        razorpayKeyId,
        razorpayKeySecret
      );

      // Keep platform_settings branding in sync cleanly
      db.prepare(
        `UPDATE platform_settings
         SET platform_name = ?, logo_url = ?, updated_at = datetime('now')
         WHERE id = 1`
      ).run(appName, appLogoUrl);

      const updated = db
        .prepare('SELECT * FROM settings WHERE id = 1')
        .get() as Record<string, unknown>;
      res.json({ settings: mapPublicSettingsRow(updated) });
    }
  );

  return router;
}
