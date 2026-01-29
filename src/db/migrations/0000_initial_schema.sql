-- Initial schema migration
-- Created: 2026-01-25

-- Create enums
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('sales_manager', 'account_representative');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."prospect_status" AS ENUM('new', 'contacted', 'qualified', 'opportunity', 'customer', 'lost');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."prospect_source" AS ENUM('call', 'manual', 'referral', 'web');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."call_direction" AS ENUM('inbound', 'outbound');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."transcription_status" AS ENUM('pending', 'processing', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."sentiment" AS ENUM('positive', 'neutral', 'negative');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."confidence_level" AS ENUM('high', 'medium', 'low');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."activity_type" AS ENUM('call', 'email', 'meeting', 'note');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."deal_stage" AS ENUM('qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create tables
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"role" "user_role" DEFAULT 'account_representative' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "prospects" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"dot_number" varchar(50),
	"ein" varchar(50),
	"phone" varchar(50),
	"email" varchar(255),
	"website" varchar(255),
	"physical_street" varchar(255),
	"physical_city" varchar(100),
	"physical_state" varchar(2),
	"physical_zip" varchar(20),
	"physical_country" varchar(100) DEFAULT 'USA',
	"fleet_size" varchar(50),
	"driver_count" integer,
	"fmcsa_data" jsonb,
	"status" "prospect_status" DEFAULT 'new' NOT NULL,
	"assigned_to_user_id" integer,
	"source" "prospect_source" DEFAULT 'call' NOT NULL,
	"initial_call_id" integer,
	"prospect_score" integer DEFAULT 0,
	"interested_services" text[],
	"pain_points" text[],
	"timeline" varchar(255),
	"budget_indicator" varchar(255),
	"dumptek_company_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"prospect_id" integer,
	"twilio_call_sid" varchar(100) UNIQUE,
	"phone_number" varchar(50) NOT NULL,
	"duration" integer,
	"direction" "call_direction" NOT NULL,
	"status" varchar(50),
	"recording_url" text,
	"transcription_text" text,
	"transcription_status" "transcription_status" DEFAULT 'pending' NOT NULL,
	"summary_text" text,
	"summary_data" jsonb,
	"is_prospect" boolean DEFAULT false,
	"prospect_score" integer DEFAULT 0,
	"confidence_level" "confidence_level",
	"interest_indicators" text[],
	"call_classification" varchar(50),
	"sentiment" "sentiment",
	"auto_prospect_created" boolean DEFAULT false,
	"requires_review" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"prospect_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"call_id" integer,
	"type" "activity_type" NOT NULL,
	"description" text NOT NULL,
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"prospect_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"value" integer,
	"probability" integer DEFAULT 0,
	"stage" "deal_stage" DEFAULT 'qualification' NOT NULL,
	"expected_close_date" timestamp,
	"actual_close_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign keys
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "calls" ADD CONSTRAINT "calls_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "activities" ADD CONSTRAINT "activities_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "activities" ADD CONSTRAINT "activities_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "deals" ADD CONSTRAINT "deals_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "deals" ADD CONSTRAINT "deals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "idx_prospects_assigned_to" ON "prospects" ("assigned_to_user_id");
CREATE INDEX IF NOT EXISTS "idx_prospects_status" ON "prospects" ("status");
CREATE INDEX IF NOT EXISTS "idx_prospects_dot" ON "prospects" ("dot_number");
CREATE INDEX IF NOT EXISTS "idx_calls_prospect" ON "calls" ("prospect_id");
CREATE INDEX IF NOT EXISTS "idx_calls_twilio_sid" ON "calls" ("twilio_call_sid");
CREATE INDEX IF NOT EXISTS "idx_calls_requires_review" ON "calls" ("requires_review");
CREATE INDEX IF NOT EXISTS "idx_activities_prospect" ON "activities" ("prospect_id");
CREATE INDEX IF NOT EXISTS "idx_deals_prospect" ON "deals" ("prospect_id");
