import { generateId, now } from '../shared/utils.js';
import { getChannelAdapter } from '../shared/channels/registry.js';
import { messagesKV } from './kv-client.js';
import { channelService } from './channel.js';

class PushService {
  /**
   * Push message to all enabled channels
   * @param {string} userId
   * @param {{ title: string, desp?: string, channel?: string }} params
   * @returns {Promise<{ pushId: string, deliveryResults: Object[] }>}
   */
  async push(userId, params) {
    const { title, desp, channel: targetChannel } = params;
    const messageId = generateId();
    const timestamp = now();

    // Get enabled channels
    let channels = await channelService.getEnabledChannels(userId);

    // Filter by target channel if specified
    if (targetChannel) {
      channels = channels.filter((c) => c.id === targetChannel || c.name === targetChannel);
    }

    // Create message record
    const message = {
      id: messageId,
      userId,
      title,
      content: desp,
      createdAt: timestamp,
      deliveryResults: [],
    };

    // Send to each channel
    const deliveryResults = [];
    for (const channelData of channels) {
      const adapter = getChannelAdapter(channelData.type);
      if (!adapter) continue;

      const result = await adapter.send(
        { id: messageId, title, content: desp, createdAt: timestamp },
        channelData.credentials
      );

      const deliveryResult = {
        channelId: channelData.id,
        channelType: channelData.type,
        status: result.success ? 'success' : 'failed',
        error: result.error,
        externalId: result.externalId,
      };

      deliveryResults.push(deliveryResult);
    }

    // Save message with delivery results
    message.deliveryResults = deliveryResults;
    await messagesKV.put(`${userId}_${messageId}`, message);

    return { pushId: messageId, deliveryResults };
  }
}

export const pushService = new PushService();
