<script setup lang="ts">
import { ref } from 'vue'

const logs = ref<string[]>([])

function log(event: string, key?: string) {
  logs.value.unshift(`${event}${key ? `: ${key}` : ''}`)
}

const actions = [
  { key: 'message', label: '发消息', icon: 'chat/bubble_fill', type: 'primary' },
  { key: 'call', label: '语音通话', icon: 'audio-video/phone_pick' },
  { key: 'block', label: '拉黑', icon: 'actions/xmark_thick', type: 'danger' },
]

const infoRows = [
  { key: 'sign', label: '个性签名', value: '你好，我是前端工程师' },
  { key: 'phone', label: '手机号', value: '138****8888', clickable: true },
  { key: 'mail', label: '邮箱', value: 'user@example.com' },
]
</script>

<template>
  <div
    style="
      width: 360px;
      margin: 0 auto;
    "
  >
    <em-user-card
      user-id="user_005"
      name="钱七"
      :actions="actions"
      :info-rows="infoRows"
      @action-click="(key: string) => log('action-click', key)"
      @info-click="(key: string) => log('info-click', key)"
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
