import crypto from 'crypto';
import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import type Database from 'better-sqlite3';
import { ensureStorageDirectories, serverConfig } from '../config.ts';
import { createAuthMiddleware } from '../middleware.ts';
import { resolveConfinedPath, sanitizeFilename } from '../security.ts';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function createUploadsRouter(getDbFn: () => Database.Database) {
  const router = Router();
  const { requireAuth } = createAuthMiddleware(getDbFn);

  ensureStorageDirectories();

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureStorageDirectories();
      cb(null, serverConfig.uploadDir);
    },
    filename: (_req, file, cb) => {
      const safeOriginal = sanitizeFilename(file.originalname);
      const uniquePrefix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
      cb(null, `${uniquePrefix}-${safeOriginal}`);
    },
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
      files: 1,
    },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        cb(
          new Error(
            'Unsupported file format. Only JPG, PNG, WEBP, and PDF files up to 5 MB are allowed.'
          )
        );
        return;
      }
      cb(null, true);
    },
  });

  router.post(
    '/',
    requireAuth,
    (req, res, next) => {
      upload.single('file')(req, res, (err: unknown) => {
        if (err) {
          const message =
            err instanceof Error ? err.message : 'File upload failed.';
          res.status(400).json({
            error: { code: 'UPLOAD_REJECTED', message },
          });
          return;
        }
        next();
      });
    },
    (req, res) => {
      if (!req.file) {
        res.status(400).json({
          error: { code: 'NO_FILE', message: 'No file provided.' },
        });
        return;
      }

      const db = getDbFn();
      const targetCompanyId =
        req.auth!.platformRole === 'super_admin' && req.body?.companyId
          ? String(req.body.companyId)
          : req.auth!.companyId;

      if (!targetCompanyId) {
        fs.unlink(req.file.path, () => {});
        res.status(400).json({
          error: {
            code: 'COMPANY_REQUIRED',
            message: 'Company context is required for uploads.',
          },
        });
        return;
      }

      const fileId = `file-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const purpose = String(req.body?.purpose || 'receipt').slice(0, 40);

      db.prepare(
        `INSERT INTO uploaded_files (
          id, company_id, uploaded_by_user_id, original_name, stored_name, mime_type, size_bytes, purpose
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        fileId,
        targetCompanyId,
        req.auth!.userId,
        sanitizeFilename(req.file.originalname),
        req.file.filename,
        req.file.mimetype,
        req.file.size,
        purpose
      );

      res.status(201).json({
        file: {
          id: fileId,
          originalName: sanitizeFilename(req.file.originalname),
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          purpose,
          url: `/api/v1/uploads/${fileId}`,
        },
      });
    }
  );

  router.get('/:fileId', requireAuth, (req, res) => {
    const db = getDbFn();
    const fileRow = db
      .prepare('SELECT * FROM uploaded_files WHERE id = ?')
      .get(String(req.params.fileId)) as Record<string, unknown> | undefined;

    if (!fileRow) {
      res.status(404).json({
        error: { code: 'FILE_NOT_FOUND', message: 'File not found.' },
      });
      return;
    }

    if (
      req.auth!.platformRole !== 'super_admin' &&
      String(fileRow.company_id) !== req.auth!.companyId
    ) {
      res.status(403).json({
        error: {
          code: 'COMPANY_ISOLATION_DENIED',
          message: 'Access denied to this uploaded file.',
        },
      });
      return;
    }

    try {
      const diskPath = resolveConfinedPath(
        serverConfig.uploadDir,
        String(fileRow.stored_name)
      );
      if (!fs.existsSync(diskPath)) {
        res.status(404).json({
          error: {
            code: 'FILE_MISSING_ON_DISK',
            message: 'Uploaded file is not available in storage.',
          },
        });
        return;
      }

      res.setHeader('Content-Type', String(fileRow.mime_type));
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${sanitizeFilename(String(fileRow.original_name))}"`
      );
      res.sendFile(diskPath);
    } catch {
      res.status(400).json({
        error: { code: 'INVALID_FILE_PATH', message: 'Invalid file reference.' },
      });
    }
  });

  return router;
}
