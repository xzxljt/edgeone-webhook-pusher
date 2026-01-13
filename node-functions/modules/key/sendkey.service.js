/**
 * SendKey Service - 管理单发密钥
 * Module: key
 */

import { sendkeysKV } from '../../shared/kv-client.js';
import { generateId, generateSendKey, now, createRateLimitState, checkRateLimit } from '../../shared/utils.js';
import { KVKeys } from '../../shared/types.js';

class SendKeyService {
  /**
   * 创建 SendKey
   * @param {string} name - 名称
   * @param {string} [openIdRef] - OpenID 记录 ID (可选)
   * @returns {Promise<Object>}
   */
  async create(name, openIdRef = null) {
    const id = `sk_${generateId()}`;
    const key = generateSendKey();
    const timestamp = now();

    const data = {
      id,
      key,
      name,
      openIdRef,
      rateLimit: createRateLimitState(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await sendkeysKV.put(KVKeys.SENDKEY(id), data);
    await sendkeysKV.put(KVKeys.SENDKEY_INDEX(key), id);

    return data;
  }

  /**
   * 获取 SendKey 列表
   * @param {{ search?: string }} options
   * @returns {Promise<Object[]>}
   */
  async list(options = {}) {
    const keys = await sendkeysKV.listAll('sk:');
    const records = [];

    for (const kvKey of keys) {
      const data = await sendkeysKV.get(kvKey);
      if (data) {
        if (options.search && !data.name.includes(options.search)) {
          continue;
        }
        records.push(data);
      }
    }

    return records;
  }

  /**
   * 根据 ID 获取 SendKey
   * @param {string} id
   * @returns {Promise<Object | null>}
   */
  async get(id) {
    return sendkeysKV.get(KVKeys.SENDKEY(id));
  }

  /**
   * 根据 Key 值查找 SendKey
   * @param {string} key - SCT 前缀的 Key
   * @returns {Promise<Object | null>}
   */
  async findByKey(key) {
    const id = await sendkeysKV.get(KVKeys.SENDKEY_INDEX(key));
    if (!id) return null;
    return this.get(id);
  }

  /**
   * 更新 SendKey
   * @param {string} id
   * @param {{ name?: string }} updates
   * @returns {Promise<Object | null>}
   */
  async update(id, updates) {
    const data = await this.get(id);
    if (!data) return null;

    const updatedData = {
      ...data,
      ...(updates.name !== undefined && { name: updates.name }),
      updatedAt: now(),
    };

    await sendkeysKV.put(KVKeys.SENDKEY(id), updatedData);
    return updatedData;
  }

  /**
   * 删除 SendKey
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const data = await this.get(id);
    if (!data) return false;

    await sendkeysKV.delete(KVKeys.SENDKEY(id));
    await sendkeysKV.delete(KVKeys.SENDKEY_INDEX(data.key));

    return true;
  }

  /**
   * 绑定用户到 SendKey
   * @param {string} id - SendKey ID
   * @param {string} openIdRef - OpenID 记录 ID
   * @returns {Promise<boolean>}
   */
  async bind(id, openIdRef) {
    const data = await this.get(id);
    if (!data) return false;

    const updatedData = {
      ...data,
      openIdRef,
      updatedAt: now(),
    };

    await sendkeysKV.put(KVKeys.SENDKEY(id), updatedData);
    return true;
  }

  /**
   * 解绑 SendKey
   * @param {string} id - SendKey ID
   * @returns {Promise<boolean>}
   */
  async unbind(id) {
    const data = await this.get(id);
    if (!data) return false;

    const updatedData = {
      ...data,
      openIdRef: null,
      updatedAt: now(),
    };

    await sendkeysKV.put(KVKeys.SENDKEY(id), updatedData);
    return true;
  }

  /**
   * 生成绑定 URL
   * @param {string} id - SendKey ID
   * @param {string} baseUrl - 基础 URL
   * @returns {string}
   */
  getBindUrl(id, baseUrl = '') {
    return `${baseUrl}/bindkey/${id}`;
  }

  /**
   * 检查频率限制
   * @param {string} id
   * @param {number} limit
   * @returns {Promise<{ allowed: boolean, remaining: number, resetAt: string }>}
   */
  async checkRateLimit(id, limit = 5) {
    const data = await this.get(id);
    if (!data) return { allowed: false, remaining: 0, resetAt: '' };

    const result = checkRateLimit(data.rateLimit, limit);
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: result.resetAt,
    };
  }

  /**
   * 增加频率计数
   * @param {string} id
   * @param {number} limit
   * @returns {Promise<void>}
   */
  async incrementRateLimit(id, limit = 5) {
    const data = await this.get(id);
    if (!data) return;

    const result = checkRateLimit(data.rateLimit, limit);
    const updatedData = {
      ...data,
      rateLimit: { count: result.newCount, resetAt: result.resetAt },
    };

    await sendkeysKV.put(KVKeys.SENDKEY(id), updatedData);
  }

  /**
   * 脱敏 Key 值
   * @param {Object} data
   * @returns {Object}
   */
  maskKey(data) {
    if (!data) return data;
    return {
      ...data,
      key: data.key ? `${data.key.slice(0, 7)}***${data.key.slice(-4)}` : undefined,
    };
  }
}

export const sendkeyService = new SendKeyService();
