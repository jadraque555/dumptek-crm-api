import { Context, Next } from 'koa';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/apiErrors';

export async function authMiddleware(ctx: Context, next: Next) {
  const authHeader = ctx.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }
  
  const token = authHeader.substring(7);
  
  try {
    const payload = verifyToken(token);
    ctx.state.user = payload;
    await next();
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
}

export async function optionalAuth(ctx: Context, next: Next) {
  const authHeader = ctx.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = verifyToken(token);
      ctx.state.user = payload;
    } catch (error) {
      // Ignore invalid token in optional auth
    }
  }
  
  await next();
}
