<script setup lang="ts">
import Popup from '../popup/popup.vue'
import Button from '../button/button.vue'
import { t } from '../../locale'

export interface ModalProps {
  /** 是否显示弹窗（v-model:show 受控） */
  show: boolean
  /** 弹窗标题，为空时不渲染标题区域 */
  title?: string
  /** 是否显示「取消」按钮，默认 true */
  showCancel?: boolean
  /** 「取消」按钮文案，默认按当前语言显示「取消」 */
  cancelText?: string
  /** 「确认」按钮文案，默认按当前语言显示「确认」 */
  confirmText?: string
  /** 点击遮罩是否关闭弹窗，默认 false（需通过按钮或 ESC 关闭） */
  closeOnClickOverlay?: boolean
}

export interface ModalEmits {
  /** 显示状态变化时触发（确认/取消/遮罩或 ESC 关闭），负载为最新显示状态，供 v-model:show 双向同步 */
  (e: 'update:show', value: boolean): void
  /** 点击「确认」按钮时触发（随后自动关闭弹窗） */
  (e: 'confirm'): void
  /** 点击「取消」按钮、遮罩或按 ESC 关闭时触发（随后自动关闭弹窗） */
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<ModalProps>(), {
  title: '',
  showCancel: true,
  cancelText: t('button.cancel', '取消'),
  confirmText: t('button.confirm', '确认'),
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
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  text-align: center;
  margin-bottom: 12px;
  color: var(--uikit-text-primary);
}

.uikit-modal__body {
  font-size: var(--uikit-font-size-14);
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
