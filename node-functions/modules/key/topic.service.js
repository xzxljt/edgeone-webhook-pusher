/**
 * Topic Service - 管理群发主题
 * Module: key
 */

import { topicsKV } from '../../shared/kv-client.js';
import { generateId, generateTopicKey, now, createRateLimitState, checkRateLimit } from '../../shared/utils.js';
import { KVKeys } from '../../shared/types.js';

class TopicService {
  /**
   * 创建 Topic
   * @param {string} name - 名称
   * @returns {Promise<Object>}
   */
  async create(name) {
    const id = `tp_${generateId()}`;
    const key = generateTopicKey();
    const timestamp = now();

    const data = {
      id,
      key,
      name,
      subscriberRefs: [],
      rateLimit: createRateLimitState(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await topicsKV.put(KVKeys.TOPIC(id), data);
    await topicsKV.put(KVKeys.TOPIC_INDEX(key), id);

    return data;
  }

  /**
   * 获取 Topic 列表
   * @param {{ search?: string }} options
   * @returns {Promise<Object[]>}
   */
  async list(options = {}) {
    const keys = await topicsKV.listAll('tp:');
    const records = [];

    for (const kvKey of keys) {
      const data = await topicsKV.get(kvKey);
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
   * 根据 ID 获取 Topic
   * @param {string} id
   * @returns {Promise<Object | null>}
   */
  async get(id) {
    return topicsKV.get(KVKeys.TOPIC(id));
  }

  /**
   * 根据 Key 值查找 Topic
   * @param {string} key - TPK 前缀的 Key
   * @returns {Promise<Object | null>}
   */
  async findByKey(key) {
    const id = await topicsKV.get(KVKeys.TOPIC_INDEX(key));
    if (!id) return null;
    return this.get(id);
  }

  /**
   * 更新 Topic
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

    await topicsKV.put(KVKeys.TOPIC(id), updatedData);
    return updatedData;
  }

  /**
   * 删除 Topic
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const data = await this.get(id);
    if (!data) return false;

    await topicsKV.delete(KVKeys.TOPIC(id));
    await topicsKV.delete(KVKeys.TOPIC_INDEX(data.key));

    return true;
  }

  /**
   * 添加订阅者
   * @param {string} id - Topic ID
   * @param {string} openIdRef - OpenID 记录 ID
   * @returns {Promise<boolean>}
   */
  async subscribe(id, openIdRef) {
    const data = await this.get(id);
    if (!data) return false;

    if (data.subscriberRefs.includes(openIdRef)) {
      return true; // 已订阅
    }

    const updatedData = {
      ...data,
      subscriberRefs: [...data.subscriberRefs, openIdRef],
      updatedAt: now(),
    };

    await topicsKV.put(KVKeys.TOPIC(id), updatedData);
    return true;
  }

  /**
   * 移除订阅者
   * @param {string} id - Topic ID
   * @param {string} openIdRef - OpenID 记录 ID
   * @returns {Promise<boolean>}
   */
  async unsubscribe(id, openIdRef) {
    const data = await this.get(id);
    if (!data) return false;

    if (!data.subscriberRefs.includes(openIdRef)) {
      return true; // 未订阅
    }

    const updatedData = {
      ...data,
      subscriberRefs: data.subscriberRefs.filter((ref) => ref !== openIdRef),
      updatedAt: now(),
    };

    await topicsKV.put(KVKeys.TOPIC(id), updatedData);
    return true;
  }

  /**
   * 获取订阅者数量
   * @param {string} id - Topic ID
   * @returns {Promise<number>}
   */
  async getSubscriberCount(id) {
    const data = await this.get(id);
    return data?.subscriberRefs?.length || 0;
  }

  /**
   * 获取订阅者列表
   * @param {string} id - Topic ID
   * @returns {Promise<string[]>}
   */
  async getSubscribers(id) {
    const data = await this.get(id);
    return data?.subscriberRefs || [];
  }

  /**
   * 从所有 Topic 中移除 OpenID
   * @param {string} openIdRef - OpenID 记录 ID
   * @returns {Promise<number>} - 更新的 Topic 数量
   */
  async removeOpenIdFromAll(openIdRef) {
    const topics = await this.list();
    let count = 0;

    for (const topic of topics) {
      if (topic.subscriberRefs.includes(openIdRef)) {
        await this.unsubscribe(topic.id, openIdRef);
        count++;
      }
    }

    return count;
  }

  /**
   * 生成订阅 URL
   * @param {string} id - Topic ID
   * @param {string} baseUrl - 基础 URL
   * @returns {string}
   */
  getSubscribeUrl(id, baseUrl = '') {
    return `${baseUrl}/subscribe/${id}`;
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

    await topicsKV.put(KVKeys.TOPIC(id), updatedData);
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

export const topicService = new TopicService();
