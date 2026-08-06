<script setup lang="ts">
import { ref } from 'vue'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import ContactNoticeList from './contact-notice-list.vue'
import type { UiContactInvite } from '../../sdk/types'

const baseInvites: UiContactInvite[] = [
  { id: 'u_alice', type: 'contact', userId: 'u_alice', nickname: 'Alice', reason: 'Hi, I am Alice', status: 'pending', timestamp: Date.now() - 3600_000 },
  { id: 'u_bob', type: 'contact', userId: 'u_bob', nickname: 'Bob', status: 'pending', timestamp: Date.now() - 7200_000 },
  { id: 'u_carol', type: 'contact', userId: 'u_carol', nickname: 'Carol', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol', reason: '我们是同事', status: 'pending', timestamp: Date.now() - 86400_000 },
]

const groupInvites: UiContactInvite[] = [
  { id: 'g_team', type: 'group', groupId: 'g_team', groupName: '产品设计组', inviterId: 'u_alice', inviterName: 'Alice', reason: '加入我们一起讨论', status: 'pending', timestamp: Date.now() - 1800_000 },
  { id: 'g_happy', type: 'group', groupId: 'g_happy', groupName: '快乐水群', inviterId: 'u_bob', status: 'pending', timestamp: Date.now() - 5400_000 },
]

const acceptedInvites: UiContactInvite[] = [
  { id: 'u_david', type: 'contact', userId: 'u_david', nickname: 'David', reason: 'Hello', status: 'accepted', timestamp: Date.now() - 172800_000 },
  { id: 'g_old', type: 'group', groupId: 'g_old', groupName: '老群', inviterId: 'u_eve', status: 'accepted', timestamp: Date.now() - 604800_000 },
]

const declinedInvites: UiContactInvite[] = [
  { id: 'u_eve', type: 'contact', userId: 'u_eve', nickname: 'Eve', reason: 'Sorry', status: 'declined', timestamp: Date.now() - 259200_000 },
]

const emptyInvites = ref<UiContactInvite[]>([])
const dynamicInvites = ref<UiContactInvite[]>([...baseInvites, ...groupInvites])

function onAccept(invite: UiContactInvite) {
  console.log('[contact-notice-list] accept:', invite)
  dynamicInvites.value = dynamicInvites.value.map(i =>
    i.id === invite.id ? { ...i, status: 'accepted' as const } : i,
  )
}

function onDecline(invite: UiContactInvite) {
  console.log('[contact-notice-list] decline:', invite)
  dynamicInvites.value = dynamicInvites.value.map(i =>
    i.id === invite.id ? { ...i, status: 'declined' as const } : i,
  )
}
</script>

<template>
  <Story title="Modules/ContactNoticeList">
    <Variant title="Default">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactNoticeList :invites="baseInvites" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Group Invites">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactNoticeList :invites="groupInvites" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Mixed Status">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactNoticeList :invites="[...baseInvites, ...groupInvites, ...acceptedInvites, ...declinedInvites]" />
        </UIKitProvider>
      </div>
      <div style="margin-top: 8px; font-size: var(--uikit-font-size-12); color: #6b7280;">
        已接受 / 已拒绝 的条目会显示状态标签并禁用操作按钮；已加入的群组 / 已成好友的待处理邀请会按「已接受」展示。
      </div>
    </Variant>

    <Variant title="Interactive">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactNoticeList
            :invites="dynamicInvites"
            @accept="onAccept"
            @decline="onDecline"
          />
        </UIKitProvider>
      </div>
      <div style="margin-top: 8px; font-size: var(--uikit-font-size-12); color: #6b7280;">
        点击接受 / 拒绝会更新列表状态，同时支持好友申请与群邀请。
      </div>
    </Variant>

    <Variant title="Empty">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactNoticeList :invites="emptyInvites" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Loading">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactNoticeList :invites="emptyInvites" loading />
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>
