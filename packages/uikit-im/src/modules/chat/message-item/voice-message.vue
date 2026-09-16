<script setup lang="ts">
import { type ComputedRef, type InjectionKey, computed, inject, onUnmounted, ref } from 'vue'
import { formatSdkError } from '@easemob/uikit-core'
import { useThemeStore } from '@easemob/uikit-core'
import { INJECTION_KEY } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { EmIcon as Icon } from '@easemob/uikit-core'
import type { UiMessage, VoiceMessageBody } from '@easemob/uikit-core'
import type { BubbleShape } from '../types'
import { useMessageStore } from '../../../store/message'
import { createLogger } from '@easemob/uikit-core'

const logger = createLogger('UIKit:VoiceMessage')

export interface VoiceMessageProps {
  message: UiMessage
}

const props = defineProps<VoiceMessageProps>()

const { t } = useLocale()

const themeStore = useThemeStore()

const messageStore = useMessageStore()

/** 圆角 class：config.messageList.bubbleShape 优先，未配置回落主题全局 bubbleShape（message-bubble-wrapper provide） */
const injectedBubbleShape = inject<ComputedRef<BubbleShape | undefined>>(INJECTION_KEY.BUBBLE_SHAPE, computed(() => undefined))
const bubbleClass = computed(() =>
  (injectedBubbleShape.value ?? themeStore.bubbleShape) === 'square'
    ? 'voice-message__bubble--square'
    : '',
)

const body = computed(() => props.message.body as VoiceMessageBody)

/**
 * 语音气泡宽度随录音时长自动缩放（微信式）：
 * - 短录音回落最小宽度，保证图标+时长文本不裁剪、不溢出；
 * - 时长越长气泡越宽，封顶 MAX，避免超长语音无限撑开。
 * 常量可调：PX_PER_SECOND 越大，同样时长下气泡越宽。
 */
const VOICE_MIN_WIDTH = 72
const VOICE_MAX_WIDTH = 240
const VOICE_PX_PER_SECOND = 6

/** 语音时长（秒，取整，兼容小数/异常值） */
const durationSeconds = computed(() => {
  const d = Number(body.value.duration)
  return Number.isFinite(d) ? Math.max(0, Math.round(d)) : 0
})

/** 气泡宽度：夹在 [MIN_WIDTH, MAX_WIDTH]，随 durationSeconds 线性缩放 */
const bubbleWidth = computed(() => {
  const w = Math.min(VOICE_MAX_WIDTH, Math.max(VOICE_MIN_WIDTH, durationSeconds.value * VOICE_PX_PER_SECOND))
  return `${w}px`
})

/** 展示用时长文案，如 5" */
const durationText = computed(() => `${durationSeconds.value}"`)

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
  // 点击即视为已读：隐藏未播放红点
  if (showUnreadDot.value)
    messageStore.markVoicePlayed(voiceMsgId.value)

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

/** 未读红点开关：config.messageList.voiceUnreadDot（message-bubble-wrapper provide），支持消息项级深一层 provide 覆盖 */
const injectedVoiceUnreadDot = inject<ComputedRef<boolean | undefined>>(INJECTION_KEY.VOICE_UNREAD_DOT, computed(() => undefined))

const voiceMsgId = computed(() => props.message.msgServerId || props.message.msgLocalId)

/**
 * 未播放红点：仅对方语音 + 本会话实时收到（adapter onMessage 打标）+ 未点击过。
 * 历史/漫游消息无播放状态不打标 → 刷新页面后默认无红点。
 */
const showUnreadDot = computed(() =>
  (injectedVoiceUnreadDot.value ?? true)
  && !props.message.isSelf
  && messageStore.isVoiceUnplayed(voiceMsgId.value),
)
</script>

<template>
  <div class="voice-message" :class="{ 'voice-message--self': props.message.isSelf }">
    <div
      class="voice-message__bubble"
      :class="[bubbleClass, { 'voice-message__bubble--playing': isPlaying }]"
      :style="{ width: bubbleWidth }"
      @click="onPlayClick"
    >
      <div class="voice-message__main">
        <span class="voice-message__icon">
          <span v-if="isPlaying" class="voice-message__wave">
            <span class="voice-message__wave-bar" />
            <span class="voice-message__wave-bar" />
            <span class="voice-message__wave-bar" />
          </span>
          <Icon v-else name="triangle" :size="22" />
        </span>
        <span class="voice-message__duration">{{ durationText }}</span>
      </div>
    </div>
    <!-- 转文字结果：气泡外独立胶囊（sub-body），与气泡垂直间距 2px（隐藏/显示文字入口在右键菜单） -->
    <template v-if="showVoiceTextCard">
      <!-- 转写中 -->
      <div v-if="voiceTranscribing" class="voice-message__transcript voice-message__transcript--loading">
        <Icon name="loading/arc/normal" :size="14" anim="spin" />
        <span>{{ t('message.voiceToText.loading') }}</span>
      </div>
      <!-- 已有结果：展示转写文字胶囊 + 已转文字标签 -->
      <template v-else>
        <div class="voice-message__transcript">
          {{ props.message.voiceText?.text }}
        </div>
        <div class="voice-message__transcribed-tag">
          <Icon name="rect/hanzi" :size="12" />
          <span>{{ t('message.voiceToText.done') }}</span>
        </div>
      </template>
    </template>
    <!-- 未播放红点：气泡外侧（对方消息右侧）、相对气泡垂直居中，点击播放后消失 -->
    <span v-if="showUnreadDot" class="voice-message__unread-dot" aria-hidden="true" />
  </div>
</template>

<style scoped>
.voice-message {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  position: relative;
}

/* 未播放红点：气泡外侧右侧、相对气泡整体垂直居中 */
.voice-message__unread-dot {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--uikit-badge-bg, #FF7070);
  pointer-events: none;
}

.voice-message--self {
  align-items: flex-end;
}

.voice-message__bubble {
  display: flex;
  flex-direction: column;
  padding: 10px 14px;
  border-radius: var(--uikit-bubble-radius, 16px);
  background-color: var(--uikit-bubble-bg-other);
  color: var(--uikit-bubble-text-other);
  font-size: var(--uikit-font-size-16);
  /* 宽度由 JS 按时长计算（:style width），这里兜底： */
  box-sizing: border-box;
  /* min-width: fit-content 保证内容（图标+时长文本+内边距）永不窄于内容 → 不溢出气泡 */
  min-width: fit-content;
  max-width: 100%;
  /* 时长文本不换行，避免长时长被折行撑出气泡 */
  white-space: nowrap;
}

/* 语音主行：图标 + 时长（转文字内容在气泡外独立胶囊） */
.voice-message__main {
  display: flex;
  align-items: center;
  gap: 6px;
}

.voice-message__bubble--square {
  border-radius: var(--uikit-bubble-radius-square, 8px);
}

.voice-message--self .voice-message__bubble {
  background-color: var(--uikit-bubble-bg-self);
  color: var(--uikit-bubble-text-self);
}

.voice-message__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
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

/* 转文字胶囊：气泡外独立 sub-body，与气泡垂直间距 2px，双方统一灰底次级文字 */
.voice-message__transcript {
  margin-top: 2px;
  padding: 4px 14px;
  border-radius: 12px;
  background-color: var(--uikit-bubble-bg-other, #E4E6E7);
  color: var(--uikit-text-secondary, #5E686E);
  font-size: var(--uikit-font-size-14);
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 100%;
  box-sizing: border-box;
}

.voice-message__transcript--loading {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--uikit-font-size-12);
}

/* 已转文字标签：icon + 文案，接收侧左对齐、发送侧右对齐，胶囊外次级文字色 */
.voice-message__transcribed-tag {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  margin-top: 2px;
  font-size: var(--uikit-font-size-12);
  line-height: 1;
  color: var(--uikit-text-secondary, #5E686E);
  opacity: 0.75;
  user-select: none;
}

.voice-message--self .voice-message__transcribed-tag {
  justify-content: flex-end;
}
</style>
