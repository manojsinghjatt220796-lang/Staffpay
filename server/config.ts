import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const cwd = process.cwd();

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export const serverConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 3000),
  appUrl: normalizeOrigin(process.env.APP_URL || 'http://localhost:3000'),
  dataDir: path.resolve(process.env.DATA_DIR || path.join(cwd, 'storage')),
  get dbPath() {
    return path.resolve(
      process.env.DATABASE_PATH || path.join(this.dataDir, 'staffpay.db')
    );
  },
  get uploadDir() {
    return path.resolve(
      process.env.UPLOAD_DIR || path.join(this.dataDir, 'uploads')
    );
  },
  get backupDir() {
    return path.resolve(
      process.env.BACKUP_DIR || path.join(this.dataDir, 'backups')
    );
  },
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean),
  accessTokenTtlMinutes: Math.max(
    5,
    Number(process.env.ACCESS_TOKEN_TTL_MINUTES || 60)
  ),
  refreshTokenTtlDays: Math.max(
    1,
    Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30)
  ),
  superAdminEmail: (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase(),
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || '',
  razorpayKeyId: (process.env.RAZORPAY_KEY_ID || '').trim(),
  razorpayKeySecret: (process.env.RAZORPAY_KEY_SECRET || '').trim(),
};

export function ensureStorageDirectories() {
  const dirs = new Set([
    serverConfig.dataDir,
    path.dirname(serverConfig.dbPath),
    serverConfig.uploadDir,
    serverConfig.backupDir,
  ]);
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
