<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import EmAvatar from '../avatar/avatar.vue'
import PresenceSelectorPopup from '../presence-selector/presence-selector-popup.vue'
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
  /** 是否可编辑，点击时打开在线状态选择 popup */
  editable?: boolean
  /** 弹层相对头像的位置，默认 'bottom' */
  selectorPlacement?: 'bottom' | 'top' | 'left' | 'right'
}

const props = defineProps<PresenceAvatarProps>()
const emit = defineEmits<{
  (e: 'presence-click'): void
  (e: 'presence-changed'): void
}>()

const { features } = useUIKit()
const { get: getPresence, watch: watchPresence, fetchPresence } = usePresence()

const avatarRef = ref<InstanceType<typeof EmAvatar>>()
const showSelector = ref(false)

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

function onPresenceClick() {
  emit('presence-click')
  if (props.editable)
    showSelector.value = true
}

function onSelectorChanged() {
  emit('presence-changed')
  // 变更后刷新当前用户的 presence，确保头像指示器立即更新
  if (features.enablePresence && props.userId)
    void fetchPresence([props.userId])
}
</script>

<template>
  <EmAvatar
    ref="avatarRef"
    :src="props.src"
    :name="props.name"
    :size="props.size"
    :shape="props.shape"
    :presence="presence"
    :presence-size="props.presenceSize"
    :editable="props.editable"
    @presence-click="onPresenceClick"
  />
  <PresenceSelectorPopup
    v-if="props.editable"
    v-model:show="showSelector"
    :anchor="avatarRef?.$el"
    :placement="props.selectorPlacement"
    @changed="onSelectorChanged"
  />
</template>
