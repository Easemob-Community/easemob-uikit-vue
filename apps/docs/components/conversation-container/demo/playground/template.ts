/**
 * 会话列表在线代码演练场初始模板（VuePlayground files）
 *
 * 多文件约定：'App.vue' 为用户主编辑区（容器 props + 配置对象），
 * 'mock.ts' 为 mock 会话数据（一般不需要修改）。
 * 模板约束：只能 import import map 已覆盖的模块，预览 iframe 才能解析。
 */
export const conversationPlaygroundFiles: Record<string, string> = {
  'App.vue': `
<script setup lang="ts">
import { reactive, watch } from 'vue'
import {
  EmUIKitProvider,
  EmConversationContainer,
  CONVERSATION_TYPE,
  useConversationStore,
  usePresenceStore,
} from '@easemob/uikit'
import type { ConversationTabKey } from '@easemob/uikit'
import { mockConversations, mockPresence } from './mock'

// ---------- mock 注入（免登录渲染，见 mock.ts） ----------
const conversationStore = useConversationStore()
const presenceStore = usePresenceStore()
conversationStore.setConversationList(mockConversations)
conversationStore.setAtMe('g_team', true)
presenceStore.updateBatch(mockPresence)

// ===== 可编辑配置：改这里实时生效 =====
const config = reactive({
  showSenderName: true,
  unreadMode: 'count' as 'count' | 'dot',
  showHeader: true,
  headerAlign: 'left' as 'left' | 'center' | 'right',
  tabs: ['all', 'unread', 'atMe', 'single', 'group'] as ConversationTabKey[],
  showStatusBanner: false,
  showSearch: true,
  showScrollToTop: true,
  enablePresence: false,
  bodySticky: false,
})

// 切换 tabs 后若当前激活 tab 不在新集合内则回落 'all'
const activeTab = reactive<{ value: ConversationTabKey }>({ value: 'all' })
watch(
  () => config.tabs,
  (tabs) => {
    if (!tabs.includes(activeTab.value))
      activeTab.value = 'all'
  },
)
</script>

<template>
  <EmUIKitProvider
    :auto-init="false"
    :enable-presence="config.enablePresence"
  >
    <EmConversationContainer
      title="消息"
      :show-sender-name="config.showSenderName"
      :unread-mode="config.unreadMode"
      :show-header="config.showHeader"
      :header-align="config.headerAlign"
      :tabs="config.tabs"
      v-model:active-tab="activeTab.value"
      :show-status-banner="config.showStatusBanner"
      :show-search="config.showSearch"
      :show-scroll-to-top="config.showScrollToTop"
      :enable-presence="config.enablePresence"
      :body-sticky="config.bodySticky"
    >
      <template #body>
        <div class="notice">公告：本周五 15:00 全员大会（body 插槽内容）</div>
      </template>
    </EmConversationContainer>
  </EmUIKitProvider>
</template>

<style scoped>
.notice {
  padding: 6px 16px;
  background: rgba(var(--uikit-primary-rgb), 0.08);
  color: var(--uikit-primary-color);
  font-size: 12px;
  border-bottom: 1px solid var(--uikit-border-color, #eee);
}
</style>
`.trim(),
  'mock.ts': `
import { CONVERSATION_TYPE } from '@easemob/uikit'
import type { UiConversation, UiPresence } from '@easemob/uikit'

const now = Date.now()

/** mock 会话列表（覆盖未读 / 置顶 / 免打扰 / @我 / 单聊 / 群聊场景） */
export const mockConversations: UiConversation[] = [
  {
    id: 'u_alice',
    name: 'Alice',
    type: CONVERSATION_TYPE.SINGLECHAT,
    avatar: 'https://picsum.photos/seed/alice/96',
    unreadCount: 2,
    lastMessageText: '晚上一起吃饭吗？',
    lastMessageTime: now - 5 * 60_000,
    isPinned: true,
    isMuted: false,
    marks: [],
  },
  {
    id: 'u_bob',
    name: 'Bob',
    type: CONVERSATION_TYPE.SINGLECHAT,
    avatar: 'https://picsum.photos/seed/bob/96',
    unreadCount: 0,
    lastMessageText: '文件已发送',
    lastMessageTime: now - 30 * 60_000,
    isPinned: false,
    isMuted: false,
    marks: [],
  },
  {
    id: 'u_carol',
    name: 'Carol',
    type: CONVERSATION_TYPE.SINGLECHAT,
    avatar: 'https://picsum.photos/seed/carol/96',
    unreadCount: 1,
    lastMessageText: '收到，谢谢！',
    lastMessageTime: now - 2 * 60 * 60_000,
    isPinned: false,
    isMuted: true,
    marks: [],
  },
  {
    id: 'g_team',
    name: '产品技术群',
    type: CONVERSATION_TYPE.GROUPCHAT,
    unreadCount: 5,
    lastMessageText: 'Tom: 版本已发布',
    lastMessageFrom: 'u_tom',
    lastMessageTime: now - 10 * 60_000,
    isPinned: false,
    isMuted: false,
    marks: [],
  },
  {
    id: 'g_design',
    name: 'UIKIT 设计评审群',
    type: CONVERSATION_TYPE.GROUPCHAT,
    unreadCount: 0,
    lastMessageText: '李四: 视觉稿已更新',
    lastMessageFrom: 'u_lisi',
    lastMessageTime: now - 40 * 60_000,
    isPinned: false,
    isMuted: false,
    marks: [],
  },
  {
    id: 'g_market',
    name: '市场运营群',
    type: CONVERSATION_TYPE.GROUPCHAT,
    unreadCount: 99,
    lastMessageText: '王五: 活动方案初稿',
    lastMessageFrom: 'u_wangwu',
    lastMessageTime: now - 3 * 60 * 60_000,
    isPinned: false,
    isMuted: true,
    marks: [],
  },
]

/** mock 单聊在线状态（配合 enablePresence 开关展示） */
export const mockPresence: UiPresence[] = [
  { userId: 'u_alice', status: 'online', ext: '', lastTime: now },
  { userId: 'u_bob', status: 'busy', ext: 'busy', lastTime: now },
  { userId: 'u_carol', status: 'away', ext: 'away', lastTime: now },
]
`.trim(),
}
