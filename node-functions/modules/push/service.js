/**
 * Push Service - 消息推送核心逻辑
 * Module: push
 */

import { sendkeyService } from '../key/sendkey.service.js';
import { topicService } from '../key/topic.service.js';
import { openidService } from '../openid/service.js';
import { channelService } from '../channel/service.js';
import { historyService } from '../history/service.js';
import { generatePushId } from '../../shared/utils.js';
import { ErrorCodes } from '../../shared/error-codes.js';

const DEFAULT_CHANNEL = 'wechat-template';

class PushService {
  /**
   * 通过 SendKey 发送消息
   * @param {string} sendKey - SendKey 值
   * @param {string} title - 标题
   * @param {string} [desp] - 内容
   * @returns {Promise<Object>}
   */
  async pushBySendKey(sendKey, title, desp) {
    const pushId = generatePushId();
    const createdAt = new Date().toISOString();

    // 查找 SendKey
    const sendKeyData = await sendkeyService.findByKey(sendKey);
    if (!sendKeyData) {
      return { pushId, success: false, error: ErrorCodes.KEY_NOT_FOUND };
    }

    // 检查频率限制
    const rateLimit = await sendkeyService.checkRateLimit(sendKeyData.id);
    if (!rateLimit.allowed) {
      return { pushId, success: false, error: ErrorCodes.RATE_LIMIT_EXCEEDED };
    }

    // 获取 OpenID
    if (!sendKeyData.openIdRef) {
      return { pushId, success: false, error: ErrorCodes.OPENID_NOT_FOUND };
    }

    const openIdData = await openidService.get(sendKeyData.openIdRef);
    if (!openIdData) {
      return { pushId, success: false, error: ErrorCodes.OPENID_NOT_FOUND };
    }

    // 获取渠道凭证
    const credentials = await channelService.getDefaultCredentials(openIdData.openId);
    if (!credentials) {
      return { pushId, success: false, error: ErrorCodes.INVALID_CONFIG };
    }

    // 发送消息
    const message = { id: pushId, title, content: desp, createdAt };
    const result = await channelService.send(DEFAULT_CHANNEL, message, credentials);

    // 增加频率计数
    await sendkeyService.incrementRateLimit(sendKeyData.id);

    // 保存历史记录
    await historyService.save({
      id: pushId,
      type: 'single',
      keyId: sendKeyData.id,
      title,
      content: desp,
      results: [{
        openId: openIdData.openId,
        success: result.success,
        error: result.error,
        msgId: result.externalId,
      }],
      createdAt,
    });

    return {
      pushId,
      success: result.success,
      error: result.error,
      msgId: result.externalId,
    };
  }

  /**
   * 通过 TopicKey 发送消息
   * @param {string} topicKey - TopicKey 值
   * @param {string} title - 标题
   * @param {string} [desp] - 内容
   * @returns {Promise<Object>}
   */
  async pushByTopicKey(topicKey, title, desp) {
    const pushId = generatePushId();
    const createdAt = new Date().toISOString();

    // 查找 Topic
    const topicData = await topicService.findByKey(topicKey);
    if (!topicData) {
      return { pushId, total: 0, success: 0, failed: 0, results: [], error: ErrorCodes.KEY_NOT_FOUND };
    }

    // 检查频率限制
    const rateLimit = await topicService.checkRateLimit(topicData.id);
    if (!rateLimit.allowed) {
      return { pushId, total: 0, success: 0, failed: 0, results: [], error: ErrorCodes.RATE_LIMIT_EXCEEDED };
    }

    // 获取订阅者
    if (!topicData.subscriberRefs?.length) {
      return { pushId, total: 0, success: 0, failed: 0, results: [], error: ErrorCodes.NO_SUBSCRIBERS };
    }

    const subscribers = await openidService.getMany(topicData.subscriberRefs);
    if (subscribers.length === 0) {
      return { pushId, total: 0, success: 0, failed: 0, results: [], error: ErrorCodes.NO_SUBSCRIBERS };
    }

    // 发送消息给所有订阅者
    const message = { id: pushId, title, content: desp, createdAt };
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const subscriber of subscribers) {
      const credentials = await channelService.getDefaultCredentials(subscriber.openId);
      if (!credentials) {
        results.push({ openId: subscriber.openId, success: false, error: 'Channel not configured' });
        failedCount++;
        continue;
      }

      const result = await channelService.send(DEFAULT_CHANNEL, message, credentials);
      results.push({
        openId: subscriber.openId,
        success: result.success,
        error: result.error,
        msgId: result.externalId,
      });

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    // 增加频率计数
    await topicService.incrementRateLimit(topicData.id);

    // 保存历史记录
    await historyService.save({
      id: pushId,
      type: 'topic',
      keyId: topicData.id,
      title,
      content: desp,
      results,
      createdAt,
    });

    return {
      pushId,
      total: subscribers.length,
      success: successCount,
      failed: failedCount,
      results,
    };
  }
}

export const pushService = new PushService();
