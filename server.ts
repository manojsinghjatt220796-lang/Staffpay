import fs from 'fs';
import path from 'path';
import express from 'express';
import { ensureStorageDirectories, serverConfig } from './server/config.ts';
import { closeDb, getDb } from './server/db.ts';
import { createApiApp } from './server/app.ts';

async function startServer() {
  ensureStorageDirectories();
  // Initialize SQLite database & run idempotent migrations on boot
  getDb();

  const app = createApiApp(getDb);
  const distDir = path.resolve(process.cwd(), 'dist');

  if (!serverConfig.isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    if (fs.existsSync(distDir)) {
      app.use(
        express.static(distDir, {
          maxAge: '1h',
          setHeaders(res, filePath) {
            if (filePath.endsWith('index.html')) {
              res.setHeader('Cache-Control', 'no-store');
            }
          },
        })
      );
      app.get('*', (_req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.sendFile(path.join(distDir, 'index.html'));
      });
    } else {
      console.warn(
        '[StaffPay] Warning: dist/ directory missing in production mode. Run npm run build first.'
      );
    }
  }

  const httpServer = app.listen(serverConfig.port, '0.0.0.0', () => {
    console.log(
      `StaffPay server running on http://0.0.0.0:${serverConfig.port} (${serverConfig.nodeEnv})`
    );
  });

  const shutdown = (signal: string) => {
    console.log(`[StaffPay] Received ${signal}, shutting down gracefully...`);
    httpServer.close(() => {
      closeDb();
      process.exit(0);
    });
    setTimeout(() => {
      closeDb();
      process.exit(0);
    }, 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('Failed to start StaffPay server:', err);
  process.exit(1);
});
