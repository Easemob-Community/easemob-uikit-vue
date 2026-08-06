<script setup lang="ts">
import { type InjectionKey, computed, inject, onUnmounted, ref } from 'vue'
import { formatSdkError } from '../../../utils/sdk-error'
import { useThemeStore } from '../../../store/theme'
import { useLocale } from '../../../locale'
import Icon from '../../../components/icon/icon.vue'
import type { UiMessage, VoiceMessageBody } from '../../../sdk/types'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('UIKit:VoiceMessage')

export interface VoiceMessageProps {
  message: UiMessage
}

export interface VoiceMessageEmits {
  (e: 'toggle-voice-text', message: UiMessage): void
}

const props = defineProps<VoiceMessageProps>()
const emit = defineEmits<VoiceMessageEmits>()

const { t } = useLocale()

const themeStore = useThemeStore()
const bubbleClass = computed(() =>
  themeStore.bubbleShape === 'square' ? 'voice-message__bubble--square' : '',
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

/** 是否需要显示转文字卡片 */
const showVoiceTextCard = computed(() => voiceTranscribing.value || hasVoiceText.value)

function onToggleVoiceText() {
  emit('toggle-voice-text', props.message)
}
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
    <!-- 转文字结果卡片 -->
    <div v-if="showVoiceTextCard" class="voice-message__text-card">
      <!-- 转写中 -->
      <div v-if="voiceTranscribing" class="voice-message__text voice-message__text--loading">
        {{ t('message.voiceToText.loading') }}
      </div>
      <!-- 已有结果：展示转写文字 -->
      <template v-else-if="showVoiceText">
        <div class="voice-message__text">
          {{ props.message.voiceText?.text }}
        </div>
        <div class="voice-message__text-footer">
          <span class="voice-message__text-provider">
            <Icon name="actions/check_in_circle_fill" :size="12" />
            <span>{{ t('message.voiceToText.provider') }}</span>
          </span>
          <button
            class="voice-message__text-toggle"
            @click.stop="onToggleVoiceText"
          >
            {{ t('message.voiceToText.hideText') }}
          </button>
        </div>
      </template>
      <!-- 已有结果：当前隐藏，提供显示入口 -->
      <template v-else>
        <div class="voice-message__text-footer voice-message__text-footer--center">
          <button
            class="voice-message__text-toggle"
            @click.stop="onToggleVoiceText"
          >
            {{ t('message.voiceToText.showText') }}
          </button>
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
  transition: opacity 0.15s;
}

.voice-message__bubble:hover {
  opacity: 0.85;
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
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}

.voice-message__text-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}

.voice-message__text-footer--center {
  justify-content: flex-start;
  margin-top: 0;
}

.voice-message__text-provider {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  opacity: 0.75;
  user-select: none;
}

.voice-message__text-toggle {
  padding: 0;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-primary-color);
  background: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.voice-message__text-toggle:hover {
  opacity: 0.8;
}
</style>
