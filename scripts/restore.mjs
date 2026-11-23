import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const snapshotArg = process.argv[2];
if (!snapshotArg) {
  console.error('Usage: node scripts/restore.mjs <path-to-backup-folder>');
  process.exit(1);
}

const snapshotDir = path.resolve(snapshotArg);
const sourceDb = path.join(snapshotDir, 'staffpay.db');
const sourceUploads = path.join(snapshotDir, 'uploads');

if (!fs.existsSync(sourceDb)) {
  console.error(`Invalid backup folder: ${sourceDb} does not exist.`);
  process.exit(1);
}

const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'storage'));
const dbPath = path.resolve(process.env.DATABASE_PATH || path.join(dataDir, 'staffpay.db'));
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(dataDir, 'uploads'));

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

// Remove WAL/SHM sidecars if present before restoring clean snapshot
for (const suffix of ['-wal', '-shm']) {
  const sidecar = `${dbPath}${suffix}`;
  if (fs.existsSync(sidecar)) {
    fs.unlinkSync(sidecar);
  }
}

fs.copyFileSync(sourceDb, dbPath);
if (fs.existsSync(sourceUploads)) {
  fs.cpSync(sourceUploads, uploadDir, { recursive: true, force: true });
}

console.log(`Database and uploads restored successfully from: ${snapshotDir}`);
