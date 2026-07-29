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
  show: boolean
  title?: string
  actions: ActionSheetItem[]
  cancelText?: string
}

export interface ActionSheetEmits {
  (e: 'update:show', value: boolean): void
  (e: 'select', item: ActionSheetItem, index: number): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<ActionSheetProps>(), {
  title: '',
  cancelText: t('button.cancel', '取消'),
})

const emit = defineEmits<ActionSheetEmits>()

function onSelect(item: ActionSheetItem, index: number) {
  if (item.disabled) return
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
          <Icon v-if="item.icon" :name="item.icon" :size="16" />
          <span>{{ item.name }}</span>
        </div>
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
  font-size: 14px;
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
  font-size: 16px;
  color: var(--uikit-text-primary);
  cursor: pointer;
  transition: background-color 150ms var(--uikit-anim-easing);
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

.uikit-action-sheet__cancel {
  margin-top: 8px;
  padding: 16px;
  text-align: center;
  font-size: 16px;
  color: var(--uikit-text-primary);
  cursor: pointer;
  background-color: var(--uikit-bg-secondary);
  font-weight: 500;
}

.uikit-action-sheet__cancel:active {
  opacity: 0.8;
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
