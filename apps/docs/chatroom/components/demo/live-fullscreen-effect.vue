<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { ChatroomLiveFullscreenEffect } from '@easemob/uikit-chatroom'
import type { LiveFullscreenEffectItem } from '@easemob/uikit-chatroom'

const effects = ref<LiveFullscreenEffectItem[]>([])
let seq = 0
let timer: ReturnType<typeof setInterval> | undefined

/** 模拟收到大礼物消息：push 进队列，组件自动播放后移除 */
function pushEffect() {
  const rockets = ['🚀', '🏎️', '✈️']
  const icons = rockets[seq % rockets.length]
  effects.value = [...effects.value, { id: ++seq, type: 'big-gift', icon: icons, name: '用户A', text: '送出大火箭' }]
}

timer = setInterval(pushEffect, 3500)

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="fs-demo">
    <button class="push" type="button" @click="pushEffect">
      推送一条全屏动效
    </button>
    <ChatroomLiveFullscreenEffect :items="effects">
      <!-- 默认插槽：当前播放条目（item / end） -->
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
</template>

<style scoped>
.fs-demo {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

.push {
  padding: 4px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  cursor: pointer;
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
  font-size: 72px;
}

.rocket__text {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #ffd666;
  font-size: 18px;
}

.rocket__text b {
  font-size: 22px;
}
</style>
