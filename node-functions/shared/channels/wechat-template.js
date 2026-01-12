// Access Token cache
const tokenCache = new Map();

/**
 * Get WeChat access token with caching
 * @param {string} appId
 * @param {string} appSecret
 * @returns {Promise<string>}
 */
async function getAccessToken(appId, appSecret) {
  const cacheKey = `${appId}:${appSecret}`;
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.errcode) {
    throw new Error(`WeChat API Error: ${data.errcode} - ${data.errmsg}`);
  }

  if (!data.access_token || !data.expires_in) {
    throw new Error('Invalid WeChat API response');
  }

  tokenCache.set(cacheKey, {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000, // Expire 5 min early
  });

  return data.access_token;
}

/**
 * WeChat Template Message Adapter
 */
export const wechatTemplateAdapter = {
  type: 'wechat-template',
  name: '微信模板消息',

  /**
   * Send message via WeChat template
   * @param {{ id: string, title: string, content?: string, createdAt: string }} message
   * @param {Object} credentials
   * @returns {Promise<{ success: boolean, error?: string, externalId?: string }>}
   */
  async send(message, credentials) {
    const config = credentials;

    try {
      const accessToken = await getAccessToken(config.appId, config.appSecret);

      const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touser: config.openId,
          template_id: config.templateId,
          url: config.url,
          data: {
            first: { value: message.title, color: '#173177' },
            keyword1: { value: message.content || '无内容', color: '#173177' },
            keyword2: {
              value: new Date(message.createdAt).toLocaleString('zh-CN'),
              color: '#173177',
            },
            remark: { value: 'Powered by EdgeOne Webhook Pusher', color: '#999999' },
          },
        }),
      });

      const data = await res.json();

      if (data.errcode === 0) {
        return { success: true, externalId: String(data.msgid) };
      } else {
        return { success: false, error: `${data.errcode}: ${data.errmsg}` };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  /**
   * Validate WeChat credentials
   * @param {Object} credentials
   * @returns {Promise<boolean>}
   */
  async validate(credentials) {
    const config = credentials;

    if (!config.appId || !config.appSecret || !config.templateId || !config.openId) {
      return false;
    }

    try {
      await getAccessToken(config.appId, config.appSecret);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get configuration schema
   * @returns {Object}
   */
  getConfigSchema() {
    return {
      appId: { type: 'string', label: '公众号 AppID', required: true },
      appSecret: { type: 'string', label: '公众号 AppSecret', required: true, sensitive: true },
      templateId: { type: 'string', label: '模板消息 ID', required: true },
      openId: { type: 'string', label: '用户 OpenID', required: true },
      url: { type: 'string', label: '点击跳转链接', required: false },
    };
  },
};

/**
 * Clear token cache (for testing)
 */
export function clearTokenCache() {
  tokenCache.clear();
}
