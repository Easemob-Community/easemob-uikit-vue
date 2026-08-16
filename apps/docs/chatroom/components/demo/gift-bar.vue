<script setup lang="ts">
import { createPinia, setActivePinia } from 'pinia'
import { EmUIKitProvider } from '@easemob/uikit-core'
import {
  CHATROOM_STATUS,
  ChatroomGiftBar,
  useChatroomStore,
} from '@easemob/uikit-chatroom'

// ChatroomGiftBar 内部经 useChatroomMessage 依赖 UIKit Provider 上下文：
// 本演示包一层 core 的 EmUIKitProvider（仅本地初始化 SDK，不登录），
// 并模拟「已加入房间」让发送链路可走（未登录时发送失败被组件内部 catch 静默）。
setActivePinia(createPinia())

const store = useChatroomStore()
store.rooms.set('demo-room', {
  kind: 'interact',
  status: CHATROOM_STATUS.JOINED,
  roomId: 'demo-room',
  info: null,
  members: [],
  membersHasMore: false,
  muteList: [],
  isAllMuted: false,
  announcement: '',
  attributes: {},
  joinToken: 1,
  pendingRejoin: false,
  autoRejoin: true,
})
store.activeRoomId = 'demo-room'
</script>

<template>
  <EmUIKitProvider app-key="demo#demo">
    <div class="gift-demo">
      <ChatroomGiftBar />
      <p class="hint">
        点击 🎁 打开礼物面板：选中礼物即发送并关闭（与表情面板一致的交互形态）。
        本演示为模拟环境（未登录），发送不会真实上屏——真实接入见组件页「使用方式」。
      </p>
    </div>
  </EmUIKitProvider>
</template>

<style scoped>
.gift-demo {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

.hint {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
</style>
