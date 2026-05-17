<script setup lang="ts">
import Popup from '../popup/popup.vue'
import Button from '../button/button.vue'

export interface ModalProps {
  show: boolean
  title?: string
  showCancel?: boolean
  cancelText?: string
  confirmText?: string
  closeOnClickOverlay?: boolean
}

export interface ModalEmits {
  (e: 'update:show', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<ModalProps>(), {
  title: '',
  showCancel: true,
  cancelText: '取消',
  confirmText: '确认',
  closeOnClickOverlay: false,
})

const emit = defineEmits<ModalEmits>()

function onConfirm() {
  emit('confirm')
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
    position="center"
    :close-on-click-overlay="props.closeOnClickOverlay"
    @update:show="(v: boolean) => emit('update:show', v)"
    @close="onCancel"
  >
    <div class="uikit-modal">
      <div v-if="props.title" class="uikit-modal__title">{{ props.title }}</div>
      <div class="uikit-modal__body">
        <slot />
      </div>
      <div class="uikit-modal__footer">
        <Button v-if="props.showCancel" type="default" @click="onCancel">
          {{ props.cancelText }}
        </Button>
        <Button type="primary" @click="onConfirm">
          {{ props.confirmText }}
        </Button>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.uikit-modal {
  width: 300px;
  padding: 20px;
  border-radius: var(--uikit-components-radius, 12px);
}

.uikit-modal__title {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 12px;
  color: var(--uikit-text-primary);
}

.uikit-modal__body {
  font-size: 14px;
  color: var(--uikit-text-secondary);
  text-align: center;
  margin-bottom: 20px;
}

.uikit-modal__footer {
  display: flex;
  gap: 12px;
}

.uikit-modal__footer > * {
  flex: 1;
}
</style>
