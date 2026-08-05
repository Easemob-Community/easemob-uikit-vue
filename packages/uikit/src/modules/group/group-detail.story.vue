<script setup lang="ts">
import { ref } from 'vue'
import { GROUP_MEMBER_ROLE } from '../../constants'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import type { UiGroup } from '../../sdk/types'
import { useGroupStore } from '../../store/group'
import GroupDetail from './group-detail.vue'

const logs = ref<string[]>([])

const ownerGroup: UiGroup = {
  groupId: 'g_design',
  groupName: '设计评审群',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Design',
  description: '每周设计评审与走查',
  memberCount: 24,
  role: GROUP_MEMBER_ROLE.OWNER,
}

const memberGroup: UiGroup = {
  ...ownerGroup,
  role: GROUP_MEMBER_ROLE.MEMBER,
}

function injectOwnerGroup() {
  useGroupStore().setGroupList([ownerGroup])
}

function injectMemberGroup() {
  useGroupStore().setGroupList([memberGroup])
}

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}
</script>

<template>
  <Story title="Modules/GroupDetail">
    <Variant title="默认（无缓存数据）">
      <UIKitProvider :auto-init="false">
        <div style="height: 520px; overflow: hidden;">
          <GroupDetail group-id="g_unknown" @send-message="(id: string) => log('send-message', id)" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="已注入群数据（普通成员）">
      <UIKitProvider :auto-init="false">
        <div style="height: 520px; overflow: hidden;">
          <GroupDetail
            group-id="g_design"
            @vue:mounted="injectMemberGroup"
            @send-message="(id: string) => log('send-message', id)"
          />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="群主视角（可编辑群名）">
      <UIKitProvider :auto-init="false">
        <div style="height: 520px; overflow: hidden;">
          <GroupDetail
            group-id="g_design"
            @vue:mounted="injectOwnerGroup"
            @send-message="(id: string) => log('send-message', id)"
          />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="事件日志">
      <UIKitProvider :auto-init="false">
        <div style="height: 520px; overflow: hidden;">
          <GroupDetail
            group-id="g_design"
            @vue:mounted="injectOwnerGroup"
            @send-message="(id: string) => log('send-message', id)"
          />
        </div>
      </UIKitProvider>
      <div style="margin-top: 12px; font-size: 12px; color: #6b7280;">
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
