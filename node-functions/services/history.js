import { messagesKV } from './kv-client.js';

class HistoryService {
  /**
   * Get message history for a user
   * @param {string} userId
   * @param {{ limit?: number, cursor?: string }} options
   * @returns {Promise<{ messages: Object[], hasMore: boolean, cursor?: string }>}
   */
  async getMessages(userId, options = {}) {
    const { limit = 20 } = options;

    // Get all message keys for user
    const keys = await messagesKV.list(`${userId}_`, limit + 1);

    // Fetch messages
    const messages = [];
    for (const key of keys.slice(0, limit)) {
      const message = await messagesKV.get(key);
      if (message) {
        messages.push(message);
      }
    }

    // Sort by createdAt descending
    messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      messages: messages.slice(0, limit),
      hasMore: keys.length > limit,
      cursor: keys.length > limit ? keys[limit - 1] : undefined,
    };
  }

  /**
   * Get single message by ID
   * @param {string} userId
   * @param {string} messageId
   * @returns {Promise<Object|null>}
   */
  async getMessage(userId, messageId) {
    return messagesKV.get(`${userId}_${messageId}`);
  }

  /**
   * Delete message
   * @param {string} userId
   * @param {string} messageId
   * @returns {Promise<boolean>}
   */
  async deleteMessage(userId, messageId) {
    const message = await this.getMessage(userId, messageId);
    if (!message) return false;

    await messagesKV.delete(`${userId}_${messageId}`);
    return true;
  }
}

export const historyService = new HistoryService();
