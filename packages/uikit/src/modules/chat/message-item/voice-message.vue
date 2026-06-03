<script setup lang="ts">
import { computed, ref, onUnmounted, inject, type InjectionKey } from 'vue'
import { useThemeStore } from '../../../store/theme'
import type { VoiceMessageType } from '../../../store/message'

export interface VoiceMessageProps {
  message: VoiceMessageType
}

const props = defineProps<VoiceMessageProps>()

const themeStore = useThemeStore()
const bubbleClass = computed(() =>
  themeStore.bubbleShape === 'square' ? 'voice-message__bubble--square' : ''
)

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
    audioController.stop(props.message.id)
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

  const url = (props.message as unknown as { url?: string }).url || ''
  if (!url) {
    console.warn('[VoiceMessage] no audio url:', props.message.id)
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
    audioController.play(audio, props.message.id)
  }).catch((err) => {
    console.warn('[VoiceMessage] play failed:', err)
    cleanupAudio()
  })
}

onUnmounted(() => {
  cleanupAudio()
})
</script>

<template>
  <div class="voice-message" :class="{ 'voice-message--self': props.message.isSelf }" @click="onPlayClick">
    <div class="voice-message__bubble" :class="[bubbleClass, { 'voice-message__bubble--playing': isPlaying }]">
      <span class="voice-message__icon">
        <span v-if="isPlaying" class="voice-message__wave">
          <span class="voice-message__wave-bar" />
          <span class="voice-message__wave-bar" />
          <span class="voice-message__wave-bar" />
        </span>
        <span v-else>&#9658;</span>
      </span>
      <span class="voice-message__duration">{{ props.message.duration || 0 }}"</span>
    </div>
  </div>
</template>

<style scoped>
.voice-message {
  display: flex;
  max-width: 60%;
}

.voice-message--self {
  justify-content: flex-end;
}

.voice-message__bubble {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 12px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
  font-size: 14px;
}

.voice-message__bubble--square {
  border-radius: 4px;
}

.voice-message--self .voice-message__bubble {
  background-color: var(--uikit-primary-color);
  color: #fff;
}

.voice-message__icon {
  font-size: 12px;
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
  0% { transform: scaleY(0.4); }
  100% { transform: scaleY(1); }
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
</style>
