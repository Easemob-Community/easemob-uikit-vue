<script setup lang="ts">
import { ref } from 'vue'
import Button from '../button/button.vue'
import PresenceSelectorPopup from './presence-selector-popup.vue'

const anchorRef = ref<HTMLElement>()
const show = ref(false)
const logs = ref<string[]>([])

function onChanged() {
  logs.value.unshift('changed: 状态已更新')
}

function onClose() {
  logs.value.unshift('close')
}
</script>

<template>
  <Story title="Components/PresenceSelectorPopup">
    <Variant title="锚点弹出">
      <div style="padding: 32px;">
        <Button ref="anchorRef" @click="show = !show">
          {{ show ? '收起' : '设置在线状态' }}
        </Button>
        <PresenceSelectorPopup
          v-model:show="show"
          :anchor="anchorRef"
          placement="bottom"
          @close="onClose"
          @changed="onChanged"
        />
      </div>
    </Variant>

    <Variant title="自定义初始状态">
      <div style="padding: 32px;">
        <Button ref="anchorRef" @click="show = !show">
          {{ show ? '收起' : '打开（初始“开会中”）' }}
        </Button>
        <PresenceSelectorPopup
          v-model:show="show"
          :anchor="anchorRef"
          placement="bottom"
          value="开会中"
          @close="onClose"
          @changed="onChanged"
        />
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="padding: 32px;">
        <Button ref="anchorRef" @click="show = !show">
          {{ show ? '收起' : '打开状态选择器' }}
        </Button>
        <PresenceSelectorPopup
          v-model:show="show"
          :anchor="anchorRef"
          placement="bottom"
          @close="onClose"
          @changed="onChanged"
        />
        <div style="margin-top: 12px; font-size: 12px; color: #6b7280;">
          事件：
          <ul style="margin: 4px 0; padding-left: 16px;">
            <li v-for="(log, i) in logs.slice(0, 5)" :key="i">
              {{ log }}
            </li>
          </ul>
        </div>
      </div>
    </Variant>
  </Story>
</template>
