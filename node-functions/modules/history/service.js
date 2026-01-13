/**
 * History Service - 消息历史记录管理
 * Module: history
 */

import { messagesKV } from '../../shared/kv-client.js';
import { KVKeys } from '../../shared/types.js';

class HistoryService {
  /**
   * 保存消息记录
   * @param {Object} message - 消息数据
   * @returns {Promise<void>}
   */
  async save(message) {
    await messagesKV.put(KVKeys.MESSAGE(message.id), message);
  }

  /**
   * 获取消息详情
   * @param {string} id - 消息 ID
   * @returns {Promise<Object | null>}
   */
  async get(id) {
    return messagesKV.get(KVKeys.MESSAGE(id));
  }

  /**
   * 分页查询消息历史
   * @param {Object} options - 查询选项
   * @param {number} [options.page=1] - 页码
   * @param {number} [options.pageSize=20] - 每页数量
   * @param {string} [options.type] - 消息类型筛选 (single/topic)
   * @param {string} [options.startDate] - 开始时间
   * @param {string} [options.endDate] - 结束时间
   * @returns {Promise<{ messages: Object[], total: number, page: number, pageSize: number }>}
   */
  async list(options = {}) {
    const { page = 1, pageSize = 20, type, startDate, endDate } = options;

    // 获取所有消息 key
    const keys = await messagesKV.listAll('msg:');
    
    // 获取所有消息数据
    const allMessages = [];
    for (const key of keys) {
      const data = await messagesKV.get(key);
      if (data) {
        allMessages.push(data);
      }
    }

    // 筛选
    let filtered = allMessages;

    if (type) {
      filtered = filtered.filter((m) => m.type === type);
    }

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter((m) => new Date(m.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter((m) => new Date(m.createdAt) <= end);
    }

    // 按时间倒序排序
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 分页
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const messages = filtered.slice(start, start + pageSize);

    return { messages, total, page, pageSize };
  }

  /**
   * 删除消息记录
   * @param {string} id - 消息 ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const data = await this.get(id);
    if (!data) return false;

    await messagesKV.delete(KVKeys.MESSAGE(id));
    return true;
  }

  /**
   * 清理过期记录
   * @param {number} retentionDays - 保留天数
   * @returns {Promise<number>} - 清理的记录数
   */
  async cleanup(retentionDays = 30) {
    const keys = await messagesKV.listAll('msg:');
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let count = 0;

    for (const key of keys) {
      const data = await messagesKV.get(key);
      if (data && new Date(data.createdAt) < cutoff) {
        await messagesKV.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * 获取统计数据
   * @returns {Promise<{ total: number, today: number, success: number, failed: number }>}
   */
  async getStats() {
    const keys = await messagesKV.listAll('msg:');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let total = 0;
    let todayCount = 0;
    let success = 0;
    let failed = 0;

    for (const key of keys) {
      const data = await messagesKV.get(key);
      if (data) {
        total++;

        if (new Date(data.createdAt) >= today) {
          todayCount++;
        }

        // 统计成功/失败
        if (data.results) {
          for (const r of data.results) {
            if (r.success) {
              success++;
            } else {
              failed++;
            }
          }
        }
      }
    }

    return { total, today: todayCount, success, failed };
  }
}

export const historyService = new HistoryService();
