<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import Icon from '../icon/icon.vue'
import { useLocale } from '../../locale'
import { useKeyBindings } from '../../composables/use-key-bindings'
import { useToast } from '../../composables/use-toast'
import { nextZIndex } from '../../utils/z-index'
import { detectEnvironment, downloadFile } from '../../utils/download'

export interface ImageViewerProps {
  /** 图片 URL 列表（多图相册） */
  srcs: string[]
  /** 当前展示索引（v-model:index） */
  index?: number
  /** 是否显示（v-model:show 受控） */
  show?: boolean
  /** 是否显示工具栏（缩放/旋转/适应屏/下载） */
  showToolbar?: boolean
  /** 是否显示多图切换箭头与索引指示 */
  showNavigator?: boolean
  /** 点击遮罩是否关闭 */
  closeOnClickOverlay?: boolean
}

export interface ImageViewerEmits {
  /** 关闭预览时触发（点击遮罩/ESC），负载 false，供 v-model:show 双向同步 */
  (e: 'update:show', value: boolean): void
  /** 当前图片索引变化时触发（打开/切换上下一张），负载为新索引，供 v-model:index 双向同步 */
  (e: 'update:index', value: number): void
  /** 预览关闭完成时触发，与 update:show(false) 同时发出，供业务侧感知关闭 */
  (e: 'close'): void
  /** 当前图片加载完成 */
  (e: 'load', index: number): void
  /** 当前图片加载失败（业务侧可据此做降级切换） */
  (e: 'load-error', index: number): void
  /** 下载动作触发（组件内部执行下载，事件供业务感知） */
  (e: 'download', url: string, index: number): void
}

const props = withDefaults(defineProps<ImageViewerProps>(), {
  index: 0,
  show: false,
  showToolbar: true,
  showNavigator: true,
  closeOnClickOverlay: true,
})

const emit = defineEmits<ImageViewerEmits>()
const { t } = useLocale()
const { show: showToast } = useToast()

/** 内部显示状态（受控于 props.show） */
const visible = ref(props.show)
/** 实际 z-index：打开时从全局分配器取递增 */
const zIndex = ref(2000)

watch(() => props.show, (v) => {
  visible.value = v
  if (v)
    onOpen()
})

/** 当前索引（与 props.index 双向同步） */
const currentIndex = ref(Math.min(props.index, Math.max(props.srcs.length - 1, 0)))

watch(() => props.index, (v) => {
  if (v !== currentIndex.value) {
    currentIndex.value = v
    resetViewState()
  }
})

watch(currentIndex, (v) => {
  emit('update:index', v)
  resetViewState()
})

const currentSrc = computed(() => props.srcs[currentIndex.value] ?? '')

/** 图片加载状态 */
const isLoaded = ref(false)
const isError = ref(false)

/** 缩放比例（1~5） */
const scale = ref(1)
/** 平移 X / Y（放大后可拖拽） */
const translateX = ref(0)
const translateY = ref(0)
/** 旋转角度（90° 步进） */
const rotation = ref(0)

/** 双指初始距离与起始缩放 */
let initialPinchDistance = 0
let pinchStartScale = 1
/** 拖拽起始位（touch / mouse 共用） */
let dragStartX = 0
let dragStartY = 0
let dragStartTranslateX = 0
let dragStartTranslateY = 0
/** 是否双指缩放中 / 是否拖拽中 */
let isPinching = false
const isDragging = ref(false)
/** 触摸手势进行中（缩放/拖拽期间禁用 transform 过渡，避免跟手滞后） */
const isGesturing = ref(false)

const isLoading = computed(() => !isLoaded.value && !isError.value)

const transformStyle = computed(() =>
  `rotate(${rotation.value}deg) scale(${scale.value}) translate(${translateX.value / scale.value}px, ${translateY.value / scale.value}px)`,
)

/** 打开预览：重置视图与加载状态 */
function onOpen() {
  zIndex.value = nextZIndex()
  currentIndex.value = Math.min(props.index, Math.max(props.srcs.length - 1, 0))
  resetViewState()
}

/** 重置缩放/旋转/加载状态（打开、切图时调用） */
function resetViewState() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
  rotation.value = 0
  isLoaded.value = false
  isError.value = false
  isPinching = false
  isDragging.value = false
  isGesturing.value = false
}

/** 关闭预览 */
function close() {
  visible.value = false
  emit('update:show', false)
  emit('close')
}

function onOverlayClick() {
  if (props.closeOnClickOverlay)
    close()
}

function onImgLoad() {
  isLoaded.value = true
  emit('load', currentIndex.value)
}

function onImgError() {
  isError.value = true
  emit('load-error', currentIndex.value)
}

/** 双击缩放：在 1x 与 2x 间切换 */
function onDblClick() {
  if (scale.value > 1.5) {
    resetViewState()
  }
  else {
    scale.value = 2
    translateX.value = 0
    translateY.value = 0
  }
}

/** 滚轮缩放（桌面端，以图片中心为锚，0.5~5 倍） */
function onWheel(e: WheelEvent) {
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
  applyScale(scale.value * factor)
}

/** 更新缩放并等比例修正平移，保证缩放锚点保持在图片中心 */
function applyScale(nextScale: number) {
  const clamped = Math.max(1, Math.min(5, nextScale))
  const ratio = clamped / scale.value
  scale.value = clamped
  translateX.value *= ratio
  translateY.value *= ratio
}

function getTouchDistance(e: TouchEvent): number {
  const dx = e.touches[0].clientX - e.touches[1].clientX
  const dy = e.touches[0].clientY - e.touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function onTouchStart(e: TouchEvent) {
  isGesturing.value = true
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

function onTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (e.touches.length === 2) {
    // 双指缩放
    isPinching = true
    const currentDistance = getTouchDistance(e)
    if (initialPinchDistance > 0) {
      applyScale(pinchStartScale * currentDistance / initialPinchDistance)
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

function onTouchEnd(e: TouchEvent) {
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
  isGesturing.value = false
}

/** 鼠标拖拽（桌面端，仅放大后可拖） */
function onMouseDown(e: MouseEvent) {
  if (scale.value <= 1)
    return
  e.preventDefault()
  isDragging.value = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartTranslateX = translateX.value
  dragStartTranslateY = translateY.value
}

useEventListener(window, 'mousemove', (e: MouseEvent) => {
  if (!isDragging.value)
    return
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY
  translateX.value = dragStartTranslateX + dx
  translateY.value = dragStartTranslateY + dy
})

useEventListener(window, 'mouseup', () => {
  isDragging.value = false
})

/** 键盘操作：ESC 关闭，←/→ 切图（仅多图）；active 由展示状态控制，关闭时不监听 */
useKeyBindings({
  Escape: close,
  ArrowLeft: () => {
    if (props.showNavigator)
      goPrev()
  },
  ArrowRight: () => {
    if (props.showNavigator)
      goNext()
  },
}, { active: visible })

function goPrev() {
  if (props.srcs.length <= 1)
    return
  currentIndex.value = (currentIndex.value - 1 + props.srcs.length) % props.srcs.length
}

function goNext() {
  if (props.srcs.length <= 1)
    return
  currentIndex.value = (currentIndex.value + 1) % props.srcs.length
}

/** 工具栏操作 */
function zoomIn() {
  applyScale(scale.value + 0.5)
}

function zoomOut() {
  applyScale(scale.value - 0.5)
}

/** 视图是否处于初始态（未缩放/未偏移/未旋转），决定「适应屏幕」是否可用 */
const isViewReset = computed(() =>
  scale.value <= 1 && translateX.value === 0 && translateY.value === 0 && rotation.value % 360 === 0,
)

/** 「适应屏幕」按钮提示：禁用时说明已是最佳视图，避免不可点但无解释 */
const resetTooltip = computed(() =>
  isViewReset.value
    ? t('imageViewer.fitted', '已在适应屏幕状态')
    : t('imageViewer.reset', '适应屏幕'),
)

/** 工具栏：适应屏幕（重置缩放/平移/旋转到初始态） */
function resetView() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
  rotation.value = 0
}

function rotateLeft() {
  rotation.value = (rotation.value - 90) % 360
}

function rotateRight() {
  rotation.value = (rotation.value + 90) % 360
}

/** 下载当前图片（文件名从 URL 提取） */
async function handleDownload() {
  const url = currentSrc.value
  if (!url) {
    showToast(t('message.download.failed', '下载失败'), 'error')
    return
  }
  emit('download', url, currentIndex.value)

  const filename = decodeURIComponent(url.split('/').pop()?.split('?')[0] || '') || `image-${currentIndex.value + 1}.jpg`
  const env = detectEnvironment()

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
  <div
    v-if="visible"
    class="image-viewer"
    :style="{ zIndex }"
    @click="onOverlayClick"
    @wheel.prevent="onWheel"
  >
    <img
      :key="currentIndex"
      :src="currentSrc"
      class="image-viewer__img"
      :style="{ transform: transformStyle }"
      :class="{
        'image-viewer__img--dragging': isDragging,
        'image-viewer__img--no-transition': isDragging || isGesturing,
      }"
      alt="preview"
      draggable="false"
      @load="onImgLoad"
      @error="onImgError"
      @click.stop
      @dblclick="onDblClick"
      @touchstart.passive="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
      @mousedown="onMouseDown"
    >

    <!-- 加载中（首屏/切换原图） -->
    <div v-if="isLoading" class="image-viewer__loading">
      <Icon name="actions/loading_arc" :size="40" class="image-viewer__spinner" anim="spin" />
    </div>
    <!-- 加载失败占位 -->
    <div v-else-if="isError" class="image-viewer__failed">
      <Icon name="status/warning" :size="36" />
      <span>{{ t('imageViewer.loadFailed', '图片加载失败') }}</span>
    </div>

    <!-- 多图切换箭头 -->
    <button
      v-if="showNavigator && srcs.length > 1"
      class="image-viewer__nav image-viewer__nav--prev"
      @click.stop="goPrev"
    >
      <Icon name="navigation/chevron_left" :size="28" />
    </button>
    <button
      v-if="showNavigator && srcs.length > 1"
      class="image-viewer__nav image-viewer__nav--next"
      @click.stop="goNext"
    >
      <Icon name="navigation/chevron_right" :size="28" />
    </button>

    <!-- 底部插槽：业务侧放大图/原图切换按钮；默认显示索引指示器 -->
    <div class="image-viewer__footer" @click.stop>
      <slot name="footer" :index="currentIndex" :loading="isLoading" :error="isError">
        <span v-if="showNavigator && srcs.length > 1" class="image-viewer__counter">
          {{ currentIndex + 1 }} / {{ srcs.length }}
        </span>
      </slot>
    </div>

    <!-- 工具栏：缩放/旋转/适应屏/下载 -->
    <div v-if="showToolbar" class="image-viewer__toolbar" @click.stop>
      <button
        class="image-viewer__tool-btn"
        :title="t('imageViewer.zoomOut', '缩小')"
        :disabled="scale <= 1"
        @click="zoomOut"
      >
        <Icon name="actions/zoom_out" :size="18" />
      </button>
      <button
        class="image-viewer__tool-btn"
        :title="t('imageViewer.zoomIn', '放大')"
        :disabled="scale >= 5"
        @click="zoomIn"
      >
        <Icon name="actions/zoom_in" :size="18" />
      </button>
      <button
        class="image-viewer__tool-btn"
        :title="resetTooltip"
        :disabled="isViewReset"
        @click="resetView"
      >
        <Icon name="actions/reset" :size="18" />
      </button>
      <button
        class="image-viewer__tool-btn"
        :title="t('imageViewer.rotateLeft', '向左旋转')"
        @click="rotateLeft"
      >
        <Icon name="actions/rotate_left" :size="18" />
      </button>
      <button
        class="image-viewer__tool-btn"
        :title="t('imageViewer.rotateRight', '向右旋转')"
        @click="rotateRight"
      >
        <Icon name="actions/rotate_right" :size="18" />
      </button>
      <button
        class="image-viewer__tool-btn"
        :title="t('imageViewer.download', '下载')"
        @click="handleDownload"
      >
        <Icon name="arrows/arrow_down_n_box" :size="18" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.image-viewer {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image-viewer__img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
  user-select: none;
  -webkit-user-drag: none;
  transition: transform var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.image-viewer__img--dragging {
  cursor: grabbing;
}

.image-viewer__img--no-transition {
  transition: none;
}

.image-viewer__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.image-viewer__spinner {
  color: var(--uikit-text-inverse);
}

.image-viewer__failed {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--uikit-text-inverse);
  font-size: var(--uikit-font-size-14);
  pointer-events: none;
}

.image-viewer__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
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
}

.image-viewer__nav--prev {
  left: 16px;
}

.image-viewer__nav--next {
  right: 16px;
}

@media (hover: hover) {
  .image-viewer__nav:hover {
    background-color: rgba(0, 0, 0, 0.7);
  }
}

.image-viewer__footer {
  position: absolute;
  bottom: calc(88px + var(--uikit-safe-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.image-viewer__counter {
  padding: 6px 14px;
  border-radius: 16px;
  background-color: rgba(0, 0, 0, 0.55);
  color: var(--uikit-text-inverse);
  font-size: var(--uikit-font-size-12);
  pointer-events: none;
}

.image-viewer__toolbar {
  position: absolute;
  bottom: calc(24px + var(--uikit-safe-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 24px;
  background-color: rgba(0, 0, 0, 0.5);
}

.image-viewer__tool-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: transparent;
  color: var(--uikit-text-inverse);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.image-viewer__tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (hover: hover) {
  .image-viewer__tool-btn:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.15);
  }
}
</style>
