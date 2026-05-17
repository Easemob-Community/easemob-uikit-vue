<script setup lang="ts">
import { computed } from 'vue'
import Avatar from '../../components/avatar/avatar.vue'
import Icon from '../../components/icon/icon.vue'
import type { Contact } from '../../store/contact'
import type { ContactItemSize, OnlineStatus, AvatarShape } from './types'

const props = withDefaults(defineProps<{
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
}>(), {
  active: false,
  selected: false,
  showCheckbox: false,
  disabled: false,
  showAvatar: true,
  avatarShape: 'circle',
  size: 'normal',
})

const displayName = computed(() => props.contact.remark || props.contact.name || props.contact.userId)

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
  <div class="contact-item-default" :class="rootClass">
    <span v-if="props.showCheckbox" class="contact-item-default__check">
      <Icon
        :name="props.selected ? 'actions/checked_ellipse' : 'actions/unchecked_ellipse'"
        :size="20"
      />
    </span>
    <span v-if="props.showAvatar" class="contact-item-default__avatar-wrap">
      <slot name="avatar" :contact="props.contact" :size="resolvedAvatarSize">
        <Avatar
          class="contact-item-default__avatar"
          :class="`shape-${props.avatarShape}`"
          :src="props.contact.avatar"
          :name="displayName"
          :size="resolvedAvatarSize"
        />
      </slot>
      <span
        v-if="props.onlineStatus"
        class="contact-item-default__status"
        :class="`status-${props.onlineStatus}`"
      />
    </span>
    <span class="contact-item-default__main">
      <span class="contact-item-default__name">{{ displayName }}</span>
      <span v-if="props.subtitle" class="contact-item-default__subtitle">{{ props.subtitle }}</span>
    </span>
    <span v-if="$slots.extra" class="contact-item-default__extra" @click.stop>
      <slot name="extra" :contact="props.contact" :disabled="props.disabled" />
    </span>
  </div>
</template>

<style scoped>
.contact-item-default {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 var(--uikit-item-hover-padding-x, 16px);
  margin: 0 var(--uikit-item-hover-margin-x, 0px);
  height: var(--contact-item-height, 56px);
  cursor: pointer;
  transition: background-color 0.15s, opacity 0.15s;
  border-radius: var(--uikit-item-hover-radius, 0px);
}

.contact-item-default.size-compact {
  height: var(--contact-item-height-compact, 48px);
  padding: 0 calc(var(--uikit-item-hover-padding-x, 16px) - 4px);
  gap: 10px;
}

.contact-item-default.size-large,
.contact-item-default.has-subtitle {
  height: var(--contact-item-height-large, 64px);
}

.contact-item-default:hover {
  background-color: var(--uikit-bg-secondary);
  border-radius: var(--uikit-item-hover-radius, 0px);
}

.contact-item-default.is-active {
  background-color: var(--contact-active-bg, var(--uikit-bg-secondary));
  border-radius: var(--uikit-item-active-radius, 0px);
}

.contact-item-default.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.contact-item-default.is-disabled:hover {
  background-color: transparent;
}

.contact-item-default__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--uikit-text-secondary);
}

.contact-item-default.is-selected .contact-item-default__check {
  color: var(--uikit-primary, #155EEF);
}

.contact-item-default__avatar-wrap {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
}

.contact-item-default__avatar.shape-rounded :deep(.avatar) {
  border-radius: 8px;
}

.contact-item-default__avatar.shape-square :deep(.avatar) {
  border-radius: 4px;
}

.contact-item-default__status {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--uikit-bg-base, #fff);
  background-color: var(--uikit-text-tertiary, #c0c4cc);
}

.contact-item-default__status.status-online { background-color: #22c55e; }
.contact-item-default__status.status-away { background-color: #f59e0b; }
.contact-item-default__status.status-busy { background-color: #ef4444; }
.contact-item-default__status.status-offline { background-color: #94a3b8; }

.contact-item-default__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  gap: 2px;
}

.contact-item-default__name {
  font-size: 14px;
  color: var(--uikit-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-item-default__subtitle {
  font-size: 12px;
  color: var(--uikit-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-item-default__extra {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
}
</style>
