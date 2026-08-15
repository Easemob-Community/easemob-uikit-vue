<script setup lang="ts">
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import PresenceAvatar from './presence-avatar.vue'

const mockDataSource = {
  subscribePresence: async () => {
    // Storybook 未连接 SDK，用空实现避免报错
  },
  fetchPresence: async (userIds: string[]) => {
    return userIds.map((userId) => {
      const map: Record<string, { status: 'online' | 'away' | 'busy' | 'offline', ext: string }> = {
        u_alice: { status: 'online', ext: '' },
        u_bob: { status: 'busy', ext: 'busy' },
        u_carol: { status: 'away', ext: 'away' },
        u_david: { status: 'offline', ext: '' },
      }
      const item = map[userId] || { status: 'offline', ext: '' }
      return {
        userId,
        status: item.status,
        ext: item.ext,
        lastTime: Date.now(),
      }
    })
  },
}
</script>

<template>
  <Story title="Components/PresenceAvatar">
    <Variant title="Default">
      <UIKitProvider :auto-init="false" :enable-presence="true" :data-source="mockDataSource">
        <div class="u-flex u-gap-4 u-items-center">
          <PresenceAvatar user-id="u_alice" name="Alice" :size="40" />
          <PresenceAvatar user-id="u_bob" name="Bob" :size="40" />
          <PresenceAvatar user-id="u_carol" name="Carol" :size="40" />
          <PresenceAvatar user-id="u_david" name="David" :size="40" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Editable (Current User)">
      <UIKitProvider :auto-init="false" :enable-presence="true" :data-source="mockDataSource">
        <PresenceAvatar
          user-id="u_alice"
          name="Me"
          :size="48"
          editable
        />
        <div style="margin-top: 8px; font-size: var(--uikit-font-size-12); color: #6b7280;">
          点击头像右下角指示器可在头像下方打开在线状态选择 popup。
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Provider Presence Disabled">
      <UIKitProvider :auto-init="false" :enable-presence="false" :data-source="mockDataSource">
        <PresenceAvatar user-id="u_alice" name="Alice" :size="40" />
        <div style="margin-top: 8px; font-size: var(--uikit-font-size-12); color: #6b7280;">
          Provider enablePresence=false 时，不展示在线状态点，也不发起订阅。
        </div>
      </UIKitProvider>
    </Variant>
  </Story>
</template>
