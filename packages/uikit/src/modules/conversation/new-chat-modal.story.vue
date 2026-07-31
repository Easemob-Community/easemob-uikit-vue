<script setup lang="ts">
import { ref } from 'vue'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import type { UiContact } from '../../sdk/types'
import { useContactStore } from '../../store/contact'
import NewChatModal from './new-chat-modal.vue'

const show = ref(false)
const logs = ref<string[]>([])

const contacts: UiContact[] = [
  { userId: 'u_alice', name: 'Alice', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', remark: '产品经理' },
  { userId: 'u_bob', name: 'Bob', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
  { userId: 'u_carol', name: 'Carol', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol' },
  { userId: 'u_david', name: 'David', remark: '后端工程师' },
]

function injectMock() {
  useContactStore().setContactList(contacts)
}

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}
</script>

<template>
  <Story title="Modules/NewChatModal">
    <Variant title="默认（含联系人列表）">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          发起新聊天
        </button>
        <UIKitProvider :auto-init="false">
          <NewChatModal v-model:show="show" @vue:mounted="injectMock" @created="(id: string) => log('created', id)" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          发起新聊天
        </button>
        <UIKitProvider :auto-init="false">
          <NewChatModal v-model:show="show" @vue:mounted="injectMock" @created="(id: string) => log('created', id)" />
        </UIKitProvider>
        <div style="margin-top: 12px; font-size: 12px; color: #6b7280;">
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
