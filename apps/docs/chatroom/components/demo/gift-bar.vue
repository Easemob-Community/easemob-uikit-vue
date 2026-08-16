<script setup lang="ts">
import { ChatroomGiftBar } from '@easemob/uikit-chatroom'
</script>

<template>
  <div class="gift-demo">
    <ChatroomGiftBar />
    <p class="hint">
      点击 🎁 打开礼物面板，选中礼物即关闭面板。本演示为纯 UI 预览模式
      （无登录环境，发送降级不真实上屏）——真实接入见组件页「使用方式」。
    </p>
  </div>
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
