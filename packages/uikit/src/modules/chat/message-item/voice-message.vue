<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { useThemeStore } from '../../../store/theme'
import type { AudioMessageType } from '../../../store/message'

export interface VoiceMessageProps {
  message: AudioMessageType
}

const props = defineProps<VoiceMessageProps>()

const themeStore = useThemeStore()
const bubbleClass = computed(() =>
  themeStore.bubbleShape === 'square' ? 'voice-message__bubble--square' : ''
)

/** 全局音频实例，用于互斥播放 */
let globalAudio: HTMLAudioElement | null = null
let globalPlayingId = ''

const isPlaying = ref(false)
const currentAudio = ref<HTMLAudioElement | null>(null)

function stopCurrentAudio() {
  if (currentAudio.value) {
    currentAudio.value.pause()
    currentAudio.value.currentTime = 0
    currentAudio.value = null
  }
  isPlaying.value = false
  if (globalPlayingId === props.message.id) {
    globalPlayingId = ''
    globalAudio = null
  }
}

function onPlayClick() {
  // 如果正在播放，则停止
  if (isPlaying.value && currentAudio.value) {
    stopCurrentAudio()
    return
  }

  // 互斥：停止其他正在播放的语音
  if (globalAudio && globalAudio !== currentAudio.value) {
    globalAudio.pause()
    globalAudio.currentTime = 0
  }

  const url = (props.message as any).url || ''
  if (!url) {
    console.warn('[VoiceMessage] no audio url:', props.message.id)
    return
  }

  const audio = new Audio(url)
  currentAudio.value = audio
  globalAudio = audio
  globalPlayingId = props.message.id

  audio.addEventListener('ended', () => {
    isPlaying.value = false
    currentAudio.value = null
    if (globalPlayingId === props.message.id) {
      globalPlayingId = ''
      globalAudio = null
    }
  })

  audio.addEventListener('error', () => {
    isPlaying.value = false
    currentAudio.value = null
    if (globalPlayingId === props.message.id) {
      globalPlayingId = ''
      globalAudio = null
    }
  })

  audio.play().then(() => {
    isPlaying.value = true
  }).catch((err) => {
    console.warn('[VoiceMessage] play failed:', err)
    isPlaying.value = false
    currentAudio.value = null
  })
}

onUnmounted(() => {
  stopCurrentAudio()
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
      <span class="voice-message__duration">{{ props.message.length || 0 }}"</span>
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
