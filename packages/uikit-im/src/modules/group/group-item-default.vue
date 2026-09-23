<script setup lang="ts">
import { computed } from 'vue'
import { EmAvatar as Avatar } from '@easemob-community/uikit-core'
import { EmCheckbox as Checkbox } from '@easemob-community/uikit-core'
import { EmCell as Cell } from '@easemob-community/uikit-core'
import type { UiGroup as Group } from '@easemob-community/uikit-core'
import { DEFAULT_GROUP_AVATAR } from '../../assets'
import type { AvatarShape, GroupItemSize } from './types'

interface GroupItemDefaultProps {
  group: Group
  active?: boolean
  selected?: boolean
  /** 是否处于多选模式（左侧展示选择框） */
  showCheckbox?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 是否展示成员数量，默认 true */
  showMemberCount?: boolean
  /** 是否展示群头像，默认 true */
  showAvatar?: boolean
  /** 头像尺寸 */
  avatarSize?: number
  /** 头像形状，默认 rounded（群头像常规） */
  avatarShape?: AvatarShape
  /** 副标题文本 */
  subtitle?: string
  /** Item 尺寸 */
  size?: GroupItemSize
}

const props = withDefaults(defineProps<GroupItemDefaultProps>(), {
  active: false,
  selected: false,
  showCheckbox: false,
  disabled: false,
  showMemberCount: true,
  showAvatar: true,
  avatarShape: undefined,
  size: 'normal',
})

const displayName = computed(() => props.group.groupName || props.group.groupId)

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

const memberCountMeta = computed(() => {
  if (!props.showMemberCount)
    return undefined
  if ((props.group.memberCount ?? 0) <= 0)
    return undefined
  return String(props.group.memberCount)
})
</script>

<template>
  <Cell
    auto-height
    class="group-item-default"
    :title="displayName"
    :subtitle="props.subtitle"
    :meta="memberCountMeta"
    :size="props.size"
    :active="props.active"
    :selected="props.selected"
    :disabled="props.disabled"
  >
    <template #leading>
      <span class="group-item-default__leading">
        <Checkbox v-if="props.showCheckbox" :checked="props.selected" />
        <slot name="avatar" :group="props.group" :size="resolvedAvatarSize">
          <Avatar
            v-if="props.showAvatar"
            :src="props.group.avatar || DEFAULT_GROUP_AVATAR"
            :name="displayName"
            :size="resolvedAvatarSize"
            :shape="resolvedAvatarShape"
          />
        </slot>
      </span>
    </template>

    <template #trailing>
      <span v-if="$slots.extra" class="group-item-default__extra" @click.stop>
        <slot name="extra" :group="props.group" :disabled="props.disabled" />
      </span>
    </template>
  </Cell>
</template>

<style scoped>
/* 与联系人列表项同一排版：群名称 16px/600 */
.group-item-default :deep(.uikit-cell__title) {
  font-size: var(--uikit-font-size-15);
  font-weight: var(--uikit-font-weight-semibold);
}

.group-item-default__leading {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.group-item-default__extra {
  display: inline-flex;
  align-items: center;
}
</style>
