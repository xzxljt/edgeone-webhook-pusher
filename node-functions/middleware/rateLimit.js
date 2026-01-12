import { ErrorCodes } from '../shared/types.js';
import { checkRateLimit } from '../shared/utils.js';
import { authService } from '../services/auth.js';

/**
 * Rate limiting middleware
 * Limits requests to 60 per minute per user
 * @param {Object} ctx - Koa context
 * @param {Function} next - Next middleware
 */
export async function rateLimitMiddleware(ctx, next) {
  const user = ctx.state.user;
  if (!user) {
    // No user in context, skip rate limiting
    await next();
    return;
  }

  const result = checkRateLimit(user.rateLimit);

  // Set rate limit headers
  ctx.set('X-RateLimit-Limit', '60');
  ctx.set('X-RateLimit-Remaining', String(result.remaining));
  ctx.set('X-RateLimit-Reset', result.resetAt);

  if (!result.allowed) {
    ctx.status = 429;
    ctx.body = {
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded. Please try again later.',
    };
    return;
  }

  // Update rate limit count
  await authService.updateRateLimit(user.id, {
    count: user.rateLimit.count + 1,
    resetAt: result.resetAt,
  });

  await next();
}
