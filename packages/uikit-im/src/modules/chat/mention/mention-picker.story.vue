<script setup lang="ts">
import { ref } from 'vue'
import type { MentionContact } from '../types'
import MentionPicker from './mention-picker.vue'

const show = ref(false)
const showWithKeyword = ref(false)
const showCustom = ref(false)
const anchorRef = ref<HTMLElement>()
const anchorKeywordRef = ref<HTMLElement>()
const anchorCustomRef = ref<HTMLElement>()
const logs = ref<string[]>([])

const contacts: MentionContact[] = [
  { userId: 'u_alice', name: 'Alice', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', remark: '产品经理' },
  { userId: 'u_bob', name: 'Bob', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
  { userId: 'u_carol', name: 'Carol', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol' },
  { userId: 'u_david', name: 'David', remark: '后端工程师' },
  { userId: 'u_erica', name: 'Erica', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Erica' },
]

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}
</script>

<template>
  <Story title="Modules/MentionPicker">
    <Variant title="默认（锚定按钮弹出）">
      <div style="padding: 24px; position: relative; height: 480px;">
        <button
          ref="anchorRef"
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = !show"
        >
          @ 提及成员
        </button>
        <MentionPicker
          v-model:show="show"
          :contacts="contacts"
          :anchor="anchorRef"
          @select="(c: MentionContact) => log('select', c.userId)"
        />
      </div>
    </Variant>

    <Variant title="关键词过滤（keyword = ali）">
      <div style="padding: 24px; position: relative; height: 480px;">
        <button
          ref="anchorKeywordRef"
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="showWithKeyword = !showWithKeyword"
        >
          @ ali 过滤
        </button>
        <MentionPicker
          v-model:show="showWithKeyword"
          :contacts="contacts"
          keyword="ali"
          :anchor="anchorKeywordRef"
          @select="(c: MentionContact) => log('select', c.userId)"
        />
      </div>
    </Variant>

    <Variant title="自定义标题（H5 底部弹层显示标题栏）">
      <div style="padding: 24px; position: relative; height: 480px;">
        <button
          ref="anchorCustomRef"
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="showCustom = !showCustom"
        >
          选择通知对象
        </button>
        <MentionPicker
          v-model:show="showCustom"
          :contacts="contacts"
          title="选择通知对象"
          :anchor="anchorCustomRef"
          @select="(c: MentionContact) => log('select', c.userId)"
        />
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="padding: 24px; position: relative; height: 480px;">
        <button
          ref="anchorRef"
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = !show"
        >
          @ 提及成员
        </button>
        <MentionPicker
          v-model:show="show"
          :contacts="contacts"
          :anchor="anchorRef"
          @select="(c: MentionContact) => log('select', c.userId)"
        />
        <div style="margin-top: 12px; font-size: var(--uikit-font-size-12); color: #6b7280;">
          事件：
          <ul style="margin: 4px 0; padding-left: 16px;">
            <li v-for="(logItem, i) in logs.slice(0, 5)" :key="i">
              {{ logItem }}
            </li>
          </ul>
        </div>
      </div>
    </Variant>
  </Story>
</template>
