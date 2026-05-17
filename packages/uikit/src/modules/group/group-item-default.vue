<script setup lang="ts">
import { computed } from 'vue'
import Avatar from '../../components/avatar/avatar.vue'
import Icon from '../../components/icon/icon.vue'
import type { Group } from '../../store/group'
import type { GroupItemSize, AvatarShape } from './types'

const props = withDefaults(defineProps<{
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
}>(), {
  active: false,
  selected: false,
  showCheckbox: false,
  disabled: false,
  showMemberCount: true,
  showAvatar: true,
  avatarShape: 'rounded',
  size: 'normal',
})

const displayName = computed(() => props.group.groupName || props.group.groupId)

const resolvedAvatarSize = computed(() => {
  if (props.avatarSize) return props.avatarSize
  if (props.size === 'compact') return 32
  if (props.size === 'large') return 48
  return 40
})

const rootClass = computed(() => ({
  'is-active': props.active,
  'is-selected': props.selected,
  'is-disabled': props.disabled,
  [`size-${props.size}`]: true,
  'has-subtitle': !!props.subtitle,
}))
</script>

<template>
  <div class="group-item-default" :class="rootClass">
    <span v-if="props.showCheckbox" class="group-item-default__check">
      <Icon
        :name="props.selected ? 'actions/checked_ellipse' : 'actions/unchecked_ellipse'"
        :size="20"
      />
    </span>
    <span v-if="props.showAvatar" class="group-item-default__avatar-wrap">
      <slot name="avatar" :group="props.group" :size="resolvedAvatarSize">
        <Avatar
          class="group-item-default__avatar"
          :class="`shape-${props.avatarShape}`"
          :src="props.group.avatar"
          :name="displayName"
          :size="resolvedAvatarSize"
        />
      </slot>
    </span>
    <span class="group-item-default__main">
      <span class="group-item-default__row">
        <span class="group-item-default__name">{{ displayName }}</span>
        <span
          v-if="props.showMemberCount && (props.group.memberCount ?? 0) > 0"
          class="group-item-default__meta"
        >
          {{ props.group.memberCount }}
        </span>
      </span>
      <span v-if="props.subtitle" class="group-item-default__subtitle">{{ props.subtitle }}</span>
    </span>
    <span v-if="$slots.extra" class="group-item-default__extra" @click.stop>
      <slot name="extra" :group="props.group" :disabled="props.disabled" />
    </span>
  </div>
</template>

<style scoped>
.group-item-default {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 var(--uikit-item-hover-padding-x, 16px);
  margin: 0 var(--uikit-item-hover-margin-x, 0px);
  height: var(--group-item-height, 56px);
  cursor: pointer;
  transition: background-color 0.15s, opacity 0.15s;
  border-radius: var(--uikit-item-hover-radius, 0px);
}

.group-item-default.size-compact {
  height: var(--group-item-height-compact, 48px);
  padding: 0 calc(var(--uikit-item-hover-padding-x, 16px) - 4px);
  gap: 10px;
}

.group-item-default.size-large,
.group-item-default.has-subtitle {
  height: var(--group-item-height-large, 64px);
}

.group-item-default:hover {
  background-color: var(--uikit-bg-secondary);
  border-radius: var(--uikit-item-hover-radius, 0px);
}

.group-item-default.is-active {
  background-color: var(--group-active-bg, var(--uikit-bg-secondary));
  border-radius: var(--uikit-item-active-radius, 0px);
}

.group-item-default.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.group-item-default.is-disabled:hover {
  background-color: transparent;
}

.group-item-default__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--uikit-text-secondary);
}

.group-item-default.is-selected .group-item-default__check {
  color: var(--uikit-primary, #155EEF);
}

.group-item-default__avatar-wrap {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
}

.group-item-default__avatar.shape-circle :deep(.avatar) {
  border-radius: 50%;
}

.group-item-default__avatar.shape-rounded :deep(.avatar) {
  border-radius: 8px;
}

.group-item-default__avatar.shape-square :deep(.avatar) {
  border-radius: 4px;
}

.group-item-default__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  gap: 2px;
}

.group-item-default__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.group-item-default__name {
  flex: 1;
  font-size: 14px;
  color: var(--uikit-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-item-default__meta {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

.group-item-default__subtitle {
  font-size: 12px;
  color: var(--uikit-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-item-default__extra {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
}
</style>
