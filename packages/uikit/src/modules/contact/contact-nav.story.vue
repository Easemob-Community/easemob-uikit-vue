<script setup lang="ts">
import { ref } from 'vue'
import type { ContactNavEntry } from './types'
import ContactNav from './contact-nav.vue'

const logs = ref<string[]>([])

const entries: ContactNavEntry[] = [
  { key: 'new-friends', label: '新的朋友', icon: 'people/person_add' },
  { key: 'group-chat', label: '群聊', icon: 'people/person_double_fill' },
  { key: 'tags', label: '标签', count: 3 },
  { key: 'official', label: '公众号', icon: 'misc/bell', hot: true, count: 1 },
]

function onEntryClick(key: string) {
  logs.value.unshift(`entry-click: ${key}`)
}
</script>

<template>
  <Story title="Modules/ContactNav">
    <Variant title="默认（图标 + 计数徽标）">
      <div style="padding: 24px; max-width: 320px;">
        <ContactNav :entries="entries" @entry-click="onEntryClick" />
      </div>
    </Variant>

    <Variant title="无计数入口">
      <div style="padding: 24px; max-width: 320px;">
        <ContactNav
          :entries="[
            { key: 'new-friends', label: '新的朋友', icon: 'people/person_add' },
            { key: 'group-chat', label: '群聊', icon: 'people/person_double_fill' },
          ]"
          @entry-click="onEntryClick"
        />
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="padding: 24px; max-width: 320px;">
        <ContactNav :entries="entries" @entry-click="onEntryClick" />
      </div>
      <div style="padding: 0 24px; font-size: 12px; color: #6b7280;">
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
