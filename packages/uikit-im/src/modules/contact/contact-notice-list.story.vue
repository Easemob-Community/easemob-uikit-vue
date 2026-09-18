<script setup lang="ts">
import { ref } from 'vue'
import type { UiContactInvite } from '@easemob/uikit-core'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import ContactNoticeList from './contact-notice-list.vue'

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

/** 我发出的申请被对方拒绝（outgoing declined）：粉色失望头像 + 「拒绝了你的好友申请」 */
const declinedByPeerInvites: UiContactInvite[] = [
  { id: 'u_frank', type: 'contact', userId: 'u_frank', nickname: 'Frank', status: 'declined', outgoing: true, timestamp: Date.now() - 3600_000 },
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
          <ContactNoticeList :invites="[...baseInvites, ...groupInvites, ...acceptedInvites, ...declinedInvites, ...declinedByPeerInvites]" />
        </UIKitProvider>
      </div>
      <div style="margin-top: 8px; font-size: var(--uikit-font-size-11); color: #6b7280;">
        已接受 / 已拒绝 的条目展示右侧状态标签；对方拒绝我的申请（outgoing）展示粉色失望头像与「拒绝了你的好友申请」，无操作按钮。
      </div>
    </Variant>

    <Variant title="Declined By Peer">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactNoticeList :invites="declinedByPeerInvites" />
        </UIKitProvider>
      </div>
      <div style="margin-top: 8px; font-size: var(--uikit-font-size-11); color: #6b7280;">
        我发出的好友申请被对方拒绝（Figma「新-Demo」2772:28346）：粉色失望图标头像 + 固定文案，无操作区。
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
      <div style="margin-top: 8px; font-size: var(--uikit-font-size-11); color: #6b7280;">
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
