<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit-im'
import type { UIKitDataSource } from '@easemob/uikit-im'

const mockDataSource: UIKitDataSource = {
  subscribePresence: async () => {
    // 文档站未连接 SDK，用空实现避免报错
  },
  fetchPresence: async (userIds: string[]) => {
    return userIds.map(userId => ({
      userId,
      status: 'online' as const,
      ext: '',
      lastTime: Date.now(),
    }))
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
        flex-direction: column;
        gap: 8px;
        align-items: center;
      "
    >
      <em-presence-avatar
        user-id="u_alice"
        name="Me"
        :size="48"
        editable
      />
      <div style="font-size: 12px; color: #6b7280;">
        点击头像右下角指示器可在头像下方打开在线状态选择 popup。
      </div>
    </div>
  </EmUIKitProvider>
</template>
