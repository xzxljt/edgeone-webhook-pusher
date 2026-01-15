<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { MessagePlugin } from 'tdesign-vue-next';
import type { SystemConfig } from '~/types';

definePageMeta({
  layout: 'default',
});

const api = useApi();

// State
const loading = ref(true);
const saving = ref(false);
const config = ref<SystemConfig | null>(null);

// Form data
const formData = reactive({
  wechat: {
    appId: '',
    appSecret: '',
    templateId: '',
  },
  rateLimit: {
    perMinute: 5,
  },
  retention: {
    days: 30,
  },
});

// Load config
async function loadConfig() {
  loading.value = true;
  try {
    const res = await api.getConfig();
    if (res.data) {
      config.value = res.data;
      // Fill form with config values
      formData.wechat.appId = res.data.wechat?.appId || '';
      formData.wechat.appSecret = ''; // Don't show masked secret
      formData.wechat.templateId = res.data.wechat?.templateId || '';
      formData.rateLimit.perMinute = res.data.rateLimit?.perMinute || 5;
      formData.retention.days = res.data.retention?.days || 30;
    }
  } catch (e: unknown) {
    const err = e as Error;
    MessagePlugin.error(err.message || '获取配置失败');
  } finally {
    loading.value = false;
  }
}

// Save config
async function handleSave() {
  saving.value = true;
  try {
    const updateData: Partial<SystemConfig> = {
      rateLimit: formData.rateLimit,
      retention: formData.retention,
    };

    // Only include wechat fields that have values
    const wechatUpdate: SystemConfig['wechat'] = {
      appId: formData.wechat.appId || '',
      appSecret: formData.wechat.appSecret || '',
    };
    if (formData.wechat.templateId) {
      wechatUpdate.templateId = formData.wechat.templateId;
    }
    
    if (wechatUpdate.appId || wechatUpdate.appSecret) {
      updateData.wechat = wechatUpdate;
    }

    await api.updateConfig(updateData);
    MessagePlugin.success('配置已保存');
    await loadConfig();
  } catch (e: unknown) {
    const err = e as Error;
    MessagePlugin.error(err.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(loadConfig);
</script>

<template>
  <div class="settings-page">
    <div class="page-header">
      <h1>系统设置</h1>
    </div>

    <t-loading :loading="loading">
      <div class="settings-content">
        <!-- WeChat Config -->
        <t-card title="微信公众号配置" class="config-card">
          <template #actions>
            <t-tag v-if="config?.wechat?.appId" theme="success" size="small">
              <Icon icon="mdi:check" />
              已配置
            </t-tag>
            <t-tag v-else theme="warning" size="small">
              <Icon icon="mdi:alert" />
              未配置
            </t-tag>
          </template>

          <t-form label-width="120px">
            <t-form-item label="AppID">
              <t-input
                v-model="formData.wechat.appId"
                placeholder="请输入微信公众号 AppID"
              />
            </t-form-item>
            <t-form-item label="AppSecret">
              <t-input
                v-model="formData.wechat.appSecret"
                type="password"
                :placeholder="config?.wechat?.appSecret ? '已设置，留空保持不变' : '请输入微信公众号 AppSecret'"
              />
            </t-form-item>
            <t-form-item label="模板ID">
              <t-input
                v-model="formData.wechat.templateId"
                placeholder="请输入消息模板 ID"
              />
            </t-form-item>
          </t-form>
        </t-card>

        <!-- Rate Limit Config -->
        <t-card title="速率限制" class="config-card">
          <t-form label-width="120px">
            <t-form-item label="每分钟限制">
              <t-input-number
                v-model="formData.rateLimit.perMinute"
                :min="1"
                :max="100"
                theme="normal"
              />
              <span class="form-tip">每个应用每分钟最多发送的消息数</span>
            </t-form-item>
          </t-form>
        </t-card>

        <!-- Retention Config -->
        <t-card title="数据保留" class="config-card">
          <t-form label-width="120px">
            <t-form-item label="保留天数">
              <t-input-number
                v-model="formData.retention.days"
                :min="1"
                :max="365"
                theme="normal"
              />
              <span class="form-tip">消息历史记录保留天数</span>
            </t-form-item>
          </t-form>
        </t-card>

        <!-- Save Button -->
        <div class="save-bar">
          <t-button theme="primary" :loading="saving" @click="handleSave">
            <template #icon><Icon icon="mdi:content-save" /></template>
            保存配置
          </t-button>
        </div>

        <!-- Help Section -->
        <t-card title="配置帮助" class="help-card">
          <t-collapse>
            <t-collapse-panel header="如何获取微信公众号 AppID 和 AppSecret？">
              <ol>
                <li>登录 <a href="https://mp.weixin.qq.com" target="_blank" rel="noopener">微信公众平台</a></li>
                <li>进入「设置与开发」-「基本配置」</li>
                <li>在「公众号开发信息」中查看 AppID</li>
                <li>点击「重置」获取 AppSecret（请妥善保管）</li>
              </ol>
            </t-collapse-panel>
            <t-collapse-panel header="如何创建消息模板？">
              <ol>
                <li>在微信公众平台进入「功能」-「模板消息」</li>
                <li>从模板库中选择或创建新模板</li>
                <li>复制模板 ID 填入上方配置</li>
                <li>模板内容建议包含 <code v-pre>{{title.DATA}}</code> 和 <code v-pre>{{content.DATA}}</code> 字段</li>
              </ol>
            </t-collapse-panel>
            <t-collapse-panel header="如何配置网页授权域名？">
              <ol>
                <li>在微信公众平台进入「设置与开发」-「公众号设置」</li>
                <li>选择「功能设置」标签页</li>
                <li>在「网页授权域名」中添加您的域名</li>
                <li>下载验证文件并上传到网站根目录</li>
              </ol>
              <t-alert theme="info" style="margin-top: 12px">
                <template #message>
                  网页授权域名用于扫码绑定功能，请确保已正确配置。
                </template>
              </t-alert>
            </t-collapse-panel>
          </t-collapse>
        </t-card>
      </div>
    </t-loading>
  </div>
</template>

<style scoped>
.settings-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 800px;
}

.config-card {
  margin-bottom: 0;
}

.form-tip {
  margin-left: 12px;
  font-size: 13px;
  color: var(--td-text-color-secondary);
}

.save-bar {
  display: flex;
  justify-content: flex-end;
}

.help-card ol {
  margin: 0;
  padding-left: 20px;
  line-height: 2;
}

.help-card a {
  color: var(--td-brand-color);
}

.help-card code {
  background: var(--td-bg-color-secondarycontainer);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}
</style>
