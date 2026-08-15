<script setup lang="ts">
import { ref } from 'vue'
import EditingBar from './editing-bar.vue'

const logs = ref<string[]>([])

const baseMessage = {
  id: 'msg_1',
  from: '张三',
  type: 'text',
  body: { type: 'txt', content: '这是一条正在编辑的消息' },
} as any

function log(event: string) {
  logs.value.unshift(event)
}
</script>

<template>
  <Story title="Modules/EditingBar">
    <Variant title="默认（文本消息）">
      <div style="padding: 24px; max-width: 480px;">
        <EditingBar :message="baseMessage" @close="log('close')" />
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="padding: 24px; max-width: 480px;">
        <EditingBar :message="baseMessage" @close="log('close')" />
      </div>
      <div style="padding: 0 24px; font-size: var(--uikit-font-size-12); color: #6b7280;">
        事件：
        <ul style="margin: 4px 0; padding-left: 16px;">
          <li v-for="(logItem, i) in logs.slice(0, 5)" :key="i">
            {{ logItem }}
          </li>
        </ul>
      </div>
    </Variant>
  </Story>
</template>
