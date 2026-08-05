<script setup lang="ts">
import Avatar from '../avatar/avatar.vue'
import Icon from '../icon/icon.vue'
import CopyableText from '../copyable-text/copyable-text.vue'

export interface GroupCardAction {
  key: string
  label: string
  icon?: string
  type?: 'primary' | 'default' | 'danger'
}

export interface GroupCardInfoRow {
  key: string
  label: string
  value: string
  /** 是否展示复制图标并支持一键复制 value */
  copyable?: boolean
}

export interface GroupCardProps {
  /** 群 ID */
  groupId: string
  /** 群名称 */
  name: string
  /** 群头像 URL */
  avatar?: string
  /** 顶部背景图 URL，不传时使用默认渐变 */
  banner?: string
  /** 底部操作按钮 */
  actions?: GroupCardAction[]
  /** 信息行 */
  infoRows?: GroupCardInfoRow[]
}

const props = withDefaults(defineProps<GroupCardProps>(), {
  actions: () => [],
  infoRows: () => [],
})

const emit = defineEmits<{
  (e: 'action-click', key: string): void
}>()

function onActionClick(key: string) {
  emit('action-click', key)
}
</script>

<template>
  <div class="group-card">
    <div
      class="group-card__banner"
      :class="{ 'group-card__banner--default': !props.banner }"
      :style="props.banner ? { backgroundImage: `url(${props.banner})` } : undefined"
    >
      &nbsp;
    </div>

    <div class="group-card__body">
      <div class="group-card__profile">
        <Avatar
          class="group-card__avatar"
          :src="props.avatar"
          :name="props.name"
          :size="90"
        />
        <div class="group-card__meta">
          <div class="group-card__name">
            <slot name="name">
              {{ props.name }}
            </slot>
          </div>
          <div class="group-card__group-id">
            <CopyableText :text="props.groupId" />
          </div>
        </div>
      </div>

      <div v-if="props.actions.length" class="group-card__actions">
        <div
          v-for="action in props.actions"
          :key="action.key"
          class="group-card__action"
          :class="`group-card__action--${action.type || 'default'}`"
          @click="onActionClick(action.key)"
        >
          <Icon
            v-if="action.icon"
            :name="action.icon"
            :size="22"
            class="group-card__action-icon"
          />
          <span class="group-card__action-label">{{ action.label }}</span>
        </div>
      </div>

      <div v-if="props.infoRows.length" class="group-card__info">
        <div
          v-for="row in props.infoRows"
          :key="row.key"
          class="group-card__row"
        >
          <span class="group-card__label">{{ row.label }}</span>
          <CopyableText
            v-if="row.copyable"
            class="group-card__value"
            :text="row.value"
          />
          <span v-else class="group-card__value">{{ row.value }}</span>
        </div>
      </div>

      <slot />
    </div>
  </div>
</template>

<style scoped>
.group-card {
  width: 100%;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 12px);
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}

.group-card__banner {
  width: 100%;
  height: 140px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.group-card__banner--default {
  background: linear-gradient(135deg, #7a5cff 0%, #2b6bf3 60%, #4f8cff 100%);
}

.group-card__body {
  padding: 0 20px 20px;
}

.group-card__profile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-top: -45px;
  margin-bottom: 20px;
}

.group-card__avatar {
  flex-shrink: 0;
  margin-bottom: 12px;
  border: 5px solid var(--uikit-bg-base);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.group-card__meta {
  padding-bottom: 8px;
  overflow: hidden;
}

.group-card__name {
  font-size: 22px;
  font-weight: 600;
  color: var(--uikit-text-primary);
  word-break: break-all;
}

.group-card__group-id {
  font-size: 13px;
  color: var(--uikit-text-secondary);
  margin-top: 4px;
  word-break: break-all;
}

.group-card__actions {
  display: flex;
  justify-content: space-evenly;
  gap: 12px;
  margin-bottom: 20px;
}

.group-card__action {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 120px;
  padding: 10px 28px;
  border-radius: var(--uikit-components-radius, 12px);
  background-color: var(--uikit-bg-secondary);
  cursor: pointer;
  transition: background-color 150ms ease;
}

.group-card__action:hover {
  background-color: var(--uikit-bg-hover);
}

.group-card__action--primary {
  color: var(--uikit-primary-color, #3b82f6);
}

.group-card__action--danger {
  color: #ef4444;
}

.group-card__action--default {
  color: var(--uikit-text-primary);
}

.group-card__action-icon {
  flex-shrink: 0;
}

.group-card__action-label {
  font-size: 13px;
}

.group-card__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-card__row {
  display: flex;
  align-items: center;
  min-height: 44px;
  gap: 16px;
}

.group-card__label {
  flex: 0 0 80px;
  font-size: 14px;
  color: var(--uikit-text-secondary);
}

.group-card__value {
  flex: 1;
  font-size: 14px;
  color: var(--uikit-text-primary);
  word-break: break-all;
}
</style>
