<script setup lang="ts">
import { ref } from 'vue'
import PresenceSelector from './presence-selector.vue'
import type { PresenceSelectorValue } from './presence-selector.vue'

const current = ref('')
const logs = ref<string[]>([])

function onSelect(status: PresenceSelectorValue, ext: string) {
  current.value = ext
  logs.value.unshift(`select: ${status} / ${ext}`)
}

function onCancel() {
  logs.value.unshift('cancel')
}
</script>

<template>
  <Story title="Components/PresenceSelector">
    <Variant title="Default">
      <PresenceSelector @select="onSelect" @cancel="onCancel" />
      <div style="margin-top: 12px; font-size: var(--uikit-font-size-12); color: #6b7280;">
        当前状态: {{ current || '(空/在线)' }}
      </div>
    </Variant>

    <Variant title="With Initial Custom Status">
      <PresenceSelector value="开会中" @select="onSelect" @cancel="onCancel" />
    </Variant>

    <Variant title="Hide Custom">
      <PresenceSelector :show-custom="false" @select="onSelect" @cancel="onCancel" />
    </Variant>

    <Variant title="Events Log">
      <PresenceSelector @select="onSelect" @cancel="onCancel" />
      <div style="margin-top: 12px; font-size: var(--uikit-font-size-12); color: #6b7280;">
        <div>当前状态: {{ current || '(空/在线)' }}</div>
        <div style="margin-top: 4px;">
          事件:
          <ul style="margin: 4px 0; padding-left: 16px;">
            <li v-for="(log, i) in logs.slice(0, 5)" :key="i">{{ log }}</li>
          </ul>
        </div>
      </div>
    </Variant>
  </Story>
</template>
