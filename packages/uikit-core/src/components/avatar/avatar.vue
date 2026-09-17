<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useThemeStore } from '../../store/theme'
import Icon from '../icon/icon.vue'
import type { BadgePlacement } from '../badge/badge.vue'

/** 在线状态展示值 */
export type PresenceDisplayStatus = 'online' | 'offline' | 'away' | 'busy' | 'doNotDisturb' | 'custom'

const presenceIconMap: Record<PresenceDisplayStatus, string> = {
  online: 'filled/circle/empty',
  offline: 'filled/circle/empty',
  away: 'filled/circle/clock',
  busy: 'filled/circle/equals',
  doNotDisturb: 'filled/circle/minus',
  custom: 'filled/circle/star',
}

const presenceColorMap: Record<PresenceDisplayStatus, string> = {
  online: 'var(--uikit-presence-online-color, #6CE191)',
  offline: 'var(--uikit-presence-offline-color, #454545)',
  away: 'var(--uikit-presence-away-color, #B9BBC5)',
  busy: 'var(--uikit-presence-busy-color, #ED7587)',
  doNotDisturb: 'var(--uikit-presence-dnd-color, #EE798C)',
  custom: 'var(--uikit-presence-custom-color, #F3C850)',
}

/** 徽标标准尺寸比例（Figma「新-Demo」AvatarWithBadge 稿，基准头像 48px） */
const BADGE_SIZE_RATIO = 20 / 48
const BADGE_DOT_RATIO = 9 / 48
const BADGE_FONT_RATIO = 12 / 20
const BADGE_PAD_RATIO = 4 / 20
/** 徽标中心相对头像角的内缩比例：圆形角内收，内缩量大于圆角方形 */
const BADGE_INSET_RATIO: Record<'circle' | 'square', { count: number, dot: number }> = {
  circle: { count: 8 / 48, dot: 6 / 48 },
  square: { count: 5 / 48, dot: 3 / 48 },
}

export interface AvatarProps {
  /** 头像图片地址；为空或加载失败时回退为文字头像（取 name 前 2 个字符） */
  src?: string
  /** 用户名，用于生成文字头像内容与背景色 */
  name?: string
  /** 头像尺寸（px），默认 40；文字字号与在线状态指示器随之自适应 */
  size?: number
  /** 头像形状：circle（圆形）/ square（圆角方形）；不传时跟随主题 avatarShape */
  shape?: 'circle' | 'square'
  /** 在线状态，传入则展示右下角指示器（Figma 1994:26192：固定 8px 彩色核心，不随头像缩放；
      1.5px 分界环为 mask 镂空，与当地背景融为一体） */
  presence?: PresenceDisplayStatus
  /** 指示器总直径（px，含 1.5px 分界环），默认 11（核心 8 + 环 1.5 × 2） */
  presenceSize?: number
  /** 是否可编辑（通常仅当前用户自己的头像使用），点击时触发 presence-click */
  editable?: boolean
  /** 徽标数字；超过 badgeMax 显示为 "max+"；为 0 或未传时不显示（badgeDot 红点模式除外） */
  badge?: number
  /** 徽标红点模式：仅显示小圆点不显示数字，默认 false */
  badgeDot?: boolean
  /** 徽标数字显示上限，默认 99 */
  badgeMax?: number
  /** 徽标位置：top-right（默认，避开右下角 presence 指示器）/ bottom-right */
  badgePlacement?: BadgePlacement
  /** 徽标颜色，默认 --uikit-badge-bg（#FF7070） */
  badgeColor?: string
}

const props = withDefaults(defineProps<AvatarProps>(), {
  size: 40,
  shape: undefined,
  editable: false,
  badgeDot: false,
  badgeMax: 99,
  badgePlacement: 'top-right',
  badgeColor: 'var(--uikit-badge-bg, #FF7070)',
})

const emit = defineEmits<{
  /** 头像为可编辑态（editable）时点击触发，用于唤起更换头像等操作 */
  (e: 'presence-click'): void
}>()

const themeStore = useThemeStore()

/** 图片加载失败标记：失败后回退到文字头像 */
const imgError = ref(false)

// src 变化时重置失败状态，允许新地址重新尝试加载
watch(() => props.src, () => {
  imgError.value = false
})

const avatarShape = computed(() => props.shape ?? themeStore.avatarShape)

const displayName = computed(() => {
  if (!props.name)
    return ''
  return props.name.slice(0, 2)
})

const bgColor = computed(() => {
  const colors = ['#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa']
  const index = (props.name?.charCodeAt(0) || 0) % colors.length
  return colors[index]
})

/** 在线状态指示器规格（Figma 1994:26192 / Avatar Status 组件，固定尺寸、不随头像缩放）：
    彩色核心 8px + 分界环 1.5px（总 11px）、核心边缘距头像角 2px（收在角内）。
    分界环不涂刷颜色，而是对头像内容做 mask 镂空——环色即当地背景色，任何背景下自动融合 */
const PRESENCE_CORE_SIZE = 8
const PRESENCE_RING_WIDTH = 1.5
const PRESENCE_CORE_INSET = 2

/** 指示器总直径（含分界环），默认 11px 固定 */
const resolvedPresenceSize = computed(() =>
  props.presenceSize ?? PRESENCE_CORE_SIZE + PRESENCE_RING_WIDTH * 2,
)

/** 彩色核心直径（总直径减去两侧分界环） */
const presenceCoreSize = computed(() =>
  resolvedPresenceSize.value - PRESENCE_RING_WIDTH * 2,
)

/** 状态图标在 24 模板中圆盘占 20，上探使圆盘填满核心 */
const presenceIconSize = computed(() =>
  Math.max(4, Math.round(presenceCoreSize.value * 1.2)),
)

const presenceIconName = computed(() =>
  props.presence ? presenceIconMap[props.presence] : '',
)

const presenceIconColor = computed(() =>
  props.presence ? presenceColorMap[props.presence] : '',
)

/** 指示器位置：核心边缘距头像角 2px，收在角内 */
const presenceStyle = computed(() => ({
  width: `${presenceCoreSize.value}px`,
  height: `${presenceCoreSize.value}px`,
  right: `${PRESENCE_CORE_INSET}px`,
  bottom: `${PRESENCE_CORE_INSET}px`,
  color: presenceIconColor.value,
}))

/** 头像内容（图片/文字）的 mask：在状态点区域镂空出「核心 + 分界环」的圆孔，
    孔内透出当地背景色，即分界环与背景融为一体（选中/hover/暗色均自适应） */
const presenceMaskStyle = computed(() => {
  if (!props.presence)
    return undefined
  const center = PRESENCE_CORE_INSET + presenceCoreSize.value / 2
  const radius = resolvedPresenceSize.value / 2
  const mask = `radial-gradient(circle ${radius}px at right ${center}px bottom ${center}px, transparent ${radius - 0.5}px, black ${radius}px)`
  return { mask, WebkitMask: mask }
})

const showBadge = computed(() => props.badgeDot || !!props.badge)

/** 徽标直径：数字徽标 = 头像 × 20/48（48→20），红点 = × 9/48（48→9），小头像兜底最小值 */
const badgeSize = computed(() =>
  props.badgeDot
    ? Math.max(8, Math.round(props.size * BADGE_DOT_RATIO))
    : Math.max(14, Math.round(props.size * BADGE_SIZE_RATIO)),
)

const badgeFontSize = computed(() =>
  Math.max(8, Math.round(badgeSize.value * BADGE_FONT_RATIO)),
)

const badgeText = computed(() => {
  if (props.badgeDot || !props.badge)
    return ''
  return props.badge > props.badgeMax ? `${props.badgeMax}+` : String(props.badge)
})

/** 徽标中心距头像角的内缩量（px），随头像尺寸与形状按比例换算 */
const badgeInset = computed(() =>
  Math.round(props.size * BADGE_INSET_RATIO[avatarShape.value][props.badgeDot ? 'dot' : 'count']),
)

const badgeStyle = computed(() => {
  const offset = `${badgeInset.value - badgeSize.value / 2}px`
  const style: Record<string, string> = {
    height: `${badgeSize.value}px`,
    minWidth: `${badgeSize.value}px`,
    fontSize: `${badgeFontSize.value}px`,
    backgroundColor: props.badgeColor,
  }
  // 单位数/红点：宽 = 高，正圆；多位数：水平 padding 撑成药丸
  if (badgeText.value.length > 1)
    style.padding = `0 ${Math.round(badgeSize.value * BADGE_PAD_RATIO)}px`
  else
    style.width = `${badgeSize.value}px`
  if (props.badgePlacement === 'bottom-right') {
    style.right = offset
    style.bottom = offset
  }
  else {
    style.right = offset
    style.top = offset
  }
  return style
})

function onClick() {
  if (props.editable)
    emit('presence-click')
}
</script>

<template>
  <div
    class="uikit-avatar"
    :class="[`uikit-avatar--${avatarShape}`, { 'is-editable': props.editable }]"
    :style="{ width: `${props.size}px`, height: `${props.size}px`, fontSize: `${props.size * 0.4}px` }"
    @click="onClick"
  >
    <img v-if="props.src && !imgError" :src="props.src" class="uikit-avatar__img" :style="presenceMaskStyle" @error="imgError = true">
    <span v-else class="uikit-avatar__text" :style="{ backgroundColor: bgColor, ...presenceMaskStyle }">{{ displayName }}</span>
    <span
      v-if="props.presence"
      class="uikit-avatar__presence"
      :class="`uikit-avatar__presence--${props.presence}`"
      :style="presenceStyle"
    >
      <Icon
        :name="presenceIconName"
        :size="presenceIconSize"
      />
    </span>
    <span
      v-if="showBadge"
      class="uikit-avatar__badge"
      :style="badgeStyle"
    >{{ badgeText }}</span>
  </div>
</template>

<style scoped>
.uikit-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  flex-shrink: 0;
  cursor: inherit;
}

.uikit-avatar.is-editable {
  cursor: pointer;
}

.uikit-avatar--circle {
  border-radius: 50%;
}

.uikit-avatar--circle .uikit-avatar__img,
.uikit-avatar--circle .uikit-avatar__text {
  border-radius: 50%;
}

.uikit-avatar--square {
  border-radius: 8px;
}

.uikit-avatar--square .uikit-avatar__img,
.uikit-avatar--square .uikit-avatar__text {
  border-radius: 8px;
}

.uikit-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uikit-avatar__text {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--uikit-text-inverse);
  font-weight: var(--uikit-font-weight-medium);
}

.uikit-avatar__presence {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  /* 分界环由头像内容侧 mask 镂空形成（环色 = 当地背景色），此处不涂刷底色/描边 */
  box-sizing: border-box;
  overflow: hidden;
}

.uikit-avatar__badge {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border-radius: 9999px;
  /* 2px 分界描边（含在徽标直径内，对齐 Figma stroke/sm），颜色跟随页面背景、暗色自适应 */
  border: 2px solid var(--uikit-bg-base);
  color: var(--uikit-badge-text, #FFFFFF);
  font-weight: var(--uikit-font-weight-medium);
  line-height: 1;
  white-space: nowrap;
}
</style>
