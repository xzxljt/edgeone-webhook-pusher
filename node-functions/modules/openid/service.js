/**
 * OpenID Service - 管理微信用户 OpenID 记录
 * Module: openid
 */

import { openidsKV } from '../../shared/kv-client.js';
import { generateId, now } from '../../shared/utils.js';
import { KVKeys } from '../../shared/types.js';

/**
 * OpenID 来源类型
 */
export const OpenIdSource = {
  OAUTH: 'oauth',      // 扫码绑定
  MESSAGE: 'message',  // 消息绑定
};

/**
 * OpenIdService - 管理 OpenID（微信用户）记录
 */
class OpenIdService {
  /**
   * 创建新的 OpenID 记录
   * @param {string} openId - 微信 OpenID
   * @param {string} source - 来源 (oauth/message)
   * @param {string} [name] - 显示名称
   * @returns {Promise<import('../../shared/types.js').OpenIdData>}
   */
  async create(openId, source, name) {
    // 检查 OpenID 是否已存在
    const existing = await this.findByOpenId(openId);
    if (existing) {
      throw new Error('OpenID already exists');
    }

    const id = `oid_${generateId()}`;
    const timestamp = now();

    const data = {
      id,
      openId,
      name: name || undefined,
      source,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // 保存数据和索引
    await openidsKV.put(KVKeys.OPENID(id), data);
    await openidsKV.put(KVKeys.OPENID_INDEX(openId), id);

    return data;
  }

  /**
   * 获取或创建 OpenID 记录
   * @param {string} openId - 微信 OpenID
   * @param {string} source - 来源 (oauth/message)
   * @returns {Promise<import('../../shared/types.js').OpenIdData>}
   */
  async getOrCreate(openId, source) {
    const existing = await this.findByOpenId(openId);
    if (existing) {
      return existing;
    }
    return this.create(openId, source);
  }

  /**
   * 获取所有 OpenID 记录
   * @returns {Promise<import('../../shared/types.js').OpenIdData[]>}
   */
  async list() {
    const result = await openidsKV.listAll('oid:');
    const records = [];

    for (const key of result) {
      const data = await openidsKV.get(key);
      if (data) {
        records.push(data);
      }
    }

    return records;
  }

  /**
   * 根据内部 ID 获取 OpenID 记录
   * @param {string} id - 内部 ID (oid_xxx)
   * @returns {Promise<import('../../shared/types.js').OpenIdData | null>}
   */
  async get(id) {
    return openidsKV.get(KVKeys.OPENID(id));
  }

  /**
   * 根据 OpenID 值查找记录
   * @param {string} openId - 微信 OpenID
   * @returns {Promise<import('../../shared/types.js').OpenIdData | null>}
   */
  async findByOpenId(openId) {
    const id = await openidsKV.get(KVKeys.OPENID_INDEX(openId));
    if (!id) return null;
    return this.get(id);
  }

  /**
   * 更新 OpenID 记录
   * @param {string} id - 内部 ID
   * @param {{ name?: string }} updates
   * @returns {Promise<import('../../shared/types.js').OpenIdData | null>}
   */
  async update(id, updates) {
    const data = await this.get(id);
    if (!data) return null;

    const updatedData = {
      ...data,
      name: updates.name !== undefined ? updates.name : data.name,
      updatedAt: now(),
    };

    await openidsKV.put(KVKeys.OPENID(id), updatedData);
    return updatedData;
  }

  /**
   * 删除 OpenID 记录
   * 注意：调用者应先检查 OpenID 是否被 SendKey 或 Topic 引用
   * @param {string} id - 内部 ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const data = await this.get(id);
    if (!data) return false;

    // 删除数据和索引
    await openidsKV.delete(KVKeys.OPENID(id));
    await openidsKV.delete(KVKeys.OPENID_INDEX(data.openId));

    return true;
  }

  /**
   * 批量获取 OpenID 记录
   * @param {string[]} ids - 内部 ID 数组
   * @returns {Promise<import('../../shared/types.js').OpenIdData[]>}
   */
  async getMany(ids) {
    const records = [];
    for (const id of ids) {
      const data = await this.get(id);
      if (data) {
        records.push(data);
      }
    }
    return records;
  }

  /**
   * 检查 OpenID 是否被 SendKey 或 Topic 引用
   * @param {string} id - 内部 ID
   * @param {Object} services - { sendkeyService, topicService }
   * @returns {Promise<{ referenced: boolean, sendkeys: string[], topics: string[] }>}
   */
  async checkReferences(id, services) {
    const { sendkeyService, topicService } = services;
    const sendkeys = [];
    const topics = [];

    // 检查 SendKeys
    if (sendkeyService) {
      const allSendkeys = await sendkeyService.list();
      for (const sk of allSendkeys) {
        if (sk.openIdRef === id) {
          sendkeys.push(sk.id);
        }
      }
    }

    // 检查 Topics
    if (topicService) {
      const allTopics = await topicService.list();
      for (const topic of allTopics) {
        if (topic.subscriberRefs?.includes(id)) {
          topics.push(topic.id);
        }
      }
    }

    return {
      referenced: sendkeys.length > 0 || topics.length > 0,
      sendkeys,
      topics,
    };
  }

  /**
   * 安全删除 OpenID 记录（检查引用）
   * @param {string} id - 内部 ID
   * @param {Object} services - { sendkeyService, topicService }
   * @returns {Promise<{ success: boolean, error?: string, references?: Object }>}
   */
  async safeDelete(id, services) {
    const refs = await this.checkReferences(id, services);
    
    if (refs.referenced) {
      return {
        success: false,
        error: 'OpenID is referenced by SendKeys or Topics',
        references: {
          sendkeys: refs.sendkeys,
          topics: refs.topics,
        },
      };
    }

    const deleted = await this.delete(id);
    return { success: deleted };
  }
}

export const openidService = new OpenIdService();
