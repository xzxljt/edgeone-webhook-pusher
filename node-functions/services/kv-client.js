/**
 * KV Client - Wrapper for Edge Functions KV API
 * Calls the Edge Functions to perform KV operations
 */

// Base URL for KV API (Edge Functions)
const KV_BASE_URL = process.env.KV_BASE_URL || '';

/**
 * Create a KV client for a specific namespace
 * @param {string} namespace - KV namespace (users, channels, messages)
 * @returns {Object}
 */
function createKVClient(namespace) {
  const baseUrl = `${KV_BASE_URL}/api/kv/${namespace}`;

  return {
    /**
     * Get value by key
     * @param {string} key
     * @returns {Promise<any>}
     */
    async get(key) {
      const res = await fetch(`${baseUrl}?action=get&key=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'KV get failed');
      }
      return data.data;
    },

    /**
     * Put value by key
     * @param {string} key
     * @param {any} value
     * @param {number} [ttl]
     * @returns {Promise<void>}
     */
    async put(key, value, ttl) {
      const res = await fetch(`${baseUrl}?action=put`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, ttl }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'KV put failed');
      }
    },

    /**
     * Delete value by key
     * @param {string} key
     * @returns {Promise<void>}
     */
    async delete(key) {
      const res = await fetch(`${baseUrl}?action=delete&key=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'KV delete failed');
      }
    },

    /**
     * List keys with prefix
     * @param {string} [prefix]
     * @param {number} [limit]
     * @returns {Promise<string[]>}
     */
    async list(prefix = '', limit = 256) {
      const params = new URLSearchParams({
        action: 'list',
        prefix,
        limit: String(limit),
      });
      const res = await fetch(`${baseUrl}?${params}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'KV list failed');
      }
      return data.keys || [];
    },
  };
}

// Export KV clients for each namespace
export const usersKV = createKVClient('users');
export const channelsKV = createKVClient('channels');
export const messagesKV = createKVClient('messages');
