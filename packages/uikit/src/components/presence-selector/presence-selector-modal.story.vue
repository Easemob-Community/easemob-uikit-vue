<script setup lang="ts">
import { ref } from 'vue'
import PresenceSelectorModal from './presence-selector-modal.vue'

const show = ref(false)
const logs = ref<string[]>([])

function onOpen() {
  show.value = true
  logs.value.unshift('open')
}

function onClose() {
  logs.value.unshift('close')
}
</script>

<template>
  <Story title="Components/PresenceSelectorModal">
    <Variant title="Default">
      <button
        style="padding: 8px 16px; border: none; border-radius: 8px; background: #3b82f6; color: #fff; cursor: pointer;"
        @click="onOpen"
      >
        打开在线状态选择器
      </button>
      <PresenceSelectorModal v-model:show="show" @close="onClose" />
      <div style="margin-top: 12px; font-size: 12px; color: #6b7280;">
        事件:
        <ul style="margin: 4px 0; padding-left: 16px;">
          <li v-for="(log, i) in logs.slice(0, 5)" :key="i">{{ log }}</li>
        </ul>
      </div>
      <div style="margin-top: 8px; font-size: 12px; color: #ef4444;">
        注：该组件内部会调用 SDK 的 publishPresence，Storybook 未连接 SDK，点击状态项会触发失败提示。
      </div>
    </Variant>
  </Story>
</template>
