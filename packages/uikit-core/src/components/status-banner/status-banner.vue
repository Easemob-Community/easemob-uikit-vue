<script setup lang="ts">
import { computed } from 'vue'
import { useLocale } from '../../locale'
import Icon from '../icon/icon.vue'
import type { StatusBannerType } from './types'

export interface StatusBannerProps {
  /** 横幅类型，决定颜色与默认图标 */
  type?: StatusBannerType
  /** 是否展示 loading 旋转图标 */
  loading?: boolean
  /** 是否可关闭 */
  closable?: boolean
  /** 是否可见，支持 v-model:show */
  show?: boolean
  /** 自定义图标名，格式 "category/icon-name"；不传时按 type 默认 */
  icon?: string
  /** 标题文本 */
  title?: string
  /** 描述/副标题文本 */
  description?: string
  /** 是否可点击（仅影响光标与 hover 反馈，不控制事件） */
  clickable?: boolean
}

export interface StatusBannerEmits {
  /** 关闭按钮被点击时发出（配合 v-model:show 收起横幅），负载为新的可见性值 false */
  (e: 'update:show', value: boolean): void
  /** 关闭按钮被点击时触发，通知业务方横幅已关闭 */
  (e: 'close'): void
  /** 点击横幅主体时触发（clickable 仅影响视觉反馈，事件始终会发出），负载为原生点击事件 MouseEvent */
  (e: 'click', event: MouseEvent): void
}

const props = withDefaults(defineProps<StatusBannerProps>(), {
  type: 'info',
  loading: false,
  closable: false,
  show: true,
  clickable: false,
})

const emit = defineEmits<StatusBannerEmits>()
const { t } = useLocale()

const typeIconMap: Record<StatusBannerType, string> = {
  info: 'status/info',
  warning: 'triangle/exclamation',
  error: 'circle/xmark',
  success: 'circle/checked',
}

const iconName = computed(() => props.icon || typeIconMap[props.type])

function handleClose() {
  emit('update:show', false)
  emit('close')
}

function handleClick(event: MouseEvent) {
  emit('click', event)
}
</script>

<template>
  <Transition name="uikit-status-banner">
    <div
      v-if="props.show"
      class="uikit-status-banner"
      :class="[`uikit-status-banner--${props.type}`, { 'uikit-status-banner--clickable': props.clickable }]"
      role="status"
      @click="handleClick"
    >
      <span class="uikit-status-banner__icon">
        <slot name="icon">
          <Icon v-if="props.loading" name="loading/arc/big" :size="18" anim="spin" />
          <Icon v-else :name="iconName" :size="18" />
        </slot>
      </span>
      <div class="uikit-status-banner__content">
        <slot>
          <div v-if="props.title || $slots.title" class="uikit-status-banner__title">
            <slot name="title">
              {{ props.title }}
            </slot>
          </div>
          <div v-if="props.description || $slots.description" class="uikit-status-banner__description">
            <slot name="description">
              {{ props.description }}
            </slot>
          </div>
        </slot>
      </div>
      <div v-if="$slots.action || props.closable" class="uikit-status-banner__actions">
        <slot name="action" />
        <button
          v-if="props.closable"
          type="button"
          class="uikit-status-banner__close"
          :aria-label="t('button.close')"
          @click.stop="handleClose"
        >
          <Icon name="xmark/light" :size="14" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.uikit-status-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: var(--uikit-banner-padding-y, 8px) var(--uikit-banner-padding-x, 12px);
  border-radius: var(--uikit-components-radius, 8px);
  font-size: var(--uikit-font-size-13, 13px);
  line-height: 1.4;
  cursor: default;
  transition:
    background-color var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease),
    color var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
}

.uikit-status-banner--info {
  background-color: rgba(var(--uikit-info-rgb, 51, 177, 255), 0.08);
  color: var(--uikit-info-color, #3b82f6);
}

.uikit-status-banner--warning {
  background-color: rgba(var(--uikit-warning-rgb, 255, 178, 51), 0.12);
  color: var(--uikit-warning-color, #f59e0b);
}

.uikit-status-banner--error {
  background-color: rgba(var(--uikit-danger-rgb, 255, 51, 68), 0.08);
  color: var(--uikit-danger-color);
}

.uikit-status-banner--success {
  background-color: rgba(var(--uikit-success-rgb, 22, 163, 74), 0.08);
  color: var(--uikit-success-color, #22c55e);
}

.uikit-status-banner--clickable {
  cursor: pointer;
}

@media (hover: hover) {
  .uikit-status-banner--clickable:hover {
    filter: brightness(0.97);
  }
}

.uikit-status-banner__icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.uikit-status-banner__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.uikit-status-banner__title {
  font-weight: 500;
  color: currentColor;
}

.uikit-status-banner__description {
  opacity: 0.85;
  color: currentColor;
}

.uikit-status-banner__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.uikit-status-banner__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: currentColor;
  cursor: pointer;
  opacity: 0.7;
  transition:
    opacity var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease),
    background-color var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
}

@media (hover: hover) {
  .uikit-status-banner__close:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.06);
  }
}

/* 入场/出场动画 */
.uikit-status-banner-enter-active,
.uikit-status-banner-leave-active {
  transition:
    opacity var(--uikit-anim-duration-enter, 350ms) var(--uikit-anim-easing-decel, cubic-bezier(0, 0, 0.2, 1)),
    transform var(--uikit-anim-duration-enter, 350ms) var(--uikit-anim-easing-decel, cubic-bezier(0, 0, 0.2, 1));
}

.uikit-status-banner-enter-from,
.uikit-status-banner-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.uikit-status-banner-enter-to,
.uikit-status-banner-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
