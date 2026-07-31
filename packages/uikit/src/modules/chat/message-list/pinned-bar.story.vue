<script setup lang="ts">
import { ref } from 'vue'
import UIKitProvider from '../../../containers/uikit-provider/uikit-provider.vue'
import { useConversationStore } from '../../../store/conversation'
import { useMessageStore } from '../../../store/message'
import { CONVERSATION_TYPE } from '../../../constants'
import PinnedBar from './pinned-bar.vue'

const logs = ref<string[]>([])

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}

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
    timestamp: Date.now(),
    isSelf: false,
  }

  msgStore.setPinnedMessages(mockConversation.id, [
    {
      ...base,
      id: 'pin_1',
      from: 'user_002',
      type: 'text',
      body: { type: 'txt', content: '这条是置顶消息，内容比较长，用于验证折叠态下的预览截断效果' },
      pinned: true,
      pinTime: Date.now() - 1000 * 60,
      pinOperatorId: 'user_002',
    },
    {
      ...base,
      id: 'pin_2',
      from: 'user_002',
      type: 'image',
      body: { type: 'img', originalImageUrl: 'https://picsum.photos/300/200' },
      pinned: true,
      pinTime: Date.now() - 1000 * 60 * 30,
      pinOperatorId: 'user_002',
    },
    {
      ...base,
      id: 'pin_3',
      from: 'user_self',
      type: 'voice',
      body: { type: 'audio', url: '', filename: 'voice.amr', file_length: 10240, duration: 15 },
      pinned: true,
      pinTime: Date.now() - 1000 * 60 * 60,
      pinOperatorId: 'user_self',
    },
  ] as any)
}

injectMockData()
</script>

<template>
  <Story title="Modules/PinnedBar">
    <Variant title="多条置顶">
      <div style="width: 480px; background: var(--uikit-bg-base); border-radius: 8px;">
        <UIKitProvider :auto-init="false">
          <PinnedBar
            @locate="(m: any) => log('locate', m.id)"
            @unpin="(m: any) => log('unpin', m.id)"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="width: 480px; background: var(--uikit-bg-base); border-radius: 8px;">
        <UIKitProvider :auto-init="false">
          <PinnedBar
            @locate="(m: any) => log('locate', m.id)"
            @unpin="(m: any) => log('unpin', m.id)"
          />
        </UIKitProvider>
        <div style="padding: 12px; font-size: 12px; color: #6b7280;">
          事件：
          <ul style="margin: 4px 0; padding-left: 16px;">
            <li v-for="(logItem, i) in logs.slice(0, 5)" :key="i">
              {{ logItem }}
            </li>
          </ul>
        </div>
      </div>
    </Variant>
  </Story>
</template>
