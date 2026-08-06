<script setup lang="ts">
import { ref } from 'vue'
import type { MessageActionItem } from '../types'
import MessageActionMenu from './message-action-menu.vue'

const logs = ref<string[]>([])

const actions: MessageActionItem[] = [
  { type: 'quote', label: '引用', icon: 'arrows/arrow_turn_left' },
  { type: 'copy', label: '复制', icon: 'files-media/doc_on_doc' },
  { type: 'edit', label: '编辑', icon: 'chat/modifyMsg' },
  { type: 'forward', label: '转发', icon: 'chat/3lines_n_arrow' },
  { type: 'multiSelect', label: '多选', icon: 'actions/items_check' },
  { type: 'recall', label: '撤回', icon: 'arrows/arrow_Uturn_anti_clockwise' },
  { type: 'delete', label: '删除', icon: 'actions/trash', danger: true },
  { type: 'translate', label: '翻译', icon: 'misc/hanzinalpha_in_rect', disabled: true, disabledTip: '暂不支持' },
]

function onSelect(action: MessageActionItem) {
  logs.value.unshift(`${action.type}: ${action.label}`)
}
</script>

<template>
  <Story title="Modules/MessageActionMenu">
    <Variant title="完整操作菜单">
      <div style="padding: 24px;">
        <MessageActionMenu :actions="actions" @select="onSelect" />
      </div>
    </Variant>

    <Variant title="精简菜单（危险操作 + 禁用项）">
      <div style="padding: 24px;">
        <MessageActionMenu
          :actions="[
            { type: 'copy', label: '复制' },
            { type: 'recall', label: '撤回' },
            { type: 'delete', label: '删除', icon: 'actions/trash', danger: true },
            { type: 'edit', label: '编辑', disabled: true },
          ]"
          @select="onSelect"
        />
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="padding: 24px;">
        <MessageActionMenu :actions="actions" @select="onSelect" />
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
