<script setup lang="ts">
import { ref } from 'vue'
import { useConversationStore } from '../../store/conversation'
import { useMessageStore } from '../../store/message'
import { useUIKit } from '../../composables/use-uikit'
import type { ChatConfig } from '../../modules/chat/types'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '../../constants'
import UIKitProvider from '../uikit-provider/uikit-provider.vue'
import ChatContainer from './chat-container.vue'
import type { UiMessage } from '../../sdk/types'

/**
 * ChatContainer Plugin Extension Points
 *
 * 本 Story 演示 UIKIT 为业务 plugin 预留的扩展点：
 * - #toolbar-extra / #input-panel：输入框工具栏与面板扩展
 * - #message-custom / @custom-message-action：自定义消息渲染与点击事件
 * - #message-action-extra：消息操作菜单扩展
 * - config.lastMessageTextResolver：会话列表最新消息预览文案解析
 */

function injectMockData() {
  const cvsStore = useConversationStore()
  const msgStore = useMessageStore()

  const mockConversation = {
    id: 'cvs_plugin',
    name: 'Plugin 演示群',
    type: CONVERSATION_TYPE.GROUPCHAT,
    avatar: '',
    unreadCount: 0,
    lastMessageText: '[名片] 来自 product-user 的名片',
    marks: [],
    lastMessageTime: Date.now(),
    timestamp: Date.now(),
    isPinned: false,
    isMuted: false,
  }

  cvsStore.setConversationList([mockConversation])
  cvsStore.setCurrentConversationId(mockConversation.id)

  const mockMessages: any[] = [
    {
      id: 'msg_text',
      msgLocalId: 'msg_text',
      conversationId: mockConversation.id,
      conversationType: 'groupChat',
      to: mockConversation.id,
      from: 'user_002',
      type: MESSAGE_TYPE.TEXT,
      content: '这条是普通文本消息，右键/长按可看到扩展菜单项。',
      timestamp: Date.now() - 5 * 60000,
      isSelf: false,
      status: MESSAGE_STATUS.READ,
    },
    {
      id: 'msg_card',
      msgLocalId: 'msg_card',
      conversationId: mockConversation.id,
      conversationType: 'groupChat',
      to: mockConversation.id,
      from: 'user_002',
      type: MESSAGE_TYPE.CUSTOM,
      body: {
        event: 'userCard',
        params: { uid: 'user_002', nickname: '产品经理小王', avatar: '' },
      },
      timestamp: Date.now() - 3 * 60000,
      isSelf: false,
      status: MESSAGE_STATUS.READ,
    },
    {
      id: 'msg_order',
      msgLocalId: 'msg_order',
      conversationId: mockConversation.id,
      conversationType: 'groupChat',
      to: mockConversation.id,
      from: 'user_self',
      type: MESSAGE_TYPE.CUSTOM,
      body: {
        event: 'order',
        params: { orderId: 'ORD-20240801', title: 'iPhone 15 Pro', price: '8999' },
      },
      timestamp: Date.now() - 1 * 60000,
      isSelf: true,
      status: MESSAGE_STATUS.SENT,
    },
  ]

  msgStore.messageMap[mockConversation.id] = mockMessages
}

injectMockData()

const baseConfig: ChatConfig = {
  header: { visible: true, align: 'center' },
  messageList: { layout: 'conversation', showAvatar: true, showTime: true },
  input: { mode: 'simple', style: 'wechat', features: { emoji: true, image: true, file: true, voice: false } },
}

/** 自定义会话预览文案 */
const resolverConfig: ChatConfig = {
  ...baseConfig,
  lastMessageTextResolver: (message: UiMessage) => {
    if (message.type === MESSAGE_TYPE.CUSTOM) {
      const event = (message.body as any).event
      const params = (message.body as any).params || {}
      if (event === 'userCard')
        return `[名片] ${params.nickname || params.uid || '某人'} 的名片`
      if (event === 'order')
        return `订单：${params.title || params.orderId || '未知商品'}`
      if (event === 'vote')
        return `[投票] ${params.title || '投票'}`
    }
    // 返回 undefined 走默认解析
    return undefined
  },
}

const actionLog = ref('')
function logAction(action: string, payload: any, message: UiMessage) {
  actionLog.value = `action: ${action}\npayload: ${JSON.stringify(payload)}\nmsgType: ${message.type}\nmsgId: ${message.msgServerId || message.msgLocalId}`
}

/** 输入框面板显隐 */
const showQuickReplyPanel = ref(false)
const quickReplyChatRef = ref<{ setText?: (text: string) => void }>()
const quickReplies = [
  { label: '问候', items: ['您好，请问有什么可以帮您？', '欢迎咨询！'] },
  { label: '跟进', items: ['订单已发货，请注意查收。', '问题正在处理中，请稍候。'] },
  { label: '结束', items: ['感谢您的咨询，祝您生活愉快！', '有问题随时联系，再见！'] },
]

function onQuickReply(text: string) {
  quickReplyChatRef.value?.setText?.(text)
  showQuickReplyPanel.value = false
}
</script>

<template>
  <Story title="ChatContainer / Plugin Extensions">
    <Variant title="Toolbar + Input Panel">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :ref="(el: any) => quickReplyChatRef = el" :config="baseConfig">
            <template #toolbar-extra="{ togglePanel }">
              <button
                style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; border-radius: 6px; background: transparent; color: var(--uikit-text-secondary); cursor: pointer;"
                title="快捷回复"
                @click="togglePanel"
              >
                ⚡
              </button>
            </template>
            <template #input-panel="{ showPanel }">
              <div
                v-if="showPanel"
                style="display: flex; flex-direction: column; gap: 12px; padding: 8px;"
              >
                <div
                  v-for="group in quickReplies"
                  :key="group.label"
                  style="display: flex; flex-direction: column; gap: 8px;"
                >
                  <span style="font-size: 12px; color: var(--uikit-text-secondary);">{{ group.label }}</span>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    <button
                      v-for="(text, idx) in group.items"
                      :key="idx"
                      style="padding: 6px 12px; border: 1px solid var(--uikit-border-color); border-radius: 6px; background: var(--uikit-bg-base); color: var(--uikit-text-primary); font-size: 13px; cursor: pointer;"
                      @click="onQuickReply(text)"
                    >
                      {{ text }}
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </ChatContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Message + Action Event">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer
            :config="baseConfig"
            @custom-message-action="logAction"
          >
            <template #message-custom="{ message, emitAction }">
              <div
                v-if="message.body?.event === 'userCard'"
                style="padding: 12px 14px; background: var(--uikit-bg-secondary); border-radius: 12px; cursor: pointer; max-width: 220px;"
                @click="emitAction('view-card', { uid: message.body.params?.uid })"
              >
                <div style="font-size: 14px; font-weight: 500;">
                  {{ message.body.params?.nickname || message.body.params?.uid }}
                </div>
                <div style="font-size: 12px; color: var(--uikit-text-secondary); margin-top: 4px;">
                  [名片] 点击查看详情
                </div>
              </div>
              <div
                v-else-if="message.body?.event === 'order'"
                style="padding: 12px 14px; background: var(--uikit-bg-secondary); border-radius: 12px; cursor: pointer; max-width: 260px;"
                @click="emitAction('view-order', { orderId: message.body.params?.orderId })"
              >
                <div style="font-size: 14px; font-weight: 500;">
                  {{ message.body.params?.title }}
                </div>
                <div style="font-size: 12px; color: var(--uikit-text-secondary); margin-top: 4px;">
                  订单：{{ message.body.params?.orderId }} · ¥{{ message.body.params?.price }}
                </div>
              </div>
            </template>
          </ChatContainer>
        </UIKitProvider>
      </div>
      <pre
        v-if="actionLog"
        style="margin-top: 12px; padding: 12px; background: #f3f4f6; border-radius: 6px; font-size: 12px; white-space: pre-wrap;"
      >{{ actionLog }}</pre>
    </Variant>

    <Variant title="Message Action Extra">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="baseConfig">
            <template #message-action-extra="{ message }">
              <button
                style="width: 100%; padding: 10px 12px; text-align: left; background: transparent; border: none; color: var(--uikit-text-primary); font-size: 14px; cursor: pointer;"
                @click="logAction('plugin-action', { source: 'message-action-extra' }, message)"
              >
                Plugin 业务操作
              </button>
            </template>
          </ChatContainer>
        </UIKitProvider>
      </div>
      <pre
        v-if="actionLog"
        style="margin-top: 12px; padding: 12px; background: #f3f4f6; border-radius: 6px; font-size: 12px; white-space: pre-wrap;"
      >{{ actionLog }}</pre>
    </Variant>

    <Variant title="lastMessageTextResolver">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <ChatContainer :config="resolverConfig" />
        </UIKitProvider>
      </div>
      <p style="margin-top: 8px; font-size: 12px; color: var(--uikit-text-secondary);">
        左侧会话列表最后一条消息已按 resolver 渲染为「[名片] 产品经理小王 的名片」。
      </p>
    </Variant>
  </Story>
</template>
