<script setup lang="ts">
import { computed } from 'vue'
import { EmAvatar as Avatar } from '@easemob/uikit-core'
import { EmIcon as Icon } from '@easemob/uikit-core'
import { EmCell as Cell } from '@easemob/uikit-core'
import { useUserInfo } from '../../composables/use-user-info'
import type { UiContact as Contact } from '@easemob/uikit-core'
import type { AvatarShape, ContactItemSize, OnlineStatus } from './types'

interface ContactItemDefaultProps {
  contact: Contact
  active?: boolean
  selected?: boolean
  /** 是否处于多选模式（左侧展示选择框） */
  showCheckbox?: boolean
  /** 是否禁用（半透明 + 不响应 hover/click 视觉） */
  disabled?: boolean
  /** 是否展示头像，默认 true */
  showAvatar?: boolean
  /** 头像尺寸（px），默认根据 size 推断 */
  avatarSize?: number
  /** 头像形状，默认 circle */
  avatarShape?: AvatarShape
  /** 副标题文本（双行排版） */
  subtitle?: string
  /** 在线状态（小圆点显示），传入则展示 */
  onlineStatus?: OnlineStatus
  /** 紧凑/正常/大尺寸，默认 normal */
  size?: ContactItemSize
  /** 是否可点击（影响 hover 背景），默认 true */
  clickable?: boolean
}

const props = withDefaults(defineProps<ContactItemDefaultProps>(), {
  active: false,
  selected: false,
  showCheckbox: false,
  disabled: false,
  showAvatar: true,
  avatarShape: undefined,
  size: 'normal',
  clickable: true,
})

const { userInfo, avatarUrl, displayName: userInfoDisplayName } = useUserInfo(() => props.contact.userId)

const displayName = computed(() =>
  props.contact.remark || userInfoDisplayName.value || props.contact.name || props.contact.userId,
)

const displayAvatar = computed(() =>
  props.contact.avatar || avatarUrl.value || userInfo.value?.avatarUrl,
)

const resolvedAvatarSize = computed(() => {
  if (props.avatarSize)
    return props.avatarSize
  if (props.size === 'compact')
    return 32
  if (props.size === 'large')
    return 56
  return 48
})

/** Avatar 组件仅支持 circle / square；rounded 与 square 视觉一致（8px 圆角）。
 *  未传入 shape 时返回 undefined，由 Avatar 组件读取主题配置。 */
const resolvedAvatarShape = computed(() => {
  if (props.avatarShape === 'circle')
    return 'circle'
  if (props.avatarShape === 'rounded' || props.avatarShape === 'square')
    return 'square'
  return undefined
})
</script>

<template>
  <Cell
    auto-height
    class="contact-item-default"
    :title="displayName"
    :subtitle="props.subtitle"
    :size="props.size"
    :active="props.active"
    :selected="props.selected"
    :disabled="props.disabled"
    :clickable="props.clickable"
  >
    <template #leading>
      <span class="contact-item-default__leading">
        <span v-if="props.showCheckbox" class="contact-item-default__check">
          <Icon
            :name="props.selected ? 'actions/checked_ellipse' : 'actions/unchecked_ellipse'"
            :size="20"
          />
        </span>
        <slot name="avatar" :contact="props.contact" :size="resolvedAvatarSize">
          <Avatar
            v-if="props.showAvatar"
            :src="displayAvatar"
            :name="displayName"
            :size="resolvedAvatarSize"
            :shape="resolvedAvatarShape"
            :presence="props.onlineStatus"
          />
        </slot>
      </span>
    </template>

    <template #trailing>
      <span v-if="$slots.extra" class="contact-item-default__extra" @click.stop>
        <slot name="extra" :contact="props.contact" :disabled="props.disabled" />
      </span>
    </template>
  </Cell>
</template>

<style scoped>
.contact-item-default__leading {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.contact-item-default__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--uikit-text-secondary);
}

.contact-item-default.is-selected .contact-item-default__check {
  color: var(--uikit-primary, #155eef);
}

.contact-item-default__extra {
  display: inline-flex;
  align-items: center;
}
</style>
