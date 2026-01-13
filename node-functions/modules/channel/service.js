/**
 * Channel Service - 渠道配置管理
 * Module: channel
 */

import { configKV } from '../../shared/kv-client.js';
import { maskCredential } from '../../shared/utils.js';
import {
  getChannelAdapter,
  getAllChannelsInfo,
  getSensitiveFields,
  validateChannelCredentials,
  sendViaChannel,
} from './adapters/registry.js';

const CONFIG_KEY = 'config';

class ChannelService {
  /**
   * 获取渠道配置
   * @param {string} type - 渠道类型
   * @param {boolean} mask - 是否脱敏
   * @returns {Promise<Object | null>}
   */
  async getConfig(type, mask = true) {
    const config = await configKV.get(CONFIG_KEY);
    if (!config) return null;

    const channelConfig = config.channels?.[type] || config.wechat; // 兼容旧配置
    if (!channelConfig) return null;

    if (mask) {
      return this.maskConfig(type, channelConfig);
    }
    return channelConfig;
  }

  /**
   * 更新渠道配置
   * @param {string} type - 渠道类型
   * @param {Object} channelConfig - 渠道配置
   * @returns {Promise<{ valid: boolean, error?: string }>}
   */
  async updateConfig(type, channelConfig) {
    // 验证配置
    const validation = await validateChannelCredentials(type, channelConfig);
    if (!validation.valid) {
      return validation;
    }

    // 获取现有配置
    const config = (await configKV.get(CONFIG_KEY)) || {};

    // 更新渠道配置
    if (!config.channels) {
      config.channels = {};
    }
    config.channels[type] = channelConfig;

    // 兼容旧配置结构
    if (type === 'wechat-template') {
      config.wechat = channelConfig;
    }

    config.updatedAt = new Date().toISOString();

    await configKV.put(CONFIG_KEY, config);
    return { valid: true };
  }

  /**
   * 验证渠道配置
   * @param {string} type - 渠道类型
   * @param {Object} channelConfig - 渠道配置
   * @returns {Promise<{ valid: boolean, error?: string }>}
   */
  async validateConfig(type, channelConfig) {
    return validateChannelCredentials(type, channelConfig);
  }

  /**
   * 脱敏渠道配置
   * @param {string} type - 渠道类型
   * @param {Object} channelConfig - 渠道配置
   * @returns {Object}
   */
  maskConfig(type, channelConfig) {
    const sensitiveFields = getSensitiveFields(type);
    const masked = { ...channelConfig };

    for (const field of sensitiveFields) {
      if (masked[field]) {
        masked[field] = maskCredential(masked[field]);
      }
    }

    return masked;
  }

  /**
   * 获取所有渠道列表
   * @returns {Object[]}
   */
  listChannels() {
    return getAllChannelsInfo();
  }

  /**
   * 获取渠道适配器
   * @param {string} type - 渠道类型
   * @returns {Object | undefined}
   */
  getAdapter(type) {
    return getChannelAdapter(type);
  }

  /**
   * 通过渠道发送消息
   * @param {string} type - 渠道类型
   * @param {Object} message - 消息
   * @param {Object} credentials - 凭证
   * @returns {Promise<{ success: boolean, error?: string, externalId?: string }>}
   */
  async send(type, message, credentials) {
    return sendViaChannel(type, message, credentials);
  }

  /**
   * 获取默认渠道的完整凭证
   * @param {string} openId - 目标 OpenID
   * @returns {Promise<Object | null>}
   */
  async getDefaultCredentials(openId) {
    const config = await configKV.get(CONFIG_KEY);
    const wechat = config?.wechat || config?.channels?.['wechat-template'];

    if (!wechat?.appId || !wechat?.appSecret || !wechat?.templateId) {
      return null;
    }

    return {
      appId: wechat.appId,
      appSecret: wechat.appSecret,
      templateId: wechat.templateId,
      openId,
    };
  }
}

export const channelService = new ChannelService();
