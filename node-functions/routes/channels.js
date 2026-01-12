import Router from '@koa/router';
import { ErrorCodes } from '../shared/types.js';
import { channelService } from '../services/channel.js';
import { getSupportedChannelTypes, getChannelAdapter } from '../shared/channels/registry.js';

const router = new Router();

/**
 * GET /channels - List all channels
 */
router.get('/', async (ctx) => {
  const channels = await channelService.getChannels(ctx.state.userId);

  // Mask credentials in response
  const maskedChannels = channels.map((c) => channelService.maskChannelCredentials(c));

  ctx.body = {
    code: 0,
    message: 'success',
    data: { channels: maskedChannels },
  };
});

/**
 * GET /channels/types - Get supported channel types
 */
router.get('/types', async (ctx) => {
  const types = getSupportedChannelTypes();
  const schemas = {};

  for (const type of types) {
    const adapter = getChannelAdapter(type);
    if (adapter) {
      schemas[type] = {
        name: adapter.name,
        schema: adapter.getConfigSchema(),
      };
    }
  }

  ctx.body = {
    code: 0,
    message: 'success',
    data: { types, schemas },
  };
});

/**
 * GET /channels/:id - Get channel by ID
 */
router.get('/:id', async (ctx) => {
  const channel = await channelService.getChannel(ctx.state.userId, ctx.params.id);

  if (!channel) {
    ctx.status = 404;
    ctx.body = {
      code: ErrorCodes.CHANNEL_NOT_FOUND,
      message: 'Channel not found',
    };
    return;
  }

  ctx.body = {
    code: 0,
    message: 'success',
    data: { channel: channelService.maskChannelCredentials(channel) },
  };
});

/**
 * POST /channels - Create new channel
 */
router.post('/', async (ctx) => {
  const { type, name, credentials } = ctx.request.body;

  if (!type || !name || !credentials) {
    ctx.status = 400;
    ctx.body = {
      code: ErrorCodes.INVALID_PARAM,
      message: 'Missing required fields: type, name, credentials',
    };
    return;
  }

  try {
    const channel = await channelService.createChannel(
      ctx.state.userId,
      type,
      name,
      credentials
    );

    ctx.body = {
      code: 0,
      message: 'success',
      data: { channel: channelService.maskChannelCredentials(channel) },
    };
  } catch (error) {
    ctx.status = 400;
    ctx.body = {
      code: ErrorCodes.INVALID_CHANNEL_CONFIG,
      message: error.message,
    };
  }
});

/**
 * PUT /channels/:id - Update channel
 */
router.put('/:id', async (ctx) => {
  const { name, enabled, credentials } = ctx.request.body;

  try {
    const channel = await channelService.updateChannel(
      ctx.state.userId,
      ctx.params.id,
      { name, enabled, credentials }
    );

    if (!channel) {
      ctx.status = 404;
      ctx.body = {
        code: ErrorCodes.CHANNEL_NOT_FOUND,
        message: 'Channel not found',
      };
      return;
    }

    ctx.body = {
      code: 0,
      message: 'success',
      data: { channel: channelService.maskChannelCredentials(channel) },
    };
  } catch (error) {
    ctx.status = 400;
    ctx.body = {
      code: ErrorCodes.INVALID_CHANNEL_CONFIG,
      message: error.message,
    };
  }
});

/**
 * DELETE /channels/:id - Delete channel
 */
router.delete('/:id', async (ctx) => {
  const deleted = await channelService.deleteChannel(ctx.state.userId, ctx.params.id);

  if (!deleted) {
    ctx.status = 404;
    ctx.body = {
      code: ErrorCodes.CHANNEL_NOT_FOUND,
      message: 'Channel not found',
    };
    return;
  }

  ctx.body = {
    code: 0,
    message: 'success',
  };
});

export const channelsRouter = router;
