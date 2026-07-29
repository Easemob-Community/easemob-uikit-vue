<script setup lang="ts">
import { computed } from 'vue'
import Avatar from '../../components/avatar/avatar.vue'
import Icon from '../../components/icon/icon.vue'
import Cell from '../../components/cell/cell.vue'
import type { UiGroup as Group } from '../../sdk/types'
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
        <span v-if="props.showCheckbox" class="group-item-default__check">
          <Icon
            :name="props.selected ? 'actions/checked_ellipse' : 'actions/unchecked_ellipse'"
            :size="20"
          />
        </span>
        <slot name="avatar" :group="props.group" :size="resolvedAvatarSize">
          <Avatar
            v-if="props.showAvatar"
            :src="props.group.avatar"
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
.group-item-default__leading {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.group-item-default__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--uikit-text-secondary);
}

.group-item-default.is-selected .group-item-default__check {
  color: var(--uikit-primary, #155eef);
}

.group-item-default__extra {
  display: inline-flex;
  align-items: center;
}
</style>
