/**
 * Channel Registry Tests
 * Property 7: Channel CRUD Functional Equivalence (registry part)
 * Validates: Requirements 7.5
 */

import { describe, it, expect } from 'vitest';
import {
  getChannelAdapter,
  getSupportedChannelTypes,
  getSensitiveFields,
} from '../node-functions/shared/channels/registry.js';

describe('Channel Registry', () => {
  describe('getSupportedChannelTypes', () => {
    it('should return array of channel types', () => {
      const types = getSupportedChannelTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should include wechat-template', () => {
      const types = getSupportedChannelTypes();
      expect(types).toContain('wechat-template');
    });
  });

  describe('getChannelAdapter', () => {
    it('should return adapter for wechat-template', () => {
      const adapter = getChannelAdapter('wechat-template');
      expect(adapter).toBeDefined();
      expect(adapter.type).toBe('wechat-template');
      expect(adapter.name).toBe('微信模板消息');
    });

    it('should return undefined for unknown type', () => {
      const adapter = getChannelAdapter('unknown-type');
      expect(adapter).toBeUndefined();
    });

    it('should have required methods', () => {
      const adapter = getChannelAdapter('wechat-template');
      expect(typeof adapter.send).toBe('function');
      expect(typeof adapter.validate).toBe('function');
      expect(typeof adapter.getConfigSchema).toBe('function');
    });
  });

  describe('getSensitiveFields', () => {
    it('should return sensitive fields for wechat-template', () => {
      const fields = getSensitiveFields('wechat-template');
      expect(Array.isArray(fields)).toBe(true);
      expect(fields).toContain('appSecret');
    });

    it('should return empty array for unknown type', () => {
      const fields = getSensitiveFields('unknown-type');
      expect(fields).toEqual([]);
    });
  });
});

describe('WeChat Template Adapter', () => {
  const adapter = getChannelAdapter('wechat-template');

  describe('getConfigSchema', () => {
    it('should return valid schema', () => {
      const schema = adapter.getConfigSchema();
      expect(schema).toBeDefined();
      expect(schema.appId).toBeDefined();
      expect(schema.appSecret).toBeDefined();
      expect(schema.templateId).toBeDefined();
      expect(schema.openId).toBeDefined();
    });

    it('should mark appSecret as sensitive', () => {
      const schema = adapter.getConfigSchema();
      expect(schema.appSecret.sensitive).toBe(true);
    });

    it('should mark required fields correctly', () => {
      const schema = adapter.getConfigSchema();
      expect(schema.appId.required).toBe(true);
      expect(schema.appSecret.required).toBe(true);
      expect(schema.templateId.required).toBe(true);
      expect(schema.openId.required).toBe(true);
      expect(schema.url.required).toBe(false);
    });
  });

  describe('validate', () => {
    it('should reject empty credentials', async () => {
      const result = await adapter.validate({});
      expect(result).toBe(false);
    });

    it('should reject incomplete credentials', async () => {
      const result = await adapter.validate({
        appId: 'test',
        appSecret: 'test',
        // missing templateId and openId
      });
      expect(result).toBe(false);
    });
  });
});
