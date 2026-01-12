// Error codes
export const ErrorCodes = {
  MISSING_TITLE: 40001,
  INVALID_PARAM: 40002,
  INVALID_CHANNEL_CONFIG: 40003,
  INVALID_SENDKEY: 40101,
  MESSAGE_NOT_FOUND: 40401,
  CHANNEL_NOT_FOUND: 40402,
  RATE_LIMIT_EXCEEDED: 42901,
  INTERNAL_ERROR: 50001,
};

// Channel types - v1.0 only supports wechat-template
export const ChannelTypes = {
  WECHAT_TEMPLATE: 'wechat-template',
};
