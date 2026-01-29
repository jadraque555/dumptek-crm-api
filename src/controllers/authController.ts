import { Context } from 'koa';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { BadRequestError, UnauthorizedError } from '../utils/apiErrors';

export async function login(ctx: Context) {
  const { email, password } = ctx.request.body as any;
  
  if (!email || !password) {
    throw new BadRequestError('Email and password are required');
  }
  
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }
  
  if (!user.isActive) {
    throw new UnauthorizedError('Account is inactive');
  }
  
  const isValidPassword = await comparePassword(password, user.passwordHash);
  
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid credentials');
  }
  
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  
  ctx.body = {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  };
}

export async function register(ctx: Context) {
  const { email, password, firstName, lastName, role } = ctx.request.body as any;
  
  // Only sales managers can create new users
  if (ctx.state.user.role !== 'sales_manager') {
    throw new UnauthorizedError('Only sales managers can create users');
  }
  
  if (!email || !password || !firstName || !lastName) {
    throw new BadRequestError('All fields are required');
  }
  
  // Check if user exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  if (existingUser) {
    throw new BadRequestError('User already exists');
  }
  
  const passwordHash = await hashPassword(password);
  
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      firstName,
      lastName,
      role: role || 'account_representative',
    })
    .returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    });
  
  ctx.body = newUser;
}

export async function me(ctx: Context) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, ctx.state.user.userId))
    .limit(1);
  
  if (!user) {
    throw new UnauthorizedError('User not found');
  }
  
  ctx.body = user;
}
