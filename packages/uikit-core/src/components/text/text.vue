<script setup lang="ts">
import { computed } from 'vue'

/**
 * 排版层级：对齐设计师 Value.tokens.json 9 档（h0~mini）+ 补充 body-sm（12px，沿用既有 Body-S 语义）。
 * 每档内置「字号 + 行高」配对（行高按设计稿绝对值换算并跟随 --uikit-font-scale 缩放），
 * 各档默认字重见样式表；weight prop 可覆盖。
 * 注：2026-09-18 字号档位整体降一档（原 16px 档降为 15px，其余档位依次顺延）。
 */
export type TextLevel = 'h0' | 'h1' | 'h2' | 'h3' | 'body-lg' | 'body' | 'body-sm' | 'caption' | 'small' | 'mini'
/** 字重：对应 --uikit-font-weight-* token */
export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold'
/** 文本颜色：对应 --uikit-text-* 语义 token */
export type TextColor = 'primary' | 'secondary' | 'tertiary' | 'inverse'

export interface TextProps {
  /** 排版层级（字号 + 行高配对 + 默认字重），默认 body（13px） */
  level?: TextLevel
  /** 字重覆盖；不传时按 level 默认字重 */
  weight?: TextWeight
  /** 文本颜色（语义 token），默认 primary */
  color?: TextColor
  /** 单行截断（overflow + text-overflow: ellipsis）；开启后以块级渲染，默认 false */
  ellipsis?: boolean
  /** 渲染标签，默认 span */
  tag?: string
}

const props = withDefaults(defineProps<TextProps>(), {
  level: 'body',
  weight: undefined,
  color: 'primary',
  ellipsis: false,
  tag: 'span',
})

const classes = computed(() => [
  `uikit-text--${props.level}`,
  `uikit-text--color-${props.color}`,
  props.weight ? `uikit-text--weight-${props.weight}` : '',
  props.ellipsis ? 'uikit-text--ellipsis' : '',
])
</script>

<template>
  <component :is="props.tag" class="uikit-text" :class="classes">
    <slot />
  </component>
</template>

<style scoped>
.uikit-text {
  margin: 0;
}

/* ===== 层级：字号 + 行高配对 + 默认字重（行高跟随 --uikit-font-scale 等比缩放） ===== */

.uikit-text--h0 {
  font-size: var(--uikit-font-size-28);
  line-height: calc(42px * var(--uikit-font-scale));
  font-weight: var(--uikit-font-weight-semibold);
}

.uikit-text--h1 {
  font-size: var(--uikit-font-size-22);
  line-height: calc(34px * var(--uikit-font-scale));
  font-weight: var(--uikit-font-weight-semibold);
}

.uikit-text--h2 {
  font-size: var(--uikit-font-size-20);
  line-height: calc(26px * var(--uikit-font-scale));
  font-weight: var(--uikit-font-weight-semibold);
}

.uikit-text--h3 {
  font-size: var(--uikit-font-size-16);
  line-height: calc(24px * var(--uikit-font-scale));
  font-weight: var(--uikit-font-weight-semibold);
}

.uikit-text--body-lg {
  font-size: var(--uikit-font-size-15);
  line-height: calc(24px * var(--uikit-font-scale));
  font-weight: var(--uikit-font-weight-regular);
}

.uikit-text--body {
  font-size: var(--uikit-font-size-13);
  line-height: calc(22px * var(--uikit-font-scale));
  font-weight: var(--uikit-font-weight-regular);
}

.uikit-text--body-sm {
  font-size: var(--uikit-font-size-12);
  line-height: calc(20px * var(--uikit-font-scale));
  font-weight: var(--uikit-font-weight-regular);
}

.uikit-text--caption {
  font-size: var(--uikit-font-size-11);
  line-height: calc(18px * var(--uikit-font-scale));
  font-weight: var(--uikit-font-weight-regular);
}

.uikit-text--small {
  font-size: var(--uikit-font-size-9);
  line-height: calc(14px * var(--uikit-font-scale));
  font-weight: var(--uikit-font-weight-medium);
}

.uikit-text--mini {
  font-size: var(--uikit-font-size-7);
  line-height: calc(12px * var(--uikit-font-scale));
  font-weight: var(--uikit-font-weight-medium);
}

/* ===== 颜色（语义 token） ===== */

.uikit-text--color-primary {
  color: var(--uikit-text-primary);
}

.uikit-text--color-secondary {
  color: var(--uikit-text-secondary);
}

.uikit-text--color-tertiary {
  color: var(--uikit-text-tertiary);
}

.uikit-text--color-inverse {
  color: var(--uikit-text-inverse);
}

/* ===== 字重覆盖（排在层级之后，同优先级下覆盖层级默认字重） ===== */

.uikit-text--weight-regular {
  font-weight: var(--uikit-font-weight-regular);
}

.uikit-text--weight-medium {
  font-weight: var(--uikit-font-weight-medium);
}

.uikit-text--weight-semibold {
  font-weight: var(--uikit-font-weight-semibold);
}

.uikit-text--weight-bold {
  font-weight: var(--uikit-font-weight-bold);
}

/* ===== 单行截断：块级渲染才能保证 overflow 生效 ===== */

.uikit-text--ellipsis {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
