/**
 * Command Parser - 解析公众号消息中的绑定指令
 * Module: binding
 */

/**
 * 指令类型
 */
export const CommandAction = {
  BIND: 'bind',         // 绑定 SendKey
  UNBIND: 'unbind',     // 解绑 SendKey
  SUBSCRIBE: 'subscribe',   // 订阅 Topic
  UNSUBSCRIBE: 'unsubscribe', // 退订 Topic
};

/**
 * 指令关键词映射
 */
const COMMAND_KEYWORDS = {
  '绑定': CommandAction.BIND,
  '订阅': CommandAction.SUBSCRIBE,
  '解绑': CommandAction.UNBIND,
  '退订': CommandAction.UNSUBSCRIBE,
  'bind': CommandAction.BIND,
  'subscribe': CommandAction.SUBSCRIBE,
  'unbind': CommandAction.UNBIND,
  'unsubscribe': CommandAction.UNSUBSCRIBE,
};

/**
 * 指令解析器
 */
class CommandParser {
  /**
   * 解析消息内容
   * @param {string} content - 消息内容
   * @returns {{ action: string, key: string } | null}
   */
  parse(content) {
    if (!content || typeof content !== 'string') {
      return null;
    }

    const trimmed = content.trim();
    
    // 匹配格式: 关键词 + 空格 + Key
    const match = trimmed.match(/^(\S+)\s+(\S+)$/);
    if (!match) {
      return null;
    }

    const [, keyword, key] = match;
    const action = COMMAND_KEYWORDS[keyword.toLowerCase()] || COMMAND_KEYWORDS[keyword];

    if (!action) {
      return null;
    }

    // 验证 Key 格式
    if (!this.isValidKey(key)) {
      return null;
    }

    return { action, key };
  }

  /**
   * 验证 Key 格式
   * @param {string} key
   * @returns {boolean}
   */
  isValidKey(key) {
    if (!key || key.length < 10) {
      return false;
    }
    // SCT 或 TPK 开头
    return key.startsWith('SCT') || key.startsWith('TPK');
  }

  /**
   * 判断是否为绑定类指令
   * @param {string} action
   * @returns {boolean}
   */
  isBindAction(action) {
    return action === CommandAction.BIND || action === CommandAction.SUBSCRIBE;
  }

  /**
   * 判断是否为解绑类指令
   * @param {string} action
   * @returns {boolean}
   */
  isUnbindAction(action) {
    return action === CommandAction.UNBIND || action === CommandAction.UNSUBSCRIBE;
  }

  /**
   * 获取帮助信息
   * @returns {string}
   */
  getHelpMessage() {
    return `支持的指令：
- 绑定 SCTxxxxx（绑定 SendKey）
- 订阅 TPKxxxxx（订阅 Topic）
- 解绑 SCTxxxxx（解绑 SendKey）
- 退订 TPKxxxxx（退订 Topic）`;
  }
}

export const commandParser = new CommandParser();
