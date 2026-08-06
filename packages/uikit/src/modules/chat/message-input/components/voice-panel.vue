<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useLocale } from '../../../../locale'
import Icon from '../../../../components/icon/icon.vue'

export interface VoicePanelProps {
  active: boolean
}

const props = defineProps<VoicePanelProps>()

const emit = defineEmits<{
  (e: 'update:active', val: boolean): void
  (e: 'start'): void
  (e: 'end', duration: number): void
  (e: 'cancel'): void
}>()

const { t } = useLocale()

/** 是否正在录音中 */
const isRecording = ref(false)

/** 录音时长（秒） */
const duration = ref(0)

/** 录音计时器 */
let timer: ReturnType<typeof setInterval> | null = null

/** 空格键是否被按下（防止重复触发） */
const isSpacePressed = ref(false)

/** 鼠标是否被按下（防止重复触发） */
const isMousePressed = ref(false)

/** 格式化录音时长 */
const formattedDuration = computed(() => {
  const mins = Math.floor(duration.value / 60)
  const secs = duration.value % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

/** 开始录音 */
function startRecording() {
  if (isRecording.value) return
  isRecording.value = true
  duration.value = 0
  timer = setInterval(() => {
    duration.value++
  }, 1000)
  emit('start')
}

/** 停止录音并发送 */
function stopRecording() {
  if (!isRecording.value) return
  isRecording.value = false
  const d = duration.value
  stopTimer()
  emit('end', d)
  // 发送后回到就绪状态，面板保持打开
}

/** 取消录音 */
function cancelRecording() {
  if (!isRecording.value) return
  isRecording.value = false
  stopTimer()
  emit('cancel')
  // 取消后回到就绪状态，面板保持打开
}

/** 停止计时器 */
function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

/** 退出录音面板 */
function deactivate() {
  emit('update:active', false)
}

/** 键盘按下 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === ' ' && !isSpacePressed.value && !e.repeat) {
    e.preventDefault()
    isSpacePressed.value = true
    startRecording()
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    if (isRecording.value) {
      isSpacePressed.value = false
      cancelRecording()
    } else {
      deactivate()
    }
  }
}

/** 键盘松开 */
function onKeyup(e: KeyboardEvent) {
  if (e.key === ' ' && isSpacePressed.value) {
    e.preventDefault()
    isSpacePressed.value = false
    stopRecording()
  }
}

/** 鼠标按下 */
function onMousedown() {
  if (!isRecording.value) {
    isMousePressed.value = true
    startRecording()
  }
}

/** 鼠标松开 */
function onMouseup() {
  if (isMousePressed.value) {
    isMousePressed.value = false
    stopRecording()
  }
}

/** 鼠标离开（取消录音） */
function onMouseleave() {
  if (isMousePressed.value) {
    isMousePressed.value = false
    cancelRecording()
  }
}

/** useEventListener 返回的停止函数 */
let stopKeydown: (() => void) | null = null
let stopKeyup: (() => void) | null = null

/** 监听 active 状态，管理全局键盘事件 */
watch(
  () => props.active,
  (val) => {
    if (val) {
      stopKeydown = useEventListener(window, 'keydown', onKeydown, { passive: false })
      stopKeyup = useEventListener(window, 'keyup', onKeyup, { passive: false })
    } else {
      stopKeydown?.()
      stopKeyup?.()
      stopKeydown = null
      stopKeyup = null
      // 退出录音模式时取消正在进行的录音（面板由外部关闭，不调用 deactivate）
      if (isRecording.value) {
        cancelRecording()
      }
      isSpacePressed.value = false
      isMousePressed.value = false
    }
  },
  { immediate: true }
)

/** 组件卸载时清理 */
onBeforeUnmount(() => {
  stopKeydown?.()
  stopKeyup?.()
  stopTimer()
})
</script>

<template>
  <div
    class="voice-panel"
    @mousedown="onMousedown"
    @mouseup="onMouseup"
    @mouseleave="onMouseleave"
  >
    <!-- 录音就绪状态 -->
    <template v-if="!isRecording">
      <div class="voice-panel__ready">
        <div class="voice-panel__mic-wrapper">
          <Icon name="audio-video/mic" :size="32" color="white" />
        </div>
        <div class="voice-panel__hint">
          {{ t('chat.voice.holdSpace') }}<span class="voice-panel__link" @mousedown.stop @click="deactivate">{{ t('chat.voice.exit') }}</span>
        </div>
      </div>
    </template>

    <!-- 录音中状态 -->
    <template v-else>
      <div class="voice-panel__recording">
        <div class="voice-panel__timer">{{ formattedDuration }}</div>
        <div class="voice-panel__mic-wrapper voice-panel__mic-wrapper--recording">
          <Icon name="audio-video/mic" :size="32" color="white" />
          <div class="voice-panel__ripple" />
          <div class="voice-panel__ripple" />
        </div>
        <div class="voice-panel__hint">
          {{ t('chat.voice.releaseSend') }}<span class="voice-panel__link" @mousedown.stop @click="cancelRecording">{{ t('chat.voice.cancelSend') }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.voice-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-bg-base);
  border: 1px solid #e5e7eb;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s;
}

.voice-panel:active {
  background-color: var(--uikit-bg-hover);
}

.voice-panel__ready,
.voice-panel__recording {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--uikit-container-gap, 8px) * 1.5);
}

.voice-panel__mic-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: var(--uikit-primary-color, #3b82f6);
  color: #fff;
  transition: transform 0.15s;
}

.voice-panel__mic-wrapper--recording {
  position: relative;
  transform: scale(1.05);
}

/* 波纹动画 */
.voice-panel__ripple {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 2px solid var(--uikit-primary-color, #3b82f6);
  opacity: 0.4;
  animation: voice-ripple 1.2s ease-out infinite;
}

.voice-panel__ripple:nth-child(2) {
  animation-delay: 0.4s;
}

@keyframes voice-ripple {
  0% {
    transform: scale(1);
    opacity: 0.4;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.voice-panel__timer {
  font-size: var(--uikit-font-size-16);
  font-weight: 500;
  color: var(--uikit-text-primary);
  font-variant-numeric: tabular-nums;
}

.voice-panel__hint {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
  text-align: center;
  line-height: 1.5;
}

.voice-panel__link {
  color: var(--uikit-primary-color, #3b82f6);
  cursor: pointer;
  margin: 0 2px;
}

.voice-panel__link:hover {
  text-decoration: underline;
}
</style>
