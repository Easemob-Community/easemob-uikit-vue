<script setup lang="ts">
import { ref } from 'vue'

const logs = ref<string[]>([])

function log(event: string, key?: string) {
  logs.value.unshift(`${event}${key ? `: ${key}` : ''}`)
}
</script>

<template>
  <div
    style="
      width: 360px;
      margin: 0 auto;
    "
  >
    <em-group-card
      group-id="group_003"
      name="自定义名称插槽"
      @action-click="(key: string) => log('action-click', key)"
    >
      <template #name>
        <span style="color: var(--uikit-primary-color);">⭐ 置顶群</span>
      </template>
      <div style="padding: 8px 0; font-size: 13px; color: var(--uikit-text-secondary);">
        默认插槽自定义内容
      </div>
    </em-group-card>
  </div>
</template>
