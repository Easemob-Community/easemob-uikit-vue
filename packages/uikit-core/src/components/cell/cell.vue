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
  /**
   * 分隔线：true=bottom / false=none / 'top' / 'bottom'。
   * 分割线模式的默认风格：内容左右内收 12px（--uikit-cell-border-padding-x）、cell 间距归零，
   * 底部发丝线左侧跟随内收（--uikit-cell-border-inset 可独立覆盖，0 = 通栏）、右侧顶满。
   */
  border?: boolean | 'top' | 'bottom'
  /** 内容驱动高度（而非固定高度） */
  autoHeight?: boolean
  /** 危险操作样式（文字/图标显示为红色） */
  danger?: boolean
  /** hover 背景是否内缩（默认 true，卡片内操作项可设为 false 使 hover 背景顶满） */
  insetHover?: boolean
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
  insetHover: true,
})

const emit = defineEmits<{
  /** 点击 cell 时触发（disabled 时不触发），负载为原生点击事件 */
  (e: 'click', event: MouseEvent): void
  /** 右键点击 cell 时触发（disabled 时不触发），常用于唤出上下文菜单 */
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
  'is-inset-hover': props.insetHover,
}))

function onClick(e: MouseEvent) {
  if (props.disabled)
    return
  emit('click', e)
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
        name="chevron/right"
        :size="22"
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
  gap: var(--uikit-spacing-3);
  padding: 0 var(--uikit-item-hover-padding-x, 16px);
  margin: 0 var(--uikit-item-hover-margin-x, 0px) var(--uikit-cell-gap, 3px);
  height: var(--uikit-cell-height, 64px);
  /* 项背景（默认透明；hover/active 背景层 ::before 绘制在其上） */
  background: var(--uikit-cell-bg, transparent);
  border-radius: var(--uikit-item-hover-radius, 0px);
  transition: opacity var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
  -webkit-touch-callout: none;
  user-select: none;
}

/* 列表末尾的 cell 不保留底部间距，避免容器底部多出空白 */
.uikit-cell:last-child {
  margin-bottom: 0;
}

/* autoHeight 模式：padding 驱动，不固定高度 */
.uikit-cell.is-auto-height {
  height: auto;
  padding: var(--uikit-cell-padding-y, 12px) var(--uikit-item-hover-padding-x, 16px);
}

/* 分割线模式（border="top"/"bottom"）的默认风格：
   内容左右内收 12px、cell 间 3px 间距归零（保证分隔线连续）；
   底部发丝线左侧默认跟随该内收值（--uikit-cell-border-inset 可独立覆盖）、右侧顶满。
   如需旧的通栏线 + 16px 内容边距，可显式设置 --uikit-cell-border-padding-x / --uikit-cell-border-inset。 */
.uikit-cell.has-border-top,
.uikit-cell.has-border-bottom {
  padding-left: var(--uikit-cell-border-padding-x, 12px);
  padding-right: var(--uikit-cell-border-padding-x, 12px);
  margin-bottom: 0;
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

/* 底部发丝线用 ::after 绘制：右侧始终顶满 cell 边缘，
   左侧默认跟随分割线模式的内容内收（--uikit-cell-border-padding-x），
   可用 --uikit-cell-border-inset 独立覆盖（如 0 = 通栏） */
.uikit-cell.has-border-bottom::after {
  content: '';
  position: absolute;
  left: var(--uikit-cell-border-inset, var(--uikit-cell-border-padding-x, 12px));
  right: 0;
  bottom: 0;
  height: 1px;
  background-color: var(--uikit-divider-color, rgba(0, 0, 0, 0.06));
  pointer-events: none;
}

/* 分割线模式强制直角：全局 --uikit-item-hover-radius（默认 8px）会让 1px 分隔线两端随圆角上翘，
   且分段列表中相邻行的 hover 背景也不应带圆角 */
.uikit-cell.has-border-top,
.uikit-cell.has-border-bottom,
.uikit-cell.has-border-top::before,
.uikit-cell.has-border-bottom::before {
  border-radius: 0;
}

/* hover / active 背景层 */
.uikit-cell::before {
  content: '';
  position: absolute;
  /* 默认顶满整个 cell；.is-inset-hover 下水平方向保留内缩，保持列表项 hover 不贴边 */
  inset: 0;
  border-radius: var(--uikit-item-hover-radius, 0px);
  background-color: var(--uikit-bg-hover);
  z-index: -1;
  opacity: 0;
  transition:
    opacity var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease),
    background-color var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
  pointer-events: none;
}

.uikit-cell.is-inset-hover::before {
  inset: 0 calc(var(--uikit-item-hover-padding-x, 16px) / 2);
}

/* 交互状态 */
.uikit-cell.is-clickable {
  cursor: pointer;
}


@media (hover: hover) {
  .uikit-cell.is-clickable:hover::before {
    opacity: 1;
    background-color: var(--uikit-bg-hover);
  }
}

.uikit-cell.is-active::before {
  opacity: 1;
  border-radius: var(--uikit-item-active-radius, 0px);
  background-color: var(--uikit-bg-active);
}


@media (hover: hover) {
  .uikit-cell.is-active.is-clickable:hover::before {
    background-color: var(--uikit-bg-active);
  }
}

.uikit-cell.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}


@media (hover: hover) {
  .uikit-cell.is-disabled:hover::before {
    opacity: 0;
  }
}

/* 危险操作 */
.uikit-cell.is-danger,
.uikit-cell.is-danger .uikit-cell__title,
.uikit-cell.is-danger .uikit-cell__subtitle,
.uikit-cell.is-danger .uikit-cell__meta,
.uikit-cell.is-danger .uikit-cell__leading {
  color: var(--uikit-danger-color);
}


@media (hover: hover) {
  .uikit-cell.is-danger.is-clickable:hover::before {
    background-color: rgba(var(--uikit-danger-rgb, 239, 68, 68), 0.08);
  }
}

/* leading */
.uikit-cell__leading {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--uikit-text-secondary);
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
  font-size: var(--uikit-font-size-14);
  font-weight: var(--uikit-font-weight-medium);
  color: var(--uikit-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.uikit-cell__meta {
  flex-shrink: 0;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}

.uikit-cell__subtitle {
  font-size: var(--uikit-font-size-12);
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
  color: var(--uikit-text-secondary);
}

/* 导航箭头：与 IconButton 同尺寸逻辑（内部图标 22 + 上下左右 padding 4 = 30×30），
   负 margin 抵消 padding，不改变 cell 行内布局占位 */
.uikit-cell__arrow {
  padding: 4px;
  margin: -4px;
  flex-shrink: 0;
  color: var(--uikit-text-secondary);
}
</style>
