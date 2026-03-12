import { pgTable, serial, varchar, text, timestamp, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['sales_manager', 'account_representative']);
export const prospectStatusEnum = pgEnum('prospect_status', ['new', 'contacted', 'qualified', 'opportunity', 'customer', 'lost']);
export const prospectSourceEnum = pgEnum('prospect_source', ['call', 'manual', 'referral', 'web']);
export const callDirectionEnum = pgEnum('call_direction', ['inbound', 'outbound']);
export const transcriptionStatusEnum = pgEnum('transcription_status', ['pending', 'processing', 'completed', 'failed']);
export const sentimentEnum = pgEnum('sentiment', ['positive', 'neutral', 'negative']);
export const confidenceLevelEnum = pgEnum('confidence_level', ['high', 'medium', 'low']);
export const activityTypeEnum = pgEnum('activity_type', ['call', 'email', 'meeting', 'note']);
export const dealStageEnum = pgEnum('deal_stage', ['qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']);

// Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: userRoleEnum('role').notNull().default('account_representative'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Prospects Table
export const prospects = pgTable('prospects', {
  id: serial('id').primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  dotNumber: varchar('dot_number', { length: 50 }),
  ein: varchar('ein', { length: 50 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  
  // Address
  physicalStreet: varchar('physical_street', { length: 255 }),
  physicalCity: varchar('physical_city', { length: 100 }),
  physicalState: varchar('physical_state', { length: 2 }),
  physicalZip: varchar('physical_zip', { length: 20 }),
  physicalCountry: varchar('physical_country', { length: 100 }).default('USA'),
  
  // Fleet info
  fleetSize: varchar('fleet_size', { length: 50 }),
  driverCount: integer('driver_count'),
  
  // FMCSA data
  fmcsaData: jsonb('fmcsa_data'),
  
  // Status and assignment
  status: prospectStatusEnum('status').notNull().default('new'),
  assignedToUserId: integer('assigned_to_user_id').references(() => users.id),
  
  // Source tracking
  source: prospectSourceEnum('source').notNull().default('call'),
  initialCallId: integer('initial_call_id'),
  
  // Qualification data
  prospectScore: integer('prospect_score').default(0),
  interestedServices: text('interested_services').array(),
  painPoints: text('pain_points').array(),
  timeline: varchar('timeline', { length: 255 }),
  budgetIndicator: varchar('budget_indicator', { length: 255 }),
  
  // Dumptek connection
  dumptekCompanyId: integer('dumptek_company_id'),
  
  // Notes and action items
  notes: text('notes'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Calls Table
export const calls = pgTable('calls', {
  id: serial('id').primaryKey(),
  prospectId: integer('prospect_id').references(() => prospects.id),
  
  // Twilio data
  twilioCallSid: varchar('twilio_call_sid', { length: 100 }).unique(),
  phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
  duration: integer('duration'), // in seconds
  direction: callDirectionEnum('direction').notNull(),
  status: varchar('status', { length: 50 }),
  recordingUrl: text('recording_url'),
  
  // Transcription
  transcriptionText: text('transcription_text'),
  transcriptionStatus: transcriptionStatusEnum('transcription_status').notNull().default('pending'),
  
  // AI Analysis
  summaryText: text('summary_text'),
  summaryData: jsonb('summary_data'),
  
  // Prospect detection
  isProspect: boolean('is_prospect').default(false),
  prospectScore: integer('prospect_score').default(0),
  confidenceLevel: confidenceLevelEnum('confidence_level'),
  interestIndicators: text('interest_indicators').array(),
  callClassification: varchar('call_classification', { length: 50 }),
  sentiment: sentimentEnum('sentiment'),
  
  // Flags
  autoProspectCreated: boolean('auto_prospect_created').default(false),
  requiresReview: boolean('requires_review').default(false),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Activities Table
export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  prospectId: integer('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  callId: integer('call_id').references(() => calls.id),
  
  type: activityTypeEnum('type').notNull(),
  description: text('description').notNull(),
  
  scheduledAt: timestamp('scheduled_at'),
  completedAt: timestamp('completed_at'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Deals Table
export const deals = pgTable('deals', {
  id: serial('id').primaryKey(),
  prospectId: integer('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id), // Deal owner
  
  name: varchar('name', { length: 255 }).notNull(),
  value: integer('value'), // in cents
  probability: integer('probability').default(0), // 0-100
  stage: dealStageEnum('stage').notNull().default('qualification'),
  
  expectedCloseDate: timestamp('expected_close_date'),
  actualCloseDate: timestamp('actual_close_date'),
  
  notes: text('notes'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assignedProspects: many(prospects),
  activities: many(activities),
  deals: many(deals),
}));

export const prospectsRelations = relations(prospects, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [prospects.assignedToUserId],
    references: [users.id],
  }),
  calls: many(calls),
  activities: many(activities),
  deals: many(deals),
}));

export const callsRelations = relations(calls, ({ one }) => ({
  prospect: one(prospects, {
    fields: [calls.prospectId],
    references: [prospects.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  prospect: one(prospects, {
    fields: [activities.prospectId],
    references: [prospects.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
  call: one(calls, {
    fields: [activities.callId],
    references: [calls.id],
  }),
}));

export const dealsRelations = relations(deals, ({ one }) => ({
  prospect: one(prospects, {
    fields: [deals.prospectId],
    references: [prospects.id],
  }),
  user: one(users, {
    fields: [deals.userId],
    references: [users.id],
  }),
}));
