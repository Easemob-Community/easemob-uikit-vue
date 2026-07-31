<script setup lang="ts">
import { ref } from 'vue'
import VoicePanel from './voice-panel.vue'

const active = ref(false)
const logs = ref<string[]>([])

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}
</script>

<template>
  <Story title="Modules/VoicePanel">
    <Variant title="收起状态（active = false）">
      <div style="padding: 24px; max-width: 420px;">
        <VoicePanel
          :active="false"
          @update:active="(v: boolean) => log('update:active', String(v))"
          @start="log('start')"
          @end="(d: number) => log('end', `${d}s`)"
          @cancel="log('cancel')"
        />
      </div>
    </Variant>

    <Variant title="展开状态（active = true）">
      <div style="padding: 24px; max-width: 420px;">
        <VoicePanel
          :active="true"
          @update:active="(v: boolean) => log('update:active', String(v))"
          @start="log('start')"
          @end="(d: number) => log('end', `${d}s`)"
          @cancel="log('cancel')"
        />
      </div>
    </Variant>

    <Variant title="可切换（点击语音按钮）">
      <div style="padding: 24px; max-width: 420px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer; margin-bottom: 12px;"
          @click="active = !active"
        >
          {{ active ? '收起语音面板' : '展开语音面板' }}
        </button>
        <VoicePanel
          v-model:active="active"
          @start="log('start')"
          @end="(d: number) => log('end', `${d}s`)"
          @cancel="log('cancel')"
        />
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="padding: 24px; max-width: 420px;">
        <VoicePanel
          v-model:active="active"
          @start="log('start')"
          @end="(d: number) => log('end', `${d}s`)"
          @cancel="log('cancel')"
        />
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
