import Router from '@koa/router';
import { ErrorCodes } from '../shared/types.js';
import { historyService } from '../services/history.js';

const router = new Router();

/**
 * GET /messages - List message history
 */
router.get('/', async (ctx) => {
  const limit = parseInt(ctx.query.limit || '20', 10);
  const cursor = ctx.query.cursor;

  const result = await historyService.getMessages(ctx.state.userId, { limit, cursor });

  ctx.body = {
    code: 0,
    message: 'success',
    data: result,
  };
});

/**
 * GET /messages/:id - Get message by ID
 */
router.get('/:id', async (ctx) => {
  const message = await historyService.getMessage(ctx.state.userId, ctx.params.id);

  if (!message) {
    ctx.status = 404;
    ctx.body = {
      code: ErrorCodes.MESSAGE_NOT_FOUND,
      message: 'Message not found',
    };
    return;
  }

  ctx.body = {
    code: 0,
    message: 'success',
    data: { message },
  };
});

/**
 * DELETE /messages/:id - Delete message
 */
router.delete('/:id', async (ctx) => {
  const deleted = await historyService.deleteMessage(ctx.state.userId, ctx.params.id);

  if (!deleted) {
    ctx.status = 404;
    ctx.body = {
      code: ErrorCodes.MESSAGE_NOT_FOUND,
      message: 'Message not found',
    };
    return;
  }

  ctx.body = {
    code: 0,
    message: 'success',
  };
});

export const messagesRouter = router;
