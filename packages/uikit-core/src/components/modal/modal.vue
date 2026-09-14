<script setup lang="ts">
import { computed } from 'vue'
import Popup from '../popup/popup.vue'
import Button from '../button/button.vue'
import Icon from '../icon/icon.vue'
import IconButton from '../icon-button/icon-button.vue'
import { t } from '../../locale'
import { useViewport } from '../../composables/use-viewport'

export interface ModalProps {
  /** 是否显示弹窗（v-model:show 受控） */
  show: boolean
  /** 弹窗标题，为空时不渲染标题文本（showClose 为 true 时 header 行仍保留） */
  title?: string
  /** 标题对齐方式：left（默认，设计稿形态）/ center */
  titleAlign?: 'left' | 'center'
  /** 是否显示右上角关闭按钮，默认 true */
  showClose?: boolean
  /** 是否显示 header 下分割线，默认 true */
  showHeaderDivider?: boolean
  /** 弹窗宽度（px），默认 420；弹层整体仍受 90vw 上限约束 */
  width?: number
  /** 正文对齐方式：left（默认）/ center（Text-Icon 居中变体） */
  contentAlign?: 'left' | 'center'
  /** 正文图标名（Text-Icon 模式），格式 "category/icon-name"，如 "circle/bang"；也可用 #icon 插槽接管 */
  icon?: string
  /** 是否显示底部按钮区，默认 true；列表/搜索类弹窗可置 false 并用默认插槽自绘内容 */
  showFooter?: boolean
  /** 底部按钮布局：right（默认，右对齐 pill 按钮）/ stretch（等宽铺满，兼容旧形态） */
  footerAlign?: 'right' | 'stretch'
  /** 是否显示「取消」按钮，默认 true */
  showCancel?: boolean
  /** 「取消」按钮文案，默认按当前语言显示「取消」 */
  cancelText?: string
  /** 「确认」按钮文案，默认按当前语言显示「确认」 */
  confirmText?: string
  /** 点击遮罩是否关闭弹窗，默认 false（需通过按钮或 ESC 关闭） */
  closeOnClickOverlay?: boolean
  /** 弹窗类型：default（默认）/ danger（危险操作，确认按钮变红色） */
  type?: 'default' | 'danger'
}

export interface ModalEmits {
  /** 显示状态变化时触发（确认/取消/遮罩或 ESC 关闭），负载为最新显示状态，供 v-model:show 双向同步 */
  (e: 'update:show', value: boolean): void
  /** 点击「确认」按钮时触发（随后自动关闭弹窗） */
  (e: 'confirm'): void
  /** 点击「取消」按钮、右上角关闭、遮罩或按 ESC 关闭时触发（随后自动关闭弹窗） */
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<ModalProps>(), {
  title: '',
  titleAlign: 'left',
  showClose: true,
  showHeaderDivider: true,
  width: 420,
  contentAlign: 'left',
  icon: '',
  showFooter: true,
  footerAlign: 'right',
  showCancel: true,
  cancelText: t('button.cancel', '取消'),
  confirmText: t('button.confirm', '确认'),
  closeOnClickOverlay: false,
  type: 'default',
})

const emit = defineEmits<ModalEmits>()

const { isMobile } = useViewport()
const popupPosition = computed(() => (isMobile.value ? 'bottom' : 'center'))

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
    :position="popupPosition"
    :shell="isMobile"
    :close-on-click-overlay="props.closeOnClickOverlay"
    @update:show="(v: boolean) => emit('update:show', v)"
    @close="onCancel"
  >
    <div
      class="uikit-modal"
      :class="{ 'uikit-modal--mobile': isMobile }"
      :style="isMobile ? undefined : { width: `${props.width}px` }"
    >
      <div
        v-if="props.title || $slots.title || props.showClose"
        class="uikit-modal__header"
        :class="[
          `uikit-modal__header--${props.titleAlign}`,
          { 'uikit-modal__header--divider': props.showHeaderDivider },
        ]"
      >
        <div class="uikit-modal__title">
          <slot name="title">{{ props.title }}</slot>
        </div>
        <IconButton
          v-if="props.showClose"
          class="uikit-modal__close"
          icon="xmark/bold"
          size="small"
          variant="ghost"
          :title="t('button.close', '关闭')"
          @click="onCancel"
        />
      </div>
      <div class="uikit-modal__body" :class="`uikit-modal__body--${props.contentAlign}`">
        <div v-if="props.icon || $slots.icon" class="uikit-modal__icon">
          <slot name="icon">
            <Icon :name="props.icon" :size="56" />
          </slot>
        </div>
        <slot />
      </div>
      <div
        v-if="props.showFooter || $slots.footer"
        class="uikit-modal__footer"
        :class="`uikit-modal__footer--${props.footerAlign}`"
      >
        <slot name="footer">
          <Button
            pill
            size="large"
            :type="props.type === 'danger' ? 'danger' : 'primary'"
            @click="onConfirm"
          >
            {{ props.confirmText }}
          </Button>
          <Button v-if="props.showCancel" pill size="large" type="outline" @click="onCancel">
            {{ props.cancelText }}
          </Button>
        </slot>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
/* 桌面端外壳由 Modal 自绘（Popup shell=false）：
   大圆角白卡 + 阴影，圆角走独立 token --uikit-modal-radius */
.uikit-modal {
  min-width: 280px;
  max-width: calc(90vw - 40px);
  max-height: calc(90vh - 40px);
  max-height: calc(90dvh - 40px);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: var(--uikit-bg-elevated, var(--uikit-bg-base));
  border: 1px solid var(--uikit-border-color);
  border-radius: var(--uikit-modal-radius, 24px);
  box-shadow: var(--uikit-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
  overflow: hidden;
}

/* 移动端回落 bottom sheet：外壳交还 Popup（shell=true），内部不再自绘 */
.uikit-modal--mobile {
  width: 100%;
  max-width: 100%;
  max-height: 80vh;
  background: none;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.uikit-modal__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  flex-shrink: 0;
}

.uikit-modal__header--divider {
  border-bottom: 1px solid var(--uikit-divider-color, var(--uikit-border-color));
}

.uikit-modal__header--center .uikit-modal__title {
  text-align: center;
}

.uikit-modal__title {
  flex: 1;
  min-width: 0;
  font-size: var(--uikit-font-size-20);
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.uikit-modal__close {
  flex-shrink: 0;
}

.uikit-modal__body {
  padding: 24px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-primary);
  overflow-y: auto;
  word-break: break-word;
}

.uikit-modal__body--center {
  text-align: center;
}

.uikit-modal__body--center .uikit-modal__icon {
  justify-content: center;
}

.uikit-modal__icon {
  display: flex;
  margin-bottom: 16px;
  color: var(--uikit-text-primary);
}

.uikit-modal__footer {
  display: flex;
  gap: 16px;
  padding: 0 24px 24px;
  flex-shrink: 0;
}

/* 设计稿形态：右对齐，确认（primary pill）在左、取消（outline pill）在右 */
.uikit-modal__footer--right {
  justify-content: flex-end;
}

.uikit-modal__footer--right > * {
  min-width: 120px;
}

/* 兼容旧形态：等宽铺满 */
.uikit-modal__footer--stretch > * {
  flex: 1;
}

.uikit-modal--mobile .uikit-modal__footer {
  padding-bottom: calc(24px + var(--uikit-safe-bottom, 0px));
}
</style>
