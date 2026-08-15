<script setup lang="ts">
import { type ComputedRef, type InjectionKey, computed, inject, onUnmounted, ref } from 'vue'
import { formatSdkError } from '@easemob/uikit-core'
import { useThemeStore } from '@easemob/uikit-core'
import { INJECTION_KEY } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { EmIcon as Icon } from '@easemob/uikit-core'
import type { UiMessage, VoiceMessageBody } from '@easemob/uikit-core'
import type { BubbleShape } from '../types'
import { createLogger } from '@easemob/uikit-core'

const logger = createLogger('UIKit:VoiceMessage')

export interface VoiceMessageProps {
  message: UiMessage
}

const props = defineProps<VoiceMessageProps>()

const { t } = useLocale()

const themeStore = useThemeStore()

/** 圆角 class：config.messageList.bubbleShape 优先，未配置回落主题全局 bubbleShape（message-bubble-wrapper provide） */
const injectedBubbleShape = inject<ComputedRef<BubbleShape | undefined>>(INJECTION_KEY.BUBBLE_SHAPE, computed(() => undefined))
const bubbleClass = computed(() =>
  (injectedBubbleShape.value ?? themeStore.bubbleShape) === 'square'
    ? 'voice-message__bubble--square'
    : '',
)

const body = computed(() => props.message.body as VoiceMessageBody)

/** 音频播放控制器接口 */
interface AudioController {
  play: (audio: HTMLAudioElement, id: string) => void
  stop: (id: string) => void
  isPlaying: (id: string) => boolean
}

/** 全局音频控制器 InjectionKey */
const AudioControllerKey: InjectionKey<AudioController> = Symbol('voice-audio-controller')

/** 创建默认音频控制器（模块级单例，比全局变量更安全） */
function createAudioController(): AudioController {
  let currentAudio: HTMLAudioElement | null = null
  let currentId = ''
  return {
    play(audio, id) {
      // 互斥：停止其他正在播放的语音
      if (currentAudio && currentAudio !== audio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
      }
      currentAudio = audio
      currentId = id
    },
    stop(id) {
      if (currentId === id) {
        currentAudio = null
        currentId = ''
      }
    },
    isPlaying(id) {
      return currentId === id && currentAudio !== null && !currentAudio.paused
    },
  }
}

/** 注入或创建音频控制器 */
const audioController = inject(AudioControllerKey, createAudioController(), true)

const isPlaying = ref(false)
const currentAudio = ref<HTMLAudioElement | null>(null)

function cleanupAudio() {
  if (currentAudio.value) {
    currentAudio.value.pause()
    currentAudio.value.currentTime = 0
    audioController.stop(props.message.msgServerId || props.message.msgLocalId)
    currentAudio.value = null
  }
  isPlaying.value = false
}

function onPlayClick() {
  // 如果正在播放，则停止
  if (isPlaying.value && currentAudio.value) {
    cleanupAudio()
    return
  }

  const url = body.value.url || ''
  if (!url) {
    logger.warn('[VoiceMessage] no audio url:', props.message.msgServerId || props.message.msgLocalId)
    return
  }

  const audio = new Audio(url)
  currentAudio.value = audio

  audio.addEventListener('ended', () => {
    cleanupAudio()
  })

  audio.addEventListener('error', () => {
    cleanupAudio()
  })

  audio.play().then(() => {
    isPlaying.value = true
    audioController.play(audio, props.message.msgServerId || props.message.msgLocalId)
  }).catch((err) => {
    logger.warn('[VoiceMessage] play failed:', formatSdkError(err))
    cleanupAudio()
  })
}

onUnmounted(() => {
  cleanupAudio()
})

/** 是否存在转写结果 */
const hasVoiceText = computed(() => !!props.message.voiceText?.text)

/** 是否优先展示转写结果 */
const showVoiceText = computed(() => hasVoiceText.value && props.message.showVoiceText !== false)

/** 是否正在转写中 */
const voiceTranscribing = computed(() => !!props.message.voiceTranscribing)

/** 是否需要显示转文字卡片：转写中 / 已有结果且未隐藏（切换入口在右键菜单） */
const showVoiceTextCard = computed(() => voiceTranscribing.value || (hasVoiceText.value && showVoiceText.value))
</script>

<template>
  <div class="voice-message" :class="{ 'voice-message--self': props.message.isSelf }">
    <div class="voice-message__bubble" :class="[bubbleClass, { 'voice-message__bubble--playing': isPlaying }]" @click="onPlayClick">
      <span class="voice-message__icon">
        <span v-if="isPlaying" class="voice-message__wave">
          <span class="voice-message__wave-bar" />
          <span class="voice-message__wave-bar" />
          <span class="voice-message__wave-bar" />
        </span>
        <Icon v-else name="audio-video/play" :size="14" />
      </span>
      <span class="voice-message__duration">{{ body.duration || 0 }}"</span>
    </div>
    <!-- 转文字结果卡片（隐藏/显示文字入口在右键菜单） -->
    <div v-if="showVoiceTextCard" class="voice-message__text-card">
      <!-- 转写中 -->
      <div v-if="voiceTranscribing" class="voice-message__text voice-message__text--loading">
        <Icon name="actions/loading_arc" :size="14" anim="spin" />
        <span>{{ t('message.voiceToText.loading') }}</span>
      </div>
      <!-- 已有结果：展示转写文字 -->
      <template v-else>
        <div class="voice-message__text">
          {{ props.message.voiceText?.text }}
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.voice-message {
  display: flex;
  flex-direction: column;
}

.voice-message--self {
  align-items: flex-end;
}

.voice-message__bubble {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 12px;
  background-color: var(--uikit-bubble-bg-other);
  color: var(--uikit-bubble-text-other);
  font-size: var(--uikit-font-size-14);
  max-width: 60%;
}

.voice-message__bubble--square {
  border-radius: 4px;
}

.voice-message--self .voice-message__bubble {
  background-color: var(--uikit-bubble-bg-self);
  color: var(--uikit-bubble-text-self);
}

.voice-message__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
}

/* 播放动画 */
.voice-message__wave {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 12px;
}

.voice-message__wave-bar {
  width: 2px;
  background-color: currentColor;
  border-radius: 1px;
  animation: voice-wave 0.6s ease-in-out infinite alternate;
}

.voice-message__wave-bar:nth-child(1) {
  height: 6px;
  animation-delay: 0s;
}

.voice-message__wave-bar:nth-child(2) {
  height: 10px;
  animation-delay: 0.2s;
}

.voice-message__wave-bar:nth-child(3) {
  height: 6px;
  animation-delay: 0.4s;
}

@keyframes voice-wave {
  0% {
    transform: scaleY(0.4);
  }
  100% {
    transform: scaleY(1);
  }
}

/* 播放中状态 */
.voice-message__bubble--playing {
  opacity: 0.85;
}

.voice-message {
  cursor: pointer;
  user-select: none;
}

.voice-message__bubble {
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .voice-message__bubble:hover {
    opacity: 0.85;
  }
}

/* 转文字结果卡片 */
.voice-message__text-card {
  max-width: 100%;
  margin-top: 6px;
  padding: 10px 14px;
  border-radius: 12px;
  background-color: var(--uikit-bubble-bg-other);
  color: var(--uikit-bubble-text-other);
  font-size: var(--uikit-font-size-14);
  overflow-wrap: break-word;
  word-break: normal;
  box-sizing: border-box;
}

.voice-message__text {
  font-size: var(--uikit-font-size-14);
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.voice-message__text--loading {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}
</style>
