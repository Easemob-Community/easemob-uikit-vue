<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { ComputedRef } from 'vue'
import { useThemeStore } from '@easemob/uikit-core'
import { INJECTION_KEY } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { useToast } from '@easemob/uikit-core'
import { EmIcon as Icon } from '@easemob/uikit-core'
import { detectEnvironment, downloadFile } from '@easemob/uikit-core'
import type { UiMessage, VideoMessageBody } from '@easemob/uikit-core'
import type { BubbleShape } from '../types'

export interface VideoMessageProps {
  message: UiMessage
}

const props = defineProps<VideoMessageProps>()

const themeStore = useThemeStore()
const { t } = useLocale()
const { show: showToast } = useToast()
/** 圆角 class：config.messageList.bubbleShape 优先，未配置回落主题全局 bubbleShape（message-bubble-wrapper provide） */
const injectedBubbleShape = inject<ComputedRef<BubbleShape | undefined>>(INJECTION_KEY.BUBBLE_SHAPE, computed(() => undefined))
const videoClass = computed(() =>
  (injectedBubbleShape.value ?? themeStore.bubbleShape) === 'square'
    ? 'video-message__video--square'
    : '',
)

const body = computed(() => props.message.body as VideoMessageBody)

/** 视频展示最大约束（与图片消息对齐） */
const MAX_WIDTH = 240
const MAX_HEIGHT = 240

/**
 * 根据消息体 width/height 等比预留展示尺寸：气泡一渲染就占位，
 * 避免 metadata 加载前 <video> 默认 300×150 → 加载后突变撑高列表（滚动位置被顶飞）。
 * 无元数据时回落 16:9 默认占位（240×135）。
 */
const displaySize = computed(() => {
  const w = body.value.width
  const h = body.value.height
  if (!w || !h || w <= 0 || h <= 0) {
    return { width: MAX_WIDTH, height: 135 }
  }
  const ratio = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h, 1)
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  }
})

/** 是否正在预览 */
const isPreviewing = ref(false)

function openPreview() {
  isPreviewing.value = true
}

function closePreview() {
  isPreviewing.value = false
}

/** 下载视频 */
async function handleDownload(event: MouseEvent) {
  event.stopPropagation()
  const url = body.value.url
  if (!url) {
    showToast(t('message.download.failed', '下载失败'), 'error')
    return
  }

  const env = detectEnvironment()
  const filename = body.value.filename || 'video.mp4'

  try {
    await downloadFile({
      url,
      filename,
      env,
      onSuccess: () => {
        showToast(t('message.download.success', '下载成功'), 'success')
      },
      onError: (err) => {
        if (err.name === 'WechatNotSupported') {
          showToast(t('message.download.wechatHint', '请在浏览器中打开以下载文件'), 'warning')
        }
        else {
          showToast(t('message.download.failed', '下载失败'), 'error')
        }
      },
    })
  }
  catch {
    // 错误已在 onError 回调中处理
  }
}
</script>

<template>
  <div class="video-message" :class="{ 'video-message--self': props.message.isSelf }">
    <div
      class="video-message__container"
      :style="{ width: `${displaySize.width}px`, height: `${displaySize.height}px` }"
      @click="openPreview"
    >
      <video
        v-if="body.url"
        :src="body.url"
        :poster="body.thumbnailUrl || undefined"
        class="video-message__video"
        :class="videoClass"
        preload="metadata"
      />
      <div v-else class="video-message__placeholder" :class="videoClass">
        {{ t('message.video', '[视频]') }}
      </div>
      <!-- 播放按钮覆盖层 -->
      <div class="video-message__overlay">
        <div class="video-message__play-btn">
          <Icon name="audio-video/play" :size="20" color="#fff" />
        </div>
      </div>
      <!-- 时长标签 -->
      <div v-if="body.duration" class="video-message__duration">
        {{ Math.floor(body.duration / 60) }}:{{ String(body.duration % 60).padStart(2, '0') }}
      </div>
    </div>

    <!-- 全屏预览 -->
    <div
      v-if="isPreviewing && body.url"
      class="video-message__preview"
      @click="closePreview"
    >
      <video
        :src="body.url"
        class="video-message__preview-video"
        controls
        autoplay
        @click.stop
      />
      <!-- 下载按钮 -->
      <button
        class="video-message__download-btn"
        :title="t('message.download.success', '下载')"
        @click.stop="handleDownload"
      >
        <Icon name="arrows/arrow_down_n_box" :size="20" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.video-message {
  display: flex;
  /* 不限定宽度：收缩包裹视频内容，状态列才能贴住气泡；
     曾用 max-width:60% 导致盒子比视频宽，己方消息的状态图标/头像侧出现大空隙 */
}

.video-message--self {
  /* 盒子本身推到行右边缘贴住头像（margin-left:auto 对块级/flex 容器都生效）；
     仅 justify-content 只能在盒子内部对齐 */
  margin-left: auto;
  justify-content: flex-end;
}

.video-message__container {
  position: relative;
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
}

.video-message__video {
  /* 尺寸由容器按消息体 width/height 预留（displaySize），视频填满容器 */
  width: 100%;
  height: 100%;
  border-radius: 12px;
  object-fit: cover;
  display: block;
}

.video-message__video--square {
  border-radius: 4px;
}

.video-message__placeholder {
  padding: 10px 14px;
  border-radius: 12px;
  background-color: var(--uikit-bubble-bg-other);
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-bubble-text-other);
}

.video-message__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.2);
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}


@media (hover: hover) {
  .video-message__container:hover .video-message__overlay {
    background-color: rgba(0, 0, 0, 0.35);
  }
}

.video-message__play-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.6);
  color: var(--uikit-text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-message__duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.6);
  color: var(--uikit-text-inverse);
  font-size: var(--uikit-font-size-12);
}

/* 全屏预览 */
.video-message__preview {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-message__preview-video {
  max-width: 90vw;
  max-height: 90vh;
  border-radius: 8px;
}

/* 预览层下载按钮 */
.video-message__download-btn {
  position: absolute;
  bottom: 24px;
  right: 24px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.5);
  color: var(--uikit-text-inverse);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
  z-index: 3001;
}

@media (hover: hover) {
  .video-message__download-btn:hover {
    background-color: rgba(0, 0, 0, 0.7);
  }
}
</style>
