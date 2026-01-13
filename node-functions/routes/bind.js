/**
 * Bind Routes - SendKey OpenID Binding via WeChat OAuth
 * Feature: frontend-admin-ui
 * 
 * Handles QR code scanning flow for binding WeChat users to SendKeys.
 * Uses snsapi_userinfo scope and checks follow status before binding.
 * Returns JSON responses for API consumers.
 */

import { configKV } from '../shared/kv-client.js';
import { configService } from '../services/config.js';
import { sendkeyService } from '../modules/key/sendkey.service.js';
import { bindingService } from '../modules/binding/service.js';
import { OpenIdSource } from '../modules/openid/service.js';
import { generateId, now } from '../shared/utils.js';
import { checkUserFollowStatus } from '../services/wechat.js';
import { ErrorCodes, errorResponse, successResponse } from '../shared/error-codes.js';

// OAuth state TTL: 5 minutes
const OAUTH_STATE_TTL = 300;

/**
 * Register bind routes
 * @param {import('@koa/router').default} router
 */
export function registerBindRoutes(router) {
  /**
   * GET /bind/:sendKeyId
   * Entry point for SendKey binding - redirects to WeChat OAuth
   */
  router.get('/bind/:sendKeyId', async (ctx) => {
    const { sendKeyId } = ctx.params;

    // Verify SendKey exists
    const sendKey = await sendkeyService.get(sendKeyId);
    if (!sendKey) {
      ctx.status = 404;
      ctx.body = errorResponse(ErrorCodes.SENDKEY_NOT_FOUND);
      return;
    }

    // Get WeChat config
    const wechatConfig = await configService.getWeChatConfig();
    if (!wechatConfig?.appId) {
      ctx.status = 500;
      ctx.body = errorResponse(ErrorCodes.CONFIG_ERROR, '微信公众号未配置');
      return;
    }

    // Generate OAuth state
    const state = generateId();
    const stateData = {
      type: 'bind',
      sendKeyId,
      createdAt: now(),
    };

    // Store state in KV with TTL
    await configKV.put(`oauth_state:${state}`, stateData, OAUTH_STATE_TTL);

    // Build WeChat OAuth URL - use snsapi_userinfo to get user info
    const redirectUri = encodeURIComponent(`${getOrigin(ctx)}/v1/bind/${sendKeyId}/callback`);
    const oauthUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${wechatConfig.appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;

    ctx.redirect(oauthUrl);
  });

  /**
   * GET /bind/:sendKeyId/callback
   * WeChat OAuth callback - completes the binding after checking follow status
   */
  router.get('/bind/:sendKeyId/callback', async (ctx) => {
    const { sendKeyId } = ctx.params;
    const { code, state } = ctx.query;

    // Validate state
    if (!state) {
      ctx.status = 400;
      ctx.body = errorResponse(ErrorCodes.INVALID_STATE);
      return;
    }

    // Get and validate state from KV
    const stateData = await configKV.get(`oauth_state:${state}`);
    if (!stateData || stateData.type !== 'bind' || stateData.sendKeyId !== sendKeyId) {
      ctx.status = 400;
      ctx.body = errorResponse(ErrorCodes.STATE_EXPIRED, '链接已过期或无效，请重新扫码');
      return;
    }

    // Delete used state
    await configKV.delete(`oauth_state:${state}`);

    // Verify SendKey still exists
    const sendKey = await sendkeyService.get(sendKeyId);
    if (!sendKey) {
      ctx.status = 404;
      ctx.body = errorResponse(ErrorCodes.SENDKEY_NOT_FOUND);
      return;
    }

    // Get WeChat config
    const wechatConfig = await configService.getWeChatConfig();
    if (!wechatConfig?.appId || !wechatConfig?.appSecret) {
      ctx.status = 500;
      ctx.body = errorResponse(ErrorCodes.CONFIG_ERROR);
      return;
    }

    try {
      // Exchange code for access token and openid
      const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${wechatConfig.appId}&secret=${wechatConfig.appSecret}&code=${code}&grant_type=authorization_code`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (tokenData.errcode) {
        console.error('WeChat OAuth error:', tokenData);
        ctx.status = 400;
        ctx.body = errorResponse(ErrorCodes.OAUTH_FAILED, '微信授权失败，请重试', tokenData.errmsg);
        return;
      }

      const { openid, access_token: oauthAccessToken } = tokenData;

      // Check if user has followed the official account
      const followStatus = await checkUserFollowStatus(openid);
      if (!followStatus.subscribed) {
        ctx.status = 400;
        ctx.body = errorResponse(ErrorCodes.NOT_FOLLOWED);
        return;
      }

      // Bind using binding service
      const bindResult = await bindingService.bindToSendKey(openid, sendKeyId, OpenIdSource.OAUTH);
      
      if (!bindResult.success) {
        ctx.status = 400;
        ctx.body = errorResponse(ErrorCodes.BIND_FAILED, bindResult.error);
        return;
      }

      // Get updated sendKey for response
      const updatedSendKey = await sendkeyService.get(sendKeyId);

      // Return success
      ctx.body = successResponse({
        sendKeyId,
        sendKeyName: updatedSendKey?.name || sendKey.name,
        openIdRef: updatedSendKey?.openIdRef,
      }, '绑定成功');
    } catch (error) {
      console.error('Bind callback error:', error);
      ctx.status = 500;
      ctx.body = errorResponse(ErrorCodes.SERVER_ERROR);
    }
  });
}

/**
 * Get origin from context
 */
function getOrigin(ctx) {
  const proto = ctx.get('x-forwarded-proto') || ctx.protocol;
  const host = ctx.get('x-forwarded-host') || ctx.host;
  return `${proto}://${host}`;
}
