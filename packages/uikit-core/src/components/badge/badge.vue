<script setup lang="ts">
import { computed } from 'vue'

/** 徽标尺寸：xs（仅圆点）/ s / m / l（默认）/ xl / xxl */
export type BadgeSize = 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl'
export type BadgeVariant = 'filled' | 'stroked'
/** 徽标相对容器的位置 */
export type BadgePlacement = 'top-right' | 'bottom-right'

export interface BadgeProps {
  /** 徽标数字；超过 max 显示为 "max+"；为 0 或未传时不显示（dot 模式除外） */
  count?: number
  /** 数字显示上限，超出后显示为 "max+"，默认 99 */
  max?: number
  /** 红点模式：仅显示小圆点不显示数字，默认 false */
  dot?: boolean
  /** 徽标颜色（默认 --uikit-badge-bg #FF7070）：filled 作背景色，stroked 作文字与描边色 */
  color?: string
  /** 尺寸：xs（仅圆点）/ s / m / l（默认）/ xl / xxl */
  size?: BadgeSize
  /** 风格：filled（实心，默认）/ stroked（描边） */
  variant?: BadgeVariant
  /** 徽标相对容器的位置：top-right（默认）/ bottom-right */
  placement?: BadgePlacement
  /** 是否给徽标加 2px 描边与底层内容（如头像）分界；颜色跟随 --uikit-bg-base，暗色自适应 */
  bordered?: boolean
  /** 内联模式：徽标不占位覆盖，按文档流渲染（如会话列表行尾未读数），默认 false；开启后 placement 不生效 */
  inline?: boolean
}

const props = withDefaults(defineProps<BadgeProps>(), {
  max: 99,
  dot: false,
  color: 'var(--uikit-badge-bg, #FF7070)',
  size: 'l',
  variant: 'filled',
  placement: 'top-right',
  bordered: false,
  inline: false,
})

/** xs 档仅支持圆点：忽略 count，强制按 dot 渲染 */
const isDot = computed(() => props.dot || props.size === 'xs')

const displayCount = computed(() => {
  if (isDot.value) return ''
  if (!props.count) return ''
  return props.count > props.max ? `${props.max}+` : String(props.count)
})

/** 单位数正圆 / 多位数药丸 */
const digitCount = computed(() => {
  if (isDot.value) return 'dot'
  return displayCount.value.length <= 1 ? 'single' : 'multi'
})
</script>

<template>
  <div class="uikit-badge">
    <slot />
    <span
      v-if="props.count || props.dot"
      class="uikit-badge__content"
      :class="[
        `uikit-badge__content--${props.size}`,
        `uikit-badge__content--${digitCount}`,
        `uikit-badge__content--${props.variant}`,
        `uikit-badge__content--${props.placement}`,
        { 'uikit-badge__content--bordered': props.bordered },
        { 'uikit-badge__content--inline': props.inline },
      ]"
      :style="{ '--uikit-badge-color': props.color }"
    >
      {{ displayCount }}
    </span>
  </div>
</template>

<style scoped>
.uikit-badge {
  position: relative;
  display: inline-flex;
}

.uikit-badge__content {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  white-space: nowrap;
  font-weight: var(--uikit-font-weight-medium);
  /* 尺寸规范：各档通过 --uikit-badge-size（圆点直径=数字高度）与 --uikit-badge-pad（多位数水平 padding）描述 */
  height: var(--uikit-badge-size);
  min-width: var(--uikit-badge-size);
  padding: 0 var(--uikit-badge-pad, 0);
  border-radius: 9999px;
  /* 颜色变量由 props.color 注入，支持 variant 复用 */
  --uikit-badge-color: var(--uikit-badge-bg, #FF7070);
}

/* ===== 位置：右上角（默认）/ 右下角 ===== */

.uikit-badge__content--top-right {
  top: 0;
  right: 0;
  transform: translate(50%, -50%);
}

.uikit-badge__content--bottom-right {
  bottom: 0;
  right: 0;
  transform: translate(50%, 50%);
}

/* 内联模式：按文档流渲染（行尾未读数等场景），不再绝对定位覆盖宿主 */
.uikit-badge__content--inline {
  position: static;
  transform: none;
}

/* 描边：与头像等底层内容分界；用 box-shadow 外环实现，避免与 stroked variant 的 border 冲突；
   颜色跟随 --uikit-bg-base（页面背景），暗色下自动适配 */
.uikit-badge__content--bordered {
  box-shadow: 0 0 0 2px var(--uikit-bg-base);
}

/* ===== 尺寸档位（圆点直径 = 有数字时高度 = 单数字宽度） ===== */

.uikit-badge__content--xs {
  --uikit-badge-size: 8px;
}

.uikit-badge__content--s {
  --uikit-badge-size: 10px;
  --uikit-badge-pad: 2px;
  font-size: var(--uikit-font-size-7);
}

.uikit-badge__content--m {
  --uikit-badge-size: 14px;
  --uikit-badge-pad: 3px;
  font-size: var(--uikit-font-size-9);
}

.uikit-badge__content--l {
  --uikit-badge-size: 16px;
  --uikit-badge-pad: 4px;
  font-size: var(--uikit-font-size-11);
  line-height: 16px;
}

.uikit-badge__content--xl {
  --uikit-badge-size: 20px;
  --uikit-badge-pad: 4px;
  font-size: var(--uikit-font-size-11);
  line-height: 16px;
}

.uikit-badge__content--xxl {
  --uikit-badge-size: 24px;
  --uikit-badge-pad: 6px;
  font-size: var(--uikit-font-size-11);
  line-height: 16px;
}

/* 单位数：宽 = 高，正圆 */
.uikit-badge__content--single {
  width: var(--uikit-badge-size);
  padding: 0;
}

/* 圆点模式：宽 = 高 = 圆点直径 */
.uikit-badge__content--dot {
  width: var(--uikit-badge-size);
  padding: 0;
}

/* ===== 风格：filled / stroked ===== */

.uikit-badge__content--filled {
  background-color: var(--uikit-badge-color);
  color: var(--uikit-badge-text, #FFFFFF);
  border: none;
}

.uikit-badge__content--stroked {
  background-color: transparent;
  color: var(--uikit-badge-color);
  border-style: solid;
  border-color: var(--uikit-badge-color);
}

/* 描边宽度随档位：小档 1px，大档 1.5px */
.uikit-badge__content--stroked.uikit-badge__content--xs,
.uikit-badge__content--stroked.uikit-badge__content--s,
.uikit-badge__content--stroked.uikit-badge__content--m {
  border-width: 1px;
}

.uikit-badge__content--stroked.uikit-badge__content--l,
.uikit-badge__content--stroked.uikit-badge__content--xl,
.uikit-badge__content--stroked.uikit-badge__content--xxl {
  border-width: 1.5px;
}
</style>
