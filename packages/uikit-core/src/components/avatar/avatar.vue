<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useThemeStore } from '../../store/theme'
import Icon from '../icon/icon.vue'

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

export interface AvatarProps {
  /** 头像图片地址；为空或加载失败时回退为文字头像（取 name 前 2 个字符） */
  src?: string
  /** 用户名，用于生成文字头像内容与背景色 */
  name?: string
  /** 头像尺寸（px），默认 40；文字字号与在线状态指示器随之自适应 */
  size?: number
  /** 头像形状：circle（圆形）/ square（圆角方形）；不传时跟随主题 avatarShape */
  shape?: 'circle' | 'square'
  /** 在线状态，传入则展示右下角指示器 */
  presence?: PresenceDisplayStatus
  /** 指示器直径（px），默认按头像尺寸自适应 */
  presenceSize?: number
  /** 是否可编辑（通常仅当前用户自己的头像使用），点击时触发 presence-click */
  editable?: boolean
}

const props = withDefaults(defineProps<AvatarProps>(), {
  size: 40,
  shape: undefined,
  editable: false,
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

const resolvedPresenceSize = computed(() =>
  props.presenceSize ?? Math.max(8, Math.round(props.size * 0.22)),
)

const presenceBorderWidth = computed(() =>
  Math.max(1, Math.round(resolvedPresenceSize.value * 0.15)),
)

const presenceIconSize = computed(() =>
  Math.max(4, resolvedPresenceSize.value - presenceBorderWidth.value * 2),
)

const presenceIconName = computed(() =>
  props.presence ? presenceIconMap[props.presence] : '',
)

const presenceIconColor = computed(() =>
  props.presence ? presenceColorMap[props.presence] : '',
)

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
    <img v-if="props.src && !imgError" :src="props.src" class="uikit-avatar__img" @error="imgError = true">
    <span v-else class="uikit-avatar__text" :style="{ backgroundColor: bgColor }">{{ displayName }}</span>
    <span
      v-if="props.presence"
      class="uikit-avatar__presence"
      :class="`uikit-avatar__presence--${props.presence}`"
      :style="{
        width: `${resolvedPresenceSize}px`,
        height: `${resolvedPresenceSize}px`,
        borderWidth: `${presenceBorderWidth}px`,
        color: presenceIconColor,
      }"
    >
      <Icon
        :name="presenceIconName"
        :size="presenceIconSize"
      />
    </span>
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
  font-weight: 500;
}

.uikit-avatar__presence {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border-style: solid;
  border-color: var(--uikit-bg-base);
  background-color: var(--uikit-bg-base);
  box-sizing: border-box;
  overflow: hidden;
}
</style>
