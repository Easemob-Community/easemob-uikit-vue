<script setup lang="ts">
import Popup from '../popup/popup.vue'

export interface ActionSheetItem {
  name: string
  color?: string
  disabled?: boolean
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
  cancelText: '取消',
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
          :style="item.color ? { color: item.color } : undefined"
          @click="onSelect(item, index)"
        >
          {{ item.name }}
        </div>
      </div>
      <div class="uikit-action-sheet__cancel" @click="onCancel">
        {{ props.cancelText }}
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.uikit-action-sheet {
  padding-bottom: env(safe-area-inset-bottom);
}

.uikit-action-sheet__title {
  text-align: center;
  padding: 16px;
  font-size: 14px;
  color: var(--uikit-text-secondary);
  border-bottom: 1px solid #f3f4f6;
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
  transition: background-color 0.15s;
  border-bottom: 1px solid #f3f4f6;
}

.uikit-action-sheet__item:active {
  background-color: #f3f4f6;
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
</style>
