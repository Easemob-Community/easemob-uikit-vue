<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useLocale } from '@easemob/uikit-core'
import { EmIcon as Icon } from '@easemob/uikit-core'

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
    <!-- 录音就绪状态 -->
    <template v-if="!isRecording">
      <div class="voice-panel__ready">
        <!-- 计时占位：与录音态计时同尺寸但不可见，预留空间防止开始录音时按钮下移 -->
        <div class="voice-panel__timer voice-panel__timer--placeholder" aria-hidden="true">
          0″
        </div>
        <div class="voice-panel__mic-wrapper">
          <Icon name="mic/fill" :size="24" color="white" />
        </div>
        <div class="voice-panel__hint">
          {{ t('chat.voice.holdSpace') }}<span class="voice-panel__link" @mousedown.stop @click="deactivate">{{ t('chat.voice.exit') }}</span>
        </div>
      </div>
    </template>

    <!-- 录音中状态 -->
    <template v-else>
      <div class="voice-panel__recording">
        <div class="voice-panel__timer">
          {{ formattedDuration }}
        </div>
        <div class="voice-panel__mic-wrapper voice-panel__mic-wrapper--recording">
          <!-- 水波背景：三层超大不规则圆角块在圆内旋转，边缘形成自然起伏的水面 -->
          <span class="voice-panel__wave" />
          <span class="voice-panel__wave" />
          <span class="voice-panel__wave" />
          <Icon name="mic/fill" :size="24" color="white" />
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
  background-color: var(--uikit-input-bg);
  border: 1px solid var(--uikit-border-color);
  cursor: pointer;
  user-select: none;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
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
  /* 设计稿 msg_input cta 态：麦克风圆与提示文案间距 8px */
  gap: var(--uikit-container-gap, 8px);
}

.voice-panel__mic-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 设计稿 cta 态：48px 主色圆 + 24px 麦克风图标 */
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--uikit-primary-color, #3b82f6);
  color: var(--uikit-text-inverse);
  transition: transform var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.voice-panel__mic-wrapper--recording {
  position: relative;
  overflow: hidden;
  background-color: var(--uikit-primary-hover, #2563eb);
  /* 静态浅蓝光晕（设计稿外圈浅蓝环，无扩散动画），跟随主题主色 */
  box-shadow: 0 0 0 6px var(--uikit-primary-soft, rgba(59, 130, 246, 0.15));
}

/* 录音态：水波背景。经典 CSS water wave 技法——width/height 250% 的不规则圆角块
   以圆心下方为轴持续旋转，非对称 border-radius 使其上缘呈现自然波浪起伏；
   三层不同透明度/速度/转向叠加模拟水的流动感，overflow:hidden 收敛在圆形背景内 */
.voice-panel__wave {
  position: absolute;
  top: 42%;
  left: 50%;
  width: 250%;
  height: 250%;
  margin-left: -125%;
  border-radius: 43% 45% 42% 46%;
  background-color: rgb(255 255 255 / 0.14);
  z-index: 1;
  pointer-events: none;
  animation:
    voice-wave-rotate 5s linear infinite,
    voice-wave-breathe 3.6s ease-in-out infinite alternate;
}

.voice-panel__wave:nth-of-type(2) {
  top: 45%;
  border-radius: 46% 42% 45% 43%;
  background-color: rgb(255 255 255 / 0.2);
  animation-duration: 7s, 4.2s;
  animation-direction: reverse, alternate;
}

.voice-panel__wave:nth-of-type(3) {
  top: 48%;
  border-radius: 44% 46% 43% 45%;
  background-color: rgb(255 255 255 / 0.1);
  animation-duration: 9s, 5s;
}

.voice-panel__mic-wrapper--recording .uikit-icon {
  position: relative;
  z-index: 2;
}

@keyframes voice-wave-rotate {
  to {
    transform: rotate(360deg);
  }
}

/* 水位缓慢起伏（translate 独立于 transform，两者可叠加；百分比相对波浪自身尺寸） */
@keyframes voice-wave-breathe {
  from {
    translate: 0 0;
  }
  to {
    translate: 0 -5%;
  }
}

.voice-panel__timer {
  /* 固定行高，保证就绪态占位与录音态计时同高，切换时不发生布局位移 */
  line-height: 18px;
  white-space: nowrap;
  font-size: var(--uikit-font-size-13);
  font-weight: 500;
  color: var(--uikit-text-secondary);
  font-variant-numeric: tabular-nums;
}

.voice-panel__timer--placeholder {
  visibility: hidden;
}

.voice-panel__hint {
  /* 设计稿 cta 态：caption 10px 弱提示色 */
  font-size: var(--uikit-font-size-10);
  color: var(--uikit-text-tertiary, #919BA1);
  text-align: center;
  line-height: 1.5;
}

.voice-panel__link {
  color: var(--uikit-primary-color, #3b82f6);
  /* 设计稿：Esc 高亮为 Medium */
  font-weight: 500;
  cursor: pointer;
  margin: 0 2px;
}

@media (hover: hover) {
  .voice-panel__link:hover {
    text-decoration: underline;
  }
}
</style>
