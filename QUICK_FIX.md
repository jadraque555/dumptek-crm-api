# Quick Fix Guide for Installation Issues

## Issue 1: Migration Error - "Can't find meta/_journal.json"

**Problem:** Migration files haven't been generated yet.

**Solution:** Run these commands in order:

```powershell
cd d:\Projects\dumptek\dumptek-crm-api

# Install dependencies first
npm install

# Generate initial migration
npm run generate-migration

# Now run migrations
npm run migrate
```

If `generate-migration` fails, create the migration manually:

```powershell
# Create directories
New-Item -ItemType Directory -Path "src\db\migrations\meta" -Force

# Generate migration using drizzle-kit
npx drizzle-kit generate
```

---

## Issue 2: Frontend npm Install Error - "@vueuse/core@^11.4.0 not found"

**Problem:** Version 11.4.0 doesn't exist yet (it's a future version).

**Solution:** I've already updated the package.json. Now run:

```powershell
cd d:\Projects\dumptek\dumptek-crm-ui

# Clear npm cache
npm cache clean --force

# Install dependencies
npm install
```

If still fails, try:

```powershell
# Delete node_modules and package-lock.json
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# Install again
npm install
```

---

## Complete Setup Steps (In Order)

### Backend Setup

```powershell
# 1. Navigate to backend
cd d:\Projects\dumptek\dumptek-crm-api

# 2. Install dependencies
npm install

# 3. Copy environment file
Copy-Item .env.example .env

# 4. Edit .env file with your API keys
notepad .env

# 5. Create database
createdb dumptek_crm

# 6. Generate migrations
npx drizzle-kit generate

# 7. Run migrations
npm run migrate

# 8. Seed database
npm run seed

# 9. Start server
npm run dev
```

### Frontend Setup

```powershell
# 1. Navigate to frontend
cd d:\Projects\dumptek\dumptek-crm-ui

# 2. Install dependencies
npm install

# 3. Copy environment file
Copy-Item .env.example .env

# 4. Start dev server
npm run dev
```

---

## Alternative: Use npm ci Instead of npm install

If you have package-lock.json and want a clean install:

```powershell
# Backend
cd d:\Projects\dumptek\dumptek-crm-api
npm ci

# Frontend
cd d:\Projects\dumptek\dumptek-crm-ui
npm ci
```

---

## Troubleshooting

### If PostgreSQL is not installed:

**Windows:**
```powershell
# Download and install from: https://www.postgresql.org/download/windows/
# Or use chocolatey:
choco install postgresql
```

### If createdb command not found:

```powershell
# Use psql instead:
psql -U postgres
# Then in psql:
CREATE DATABASE dumptek_crm;
\q
```

### If npm install is slow:

```powershell
# Use a different registry
npm install --registry=https://registry.npmjs.org/
```

### Check Node.js version:

```powershell
node --version  # Should be >= 20.15.1
```

If lower, download from: https://nodejs.org/

---

## Quick Test Commands

After setup, test if everything works:

```powershell
# Backend
cd d:\Projects\dumptek\dumptek-crm-api
npm run dev
# Should see: "Server running on port 4000"

# In another terminal - Frontend
cd d:\Projects\dumptek\dumptek-crm-ui
npm run dev
# Should see: "Local: http://localhost:3001"
```

Open browser: http://localhost:3001
Login: admin@dumptek.com / admin123

---

## Still Having Issues?

1. Check Node.js version: `node --version`
2. Check npm version: `npm --version`
3. Check PostgreSQL: `psql --version`
4. Clear all caches:
   ```powershell
   npm cache clean --force
   Remove-Item -Recurse -Force ~\.npm
   ```
5. Restart your terminal
6. Try running with administrator privileges
