# Dumptek CRM API

Backend API for the Dumptek CRM system - Track potential customers from Twilio call recordings with AI-powered transcription and analysis.

## Features

- 🎙️ Twilio call integration with automatic syncing
- 🤖 AI transcription using OpenAI Whisper
- 🧠 AI-powered prospect identification using GPT-4o
- 📊 Automatic prospect scoring and qualification
- 🚛 FMCSA carrier data enrichment
- 🔄 Integration with Dumptek API
- 💳 Stripe subscription tracking for customers
- 👥 Role-based access (Sales Manager, Account Representative)

## Prerequisites

- Node.js >= 20.15.1
- PostgreSQL
- Twilio account with phone number
- OpenAI API key
- Access to FMCSA Scraper API
- Access to Dumptek API

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### 3. Set Up Database

Create PostgreSQL database:

```bash
createdb dumptek_crm
```

Generate and run migrations:

```bash
npm run generate-migration
npm run migrate
```

### 4. Seed Database

Create default users:

```bash
npm run seed
```

Default credentials:
- Sales Manager: `admin@dumptek.com` / `admin123`
- Account Rep: `rep@dumptek.com` / `rep123`

### 5. Start Development Server

```bash
npm run dev
```

Server will start on http://localhost:4000

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run generate-migration` - Generate new migration
- `npm run seed` - Seed database with default data
- `npm run sync-calls` - Manually sync Twilio calls
- `npm run process-transcriptions` - Manually process pending transcriptions

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new user (Sales Manager only)
- `GET /api/auth/me` - Get current user

### Calls
- `GET /api/calls` - List all calls
- `GET /api/calls/:id` - Get call details
- `GET /api/calls/pending-review` - Get calls needing review
- `POST /api/calls/:id/mark-prospect` - Mark call as prospect
- `POST /api/calls/:id/confirm-prospect` - Confirm and create prospect
- `POST /api/calls/:id/reject-prospect` - Reject as prospect

### Prospects
- `GET /api/prospects` - List prospects
- `GET /api/prospects/:id` - Get prospect details
- `POST /api/prospects` - Create prospect manually
- `PATCH /api/prospects/:id` - Update prospect
- `POST /api/prospects/:id/enrich-fmcsa` - Enrich with FMCSA data
- `POST /api/prospects/:id/promote` - Promote to Dumptek customer (Manager only)
- `GET /api/prospects/:id/stripe` - Get Stripe subscription info

## Automated Processes

### Cron Jobs (runs automatically)

1. **Call Sync** (every 5 minutes)
   - Fetches new calls from Twilio
   - Downloads recording URLs
   - Queues for transcription

2. **Transcription Processing** (every 2 minutes)
   - Transcribes call recordings
   - Analyzes with AI for prospect qualification
   - Auto-creates prospects with score >= 60 and high confidence
   - Flags uncertain calls for manual review

### AI Prospect Detection

Automatically identifies prospects based on:
- Interest indicators in conversation
- Budget and timeline mentions
- Pain points discussed
- Decision-maker indicators
- Sentiment analysis

Scoring:
- 80-100: Hot lead (immediate follow-up)
- 50-79: Warm lead (follow-up within 24h)
- 20-49: Cold lead (nurture campaign)
- 0-19: Not qualified

## Architecture

```
src/
├── controllers/      # Request handlers
├── db/              # Database schema and migrations
├── jobs/            # Cron job definitions
├── middleware/      # Auth, error handling
├── routes/          # API route definitions
├── scripts/         # Utility scripts
├── services/        # Business logic
│   ├── twilioService.ts     # Twilio integration
│   ├── openaiService.ts     # AI transcription & analysis
│   ├── fmcsaService.ts      # FMCSA data enrichment
│   ├── dumptekService.ts    # Dumptek API integration
│   └── prospectService.ts   # Prospect management
└── utils/           # Helper functions
```

## Database Schema

- `users` - Sales team members
- `prospects` - Potential customers
- `calls` - Call recordings with transcriptions
- `activities` - Prospect activities and notes
- `deals` - Sales pipeline and opportunities

## Development

The API uses:
- **Koa.js** - Web framework
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Database
- **OpenAI** - Whisper (transcription) + GPT-4o (analysis)
- **Twilio** - Call management
- **Winston** - Logging

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables

3. Run migrations:
```bash
npm run migrate
```

4. Start the server:
```bash
npm start
```

5. Enable cron jobs:
```bash
ENABLE_CRON_JOBS=true
```