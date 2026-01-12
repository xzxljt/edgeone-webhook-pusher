import { wechatTemplateAdapter } from './wechat-template.js';

/**
 * Channel adapter registry
 */
export const channelAdapters = {
  'wechat-template': wechatTemplateAdapter,
};

/**
 * Get adapter by channel type
 * @param {string} type
 * @returns {Object|undefined}
 */
export function getChannelAdapter(type) {
  return channelAdapters[type];
}

/**
 * Get all supported channel types
 * @returns {string[]}
 */
export function getSupportedChannelTypes() {
  return Object.keys(channelAdapters);
}

/**
 * Get sensitive fields for a channel type
 * @param {string} type
 * @returns {string[]}
 */
export function getSensitiveFields(type) {
  const adapter = channelAdapters[type];
  if (!adapter) return [];

  const schema = adapter.getConfigSchema();
  return Object.entries(schema)
    .filter(([, field]) => field.sensitive)
    .map(([key]) => key);
}
