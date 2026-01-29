import { Context, Next } from 'koa';
import { ApiError } from '../utils/apiErrors';
import logger from '../utils/logger';

export async function errorHandler(ctx: Context, next: Next) {
  try {
    await next();
  } catch (err: any) {
    logger.error('Error:', err);
    
    if (err instanceof ApiError) {
      ctx.status = err.statusCode;
      ctx.body = {
        error: err.message,
        statusCode: err.statusCode,
      };
    } else {
      ctx.status = 500;
      ctx.body = {
        error: 'Internal Server Error',
        statusCode: 500,
        ...(process.env.NODE_ENV === 'development' && { details: err.message }),
      };
    }
  }
}
