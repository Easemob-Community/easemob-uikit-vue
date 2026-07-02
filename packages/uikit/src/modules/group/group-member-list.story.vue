<script setup lang="ts">
import { ref } from 'vue'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import GroupMemberList from './group-member-list.vue'
import type { UiGroup, UiGroupMember } from '../../sdk/types'

const group: UiGroup = {
  groupId: 'g_demo',
  groupName: 'Demo Group',
  owner: 'u_owner',
  memberCount: 6,
}

const members: UiGroupMember[] = [
  { userId: 'u_owner', nickname: 'Owner', role: 'owner' },
  { userId: 'u_admin', nickname: 'Admin', role: 'admin' },
  { userId: 'u_alice', nickname: 'Alice', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', role: 'member' },
  { userId: 'u_bob', nickname: 'Bob', role: 'member' },
  { userId: 'u_carol', nickname: 'Carol', role: 'member' },
  { userId: 'u_dave', nickname: 'Dave', role: 'member' },
]

const currentUserId = 'u_owner'

const adminMembers: UiGroupMember[] = [
  { userId: 'u_owner', nickname: 'Owner', role: 'owner' },
  { userId: 'u_alice', nickname: 'Alice', role: 'admin' },
  { userId: 'u_bob', nickname: 'Bob', role: 'member' },
]

const manyMembers: UiGroupMember[] = Array.from({ length: 30 }, (_, i) => ({
  userId: `u_${i + 1}`,
  nickname: `Member ${i + 1}`,
  role: 'member',
}))

const logs = ref<string[]>([])

function log(action: string, member: UiGroupMember) {
  logs.value.unshift(`${action}: ${member.nickname || member.userId} (${member.role})`)
  console.log(`[group-member-list] ${action}:`, member)
}

function onChatMember(member: UiGroupMember) {
  log('chat', member)
}

function onRemoveMember(member: UiGroupMember) {
  log('remove', member)
}

function onSetAdmin(member: UiGroupMember) {
  log('set-admin', member)
}

function onRemoveAdmin(member: UiGroupMember) {
  log('remove-admin', member)
}
</script>

<template>
  <Story title="Modules/GroupMemberList">
    <Variant title="Default">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupMemberList
            group-id="g_demo"
            :group="group"
            :members="members"
            :current-user-id="currentUserId"
            :has-more="false"
            @chat-member="onChatMember"
            @remove-member="onRemoveMember"
            @set-admin="onSetAdmin"
            @remove-admin="onRemoveAdmin"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Admin View">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupMemberList
            group-id="g_demo"
            :group="group"
            :members="adminMembers"
            current-user-id="u_admin"
            :has-more="false"
            @chat-member="onChatMember"
            @remove-member="onRemoveMember"
            @set-admin="onSetAdmin"
            @remove-admin="onRemoveAdmin"
          />
        </UIKitProvider>
      </div>
      <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
        当前身份为管理员，仅可对普通成员执行“移除”操作，无法设置/取消管理员。
      </div>
    </Variant>

    <Variant title="Member View">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupMemberList
            group-id="g_demo"
            :group="group"
            :members="members"
            current-user-id="u_alice"
            :has-more="false"
            @chat-member="onChatMember"
            @remove-member="onRemoveMember"
            @set-admin="onSetAdmin"
            @remove-admin="onRemoveAdmin"
          />
        </UIKitProvider>
      </div>
      <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
        当前身份为普通成员，不展示管理操作按钮。
      </div>
    </Variant>

    <Variant title="With HasMore">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupMemberList
            group-id="g_demo"
            :group="group"
            :members="manyMembers"
            :current-user-id="currentUserId"
            :has-more="true"
            @chat-member="onChatMember"
            @remove-member="onRemoveMember"
            @set-admin="onSetAdmin"
            @remove-admin="onRemoveAdmin"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Search">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupMemberList
            group-id="g_demo"
            :group="group"
            :members="members"
            :current-user-id="currentUserId"
            :has-more="false"
            :show-search="false"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Events Log">
      <div style="display: flex; gap: 16px;">
        <div style="height: 600px; width: 320px;">
          <UIKitProvider :auto-init="false">
            <GroupMemberList
              group-id="g_demo"
              :group="group"
              :members="members"
              :current-user-id="currentUserId"
              :has-more="false"
              @chat-member="onChatMember"
              @remove-member="onRemoveMember"
              @set-admin="onSetAdmin"
              @remove-admin="onRemoveAdmin"
            />
          </UIKitProvider>
        </div>
        <div style="height: 600px; width: 240px;">
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Event Logs</div>
          <div
            v-for="(item, index) in logs"
            :key="index"
            style="font-size: 12px; color: #6b7280; padding: 2px 0; border-bottom: 1px solid #f3f4f6;"
          >
            {{ item }}
          </div>
          <div v-if="logs.length === 0" style="font-size: 12px; color: #9ca3af;">点击操作按钮查看事件日志</div>
        </div>
      </div>
    </Variant>
  </Story>
</template>
