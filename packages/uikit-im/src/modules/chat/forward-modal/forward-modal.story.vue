<script setup lang="ts">
import { ref } from 'vue'
import { CONVERSATION_TYPE } from '../../../constants'
import UIKitProvider from '../../../containers/uikit-provider/uikit-provider.vue'
import type { UiConversation } from '../../../sdk/types'
import { useConversationStore } from '../../../store/conversation'
import ForwardModal from './forward-modal.vue'

const show = ref(false)
const logs = ref<string[]>([])

const conversations: UiConversation[] = [
  { id: 'u_alice', name: 'Alice', type: CONVERSATION_TYPE.SINGLECHAT, unreadCount: 0, lastMessageText: '好的，收到', lastMessageTime: Date.now() - 600000, isPinned: false, isMuted: false, marks: [] },
  { id: 'u_bob', name: 'Bob', type: CONVERSATION_TYPE.SINGLECHAT, unreadCount: 2, lastMessageText: '明天见', lastMessageTime: Date.now() - 3600000, isPinned: false, isMuted: false, marks: [] },
  { id: 'g_design', name: '设计评审群', type: CONVERSATION_TYPE.GROUPCHAT, unreadCount: 5, lastMessageText: '大家看下这个方案', lastMessageTime: Date.now() - 7200000, isPinned: true, isMuted: false, marks: [] },
  { id: 'g_qa', name: 'QA 测试组', type: CONVERSATION_TYPE.GROUPCHAT, unreadCount: 0, lastMessageText: '[图片]', lastMessageTime: Date.now() - 86400000, isPinned: false, isMuted: true, marks: [] },
]

function injectMock() {
  useConversationStore().setConversationList(conversations)
}

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}
</script>

<template>
  <Story title="Modules/ForwardModal">
    <Variant title="默认（含会话列表）">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          转发消息
        </button>
        <UIKitProvider :auto-init="false">
          <ForwardModal v-model:show="show" @vue:mounted="injectMock" @forward="(c: UiConversation) => log('forward', c.name)" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          转发消息
        </button>
        <UIKitProvider :auto-init="false">
          <ForwardModal v-model:show="show" @vue:mounted="injectMock" @forward="(c: UiConversation) => log('forward', c.name)" />
        </UIKitProvider>
        <div style="margin-top: 12px; font-size: var(--uikit-font-size-12); color: #6b7280;">
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
