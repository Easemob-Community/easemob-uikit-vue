<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { ChatroomLiveFullscreenEffect } from '@easemob/uikit-chatroom'
import type { LiveFullscreenEffectItem } from '@easemob/uikit-chatroom'

const effects = ref<LiveFullscreenEffectItem[]>([])
let seq = 0

/** 模拟收到大礼物消息：push 进队列，组件自动播放后移除 */
function pushEffect() {
  const items: Array<{ icon: string, name: string }> = [
    { icon: '🚀', name: '送出大火箭' },
    { icon: '🏎️', name: '送出跑车' },
    { icon: '✈️', name: '送出飞机' },
  ]
  const it = items[seq % items.length]
  effects.value = [...effects.value, { id: ++seq, type: 'big-gift', icon: it.icon, name: '用户A', text: it.name }]
}

const timer = setInterval(pushEffect, 3200)

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="fs-demo">
    <div class="fs-demo__stage">
      <!-- fullscreen: false —— 动效约束在最近定位祖先内播放（本演示舞台） -->
      <ChatroomLiveFullscreenEffect :items="effects" :fullscreen="false">
        <template #default="{ item, end }">
          <div class="rocket" @click="end">
            <span class="rocket__icon">{{ item.icon }}</span>
            <div class="rocket__text">
              <b>{{ item.name }}</b>
              <span>{{ item.text }}</span>
            </div>
          </div>
        </template>
      </ChatroomLiveFullscreenEffect>
    </div>
    <p class="hint">
      自动推送全屏动效（每 3.2s 一条，3s 后自动移除）；点击动效区域可提前结束。
      <code>fullscreen: false</code> 时动效铺满最近定位祖先，方便嵌入容器 / 文档演示。
    </p>
  </div>
</template>

<style scoped>
.fs-demo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fs-demo__stage {
  position: relative;
  height: 220px;
  overflow: hidden;
  border-radius: 10px;
  background: #14181f;
}

.rocket {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.rocket__icon {
  font-size: 64px;
}

.rocket__text {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #ffd666;
  font-size: 16px;
}

.rocket__text b {
  font-size: 20px;
}

.hint {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
</style>
