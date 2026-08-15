<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit-im'

const mockDataSource = {
  subscribePresence: async () => {
    // 文档站未连接 SDK，用空实现避免报错
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
  <EmUIKitProvider
    :auto-init="false"
    :enable-presence="true"
    :data-source="mockDataSource"
  >
    <div
      style="
        display: flex;
        gap: 16px;
        align-items: center;
        justify-content: center;
      "
    >
      <em-presence-avatar user-id="u_alice" name="Alice" :size="40" />
      <em-presence-avatar user-id="u_bob" name="Bob" :size="40" />
      <em-presence-avatar user-id="u_carol" name="Carol" :size="40" />
      <em-presence-avatar user-id="u_david" name="David" :size="40" />
    </div>
  </EmUIKitProvider>
</template>
