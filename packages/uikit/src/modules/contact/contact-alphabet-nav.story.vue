<script setup lang="ts">
import { ref } from 'vue'
import type { ContactGroupItem } from './types'
import ContactAlphabetNav from './contact-alphabet-nav.vue'

const logs = ref<string[]>([])

const groups: ContactGroupItem[] = [
  { key: '#', title: '#', items: [] },
  { key: 'A', title: 'A', items: [] },
  { key: 'B', title: 'B', items: [] },
  { key: 'C', title: 'C', items: [] },
  { key: 'E', title: 'E', items: [] },
  { key: 'L', title: 'L', items: [] },
  { key: 'Z', title: 'Z', items: [] },
]

const activeKey = ref('B')

function onJump(key: string) {
  activeKey.value = key
  logs.value.unshift(`jump: ${key}`)
}
</script>

<template>
  <Story title="Modules/ContactAlphabetNav">
    <Variant title="默认（groups 驱动，空字母置灰）">
      <div style="padding: 24px; max-width: 200px;">
        <ContactAlphabetNav :groups="groups" :active-key="activeKey" @jump="onJump" />
      </div>
    </Variant>

    <Variant title="keys 模式 + 不置灰">
      <div style="padding: 24px; max-width: 200px;">
        <ContactAlphabetNav :keys="['A', 'B', 'C', 'Z']" :active-key="activeKey" :dim-empty="false" @jump="onJump" />
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="padding: 24px; max-width: 200px;">
        <ContactAlphabetNav :groups="groups" :active-key="activeKey" @jump="onJump" />
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
