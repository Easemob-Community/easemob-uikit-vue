<script setup lang="ts">
import { ref } from 'vue'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import { useConversationStore } from '../../store/conversation'
import type { UiConversation as Conversation } from '../../sdk/types'
import ConversationList from './conversation-list.vue'

const logs = ref<string[]>([])

function injectMockConversations() {
  const store = useConversationStore()
  const list: Conversation[] = [
    {
      id: 'u_alice',
      name: 'Alice',
      type: 'singleChat',
      unreadCount: 5,
      lastMessageText: '明天下午三点开会，记得带上方案',
      lastMessageTime: Date.now() - 5 * 60 * 1000,
      isPinned: false,
      isMuted: false,
      marks: [],
    },
    {
      id: 'g_001',
      name: 'Vue 技术交流群',
      type: 'groupChat',
      unreadCount: 128,
      lastMessageText: '张三: 这个虚拟列表的性能优化方案不错',
      lastMessageTime: Date.now() - 60 * 60 * 1000,
      isPinned: true,
      isMuted: false,
      marks: [],
    },
    {
      id: 'u_bob',
      name: 'Bob',
      type: 'singleChat',
      unreadCount: 12,
      lastMessageText: '晚上一起吃饭吗？',
      lastMessageTime: Date.now() - 3 * 60 * 60 * 1000,
      isPinned: false,
      isMuted: true,
      marks: [],
    },
    {
      id: 'g_002',
      name: '周末桌游局',
      type: 'groupChat',
      unreadCount: 0,
      lastMessageText: '李四: 这周六下午两点开一局',
      lastMessageTime: Date.now() - 24 * 60 * 60 * 1000,
      isPinned: false,
      isMuted: false,
      marks: [],
    },
    {
      id: 'u_carol',
      name: 'Carol',
      type: 'singleChat',
      unreadCount: 3,
      lastMessageText: '文件已经发你邮箱了',
      lastMessageTime: Date.now() - 2 * 24 * 60 * 60 * 1000,
      isPinned: false,
      isMuted: false,
      marks: [],
    },
  ]
  store.setConversationList(list)
}

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}
</script>

<template>
  <Story title="Modules/ConversationList">
    <Variant title="默认">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ConversationList
            title="消息"
            @vue:mounted="injectMockConversations"
            @select="(id: string) => log('select', id)"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="未读红点模式">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ConversationList
            title="消息"
            unread-mode="dot"
            @vue:mounted="injectMockConversations"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="隐藏搜索与头部">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ConversationList
            :show-search="false"
            :show-header="false"
            @vue:mounted="injectMockConversations"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="空列表">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ConversationList
            title="消息"
            empty-text="暂无会话，去发起新的聊天吧"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="display: flex; gap: 12px;">
        <div style="height: 600px; width: 320px;">
          <UIKitProvider :auto-init="false">
            <ConversationList
              title="消息"
              @vue:mounted="injectMockConversations"
              @select="(id: string) => log('select', id)"
              @at-me-click="(id: string) => log('at-me-click', id)"
            />
          </UIKitProvider>
        </div>
        <div style="width: 240px; font-size: 12px; color: #6b7280;">
          事件：
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
