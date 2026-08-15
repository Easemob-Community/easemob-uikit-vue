<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit-im'

const vue = { groupId: 'g_001', groupName: 'Vue 技术交流', owner: 'me', memberCount: 128 }
const react = { groupId: 'g_002', groupName: 'React 开发者', owner: 'me', memberCount: 64 }
const game = { groupId: 'g_003', groupName: '周末桌游局', owner: 'me', memberCount: 12 }
</script>

<template>
  <EmUIKitProvider :auto-init="false">
    <div style="width: 320px; margin: 0 auto;">
      <em-group-item :group="vue" subtitle="最近一条：今晚8点直播" />
      <em-group-item :group="react" subtitle="3 条未读" avatar-shape="rounded" />
      <em-group-item :group="game" subtitle="今晚 8 点开局" size="large" />
    </div>
  </EmUIKitProvider>
</template>
