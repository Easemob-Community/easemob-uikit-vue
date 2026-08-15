<script setup lang="ts">
import { computed } from 'vue'
import { useUserInfo } from '../../../composables/use-user-info'
import Avatar from '../../../components/avatar/avatar.vue'
import Cell from '../../../components/cell/cell.vue'
import type { UiMessage } from '../../../sdk/types'
import MessageRenderer from './message-renderer.vue'

export interface CombineMessageModalItemProps {
  message: UiMessage
}

export interface CombineMessageModalItemEmits {
  (e: 'view-combine', message: UiMessage): void
}

const props = defineProps<CombineMessageModalItemProps>()
const emit = defineEmits<CombineMessageModalItemEmits>()

/** 通过 useUserInfo 解析发送者昵称与头像 */
const { displayName, avatarUrl } = useUserInfo(() => props.message.from)

/**
 * 发送者显示名称优先级：
 * 1. useUserInfo 解析结果（备注 > 用户资料昵称 > ID）
 * 2. 消息 ext 中携带的 UIKit 用户信息（合并消息场景可能携带）
 */
const senderName = computed(() => {
  const ext = props.message.ext?.ease_chat_uikit_user_info as Record<string, string> | undefined
  const extName = ext?.nickname || ext?.remark
  return displayName.value || extName || props.message.from || 'Unknown'
})

/** 格式化时间 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/** 点击嵌套合并消息 */
function onViewCombine(msg: UiMessage) {
  emit('view-combine', msg)
}
</script>

<template>
  <Cell class="combine-message-modal-item" auto-height :clickable="false">
    <!-- 头像：复用 Avatar 组件，展示真实头像 -->
    <template #leading>
      <Avatar :name="senderName" :src="avatarUrl" :size="32" />
    </template>
    <!-- 内容 -->
    <template #default>
      <div class="combine-message-modal-item__content">
        <div class="combine-message-modal-item__meta">
          <span class="combine-message-modal-item__sender">{{ senderName }}</span>
          <span class="combine-message-modal-item__time">{{ formatTime(props.message.timestamp) }}</span>
        </div>
        <div class="combine-message-modal-item__bubble">
          <MessageRenderer :message="props.message" @view-combine="onViewCombine" />
        </div>
      </div>
    </template>
  </Cell>
</template>

<style scoped>
.combine-message-modal-item {
  --uikit-item-hover-padding-x: 8px;
}

.combine-message-modal-item :deep(.uikit-cell) {
  align-items: flex-start;
}

.combine-message-modal-item__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.combine-message-modal-item__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.combine-message-modal-item__sender {
  font-size: var(--uikit-font-size-13);
  font-weight: 500;
  color: var(--uikit-text-primary);
}

.combine-message-modal-item__time {
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-text-secondary);
}

.combine-message-modal-item__bubble {
  margin-top: 2px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  word-break: break-word;
  /* 限制嵌套渲染的媒体宽度，避免超出弹窗 */
  max-width: 100%;
}

.combine-message-modal-item__bubble :deep(img),
.combine-message-modal-item__bubble :deep(video) {
  max-width: 240px;
  max-height: 240px;
  border-radius: 6px;
}
</style>
