import { generateSendKey, generateId, now } from '../shared/utils.js';
import { usersKV } from './kv-client.js';

class AuthService {
  /**
   * Validate SendKey and return user data
   * @param {string} sendKey
   * @returns {Promise<Object|null>}
   */
  async validateSendKey(sendKey) {
    // Look up userId by SendKey index
    const userId = await usersKV.get(`sk_${sendKey}`);
    if (!userId) return null;

    // Get user data
    const user = await usersKV.get(userId);
    if (!user || user.sendKey !== sendKey) return null;

    return user;
  }

  /**
   * Get user by ID
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  async getUserById(userId) {
    return usersKV.get(userId);
  }

  /**
   * Create a new user with SendKey
   * @returns {Promise<Object>}
   */
  async createUser() {
    const id = generateId();
    const sendKey = generateSendKey();
    const timestamp = now();

    const user = {
      id,
      sendKey,
      createdAt: timestamp,
      rateLimit: {
        count: 0,
        resetAt: new Date(Date.now() + 60000).toISOString(),
      },
    };

    // Save user data
    await usersKV.put(id, user);
    // Create SendKey index
    await usersKV.put(`sk_${sendKey}`, id);

    return user;
  }

  /**
   * Regenerate SendKey for user
   * @param {string} userId
   * @returns {Promise<string|null>}
   */
  async regenerateSendKey(userId) {
    const user = await usersKV.get(userId);
    if (!user) return null;

    const oldSendKey = user.sendKey;
    const newSendKey = generateSendKey();

    // Update user with new SendKey
    user.sendKey = newSendKey;
    await usersKV.put(userId, user);

    // Delete old index, create new one
    await usersKV.delete(`sk_${oldSendKey}`);
    await usersKV.put(`sk_${newSendKey}`, userId);

    return newSendKey;
  }

  /**
   * Update rate limit for user
   * @param {string} userId
   * @param {{ count: number, resetAt: string }} rateLimit
   * @returns {Promise<void>}
   */
  async updateRateLimit(userId, rateLimit) {
    const user = await usersKV.get(userId);
    if (!user) return;

    user.rateLimit = rateLimit;
    await usersKV.put(userId, user);
  }
}

export const authService = new AuthService();
