<script setup lang="ts">
import { ref } from 'vue'
import { GROUP_MEMBER_ROLE } from '../../constants'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import type { UiGroupMember } from '../../sdk/types'
import { useGroupStore } from '../../store/group'
import { useUserInfoStore } from '../../store/user-info'
import GroupMemberListItem from './group-member-list-item.vue'

const logs = ref<string[]>([])

const groupId = 'g_design'

const members: Record<string, UiGroupMember> = {
  owner: { userId: 'u_owner', nickname: '群主大人', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Owner', role: GROUP_MEMBER_ROLE.OWNER, joinedAt: Date.now() - 86400000 * 30 },
  admin: { userId: 'u_admin', nickname: '管理员小王', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', role: GROUP_MEMBER_ROLE.ADMIN, joinedAt: Date.now() - 86400000 * 20 },
  member: { userId: 'u_alice', nickname: 'Alice', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', role: GROUP_MEMBER_ROLE.MEMBER, joinedAt: Date.now() - 86400000 * 3 },
  muted: { userId: 'u_bob', nickname: 'Bob', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', role: GROUP_MEMBER_ROLE.MEMBER, joinedAt: Date.now() - 86400000 * 1 },
}

const baseActions = {
  showMuteAction: true,
  showBlockAction: true,
  showAdminAction: true,
  showRemoveAction: true,
  showChatAction: true,
  allowChat: 'all',
} as const

function injectMockOwner() {
  useUserInfoStore().setUserInfos([
    { userId: 'u_owner', nickname: '群主大人', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Owner' },
    { userId: 'u_admin', nickname: '管理员小王', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin' },
    { userId: 'u_alice', nickname: 'Alice', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice' },
    { userId: 'u_bob', nickname: 'Bob', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
  ])
  useGroupStore().setGroupList([{ groupId, groupName: '设计评审群', role: GROUP_MEMBER_ROLE.OWNER, memberCount: 24 }])
  useGroupStore().setGroupMuteList(groupId, [members.muted])
}

function injectMockMember() {
  useGroupStore().setGroupList([{ groupId, groupName: '设计评审群', role: GROUP_MEMBER_ROLE.MEMBER, memberCount: 24 }])
}

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}
</script>

<template>
  <Story title="Modules/GroupMemberListItem">
    <Variant title="群主视角（全部操作）">
      <UIKitProvider :auto-init="false">
        <div style="max-width: 420px; padding: 16px;">
          <GroupMemberListItem
            :member="members.member"
            group-id="g_design"
            current-user-id="u_owner"
            current-user-role="owner"
            v-bind="baseActions"
            @vue:mounted="injectMockOwner"
            @click-member="(m: UiGroupMember) => log('click-member', m.userId)"
            @chat-member="(m: UiGroupMember) => log('chat-member', m.userId)"
            @set-admin="(m: UiGroupMember) => log('set-admin', m.userId)"
            @mute-member="(m: UiGroupMember) => log('mute-member', m.userId)"
          />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="群主 / 管理员 / 普通成员行">
      <UIKitProvider :auto-init="false">
        <div style="max-width: 420px; padding: 16px; display: flex; flex-direction: column; gap: 8px;">
          <GroupMemberListItem
            :member="members.owner"
            group-id="g_design"
            current-user-id="u_owner"
            current-user-role="owner"
            v-bind="baseActions"
            @vue:mounted="injectMockOwner"
          />
          <GroupMemberListItem
            :member="members.admin"
            group-id="g_design"
            current-user-id="u_owner"
            current-user-role="owner"
            v-bind="baseActions"
            @vue:mounted="injectMockOwner"
          />
          <GroupMemberListItem
            :member="members.member"
            group-id="g_design"
            current-user-id="u_owner"
            current-user-role="owner"
            v-bind="baseActions"
            @vue:mounted="injectMockOwner"
          />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="已禁言成员">
      <UIKitProvider :auto-init="false">
        <div style="max-width: 420px; padding: 16px;">
          <GroupMemberListItem
            :member="members.muted"
            group-id="g_design"
            current-user-id="u_owner"
            current-user-role="owner"
            v-bind="baseActions"
            @vue:mounted="injectMockOwner"
            @unmute-member="(m: UiGroupMember) => log('unmute-member', m.userId)"
          />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="普通成员视角（无管理操作）">
      <UIKitProvider :auto-init="false">
        <div style="max-width: 420px; padding: 16px;">
          <GroupMemberListItem
            :member="members.member"
            group-id="g_design"
            current-user-id="u_alice"
            current-user-role="member"
            :show-mute-action="false"
            :show-block-action="false"
            :show-admin-action="false"
            :show-remove-action="false"
            :show-chat-action="true"
            allow-chat="all"
            @vue:mounted="injectMockMember"
          />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="事件日志">
      <UIKitProvider :auto-init="false">
        <div style="max-width: 420px; padding: 16px;">
          <GroupMemberListItem
            :member="members.member"
            group-id="g_design"
            current-user-id="u_owner"
            current-user-role="owner"
            v-bind="baseActions"
            @vue:mounted="injectMockOwner"
            @click-member="(m: UiGroupMember) => log('click-member', m.userId)"
            @chat-member="(m: UiGroupMember) => log('chat-member', m.userId)"
            @set-admin="(m: UiGroupMember) => log('set-admin', m.userId)"
            @mute-member="(m: UiGroupMember) => log('mute-member', m.userId)"
          />
        </div>
      </UIKitProvider>
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
