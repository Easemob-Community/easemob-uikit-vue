<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { EmIcon as Icon, useLocale } from '@easemob-community/uikit-core'

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

/** 格式化录音时长：1 分钟内显示秒数（如 12″），超过 1 分钟显示 m:ss */
const formattedDuration = computed(() => {
  const total = duration.value
  if (total < 60)
    return `${total}″`
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

/** 开始录音 */
function startRecording() {
  if (isRecording.value)
    return
  isRecording.value = true
  duration.value = 0
  timer = setInterval(() => {
    duration.value++
  }, 1000)
  emit('start')
}

/** 停止录音并发送（时长 ≤0 秒视为过短：不发送，按取消处理以释放上层麦克风资源，回到就绪态） */
function stopRecording() {
  if (!isRecording.value)
    return
  isRecording.value = false
  const d = duration.value
  stopTimer()
  if (d <= 0) {
    // 过短不发送，但必须通知上层走取消链路——否则 getUserMedia 流/MediaRecorder 不会被释放（浏览器标签页麦克风占用指示常亮）
    emit('cancel')
    return
  }
  emit('end', d)
  // 发送后回到就绪状态，面板保持打开
}

/** 取消录音 */
function cancelRecording() {
  if (!isRecording.value)
    return
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
    }
    else {
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
    }
    else {
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
  { immediate: true },
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
    <div class="voice-panel__inner">
      <!-- 计时：就绪态透明但占位（预留高度，防止开始录音时按钮跳动），录音态淡入 -->
      <div class="voice-panel__timer" :class="{ 'voice-panel__timer--idle': !isRecording }" aria-hidden="true">
        {{ formattedDuration }}
      </div>

      <!-- 麦克风按钮：就绪态浅蓝渐变，录音态深蓝弥散渐变 + 呼吸缩放（豆包风格流体 blob） -->
      <div
        class="voice-panel__mic"
        :class="{ 'voice-panel__mic--recording': isRecording }"
      >
        <span class="voice-panel__fluid" aria-hidden="true">
          <span class="voice-panel__blob voice-panel__blob--1" />
          <span class="voice-panel__blob voice-panel__blob--2" />
          <span class="voice-panel__blob voice-panel__blob--3" />
        </span>
        <Icon name="mic/fill" :size="24" color="white" class="voice-panel__mic-icon" />
      </div>

      <!-- 提示文案 -->
      <div v-if="!isRecording" class="voice-panel__hint">
        {{ t('chat.voice.holdSpace') }}<span class="voice-panel__link" @mousedown.stop @click="deactivate">{{ t('chat.voice.exit') }}</span>
      </div>
      <div v-else class="voice-panel__hint">
        {{ t('chat.voice.releaseSend') }}<span class="voice-panel__link" @mousedown.stop @click="cancelRecording">{{ t('chat.voice.cancelSend') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.voice-panel {
  /* 录音 CTA 品牌色（设计稿定值）：组件级作用域变量，外部需要定制时可覆写 */
  --voice-cta-idle-from: #6ec8ff;
  --voice-cta-idle-to: #3ae8ff;
  --voice-cta-recording-from: #0024ed;
  --voice-cta-recording-to: #3a96ff;
  --voice-cta-ring-idle: rgb(255 255 255 / 55%);
  --voice-cta-ring-recording: rgb(255 255 255 / 45%);
  --voice-cta-glow-ring: rgb(0 158 255 / 8%);
  --voice-cta-shadow: rgb(0 122 189 / 25%);
  --voice-cta-shadow-recording: rgb(0 122 189 / 16%);
  --voice-blob-light: #bbf9ff;
  --voice-blob-light-transparent: rgb(82 255 229 / 0%);
  --voice-blob-mid: #52ffe5;
  --voice-blob-mid-transparent: rgb(82 255 229 / 0%);
  --voice-blob-deep: #0a5cff;
  --voice-blob-deep-transparent: rgb(0 123 189 / 0%);
  --voice-icon-shadow: rgb(0 60 120 / 25%);

  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-input-bg);
  border: 1px solid var(--uikit-border-color);
  cursor: pointer;
  user-select: none;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.voice-panel:active {
  background-color: var(--uikit-bg-hover);
}

.voice-panel__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* 设计稿 msg_input cta 态：麦克风圆与提示文案间距 8px */
  gap: var(--uikit-container-gap, 8px);
}

/* ===== 麦克风按钮：就绪态浅蓝渐变 ===== */
.voice-panel__mic {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 设计稿 cta 态：48px 圆 + 24px 麦克风图标 */
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  isolation: isolate;
  /* 就绪态浅蓝渐变（设计稿 paint0：#6EC8FF -> #3AE8FF） */
  background: linear-gradient(160deg, var(--voice-cta-idle-from) 0%, var(--voice-cta-idle-to) 100%);
  box-shadow:
    inset 0 0 0 1px var(--voice-cta-ring-idle),
    0 1px 3px var(--voice-cta-shadow);
  transition:
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.45s ease,
    background 0.5s ease;
}

/* 弥散流体层：裁剪在圆内，就绪态半透明显示静态 blob，录音态全亮并流动 */
.voice-panel__fluid {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  opacity: 0.55;
  transition: opacity 0.5s ease;
}

.voice-panel__blob {
  position: absolute;
  width: 130%;
  height: 130%;
  border-radius: 50%;
  /* blur 随按钮字号等比缩放（还原设计稿弥散感） */
  filter: blur(0.19em);
  mix-blend-mode: screen;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.voice-panel__blob--1 {
  top: -35%;
  left: -30%;
  background: radial-gradient(circle at 50% 50%, var(--voice-blob-light) 0%, var(--voice-blob-light-transparent) 65%);
}

.voice-panel__blob--2 {
  right: -32%;
  bottom: -38%;
  background: radial-gradient(circle at 50% 50%, var(--voice-blob-deep) 0%, var(--voice-blob-deep-transparent) 68%);
}

.voice-panel__blob--3 {
  top: 10%;
  right: -30%;
  width: 110%;
  height: 110%;
  background: radial-gradient(circle at 50% 50%, var(--voice-blob-mid) 0%, var(--voice-blob-mid-transparent) 60%);
}

.voice-panel__mic-icon {
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 1px 1px var(--voice-icon-shadow));
}

/* ===== 录音态：深蓝渐变 + 呼吸缩放 + blob 流动 ===== */
.voice-panel__mic--recording {
  background: linear-gradient(160deg, var(--voice-cta-recording-from) 0%, var(--voice-cta-recording-to) 100%);
  box-shadow:
    inset 0 0 0 1px var(--voice-cta-ring-recording),
    0 0 0 5px var(--voice-cta-glow-ring),
    0 6px 18px var(--voice-cta-shadow-recording);
}

@media (prefers-reduced-motion: no-preference) {
  .voice-panel__mic--recording {
    transform: scale(1.1);
    animation: voice-mic-breathe 3s ease-in-out infinite;
  }

  .voice-panel__mic--recording .voice-panel__fluid {
    opacity: 1;
  }

  .voice-panel__mic--recording .voice-panel__blob {
    /* 仅在动画期间提升为独立合成层 */
    will-change: transform;
  }

  .voice-panel__mic--recording .voice-panel__blob--1 {
    animation: voice-blob-float-1 6s ease-in-out infinite;
  }

  .voice-panel__mic--recording .voice-panel__blob--2 {
    animation: voice-blob-float-2 7.5s ease-in-out infinite;
  }

  .voice-panel__mic--recording .voice-panel__blob--3 {
    animation: voice-blob-float-3 5.5s ease-in-out infinite;
  }
}

/* keyframes 全部 translate3d/scale3d，纯合成层变换，任意 DPI/缩放下不掉帧 */
@keyframes voice-mic-breathe {
  0%,
  100% {
    transform: scale3d(1.08, 1.08, 1);
  }
  50% {
    transform: scale3d(1.14, 1.14, 1);
  }
}

@keyframes voice-blob-float-1 {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
  }
  33% {
    transform: translate3d(35%, 30%, 0) scale3d(1.2, 1.2, 1);
  }
  66% {
    transform: translate3d(20%, 55%, 0) scale3d(0.85, 0.85, 1);
  }
}

@keyframes voice-blob-float-2 {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
  }
  33% {
    transform: translate3d(-30%, -35%, 0) scale3d(0.9, 0.9, 1);
  }
  66% {
    transform: translate3d(-45%, -15%, 0) scale3d(1.25, 1.25, 1);
  }
}

@keyframes voice-blob-float-3 {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale3d(0.95, 0.95, 1);
  }
  50% {
    transform: translate3d(-40%, 25%, 0) scale3d(1.15, 1.15, 1);
  }
}

/* 全局动画开关关闭时归零（html 根属性） */
[data-uikit-anim-enabled='false'] .voice-panel__mic--recording,
[data-uikit-anim-enabled='false'] .voice-panel__mic--recording .voice-panel__blob {
  animation: none;
}

[data-uikit-anim-enabled='false'] .voice-panel__mic--recording {
  transform: scale(1.08);
}

[data-uikit-anim-enabled='false'] .voice-panel__mic--recording .voice-panel__fluid {
  opacity: 1;
}

.voice-panel__timer {
  /* 固定行高，保证就绪态占位与录音态计时同高，切换时不发生布局位移 */
  line-height: 18px;
  white-space: nowrap;
  font-size: var(--uikit-font-size-9);
  font-weight: var(--uikit-font-weight-medium);
  color: var(--uikit-text-tertiary, #919ba1);
  font-variant-numeric: tabular-nums;
  transition: opacity 0.2s ease;
}

.voice-panel__timer--idle {
  opacity: 0;
}

.voice-panel__hint {
  /* 设计稿 cta 态：caption 10px 弱提示色 */
  font-size: var(--uikit-font-size-9);
  color: var(--uikit-text-tertiary, #919ba1);
  text-align: center;
  line-height: 1.5;
}

.voice-panel__link {
  color: var(--uikit-primary-color, #3b82f6);
  /* 设计稿：Esc 高亮为 Medium */
  font-weight: var(--uikit-font-weight-medium);
  cursor: pointer;
  margin: 0 2px;
}

@media (hover: hover) {
  .voice-panel__link:hover {
    text-decoration: underline;
  }
}
</style>
