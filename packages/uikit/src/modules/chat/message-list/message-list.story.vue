<script setup lang="ts">
import { ref } from 'vue'
import { useConversationStore } from '../../../store/conversation'
import { useMessageStore } from '../../../store/message'
import UIKitProvider from '../../../containers/uikit-provider/uikit-provider.vue'
import { CONVERSATION_TYPE, MESSAGE_STATUS } from '../../../constants'
import type { ChatConfig } from '../types'
import MessageList from './message-list.vue'

const logs = ref<string[]>([])

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}

/** 构造 mock 会话与全类型消息（text/image/voice/video/file/combine） */
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

  const base = {
    conversationId: mockConversation.id,
    conversationType: 'groupChat' as const,
    to: mockConversation.id,
  }

  const mockMessages = [
    {
      ...base,
      id: 'msg_1',
      from: 'user_002',
      type: 'text',
      content: '这是第一条文本消息，用于展示消息列表的渲染效果。',
      timestamp: Date.now() - 8 * 60000,
      isSelf: false,
      status: MESSAGE_STATUS.READ,
    },
    {
      ...base,
      id: 'msg_2',
      from: 'user_self',
      type: 'image',
      body: { type: 'img', url: 'https://picsum.photos/300/200', file_length: 10240 },
      timestamp: Date.now() - 7 * 60000,
      isSelf: true,
      status: MESSAGE_STATUS.READ,
    },
    {
      ...base,
      id: 'msg_3',
      from: 'user_002',
      type: 'voice',
      body: { type: 'audio', url: '', filename: 'voice.amr', file_length: 10240, duration: 15 },
      timestamp: Date.now() - 6 * 60000,
      isSelf: false,
      status: MESSAGE_STATUS.DELIVERED,
    },
    {
      ...base,
      id: 'msg_4',
      from: 'user_self',
      type: 'video',
      body: {
        type: 'video',
        url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        thumb: 'https://picsum.photos/160/100',
        filename: 'demo.mp4',
        file_length: 204800,
        duration: 10,
      },
      timestamp: Date.now() - 5 * 60000,
      isSelf: true,
      status: MESSAGE_STATUS.DELIVERED,
    },
    {
      ...base,
      id: 'msg_5',
      from: 'user_002',
      type: 'file',
      body: { type: 'file', filename: '设计方案-v3.pdf', file_length: 5242880, url: '' },
      timestamp: Date.now() - 4 * 60000,
      isSelf: false,
      status: MESSAGE_STATUS.DELIVERED,
    },
    {
      ...base,
      id: 'msg_6',
      from: 'user_self',
      type: 'text',
      content: '我这边已经确认，可以按这个方案推进。',
      timestamp: Date.now() - 3 * 60000,
      isSelf: true,
      status: MESSAGE_STATUS.SENDING,
    },
    {
      ...base,
      id: 'msg_7',
      from: 'user_002',
      type: 'combine',
      body: {
        type: 'combine',
        title: '产品讨论群的历史消息',
        summary: '张三: 这个虚拟列表的性能优化方案不错\n李四: 具体怎么实现？',
      },
      timestamp: Date.now() - 2 * 60000,
      isSelf: false,
      status: MESSAGE_STATUS.READ,
    },
  ]

  msgStore.messageMap[mockConversation.id] = mockMessages as any
}

// 注入 mock 数据供 Story 展示
injectMockData()

/** 基础配置 */
const baseConfig: ChatConfig = {
  messageList: { layout: 'conversation', showAvatar: true, showTime: true },
}
</script>

<template>
  <Story title="Modules/MessageList">
    <Variant title="全部消息类型">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <MessageList
            :config="baseConfig"
            @reedit="(m: any) => log('reedit', m.id)"
            @forward="(msgs: any[]) => log('forward', `${msgs.length} 条`)"
            @mention-click="(id: string) => log('mention-click', id)"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="隐藏头像">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <MessageList
            :config="{ ...baseConfig, messageList: { ...baseConfig.messageList, showAvatar: false } }"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="悬停显示时间">
      <div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <UIKitProvider :auto-init="false">
          <MessageList
            :config="{ ...baseConfig, messageList: { ...baseConfig.messageList, showTime: 'hover' } }"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="display: flex; gap: 12px;">
        <div style="height: 600px; width: 480px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <UIKitProvider :auto-init="false">
            <MessageList
              :config="baseConfig"
              @reedit="(m: any) => log('reedit', m.id)"
              @forward="(msgs: any[]) => log('forward', `${msgs.length} 条`)"
            />
          </UIKitProvider>
        </div>
        <div style="width: 240px; font-size: 12px; color: #6b7280;">
          事件（消息操作触发）：
          <ul style="margin: 4px 0; padding-left: 16px;">
            <li v-for="(logItem, i) in logs.slice(0, 8)" :key="i">
              {{ logItem }}
            </li>
          </ul>
        </div>
      </div>
    </Variant>
  </Story>
</template>
