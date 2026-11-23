import crypto from 'crypto';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';

const SCRYPT_PREFIX = 'scrypt';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${SCRYPT_PREFIX}$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.startsWith(`${SCRYPT_PREFIX}$`)) {
    return false;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 3) return false;
  const [, salt, originalHex] = parts;
  if (!salt || !originalHex) return false;

  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const original = Buffer.from(originalHex, 'hex');
    if (derived.length !== original.length) return false;
    return crypto.timingSafeEqual(derived, original);
  } catch {
    return false;
  }
}

export function generateOpaqueToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function sanitizeFilename(rawName: string): string {
  const base = path.basename(rawName || 'file');
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'upload.bin';
}

export function resolveConfinedPath(baseDir: string, targetSegment: string): string {
  const normalizedBase = path.resolve(baseDir);
  const resolved = path.resolve(normalizedBase, targetSegment);
  if (
    resolved !== normalizedBase &&
    !resolved.startsWith(normalizedBase + path.sep)
  ) {
    throw new Error('Invalid file path traversal attempt');
  }
  return resolved;
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!orderId || !paymentId || !signature || !secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function createRateLimiter(maxRequests: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = hits.get(key);

    if (!record || record.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (record.count >= maxRequests) {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait a moment and try again.',
        },
      });
      return;
    }

    record.count += 1;
    next();
  };
}
