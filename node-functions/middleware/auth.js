import { ErrorCodes } from '../shared/types.js';
import { authService } from '../services/auth.js';

/**
 * Authentication middleware
 * Validates Authorization header and attaches user to context
 * @param {Object} ctx - Koa context
 * @param {Function} next - Next middleware
 */
export async function authMiddleware(ctx, next) {
  const authHeader = ctx.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.status = 401;
    ctx.body = {
      code: ErrorCodes.INVALID_SENDKEY,
      message: 'Missing or invalid Authorization header',
    };
    return;
  }

  const sendKey = authHeader.slice(7); // Remove 'Bearer ' prefix

  const user = await authService.validateSendKey(sendKey);
  if (!user) {
    ctx.status = 401;
    ctx.body = {
      code: ErrorCodes.INVALID_SENDKEY,
      message: 'Invalid SendKey',
    };
    return;
  }

  // Attach user to context
  ctx.state.user = user;
  ctx.state.userId = user.id;

  await next();
}
