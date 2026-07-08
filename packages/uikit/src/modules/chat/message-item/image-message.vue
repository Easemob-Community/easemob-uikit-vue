<script setup lang="ts">
import { computed, ref } from 'vue'
import { useThemeStore } from '../../../store/theme'
import { useLocale } from '../../../locale'
import { useToast } from '../../../composables/use-toast'
import Icon from '../../../components/icon/icon.vue'
import { detectEnvironment, downloadFile } from '../../../utils/download'
import type { ImageMessageBody, UiMessage } from '../../../sdk/types'

export interface ImageMessageProps {
  message: UiMessage
}

const props = defineProps<ImageMessageProps>()

const themeStore = useThemeStore()
const { t } = useLocale()
const { show: showToast } = useToast()

/** 图片展示最大约束 */
const MAX_WIDTH = 240
const MAX_HEIGHT = 240

/** 根据消息体 width/height 等比计算展示尺寸 */
const displaySize = computed(() => {
  const w = (props.message.body as ImageMessageBody).width
  const h = (props.message.body as ImageMessageBody).height
  if (!w || !h || w <= 0 || h <= 0) {
    return { width: 160, height: 120 }
  }
  const ratio = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h, 1)
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  }
})

/** 展示用图片 URL：己方展示原图（本地 objectURL），对方优先缩略图 */
const displayUrl = computed(() => {
  const body = props.message.body as ImageMessageBody
  if (props.message.isSelf) {
    return body.localUrl || body.originalImageUrl || body.thumbnailUrl || ''
  }
  return body.thumbnailUrl || body.originalImageUrl || body.localUrl || ''
})

/** 原图 URL（用于预览） */
const originalUrl = computed(() => (props.message.body as ImageMessageBody).localUrl || (props.message.body as ImageMessageBody).originalImageUrl || '')

/** 圆角 class */
const radiusClass = computed(() =>
  themeStore.bubbleShape === 'square' ? 'image-message__img--square' : '',
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

/** 缩放比例 */
const scale = ref(1)
/** 平移 X */
const translateX = ref(0)
/** 平移 Y */
const translateY = ref(0)

/** 双指初始距离 */
let initialPinchDistance = 0
/** 双指缩放起始值 */
let pinchStartScale = 1
/** 单指拖拽起始位 */
let dragStartX = 0
let dragStartY = 0
let dragStartTranslateX = 0
let dragStartTranslateY = 0
/** 判断是拖拽还是双指缩放 */
let isPinching = false

function openPreview() {
  if (originalUrl.value) {
    isPreviewing.value = true
    resetZoom()
  }
}

function closePreview() {
  isPreviewing.value = false
  resetZoom()
}

function resetZoom() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

/** 获取两指间距 */
function getTouchDistance(e: TouchEvent): number {
  const dx = e.touches[0].clientX - e.touches[1].clientX
  const dy = e.touches[0].clientY - e.touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function onPreviewTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    // 双指缩放开始
    isPinching = true
    initialPinchDistance = getTouchDistance(e)
    pinchStartScale = scale.value
  }
  else if (e.touches.length === 1) {
    // 单指拖拽
    isPinching = false
    dragStartX = e.touches[0].clientX
    dragStartY = e.touches[0].clientY
    dragStartTranslateX = translateX.value
    dragStartTranslateY = translateY.value
  }
}

function onPreviewTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (e.touches.length === 2) {
    // 双指缩放
    isPinching = true
    const currentDistance = getTouchDistance(e)
    if (initialPinchDistance > 0) {
      const ratio = currentDistance / initialPinchDistance
      const newScale = Math.max(1, Math.min(5, pinchStartScale * ratio))
      scale.value = newScale
    }
  }
  else if (e.touches.length === 1 && !isPinching && scale.value > 1) {
    // 单指拖拽（仅放大后可拖拽）
    const dx = e.touches[0].clientX - dragStartX
    const dy = e.touches[0].clientY - dragStartY
    translateX.value = dragStartTranslateX + dx
    translateY.value = dragStartTranslateY + dy
  }
}

function onPreviewTouchEnd(e: TouchEvent) {
  // 从双指缩放切换到单指拖拽时，重新捕获拖拽起点，避免位置跳变
  if (isPinching && e.touches.length === 1) {
    isPinching = false
    dragStartX = e.touches[0].clientX
    dragStartY = e.touches[0].clientY
    dragStartTranslateX = translateX.value
    dragStartTranslateY = translateY.value
    return
  }
  isPinching = false
}

/** 双击切换缩放 */
let lastTapTime = 0
function onPreviewImageClick(e: MouseEvent) {
  e.stopPropagation()
  const now = Date.now()
  if (now - lastTapTime < 300) {
    // 双击：在 1x 和 2x 间切换
    if (scale.value > 1.5) {
      resetZoom()
    }
    else {
      scale.value = 2
      translateX.value = 0
      translateY.value = 0
    }
    lastTapTime = 0
  }
  else {
    lastTapTime = now
  }
}

/** 下载原图 */
async function handleDownload(event: MouseEvent) {
  event.stopPropagation()
  const url = originalUrl.value
  if (!url) {
    showToast(t('message.download.failed') || '下载失败')
    return
  }

  const env = detectEnvironment()
  const filename = (props.message.body as ImageMessageBody).filename || 'image.jpg'

  try {
    await downloadFile({
      url,
      filename,
      env,
      onSuccess: () => {
        showToast(t('message.download.success') || '下载成功')
      },
      onError: (err) => {
        if (err.name === 'WechatNotSupported') {
          showToast(t('message.download.wechatHint') || '请在浏览器中打开以下载文件')
        }
        else {
          showToast(t('message.download.failed') || '下载失败')
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
  <div class="image-message" :class="{ 'image-message--self': props.message.isSelf }">
    <!-- 有图片 URL 时 -->
    <div
      v-if="displayUrl"
      class="image-message__container"
      :class="radiusClass"
      :style="{ width: `${displaySize.width}px`, height: `${displaySize.height}px` }"
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
      >
      <!-- 加载失败 -->
      <div v-if="isError" class="image-message__error" :class="radiusClass">
        [图片加载失败]
      </div>
    </div>

    <!-- 无图片 URL -->
    <div v-else class="image-message__placeholder" :class="radiusClass">
      [图片]
    </div>

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
        :style="{
          transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
          cursor: scale > 1 ? 'grab' : 'default',
        }"
        @touchstart="onPreviewTouchStart"
        @touchmove.prevent="onPreviewTouchMove"
        @touchend="onPreviewTouchEnd"
        @click="onPreviewImageClick"
      >
      <!-- 下载按钮 -->
      <button
        class="image-message__download-btn"
        :title="t('message.download.success') || '下载'"
        @click.stop="handleDownload"
      >
        <Icon name="arrows/arrow_down_n_box" :size="20" />
      </button>
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

/* 预览层下载按钮 */
.image-message__download-btn {
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

.image-message__download-btn:hover {
  background-color: rgba(0, 0, 0, 0.7);
}

@keyframes image-loading-pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
