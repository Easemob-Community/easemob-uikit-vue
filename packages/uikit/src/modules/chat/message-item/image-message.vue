<script setup lang="ts">
import { computed, ref } from 'vue'
import { useThemeStore } from '../../../store/theme'
import type { ImgMessageType } from '../../../store/message'

export interface ImageMessageProps {
  message: ImgMessageType
}

const props = defineProps<ImageMessageProps>()

const themeStore = useThemeStore()

/** 图片展示最大约束 */
const MAX_WIDTH = 240
const MAX_HEIGHT = 240

/** 根据消息体 width/height 等比计算展示尺寸 */
const displaySize = computed(() => {
  const w = (props.message as any).width as number | undefined
  const h = (props.message as any).height as number | undefined
  if (!w || !h || w <= 0 || h <= 0) {
    return { width: 160, height: 120 } // 无宽高信息时的默认占位
  }
  const ratio = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h, 1)
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  }
})

/** 展示用图片 URL：己方展示原图（本地 objectURL），对方优先缩略图 */
const displayUrl = computed(() => {
  const msg = props.message as any
  if (msg.isSelf) {
    return msg.url || msg.thumb || ''
  }
  return msg.thumb || msg.url || ''
})

/** 原图 URL（用于预览） */
const originalUrl = computed(() => (props.message as any).url || '')

/** 圆角 class */
const radiusClass = computed(() =>
  themeStore.bubbleShape === 'square' ? 'image-message__img--square' : ''
)

/** 图片加载状态 */
const isLoaded = ref(false)
const isError = ref(false)

function onLoad() {
  isLoaded.value = true
}

function onError() {
  isError.value = true
}

/** 全屏预览 */
const isPreviewing = ref(false)

function openPreview() {
  if (originalUrl.value) {
    isPreviewing.value = true
  }
}

function closePreview() {
  isPreviewing.value = false
}
</script>

<template>
  <div class="image-message" :class="{ 'image-message--self': props.message.isSelf }">
    <!-- 有图片 URL 时 -->
    <div
      v-if="displayUrl"
      class="image-message__container"
      :class="radiusClass"
      :style="{ width: displaySize.width + 'px', height: displaySize.height + 'px' }"
      @click="openPreview"
    >
      <!-- 加载中占位 -->
      <div v-if="!isLoaded && !isError" class="image-message__loading" :class="radiusClass" />
      <!-- 图片 -->
      <img
        :src="displayUrl"
        class="image-message__img"
        :class="radiusClass"
        alt="image"
        @load="onLoad"
        @error="onError"
      />
      <!-- 加载失败 -->
      <div v-if="isError" class="image-message__error" :class="radiusClass">[图片加载失败]</div>
    </div>

    <!-- 无图片 URL -->
    <div v-else class="image-message__placeholder" :class="radiusClass">[图片]</div>

    <!-- 全屏预览浮层 -->
    <div
      v-if="isPreviewing && originalUrl"
      class="image-message__preview"
      @click="closePreview"
    >
      <img
        :src="originalUrl"
        class="image-message__preview-img"
        alt="preview"
        @click.stop
      />
    </div>
  </div>
</template>

<style scoped>
.image-message {
  display: flex;
}

.image-message--self {
  margin-left: auto;
}

.image-message__container {
  position: relative;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.image-message__loading {
  position: absolute;
  inset: 0;
  background-color: var(--uikit-bg-secondary);
  animation: image-loading-pulse 1.5s ease-in-out infinite;
}

.image-message__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 8px;
}

.image-message__img--square {
  border-radius: 4px;
}

.image-message__error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--uikit-bg-secondary);
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

.image-message__placeholder {
  padding: 10px 14px;
  border-radius: 12px;
  background-color: var(--uikit-bg-secondary);
  font-size: 14px;
  color: var(--uikit-text-secondary);
}

/* 全屏预览 */
.image-message__preview {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-message__preview-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
}

@keyframes image-loading-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.3; }
}
</style>
