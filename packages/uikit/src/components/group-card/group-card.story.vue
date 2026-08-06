<script setup lang="ts">
import { ref } from 'vue'
import GroupCard from './group-card.vue'
import type { GroupCardAction, GroupCardInfoRow } from './group-card.vue'

const logs = ref<string[]>([])

function log(event: string, key?: string) {
  logs.value.unshift(`${event}${key ? `: ${key}` : ''}`)
}

const actions: GroupCardAction[] = [
  { key: 'message', label: '发消息', icon: 'chat/bubble_fill', type: 'primary' },
  { key: 'share', label: '分享', icon: 'actions/plus' },
  { key: 'quit', label: '退群', icon: 'actions/xmark_thick', type: 'danger' },
]

const infoRows: GroupCardInfoRow[] = [
  { key: 'members', label: '成员数', value: '128' },
  { key: 'owner', label: '群主', value: '张三' },
  { key: 'intro', label: '群简介', value: '前端技术交流群，欢迎加入' },
]
</script>

<template>
  <Story title="Components/GroupCard">
    <Variant title="基础信息">
      <div style="width: 360px;">
        <GroupCard
          group-id="group_001"
          name="前端技术交流群"
          avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=group"
          @action-click="(key: string) => log('action-click', key)"
        />
      </div>
    </Variant>

    <Variant title="操作按钮与信息行">
      <div style="width: 360px;">
        <GroupCard
          group-id="group_002"
          name="产品需求评审群"
          :actions="actions"
          :info-rows="infoRows"
          @action-click="(key: string) => log('action-click', key)"
        />
      </div>
    </Variant>

    <Variant title="自定义插槽">
      <div style="width: 360px;">
        <GroupCard
          group-id="group_003"
          name="自定义名称插槽"
          @action-click="(key: string) => log('action-click', key)"
        >
          <template #name>
            <span style="color: var(--uikit-primary-color);">⭐ 置顶群</span>
          </template>
          <div style="padding: 8px 0; font-size: var(--uikit-font-size-13); color: var(--uikit-text-secondary);">
            默认插槽自定义内容
          </div>
        </GroupCard>
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="width: 360px;">
        <GroupCard
          group-id="group_004"
          name="测试事件群"
          :actions="actions"
          @action-click="(key: string) => log('action-click', key)"
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
