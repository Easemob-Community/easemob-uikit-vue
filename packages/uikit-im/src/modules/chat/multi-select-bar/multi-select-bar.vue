<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '../../../components/icon/icon.vue'
import { useToast } from '../../../composables/use-toast'
import { FORWARD_MODE, MESSAGE_STATUS, MESSAGE_TYPE } from '../../../constants'
import type { ForwardModeValue } from '../../../constants'
import type { UiMessage } from '../../../sdk/types'

export interface MultiSelectBarEmits {
  (e: 'forward-one-by-one', messages: UiMessage[]): void
  (e: 'forward-combine', messages: UiMessage[]): void
  (e: 'delete', messages: UiMessage[]): void
  (e: 'select-all'): void
  (e: 'deselect-all'): void
  (e: 'close'): void
}

interface MultiSelectBarProps {
  selectedMessages: UiMessage[]
  totalMessages: number
}

const props = defineProps<MultiSelectBarProps>()

const emit = defineEmits<MultiSelectBarEmits>()
const { show: showToast } = useToast()

/** 可转发的消息类型集合 */
const FORWARDABLE_TYPES = new Set<string>([
  MESSAGE_TYPE.TEXT,
  MESSAGE_TYPE.IMAGE,
  MESSAGE_TYPE.FILE,
  MESSAGE_TYPE.VOICE,
  MESSAGE_TYPE.VIDEO,
  MESSAGE_TYPE.LOCATION,
  MESSAGE_TYPE.CUSTOM,
  MESSAGE_TYPE.COMBINE,
])

/** 判断单条消息是否可转发：仅已发送、未撤回、且类型在可转发集合内 */
function canForwardMessage(msg: UiMessage): boolean {
  return msg.status === MESSAGE_STATUS.SENT && !msg.recalled && FORWARDABLE_TYPES.has(msg.type)
}

/** 当前选中消息是否全部可转发 */
const canForward = computed(() => props.selectedMessages.length > 0 && props.selectedMessages.every(canForwardMessage))

/** 多选：全选 / 取消全选 */
const isAllSelected = computed(() => props.selectedMessages.length > 0 && props.selectedMessages.length >= props.totalMessages)

function onToggleSelectAll() {
  if (isAllSelected.value) {
    emit('deselect-all')
  }
  else {
    emit('select-all')
  }
}

/** 批量删除确认弹窗 */
const showBatchDeleteConfirm = ref(false)

/** 转发方式选择弹窗（多条消息时显示） */
const showForwardTypeSelect = ref(false)

/** 点击统一转发入口 */
function onForward() {
  if (props.selectedMessages.length === 0) {
    emit('close')
    return
  }
  if (!canForward.value) {
    showToast('选中的消息包含不可转发的消息', 'warning')
    return
  }
  // 单条消息直接逐条转发；多条消息弹出方式选择
  if (props.selectedMessages.length === 1) {
    emit('forward-one-by-one', props.selectedMessages)
  }
  else {
    showForwardTypeSelect.value = true
  }
}

/** 选择转发方式 */
function onSelectForwardType(mode: ForwardModeValue) {
  showForwardTypeSelect.value = false
  if (mode === FORWARD_MODE.ONE_BY_ONE) {
    emit('forward-one-by-one', props.selectedMessages)
  }
  else {
    emit('forward-combine', props.selectedMessages)
  }
}

/** 多选：删除 */
function onDelete() {
  if (props.selectedMessages.length === 0) {
    emit('close')
    return
  }
  showBatchDeleteConfirm.value = true
}

function onConfirmDelete() {
  emit('delete', props.selectedMessages)
  showBatchDeleteConfirm.value = false
}

/** 取消多选 */
function onCancel() {
  emit('close')
}
</script>

<template>
  <div class="multi-select-bar">
    <!-- 全选按钮 -->
    <div class="multi-select-bar__select-all" @click="onToggleSelectAll">
      <Icon
        :name="isAllSelected ? 'actions/checked_ellipse' : 'actions/unchecked_ellipse'"
        :size="22"
        class="multi-select-bar__check-icon"
        :class="{ 'multi-select-bar__check-icon--checked': isAllSelected }"
      />
      <span class="multi-select-bar__select-all-label">{{ isAllSelected ? '取消全选' : '全选' }}</span>
      <!-- 选中条数：放在全选按钮下方同一纵列 -->
      <div v-if="selectedMessages.length > 0" class="multi-select-bar__count">
        {{ selectedMessages.length }}条
      </div>
    </div>

    <div class="multi-select-bar__actions">
      <div
        class="multi-select-bar__action"
        :class="{ 'multi-select-bar__action--disabled': !canForward }"
        @click="onForward"
      >
        <div class="multi-select-bar__icon">
          <Icon name="arrows/arrow_turn_right" :size="22" />
        </div>
        <span class="multi-select-bar__label">转发</span>
      </div>
      <div class="multi-select-bar__action" @click="onDelete">
        <div class="multi-select-bar__icon">
          <Icon name="actions/trash" :size="22" type="danger" />
        </div>
        <span class="multi-select-bar__label multi-select-bar__label--danger">删除</span>
      </div>
    </div>
    <button class="multi-select-bar__cancel" @click="onCancel">
      取消
    </button>
  </div>

  <!-- 转发方式选择弹窗 -->
  <Teleport to="body">
    <div v-if="showForwardTypeSelect" class="multi-select-bar__modal-overlay" @click="showForwardTypeSelect = false">
      <div class="multi-select-bar__modal" @click.stop>
        <div class="multi-select-bar__modal-title">
          转发给
        </div>
        <div class="multi-select-bar__modal-actions multi-select-bar__modal-actions--column">
          <button class="multi-select-bar__modal-btn multi-select-bar__modal-btn--option" @click="onSelectForwardType(FORWARD_MODE.ONE_BY_ONE)">
            逐条转发
          </button>
          <button class="multi-select-bar__modal-btn multi-select-bar__modal-btn--option" @click="onSelectForwardType(FORWARD_MODE.COMBINE)">
            合并转发
          </button>
          <button class="multi-select-bar__modal-btn multi-select-bar__modal-btn--cancel" @click="showForwardTypeSelect = false">
            取消
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 批量删除确认弹窗 -->
  <Teleport to="body">
    <div v-if="showBatchDeleteConfirm" class="multi-select-bar__modal-overlay" @click="showBatchDeleteConfirm = false">
      <div class="multi-select-bar__modal" @click.stop>
        <div class="multi-select-bar__modal-title">
          确认删除
        </div>
        <div class="multi-select-bar__modal-desc">
          确定要删除选中的 {{ selectedMessages.length }} 条消息吗？
        </div>
        <div class="multi-select-bar__modal-actions">
          <button class="multi-select-bar__modal-btn multi-select-bar__modal-btn--cancel" @click="showBatchDeleteConfirm = false">
            取消
          </button>
          <button class="multi-select-bar__modal-btn multi-select-bar__modal-btn--confirm" @click="onConfirmDelete">
            删除
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* 多选模式底部栏（微信风格） */
.multi-select-bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 60px 20px;
  background-color: var(--uikit-bg-base);
  border-top: 1px solid var(--uikit-border-color);
}

/* 全选按钮 */
.multi-select-bar__select-all {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.multi-select-bar__check-icon {
  color: var(--uikit-text-tertiary);
  flex-shrink: 0;
  transition: color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.multi-select-bar__check-icon--checked {
  color: var(--uikit-primary-color);
}

.multi-select-bar__select-all-label {
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-text-secondary);
}

/* 选中条数：放在全选按钮下方 */
.multi-select-bar__count {
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-primary-color);
  font-weight: 500;
  margin-top: 2px;
}

/* 三个动作按钮组：居中固定宽度容器，间距适中 */
.multi-select-bar__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 360px;
  gap: 32px;
}

.multi-select-bar__action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.multi-select-bar__icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--uikit-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--uikit-text-primary);
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}


@media (hover: hover) {
  .multi-select-bar__action:hover .multi-select-bar__icon {
    background-color: var(--uikit-bg-tertiary);
  }
}

.multi-select-bar__label {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-primary);
}

.multi-select-bar__label--danger {
  color: var(--uikit-danger-color);
}

.multi-select-bar__action--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}


@media (hover: hover) {
  .multi-select-bar__action--disabled:hover .multi-select-bar__icon {
    background-color: var(--uikit-bg-secondary);
  }
}

/* 取消按钮：绝对定位靠右，文字按钮 */
.multi-select-bar__cancel {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  padding: 6px 12px;
  border: none;
  background-color: transparent;
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-14);
  cursor: pointer;
  transition: color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .multi-select-bar__cancel:hover {
    color: var(--uikit-text-primary);
  }
}

/* 关闭按钮：绝对定位靠右，不干扰中间动作组布局 */
.multi-select-bar__action--close {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
}

.multi-select-bar__icon--close {
  width: 36px;
  height: 36px;
  background-color: transparent;
  color: var(--uikit-text-secondary);
}

/* 确认弹窗 */
.multi-select-bar__modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.multi-select-bar__modal {
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 12px);
  padding: 20px 24px;
  min-width: 280px;
  text-align: center;
}

.multi-select-bar__modal-title {
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  color: var(--uikit-text-primary);
  margin-bottom: 8px;
}

.multi-select-bar__modal-desc {
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
  margin-bottom: 20px;
}

.multi-select-bar__modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.multi-select-bar__modal-actions--column {
  flex-direction: column;
  gap: 8px;
}

.multi-select-bar__modal-btn {
  padding: 8px 20px;
  border-radius: var(--uikit-components-radius, 6px);
  border: none;
  font-size: var(--uikit-font-size-14);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.multi-select-bar__modal-btn--option {
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
}

@media (hover: hover) {
  .multi-select-bar__modal-btn--option:hover {
    background-color: var(--uikit-bg-tertiary);
  }
}

.multi-select-bar__modal-btn--cancel {
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
}

@media (hover: hover) {
  .multi-select-bar__modal-btn--cancel:hover {
    background-color: var(--uikit-bg-tertiary);
  }
}

.multi-select-bar__modal-btn--confirm {
  background-color: var(--uikit-danger-color);
  color: var(--uikit-text-inverse);
}

@media (hover: hover) {
  .multi-select-bar__modal-btn--confirm:hover {
    filter: brightness(1.1);
  }
}
</style>
