<script setup lang="ts">
import { ref } from 'vue'
import type { UiGroup } from '@easemob/uikit-core'
import GroupItemDefault from './group-item-default.vue'

const logs = ref<string[]>([])

const group: UiGroup = {
  groupId: 'g_design',
  groupName: '设计评审群',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Design',
  memberCount: 24,
}

const groupNoAvatar: UiGroup = {
  groupId: 'g_qa',
  groupName: 'QA 测试组',
  memberCount: 8,
}

function log(event: string) {
  logs.value.unshift(event)
}
</script>

<template>
  <Story title="Modules/GroupItemDefault">
    <Variant title="默认">
      <div style="max-width: 360px; padding: 16px;">
        <GroupItemDefault :group="group" @click="log('click')" />
      </div>
    </Variant>

    <Variant title="选中 / 激活态">
      <div style="max-width: 360px; padding: 16px; display: flex; flex-direction: column; gap: 8px;">
        <GroupItemDefault :group="group" active @click="log('click')" />
        <GroupItemDefault :group="group" selected show-checkbox @click="log('click')" />
      </div>
    </Variant>

    <Variant title="禁用 / 无头像 / 隐藏成员数">
      <div style="max-width: 360px; padding: 16px; display: flex; flex-direction: column; gap: 8px;">
        <GroupItemDefault :group="group" disabled @click="log('click')" />
        <GroupItemDefault :group="groupNoAvatar" @click="log('click')" />
        <GroupItemDefault :group="group" :show-member-count="false" @click="log('click')" />
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="max-width: 360px; padding: 16px;">
        <GroupItemDefault :group="group" @click="log('click')" />
      </div>
      <div style="padding: 0 16px; font-size: var(--uikit-font-size-12); color: #6b7280;">
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
