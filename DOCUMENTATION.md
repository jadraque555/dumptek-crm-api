# Dumptek CRM - Complete Documentation

**Version:** 1.0.0  
**Last Updated:** January 25, 2026  
**Status:** Production Ready

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [API Reference](#api-reference)
7. [Database Schema](#database-schema)
8. [Workflows](#workflows)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Dumptek CRM?

A standalone CRM system that automatically tracks potential customers from Twilio call recordings using AI-powered transcription and analysis. The system integrates with FMCSA data and the existing Dumptek customer base.

### Key Benefits

- **Automated Prospect Detection**: AI identifies qualified leads from call transcriptions
- **Zero Manual Data Entry**: Auto-enriches with FMCSA carrier data
- **Smart Scoring**: 0-100 qualification score with confidence levels
- **Seamless Integration**: Connects to Dumptek API and FMCSA database
- **Cost Efficient**: ~$100/month for 100 calls/day

### Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend | Node.js + TypeScript | 20.15.1+ |
| Frontend | Vue 3 + Vite | 3.5.13 |
| Database | PostgreSQL | 13+ |
| ORM | Drizzle | 0.33.0 |
| AI | OpenAI (Whisper + GPT-4o) | Latest |
| Calls | Twilio API | 5.3.5 |
| State Management | Pinia | 2.3.0 |

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Dumptek CRM                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │   Vue 3 UI   │────────▶│   Koa API    │                │
│  │  (Port 3001) │         │  (Port 4000) │                │
│  └──────────────┘         └───────┬──────┘                │
│                                   │                         │
│                           ┌───────▼──────┐                 │
│                           │  PostgreSQL  │                 │
│                           └───────┬──────┘                 │
│                                   │                         │
└───────────────────────────────────┼─────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
    │ Twilio API   │      │  OpenAI API  │      │  FMCSA API   │
    │ (Calls)      │      │ (AI Analysis)│      │ (Carriers)   │
    └──────────────┘      └──────────────┘      └──────────────┘
                                    │
                                    ▼
                          ┌──────────────┐
                          │ Dumptek API  │
                          │ (Customers)  │
                          └──────────────┘
```

### Project Structure

```
dumptek-crm/
├── backend (dumptek-crm-api)
│   ├── src/
│   │   ├── controllers/      # HTTP request handlers
│   │   ├── db/              # Database schema & migrations
│   │   ├── jobs/            # Cron job definitions
│   │   ├── middleware/      # Auth, validation, errors
│   │   ├── routes/          # API route definitions
│   │   ├── scripts/         # Utility scripts
│   │   ├── services/        # Business logic & integrations
│   │   └── utils/           # Helper functions
│   └── package.json
│
└── frontend (dumptek-crm-ui)
    ├── src/
    │   ├── api/             # API client methods
    │   ├── assets/          # Global styles
    │   ├── components/      # Reusable Vue components
    │   ├── layouts/         # Layout wrappers
    │   ├── router/          # Vue Router config
    │   ├── stores/          # Pinia state management
    │   └── views/           # Page components
    └── package.json
```

---

## Features

### 1. AI-Powered Call Analysis

**Automatic Transcription**
- Converts call recordings to text using OpenAI Whisper
- Processes in background (every 2 minutes)
- Handles failures with retry logic

**Intelligent Analysis**
- Extracts company information from conversation
- Identifies interest indicators and pain points
- Calculates prospect score (0-100)
- Determines confidence level (high/medium/low)
- Performs sentiment analysis
- Suggests next steps

**Prospect Scoring Matrix**

| Score Range | Classification | Action |
|-------------|---------------|--------|
| 80-100 | Hot Lead | Auto-create + immediate follow-up |
| 60-79 | Warm Lead | Auto-create + 24h follow-up |
| 40-59 | Cold Lead | Flag for review |
| 0-39 | Not Qualified | Ignore |

### 2. Automated Prospect Management

**Auto-Creation Criteria**
- Prospect score ≥ 60
- Confidence level = "high"
- Not classified as support/spam/wrong number

**Workflow**
1. Call transcribed and analyzed
2. If qualified → Create prospect automatically
3. Search FMCSA by phone number
4. Enrich with carrier data
5. Assign to sales rep (round-robin)
6. Notify team

### 3. FMCSA Integration

**Data Enrichment**
- Search by phone number or DOT
- Auto-populate company details
- Import fleet size and driver count
- Link to carrier operations data
- Display cargo types and categories

**Available Data**
- Legal name & DBA
- DOT number & EIN
- Physical address
- Contact information
- Fleet size & driver count
- MCS-150 date
- Cargo carried

### 4. User Roles & Permissions

**Sales Manager**
- View all prospects
- Manage team members
- Promote prospects to customers
- Access analytics
- Configure system settings

**Account Representative**
- View assigned prospects
- Update prospect status
- Add activities and notes
- Review call transcriptions
- Cannot promote to customer

### 5. Prospect Lifecycle

```
New → Contacted → Qualified → Opportunity → Customer
                                            ↓
                                          Lost
```

**Status Definitions**
- **New**: Just created, not contacted
- **Contacted**: Initial outreach completed
- **Qualified**: Meets criteria, needs proposal
- **Opportunity**: Proposal sent, in negotiation
- **Customer**: Converted and onboarded
- **Lost**: Disqualified or chose competitor

### 6. Call Review Queue

**Purpose**: Handle uncertain AI classifications

**Review Process**
1. AI flags call with medium/low confidence
2. Appears in review queue
3. Sales Manager reviews transcription
4. Decision: Confirm or reject as prospect
5. If confirmed → Auto-creates prospect

---

## Installation

### Prerequisites

```bash
# Check versions
node --version  # Should be >= 20.15.1
psql --version  # Should be >= 13
```

### Quick Setup (5 Minutes)

```bash
# 1. Clone/navigate to project
cd dumptek

# 2. Backend setup
cd dumptek-crm-api
npm install
cp .env.example .env
# Edit .env with your API keys

# 3. Database setup
createdb dumptek_crm
npm run generate-migration
npm run migrate
npm run seed

# 4. Start backend
npm run dev  # Runs on http://localhost:4000

# 5. Frontend setup (new terminal)
cd ../dumptek-crm-ui
npm install
cp .env.example .env
npm run dev  # Runs on http://localhost:3001
```

### Default Credentials

After seeding:
- **Sales Manager**: admin@dumptek.com / admin123
- **Account Rep**: rep@dumptek.com / rep123

---

## Configuration

### Backend Environment Variables

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/dumptek_crm

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+12345678900

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# FMCSA Scraper
FMCSA_API_URL=http://localhost:3000
FMCSA_API_KEY=your_fmcsa_key

# Dumptek API
DUMPTEK_API_URL=http://localhost:8080
DUMPTEK_API_KEY=your_dumptek_key

# Automation
ENABLE_CRON_JOBS=true
CALL_SYNC_INTERVAL=*/5 * * * *      # Every 5 minutes
TRANSCRIPTION_INTERVAL=*/2 * * * *   # Every 2 minutes

# Storage
STORAGE_PATH=./storage/recordings
```

### Frontend Environment Variables

```env
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=Dumptek CRM
```

### Cron Job Configuration

| Job | Frequency | Purpose |
|-----|-----------|---------|
| Call Sync | 5 minutes | Fetch new calls from Twilio |
| Transcription | 2 minutes | Process pending transcriptions |

---

## API Reference

### Authentication

**POST /api/auth/login**
```json
// Request
{
  "email": "admin@dumptek.com",
  "password": "admin123"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@dumptek.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "sales_manager"
  }
}
```

**GET /api/auth/me**
- Headers: `Authorization: Bearer <token>`
- Returns current user details

### Calls

**GET /api/calls**
- Query params: `limit`, `offset`, `status`, `requiresReview`
- Returns paginated call list

**GET /api/calls/:id**
- Returns call details with transcription and analysis

**GET /api/calls/pending-review**
- Returns calls flagged for manual review

**POST /api/calls/:id/confirm-prospect**
- Creates prospect from call
- Returns: `{ prospectId: number }`

**POST /api/calls/:id/reject-prospect**
- Marks call as not a prospect

### Prospects

**GET /api/prospects**
- Query params: `limit`, `offset`, `status`, `search`, `assignedTo`
- Returns paginated prospect list with assigned user

**GET /api/prospects/:id**
- Returns prospect details with calls and activities

**POST /api/prospects**
- Body: Prospect data
- Creates new prospect manually

**PATCH /api/prospects/:id**
- Body: Updated fields
- Updates prospect

**POST /api/prospects/:id/enrich-fmcsa**
- Body: `{ dotNumber?: string }`
- Enriches prospect with FMCSA data

**POST /api/prospects/:id/promote**
- Requires: Sales Manager role
- Creates company in Dumptek API
- Returns: `{ dumptekCompanyId: number }`

**GET /api/prospects/:id/stripe**
- Returns Stripe subscription data (if customer)

### Response Format

**Success**
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

**Error**
```json
{
  "error": "Error message",
  "statusCode": 400
}
```

---

## Database Schema

### Tables

**users**
- `id` (serial, PK)
- `email` (unique)
- `password_hash`
- `first_name`, `last_name`
- `role` (sales_manager | account_representative)
- `is_active`
- `created_at`, `updated_at`

**prospects**
- `id` (serial, PK)
- `company_name`, `dot_number`, `ein`
- `phone`, `email`, `website`
- `physical_address` (street, city, state, zip, country)
- `fleet_size`, `driver_count`
- `fmcsa_data` (jsonb)
- `status` (new | contacted | qualified | opportunity | customer | lost)
- `assigned_to_user_id` (FK → users)
- `source` (call | manual | referral | web)
- `initial_call_id` (FK → calls)
- `prospect_score` (0-100)
- `interested_services` (array)
- `pain_points` (array)
- `timeline`, `budget_indicator`
- `dumptek_company_id` (FK to Dumptek)
- `created_at`, `updated_at`

**calls**
- `id` (serial, PK)
- `prospect_id` (FK → prospects, nullable)
- `twilio_call_sid` (unique)
- `phone_number`, `duration`, `direction` (inbound | outbound)
- `status`, `recording_url`
- `transcription_text`, `transcription_status`
- `summary_text`, `summary_data` (jsonb)
- `is_prospect`, `prospect_score`, `confidence_level`
- `interest_indicators` (array)
- `call_classification`, `sentiment`
- `auto_prospect_created`, `requires_review`
- `created_at`, `updated_at`

**activities**
- `id` (serial, PK)
- `prospect_id` (FK → prospects)
- `user_id` (FK → users)
- `call_id` (FK → calls, nullable)
- `type` (call | email | meeting | note)
- `description`
- `scheduled_at`, `completed_at`
- `created_at`, `updated_at`

**deals**
- `id` (serial, PK)
- `prospect_id` (FK → prospects)
- `user_id` (FK → users)
- `name`, `value`, `probability`
- `stage` (qualification | proposal | negotiation | closed_won | closed_lost)
- `expected_close_date`, `actual_close_date`
- `notes`
- `created_at`, `updated_at`

### Indexes

- `users.email` (unique)
- `calls.twilio_call_sid` (unique)
- `calls.prospect_id`
- `prospects.assigned_to_user_id`
- `prospects.status`
- `activities.prospect_id`
- `deals.prospect_id`

---

## Workflows

### Workflow 1: Automated Call Processing

```
1. Twilio Call Received
   ↓
2. Cron Job Syncs Call (every 5 min)
   ↓
3. Stores in Database (status: pending)
   ↓
4. Cron Job Processes (every 2 min)
   ↓
5. Downloads Recording
   ↓
6. Transcribes with Whisper (~1 min per 5 min call)
   ↓
7. Analyzes with GPT-4o (~5 seconds)
   ↓
8. Calculates Prospect Score
   ↓
9. Decision Tree:
   
   Score ≥ 60 AND Confidence = High?
   ├─ YES → Auto-Create Prospect
   │         ├─ Search FMCSA by Phone
   │         ├─ Enrich with Carrier Data
   │         ├─ Assign to Sales Rep
   │         └─ Mark: auto_prospect_created = true
   │
   └─ NO → Check Review Criteria
            ├─ Score 40-59 OR Confidence = Medium?
            │   └─ YES → Flag for Review (requires_review = true)
            │
            └─ NO → Ignore (score < 40)
```

### Workflow 2: Manual Prospect Creation

```
1. Sales Rep clicks "Add Prospect"
   ↓
2. Fills in Form
   - Company Name (required)
   - Phone (required)
   - DOT Number (optional)
   - Email, Fleet Size, etc.
   ↓
3. Submits Form
   ↓
4. POST /api/prospects
   ↓
5. Prospect Created (source = "manual")
   ↓
6. Optional: Click "Enrich with FMCSA"
   ↓
7. Search FMCSA by DOT or Phone
   ↓
8. Update Prospect with Carrier Data
```

### Workflow 3: Prospect to Customer Conversion

```
1. Sales Manager reviews qualified prospect
   ↓
2. Clicks "Promote to Customer"
   ↓
3. System Validates:
   - User is Sales Manager?
   - Prospect not already promoted?
   ↓
4. POST /api/prospects/:id/promote
   ↓
5. Creates Company in Dumptek API
   ↓
6. Links Prospect to Dumptek Company
   - Updates: dumptek_company_id
   - Updates: status = "customer"
   ↓
7. Success Message + Dumptek Company ID
   ↓
8. Can now view Stripe subscription info
```

### Workflow 4: Call Review Process

```
1. AI flags call (requires_review = true)
   ↓
2. Appears in Review Queue
   ↓
3. Sales Manager opens Review Queue
   ↓
4. Reviews Each Call:
   - Reads transcription
   - Views AI analysis
   - Checks prospect score
   ↓
5. Makes Decision:
   
   ├─ Confirm Prospect
   │   ├─ POST /api/calls/:id/confirm-prospect
   │   ├─ Creates prospect
   │   ├─ Enriches with FMCSA
   │   └─ Redirects to prospect detail
   │
   └─ Reject Prospect
       ├─ POST /api/calls/:id/reject-prospect
       ├─ Updates: is_prospect = false
       ├─ Updates: requires_review = false
       └─ Removes from queue
```

---

## Deployment

### Production Setup

**1. Prepare Server**
```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Install PM2
sudo npm install -g pm2
```

**2. Deploy Backend**
```bash
cd dumptek-crm-api

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Set environment variables
nano .env  # Edit production values

# Run migrations
npm run migrate

# Start with PM2
pm2 start dist/index.js --name dumptek-crm-api
pm2 save
pm2 startup
```

**3. Deploy Frontend**
```bash
cd dumptek-crm-ui

# Build for production
npm run build

# Serve with Nginx
sudo cp -r dist/* /var/www/dumptek-crm/
```

**4. Configure Nginx**
```nginx
server {
    listen 80;
    server_name crm.dumptek.com;

    root /var/www/dumptek-crm;
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**5. SSL Certificate**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d crm.dumptek.com
```

### Monitoring

**PM2 Commands**
```bash
pm2 logs dumptek-crm-api     # View logs
pm2 monit                     # Real-time monitoring
pm2 restart dumptek-crm-api  # Restart app
pm2 stop dumptek-crm-api     # Stop app
```

**Database Backup**
```bash
# Daily backup script
pg_dump dumptek_crm > backup_$(date +%Y%m%d).sql

# Restore
psql dumptek_crm < backup_20260125.sql
```

---

## Troubleshooting

### Common Issues

**Issue**: Database connection failed
```bash
# Solution 1: Check PostgreSQL is running
sudo systemctl status postgresql

# Solution 2: Verify connection string
psql $DATABASE_URL

# Solution 3: Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-13-main.log
```

**Issue**: Twilio sync not working
```bash
# Solution 1: Verify credentials
npm run sync-calls

# Solution 2: Check Twilio dashboard
# Visit: https://console.twilio.com

# Solution 3: Test API connection
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Calls.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
```

**Issue**: OpenAI transcription failing
```bash
# Solution 1: Verify API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Solution 2: Check API usage/limits
# Visit: https://platform.openai.com/usage

# Solution 3: Review error logs
pm2 logs dumptek-crm-api | grep -i "openai"
```

**Issue**: Frontend can't connect to API
```bash
# Solution 1: Check API is running
curl http://localhost:4000/health

# Solution 2: Verify VITE_API_URL
cat dumptek-crm-ui/.env

# Solution 3: Check CORS settings
# Edit: dumptek-crm-api/src/index.ts
# Ensure CORS allows frontend origin
```

**Issue**: Migration failed
```bash
# Solution: Reset database
dropdb dumptek_crm
createdb dumptek_crm
npm run migrate
npm run seed
```

### Debug Mode

**Enable verbose logging**
```env
# .env
NODE_ENV=development
LOG_LEVEL=debug
```

**Check application logs**
```bash
# Development
npm run dev  # Logs to console

# Production
pm2 logs dumptek-crm-api --lines 100
```

### Performance Issues

**Slow transcriptions**
- Reduce call volume
- Increase `TRANSCRIPTION_INTERVAL`
- Use smaller audio files
- Check OpenAI API status

**High database load**
- Add database indexes
- Optimize queries
- Enable connection pooling
- Consider read replicas

---

## Cost Analysis

### Monthly Costs (100 calls/day)

| Service | Cost | Notes |
|---------|------|-------|
| OpenAI Whisper | $90 | $0.006/min × 500 min/day |
| OpenAI GPT-4o | $8 | ~100 analyses/day |
| Twilio Storage | $5 | ~10 GB/month |
| Server (VPS) | $20 | 2GB RAM, 2 vCPU |
| **Total** | **~$123** | Per month |

### Cost Optimization

1. **Process only calls > 30 seconds**: Save 30% on transcription
2. **Use GPT-4o-mini**: Save 70% on analysis
3. **Delete old recordings**: Reduce storage costs
4. **Batch processing**: Optimize API calls

---

## Support & Maintenance

### Regular Maintenance Tasks

**Daily**
- Monitor error logs
- Check call sync status
- Review pending transcriptions

**Weekly**
- Database backup
- Review system performance
- Update prospect statuses

**Monthly**
- Update dependencies
- Review API costs
- Analyze conversion metrics
- Security audit

### Updating the System

**Backend updates**
```bash
cd dumptek-crm-api
git pull
npm install
npm run build
npm run migrate  # If schema changed
pm2 restart dumptek-crm-api
```

**Frontend updates**
```bash
cd dumptek-crm-ui
git pull
npm install
npm run build
sudo cp -r dist/* /var/www/dumptek-crm/
```

---

## Appendix

### Useful Commands

```bash
# Database
psql dumptek_crm                    # Connect to database
\dt                                 # List tables
\d prospects                        # Describe table

# Backend
npm run dev                         # Start development server
npm run build                       # Build TypeScript
npm run migrate                     # Run migrations
npm run seed                        # Seed database
npm run sync-calls                  # Manual call sync
npm run process-transcriptions      # Manual transcription

# Frontend
npm run dev                         # Start dev server
npm run build                       # Build for production
npm run preview                     # Preview build

# PM2
pm2 list                           # List processes
pm2 logs dumptek-crm-api           # View logs
pm2 restart dumptek-crm-api        # Restart
pm2 delete dumptek-crm-api         # Remove
```

### Environment Checklist

- [ ] Node.js 20+ installed
- [ ] PostgreSQL running
- [ ] Database created
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Migrations run
- [ ] Database seeded
- [ ] API keys valid
- [ ] Cron jobs enabled
- [ ] SSL certificate installed (production)

---

**Documentation maintained by:** Development Team  
**For questions:** Check troubleshooting section or review API logs  
**Version control:** Update this file with every major change
