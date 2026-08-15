<script setup lang="ts">
/**
 * 直播欢迎横幅（弹幕区上方水平居中，P4 review UI 规范）：
 * - 金色/橙色渐变条，圆角 20px，「欢迎 E***💕 进入」白色 14px；
 * - VIP 用户带皇冠图标 + 用户名高亮；
 * - 入场从左侧 translateX(-100%) 滑入（400ms）；显示 3 秒后向上
 *   translateY(-100%) 淡出消失，随后 emit hidden。
 */
import { ref, watch } from 'vue'
import { maskUsername } from './mask-username'

const props = withDefaults(defineProps<{
  /** 显示控制（true 触发入场，3s 后自动退场） */
  show: boolean
  /** 欢迎的用户名（组件内脱敏） */
  name?: string
  /** VIP 用户（皇冠图标 + 高亮） */
  isVip?: boolean
}>(), {
  name: '',
  isVip: false,
})

const emit = defineEmits<{
  /** 横幅退场完成（页面复位 show 或接续下一条欢迎） */
  (e: 'hidden'): void
}>()

/** 当前展示内容（null = 隐藏） */
const banner = ref<{ name: string, isVip: boolean } | null>(null)
/** 动画阶段：enter（滑入）/ leaving（上移淡出） */
const phase = ref<'enter' | 'leaving'>('enter')
/** 显示时长（ms，UI 规范 3 秒） */
const HOLD_MS = 3000

let hideTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.show,
  (show) => {
    if (!show) {
      if (hideTimer) {
        clearTimeout(hideTimer)
        hideTimer = null
      }
      banner.value = null
      return
    }
    if (!props.name)
      return
    banner.value = { name: props.name, isVip: props.isVip }
    phase.value = 'enter'
    if (hideTimer)
      clearTimeout(hideTimer)
    // 3 秒后退场
    hideTimer = setTimeout(() => {
      phase.value = 'leaving'
      hideTimer = setTimeout(() => {
        banner.value = null
        hideTimer = null
        emit('hidden')
      }, 500)
    }, HOLD_MS)
  },
)
</script>

<template>
  <div
    v-if="banner"
    class="live-welcome"
    :class="{ 'live-welcome--leaving': phase === 'leaving' }"
  >
    <span v-if="banner.isVip" class="live-welcome__crown">👑</span>
    <span class="live-welcome__text">
      欢迎 <span class="live-welcome__name" :class="{ 'live-welcome__name--vip': banner.isVip }">{{ maskUsername(banner.name) }}</span>
      💕 进入
    </span>
  </div>
</template>

<style scoped>
.live-welcome {
  display: flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  max-width: 80%;
  padding: 8px 18px;
  border-radius: 20px;
  background: linear-gradient(90deg, #f59e0b, #f97316);
  box-shadow: 0 2px 12px rgba(249, 115, 22, 0.4);
  /* 入场：从左侧滑入（400ms） */
  animation: welcome-in 400ms ease-out forwards;
  will-change: transform, opacity;
}

@keyframes welcome-in {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.live-welcome--leaving {
  /* 退场：向上淡出（500ms） */
  transition:
    transform 500ms ease-out,
    opacity 500ms ease-out;
  transform: translateY(-100%);
  opacity: 0;
}

.live-welcome__crown {
  font-size: 15px;
  flex-shrink: 0;
}

.live-welcome__text {
  font-size: 14px;
  color: #fff;
  white-space: nowrap;
}

.live-welcome__name {
  font-weight: 700;
  color: #fff;
}

.live-welcome__name--vip {
  color: #ffefb8;
  text-shadow: 0 0 8px rgba(255, 239, 184, 0.8);
}
</style>
