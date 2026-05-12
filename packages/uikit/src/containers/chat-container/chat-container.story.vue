<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUIKit } from '../../composables/use-uikit'
import { useChat } from '../../composables/use-chat'
import type { ChatConfig } from '../../modules/chat/types'
import { CONVERSATION_TYPE, MESSAGE_TYPE, MESSAGE_STATUS } from '../../constants'
import ChatContainer from './chat-container.vue'
import UIKitProvider from '../uikit-provider/uikit-provider.vue'

/** 构造 mock 会话与消息，便于 Story 中展示不同配置效果 */
function injectMockData() {
  const { stores } = useUIKit()
  const cvsStore = stores.conversation
  const msgStore = stores.message

  const mockConversation = {
    id: 'cvs_001',
    name: '产品讨论群',
    type: CONVERSATION_TYPE.GROUPCHAT,
    avatar: '',
    unreadCount: 3,
    lastMessage: '大家看下这个设计方案',
    lastMessageType: MESSAGE_TYPE.TXT,
    lastMessageSender: 'user_002',
    lastMessageTime: Date.now(),
    timestamp: Date.now(),
    isPinned: false,
    isMuted: false,
  }

  cvsStore.setConversationList([mockConversation])
  cvsStore.setCurrentConversation(mockConversation)

  const mockMessages = Array.from({ length: 8 }, (_, i) => {
    const type = i % 3 === 0 ? 'txt' as const : i % 3 === 1 ? 'img' as const : 'audio' as const
    return {
      id: `msg_${i}`,
      conversationId: mockConversation.id,
      chatType: 'groupChat' as const,
      to: mockConversation.id,
      from: i % 2 === 0 ? 'user_self' : 'user_002',
      type,
      // 文本消息字段
      ...(type === 'txt' ? { msg: `这是第 ${i + 1} 条测试消息内容，用于展示消息列表的渲染效果。` } : {}),
      // 图片消息字段
      ...(type === 'img' ? { url: 'https://picsum.photos/200/150', file_length: 10240 } : {}),
      // 语音消息字段
      ...(type === 'audio' ? { url: '', length: 15, filename: 'voice.amr', file_length: 10240 } : {}),
      time: Date.now() - (8 - i) * 60000,
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
            <template #header-title="{ conversation }">
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
                [自定义文本] {{ 'msg' in message ? message.msg : '' }}
              </div>
            </template>
          </ChatContainer>
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>
