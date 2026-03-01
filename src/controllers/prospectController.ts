import { Context } from 'koa';
import { eq, desc, and, sql, like, or } from 'drizzle-orm';
import { db } from '../db';
import { prospects, users, calls, activities } from '../db/schema';
import { NotFoundError, BadRequestError } from '../utils/apiErrors';
import { enrichProspectWithFMCSA } from '../services/prospectService';
import { createDumptekCompany, getDumptekCompany, getStripeSubscription } from '../services/dumptekService';

export async function listProspects(ctx: Context) {
  const { 
    limit = 50, 
    offset = 0, 
    status, 
    assignedTo,
    search,
  } = ctx.query;
  
  let query = db
    .select({
      prospect: prospects,
      assignedUser: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      },
    })
    .from(prospects)
    .leftJoin(users, eq(prospects.assignedToUserId, users.id))
    .orderBy(desc(prospects.createdAt));
  
  const conditions = [];
  
  // Role-based filtering
  if (ctx.state.user.role === 'account_representative') {
    conditions.push(eq(prospects.assignedToUserId, ctx.state.user.userId));
  }
  
  if (status) {
    conditions.push(eq(prospects.status, status as any));
  }
  
  if (assignedTo) {
    conditions.push(eq(prospects.assignedToUserId, Number(assignedTo)));
  }
  
  if (search) {
    conditions.push(
      or(
        like(prospects.companyName, `%${search}%`),
        like(prospects.phone, `%${search}%`),
        like(prospects.dotNumber, `%${search}%`)
      )!
    );
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  const results = await query.limit(Number(limit)).offset(Number(offset));
  
  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(prospects);
  
  ctx.body = {
    data: results,
    pagination: {
      total: Number(count),
      limit: Number(limit),
      offset: Number(offset),
    },
  };
}

export async function getProspect(ctx: Context) {
  const { id } = ctx.params;
  
  const [result] = await db
    .select({
      prospect: prospects,
      assignedUser: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      },
    })
    .from(prospects)
    .leftJoin(users, eq(prospects.assignedToUserId, users.id))
    .where(eq(prospects.id, Number(id)))
    .limit(1);
  
  if (!result) {
    throw new NotFoundError('Prospect not found');
  }
  
  // Check permissions
  if (
    ctx.state.user.role === 'account_representative' &&
    result.prospect.assignedToUserId !== ctx.state.user.userId
  ) {
    throw new NotFoundError('Prospect not found');
  }
  
  // Get related calls
  const relatedCalls = await db
    .select()
    .from(calls)
    .where(eq(calls.prospectId, Number(id)))
    .orderBy(desc(calls.createdAt));
  
  // Get activities
  const relatedActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.prospectId, Number(id)))
    .orderBy(desc(activities.createdAt));
  
  ctx.body = {
    ...result,
    calls: relatedCalls,
    activities: relatedActivities,
  };
}

export async function createProspect(ctx: Context) {
  const data = ctx.request.body as any;
  
  if (!data.companyName) {
    throw new BadRequestError('Company name is required');
  }
  
  const [prospect] = await db
    .insert(prospects)
    .values({
      ...data,
      source: 'manual',
      assignedToUserId: data.assignedToUserId || ctx.state.user.userId,
    })
    .returning();
  
  ctx.body = prospect;
}

export async function updateProspect(ctx: Context) {
  const { id } = ctx.params;
  const data = ctx.request.body as any;
  
  const [prospect] = await db
    .update(prospects)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(prospects.id, Number(id)))
    .returning();
  
  if (!prospect) {
    throw new NotFoundError('Prospect not found');
  }
  
  ctx.body = prospect;
}

export async function enrichWithFMCSA(ctx: Context) {
  const { id } = ctx.params;
  const { dotNumber } = ctx.request.body as any;
  
  await enrichProspectWithFMCSA(Number(id), dotNumber);
  
  ctx.body = { message: 'Prospect enriched with FMCSA data' };
}

export async function promoteToCustomer(ctx: Context) {
  const { id } = ctx.params;
  
  // Only sales managers can promote
  if (ctx.state.user.role !== 'sales_manager') {
    throw new BadRequestError('Only sales managers can promote prospects');
  }
  
  const [prospect] = await db
    .select()
    .from(prospects)
    .where(eq(prospects.id, Number(id)))
    .limit(1);
  
  if (!prospect) {
    throw new NotFoundError('Prospect not found');
  }
  
  if (prospect.dumptekCompanyId) {
    throw new BadRequestError('Prospect already promoted to customer');
  }

  // Create in Dumptek
  let dumptekCompany;
  try {
    dumptekCompany = await createDumptekCompany(prospect);
  } catch (error: any) {
    const detail =
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      'Unknown error from Dumptek API';
      console.log("sulod dri error", detail);
    throw new BadRequestError(`Failed to create company in Dumptek: ${detail}`);
  }

  // Update prospect
  await db
    .update(prospects)
    .set({
      dumptekCompanyId: dumptekCompany.id,
      status: 'customer',
      updatedAt: new Date(),
    })
    .where(eq(prospects.id, prospect.id));

  ctx.body = {
    message: 'Prospect promoted to customer',
    dumptekCompanyId: dumptekCompany.id,
  };
}

export async function getStripeInfo(ctx: Context) {
  const { id } = ctx.params;
  
  const [prospect] = await db
    .select()
    .from(prospects)
    .where(eq(prospects.id, Number(id)))
    .limit(1);
  
  if (!prospect) {
    throw new NotFoundError('Prospect not found');
  }
  
  if (!prospect.dumptekCompanyId) {
    throw new BadRequestError('Prospect is not a customer yet');
  }
  
  const subscription = await getStripeSubscription(prospect.dumptekCompanyId);
  
  ctx.body = { subscription };
}
