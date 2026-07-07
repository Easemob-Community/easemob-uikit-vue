<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '../../store/theme'

/** 在线状态展示值 */
export type PresenceDisplayStatus = 'online' | 'offline' | 'away' | 'busy' | 'custom'

export interface AvatarProps {
  src?: string
  name?: string
  size?: number
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
  (e: 'presence-click'): void
}>()

const themeStore = useThemeStore()

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
    <img v-if="props.src" :src="props.src" class="uikit-avatar__img">
    <span v-else class="uikit-avatar__text" :style="{ backgroundColor: bgColor }">{{ displayName }}</span>
    <span
      v-if="props.presence"
      class="uikit-avatar__presence"
      :class="`uikit-avatar__presence--${props.presence}`"
      :style="{
        width: `${resolvedPresenceSize}px`,
        height: `${resolvedPresenceSize}px`,
        borderWidth: `${Math.max(1, Math.round(resolvedPresenceSize * 0.15))}px`,
      }"
    />
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
  color: #fff;
  font-weight: 500;
}

.uikit-avatar__presence {
  position: absolute;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  border-style: solid;
  border-color: var(--uikit-bg-base, #fff);
  background-color: var(--uikit-text-tertiary, #94a3b8);
  box-sizing: border-box;
}

.uikit-avatar__presence--online {
  background-color: var(--uikit-success-color, #22c55e);
}

.uikit-avatar__presence--away {
  background-color: var(--uikit-warning-color, #f59e0b);
}

.uikit-avatar__presence--busy {
  background-color: var(--uikit-danger-color, #ef4444);
}

.uikit-avatar__presence--offline,
.uikit-avatar__presence--custom {
  background-color: var(--uikit-text-tertiary, #94a3b8);
}
</style>
