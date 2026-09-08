<script setup lang="ts">
import { ref } from 'vue'
import { useConversationStore } from '../../store/conversation'
import { useMessageStore } from '../../store/message'
import type { ChatConfig } from '../../modules/chat/types'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE, usePresenceStore, useUserInfoStore } from '@easemob/uikit-core'
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
    const type = i % 3 === 0 ? MESSAGE_TYPE.TEXT : i % 3 === 1 ? MESSAGE_TYPE.IMAGE : MESSAGE_TYPE.VOICE
    return {
      id: `msg_${i}`,
      conversationId: mockConversation.id,
      conversationType: CONVERSATION_TYPE.GROUPCHAT,
      to: mockConversation.id,
      from: i % 2 === 0 ? 'user_self' : 'user_002',
      type,
      // 文本消息字段
      ...(type === MESSAGE_TYPE.TEXT ? { content: `这是第 ${i + 1} 条测试消息内容，用于展示消息列表的渲染效果。` } : {}),
      // 图片消息字段
      ...(type === MESSAGE_TYPE.IMAGE ? { url: 'https://picsum.photos/200/150', fileSize: 10240 } : {}),
      // 语音消息字段
      ...(type === MESSAGE_TYPE.VOICE ? { url: '', duration: 15, filename: 'voice.amr', fileSize: 10240 } : {}),
      timestamp: Date.now() - (8 - i) * 60000,
      isSelf: i % 2 === 0,
      status: [MESSAGE_STATUS.SENDING, MESSAGE_STATUS.FAILED, MESSAGE_STATUS.DELIVERED, MESSAGE_STATUS.READ][i % 4],
    }
  })

  msgStore.messageMap[mockConversation.id] = mockMessages as any
}

/** 单聊会话 mock（header 副标题区演示） */
const singleChatConversation = {
  id: 'user_002',
  name: '',
  type: CONVERSATION_TYPE.SINGLECHAT,
  avatar: '',
  unreadCount: 0,
  lastMessageText: '周末一起去打球吗？',
  marks: [],
  lastMessageTime: Date.now(),
  timestamp: Date.now(),
  isPinned: false,
  isMuted: false,
}

/**
 * 注入单聊 mock：会话 + 对方资料（含签名）+ 在线状态。
 * 经 @vue:mounted 挂在具体 Variant 上，避免覆盖其它 Variant 的群聊会话。
 */
function injectSingleChatMockData(typing = false) {
  const cvsStore = useConversationStore()
  const presenceStore = usePresenceStore()
  const userInfoStore = useUserInfoStore()

  cvsStore.setConversationList([singleChatConversation])
  cvsStore.setCurrentConversationId(singleChatConversation.id)

  userInfoStore.setUserInfo({ userId: 'user_002', nickname: '小环', sign: '保持热爱，奔赴山海' })
  userInfoStore.markFetchedAttributes(['user_002'], ['nickname', 'avatarUrl', 'sign'])
  presenceStore.update({ userId: 'user_002', status: 'online', lastTime: Date.now() })

  if (typing)
    cvsStore.setTyping(singleChatConversation.id, 'user_002')
  else
    cvsStore.clearTyping(singleChatConversation.id)
}

/** 基础配置 */
const baseConfig: ChatConfig = {
  header: { visible: true, align: 'center' },
  messageList: { layout: 'conversation', showAvatar: true, showTime: true },
  input: { mode: 'simple', style: 'toolbar-top', features: { emoji: true, image: true, file: true, voice: true } },
}

/** 单聊 header 配置（设计师稿：左对齐、不展示头像） */
const singleChatConfig: ChatConfig = {
  ...baseConfig,
  header: { visible: true, align: 'left' },
}

/** 单聊副标题：仅在线状态档 */
const subtitlePresenceConfig: ChatConfig = {
  ...baseConfig,
  header: { visible: true, align: 'left', subtitle: 'presence' },
}

/** 各种变体配置 */
const toolbarBottomConfig: ChatConfig = {
  header: { visible: true, align: 'left' },
  messageList: { layout: 'conversation', showAvatar: true, showTime: 'always', bubbleShape: 'square' },
  input: { mode: 'simple', style: 'toolbar-bottom', features: { emoji: true, image: true, file: true, voice: false } },
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
  input: { mode: 'rich', style: 'toolbar-top', features: { emoji: true, image: true, file: true, voice: false } },
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

/** 时间戳：始终显示 */
const timestampAlwaysConfig: ChatConfig = {
  ...baseConfig,
  messageList: { ...baseConfig.messageList, showTime: 'always' },
}

/** 时间戳：悬停显示 */
const timestampHoverConfig: ChatConfig = {
  ...baseConfig,
  messageList: { ...baseConfig.messageList, showTime: 'hover' },
}

/** 时间戳：隐藏 */
const timestampHiddenConfig: ChatConfig = {
  ...baseConfig,
  messageList: { ...baseConfig.messageList, showTime: false },
}

/** 消息状态：仅图标 */
const statusIconOnlyConfig: ChatConfig = {
  ...baseConfig,
  messageList: { ...baseConfig.messageList, messageStatus: { showText: false } },
}

/** 消息状态：文本横向排列 */
const statusTextHorizontalConfig: ChatConfig = {
  ...baseConfig,
  messageList: {
    ...baseConfig.messageList,
    messageStatus: { showText: true, direction: 'horizontal' },
  },
}

/** 消息状态：文本纵向排列 */
const statusTextVerticalConfig: ChatConfig = {
  ...baseConfig,
  messageList: {
    ...baseConfig.messageList,
    messageStatus: { showText: true, direction: 'vertical' },
  },
}

/** 消息状态：自定义文案 */
const customStatusTextConfig: ChatConfig = {
  ...baseConfig,
  messageList: {
    ...baseConfig.messageList,
    messageStatus: {
      showText: true,
      textMap: {
        sending: '发送中…',
        delivered: '已送达',
        read: '已读',
        failed: '发送失败',
      },
    },
  },
}

// 注入 mock 数据供 Story 展示
injectMockData()
</script>

<template>
  <Story title="ChatContainer">
    <Variant title="Default">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="baseConfig" @vue:mounted="injectMockData" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Toolbar Bottom">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="toolbarBottomConfig" />
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
              <span style="font-size: var(--uikit-font-size-12); color: #6b7280;">v2.0</span>
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
              <div style="padding: 10px 14px; background: #fef3c7; border-radius: 12px; color: #92400e; font-size: var(--uikit-font-size-14);">
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
                <span style="font-size: var(--uikit-font-size-16); color: var(--uikit-text-secondary);">选择一个会话开始聊天吧</span>
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
                <span style="font-size: var(--uikit-font-size-14); color: var(--uikit-text-secondary);">正在加载会话...</span>
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

    <Variant title="Timestamp: Always">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="timestampAlwaysConfig" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Timestamp: Hover">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="timestampHoverConfig" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Timestamp: Hidden">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="timestampHiddenConfig" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Message Status: Icon Only">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="statusIconOnlyConfig" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Message Status: Text Horizontal">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="statusTextHorizontalConfig" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Message Status: Text Vertical">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="statusTextVerticalConfig" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Message Status: Custom Text">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="customStatusTextConfig" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="#message-action-menu 菜单整体接管">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer
            :config="baseConfig"
            @vue:mounted="injectMockData"
          >
            <!-- 接管消息操作菜单：内置 actions + 自定义「举报」主菜单项 -->
            <template #message-action-menu="{ actions, select, close }">
              <div style="display: flex; flex-direction: column; gap: 4px; min-width: 160px; padding: 6px;">
                <button
                  v-for="action in actions"
                  :key="action.type"
                  type="button"
                  style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: none; border-radius: 8px; background: none; cursor: pointer; font-size: var(--uikit-font-size-14); color: var(--uikit-text-primary);"
                  :disabled="action.disabled"
                  @click="select(action.type, action)"
                >
                  {{ action.label }}
                </button>
                <button
                  type="button"
                  style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: none; border-radius: 8px; background: none; cursor: pointer; font-size: var(--uikit-font-size-14); color: var(--uikit-danger-color);"
                  @click="close"
                >
                  举报（示例：关闭菜单，业务在此处理举报逻辑）
                </button>
              </div>
            </template>
          </ChatContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="#group-card 名片弹窗接管">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer
            :config="baseConfig"
            @vue:mounted="injectMockData"
          >
            <!-- 点击 header 头像打开群名片时，渲染业务自己的名片 -->
            <template #group-card="{ show, groupId, close }">
              <div v-if="show" style="position: fixed; inset: 0; z-index: 3000; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.4);" @click.self="close">
                <div style="width: 280px; padding: 20px; border-radius: 12px; background: var(--uikit-bg-elevated);">
                  <p style="margin: 0 0 8px; font-weight: 600;">业务自定义群名片</p>
                  <p style="margin: 0 0 16px; font-size: var(--uikit-font-size-13); color: var(--uikit-text-secondary);">groupId: {{ groupId }}</p>
                  <button type="button" @click="close">关闭</button>
                </div>
              </div>
            </template>
          </ChatContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Single Chat Subtitle (Presence + Sign)">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer
            :config="singleChatConfig"
            @vue:mounted="injectSingleChatMockData()"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Single Chat Subtitle (Typing)">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer
            :config="singleChatConfig"
            @vue:mounted="injectSingleChatMockData(true)"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Single Chat Subtitle (Presence Only)">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer
            :config="subtitlePresenceConfig"
            @vue:mounted="injectSingleChatMockData()"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="#header-subtitle 插槽接管">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer
            :config="singleChatConfig"
            @vue:mounted="injectSingleChatMockData()"
          >
            <!-- 接管单聊副标题区：scope 提供 conversation / typing / presence / sign -->
            <template #header-subtitle="{ typing, presence, sign }">
              <span style="font-size: var(--uikit-font-size-12); color: var(--uikit-text-secondary);">
                {{ typing ? '对方正在输入（自定义渲染）' : `自定义副标题：${presence?.status ?? 'unknown'} · ${sign}` }}
              </span>
            </template>
          </ChatContainer>
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
