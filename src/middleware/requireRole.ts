import { Context, Next } from 'koa';
import { ForbiddenError } from '../utils/apiErrors';

export function requireRole(...allowedRoles: string[]) {
  return async (ctx: Context, next: Next) => {
    if (!ctx.state.user) {
      throw new ForbiddenError('Authentication required');
    }
    
    if (!allowedRoles.includes(ctx.state.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    
    await next();
  };
}
