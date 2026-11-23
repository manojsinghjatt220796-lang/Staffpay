# StaffPay Custom-Domain Production Deployment Guide (Hostinger VPS / Persistent Node.js)

This guide covers deploying **StaffPay** on a **Hostinger KVM VPS** (or any persistent Ubuntu/Debian Node.js server) with your own custom domain, SSL/HTTPS, persistent SQLite database + file uploads, automated backups, and mobile-ready `/api/v1` endpoints before building your Android app.

---

## 1. Hostinger VPS Compatibility & Hosting Requirements

| Component | Requirement / Compatibility |
| :--- | :--- |
| **Hosting Type** | **Hostinger KVM VPS** (KVM 1 / KVM 2 or higher) with persistent writable disk. *(Static-only/PHP shared hosting is NOT compatible because StaffPay runs a stateful Express API and native `better-sqlite3` database.)* |
| **OS** | Ubuntu 22.04 LTS or Ubuntu 24.04 LTS |
| **Node.js** | **Node.js 22.x LTS** (required for native `node server.ts` execution via `"start": "node server.ts"`). *(If your VPS only has Node 20.x, install Node 22 via NodeSource or run `npx tsx server.ts` in PM2.)* |
| **Build Tools** | `build-essential` (`make`, `g++`, `python3`) for native `better-sqlite3` installation on Linux |
| **Reverse Proxy & SSL** | `nginx` + `certbot` (`python3-certbot-nginx`) |
| **Process Manager** | `pm2` (`npm install -g pm2`) |
| **RAM / Disk** | Minimum 1 GB RAM (2 GB recommended), >= 10 GB persistent SSD |

---

## 2. Custom Domain & DNS Configuration

In your domain registrar / Hostinger DNS Zone Editor, add DNS records pointing to your VPS public IPv4 address (`<VPS_IP>`):

| Type | Name / Host | Target / Value | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `A` | `app` *(or `@` for root domain)* | `<VPS_IP>` | 300 | Main StaffPay Web App + `/api/v1/*` (`https://app.yourdomain.com`) |
| `A` | `api` *(optional alias)* | `<VPS_IP>` | 300 | Dedicated Android/iOS API domain (`https://api.yourdomain.com/api/v1`) |
| `AAAA` | `app` / `api` *(optional)* | `<VPS_IPv6>` | 300 | Only if your VPS has IPv6 enabled |

Verify DNS propagation before issuing SSL certificates:
```bash
dig +short app.yourdomain.com
```

---

## 3. Recommended VPS Directory Separation (Zero Data Loss on Updates)

Keep application code and persistent user data in **completely separate directories** so replacing code or rebuilding `dist/` can never delete your database, receipts, or backups:

- **Application Code:** `/var/www/staffpay/app`
- **Persistent Data (`DATA_DIR`):** `/var/lib/staffpay/storage`
  - SQLite Database (`DATABASE_PATH`): `/var/lib/staffpay/storage/staffpay.db`
  - Uploaded Receipts & Docs (`UPLOAD_DIR`): `/var/lib/staffpay/storage/uploads`
  - Backups (`BACKUP_DIR`): `/var/lib/staffpay/storage/backups`

---

## 4. Initial Server Setup (Ubuntu VPS)

```bash
# 1. System packages & build tools for better-sqlite3
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx build-essential python3

# 2. Install Node.js 22.x LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # Confirm v22.x

# 3. Install PM2 globally
sudo npm install -g pm2

# 4. Create separated app & persistent storage directories
sudo mkdir -p /var/www/staffpay/app
sudo mkdir -p /var/lib/staffpay/storage/uploads /var/lib/staffpay/storage/backups
sudo chown -R $USER:$USER /var/www/staffpay /var/lib/staffpay
```

---

## 5. Upload Project Files & Configure `.env`

Upload the application files into `/var/www/staffpay/app`:
- **Upload:** `server.ts`, `server/`, `src/`, `public/`, `scripts/`, `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `metadata.json`, `.env.example` (plus `dist/` if prebuilt locally).
- **Do NOT upload:** `node_modules/`, `.env`, or any local `storage/` folder.

Create `/var/www/staffpay/app/.env` (`chmod 600 .env`):

```env
NODE_ENV="production"
PORT="3000"
APP_URL="https://app.yourdomain.com"

# Persistent storage outside the app code directory
DATA_DIR="/var/lib/staffpay/storage"
DATABASE_PATH="/var/lib/staffpay/storage/staffpay.db"
UPLOAD_DIR="/var/lib/staffpay/storage/uploads"
BACKUP_DIR="/var/lib/staffpay/storage/backups"

# Exact browser origins (no trailing slash). Mobile Android/iOS Bearer API calls work automatically.
CORS_ORIGINS="https://app.yourdomain.com"

# Auth token lifetimes
ACCESS_TOKEN_TTL_MINUTES="60"
REFRESH_TOKEN_TTL_DAYS="30"

# Set strong initial Super Admin credentials before first boot (scrypt-hashed into SQLite)
SUPER_ADMIN_EMAIL="admin@yourdomain.com"
SUPER_ADMIN_PASSWORD="replace-with-unique-16-plus-char-passphrase"

# Keep Razorpay blank during initial testing (server blocks fake paid activations safely)
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
VITE_RAZORPAY_KEY_ID=""
```

Lock permissions on `.env`:
```bash
chmod 600 /var/www/staffpay/app/.env
```

---

## 6. Install Dependencies, Build & Start Server

```bash
cd /var/www/staffpay/app

# Install dependencies (compiles native better-sqlite3 for Linux)
npm install

# Build production frontend bundle into dist/
npm run build

# Start StaffPay in production via PM2
pm2 start server.ts --name staffpay --interpreter node --env production
pm2 save
pm2 startup
```

### Build & Startup Commands Reference

| Action | Command |
| :--- | :--- |
| **Production Build** | `npm run build` |
| **Direct Production Start** | `NODE_ENV=production npm start` *(executes `node server.ts`)* |
| **PM2 Reload (Zero-Downtime Restart)** | `pm2 reload staffpay` |
| **Check Logs** | `pm2 logs staffpay` |

---

## 7. Nginx Reverse Proxy & Free SSL (HTTPS)

Create `/etc/nginx/sites-available/staffpay`:

```nginx
server {
    listen 80;
    server_name app.yourdomain.com api.yourdomain.com;

    # Allow receipt/bill/avatar uploads up to 10 MB (app limit is 5 MB per file)
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable Nginx site and obtain Let's Encrypt SSL certificates:

```bash
sudo ln -s /etc/nginx/sites-available/staffpay /etc/nginx/sites-enabled/staffpay
sudo nginx -t
sudo systemctl reload nginx

sudo certbot --nginx -d app.yourdomain.com
# If also using api.yourdomain.com:
# sudo certbot --nginx -d app.yourdomain.com -d api.yourdomain.com
```

---

## 8. Health-Check Verification

Verify the live HTTPS endpoint responds cleanly and confirms both database and persistent storage readiness:

```bash
curl -fsS https://app.yourdomain.com/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "apiVersion": "v1",
  "environment": "production",
  "checks": {
    "database": "ok",
    "storage": "ok"
  },
  "timestamp": "..."
}
```

Verify initial testing safety:
- Visit `https://app.yourdomain.com/super-admin` and sign in using `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`.
- Confirm **Monthly Subscription Revenue** shows `₹0` and **Paid Subscribers** shows `0` while Razorpay keys remain empty.
- Confirm you can create/edit plans, test Free plan employee limits, and register test company workspaces without errors.

---

## 9. Backup & Restore in Production

### Manual Online Backup
Copies a consistent SQLite snapshot (using `db.backup()`) plus `/var/lib/staffpay/storage/uploads/` into `/var/lib/staffpay/storage/backups/backup-<timestamp>`:
```bash
cd /var/www/staffpay/app
node scripts/backup.mjs
```

### Automated Daily Cron Backup (2:00 AM daily)
```bash
crontab -e
```
Add:
```cron
0 2 * * * cd /var/www/staffpay/app && /usr/bin/node scripts/backup.mjs >> /var/log/staffpay-backup.log 2>&1
```

### Restore from Backup
Always stop the app before replacing the live SQLite file:
```bash
pm2 stop staffpay
cd /var/www/staffpay/app
node scripts/restore.mjs /var/lib/staffpay/storage/backups/backup-<timestamp>
pm2 start staffpay
```

---

## 10. Updating StaffPay Without Losing Data

1. Take an immediate pre-update backup:
   ```bash
   cd /var/www/staffpay/app && node scripts/backup.mjs
   ```
2. Upload updated source files into `/var/www/staffpay/app` (**never overwrite `.env` or `/var/lib/staffpay/storage`**).
3. Install dependencies and rebuild frontend:
   ```bash
   npm install
   npm run build
   ```
4. Reload PM2 cleanly:
   ```bash
   pm2 reload staffpay
   ```
5. Verify `/api/v1/health`. Database migrations run idempotently via `schema_migrations`, preserving all companies, employees, attendance, leaves, payroll, expenses, uploads, and subscription records.

---

## 11. Rollback & Troubleshooting

- **Rollback:** Restore the previous application files/tarball into `/var/www/staffpay/app`, run `npm run build`, and if schema changes occurred, run `node scripts/restore.mjs <pre-update-backup>` while `staffpay` is stopped before `pm2 start staffpay`.
- **`Unknown file extension ".ts"` on start:** Your VPS is on Node 20 instead of Node 22. Upgrade to Node 22 LTS or start PM2 with `npx tsx server.ts`.
- **`better-sqlite3` invalid ELF header:** Do not copy `node_modules` from Windows/macOS. Delete `node_modules` on the VPS and run `npm install`.
- **CORS blocked on custom domain:** Confirm `APP_URL` and `CORS_ORIGINS` match the exact `https://` origin in your browser address bar with **no trailing slash**, then run `pm2 restart staffpay`.
- **Razorpay activation later:** Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `VITE_RAZORPAY_KEY_ID` to `.env`, run `npm run build`, and run `pm2 restart staffpay`.
