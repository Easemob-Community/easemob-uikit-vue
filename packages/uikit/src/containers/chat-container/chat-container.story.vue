<script setup lang="ts">
import { ref } from 'vue'
import { useConversationStore } from '../../store/conversation'
import { useMessageStore } from '../../store/message'
import type { ChatConfig } from '../../modules/chat/types'
import { CONVERSATION_TYPE, MESSAGE_STATUS } from '../../constants'
import UIKitProvider from '../uikit-provider/uikit-provider.vue'
import ChatContainer from './chat-container.vue'

/** 构造 mock 会话与消息，便于 Story 中展示不同配置效果 */
/**
 * 直接使用 Pinia store（已在 histoire-setup 全局注册），避免依赖 UIKitProvider 的 inject 上下文。
 * 因为 script setup 顶层执行时尚未进入 <UIKitProvider> 子树，调用 useUIKit() 会抛错。
 */
function injectMockData() {
  const cvsStore = useConversationStore()
  const msgStore = useMessageStore()

  const mockConversation = {
    id: 'cvs_001',
    name: '产品讨论群',
    type: CONVERSATION_TYPE.GROUPCHAT,
    avatar: '',
    unreadCount: 3,
    lastMessageText: '大家看下这个设计方案',
    marks: [],

    lastMessageTime: Date.now(),
    timestamp: Date.now(),
    isPinned: false,
    isMuted: false,
  }

  cvsStore.setConversationList([mockConversation])
  cvsStore.setCurrentConversationId(mockConversation.id)

  const mockMessages = Array.from({ length: 8 }, (_, i) => {
    const type = i % 3 === 0 ? 'text' as const : i % 3 === 1 ? 'image' as const : 'voice' as const
    return {
      id: `msg_${i}`,
      conversationId: mockConversation.id,
      conversationType: 'groupChat' as const,
      to: mockConversation.id,
      from: i % 2 === 0 ? 'user_self' : 'user_002',
      type,
      // 文本消息字段
      ...(type === 'text' ? { content: `这是第 ${i + 1} 条测试消息内容，用于展示消息列表的渲染效果。` } : {}),
      // 图片消息字段
      ...(type === 'image' ? { url: 'https://picsum.photos/200/150', fileSize: 10240 } : {}),
      // 语音消息字段
      ...(type === 'voice' ? { url: '', duration: 15, filename: 'voice.amr', fileSize: 10240 } : {}),
      timestamp: Date.now() - (8 - i) * 60000,
      isSelf: i % 2 === 0,
      status: MESSAGE_STATUS.READ,
    }
  })

  msgStore.messageMap[mockConversation.id] = mockMessages as any
}

/** 基础配置 */
const baseConfig: ChatConfig = {
  header: { visible: true, align: 'center' },
  messageList: { layout: 'conversation', showAvatar: true, showTime: true },
  input: { mode: 'simple', style: 'wechat', features: { emoji: true, image: true, file: true, voice: true } },
}

/** 各种变体配置 */
const feishuConfig: ChatConfig = {
  header: { visible: true, align: 'left' },
  messageList: { layout: 'conversation', showAvatar: true, showTime: 'always', bubbleShape: 'square' },
  input: { mode: 'simple', style: 'feishu', features: { emoji: true, image: true, file: true, voice: false } },
}

const leftLayoutConfig: ChatConfig = {
  ...baseConfig,
  messageList: { layout: 'left', showAvatar: true, showTime: true },
}

const hiddenHeaderConfig: ChatConfig = {
  ...baseConfig,
  header: { visible: false },
}

const richInputConfig: ChatConfig = {
  ...baseConfig,
  input: { mode: 'rich', style: 'wechat', features: { emoji: true, image: true, file: true, voice: false } },
}

const disabledActionsConfig: ChatConfig = {
  ...baseConfig,
  messageAction: {
    enableQuote: false,
    enableCopy: true,
    enableDelete: true,
    enableRecall: false,
    enableForward: true,
    enableMultiSelect: false,
    enableTranslate: false,
    enablePin: false,
  },
}

/** 撤回时效：30 秒（用于 Story 演示过期效果） */
const recallExpiredConfig: ChatConfig = {
  ...baseConfig,
  messageAction: {
    ...baseConfig.messageAction,
    recallDisableDuration: 30 * 1000,
  },
}

const customSlotTitle = ref('✨ 自定义标题插槽')

/** 空状态配置：无当前会话 */
const emptyStateConfig: ChatConfig = {
  ...baseConfig,
}

/** 加载状态配置 */
const loadingConfig: ChatConfig = {
  ...baseConfig,
}

/** 发送拦截钩子配置 */
const hooksConfig: ChatConfig = {
  ...baseConfig,
  hooks: {
    beforeSend: (msg) => {
      console.log('[Story] beforeSend:', msg)
      // 演示：阻止包含 "敏感词" 的消息发送
      if ('content' in msg && typeof msg.content === 'string' && msg.content.includes('敏感词')) {
        alert('消息包含敏感词，已被拦截')
        return false
      }
      return true
    },
    afterSend: (msg) => {
      console.log('[Story] afterSend:', msg)
    },
  },
}

/** 自定义样式配置 */
const customStyleConfig: ChatConfig = {
  ...baseConfig,
}

// 注入 mock 数据供 Story 展示
injectMockData()
</script>

<template>
  <Story title="ChatContainer">
    <Variant title="Default">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="baseConfig" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Feishu Style">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="feishuConfig" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Left Layout (All Left)">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="leftLayoutConfig" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hidden Header">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="hiddenHeaderConfig" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Rich Input (PC Only)">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="richInputConfig" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Disabled Actions">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="disabledActionsConfig" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Recall Expired (30s)">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="recallExpiredConfig" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Header Slot">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="baseConfig">
            <template #header-title>
              <span style="font-weight: 700; color: #3b82f6;">{{ customSlotTitle }}</span>
            </template>
            <template #header-extra>
              <span style="font-size: 12px; color: #6b7280;">v2.0</span>
            </template>
          </ChatContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Message Slot">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="baseConfig">
            <template #message-txt="{ message }">
              <div style="padding: 10px 14px; background: #fef3c7; border-radius: 12px; color: #92400e; font-size: 14px;">
                [自定义文本] {{ 'content' in message ? message.content : '' }}
              </div>
            </template>
          </ChatContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Empty State (No Conversation)">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="emptyStateConfig" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Empty Slot">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="emptyStateConfig">
            <template #empty>
              <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                <span style="font-size: 48px;">&#128172;</span>
                <span style="font-size: 16px; color: var(--uikit-text-secondary);">选择一个会话开始聊天吧</span>
              </div>
            </template>
          </ChatContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Loading State">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="loadingConfig" loading />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Loading Slot">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="loadingConfig" loading>
            <template #loading>
              <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                <span style="font-size: 32px; animation: spin 1s linear infinite;">&#128260;</span>
                <span style="font-size: 14px; color: var(--uikit-text-secondary);">正在加载会话...</span>
              </div>
            </template>
          </ChatContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Class & Style">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer
            :config="customStyleConfig"
            class="story-custom-chat"
            :style="{ backgroundColor: '#f0f9ff', borderRadius: '12px' }"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Send Hooks (beforeSend / afterSend)">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="hooksConfig" />
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>

<style>
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
