<script setup lang="ts">
import { ref } from 'vue'
import { CONVERSATION_TYPE } from '@easemob/uikit-core'
import type { UiConversation as Conversation } from '@easemob/uikit-core'
import ConversationItem from './conversation-item.vue'

const singleChat: Conversation = {
  id: 'u_alice',
  name: 'Alice',
  type: CONVERSATION_TYPE.SINGLECHAT,
  unreadCount: 5,
  lastMessageText: '明天下午三点开会，记得带上方案',
  lastMessageTime: Date.now() - 5 * 60 * 1000,
  isPinned: false,
  isMuted: false,
  marks: [],
}

const groupChat: Conversation = {
  id: 'g_001',
  name: 'Vue 技术交流群',
  type: CONVERSATION_TYPE.GROUPCHAT,
  unreadCount: 128,
  lastMessageText: '张三: 这个虚拟列表的性能优化方案不错',
  lastMessageTime: Date.now() - 60 * 60 * 1000,
  isPinned: true,
  isMuted: false,
  marks: [],
}

const mutedChat: Conversation = {
  id: 'u_bob',
  name: 'Bob',
  type: CONVERSATION_TYPE.SINGLECHAT,
  unreadCount: 12,
  lastMessageText: '晚上一起吃饭吗？',
  lastMessageTime: Date.now() - 3 * 60 * 60 * 1000,
  isPinned: false,
  isMuted: true,
  marks: [],
}

const dotMode: Conversation = {
  id: 'u_carol',
  name: 'Carol',
  type: CONVERSATION_TYPE.SINGLECHAT,
  unreadCount: 3,
  lastMessageText: '文件已经发你邮箱了',
  lastMessageTime: Date.now() - 24 * 60 * 60 * 1000,
  isPinned: false,
  isMuted: false,
  marks: [],
}

const logs = ref<string[]>([])

function log(event: string, id?: string) {
  logs.value.unshift(`${event}${id ? `: ${id}` : ''}`)
}
</script>

<template>
  <Story title="Modules/ConversationItem">
    <Variant title="单聊">
      <div style="width: 320px; background: var(--uikit-bg-base); border-radius: 8px; overflow: hidden;">
        <ConversationItem
          :conversation="singleChat"
          @select="(id: string) => log('select', id)"
          @pin="(id: string, pinned: boolean) => log('pin', `${id} ${pinned}`)"
          @mute="(id: string, muted: boolean) => log('mute', `${id} ${muted}`)"
          @delete="(id: string) => log('delete', id)"
          @read="(id: string) => log('read', id)"
        />
      </div>
    </Variant>

    <Variant title="群聊（置顶）">
      <div style="width: 320px; background: var(--uikit-bg-base); border-radius: 8px; overflow: hidden;">
        <ConversationItem
          :conversation="groupChat"
          @select="(id: string) => log('select', id)"
        />
      </div>
    </Variant>

    <Variant title="免打扰">
      <div style="width: 320px; background: var(--uikit-bg-base); border-radius: 8px; overflow: hidden;">
        <ConversationItem
          :conversation="mutedChat"
          @select="(id: string) => log('select', id)"
        />
      </div>
    </Variant>

    <Variant title="未读红点模式">
      <div style="width: 320px; background: var(--uikit-bg-base); border-radius: 8px; overflow: hidden;">
        <ConversationItem
          :conversation="dotMode"
          unread-mode="dot"
          @select="(id: string) => log('select', id)"
        />
      </div>
    </Variant>

    <Variant title="隐藏发送者名称">
      <div style="width: 320px; background: var(--uikit-bg-base); border-radius: 8px; overflow: hidden;">
        <ConversationItem
          :conversation="groupChat"
          :show-sender-name="false"
          @select="(id: string) => log('select', id)"
        />
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="width: 320px; background: var(--uikit-bg-base); border-radius: 8px; overflow: hidden;">
        <ConversationItem
          :conversation="singleChat"
          @select="(id: string) => log('select', id)"
          @pin="(id: string, pinned: boolean) => log('pin', `${id} ${pinned}`)"
          @mute="(id: string, muted: boolean) => log('mute', `${id} ${muted}`)"
          @delete="(id: string) => log('delete', id)"
        />
        <div style="padding: 12px; font-size: var(--uikit-font-size-12); color: #6b7280;">
          事件（右键/长按操作触发）：
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
