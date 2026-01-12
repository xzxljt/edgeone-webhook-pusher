import { randomBytes } from 'crypto';

/**
 * Generate a unique SendKey (32+ characters, URL-safe)
 * @returns {string}
 */
export function generateSendKey() {
  return randomBytes(24).toString('base64url');
}

/**
 * Generate a unique ID
 * @returns {string}
 */
export function generateId() {
  return randomBytes(16).toString('hex');
}

/**
 * Get current ISO timestamp
 * @returns {string}
 */
export function now() {
  return new Date().toISOString();
}

/**
 * Mask sensitive credential values
 * @param {string} value
 * @returns {string}
 */
export function maskCredential(value) {
  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }
  return value.slice(0, 4) + '*'.repeat(value.length - 8) + value.slice(-4);
}

/**
 * Mask all sensitive fields in credentials object
 * @param {Object} credentials
 * @param {string[]} sensitiveFields
 * @returns {Object}
 */
export function maskCredentials(credentials, sensitiveFields) {
  const masked = { ...credentials };
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = maskCredential(masked[field]);
    }
  }
  return masked;
}

/**
 * Validate SendKey format (32+ chars, URL-safe)
 * @param {string} sendKey
 * @returns {boolean}
 */
export function isValidSendKey(sendKey) {
  if (!sendKey || sendKey.length < 32) {
    return false;
  }
  // URL-safe base64 characters only
  return /^[A-Za-z0-9_-]+$/.test(sendKey);
}

/**
 * Sanitize user input to prevent injection
 * @param {string} input
 * @returns {string}
 */
export function sanitizeInput(input) {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim()
    .slice(0, 10000); // Limit length
}

/**
 * Check rate limit (60 requests per minute)
 * @param {{ count: number, resetAt: string }} rateLimit
 * @param {number} limit
 * @returns {{ allowed: boolean, remaining: number, resetAt: string }}
 */
export function checkRateLimit(rateLimit, limit = 60) {
  const currentTime = new Date();
  const resetAt = new Date(rateLimit.resetAt);

  // Reset if window expired
  if (currentTime >= resetAt) {
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(currentTime.getTime() + 60000).toISOString(),
    };
  }

  // Check if under limit
  if (rateLimit.count < limit) {
    return {
      allowed: true,
      remaining: limit - rateLimit.count - 1,
      resetAt: rateLimit.resetAt,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetAt: rateLimit.resetAt,
  };
}
