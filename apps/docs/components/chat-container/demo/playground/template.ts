/**
 * 聊天（输入框 + 消息列表）在线代码演练场初始模板（VuePlayground files）
 *
 * 多文件约定：'App.vue' 为用户主编辑区（EmMessageInput + EmMessageList 组装），
 * 'mock.ts' 为 mock 群会话 / 初始消息 / 发送回显与 @提及联系人（一般不需要修改）。
 * 模板约束：只能 import import map 已覆盖的模块，预览 iframe 才能解析。
 */
export const chatContainerPlaygroundFiles: Record<string, string> = {
  'App.vue': `
<script setup lang="ts">
import { computed, reactive } from 'vue'
import {
  EmMessageInput,
  EmMessageList,
  EmUIKitProvider,
} from '@easemob/uikit'
import type { ChatConfig } from '@easemob/uikit'
import {
  appendMockSentMessage,
  injectMockContext,
  mockMentionContacts,
} from './mock'

// ---------- mock 注入（免登录渲染，见 mock.ts） ----------
injectMockContext()

// ===== 可编辑配置：改这里实时生效 =====
// focusBorderColor / caretColor / selectionColor 传 undefined 时使用主题默认值，
// 也可改为任意颜色值（如 '#10b981'）
const config = reactive({
  mode: 'simple' as 'simple' | 'rich',
  style: 'wechat' as 'wechat' | 'feishu',
  features: {
    emoji: true,
    image: true,
    file: true,
    voice: true,
    video: true,
    mention: true,
  },
  autoFocus: false,
  focusBorderColor: undefined as string | undefined,
  caretColor: undefined as string | undefined,
  selectionColor: undefined as string | undefined,
  showSendButton: true,
  resizable: true,
  expandable: true,
  isGroup: true,
})

/** 组装为 EmMessageInput / EmMessageList 的 config 入参 */
const chatConfig = computed<ChatConfig>(() => {
  // isGroup 是 EmMessageInput 的独立 prop，不放进 config.input
  const { isGroup: _isGroup, ...rest } = config
  return {
    input: {
      mode: rest.mode,
      style: rest.style,
      features: { ...rest.features },
      autoFocus: rest.autoFocus,
      focusBorderColor: rest.focusBorderColor,
      caretColor: rest.caretColor,
      selectionColor: rest.selectionColor,
      showSendButton: rest.showSendButton,
      resizable: rest.resizable,
      expandable: rest.expandable,
      // @提及联系人指向 mock 数据
      mention: { contacts: mockMentionContacts },
    },
    // mock 演练场无 SDK 连接，禁用历史加载避免 loadMoreHistory 报错
    messageList: { loadHistory: { enable: false } },
    // 发送拦截：写入 message store 模拟发送成功，返回 false 阻止 SDK 真实发送
    hooks: {
      beforeSend: (message) => {
        const text = (message as any)?.content || (message as any)?.body?.content || ''
        if (text)
          appendMockSentMessage(text)
        return false
      },
    },
  }
})
</script>

<template>
  <EmUIKitProvider :auto-init="false">
    <div class="chat-stage">
      <EmMessageInput
        :config="chatConfig"
        :is-group="config.isGroup"
        class="chat-stage__input"
      />
      <div class="chat-stage__messages">
        <EmMessageList :config="chatConfig" />
      </div>
    </div>
  </EmUIKitProvider>
</template>

<style scoped>
.chat-stage {
  display: flex;
  flex-direction: column;
  /* 撑满预览 iframe 视口（减掉 body 默认上下 8px 外边距，避免出现滚动条） */
  height: calc(100vh - 16px);
  min-height: 0;
  border: 1px solid var(--uikit-border-color, #eee);
  border-radius: var(--uikit-components-radius, 8px);
  overflow: hidden;
  box-sizing: border-box;
}

.chat-stage__input {
  flex: none;
}

.chat-stage__messages {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.chat-stage__messages :deep(.message-list) {
  flex: 1;
}
</style>
`.trim(),
  'mock.ts': `
/**
 * mock 数据，一般不需要修改
 *
 * 免登录渲染路径：向 conversation / message store 直灌 mock 群会话与初始消息后，
 * 在 EmUIKitProvider(:auto-init="false") 内渲染 EmMessageInput + EmMessageList。
 * 发送行为由 App.vue 的 beforeSend 钩子接管：写入 message store 模拟发送成功，不触碰 SDK。
 */
import {
  CONVERSATION_TYPE,
  MESSAGE_STATUS,
  MESSAGE_TYPE,
  useConversationStore,
  useMessageStore,
} from '@easemob/uikit'
import type { UiConversation, UiMessage } from '@easemob/uikit'

/** mock 会话 ID（多次注入时复用同一会话，避免列表残留） */
export const MOCK_CONVERSATION_ID = 'mock_chat_playground_001'

/** 注入 mock 群聊会话 + 初始消息，并设为当前会话（输入框依赖 currentConversation） */
export function injectMockContext(): void {
  const conversationStore = useConversationStore()
  const messageStore = useMessageStore()

  const conversation: UiConversation = {
    id: MOCK_CONVERSATION_ID,
    name: '输入框配置演示群',
    type: CONVERSATION_TYPE.GROUPCHAT,
    avatar: '',
    unreadCount: 0,
    lastMessageText: '大家试下输入框配置',
    marks: [],
    lastMessageTime: Date.now(),
    isPinned: false,
    isMuted: false,
  }

  conversationStore.setConversationList([conversation])
  conversationStore.setCurrentConversationId(conversation.id)

  const now = Date.now()
  const messages: UiMessage[] = [
    {
      msgServerId: 'input_mock_1',
      msgLocalId: 'input_mock_1',
      from: 'u_tom',
      to: MOCK_CONVERSATION_ID,
      sender: { userId: 'u_tom' },
      conversationId: MOCK_CONVERSATION_ID,
      conversationType: CONVERSATION_TYPE.GROUPCHAT,
      type: MESSAGE_TYPE.TEXT,
      sendStatus: 'sent',
      ext: {},
      timestamp: now - 60_000,
      body: { content: '左边面板可以实时切换输入框的形态和功能开关' },
      content: '左边面板可以实时切换输入框的形态和功能开关',
      isSelf: false,
      status: MESSAGE_STATUS.READ,
    } as UiMessage,
    {
      msgServerId: 'input_mock_2',
      msgLocalId: 'input_mock_2',
      from: 'u_self',
      to: MOCK_CONVERSATION_ID,
      sender: { userId: 'u_self' },
      conversationId: MOCK_CONVERSATION_ID,
      conversationType: CONVERSATION_TYPE.GROUPCHAT,
      type: MESSAGE_TYPE.TEXT,
      sendStatus: 'sent',
      ext: {},
      timestamp: now - 30_000,
      body: { content: '简单 / 富文本、微信 / 飞书风格都能试' },
      content: '简单 / 富文本、微信 / 飞书风格都能试',
      isSelf: true,
      status: MESSAGE_STATUS.READ,
    } as UiMessage,
  ]

  messageStore.messageMap[MOCK_CONVERSATION_ID] = messages
}

/** mock 发送：构造一条已发送文本消息写入 store，返回 false 阻止 SDK 真实发送 */
export function appendMockSentMessage(text: string): boolean {
  const messageStore = useMessageStore()
  const list = messageStore.messageMap[MOCK_CONVERSATION_ID] || []
  const msg: UiMessage = {
    msgServerId: '',
    msgLocalId: \`input_mock_sent_\${Date.now()}\`,
    from: 'u_self',
    to: MOCK_CONVERSATION_ID,
    sender: { userId: 'u_self' },
    conversationId: MOCK_CONVERSATION_ID,
    conversationType: CONVERSATION_TYPE.GROUPCHAT,
    type: MESSAGE_TYPE.TEXT,
    sendStatus: 'sent',
    ext: {},
    timestamp: Date.now(),
    body: { content: text },
    content: text,
    isSelf: true,
    status: MESSAGE_STATUS.SENT,
  } as UiMessage
  messageStore.messageMap[MOCK_CONVERSATION_ID] = [...list, msg]
  return false
}

/** @提及联系人（mock） */
export const mockMentionContacts = [
  { userId: 'u_alice', name: 'Alice', avatar: 'https://picsum.photos/seed/alice/64' },
  { userId: 'u_bob', name: 'Bob', avatar: 'https://picsum.photos/seed/bob/64' },
  { userId: 'u_carol', name: 'Carol', avatar: 'https://picsum.photos/seed/carol/64' },
]
`.trim(),
}
