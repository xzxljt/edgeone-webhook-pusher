<template>
  <div class="dashboard">
    <t-row :gutter="[24, 24]">
      <!-- Stats Cards -->
      <t-col :xs="24" :sm="8">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon channel">
              <Icon icon="mdi:broadcast" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.channels }}</div>
              <div class="stat-label">渠道</div>
            </div>
          </div>
          <t-button
            theme="primary"
            variant="text"
            class="stat-action"
            @click="router.push('/channels')"
          >
            管理 <Icon icon="mdi:arrow-right" />
          </t-button>
        </t-card>
      </t-col>

      <t-col :xs="24" :sm="8">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon app">
              <Icon icon="mdi:application" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.apps }}</div>
              <div class="stat-label">应用</div>
            </div>
          </div>
          <t-button
            theme="primary"
            variant="text"
            class="stat-action"
            @click="router.push('/apps')"
          >
            管理 <Icon icon="mdi:arrow-right" />
          </t-button>
        </t-card>
      </t-col>

      <t-col :xs="24" :sm="8">
        <t-card :bordered="false" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon message">
              <Icon icon="mdi:message-text" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.messages }}</div>
              <div class="stat-label">消息总数</div>
            </div>
          </div>
          <t-button
            theme="primary"
            variant="text"
            class="stat-action"
            @click="router.push('/messages')"
          >
            查看 <Icon icon="mdi:arrow-right" />
          </t-button>
        </t-card>
      </t-col>

      <!-- Quick Actions -->
      <t-col :span="24">
        <t-card title="快捷操作" :bordered="false">
          <t-space>
            <t-button theme="primary" @click="router.push('/channels')">
              <template #icon><Icon icon="mdi:plus" /></template>
              新建渠道
            </t-button>
            <t-button theme="default" @click="router.push('/apps')">
              <template #icon><Icon icon="mdi:plus" /></template>
              新建应用
            </t-button>
            <t-button theme="default" variant="outline" @click="router.push('/settings')">
              <template #icon><Icon icon="mdi:cog" /></template>
              系统设置
            </t-button>
          </t-space>
        </t-card>
      </t-col>

      <!-- OpenID Stats -->
      <t-col :span="24">
        <t-card :bordered="false">
          <template #header>
            <div class="card-header">
              <span>订阅者统计</span>
            </div>
          </template>
          <div class="openid-stat">
            <Icon icon="mdi:account-group" class="openid-icon" />
            <span class="openid-count">{{ stats.openIds }}</span>
            <span class="openid-label">总订阅者</span>
          </div>
        </t-card>
      </t-col>
    </t-row>
  </div>
</template>

<script setup lang="ts">
import type { StatsData } from '~/types';
import { Icon } from '@iconify/vue';

definePageMeta({
  layout: 'default',
});

const api = useApi();
const router = useRouter();

const loading = ref(true);
const stats = ref<StatsData>({
  channels: 0,
  apps: 0,
  openIds: 0,
  messages: 0,
});

onMounted(async () => {
  const res = await api.getStats();
  loading.value = false;
  
  if (res.code === 0 && res.data) {
    stats.value = res.data;
  }
});
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
}

.stat-card {
  position: relative;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-icon.channel {
  background: rgba(7, 193, 96, 0.1);
  color: #07c160;
}

.stat-icon.app {
  background: rgba(0, 82, 217, 0.1);
  color: #0052d9;
}

.stat-icon.message {
  background: rgba(237, 123, 47, 0.1);
  color: #ed7b2f;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
}

.stat-label {
  color: var(--td-text-color-secondary);
  font-size: 14px;
  margin-top: 4px;
}

.stat-action {
  position: absolute;
  right: 16px;
  bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.openid-stat {
  display: flex;
  align-items: center;
  gap: 12px;
}

.openid-icon {
  font-size: 32px;
  color: var(--td-brand-color);
}

.openid-count {
  font-size: 24px;
  font-weight: 600;
}

.openid-label {
  color: var(--td-text-color-secondary);
}
</style>
