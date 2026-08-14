/**
 * 消息列表页在线演练场初始模板（VuePlayground files）
 *
 * 模板约束：只能 import import map 已覆盖的模块
 * （vue / pinia / easemob-websdk / @easemob/uikit），预览 iframe 才能解析。
 * mock 注入复用文档站 message-list 演练场模式（无登录态渲染），
 * 用户可自由编辑 messageList 配置对象，右侧列表实时生效。
 */
export const messageListPlaygroundFiles: Record<string, string> = {
  'App.vue': `
<script setup lang="ts">
import { computed, reactive } from 'vue'
import {
  EmUIKitProvider,
  EmMessageList,
  useConversationStore,
  useMessageStore,
  CONVERSATION_TYPE,
  MESSAGE_STATUS,
  MESSAGE_TYPE,
} from '@easemob/uikit'
import type { ChatConfig, UiConversation, UiMessage } from '@easemob/uikit'

// ---------- mock 注入（无登录态演示） ----------
const conversationStore = useConversationStore()
const messageStore = useMessageStore()

const conversation: UiConversation = {
  id: 'mock_cvs_playground',
  name: 'UIKIT 设计评审群',
  type: CONVERSATION_TYPE.GROUPCHAT,
  avatar: '',
  unreadCount: 0,
  lastMessageText: '大家看下新版消息列表的效果。',
  marks: [],
  lastMessageTime: Date.now(),
  isPinned: false,
  isMuted: false,
}
conversationStore.setConversationList([conversation])
conversationStore.setCurrentConversationId(conversation.id)

const now = Date.now()

function buildMessage(seed: {
  id: string
  from: string
  content?: string
  timestamp: number
  isSelf: boolean
  status: UiMessage['status']
}): UiMessage {
  return {
    msgServerId: '',
    msgLocalId: seed.id,
    from: seed.from,
    to: conversation.id,
    sender: { userId: seed.from },
    conversationId: conversation.id,
    conversationType: CONVERSATION_TYPE.GROUPCHAT,
    type: MESSAGE_TYPE.TEXT,
    sendStatus: 'sent',
    ext: {},
    timestamp: seed.timestamp,
    body: { content: seed.content ?? '' },
    content: seed.content,
    isSelf: seed.isSelf,
    status: seed.status,
  } as UiMessage
}

messageStore.messageMap[conversation.id] = [
  buildMessage({
    id: 'msg_1',
    from: 'user_lee',
    content: '大家看下新版消息列表的视觉稿，重点看时间戳和头像区域。',
    timestamp: now - 26 * 60_000,
    isSelf: false,
    status: MESSAGE_STATUS.READ,
  }),
  buildMessage({
    id: 'msg_2',
    from: 'user_self',
    content: '收到，我这边先整体过一遍。',
    timestamp: now - 25 * 60_000,
    isSelf: true,
    status: MESSAGE_STATUS.READ,
  }),
  buildMessage({
    id: 'msg_3',
    from: 'user_lee',
    content: '布局改为左对齐后群消息的阅读节奏更连贯，你们觉得呢？',
    timestamp: now - 10 * 60_000,
    isSelf: false,
    status: MESSAGE_STATUS.READ,
  }),
  buildMessage({
    id: 'msg_4',
    from: 'user_self',
    content: '我先同步到文档站，稍后给大家发链接。',
    timestamp: now - 60_000,
    isSelf: true,
    status: MESSAGE_STATUS.SENDING,
  }),
]

// ---------- 可编辑配置（改这里实时生效） ----------
const messageListConfig = reactive({
  layout: 'conversation',
  showAvatar: true,
  showTime: 'always',
  bubbleShape: 'round',
  avatarSize: 36,
  messageGap: 12,
  messagePadding: 16,
  // mock 演练场无 SDK 连接，禁用历史加载避免报错
  loadHistory: { enable: false },
  messageStatus: {
    style: 'classic',
    direction: 'horizontal',
    position: 'below',
    showText: false,
  },
})

const chatConfig = computed<ChatConfig>(() => ({
  messageList: { ...messageListConfig },
}))
</script>

<template>
  <EmUIKitProvider :auto-init="false">
    <div class="stage">
      <EmMessageList :config="chatConfig" />
    </div>
  </EmUIKitProvider>
</template>

<style scoped>
.stage {
  height: 480px;
  background: var(--uikit-bg-base);
}
</style>
`.trim(),
}
