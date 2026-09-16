<script setup lang="ts">
import { ref } from 'vue'
import type { ContactNavEntry } from './types'
import ContactNav from './contact-nav.vue'

const logs = ref<string[]>([])

const entries: ContactNavEntry[] = [
  { key: 'contact', label: '联系人', count: 332 },
  { key: 'group', label: '群组', count: 32 },
  { key: 'notice', label: '新的朋友', hot: true, count: 12 },
  { key: 'blocklist', label: '黑名单', count: 2 },
]

function onEntryClick(key: string) {
  logs.value.unshift(`entry-click: ${key}`)
}
</script>

<template>
  <Story title="Modules/ContactNav">
    <Variant title="默认（计数内联 + hot 红点）">
      <div style="padding: 24px; max-width: 360px;">
        <ContactNav :entries="entries" @entry-click="onEntryClick" />
      </div>
    </Variant>

    <Variant title="无计数入口">
      <div style="padding: 24px; max-width: 360px;">
        <ContactNav
          :entries="[
            { key: 'contact', label: '联系人' },
            { key: 'group', label: '群组' },
          ]"
          @entry-click="onEntryClick"
        />
      </div>
    </Variant>

    <Variant title="带图标入口">
      <div style="padding: 24px; max-width: 360px;">
        <ContactNav
          :entries="[
            { key: 'contact', label: '联系人', icon: 'person/single', count: 332 },
            { key: 'group', label: '群组', icon: 'person/double', count: 32 },
            { key: 'notice', label: '新的朋友', icon: 'person/plus', hot: true, count: 12 },
          ]"
          @entry-click="onEntryClick"
        />
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="padding: 24px; max-width: 360px;">
        <ContactNav :entries="entries" @entry-click="onEntryClick" />
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
