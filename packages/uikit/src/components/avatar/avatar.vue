<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '../../store/theme'

export interface AvatarProps {
  src?: string
  name?: string
  size?: number
  shape?: 'circle' | 'square'
}

const props = withDefaults(defineProps<AvatarProps>(), {
  size: 40,
  shape: undefined,
})

const themeStore = useThemeStore()

const avatarShape = computed(() => props.shape ?? themeStore.avatarShape)

const displayName = computed(() => {
  if (!props.name) return ''
  return props.name.slice(0, 2)
})

const bgColor = computed(() => {
  const colors = ['#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa']
  const index = (props.name?.charCodeAt(0) || 0) % colors.length
  return colors[index]
})
</script>

<template>
  <div
    class="uikit-avatar"
    :class="`uikit-avatar--${avatarShape}`"
    :style="{ width: `${props.size}px`, height: `${props.size}px`, fontSize: `${props.size * 0.4}px` }"
  >
    <img v-if="props.src" :src="props.src" class="uikit-avatar__img" />
    <span v-else class="uikit-avatar__text" :style="{ backgroundColor: bgColor }">{{ displayName }}</span>
  </div>
</template>

<style scoped>
.uikit-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.uikit-avatar--circle {
  border-radius: 50%;
}

.uikit-avatar--square {
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
</style>
