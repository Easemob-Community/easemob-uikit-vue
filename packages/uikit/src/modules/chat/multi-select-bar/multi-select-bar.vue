<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '../../../components/icon/icon.vue'
import type { UiMessage } from '../../../sdk/types'

export interface MultiSelectBarEmits {
  (e: 'forward-one-by-one', messages: UiMessage[]): void
  (e: 'forward-combine', messages: UiMessage[]): void
  (e: 'delete', messages: UiMessage[]): void
  (e: 'select-all'): void
  (e: 'deselect-all'): void
  (e: 'close'): void
}

const props = defineProps<{
  selectedMessages: UiMessage[]
  totalMessages: number
}>()

const emit = defineEmits<MultiSelectBarEmits>()

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
/** 当前转发模式 */
const forwardMode = ref<'oneByOne' | 'combine'>('combine')

/** 待转发的消息 */
const pendingForwardMessages = ref<UiMessage[]>([])

/** 批量删除确认弹窗 */
const showBatchDeleteConfirm = ref(false)

/** 打开转发弹窗 */
function openForwardModal(messages: UiMessage[]) {
  if (messages.length === 0)
    return
  pendingForwardMessages.value = messages
  if (forwardMode.value === 'oneByOne') {
    emit('forward-one-by-one', messages)
  }
  else {
    emit('forward-combine', messages)
  }
}

/** 多选：逐条转发 */
function onForwardOneByOne() {
  if (props.selectedMessages.length === 0) {
    emit('close')
    return
  }
  forwardMode.value = 'oneByOne'
  openForwardModal(props.selectedMessages)
}

/** 多选：合并转发 */
function onForwardCombine() {
  if (props.selectedMessages.length === 0) {
    emit('close')
    return
  }
  forwardMode.value = 'combine'
  openForwardModal(props.selectedMessages)
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
</script>

<template>
  <div class="multi-select-bar">
    <!-- 全选按钮 -->
    <div class="multi-select-bar__select-all" @click="onToggleSelectAll">
      <div class="multi-select-bar__check-icon" :class="{ 'multi-select-bar__check-icon--checked': isAllSelected }">
        <span v-if="isAllSelected">&#10003;</span>
      </div>
      <span class="multi-select-bar__select-all-label">{{ isAllSelected ? '取消全选' : '全选' }}</span>
      <!-- 选中条数：放在全选按钮下方同一纵列 -->
      <div v-if="selectedMessages.length > 0" class="multi-select-bar__count">
        {{ selectedMessages.length }}条
      </div>
    </div>

    <div class="multi-select-bar__actions">
      <div class="multi-select-bar__action" @click="onForwardOneByOne">
        <div class="multi-select-bar__icon">
          <Icon name="arrows/arrow_turn_right" :size="22" />
        </div>
        <span class="multi-select-bar__label">逐条转发</span>
      </div>
      <div class="multi-select-bar__action" @click="onForwardCombine">
        <div class="multi-select-bar__icon">
          <Icon name="chat/3lines_n_arrow" :size="22" />
        </div>
        <span class="multi-select-bar__label">合并转发</span>
      </div>
      <div class="multi-select-bar__action" @click="onDelete">
        <div class="multi-select-bar__icon multi-select-bar__icon--danger">
          <Icon name="actions/trash" :size="22" />
        </div>
        <span class="multi-select-bar__label multi-select-bar__label--danger">删除</span>
      </div>
    </div>
    <div class="multi-select-bar__action multi-select-bar__action--close" @click="emit('close')">
      <div class="multi-select-bar__icon multi-select-bar__icon--close">
        <Icon name="actions/xmark_thick" :size="20" />
      </div>
    </div>
  </div>

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
  border-top: 1px solid var(--uikit-border-color, #e5e7eb);
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
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--uikit-border-color, #c5c5c5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  transition: all 0.15s;
}

.multi-select-bar__check-icon--checked {
  background-color: var(--uikit-primary-color, #007aff);
  border-color: var(--uikit-primary-color, #007aff);
}

.multi-select-bar__select-all-label {
  font-size: 11px;
  color: var(--uikit-text-secondary);
}

/* 选中条数：放在全选按钮下方 */
.multi-select-bar__count {
  font-size: 11px;
  color: var(--uikit-primary-color, #007aff);
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
  background-color: var(--uikit-bg-secondary, #f5f5f5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--uikit-text-primary);
  transition: background-color 0.15s;
}

.multi-select-bar__action:hover .multi-select-bar__icon {
  background-color: var(--uikit-bg-tertiary, #e8e8e8);
}

.multi-select-bar__label {
  font-size: 12px;
  color: var(--uikit-text-primary);
}

.multi-select-bar__label--danger {
  color: #ff4d4f;
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

/* 删除图标红色 */
.multi-select-bar__icon--danger {
  color: #ff4d4f;
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
  border-radius: 12px;
  padding: 20px 24px;
  min-width: 280px;
  text-align: center;
}

.multi-select-bar__modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
  margin-bottom: 8px;
}

.multi-select-bar__modal-desc {
  font-size: 14px;
  color: var(--uikit-text-secondary);
  margin-bottom: 20px;
}

.multi-select-bar__modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.multi-select-bar__modal-btn {
  padding: 8px 20px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.multi-select-bar__modal-btn--cancel {
  background-color: var(--uikit-bg-secondary, #f5f5f5);
  color: var(--uikit-text-primary);
}

.multi-select-bar__modal-btn--cancel:hover {
  background-color: var(--uikit-bg-tertiary, #e8e8e8);
}

.multi-select-bar__modal-btn--confirm {
  background-color: #ff4d4f;
  color: #fff;
}

.multi-select-bar__modal-btn--confirm:hover {
  background-color: #ff7875;
}
</style>
