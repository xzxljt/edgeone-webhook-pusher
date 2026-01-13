/**
 * Binding Service - 管理用户与 Key 的绑定关系
 * Module: binding
 */

import { sendkeyService } from '../key/sendkey.service.js';
import { topicService } from '../key/topic.service.js';
import { openidService, OpenIdSource } from '../openid/service.js';
import { KeyPrefixes } from '../../shared/types.js';

class BindingService {
  /**
   * 绑定用户到 SendKey
   * @param {string} openId - 微信 OpenID
   * @param {string} sendKeyId - SendKey ID
   * @param {string} source - 来源 (oauth/message)
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async bindToSendKey(openId, sendKeyId, source) {
    const sendKey = await sendkeyService.get(sendKeyId);
    if (!sendKey) {
      return { success: false, error: 'KEY_NOT_FOUND' };
    }

    const openIdRecord = await openidService.getOrCreate(openId, source);
    const bound = await sendkeyService.bind(sendKeyId, openIdRecord.id);

    return { success: bound };
  }

  /**
   * 通过 Key 值绑定用户到 SendKey
   * @param {string} openId - 微信 OpenID
   * @param {string} key - SCT 前缀的 Key
   * @param {string} source - 来源
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async bindToSendKeyByKey(openId, key, source) {
    const sendKey = await sendkeyService.findByKey(key);
    if (!sendKey) {
      return { success: false, error: 'KEY_NOT_FOUND' };
    }

    return this.bindToSendKey(openId, sendKey.id, source);
  }

  /**
   * 解绑 SendKey
   * @param {string} openId - 微信 OpenID
   * @param {string} sendKeyId - SendKey ID
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async unbindFromSendKey(openId, sendKeyId) {
    const sendKey = await sendkeyService.get(sendKeyId);
    if (!sendKey) {
      return { success: false, error: 'KEY_NOT_FOUND' };
    }

    const openIdRecord = await openidService.findByOpenId(openId);
    if (!openIdRecord || sendKey.openIdRef !== openIdRecord.id) {
      return { success: false, error: 'NOT_BOUND' };
    }

    const unbound = await sendkeyService.unbind(sendKeyId);
    return { success: unbound };
  }

  /**
   * 通过 Key 值解绑 SendKey
   * @param {string} openId - 微信 OpenID
   * @param {string} key - SCT 前缀的 Key
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async unbindFromSendKeyByKey(openId, key) {
    const sendKey = await sendkeyService.findByKey(key);
    if (!sendKey) {
      return { success: false, error: 'KEY_NOT_FOUND' };
    }

    return this.unbindFromSendKey(openId, sendKey.id);
  }

  /**
   * 订阅 Topic
   * @param {string} openId - 微信 OpenID
   * @param {string} topicId - Topic ID
   * @param {string} source - 来源 (oauth/message)
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async subscribeToTopic(openId, topicId, source) {
    const topic = await topicService.get(topicId);
    if (!topic) {
      return { success: false, error: 'KEY_NOT_FOUND' };
    }

    const openIdRecord = await openidService.getOrCreate(openId, source);
    const subscribed = await topicService.subscribe(topicId, openIdRecord.id);

    return { success: subscribed };
  }

  /**
   * 通过 Key 值订阅 Topic
   * @param {string} openId - 微信 OpenID
   * @param {string} key - TPK 前缀的 Key
   * @param {string} source - 来源
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async subscribeToTopicByKey(openId, key, source) {
    const topic = await topicService.findByKey(key);
    if (!topic) {
      return { success: false, error: 'KEY_NOT_FOUND' };
    }

    return this.subscribeToTopic(openId, topic.id, source);
  }

  /**
   * 退订 Topic
   * @param {string} openId - 微信 OpenID
   * @param {string} topicId - Topic ID
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async unsubscribeFromTopic(openId, topicId) {
    const topic = await topicService.get(topicId);
    if (!topic) {
      return { success: false, error: 'KEY_NOT_FOUND' };
    }

    const openIdRecord = await openidService.findByOpenId(openId);
    if (!openIdRecord || !topic.subscriberRefs.includes(openIdRecord.id)) {
      return { success: false, error: 'NOT_SUBSCRIBED' };
    }

    const unsubscribed = await topicService.unsubscribe(topicId, openIdRecord.id);
    return { success: unsubscribed };
  }

  /**
   * 通过 Key 值退订 Topic
   * @param {string} openId - 微信 OpenID
   * @param {string} key - TPK 前缀的 Key
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async unsubscribeFromTopicByKey(openId, key) {
    const topic = await topicService.findByKey(key);
    if (!topic) {
      return { success: false, error: 'KEY_NOT_FOUND' };
    }

    return this.unsubscribeFromTopic(openId, topic.id);
  }

  /**
   * 查询 OpenID 的所有绑定关系
   * @param {string} openId - 微信 OpenID
   * @returns {Promise<{ sendKeys: Object[], topics: Object[] }>}
   */
  async getBindings(openId) {
    const openIdRecord = await openidService.findByOpenId(openId);
    if (!openIdRecord) {
      return { sendKeys: [], topics: [] };
    }

    const allSendKeys = await sendkeyService.list();
    const allTopics = await topicService.list();

    const sendKeys = allSendKeys.filter((sk) => sk.openIdRef === openIdRecord.id);
    const topics = allTopics.filter((t) => t.subscriberRefs.includes(openIdRecord.id));

    return { sendKeys, topics };
  }

  /**
   * 根据 Key 值执行绑定（用于消息绑定）
   * @param {string} openId - 微信 OpenID
   * @param {string} key - SCT/TPK 前缀的 Key
   * @returns {Promise<{ success: boolean, type?: string, error?: string }>}
   */
  async bindByKey(openId, key) {
    if (key.startsWith(KeyPrefixes.SEND_KEY)) {
      const result = await this.bindToSendKeyByKey(openId, key);
      return { ...result, type: 'sendkey' };
    }

    if (key.startsWith(KeyPrefixes.TOPIC_KEY)) {
      const result = await this.subscribeToTopicByKey(openId, key);
      return { ...result, type: 'topic' };
    }

    return { success: false, error: 'INVALID_KEY_FORMAT' };
  }

  /**
   * 根据 Key 值执行解绑（用于消息解绑）
   * @param {string} openId - 微信 OpenID
   * @param {string} key - SCT/TPK 前缀的 Key
   * @returns {Promise<{ success: boolean, type?: string, error?: string }>}
   */
  async unbindByKey(openId, key) {
    if (key.startsWith(KeyPrefixes.SEND_KEY)) {
      const result = await this.unbindFromSendKeyByKey(openId, key);
      return { ...result, type: 'sendkey' };
    }

    if (key.startsWith(KeyPrefixes.TOPIC_KEY)) {
      const result = await this.unsubscribeFromTopicByKey(openId, key);
      return { ...result, type: 'topic' };
    }

    return { success: false, error: 'INVALID_KEY_FORMAT' };
  }
}

export const bindingService = new BindingService();
