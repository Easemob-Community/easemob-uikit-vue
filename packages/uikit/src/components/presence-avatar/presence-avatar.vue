<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import EmAvatar from '../avatar/avatar.vue'
import { usePresence } from '../../composables/use-presence'
import { useUIKit } from '../../composables/use-uikit'
import type { PresenceDisplayStatus } from '../avatar/avatar.vue'

export interface PresenceAvatarProps {
  /** 用户 ID，用于自动订阅/拉取在线状态 */
  userId: string
  /** 头像地址 */
  src?: string
  /** 展示名称（无头像时生成占位文字） */
  name?: string
  /** 头像尺寸，默认 40 */
  size?: number
  /** 头像形状，默认跟随主题 */
  shape?: 'circle' | 'square'
  /** 指示器直径（px），默认按头像尺寸自适应 */
  presenceSize?: number
  /** 是否可编辑，点击时触发 presence-click */
  editable?: boolean
}

const props = defineProps<PresenceAvatarProps>()
const emit = defineEmits<{
  (e: 'presence-click'): void
}>()

const { features } = useUIKit()
const { get: getPresence, watch: watchPresence, fetchPresence } = usePresence()

/** 当前用户在线状态 */
const presence = computed<PresenceDisplayStatus | undefined>(() => {
  if (!features.enablePresence)
    return undefined
  return getPresence(props.userId).value?.status as PresenceDisplayStatus | undefined
})

/** 自动订阅该用户在线状态 */
watchPresence(() => (features.enablePresence ? [props.userId] : []))

/** 首次可见/用户变化时兜底拉取一次，确保自定义 dataSource 场景下也有初始数据 */
watchEffect(() => {
  if (!features.enablePresence || !props.userId)
    return
  void fetchPresence([props.userId])
})
</script>

<template>
  <EmAvatar
    :src="props.src"
    :name="props.name"
    :size="props.size"
    :shape="props.shape"
    :presence="presence"
    :presence-size="props.presenceSize"
    :editable="props.editable"
    @presence-click="emit('presence-click')"
  />
</template>
