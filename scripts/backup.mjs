import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'storage'));
const dbPath = path.resolve(process.env.DATABASE_PATH || path.join(dataDir, 'staffpay.db'));
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(dataDir, 'uploads'));
const backupRoot = path.resolve(process.env.BACKUP_DIR || path.join(dataDir, 'backups'));

async function runBackup() {
  if (!fs.existsSync(dbPath)) {
    console.error(`Database file not found at ${dbPath}. Nothing to back up.`);
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotDir = path.join(backupRoot, `backup-${stamp}`);
  fs.mkdirSync(snapshotDir, { recursive: true });

  const targetDb = path.join(snapshotDir, 'staffpay.db');
  const db = new Database(dbPath, { readonly: true });
  await db.backup(targetDb);
  db.close();

  const targetUploads = path.join(snapshotDir, 'uploads');
  if (fs.existsSync(uploadDir)) {
    fs.cpSync(uploadDir, targetUploads, { recursive: true });
  }

  console.log(`Backup created successfully at: ${snapshotDir}`);
}

runBackup().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
