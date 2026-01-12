import Router from '@koa/router';
import { authService } from '../services/auth.js';

const router = new Router();

/**
 * GET /user - Get current user info
 */
router.get('/', async (ctx) => {
  const user = ctx.state.user;

  ctx.body = {
    code: 0,
    message: 'success',
    data: {
      user: {
        id: user.id,
        sendKey: user.sendKey,
        createdAt: user.createdAt,
      },
    },
  };
});

/**
 * POST /user/regenerate-key - Regenerate SendKey
 */
router.post('/regenerate-key', async (ctx) => {
  const newSendKey = await authService.regenerateSendKey(ctx.state.userId);

  if (!newSendKey) {
    ctx.status = 500;
    ctx.body = {
      code: 50001,
      message: 'Failed to regenerate SendKey',
    };
    return;
  }

  ctx.body = {
    code: 0,
    message: 'success',
    data: { sendKey: newSendKey },
  };
});

export const userRouter = router;
