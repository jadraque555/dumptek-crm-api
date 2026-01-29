# Dumptek CRM - Complete Setup Guide

This guide will walk you through setting up the entire Dumptek CRM system from scratch.

## System Overview

The Dumptek CRM consists of two applications:
- **dumptek-crm-api** (Backend) - Node.js/TypeScript API
- **dumptek-crm-ui** (Frontend) - Vue 3 SPA

## Prerequisites

### Required Software
- Node.js >= 20.15.1
- PostgreSQL >= 13
- Git

### Required API Keys
- Twilio Account (SID, Auth Token, Phone Number)
- OpenAI API Key
- Access to FMCSA Scraper API
- Access to Dumptek API

## Part 1: Backend Setup (dumptek-crm-api)

### Step 1: Install Node.js Dependencies

```bash
cd dumptek-crm-api
npm install
```

### Step 2: Create PostgreSQL Database

Using psql:
```bash
psql -U postgres
CREATE DATABASE dumptek_crm;
\q
```

Or using PGAdmin:
1. Right-click Databases → Create → Database
2. Name: `dumptek_crm`
3. Click Save

### Step 3: Configure Environment Variables

Copy the example file:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/dumptek_crm

# JWT
JWT_SECRET=your-random-secret-key-change-this
JWT_EXPIRES_IN=7d

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+12345678900

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# FMCSA API
FMCSA_API_URL=http://localhost:3000
FMCSA_API_KEY=your_fmcsa_api_key

# Dumptek API
DUMPTEK_API_URL=http://localhost:8080
DUMPTEK_API_KEY=your_dumptek_api_key

# File Storage
STORAGE_PATH=./storage/recordings

# Cron Jobs
ENABLE_CRON_JOBS=true
CALL_SYNC_INTERVAL=*/5 * * * *
TRANSCRIPTION_INTERVAL=*/2 * * * *
```

### Step 4: Generate and Run Database Migrations

Generate migration:
```bash
npm run generate-migration
```

Run migration:
```bash
npm run migrate
```

### Step 5: Seed Database

Create default users:
```bash
npm run seed
```

This creates:
- Sales Manager: `admin@dumptek.com` / `admin123`
- Account Rep: `rep@dumptek.com` / `rep123`

### Step 6: Start the API Server

Development mode:
```bash
npm run dev
```

The API will be running on http://localhost:4000

Test the API:
```bash
curl http://localhost:4000/health
```

Should return: `{"status":"ok"}`

### Step 7: Test Authentication

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dumptek.com","password":"admin123"}'
```

Should return a JWT token and user object.

## Part 2: Frontend Setup (dumptek-crm-ui)

### Step 1: Install Dependencies

```bash
cd ../dumptek-crm-ui
npm install
```

### Step 2: Configure Environment

Copy the example file:
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=Dumptek CRM
```

### Step 3: Start the Development Server

```bash
npm run dev
```

The UI will be running on http://localhost:3001

### Step 4: Login to the Application

1. Open http://localhost:3001 in your browser
2. Login with: `admin@dumptek.com` / `admin123`
3. You should see the dashboard

## Part 3: Testing the System

### Test 1: Manual Call Sync

Run the Twilio sync script manually:
```bash
cd dumptek-crm-api
npm run sync-calls
```

This will fetch recent calls from Twilio and store them in the database.

### Test 2: Process Transcriptions

Process pending transcriptions manually:
```bash
npm run process-transcriptions
```

This will:
1. Download call recordings
2. Transcribe using OpenAI Whisper
3. Analyze with GPT-4o
4. Auto-create prospects if qualified

### Test 3: Create Manual Prospect

1. Go to http://localhost:3001/prospects
2. Click "Add Prospect"
3. Fill in the form:
   - Company Name: Test Company
   - Phone: 555-123-4567
   - DOT Number: 123456
4. Click "Create Prospect"
5. View the created prospect

### Test 4: Enrich with FMCSA Data

1. Go to a prospect detail page
2. Click "Enrich with FMCSA Data"
3. Enter a valid DOT number
4. The prospect should be updated with carrier information

## Part 4: Production Deployment

### Backend Deployment

1. Build the application:
```bash
cd dumptek-crm-api
npm run build
```

2. Set production environment variables on your server

3. Run migrations:
```bash
NODE_ENV=production npm run migrate
```

4. Start the server:
```bash
NODE_ENV=production npm start
```

Recommended: Use PM2 for process management:
```bash
npm install -g pm2
pm2 start dist/index.js --name dumptek-crm-api
pm2 save
```

### Frontend Deployment

1. Build the application:
```bash
cd dumptek-crm-ui
npm run build
```

2. Deploy the `dist/` folder to:
   - Netlify
   - Vercel
   - AWS S3 + CloudFront
   - Nginx/Apache

Example Nginx configuration:
```nginx
server {
    listen 80;
    server_name crm.dumptek.com;
    
    root /var/www/dumptek-crm-ui/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Part 5: Automated Processes

### Cron Jobs

The API automatically runs these jobs when `ENABLE_CRON_JOBS=true`:

1. **Call Sync** (every 5 minutes)
   - Fetches new calls from Twilio
   - Downloads recording URLs

2. **Transcription Processing** (every 2 minutes)
   - Transcribes pending recordings
   - Analyzes with AI
   - Auto-creates qualified prospects

### Monitoring

Check logs:
```bash
# Development
npm run dev

# Production with PM2
pm2 logs dumptek-crm-api
```

## Part 6: Troubleshooting

### Issue: Database connection failed

**Solution:** Check your `DATABASE_URL` in `.env`:
```bash
psql postgresql://postgres:password@localhost:5432/dumptek_crm
```

### Issue: Migration failed

**Solution:** Drop and recreate database:
```bash
psql -U postgres
DROP DATABASE dumptek_crm;
CREATE DATABASE dumptek_crm;
\q
npm run migrate
```

### Issue: Twilio sync not working

**Solution:** Verify Twilio credentials:
```bash
# Test with Twilio CLI
twilio phone-numbers:list
```

### Issue: Transcription failing

**Solution:** Check OpenAI API key:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Issue: FMCSA enrichment not working

**Solution:** Test FMCSA API connection:
```bash
curl -H "Authorization: Bearer $FMCSA_API_KEY" \
  http://localhost:3000/api/carriers/123456
```

### Issue: Frontend can't connect to API

**Solution:** Check CORS settings and API URL:
1. Verify `VITE_API_URL` in frontend `.env`
2. Check backend CORS configuration in `src/index.ts`

## Part 7: Development Workflow

### Daily Development

1. Start all services:
```bash
# Terminal 1: Backend
cd dumptek-crm-api
npm run dev

# Terminal 2: Frontend
cd dumptek-crm-ui
npm run dev

# Terminal 3: FMCSA Scraper (if needed)
cd fmcsa-scraper
npm run dev

# Terminal 4: Dumptek API (if needed)
cd dumptek-api
npm run dev
```

2. Make changes to code
3. Hot reload will apply changes automatically

### Adding New Features

1. Backend:
   - Add/modify schema in `src/db/schema.ts`
   - Generate migration: `npm run generate-migration`
   - Run migration: `npm run migrate`
   - Add controller in `src/controllers/`
   - Add route in `src/routes/index.ts`

2. Frontend:
   - Add API method in `src/api/`
   - Create view in `src/views/`
   - Add route in `src/router/index.js`

## Part 8: Cost Optimization

### OpenAI API Costs

Estimated monthly costs for 100 calls/day:

- Whisper (transcription): ~$90/month
- GPT-4o (analysis): ~$8/month
- **Total: ~$100/month**

To reduce costs:
- Only transcribe calls longer than 30 seconds
- Use GPT-4o-mini instead of GPT-4o
- Batch process during off-peak hours
- Cache frequently accessed transcriptions

### Twilio Costs

- Recording storage: $0.05/GB/month
- Recording minutes: $0.0025/minute

## Part 9: Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Use strong passwords for database
- [ ] Enable SSL/TLS for production
- [ ] Restrict database access to API server only
- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting on API
- [ ] Regular security updates: `npm audit fix`
- [ ] Set up backup strategy for database

## Part 10: Support

For issues or questions:
1. Check logs: `pm2 logs dumptek-crm-api`
2. Review this guide
3. Check API health: `curl http://localhost:4000/health`
4. Verify all services are running

## Quick Reference

### Backend Commands
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run migrate          # Run migrations
npm run seed             # Seed database
npm run sync-calls       # Manual call sync
npm run process-transcriptions  # Manual transcription processing
```

### Frontend Commands
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
```

### Database Commands
```bash
psql dumptek_crm         # Connect to database
\dt                      # List tables
\d users                 # Describe users table
```

## Next Steps

After setup:
1. Configure Twilio webhook for real-time call notifications
2. Set up monitoring (e.g., Datadog, Sentry)
3. Configure backup strategy
4. Set up CI/CD pipeline
5. Train team on using the system
6. Create custom reports as needed

Congratulations! Your Dumptek CRM system is now fully operational! 🎉
