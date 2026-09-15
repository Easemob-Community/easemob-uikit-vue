<script setup lang="ts">
import { computed } from 'vue'
import Popup from '../popup/popup.vue'
import Button from '../button/button.vue'
import Icon from '../icon/icon.vue'
import type { IconProps } from '../icon/icon.vue'
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
  /** 弹窗高度（px），不传时由内容撑开；受 90vh 上限约束 */
  height?: number
  /** 正文对齐方式：left（默认）/ center（Text-Icon 居中变体） */
  contentAlign?: 'left' | 'center'
  /** 正文图标名（Text-Icon 模式），格式 "category/icon-name"，如 "circle/bang"；也可用 #icon 插槽接管。
   *  不传时按 type 内置语义图标（参考 Toast：danger/warning/info → 感叹号圆，success → 对勾圆） */
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
  /** 弹窗类型：default（默认）/ danger（危险操作，确认按钮变红色）/ warning / info / success；
   *  非 default 时正文自动带对应语义图标（icon prop / #icon 插槽可覆盖）；
   *  图标默认脱色（主文字色），语义着色需显式开启 semanticIconColor */
  type?: 'default' | 'danger' | 'warning' | 'info' | 'success'
  /** 语义图标是否按类型着色（warning 橙 / danger 红 等），默认 false 脱色展示 */
  semanticIconColor?: boolean
  /** 确认按钮禁用态（如未选择成员时禁止提交），默认 false */
  confirmDisabled?: boolean
  /** 确认按钮加载态（异步提交期间），默认 false */
  confirmLoading?: boolean
  /** 点击确认后是否自动关闭弹窗，默认 true；异步表单类弹窗置 false，由业务侧在成功后自行关闭 */
  confirmAutoClose?: boolean
  /** 正文是否贴边（去除 body 内边距并撑满高度），列表/搜索类弹窗使用，默认 false */
  bodyFlush?: boolean
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
  height: 0,
  contentAlign: 'left',
  icon: '',
  showFooter: true,
  footerAlign: 'right',
  showCancel: true,
  cancelText: t('button.cancel', '取消'),
  confirmText: t('button.confirm', '确认'),
  closeOnClickOverlay: false,
  type: 'default',
  confirmDisabled: false,
  confirmLoading: false,
  confirmAutoClose: true,
  bodyFlush: false,
  semanticIconColor: false,
})

const emit = defineEmits<ModalEmits>()

const { isMobile } = useViewport()
const popupPosition = computed(() => (isMobile.value ? 'bottom' : 'center'))

/** 语义类型 → 内置图标（参考 Toast 实现）；自定义 icon / #icon 插槽优先 */
const TYPE_ICON_MAP: Partial<Record<NonNullable<ModalProps['type']>, { name: string, type: IconProps['type'] }>> = {
  info: { name: 'circle/bang', type: 'info' },
  success: { name: 'circle/checked', type: 'success' },
  warning: { name: 'circle/bang', type: 'warning' },
  danger: { name: 'circle/bang', type: 'danger' },
}

const resolvedIcon = computed(() => {
  const meta = props.icon ? { name: props.icon, type: undefined } : TYPE_ICON_MAP[props.type]
  if (!meta)
    return undefined
  // 默认脱色：仅显式开启 semanticIconColor 时才按类型着语义色
  return { name: meta.name, type: props.semanticIconColor ? meta.type : undefined }
})

function onConfirm() {
  emit('confirm')
  if (props.confirmAutoClose)
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
      :style="isMobile ? undefined : { width: `${props.width}px`, ...(props.height > 0 ? { height: `${props.height}px` } : {}) }"
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
      <div class="uikit-modal__body" :class="[`uikit-modal__body--${props.contentAlign}`, { 'uikit-modal__body--flush': props.bodyFlush }]">
        <div v-if="resolvedIcon || $slots.icon" class="uikit-modal__icon">
          <slot name="icon">
            <Icon v-if="resolvedIcon" :name="resolvedIcon.name" :size="56" :type="resolvedIcon.type" />
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
            :disabled="props.confirmDisabled"
            :loading="props.confirmLoading"
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
   白卡 + 阴影，圆角跟随全局大容器约束 --uikit-components-radius（全局 8 则 8、16 则 16） */
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
  border-radius: var(--uikit-components-radius, 8px);
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

/* 贴边模式：列表/搜索类弹窗内容铺满 body，高度由内容声明 */
.uikit-modal__body--flush {
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
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

/* 设计稿按钮规格：padding 12/24 + 内容区 56×24（font 16/1.5）+ border-radius 24，
   即 min-width = 56 + 24×2 = 104，高 48；pill（9999px）在 48px 高下等效 24px 圆角 */
.uikit-modal__footer--right > * {
  min-width: 104px;
}

/* 兼容旧形态：等宽铺满 */
.uikit-modal__footer--stretch > * {
  flex: 1;
}

.uikit-modal--mobile .uikit-modal__footer {
  padding-bottom: calc(24px + var(--uikit-safe-bottom, 0px));
}
</style>
