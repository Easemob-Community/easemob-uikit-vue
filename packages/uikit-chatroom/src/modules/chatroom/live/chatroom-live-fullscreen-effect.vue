<script setup lang="ts">
/**
 * 直播间全屏动效容器（通用壳子）：
 * - 大礼物（火箭/跑车/飞机等）、全屏公告、PK 胜利等需要强提示的场景；
 * - UIKIT 只负责：全屏 overlay、入场/退场动画、自动移除、队列消费；
 * - 内容通过 slot 自定义，业务方决定展示火箭、跑车、文字公告还是自定义 SVG/Lottie。
 */
import { ref, watch } from 'vue'

export interface LiveFullscreenEffectItem {
  /** 唯一标识 */
  id: string | number
  /** 动效类型（业务自定义，如 'rocket' / 'car' / 'announcement'） */
  type: string
  /** 展示图标/emoji */
  icon?: string
  /** 展示文本 */
  text?: string
  /** 发送者名称 */
  name?: string
  /** 持续时长（ms），默认 3000 */
  duration?: number
  /** 业务透传数据 */
  meta?: Record<string, unknown>
}

export interface ChatroomLiveFullscreenEffectProps {
  /** 动效队列（push 新增条目，组件按 id 增量消费） */
  items: LiveFullscreenEffectItem[]
}

const props = defineProps<ChatroomLiveFullscreenEffectProps>()

const emit = defineEmits<{
  /** 某条动效结束（动画完成或时长到） */
  (e: 'end', id: string | number): void
}>()

/** 当前展示项（队列只展示最新一条，旧条目被覆盖；如需连播可扩展为队列） */
const current = ref<LiveFullscreenEffectItem | null>(null)
/** 动画阶段：enter / leave */
const phase = ref<'enter' | 'leave'>('enter')

const ENTER_MS = 600
const DEFAULT_DURATION_MS = 3000

let leaveTimer: ReturnType<typeof setTimeout> | null = null
let idSeq = 0

function clearLeaveTimer() {
  if (leaveTimer) {
    clearTimeout(leaveTimer)
    leaveTimer = null
  }
}

function play(item: LiveFullscreenEffectItem) {
  clearLeaveTimer()
  current.value = item
  phase.value = 'enter'
  const duration = Math.max(ENTER_MS, item.duration ?? DEFAULT_DURATION_MS)
  leaveTimer = setTimeout(() => {
    phase.value = 'leave'
    leaveTimer = setTimeout(() => {
      emit('end', item.id)
      current.value = null
      leaveTimer = null
    }, 500)
  }, duration)
}

/** 消费新增条目 */
watch(
  () => props.items.length,
  () => {
    for (let i = idSeq; i < props.items.length; i++) {
      const item = props.items[i]!
      idSeq += 1
      // 新条目直接覆盖当前动效，保证最新的大礼物立即展示
      play(item)
    }
  },
)
</script>

<template>
  <Transition
    enter-active-class="live-fs-effect--enter-active"
    enter-from-class="live-fs-effect--enter-from"
    enter-to-class="live-fs-effect--enter-to"
    leave-active-class="live-fs-effect--leave-active"
    leave-from-class="live-fs-effect--leave-from"
    leave-to-class="live-fs-effect--leave-to"
  >
    <div
      v-if="current"
      :key="`fs-${current.id}`"
      class="live-fs-effect"
      :class="`live-fs-effect--${current.type}`"
    >
      <!-- 默认展示：emoji + 文案 -->
      <slot :item="current" :end="() => emit('end', current!.id)">
        <div class="live-fs-effect__content">
          <span v-if="current.icon" class="live-fs-effect__icon">{{ current.icon }}</span>
          <div v-if="current.name || current.text" class="live-fs-effect__text">
            <div v-if="current.name" class="live-fs-effect__name">{{ current.name }}</div>
            <div v-if="current.text" class="live-fs-effect__desc">{{ current.text }}</div>
          </div>
        </div>
      </slot>
    </div>
  </Transition>
</template>

<style scoped>
.live-fs-effect {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.35);
}

.live-fs-effect__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  color: #fff;
}

.live-fs-effect__icon {
  font-size: clamp(80px, 22vw, 160px);
  line-height: 1;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.45));
  animation: fs-icon-bounce 1s ease-in-out infinite;
}

@keyframes fs-icon-bounce {
  0%,
  100% {
    transform: scale(1) translateY(0);
  }
  50% {
    transform: scale(1.08) translateY(-12px);
  }
}

.live-fs-effect__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 24px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
}

.live-fs-effect__name {
  font-size: clamp(16px, 4.5vw, 24px);
  font-weight: 700;
  color: #ffd666;
}

.live-fs-effect__desc {
  font-size: clamp(14px, 3.8vw, 20px);
  font-weight: 600;
}

/* Vue Transition 类 */
.live-fs-effect--enter-active,
.live-fs-effect--leave-active {
  transition:
    opacity 500ms ease-out,
    transform 500ms ease-out;
}

.live-fs-effect--enter-from,
.live-fs-effect--leave-to {
  opacity: 0;
  transform: scale(0.85);
}

.live-fs-effect--enter-to,
.live-fs-effect--leave-from {
  opacity: 1;
  transform: scale(1);
}
</style>
