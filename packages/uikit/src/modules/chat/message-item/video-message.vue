<script setup lang="ts">
import { computed, ref } from 'vue'
import { useThemeStore } from '../../../store/theme'
import { useLocale } from '../../../locale'
import { useToast } from '../../../composables/use-toast'
import Icon from '../../../components/icon/icon.vue'
import { detectEnvironment, downloadFile } from '../../../utils/download'
import type { UiMessage, VideoMessageBody } from '../../../sdk/types'

export interface VideoMessageProps {
  message: UiMessage
}

const props = defineProps<VideoMessageProps>()

const themeStore = useThemeStore()
const { t } = useLocale()
const { show: showToast } = useToast()
const videoClass = computed(() =>
  themeStore.bubbleShape === 'square' ? 'video-message__video--square' : '',
)

const body = computed(() => props.message.body as VideoMessageBody)

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
    showToast(t('message.download.failed') || '下载失败', 'error')
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
        showToast(t('message.download.success') || '下载成功', 'success')
      },
      onError: (err) => {
        if (err.name === 'WechatNotSupported') {
          showToast(t('message.download.wechatHint') || '请在浏览器中打开以下载文件', 'warning')
        }
        else {
          showToast(t('message.download.failed') || '下载失败', 'error')
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
    <div class="video-message__container" @click="openPreview">
      <video
        v-if="body.url"
        :src="body.url"
        class="video-message__video"
        :class="videoClass"
        preload="metadata"
      />
      <div v-else class="video-message__placeholder" :class="videoClass">
        {{ t('message.video') || '[视频]' }}
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
        :title="t('message.download.success') || '下载'"
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
  max-width: 60%;
}

.video-message--self {
  justify-content: flex-end;
}

.video-message__container {
  position: relative;
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
}

.video-message__video {
  max-width: 100%;
  max-height: 240px;
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
  transition: background-color 0.2s;
}

.video-message__container:hover .video-message__overlay {
  background-color: rgba(0, 0, 0, 0.35);
}

.video-message__play-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
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
  color: #fff;
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
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  z-index: 3001;
}

.video-message__download-btn:hover {
  background-color: rgba(0, 0, 0, 0.7);
}
</style>
