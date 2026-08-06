<script setup lang="ts">
import { computed, ref } from 'vue'
import Avatar from '../avatar/avatar.vue'
import Icon from '../icon/icon.vue'
import PresenceSelectorPopup from '../presence-selector/presence-selector-popup.vue'
import CopyableText from '../copyable-text/copyable-text.vue'
import { useLocale } from '../../locale'
import type { PresenceDisplayStatus } from '../avatar/avatar.vue'

export interface UserCardAction {
  key: string
  label: string
  icon?: string
  type?: 'primary' | 'default' | 'danger'
}

export interface UserCardInfoRow {
  key: string
  label: string
  value: string
  clickable?: boolean
  /** 是否展示复制图标并支持一键复制 value */
  copyable?: boolean
}

export interface UserCardProps {
  /** 用户 ID */
  userId: string
  /** 展示名称 */
  name: string
  /** 头像 URL */
  avatar?: string
  /** 顶部背景图 URL，不传时使用默认渐变 */
  banner?: string
  /** 在线状态 */
  status?: PresenceDisplayStatus
  /** 头像是否可编辑（用于当前用户变更在线状态），默认 false */
  editable?: boolean
  /** 弹层相对头像的位置，默认 'bottom' */
  selectorPlacement?: 'bottom' | 'top' | 'left' | 'right'
  /** 底部操作按钮 */
  actions?: UserCardAction[]
  /** 信息行 */
  infoRows?: UserCardInfoRow[]
}

const props = withDefaults(defineProps<UserCardProps>(), {
  actions: () => [],
  infoRows: () => [],
  editable: false,
})

const emit = defineEmits<{
  (e: 'action-click', key: string): void
  (e: 'info-click', key: string): void
  (e: 'avatar-click'): void
  (e: 'presence-click'): void
  (e: 'presence-changed'): void
}>()

const { t } = useLocale()

const avatarRef = ref<InstanceType<typeof Avatar>>()
const showSelector = ref(false)

const statusText = computed(() => {
  const map: Record<PresenceDisplayStatus, string> = {
    online: t('userCard.online', '在线'),
    offline: t('userCard.offline', '离线'),
    away: t('presence.away', '离开'),
    busy: t('presence.busy', '忙碌'),
    custom: t('presence.custom', '自定义'),
  }
  return props.status ? map[props.status] : ''
})

function onActionClick(key: string) {
  emit('action-click', key)
}

function onInfoClick(row: UserCardInfoRow) {
  if (row.clickable)
    emit('info-click', row.key)
}

function onAvatarClick() {
  // presence-click 由 Avatar 内部（editable 时点击）已 emit，经模板 @presence-click 转发，
  // 这里只转发 avatar-click，避免一次点击重复触发 presence-click
  emit('avatar-click')
}

function onPresenceClick() {
  emit('presence-click')
  if (props.editable)
    showSelector.value = true
}

function onSelectorChanged() {
  emit('presence-changed')
}
</script>

<template>
  <div class="user-card">
    <div
      class="user-card__banner"
      :class="{ 'user-card__banner--default': !props.banner }"
      :style="props.banner ? { backgroundImage: `url(${props.banner})` } : undefined"
    >
      &nbsp;
    </div>

    <div class="user-card__body">
      <div class="user-card__profile">
        <Avatar
          ref="avatarRef"
          class="user-card__avatar"
          :class="{ 'is-editable': props.editable }"
          :src="props.avatar"
          :name="props.name"
          :size="90"
          :presence="props.status"
          :editable="props.editable"
          @presence-click="onPresenceClick"
          @click="onAvatarClick"
        />
        <div class="user-card__meta">
          <div class="user-card__name-row">
            <span class="user-card__name">{{ props.name }}</span>
            <span
              v-if="props.status"
              class="user-card__status"
              :class="`user-card__status--${props.status}`"
            >
              <span class="user-card__status-dot" />
              {{ statusText }}
            </span>
          </div>
          <div class="user-card__user-id">
            <CopyableText :text="props.userId" />
          </div>
        </div>
      </div>

      <div v-if="props.actions.length" class="user-card__actions">
        <div
          v-for="action in props.actions"
          :key="action.key"
          class="user-card__action"
          :class="`user-card__action--${action.type || 'default'}`"
          @click="onActionClick(action.key)"
        >
          <Icon
            v-if="action.icon"
            :name="action.icon"
            :size="22"
            class="user-card__action-icon"
          />
          <span class="user-card__action-label">{{ action.label }}</span>
        </div>
      </div>

      <div v-if="props.infoRows.length" class="user-card__info">
        <div
          v-for="row in props.infoRows"
          :key="row.key"
          class="user-card__row"
          :class="{ 'user-card__row--clickable': row.clickable }"
          @click="onInfoClick(row)"
        >
          <span class="user-card__label">{{ row.label }}</span>
          <CopyableText
            v-if="row.copyable"
            class="user-card__value"
            :text="row.value"
          />
          <span v-else class="user-card__value">{{ row.value }}</span>
        </div>
      </div>

      <slot />
    </div>

    <PresenceSelectorPopup
      v-if="props.editable"
      v-model:show="showSelector"
      :anchor="avatarRef?.$el"
      :placement="props.selectorPlacement"
      @changed="onSelectorChanged"
    />
  </div>
</template>

<style scoped>
.user-card {
  width: 100%;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 12px);
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}

.user-card__banner {
  width: 100%;
  height: 140px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.user-card__banner--default {
  background: linear-gradient(135deg, #4f8cff 0%, #2b6bf3 60%, #7a5cff 100%);
}

.user-card__body {
  padding: 0 20px 20px;
}

.user-card__profile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-top: -45px;
  margin-bottom: 20px;
}

.user-card__avatar {
  flex-shrink: 0;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.user-card__avatar.is-editable {
  cursor: pointer;
}

.user-card__meta {
  padding-bottom: 8px;
  overflow: hidden;
}

.user-card__name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.user-card__name {
  font-size: var(--uikit-font-size-22);
  font-weight: 600;
  color: var(--uikit-text-primary);
  word-break: break-all;
}

.user-card__status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: var(--uikit-bg-secondary);
}

.user-card__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--uikit-text-tertiary);
}

.user-card__status--online .user-card__status-dot {
  background-color: var(--uikit-success-color);
}

.user-card__status--away .user-card__status-dot {
  background-color: var(--uikit-warning-color);
}

.user-card__status--busy .user-card__status-dot {
  background-color: var(--uikit-danger-color);
}

.user-card__status--offline .user-card__status-dot,
.user-card__status--custom .user-card__status-dot {
  background-color: var(--uikit-text-tertiary);
}

.user-card__user-id {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
  margin-top: 4px;
  word-break: break-all;
}

.user-card__actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.user-card__action {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 4px;
  border-radius: var(--uikit-components-radius);
  background-color: var(--uikit-bg-secondary);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.user-card__action:hover {
  background-color: var(--uikit-bg-hover);
}

.user-card__action--primary {
  color: var(--uikit-primary-color, #3b82f6);
}

.user-card__action--danger {
  color: var(--uikit-danger-color, #ef4444);
}

.user-card__action--default {
  color: var(--uikit-text-primary);
}

.user-card__action-icon {
  flex-shrink: 0;
}

.user-card__action-label {
  font-size: var(--uikit-font-size-13);
}

.user-card__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-card__row {
  display: flex;
  align-items: center;
  min-height: 44px;
  gap: 16px;
}

.user-card__row--clickable {
  cursor: pointer;
}

.user-card__label {
  flex: 0 0 80px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
}

.user-card__value {
  flex: 1;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-primary-color, #3b82f6);
  word-break: break-all;
}

.user-card__row:not(.user-card__row--clickable) .user-card__value {
  color: var(--uikit-text-primary);
}
</style>
