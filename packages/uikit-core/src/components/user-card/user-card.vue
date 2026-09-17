<script setup lang="ts">
import { computed, ref } from 'vue'
import Avatar from '../avatar/avatar.vue'
import Icon from '../icon/icon.vue'
import PresenceSelectorPopup from '../presence-selector/presence-selector-popup.vue'
import CopyableText from '../copyable-text/copyable-text.vue'
import type { PresenceDisplayStatus } from '../avatar/avatar.vue'

export interface UserCardAction {
  key: string
  label: string
  icon?: string
  type?: 'primary' | 'default' | 'danger'
  /** 是否整宽胶囊独占一行（纵向堆叠在横向操作组下方），默认 false 横向一排 */
  block?: boolean
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
  /** 布局：banner（顶部横幅+大头像，默认）/ plain（无横幅，头像与文字水平排列） */
  layout?: 'banner' | 'plain'
  /** 名称下方的副标题行（如 Username），有值才渲染 */
  subtitle?: string
  /** 副标题行前置标签（如 Username），仅 subtitle 有值时随其渲染 */
  subtitleLabel?: string
  /** 用户 ID 行前置标签（如 UserID），有值才渲染 */
  userIdLabel?: string
  /** 用户 ID 是否支持点击复制（展示复制图标），默认 true */
  userIdCopyable?: boolean
  /** 顶部背景图 URL，不传时使用默认渐变（仅 banner 布局生效） */
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
  layout: 'banner',
  userIdCopyable: true,
})

const emit = defineEmits<{
  /** 点击底部操作按钮时触发，负载为按钮对应的 action key */
  (e: 'action-click', key: string): void
  /** 点击信息行时触发（仅当该行 clickable 为 true），负载为行对应的 key */
  (e: 'info-click', key: string): void
  /** 点击头像时触发（不含在线状态指示器点击，避免与 presence-click 重复） */
  (e: 'avatar-click'): void
  /** 点击头像上的在线状态指示器时触发（由 Avatar 内部转发）；editable 时同时弹出在线状态选择器 */
  (e: 'presence-click'): void
  /** 在线状态选择器中成功变更状态后触发（转发 PresenceSelectorPopup 的 changed 事件） */
  (e: 'presence-changed'): void
}>()

const avatarRef = ref<InstanceType<typeof Avatar>>()
const showSelector = ref(false)

/** 横向一排的小胶囊操作 */
const inlineActions = computed(() => props.actions.filter(a => !a.block))
/** 整宽胶囊操作，纵向堆叠在横向操作组下方 */
const blockActions = computed(() => props.actions.filter(a => a.block))

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
  <div class="user-card" :class="`user-card--${props.layout}`">
    <div
      v-if="props.layout === 'banner'"
      class="user-card__banner"
      :class="{ 'user-card__banner--default': !props.banner }"
      :style="props.banner ? { backgroundImage: `url(${props.banner})` } : undefined"
    >
      &nbsp;
    </div>

    <div class="user-card__body">
      <div class="user-card__head">
        <div class="user-card__profile">
          <Avatar
            ref="avatarRef"
            class="user-card__avatar"
            :class="{ 'is-editable': props.editable }"
            :src="props.avatar"
            :name="props.name"
            :size="props.layout === 'plain' ? 40 : 90"
            :presence="props.status"
            :editable="props.editable"
            @presence-click="onPresenceClick"
            @click="onAvatarClick"
          />
          <div class="user-card__meta">
            <div class="user-card__name-row">
              <span class="user-card__name">{{ props.name }}</span>
            </div>
            <div v-if="props.subtitle" class="user-card__subtitle">
              <span v-if="props.subtitleLabel" class="user-card__subtitle-label">{{ props.subtitleLabel }}: </span>
              <span class="user-card__subtitle-value">{{ props.subtitle }}</span>
            </div>
            <div class="user-card__user-id">
              <span v-if="props.userIdLabel" class="user-card__user-id-label">{{ props.userIdLabel }}: </span>
              <CopyableText v-if="props.userIdCopyable" :text="props.userId" />
              <span v-else>{{ props.userId }}</span>
            </div>
          </div>
        </div>

        <!-- #meta-extra：位于 profile 之后、actions 之前，用于注入备注编辑等业务区块 -->
        <slot name="meta-extra" />
      </div>

      <div
        v-if="inlineActions.length"
        class="user-card__actions"
        :class="{ 'user-card__actions--multi': inlineActions.length > 1 }"
      >
        <div
          v-for="action in inlineActions"
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

      <div v-if="blockActions.length" class="user-card__block-actions">
        <div
          v-for="action in blockActions"
          :key="action.key"
          class="user-card__action user-card__action--block"
          :class="`user-card__action--${action.type || 'default'}`"
          @click="onActionClick(action.key)"
        >
          <Icon
            v-if="action.icon"
            :name="action.icon"
            :size="20"
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

/* plain 布局（设计稿 User Card）：无 banner，16px 圆角卡片 + 指定投影 */
.user-card--plain {
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.12);
}

.user-card--plain .user-card__body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 头部组：profile 与 #meta-extra（备注区）连续堆叠，区间距由 body gap 承担 */
.user-card--plain .user-card__head {
  display: flex;
  flex-direction: column;
}

.user-card--plain .user-card__profile {
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
  margin: 0;
}

.user-card--plain .user-card__avatar {
  margin-bottom: 0;
  box-shadow: none;
}

.user-card--plain .user-card__meta {
  flex: 1;
  min-width: 0;
  padding-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-card--plain .user-card__name {
  font-size: var(--uikit-font-size-18);
  font-weight: var(--uikit-font-weight-medium);
}

.user-card--plain .user-card__subtitle,
.user-card--plain .user-card__user-id {
  margin-top: 0;
  font-size: var(--uikit-font-size-12);
  line-height: 16px;
}

.user-card--plain .user-card__subtitle-label,
.user-card--plain .user-card__user-id-label {
  font-weight: var(--uikit-font-weight-medium);
}

.user-card--plain .user-card__actions,
.user-card--plain .user-card__block-actions {
  margin-bottom: 0;
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
  font-weight: var(--uikit-font-weight-semibold);
  color: var(--uikit-text-primary);
  word-break: break-all;
}

.user-card__subtitle {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
  margin-top: 4px;
  word-break: break-all;
}

.user-card__user-id {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
  margin-top: 4px;
  word-break: break-all;
}

.user-card__actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

/* 设计稿：胶囊按钮（radius/full），灰底 + 图标 22 + 文字 medium */
.user-card__action {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 42px;
  box-sizing: border-box;
  padding: 8px 12px;
  border-radius: 999px;
  background-color: var(--uikit-bg-secondary);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .user-card__action:hover {
    background-color: var(--uikit-bg-hover);
  }
}

.user-card__action--primary {
  color: var(--uikit-primary-color, #3b82f6);
}

.user-card__action--danger {
  color: var(--uikit-danger-color);
}

.user-card__action--default {
  color: var(--uikit-text-primary);
}

.user-card__action-icon {
  flex-shrink: 0;
}

.user-card__action-label {
  font-size: var(--uikit-font-size-16);
  font-weight: var(--uikit-font-weight-medium);
  text-align: center;
  line-height: 1.2;
}

/* 多个小胶囊并排时（Chat/Audio/Video）文字降为 14px（设计稿多变体） */
.user-card__actions--multi .user-card__action-label {
  font-size: var(--uikit-font-size-14);
}

.user-card__block-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

/* 整宽胶囊：与抽屉 footer 胶囊按钮（chat-info-drawer pill-btn）及设计稿 btn 组件
   （1994:25152，py-12/16px/500/行高 100%）严格同规格——固定 42px 高，
   避免 label line-height 1.2 把实际高度撑到 43.2px */
.user-card__action--block {
  flex: none;
  height: 42px;
  padding: 12px 4px;
}

.user-card__action--block .user-card__action-label {
  font-size: var(--uikit-font-size-16);
  line-height: normal;
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
