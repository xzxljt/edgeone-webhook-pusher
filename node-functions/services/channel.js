import { generateId, now, maskCredentials } from '../shared/utils.js';
import { getChannelAdapter, getSensitiveFields } from '../shared/channels/registry.js';
import { channelsKV } from './kv-client.js';

class ChannelService {
  /**
   * Get all channels for a user
   * @param {string} userId
   * @returns {Promise<Object[]>}
   */
  async getChannels(userId) {
    const keys = await channelsKV.list(`${userId}_`);
    const channels = [];

    for (const key of keys) {
      const channel = await channelsKV.get(key);
      if (channel) {
        channels.push(channel);
      }
    }

    return channels;
  }

  /**
   * Get enabled channels for a user
   * @param {string} userId
   * @returns {Promise<Object[]>}
   */
  async getEnabledChannels(userId) {
    const channels = await this.getChannels(userId);
    return channels.filter((c) => c.enabled);
  }

  /**
   * Get channel by ID
   * @param {string} userId
   * @param {string} channelId
   * @returns {Promise<Object|null>}
   */
  async getChannel(userId, channelId) {
    return channelsKV.get(`${userId}_${channelId}`);
  }

  /**
   * Create a new channel
   * @param {string} userId
   * @param {string} type
   * @param {string} name
   * @param {Object} credentials
   * @returns {Promise<Object>}
   */
  async createChannel(userId, type, name, credentials) {
    // Validate credentials
    const adapter = getChannelAdapter(type);
    if (!adapter) {
      throw new Error(`Unsupported channel type: ${type}`);
    }

    const isValid = await adapter.validate(credentials);
    if (!isValid) {
      throw new Error('Invalid channel credentials');
    }

    const id = generateId();
    const timestamp = now();

    const channel = {
      id,
      userId,
      type,
      name,
      enabled: true,
      credentials,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await channelsKV.put(`${userId}_${id}`, channel);
    return channel;
  }

  /**
   * Update channel
   * @param {string} userId
   * @param {string} channelId
   * @param {Object} updates
   * @returns {Promise<Object|null>}
   */
  async updateChannel(userId, channelId, updates) {
    const channel = await this.getChannel(userId, channelId);
    if (!channel) return null;

    // If credentials are being updated, validate them
    if (updates.credentials) {
      const adapter = getChannelAdapter(channel.type);
      if (adapter) {
        const isValid = await adapter.validate(updates.credentials);
        if (!isValid) {
          throw new Error('Invalid channel credentials');
        }
      }
    }

    const updated = {
      ...channel,
      ...updates,
      updatedAt: now(),
    };

    await channelsKV.put(`${userId}_${channelId}`, updated);
    return updated;
  }

  /**
   * Delete channel
   * @param {string} userId
   * @param {string} channelId
   * @returns {Promise<boolean>}
   */
  async deleteChannel(userId, channelId) {
    const channel = await this.getChannel(userId, channelId);
    if (!channel) return false;

    await channelsKV.delete(`${userId}_${channelId}`);
    return true;
  }

  /**
   * Mask sensitive credentials in channel data
   * @param {Object} channel
   * @returns {Object}
   */
  maskChannelCredentials(channel) {
    const sensitiveFields = getSensitiveFields(channel.type);
    return {
      ...channel,
      credentials: maskCredentials(channel.credentials, sensitiveFields),
    };
  }
}

export const channelService = new ChannelService();
