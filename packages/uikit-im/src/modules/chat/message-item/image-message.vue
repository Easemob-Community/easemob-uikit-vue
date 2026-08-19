<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { ComputedRef } from 'vue'
import { useThemeStore } from '@easemob/uikit-core'
import { INJECTION_KEY } from '@easemob/uikit-core'
import { MESSAGE_EXT_KEY } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { EmImageViewer as ImageViewer } from '@easemob/uikit-core'
import type { ImageMessageBody, UiMessage } from '@easemob/uikit-core'
import type { BubbleShape } from '../types'

export interface ImageMessageProps {
  message: UiMessage
}

const props = defineProps<ImageMessageProps>()

const themeStore = useThemeStore()
const { t } = useLocale()

/** 图片展示最大约束 */
const MAX_WIDTH = 240
const MAX_HEIGHT = 240
/** 表情包（sticker）展示最大约束（方形小图，透明底不裁切） */
const STICKER_MAX_SIZE = 120

/** 表情包消息：发送侧经 ext.isSticker 标记，按表情渲染，不启用图片三级预览 */
const isSticker = computed(() => props.message.ext?.[MESSAGE_EXT_KEY.IS_STICKER] === true)

/** 根据消息体 width/height 等比计算展示尺寸 */
const displaySize = computed(() => {
  const w = (props.message.body as ImageMessageBody).width
  const h = (props.message.body as ImageMessageBody).height
  const maxW = isSticker.value ? STICKER_MAX_SIZE : MAX_WIDTH
  const maxH = isSticker.value ? STICKER_MAX_SIZE : MAX_HEIGHT
  if (!w || !h || w <= 0 || h <= 0) {
    return isSticker.value
      ? { width: STICKER_MAX_SIZE, height: STICKER_MAX_SIZE }
      : { width: 160, height: 120 }
  }
  const ratio = Math.min(maxW / w, maxH / h, 1)
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  }
})

/**
 * 展示用图片 URL（三级策略：气泡缩略图 → 点击大图 → 点击原图）。
 * 气泡统一优先缩略图（thumbnailUrl 最小图），缺缩略图时回退本地图（己方发送中），
 * 最后才回退大图/原图，避免气泡直接拉大图流量。
 */
const displayUrl = computed(() => {
  const body = props.message.body as ImageMessageBody
  return body.thumbnailUrl || body.localUrl || body.bigImageUrl || body.originalImageUrl || ''
})

/** 大图 URL（点击气泡后首屏展示：优先 bigImageUrl 大图，己方发送中回退本地图，最后原图兜底） */
const bigUrl = computed(() => {
  const body = props.message.body as ImageMessageBody
  return body.bigImageUrl || body.localUrl || body.originalImageUrl || ''
})

/** 原图 URL（用于预览高清/下载） */
const originalUrl = computed(() => (props.message.body as ImageMessageBody).localUrl || (props.message.body as ImageMessageBody).originalImageUrl || '')

/** 圆角 class：config.messageList.bubbleShape 优先，未配置回落主题全局 bubbleShape（message-bubble-wrapper provide） */
const injectedBubbleShape = inject<ComputedRef<BubbleShape | undefined>>(INJECTION_KEY.BUBBLE_SHAPE, computed(() => undefined))
const radiusClass = computed(() =>
  (injectedBubbleShape.value ?? themeStore.bubbleShape) === 'square'
    ? 'image-message__img--square'
    : '',
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

/** 全屏预览（EmImageViewer 受控） */
const isPreviewing = ref(false)
/** 预览索引：0=大图，1=原图 */
const previewIndex = ref(0)

/** 预览图片列表：大图 → 原图（同图双分辨率，供 EmImageViewer 展示与加载状态上报） */
const previewSrcs = computed(() => {
  const list = [bigUrl.value, originalUrl.value].filter(Boolean) as string[]
  return list.length > 1 && list[0] === list[1] ? [list[0]] : list
})

/** 已触发过失败降级的索引（防止大图/原图失败互跳死循环） */
const degradedIndexes = ref<Set<number>>(new Set())

function openPreview() {
  // 表情包是表情不是图片：不启用图片三级预览
  if (isSticker.value)
    return
  if (previewSrcs.value.length === 0)
    return
  previewIndex.value = 0
  degradedIndexes.value.clear()
  isPreviewing.value = true
}

/** 升级到原图（大图阶段底部按钮触发） */
function upgradeToOriginal() {
  if (previewIndex.value !== 0 || previewSrcs.value.length <= 1)
    return
  previewIndex.value = 1
}

/** 切回大图（原图阶段底部按钮触发，与"查看原图"形成 toggle） */
function backToBig() {
  if (previewIndex.value !== 1)
    return
  previewIndex.value = 0
}

/**
 * 预览图片加载失败：大图失败自动升原图；原图失败回退大图；
 * 同一索引已降级过一次则停止互跳，避免死循环。
 */
function onPreviewError(index: number) {
  if (degradedIndexes.value.has(index))
    return
  degradedIndexes.value.add(index)
  if (index === 0 && previewSrcs.value.length > 1)
    previewIndex.value = 1
  else if (index === 1 && previewSrcs.value.length > 1)
    previewIndex.value = 0
}
</script>

<template>
  <div class="image-message" :class="{ 'image-message--self': props.message.isSelf }">
    <!-- 有图片 URL 时（sticker 表情透明底不裁切、无圆角、点击不预览） -->
    <div
      v-if="displayUrl"
      class="image-message__container"
      :class="isSticker ? 'image-message__container--sticker' : radiusClass"
      :style="{ width: `${displaySize.width}px`, height: `${displaySize.height}px` }"
      @click="openPreview"
    >
      <!-- 加载中占位 -->
      <div v-if="!isLoaded && !isError && !isSticker" class="image-message__loading" :class="radiusClass" />
      <!-- 图片 -->
      <img
        :src="displayUrl"
        class="image-message__img"
        :class="isSticker ? 'image-message__img--sticker' : radiusClass"
        alt="image"
        @load="onLoad"
        @error="onError"
      >
      <!-- 加载失败 -->
      <div v-if="isError" class="image-message__error" :class="isSticker ? '' : radiusClass">
        {{ t('message.image.loadFailed', '[图片加载失败]') }}
      </div>
    </div>

    <!-- 无图片 URL -->
    <div v-else class="image-message__placeholder" :class="radiusClass">
      {{ t('message.image', '[图片]') }}
    </div>

    <!-- 全屏预览（缩放/旋转/loading/下载由 EmImageViewer 提供，大图/原图切换走底部按钮；sticker 不预览） -->
    <ImageViewer
      v-if="!isSticker"
      v-model:show="isPreviewing"
      v-model:index="previewIndex"
      :srcs="previewSrcs"
      :show-navigator="false"
      @load-error="onPreviewError"
    >
      <template #footer="{ index: viewIndex, loading }">
        <!-- 大图阶段 → 点击查看原图 -->
        <button
          v-if="viewIndex === 0 && previewSrcs.length > 1 && !loading"
          class="image-message__preview-toggle"
          @click="upgradeToOriginal"
        >
          {{ t('message.image.viewOriginal', '查看原图') }}
        </button>
        <!-- 原图加载中提示 -->
        <div v-else-if="viewIndex === 1 && loading" class="image-message__preview-tip">
          {{ t('message.image.loadingOriginal', '加载原图中…') }}
        </div>
        <!-- 原图已展示 → 点击切回大图 -->
        <button
          v-else-if="viewIndex === 1 && !loading"
          class="image-message__preview-toggle"
          @click="backToBig"
        >
          {{ t('message.image.viewBig', '查看大图') }}
        </button>
      </template>
    </ImageViewer>
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

/* sticker 表情：透明底、不裁切、无圆角、无点击态 */
.image-message__container--sticker {
  cursor: default;
  border-radius: 0;
  overflow: visible;
  background-color: transparent;
}

.image-message__img--sticker {
  object-fit: contain;
  border-radius: 0;
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

/* 预览层底部切换按钮/提示（位置由 EmImageViewer 的 footer 容器统一控制） */
.image-message__preview-toggle {
  padding: 6px 14px;
  border-radius: 16px;
  background-color: rgba(0, 0, 0, 0.55);
  color: var(--uikit-text-inverse);
  font-size: var(--uikit-font-size-12);
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .image-message__preview-toggle:hover {
    background-color: rgba(0, 0, 0, 0.75);
  }
}

.image-message__preview-tip {
  padding: 6px 14px;
  border-radius: 16px;
  background-color: rgba(0, 0, 0, 0.55);
  color: var(--uikit-text-inverse);
  font-size: var(--uikit-font-size-12);
  pointer-events: none;
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
