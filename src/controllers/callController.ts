import { Context } from 'koa';
import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { calls, prospects } from '../db/schema';
import { NotFoundError, BadRequestError } from '../utils/apiErrors';
import { autoCreateProspect, needsReview } from '../services/prospectService';

export async function listCalls(ctx: Context) {
  const { limit = 50, offset = 0, status, requiresReview } = ctx.query;
  
  let query = db.select().from(calls).orderBy(desc(calls.createdAt));
  
  // Apply filters
  const conditions = [];
  if (status) {
    conditions.push(eq(calls.transcriptionStatus, status as any));
  }
  if (requiresReview === 'true') {
    conditions.push(eq(calls.requiresReview, true));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  const results = await query.limit(Number(limit)).offset(Number(offset));
  
  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(calls);
  
  ctx.body = {
    data: results,
    pagination: {
      total: Number(count),
      limit: Number(limit),
      offset: Number(offset),
    },
  };
}

export async function getCall(ctx: Context) {
  const { id } = ctx.params;
  
  const [call] = await db
    .select()
    .from(calls)
    .where(eq(calls.id, Number(id)))
    .limit(1);
  
  if (!call) {
    throw new NotFoundError('Call not found');
  }
  
  // Get prospect if linked
  let prospect = null;
  if (call.prospectId) {
    const [p] = await db
      .select()
      .from(prospects)
      .where(eq(prospects.id, call.prospectId))
      .limit(1);
    prospect = p;
  }
  
  ctx.body = {
    ...call,
    prospect,
  };
}

export async function markAsProspect(ctx: Context) {
  const { id } = ctx.params;
  const { createProspect = true } = ctx.request.body as any;
  
  const [call] = await db
    .select()
    .from(calls)
    .where(eq(calls.id, Number(id)))
    .limit(1);
  
  if (!call) {
    throw new NotFoundError('Call not found');
  }
  
  if (call.prospectId) {
    throw new BadRequestError('Call already has a prospect');
  }
  
  if (!call.summaryData) {
    throw new BadRequestError('Call must be transcribed and analyzed first');
  }
  
  if (createProspect) {
    const prospectId = await autoCreateProspect(
      call.id,
      call.phoneNumber,
      call.summaryData as any
    );
    
    ctx.body = { message: 'Prospect created', prospectId };
  } else {
    await db
      .update(calls)
      .set({
        isProspect: true,
        requiresReview: false,
      })
      .where(eq(calls.id, call.id));
    
    ctx.body = { message: 'Call marked as prospect' };
  }
}

export async function confirmProspect(ctx: Context) {
  const { id } = ctx.params;
  
  const [call] = await db
    .select()
    .from(calls)
    .where(eq(calls.id, Number(id)))
    .limit(1);
  
  if (!call) {
    throw new NotFoundError('Call not found');
  }
  
  if (!call.summaryData) {
    throw new BadRequestError('Call must be analyzed first');
  }
  
  // Create prospect
  const prospectId = await autoCreateProspect(
    call.id,
    call.phoneNumber,
    call.summaryData as any
  );
  
  // Clear review flag
  await db
    .update(calls)
    .set({ requiresReview: false })
    .where(eq(calls.id, call.id));
  
  ctx.body = { message: 'Prospect confirmed and created', prospectId };
}

export async function rejectProspect(ctx: Context) {
  const { id } = ctx.params;
  
  await db
    .update(calls)
    .set({
      isProspect: false,
      requiresReview: false,
    })
    .where(eq(calls.id, Number(id)));
  
  ctx.body = { message: 'Call rejected as prospect' };
}

export async function getPendingReview(ctx: Context) {
  const pendingCalls = await db
    .select()
    .from(calls)
    .where(eq(calls.requiresReview, true))
    .orderBy(desc(calls.createdAt));
  
  ctx.body = { data: pendingCalls };
}
