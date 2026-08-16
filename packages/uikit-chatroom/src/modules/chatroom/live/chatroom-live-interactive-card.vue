<script setup lang="ts">
/**
 * 直播间可交互通知卡片壳子（通用）：
 * - 只负责「卡片容器」：白底圆角边框、呼吸灯 active 态、关闭滑出动画、已抢光遮罩、
 *   点击/关闭/行动按钮事件；
 * - 内容完全交给插槽：业务方可用同一份壳子实现商品卡、优惠券、红包、飘屏通知等；
 * - 这是 UIKIT 侧对「商品卡/优惠券/红包本质是交互型通知」的抽象，避免为每种形态
 *   单独预埋组件。
 */

import { computed, onMounted, onUnmounted, ref } from 'vue'

export interface ChatroomLiveInteractiveCardProps {
  /** 激活态（金色呼吸灯边框） */
  active?: boolean
  /** 已抢光/已领完遮罩 */
  soldOut?: boolean
  /** 是否显示右上角关闭（false = 常驻，用户无法关闭） */
  closable?: boolean
  /** 已售罄/已结束文案 */
  soldOutText?: string
  /** 自动关闭倒计时（毫秒），到达后触发 close；常用于抢购倒计时 */
  autoCloseMs?: number
  /** 倒计时文案格式（{{seconds}} 为剩余秒数占位） */
  countdownFormat?: string
}

const props = withDefaults(defineProps<ChatroomLiveInteractiveCardProps>(), {
  active: true,
  soldOut: false,
  closable: true,
  soldOutText: '',
  countdownFormat: '{{seconds}}s',
})

const emit = defineEmits<{
  /** 点击卡片主体 */
  (e: 'click'): void
  /** 关闭卡片 */
  (e: 'close'): void
  /** 行动按钮（如「抢」「领」） */
  (e: 'action'): void
}>()

/** 关闭动画状态 */
const closing = ref(false)
const CLOSE_MS = 400

function handleClose() {
  if (closing.value)
    return
  closing.value = true
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  setTimeout(() => {
    emit('close')
    closing.value = false
  }, CLOSE_MS)
}

/** 倒计时相关 */
const remainingMs = ref(props.autoCloseMs ?? 0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const countdownSeconds = computed(() => Math.max(0, Math.ceil(remainingMs.value / 1000)))
const countdownLabel = computed(() => {
  return props.countdownFormat.replace('{{seconds}}', String(countdownSeconds.value))
})
const showCountdown = computed(() => (props.autoCloseMs ?? 0) > 0)

onMounted(() => {
  if (!showCountdown.value)
    return
  countdownTimer = setInterval(() => {
    remainingMs.value -= 1000
    if (remainingMs.value <= 0) {
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
      handleClose()
    }
  }, 1000)
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})

const soldOutLabel = computed(() => {
  if (props.soldOutText)
    return props.soldOutText
  // 默认用 locale；core t 已全局注册
  return '— 已抢光 —'
})
</script>

<template>
  <div
    class="live-interactive-card"
    :class="{ 'live-interactive-card--active': active, 'live-interactive-card--closing': closing }"
    @click="emit('click')"
  >
    <!-- 头部：标题插槽 + 倒计时 + 关闭按钮 -->
    <div class="live-interactive-card__header">
      <div class="live-interactive-card__title">
        <slot name="title" />
      </div>
      <div class="live-interactive-card__trailing">
        <span v-if="showCountdown" class="live-interactive-card__countdown">{{ countdownLabel }}</span>
        <span
          v-if="closable"
          class="live-interactive-card__close"
          @click.stop="handleClose"
        >
          <slot name="close">✕</slot>
        </span>
      </div>
    </div>

    <!-- 主体插槽：图片、文案、表单等 -->
    <div class="live-interactive-card__body">
      <slot />
    </div>

    <!-- 底部行动区：价格、按钮等 -->
    <div class="live-interactive-card__footer">
      <slot name="footer" :action="() => emit('action')" />
    </div>

    <!-- 已抢光/已领完遮罩 -->
    <div v-if="soldOut" class="live-interactive-card__soldout">
      {{ soldOutLabel }}
    </div>
  </div>
</template>

<style scoped>
.live-interactive-card {
  position: relative;
  width: 150px;
  padding: 8px;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.85);
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  transition:
    transform 400ms ease-out,
    opacity 400ms ease-out;
  will-change: transform, opacity;
}

/* 激活态：金色呼吸灯边框 */
.live-interactive-card--active {
  animation: interactive-breath 2s ease-in-out infinite;
}

@keyframes interactive-breath {
  0%,
  100% {
    box-shadow:
      0 0 0 2px rgba(243, 200, 80, 0.9),
      0 4px 16px rgba(0, 0, 0, 0.25);
  }
  50% {
    box-shadow:
      0 0 0 4px rgba(243, 200, 80, 0.35),
      0 4px 16px rgba(0, 0, 0, 0.25);
  }
}

/* 关闭：向右滑出消失 */
.live-interactive-card--closing {
  transform: translateX(120%);
  opacity: 0;
}

.live-interactive-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  min-height: 18px;
}

.live-interactive-card__title {
  display: flex;
  align-items: center;
  min-width: 0;
}

.live-interactive-card__trailing {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.live-interactive-card__countdown {
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(229, 72, 77, 0.12);
  color: #e5484d;
  font-size: clamp(9px, 2.4vw, 10px);
  font-weight: 600;
  line-height: 1.4;
}

.live-interactive-card__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 10px;
  line-height: 1;
  flex-shrink: 0;
}

.live-interactive-card__body {
  position: relative;
  margin-bottom: 8px;
}

.live-interactive-card__footer {
  display: flex;
  align-items: center;
  gap: 5px;
}

.live-interactive-card__soldout {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(107, 114, 128, 0.65);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  z-index: 2;
}
</style>
