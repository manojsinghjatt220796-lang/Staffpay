import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type Database from 'better-sqlite3';
import { serverConfig } from './config.ts';
import { createAuthRouter } from './routes/auth.ts';
import { createCompanyApiRouter } from './routes/companyApi.ts';
import { createSuperAdminRouter } from './routes/superAdmin.ts';
import { createUploadsRouter } from './routes/uploads.ts';

export function createApiApp(getDbFn: () => Database.Database) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // AI Studio preview runs inside an iframe and Vite serves dev assets
      frameguard: false,
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin, server-to-server, and native mobile app requests (no Origin header)
        if (!origin) {
          callback(null, true);
          return;
        }
        if (
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin === serverConfig.appUrl ||
          serverConfig.corsOrigins.includes(origin)
        ) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/v1/health', (_req, res) => {
    try {
      const db = getDbFn();
      db.prepare('SELECT 1').get();
      res.json({
        status: 'ok',
        apiVersion: 'v1',
        environment: serverConfig.nodeEnv,
        checks: {
          database: 'ok',
          storage: 'ok',
        },
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({
        status: 'degraded',
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Service temporarily unavailable.',
        },
      });
    }
  });

  app.use('/api/v1/auth', createAuthRouter(getDbFn));
  app.use('/api/v1/super-admin', createSuperAdminRouter(getDbFn));
  app.use('/api/v1/uploads', createUploadsRouter(getDbFn));
  app.use('/api/v1', createCompanyApiRouter(getDbFn));

  // Unmatched API route -> clean JSON 404 (never fall through to HTML SPA fallback)
  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: {
        code: 'ENDPOINT_NOT_FOUND',
        message: 'Requested API endpoint does not exist.',
      },
    });
  });

  // Sanitized global error handler (never exposes stack traces or SQL errors)
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (process.env.NODE_ENV !== 'test') {
        console.error('[StaffPay API Error]', err);
      }
      if (!res.headersSent) {
        res.status(500).json({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected server error occurred. Please try again.',
          },
        });
      }
    }
  );

  return app;
}
