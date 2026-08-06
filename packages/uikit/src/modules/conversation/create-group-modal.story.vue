<script setup lang="ts">
import { ref } from 'vue'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import { useContactStore } from '../../store/contact'
import CreateGroupModal from './create-group-modal.vue'

const show = ref(false)
const logs = ref<string[]>([])

function injectMock() {
  useContactStore().setContactList([
    { userId: 'u_alice', name: 'Alice', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice' },
    { userId: 'u_bob', name: 'Bob', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
    { userId: 'u_carol', name: 'Carol', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol' },
    { userId: 'u_david', name: 'David' },
  ])
}

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}
</script>

<template>
  <Story title="Modules/CreateGroupModal">
    <Variant title="默认">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          创建群组
        </button>
        <UIKitProvider :auto-init="false">
          <CreateGroupModal v-model:show="show" @vue:mounted="injectMock" @created="(id: string) => log('created', id)" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="预置配置（群名 + 描述）">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          创建群组（预填）
        </button>
        <UIKitProvider :auto-init="false">
          <CreateGroupModal
            v-model:show="show"
            :config="{ name: '前端交流群', description: '前端技术讨论与分享' }"
            @vue:mounted="injectMock"
            @created="(id: string) => log('created', id)"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          创建群组
        </button>
        <UIKitProvider :auto-init="false">
          <CreateGroupModal v-model:show="show" @vue:mounted="injectMock" @created="(id: string) => log('created', id)" />
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
