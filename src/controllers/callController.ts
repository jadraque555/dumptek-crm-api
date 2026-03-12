import { Context } from 'koa';
import { eq, desc, and, sql, gte, lte, ilike } from 'drizzle-orm';
import { db } from '../db';
import { calls, prospects } from '../db/schema';
import { NotFoundError, BadRequestError } from '../utils/apiErrors';
import { autoCreateProspect, needsReview } from '../services/prospectService';

export async function listCalls(ctx: Context) {
  const {
    limit = 50,
    offset = 0,
    status,
    requiresReview,
    classification,
    sentiment,
    minScore,
    maxScore,
    prospectName,
    dotNumber,
  } = ctx.query;

  let query = db
    .select({
      call: calls,
      prospect: prospects,
    })
    .from(calls)
    .leftJoin(prospects, eq(calls.prospectId, prospects.id))
    .orderBy(desc(calls.createdAt));

  // Apply filters
  const conditions = [];
  if (status) {
    conditions.push(eq(calls.transcriptionStatus, status as any));
  }
  if (requiresReview === 'true') {
    conditions.push(eq(calls.requiresReview, true));
  }
  if (classification) {
    conditions.push(eq(calls.callClassification, String(classification)));
  }
  if (sentiment) {
    conditions.push(eq(calls.sentiment, sentiment as any));
  }
  if (minScore) {
    conditions.push(gte(calls.prospectScore, Number(minScore)));
  }
  if (maxScore) {
    conditions.push(lte(calls.prospectScore, Number(maxScore)));
  }
  if (prospectName) {
    conditions.push(ilike(prospects.companyName, `%${prospectName}%`));
  }
  if (dotNumber) {
    conditions.push(ilike(prospects.dotNumber, `%${dotNumber}%`));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const results = await query.limit(Number(limit)).offset(Number(offset));

  // Flatten results: merge call + prospect
  const flatResults = results.map(({ call, prospect }) => ({
    ...call,
    prospectName: prospect?.companyName ?? null,
    prospectDotNumber: prospect?.dotNumber ?? null,
  }));

  // Get total count with same filters
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(calls);
  if (prospectName || dotNumber) {
    countQuery = countQuery.leftJoin(prospects, eq(calls.prospectId, prospects.id)) as any;
  }
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }
  const [{ count }] = await countQuery;

  ctx.body = {
    data: flatResults,
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
