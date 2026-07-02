<script setup lang="ts">
import { ref } from 'vue'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import ContactNoticeList from './contact-notice-list.vue'
import type { UiContactInvite } from '../../sdk/types'

const baseInvites: UiContactInvite[] = [
  { userId: 'u_alice', nickname: 'Alice', reason: 'Hi, I am Alice', status: 'pending', timestamp: Date.now() - 3600_000 },
  { userId: 'u_bob', nickname: 'Bob', status: 'pending', timestamp: Date.now() - 7200_000 },
  { userId: 'u_carol', nickname: 'Carol', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol', reason: '我们是同事', status: 'pending', timestamp: Date.now() - 86400_000 },
]

const acceptedInvites: UiContactInvite[] = [
  { userId: 'u_david', nickname: 'David', reason: 'Hello', status: 'accepted', timestamp: Date.now() - 172800_000 },
]

const declinedInvites: UiContactInvite[] = [
  { userId: 'u_eve', nickname: 'Eve', reason: 'Sorry', status: 'declined', timestamp: Date.now() - 259200_000 },
]

const emptyInvites = ref<UiContactInvite[]>([])
const dynamicInvites = ref<UiContactInvite[]>([...baseInvites])

function onAccept(userId: string) {
  console.log('[contact-notice-list] accept:', userId)
  dynamicInvites.value = dynamicInvites.value.map(i =>
    i.userId === userId ? { ...i, status: 'accepted' as const } : i,
  )
}

function onDecline(userId: string) {
  console.log('[contact-notice-list] decline:', userId)
  dynamicInvites.value = dynamicInvites.value.map(i =>
    i.userId === userId ? { ...i, status: 'declined' as const } : i,
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

    <Variant title="With Avatar">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactNoticeList :invites="baseInvites" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Mixed Status">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactNoticeList :invites="[...baseInvites, ...acceptedInvites, ...declinedInvites]" />
        </UIKitProvider>
      </div>
      <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
        已接受 / 已拒绝 的条目会显示状态标签并禁用操作按钮。
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
      <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
        点击接受 / 拒绝会更新列表状态。
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
