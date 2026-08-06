<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
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

/**
 * 展示用图片 URL（三级策略：气泡最小图 → 点击中图 → 点击原图）。
 * 气泡统一优先缩略图（thumbnailUrl 最小图），缺缩略图时回退本地图（己方发送中），
 * 最后才回退中图/原图，避免气泡直接拉大图流量。
 */
const displayUrl = computed(() => {
  const body = props.message.body as ImageMessageBody
  return body.thumbnailUrl || body.localUrl || body.bigImageUrl || body.originalImageUrl || ''
})

/** 中图 URL（点击气泡后首屏展示：优先 bigImageUrl 中图，己方发送中回退本地图，最后原图兜底） */
const mediumUrl = computed(() => {
  const body = props.message.body as ImageMessageBody
  return body.bigImageUrl || body.localUrl || body.originalImageUrl || ''
})

/** 原图 URL（用于预览高清/下载） */
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

/** 预览当前展示的 URL：先中图秒开，中图加载完成后再切换原图 */
const previewUrl = ref('')
/** 预览图片加载阶段：medium=中图，original=原图 */
const previewStage = ref<'medium' | 'original'>('medium')
/** 中图已显示、原图正在加载中 */
const isUpgradingOriginal = ref(false)
/** 中图首次加载失败标记（避免中图/原图互跳死循环） */
const mediumFailedOnce = ref(false)
/** 预览图片最终加载失败（无可回退资源） */
const previewFailed = ref(false)

/** 是否已展示高清原图（预览右上角"高清"标识） */
const isOriginalShown = computed(
  () => previewStage.value === 'original' && !isUpgradingOriginal.value && !previewFailed.value,
)

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
  if (!mediumUrl.value && !originalUrl.value)
    return
  isPreviewing.value = true
  resetZoom()
  previewStage.value = 'medium'
  isUpgradingOriginal.value = false
  mediumFailedOnce.value = false
  previewFailed.value = false
  // 首屏展示中图（大图压缩版）；原图需手动点击"查看原图"再加载
  previewUrl.value = mediumUrl.value || originalUrl.value
}

function closePreview() {
  isPreviewing.value = false
  resetZoom()
}

/** 切换到原图展示；仅中图阶段且有原图时才生效 */
function upgradeToOriginal(): boolean {
  const orig = originalUrl.value
  if (previewStage.value !== 'medium' || !orig || orig === previewUrl.value)
    return false
  previewStage.value = 'original'
  isUpgradingOriginal.value = true
  previewUrl.value = orig
  return true
}

/** 切回中图展示（原图阶段点击"查看中图"按钮触发，与"查看原图"按钮形成 toggle） */
function backToMedium() {
  if (previewStage.value !== 'original' || isUpgradingOriginal.value)
    return
  const med = mediumUrl.value
  if (!med || med === previewUrl.value)
    return
  previewStage.value = 'medium'
  isUpgradingOriginal.value = false
  previewUrl.value = med
}

/** 预览图片加载完成：中图或原图加载完成即结束加载态 */
function onPreviewImgLoad() {
  previewFailed.value = false
  // 原图加载完成，或中图即最终图（无原图可切换）
  isUpgradingOriginal.value = false
}

/** 预览图片加载失败：中图失败尝试原图；原图失败回退中图；都失败才置失败态 */
function onPreviewImgError() {
  if (previewStage.value === 'medium') {
    if (!mediumFailedOnce.value) {
      mediumFailedOnce.value = true
      if (upgradeToOriginal())
        return
    }
    previewFailed.value = true
    return
  }
  // 原图加载失败：回退到中图继续展示
  if (mediumUrl.value && mediumUrl.value !== previewUrl.value) {
    previewStage.value = 'medium'
    isUpgradingOriginal.value = false
    previewUrl.value = mediumUrl.value
    return
  }
  previewFailed.value = true
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
  // 拖拽/缩放手势开始后取消未决的单击判定，避免误触"查看原图"
  clearSingleTapTimer()
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

/** 双击缩放 + 单击查看原图 */
let lastTapTime = 0
/** 单击判定计时器（300ms 内无第二次点击则视为单击） */
let singleTapTimer: ReturnType<typeof setTimeout> | undefined

function clearSingleTapTimer() {
  if (singleTapTimer) {
    clearTimeout(singleTapTimer)
    singleTapTimer = undefined
  }
}

function onPreviewImageClick(e: MouseEvent) {
  e.stopPropagation()
  const now = Date.now()
  if (now - lastTapTime < 300) {
    // 双击：在 1x 和 2x 间切换
    clearSingleTapTimer()
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
    clearSingleTapTimer()
    // 单击（中图阶段）：300ms 后无第二次点击则切换查看原图
    singleTapTimer = setTimeout(() => {
      singleTapTimer = undefined
      lastTapTime = 0
      upgradeToOriginal()
    }, 300)
  }
}

onBeforeUnmount(() => {
  clearSingleTapTimer()
})

/** 下载原图 */
async function handleDownload(event: MouseEvent) {
  event.stopPropagation()
  const url = originalUrl.value
  if (!url) {
    showToast(t('message.download.failed') || '下载失败', 'error')
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
      v-if="isPreviewing && previewUrl"
      class="image-message__preview"
      @click="closePreview"
    >
      <img
        :src="previewUrl"
        class="image-message__preview-img"
        alt="preview"
        :style="{
          transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
          cursor: scale > 1 ? 'grab' : 'default',
        }"
        @load="onPreviewImgLoad"
        @error="onPreviewImgError"
        @touchstart="onPreviewTouchStart"
        @touchmove.prevent="onPreviewTouchMove"
        @touchend="onPreviewTouchEnd"
        @click="onPreviewImageClick"
      >
      <!-- 底部统一切换入口：中图阶段 → 点击查看原图 -->
      <button
        v-if="previewStage === 'medium' && originalUrl && originalUrl !== previewUrl && !previewFailed"
        class="image-message__preview-toggle"
        @click.stop="upgradeToOriginal"
      >
        查看原图
      </button>
      <!-- 原图加载中提示 -->
      <div v-else-if="isUpgradingOriginal" class="image-message__preview-tip">
        加载原图中…
      </div>
      <!-- 原图已展示 → 点击切回中图 -->
      <button
        v-else-if="isOriginalShown && originalUrl && originalUrl !== mediumUrl"
        class="image-message__preview-toggle"
        @click.stop="backToMedium"
      >
        查看中图
      </button>
      <!-- 图片加载失败占位 -->
      <div v-if="previewFailed" class="image-message__preview-failed">
        图片加载失败
      </div>
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
  background-color: var(--uikit-bubble-bg-other);
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
  background-color: var(--uikit-bubble-bg-other);
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-bubble-text-other);
}

.image-message__placeholder {
  padding: 10px 14px;
  border-radius: 12px;
  background-color: var(--uikit-bubble-bg-other);
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-bubble-text-other);
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

/* 预览层加载高清提示 */
.image-message__preview-tip {
  position: absolute;
  bottom: 88px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: 16px;
  background-color: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: var(--uikit-font-size-12);
  z-index: 3001;
  pointer-events: none;
}

/* 预览层中图/原图切换按钮（底部统一入口，文案直接说明点击结果） */
.image-message__preview-toggle {
  position: absolute;
  bottom: 88px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: 16px;
  background-color: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: var(--uikit-font-size-12);
  z-index: 3001;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s;
}

.image-message__preview-toggle:hover {
  background-color: rgba(0, 0, 0, 0.75);
}

/* 预览层加载失败占位 */
.image-message__preview-failed {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: var(--uikit-font-size-14);
  z-index: 3001;
  pointer-events: none;
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
