<script setup lang="ts">
/**
 * 直播评论抽奖入口（右侧顶部偏下，P4 review UI 规范）：
 * 黄色方形按钮，对话气泡 + 礼物图标，文字「评论抽奖」白色。
 */
import { t } from '@easemob/uikit-core'

const emit = defineEmits<{
  /** 点击抽奖入口 */
  (e: 'click'): void
}>()
</script>

<template>
  <button class="live-lottery" @click="emit('click')">
    <span class="live-lottery__icon">💬🎁</span>
    <span class="live-lottery__text">{{ t('chatroom.ui.liveLottery') }}</span>
  </button>
</template>

<style scoped>
.live-lottery {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 64px;
  padding: 8px 4px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(180deg, #fbbf24, #f59e0b);
  box-shadow: 0 2px 10px rgba(245, 158, 11, 0.5);
  cursor: pointer;
  animation: lottery-bounce 2s ease-in-out infinite;
  will-change: transform;
}

@keyframes lottery-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.live-lottery__icon {
  font-size: 16px;
  line-height: 1;
}

.live-lottery__text {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}
</style>
