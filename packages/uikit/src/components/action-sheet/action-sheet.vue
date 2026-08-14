<script setup lang="ts">
import Popup from '../popup/popup.vue'
import Icon from '../icon/icon.vue'
import { t } from '../../locale'

export interface ActionSheetItem {
  name: string
  color?: string
  disabled?: boolean
  icon?: string
}

export interface ActionSheetProps {
  /** 是否显示操作面板，控制底部弹层开合；配合 v-model:show 使用 */
  show: boolean
  /** 顶部标题文案，为空时不渲染标题栏 */
  title?: string
  /** 操作项列表，每项渲染为一行可点击操作；disabled 项点击不触发 select */
  actions: ActionSheetItem[]
  /** 底部取消按钮文案，默认取 i18n 的「取消」 */
  cancelText?: string
}

export interface ActionSheetEmits {
  /** 显隐状态变化时触发（选中操作项 / 取消 / 遮罩关闭均携带 false），用于 v-model:show 同步 */
  (e: 'update:show', value: boolean): void
  /** 点击非禁用操作项时触发，负载为选中项对象与其下标 index */
  (e: 'select', item: ActionSheetItem, index: number): void
  /** 点击底部取消按钮或弹层关闭（如点击遮罩）时触发 */
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<ActionSheetProps>(), {
  title: '',
  cancelText: t('button.cancel', '取消'),
})

const emit = defineEmits<ActionSheetEmits>()

function onSelect(item: ActionSheetItem, index: number) {
  if (item.disabled)
    return
  emit('select', item, index)
  emit('update:show', false)
}

function onCancel() {
  emit('cancel')
  emit('update:show', false)
}
</script>

<template>
  <Popup
    :show="props.show"
    position="bottom"
    :close-on-click-overlay="true"
    @update:show="(v: boolean) => emit('update:show', v)"
    @close="onCancel"
  >
    <div class="uikit-action-sheet">
      <div v-if="props.title" class="uikit-action-sheet__title">{{ props.title }}</div>
      <div class="uikit-action-sheet__actions">
        <div
          v-for="(item, index) in props.actions"
          :key="index"
          class="uikit-action-sheet__item"
          :class="{ 'uikit-action-sheet__item--disabled': item.disabled }"
          :style="{ ...item.color ? { color: item.color } : {}, animationDelay: `calc(var(--uikit-anim-stagger-delay) * ${index})` }"
          @click="onSelect(item, index)"
        >
          <Transition name="uikit-icon-swap" mode="out-in">
            <Icon v-if="item.icon" :key="item.icon" :name="item.icon" :size="16" />
          </Transition>
          <span>{{ item.name }}</span>
        </div>
      </div>
      <div class="uikit-action-sheet__extra">
        <slot />
      </div>
      <div class="uikit-action-sheet__cancel" @click="onCancel">
        {{ props.cancelText }}
      </div>
    </div>
  </Popup>
</template>

<style scoped>
/* safe-bottom 由 Popup position="bottom" 统一处理，这里不再重复 env() */
.uikit-action-sheet__title {
  text-align: center;
  padding: 16px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
  border-bottom: 1px solid var(--uikit-border-light);
}

.uikit-action-sheet__actions {
  display: flex;
  flex-direction: column;
}

.uikit-action-sheet__item {
  padding: 16px;
  text-align: center;
  font-size: var(--uikit-font-size-16);
  color: var(--uikit-text-primary);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
  border-bottom: 1px solid var(--uikit-border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  /* 交错出场动画 */
  animation: uikit-action-item-in var(--uikit-anim-duration-enter) var(--uikit-anim-easing-decel) both;
}

.uikit-action-sheet__item:active {
  background-color: var(--uikit-bg-secondary);
}

.uikit-action-sheet__item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.uikit-action-sheet__extra {
  display: flex;
  flex-direction: column;
}

.uikit-action-sheet__cancel {
  margin-top: 8px;
  padding: 16px;
  text-align: center;
  font-size: var(--uikit-font-size-16);
  color: var(--uikit-text-primary);
  cursor: pointer;
  background-color: var(--uikit-bg-secondary);
  font-weight: 500;
}

.uikit-action-sheet__cancel:active {
  opacity: 0.8;
}

/* 操作项图标状态切换过渡（如免打扰 bell ↔ bell_slash） */
.uikit-icon-swap-enter-active,
.uikit-icon-swap-leave-active {
  transition:
    opacity var(--uikit-anim-duration) var(--uikit-anim-easing),
    transform var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.uikit-icon-swap-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.6);
}

.uikit-icon-swap-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.6);
}

/* 交错出场关键帧 */
@keyframes uikit-action-item-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
