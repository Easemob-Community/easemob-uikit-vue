<script setup lang="ts">
import { computed } from 'vue'
import Icon from '../icon/icon.vue'

export interface CellProps {
  /** 是否可点击（影响 cursor 和 hover），默认 true */
  clickable?: boolean
  /** 激活状态（当前选中项） */
  active?: boolean
  /** 选中状态（多选模式） */
  selected?: boolean
  /** 禁用状态 */
  disabled?: boolean
  /** 尺寸：compact / normal / large，默认 normal */
  size?: 'compact' | 'normal' | 'large'
  /** 标题文本（便捷模式，也可用 title slot） */
  title?: string
  /** 副标题文本 */
  subtitle?: string
  /** 右侧元信息文本（计数、时间） */
  meta?: string
  /** 是否显示右侧箭头（导航项常用） */
  showArrow?: boolean
  /** 分隔线：true=bottom / false=none / 'top' / 'bottom' */
  border?: boolean | 'top' | 'bottom'
  /** 内容驱动高度（而非固定高度） */
  autoHeight?: boolean
  /** 危险操作样式（文字/图标显示为红色） */
  danger?: boolean
}

const props = withDefaults(defineProps<CellProps>(), {
  clickable: true,
  active: false,
  selected: false,
  disabled: false,
  size: 'normal',
  showArrow: false,
  border: false,
  autoHeight: false,
  danger: false,
})

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'contextmenu', event: MouseEvent): void
}>()

const rootClass = computed(() => ({
  'is-clickable': props.clickable && !props.disabled,
  'is-active': props.active,
  'is-selected': props.selected,
  'is-disabled': props.disabled,
  'has-border-top': props.border === 'top',
  'has-border-bottom': props.border === true || props.border === 'bottom',
  'is-auto-height': props.autoHeight,
  [`size-${props.size}`]: true,
  'has-subtitle': !!props.subtitle,
  'is-danger': props.danger,
}))

function onClick() {
  if (props.disabled)
    return
  emit('click')
}

function onContextmenu(e: MouseEvent) {
  if (props.disabled)
    return
  emit('contextmenu', e)
}
</script>

<template>
  <div
    class="uikit-cell"
    :class="rootClass"
    @click="onClick"
    @contextmenu="onContextmenu"
  >
    <!-- leading -->
    <span v-if="$slots.leading" class="uikit-cell__leading">
      <slot name="leading" />
    </span>

    <!-- main -->
    <span class="uikit-cell__main">
      <slot>
        <span class="uikit-cell__row">
          <span v-if="$slots.title || props.title" class="uikit-cell__title">
            <slot name="title">{{ props.title }}</slot>
          </span>
          <span v-if="props.meta" class="uikit-cell__meta">{{ props.meta }}</span>
        </span>
        <span v-if="$slots.subtitle || props.subtitle" class="uikit-cell__subtitle">
          <slot name="subtitle">{{ props.subtitle }}</slot>
        </span>
      </slot>
    </span>

    <!-- trailing -->
    <span v-if="$slots.trailing || props.showArrow" class="uikit-cell__trailing">
      <slot name="trailing" />
      <Icon
        v-if="props.showArrow && !$slots.trailing"
        name="navigation/chevron_right"
        :size="16"
        class="uikit-cell__arrow"
      />
    </span>
  </div>
</template>

<style scoped>
.uikit-cell {
  position: relative;
  z-index: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 var(--uikit-item-hover-padding-x, 16px);
  margin: 0 var(--uikit-item-hover-margin-x, 0px);
  height: var(--uikit-cell-height, 64px);
  border-radius: var(--uikit-item-hover-radius, 0px);
  transition: opacity var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
  -webkit-touch-callout: none;
  user-select: none;
}

/* autoHeight 模式：padding 驱动，不固定高度 */
.uikit-cell.is-auto-height {
  height: auto;
  padding: 12px var(--uikit-item-hover-padding-x, 16px);
}

/* 尺寸变体 */
.uikit-cell.size-compact {
  height: var(--uikit-cell-height-compact, 48px);
  gap: 10px;
}

.uikit-cell.size-large,
.uikit-cell.has-subtitle {
  height: var(--uikit-cell-height-large, 72px);
}

/* 分隔线 */
.uikit-cell.has-border-top {
  border-top: 1px solid var(--uikit-divider-color, rgba(0, 0, 0, 0.06));
}

.uikit-cell.has-border-bottom {
  border-bottom: 1px solid var(--uikit-divider-color, rgba(0, 0, 0, 0.06));
}

/* hover / active 背景层 */
.uikit-cell::before {
  content: '';
  position: absolute;
  /* 水平方向保留内缩，垂直方向顶满 cell 高度，避免 hover 背景上下露出空白 */
  inset: 0 calc(var(--uikit-item-hover-padding-x, 16px) / 2);
  border-radius: var(--uikit-item-hover-radius, 0px);
  background-color: var(--uikit-bg-secondary);
  z-index: -1;
  opacity: 0;
  transition: opacity var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
  pointer-events: none;
}

/* 交互状态 */
.uikit-cell.is-clickable {
  cursor: pointer;
}

.uikit-cell.is-clickable:hover::before {
  opacity: 1;
}

.uikit-cell.is-active::before {
  opacity: 1;
  border-radius: var(--uikit-item-active-radius, 0px);
}

.uikit-cell.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.uikit-cell.is-disabled:hover::before {
  opacity: 0;
}

/* 危险操作 */
.uikit-cell.is-danger,
.uikit-cell.is-danger .uikit-cell__title,
.uikit-cell.is-danger .uikit-cell__subtitle,
.uikit-cell.is-danger .uikit-cell__meta {
  color: var(--uikit-danger-color, #ef4444);
}

.uikit-cell.is-danger.is-clickable:hover::before {
  background-color: rgba(var(--uikit-danger-rgb, 239, 68, 68), 0.08);
}

/* leading */
.uikit-cell__leading {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* main */
.uikit-cell__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.uikit-cell__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.uikit-cell__title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--uikit-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.uikit-cell__meta {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

.uikit-cell__subtitle {
  font-size: 12px;
  color: var(--uikit-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* trailing */
.uikit-cell__trailing {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.uikit-cell__arrow {
  color: var(--uikit-text-secondary);
}
</style>
