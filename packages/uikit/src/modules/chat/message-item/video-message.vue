<script setup lang="ts">
import { computed, ref } from 'vue'
import { useThemeStore } from '../../../store/theme'
import { useLocale } from '../../../locale'
import type { VideoMessageType } from '../../../store/message'

export interface VideoMessageProps {
  message: VideoMessageType
}

const props = defineProps<VideoMessageProps>()

const themeStore = useThemeStore()
const { t } = useLocale()
const videoClass = computed(() =>
  themeStore.bubbleShape === 'square' ? 'video-message__video--square' : ''
)

/** 是否正在预览 */
const isPreviewing = ref(false)

function openPreview() {
  isPreviewing.value = true
}

function closePreview() {
  isPreviewing.value = false
}
</script>

<template>
  <div class="video-message" :class="{ 'video-message--self': props.message.isSelf }">
    <div class="video-message__container" @click="openPreview">
      <video
        v-if="props.message.url"
        :src="props.message.url"
        class="video-message__video"
        :class="videoClass"
        preload="metadata"
      />
      <div v-else class="video-message__placeholder" :class="videoClass">
        {{ t('message.video') || '[视频]' }}
      </div>
      <!-- 播放按钮覆盖层 -->
      <div class="video-message__overlay">
        <div class="video-message__play-btn">&#9658;</div>
      </div>
      <!-- 时长标签 -->
      <div v-if="props.message.length" class="video-message__duration">
        {{ Math.floor(props.message.length / 60) }}:{{ String(props.message.length % 60).padStart(2, '0') }}
      </div>
    </div>

    <!-- 全屏预览 -->
    <div
      v-if="isPreviewing && props.message.url"
      class="video-message__preview"
      @click="closePreview"
    >
      <video
        :src="props.message.url"
        class="video-message__preview-video"
        controls
        autoplay
        @click.stop
      />
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
  background-color: var(--uikit-bg-secondary);
  font-size: 14px;
  color: var(--uikit-text-secondary);
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
  font-size: 16px;
  padding-left: 4px;
}

.video-message__duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 12px;
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
</style>
