<script setup lang="ts">
import { ref } from 'vue'

const logs = ref<string[]>([])

function log(event: string, key?: string) {
  logs.value.unshift(`${event}${key ? `: ${key}` : ''}`)
}

const actions = [
  { key: 'message', label: '发消息', icon: 'chat/bubble_fill', type: 'primary' },
  { key: 'share', label: '分享', icon: 'actions/plus' },
  { key: 'quit', label: '退群', icon: 'actions/xmark_thick', type: 'danger' },
]

const infoRows = [
  { key: 'members', label: '成员数', value: '128' },
  { key: 'owner', label: '群主', value: '张三' },
  { key: 'intro', label: '群简介', value: '前端技术交流群，欢迎加入' },
]
</script>

<template>
  <div
    style="
      width: 360px;
      margin: 0 auto;
    "
  >
    <em-group-card
      group-id="group_002"
      name="产品需求评审群"
      :actions="actions"
      :info-rows="infoRows"
      @action-click="(key: string) => log('action-click', key)"
    />
    <div style="margin-top: 12px; font-size: 12px; color: #6b7280;">
      事件：
      <ul style="margin: 4px 0; padding-left: 16px;">
        <li v-for="(logItem, i) in logs.slice(0, 5)" :key="i">
          {{ logItem }}
        </li>
      </ul>
    </div>
  </div>
</template>
