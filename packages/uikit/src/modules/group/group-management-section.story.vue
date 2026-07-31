<script setup lang="ts">
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import { useGroupStore } from '../../store/group'
import GroupManagementSection from './group-management-section.vue'

const logs: string[] = []

function injectOwnerGroup() {
  useGroupStore().setGroupList([
    {
      groupId: 'g_design',
      groupName: '设计评审群',
      role: 'owner',
      memberCount: 24,
    },
  ])
}

function injectMemberGroup() {
  useGroupStore().setGroupList([
    {
      groupId: 'g_design',
      groupName: '设计评审群',
      role: 'member',
      memberCount: 24,
    },
  ])
}

function onGroupOperation(payload: { type: string, groupId: string }) {
  logs.unshift(`${payload.type} (${payload.groupId})`)
}
</script>

<template>
  <Story title="Modules/GroupManagementSection">
    <Variant title="群主视角（默认入口）">
      <UIKitProvider :auto-init="false">
        <div style="max-width: 420px; margin: 0 auto;">
          <GroupManagementSection
            group-id="g_design"
            @vue:mounted="injectOwnerGroup"
            @group-operation="onGroupOperation"
          />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="全部入口（白名单 + 入群申请）">
      <UIKitProvider :auto-init="false">
        <div style="max-width: 420px; margin: 0 auto;">
          <GroupManagementSection
            group-id="g_design"
            :show-allowlist="true"
            :show-join-requests="true"
            @vue:mounted="injectOwnerGroup"
            @group-operation="onGroupOperation"
          />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="成员视角（仅共享文件）">
      <UIKitProvider :auto-init="false">
        <div style="max-width: 420px; margin: 0 auto;">
          <GroupManagementSection
            group-id="g_design"
            @vue:mounted="injectMemberGroup"
            @group-operation="onGroupOperation"
          />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Modal 展示方式">
      <UIKitProvider :auto-init="false">
        <div style="max-width: 420px; margin: 0 auto;">
          <GroupManagementSection
            group-id="g_design"
            display-mode="modal"
            @vue:mounted="injectOwnerGroup"
            @group-operation="onGroupOperation"
          />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="事件日志">
      <UIKitProvider :auto-init="false">
        <div style="max-width: 420px; margin: 0 auto;">
          <GroupManagementSection
            group-id="g_design"
            @vue:mounted="injectOwnerGroup"
            @group-operation="onGroupOperation"
          />
        </div>
      </UIKitProvider>
      <div style="max-width: 420px; margin: 12px auto 0; font-size: 12px; color: #6b7280;">
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
