<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { MessagePlugin } from 'tdesign-vue-next';
import type { Message, DeliveryResult, PaginatedResponse } from '~/types';

definePageMeta({
  layout: 'default',
});

const api = useApi();

// State
const loading = ref(true);
const messages = ref<Message[]>([]);
const showDetailDialog = ref(false);
const selectedMessage = ref<Message | null>(null);
const appFilter = ref<string>('');

// Pagination
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
});

// Table columns
const columns = [
  { 
    colKey: 'title', 
    title: '标题', 
    ellipsis: true,
  },
  { 
    colKey: 'appId', 
    title: '应用ID', 
    width: 150,
    ellipsis: true,
  },
  { 
    colKey: 'status', 
    title: '状态', 
    width: 100,
  },
  { 
    colKey: 'createdAt', 
    title: '时间', 
    width: 180,
  },
  { 
    colKey: 'actions', 
    title: '操作', 
    width: 80,
  },
];

// Format time
function formatTime(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN');
}

// Get status info
function getStatusInfo(results: DeliveryResult[]) {
  if (!results || results.length === 0) {
    return { label: '未知', theme: 'default' as const };
  }
  const allSuccess = results.every(r => r.success);
  const allFailed = results.every(r => !r.success);
  
  if (allSuccess) return { label: '成功', theme: 'success' as const };
  if (allFailed) return { label: '失败', theme: 'danger' as const };
  return { label: '部分成功', theme: 'warning' as const };
}

// Load messages
async function loadMessages() {
  loading.value = true;
  try {
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      appId: appFilter.value || undefined,
    };
    
    const res = await api.getMessages(params);
    if (res.code === 0 && res.data) {
      const data = res.data as PaginatedResponse<Message>;
      messages.value = data.items || [];
      pagination.total = data.pagination?.total || 0;
    } else {
      MessagePlugin.error(res.message || '获取消息列表失败');
    }
  } catch (e: unknown) {
    const err = e as Error;
    MessagePlugin.error(err.message || '获取消息列表失败');
  } finally {
    loading.value = false;
  }
}

// Handle page change
function handlePageChange(pageInfo: { current: number; pageSize: number }) {
  pagination.current = pageInfo.current;
  pagination.pageSize = pageInfo.pageSize;
  loadMessages();
}

// Handle filter change
function handleFilterChange() {
  pagination.current = 1;
  loadMessages();
}

// Show detail
function showDetail(msg: Message) {
  selectedMessage.value = msg;
  showDetailDialog.value = true;
}

onMounted(loadMessages);
</script>

<template>
  <div class="messages-page">
    <div class="page-header">
      <h1>消息历史</h1>
      <div class="filter-bar">
        <t-input
          v-model="appFilter"
          placeholder="按应用ID筛选"
          clearable
          style="width: 200px"
          @change="handleFilterChange"
        />
      </div>
    </div>

    <t-card :bordered="false">
      <t-loading :loading="loading">
        <div v-if="messages.length === 0 && !loading" class="empty-state">
          <Icon icon="mdi:message-text-outline" class="empty-icon" />
          <p>暂无消息记录</p>
        </div>

        <t-table
          v-else
          :data="messages"
          :columns="columns"
          row-key="id"
          hover
          :pagination="pagination"
          @page-change="handlePageChange"
        >
          <template #status="{ row }">
            <t-tag :theme="getStatusInfo(row.results).theme" size="small">
              {{ getStatusInfo(row.results).label }}
            </t-tag>
          </template>

          <template #createdAt="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>

          <template #actions="{ row }">
            <t-button theme="default" variant="text" size="small" @click="showDetail(row)">
              <Icon icon="mdi:eye" />
            </t-button>
          </template>
        </t-table>
      </t-loading>
    </t-card>

    <!-- Detail Dialog -->
    <t-dialog
      v-model:visible="showDetailDialog"
      header="消息详情"
      :footer="false"
      width="600px"
    >
      <template v-if="selectedMessage">
        <t-descriptions :column="1" bordered>
          <t-descriptions-item label="消息ID">
            <code>{{ selectedMessage.id }}</code>
          </t-descriptions-item>
          <t-descriptions-item label="应用ID">
            {{ selectedMessage.appId }}
          </t-descriptions-item>
          <t-descriptions-item label="标题">
            {{ selectedMessage.title }}
          </t-descriptions-item>
          <t-descriptions-item label="内容">
            <pre class="message-content">{{ selectedMessage.desp || '无' }}</pre>
          </t-descriptions-item>
          <t-descriptions-item label="发送时间">
            {{ formatTime(selectedMessage.createdAt) }}
          </t-descriptions-item>
        </t-descriptions>

        <t-divider>发送结果</t-divider>

        <div class="results-list">
          <div
            v-for="(result, i) in selectedMessage.results"
            :key="i"
            class="result-item"
          >
            <div class="result-info">
              <Icon icon="mdi:account" class="result-icon" />
              <div class="result-detail">
                <span class="result-openid">{{ result.openId }}</span>
              </div>
            </div>
            <t-tag :theme="result.success ? 'success' : 'danger'" size="small">
              {{ result.success ? '成功' : '失败' }}
            </t-tag>
          </div>
        </div>

        <t-alert
          v-if="selectedMessage.results?.some((r: DeliveryResult) => r.error)"
          theme="error"
          title="错误信息"
          style="margin-top: 16px"
        >
          <template v-for="(r, i) in selectedMessage.results" :key="i">
            <div v-if="r.error" class="error-item">
              {{ r.openId }}: {{ r.error }}
            </div>
          </template>
        </t-alert>
      </template>
    </t-dialog>
  </div>
</template>

<style scoped>
.messages-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--td-text-color-secondary);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.message-content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: inherit;
  max-height: 200px;
  overflow-y: auto;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--td-bg-color-secondarycontainer);
  border-radius: 8px;
}

.result-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-icon {
  font-size: 24px;
  color: var(--td-brand-color);
}

.result-detail {
  display: flex;
  flex-direction: column;
}

.result-openid {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.error-item {
  margin: 4px 0;
  font-size: 13px;
}
</style>
