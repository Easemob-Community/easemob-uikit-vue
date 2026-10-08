<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Popup from '../popup/popup.vue'
import Icon from '../icon/icon.vue'
import { t } from '../../locale'

export interface ActionSheetItem {
  name: string
  color?: string
  disabled?: boolean
  icon?: string
  /** 分区：'grid' 渲染为顶部高频图标横排（icon tile），'list'（默认）渲染为整行列表项 */
  zone?: 'grid' | 'list'
}

export interface ActionSheetProps {
  /** 是否显示操作面板，控制底部弹层开合；配合 v-model:show 使用 */
  show: boolean
  /** 顶部标题文案，为空时不渲染标题栏 */
  title?: string
  /** 操作项列表，每项渲染为一行可点击操作（zone='grid' 的项收拢到顶部网格区）；disabled 项点击不触发 select */
  actions: ActionSheetItem[]
  /** 底部取消按钮文案，默认取 i18n 的「取消」 */
  cancelText?: string
  /**
   * 是否启用半屏/展开双档拖拽（默认 false）：顶部渲染 drag handle，
   * 半屏档内容上限 50dvh，拖拽 handle 上拉展开到 78dvh（受 EmPopup bottom 80dvh 上限约束），
   * 松手按拖动方向吸附档位，轻点 handle 直接切换档位；展开后列表区纵向滚动。
   */
  expandable?: boolean
}

export interface ActionSheetEmits {
  /** 显隐状态变化时触发（选中操作项 / 取消 / 遮罩关闭均携带 false），用于 v-model:show 同步 */
  (e: 'update:show', value: boolean): void
  /** 点击非禁用操作项时触发，负载为选中项对象与其在 actions 数组中的下标 index */
  (e: 'select', item: ActionSheetItem, index: number): void
  /** 点击底部取消按钮或弹层关闭（如点击遮罩）时触发 */
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<ActionSheetProps>(), {
  title: '',
  cancelText: t('button.cancel', '取消'),
  expandable: false,
})

const emit = defineEmits<ActionSheetEmits>()

/** 携带原始下标的操作项（select 事件的 index 语义 = actions 数组下标，与分区无关） */
interface IndexedActionSheetItem extends ActionSheetItem {
  index: number
}

/** 顶部高频网格区（zone='grid'），保持数组相对顺序 */
const gridItems = computed<IndexedActionSheetItem[]>(() =>
  props.actions.map((item, index) => ({ ...item, index })).filter(item => item.zone === 'grid'),
)

/** 整行列表区（zone 缺省/'list'），保持数组相对顺序 */
const listItems = computed<IndexedActionSheetItem[]>(() =>
  props.actions.map((item, index) => ({ ...item, index })).filter(item => item.zone !== 'grid'),
)

function onSelect(item: IndexedActionSheetItem) {
  if (item.disabled)
    return
  emit('select', item, item.index)
  emit('update:show', false)
}

function onCancel() {
  emit('cancel')
  emit('update:show', false)
}

// ===== 半屏/展开双档拖拽（expandable）=====

/** 半屏档内容高度上限（视口比例） */
const HALF_HEIGHT_RATIO = 0.5
/** 展开档内容高度上限（受 EmPopup bottom 形态 80dvh 上限约束，取 78dvh 留余量） */
const FULL_HEIGHT_RATIO = 0.78
/** 拖动位移小于该值视为轻点（切换档位） */
const TAP_THRESHOLD_PX = 4

/** 当前是否为展开档 */
const expanded = ref(false)
/** 拖拽中的显式 max-height（px），松手后置空交还 CSS 档位驱动 */
const dragMaxHeight = ref<number | null>(null)

const sheetRef = ref<HTMLElement>()

let dragStartY: number | null = null
let dragStartHeight = 0
let dragMoved = false

function halfCapPx() {
  return window.innerHeight * HALF_HEIGHT_RATIO
}

function fullCapPx() {
  return window.innerHeight * FULL_HEIGHT_RATIO
}

function onHandlePointerDown(e: PointerEvent) {
  if (!props.expandable)
    return
  dragMoved = false
  dragStartY = e.clientY
  dragStartHeight = sheetRef.value?.getBoundingClientRect().height ?? 0
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onHandlePointerMove(e: PointerEvent) {
  if (!props.expandable || dragStartY === null)
    return
  const delta = dragStartY - e.clientY
  if (!dragMoved && Math.abs(delta) < TAP_THRESHOLD_PX)
    return
  dragMoved = true
  // 下拖不低于拖动起始高度（半屏档下拖不继续缩小），上拖不超过展开档上限
  const lower = Math.min(dragStartHeight, halfCapPx())
  dragMaxHeight.value = Math.min(Math.max(dragStartHeight + delta, lower), fullCapPx())
}

function onHandlePointerUp() {
  if (dragStartY === null)
    return
  if (!dragMoved) {
    // 轻点 handle：直接切换档位
    expanded.value = !expanded.value
  }
  else if (dragMaxHeight.value !== null) {
    // 方向吸附：上拖展开、下拖收半屏
    expanded.value = dragMaxHeight.value > dragStartHeight
  }
  dragMaxHeight.value = null
  dragStartY = null
  dragMoved = false
}

/** 每次打开回到半屏档并清理拖拽态 */
watch(() => props.show, (v) => {
  if (v) {
    expanded.value = false
    dragMaxHeight.value = null
    dragStartY = null
    dragMoved = false
  }
})
</script>

<template>
  <Popup
    :show="props.show"
    position="bottom"
    :close-on-click-overlay="true"
    @update:show="(v: boolean) => emit('update:show', v)"
    @close="onCancel"
  >
    <div
      ref="sheetRef"
      class="uikit-action-sheet"
      :class="{
        'uikit-action-sheet--expandable': props.expandable,
        'uikit-action-sheet--expanded': props.expandable && expanded,
        'uikit-action-sheet--dragging': dragMaxHeight !== null,
      }"
      :style="dragMaxHeight !== null ? { maxHeight: `${dragMaxHeight}px` } : undefined"
    >
      <!-- 拖拽手柄（expandable）：上拉展开 / 下拉收半屏 / 轻点切换档位 -->
      <div
        v-if="props.expandable"
        class="uikit-action-sheet__handle"
        @pointerdown="onHandlePointerDown"
        @pointermove="onHandlePointerMove"
        @pointerup="onHandlePointerUp"
        @pointercancel="onHandlePointerUp"
      >
        <div class="uikit-action-sheet__handle-bar" />
      </div>
      <div v-if="props.title" class="uikit-action-sheet__title">{{ props.title }}</div>
      <!-- 高频操作网格区（zone='grid'）：图标 tile 横排，超出横向滚动 -->
      <div v-if="gridItems.length > 0" class="uikit-action-sheet__grid">
        <div
          v-for="item in gridItems"
          :key="item.index"
          class="uikit-action-sheet__grid-item"
          :class="{ 'uikit-action-sheet__grid-item--disabled': item.disabled }"
          :style="item.color ? { color: item.color } : {}"
          @click="onSelect(item)"
        >
          <span class="uikit-action-sheet__grid-icon">
            <Icon v-if="item.icon" :name="item.icon" :size="24" />
          </span>
          <span class="uikit-action-sheet__grid-label">{{ item.name }}</span>
        </div>
      </div>
      <!-- 列表区：expandable 时可纵向滚动，取消键固定底部 -->
      <div class="uikit-action-sheet__body">
        <div class="uikit-action-sheet__actions">
          <div
            v-for="item in listItems"
            :key="item.index"
            class="uikit-action-sheet__item"
            :class="{ 'uikit-action-sheet__item--disabled': item.disabled }"
            :style="{ ...item.color ? { color: item.color } : {}, animationDelay: `calc(var(--uikit-anim-stagger-delay) * ${item.index})` }"
            @click="onSelect(item)"
          >
            <Transition name="uikit-icon-swap" mode="out-in">
              <Icon v-if="item.icon" :key="item.icon" :name="item.icon" :size="16" />
            </Transition>
            <span>{{ item.name }}</span>
          </div>
        </div>
        <div class="uikit-action-sheet__extra">
          <slot />
        </div>
      </div>
      <div class="uikit-action-sheet__cancel" @click="onCancel">
        {{ props.cancelText }}
      </div>
    </div>
  </Popup>
</template>

<style scoped>
/* safe-bottom 由 Popup position="bottom" 统一处理，这里不再重复 env() */
.uikit-action-sheet--expandable {
  display: flex;
  flex-direction: column;
  max-height: 50vh;
  max-height: 50dvh;
  transition: max-height var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.uikit-action-sheet--expanded {
  max-height: 78vh;
  max-height: 78dvh;
}

.uikit-action-sheet--dragging {
  transition: none;
}

/* expandable 时列表区弹性滚动，handle/网格/取消键保持固定 */
.uikit-action-sheet--expandable .uikit-action-sheet__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.uikit-action-sheet__handle {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
  flex-shrink: 0;
  cursor: grab;
  /* 拖拽手势独占：handle 上不触发页面滚动/文本选择 */
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.uikit-action-sheet__handle-bar {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background-color: var(--uikit-border-color);
}

.uikit-action-sheet__title {
  text-align: center;
  padding: 16px;
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
  border-bottom: 1px solid var(--uikit-border-light);
}

/* 高频网格区：图标 tile 横排，一屏约 5 个，超出横向滚动 */
.uikit-action-sheet__grid {
  display: flex;
  gap: 4px;
  padding: 12px 12px 4px;
  overflow-x: auto;
  flex-shrink: 0;
  -webkit-overflow-scrolling: touch;
}

.uikit-action-sheet__grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 64px;
  padding: 4px;
  border-radius: var(--uikit-components-radius, 8px);
  color: var(--uikit-text-primary);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.uikit-action-sheet__grid-item:active {
  background-color: var(--uikit-bg-secondary);
}

.uikit-action-sheet__grid-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.uikit-action-sheet__grid-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-bg-secondary);
}

.uikit-action-sheet__grid-label {
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-text-secondary);
  line-height: 1.2;
  white-space: nowrap;
}

.uikit-action-sheet__actions {
  display: flex;
  flex-direction: column;
}

.uikit-action-sheet__item {
  padding: 16px;
  text-align: center;
  font-size: var(--uikit-font-size-15);
  color: var(--uikit-text-primary);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
  border-bottom: 1px solid var(--uikit-border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  /* 交错出场动画 */
  animation: uikit-action-item-in var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel) both;
}

.uikit-action-sheet__item:active {
  background-color: var(--uikit-bg-secondary);
}

.uikit-action-sheet__item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.uikit-action-sheet__extra {
  display: flex;
  flex-direction: column;
}

.uikit-action-sheet__cancel {
  margin-top: 8px;
  padding: 16px;
  text-align: center;
  font-size: var(--uikit-font-size-15);
  color: var(--uikit-text-primary);
  cursor: pointer;
  background-color: var(--uikit-bg-secondary);
  font-weight: var(--uikit-font-weight-medium);
  flex-shrink: 0;
}

.uikit-action-sheet__cancel:active {
  opacity: 0.8;
}

/* 操作项图标状态切换过渡（如免打扰 bell ↔ bell_slash） */
.uikit-icon-swap-enter-active,
.uikit-icon-swap-leave-active {
  transition:
    opacity var(--uikit-anim-duration) var(--uikit-anim-easing),
    transform var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.uikit-icon-swap-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.6);
}

.uikit-icon-swap-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.6);
}

/* 交错出场关键帧 */
@keyframes uikit-action-item-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
