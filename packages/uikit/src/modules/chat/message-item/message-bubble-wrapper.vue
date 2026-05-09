<script setup lang="ts">
import { computed } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import MessageRenderer from './message-renderer.vue'
import MessageInteractive from './message-interactive.vue'
import type { Message } from '../../../store/message'
import type { ChatConfig, MessageLayout, TimeDisplayStrategy, MessageActionEvent } from '../types'
import { MESSAGE_STATUS } from '../../../constants'


export interface MessageBubbleWrapperProps {
  message: Message
  /** 消息列表配置 */
  config?: ChatConfig['messageList']
  /** 消息操作菜单配置 */
  actionConfig?: ChatConfig['messageAction']
  /** 是否处于多选模式 */
  isMultiSelectMode?: boolean
  /** 当前消息是否被选中 */
  isSelected?: boolean
}

export interface MessageBubbleWrapperEmits {
  (e: 'toggle-select', messageId: string): void
  (e: 'action', event: MessageActionEvent): void
}

const props = defineProps<MessageBubbleWrapperProps>()
const emit = defineEmits<MessageBubbleWrapperEmits>()

/** 布局模式 */
const layout = computed<MessageLayout>(() => props.config?.layout ?? 'conversation')

/** 是否显示头像 */
const showAvatar = computed(() => props.config?.showAvatar ?? true)

/** 是否显示时间 */
const showTime = computed<TimeDisplayStrategy>(() => props.config?.showTime ?? 'always')

/** 是否为对话模式且是己方消息 */
const isSelfConversation = computed(() => layout.value === 'conversation' && props.message.isSelf)

/** 头像尺寸 */
const avatarSize = 36

/** 格式化后的时间（HH:mm） */
const formattedTime = computed(() => {
  const date = new Date(props.message.timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
})

/** 是否显示时间标签 */
const shouldShowTime = computed(() => {
  if (showTime.value === false) return false
  return true // 'always' | 'hover' | true 都默认显示，hover 样式通过 CSS 控制
})

/** 是否显示发送状态（仅自己的消息） */
const showStatus = computed(() => props.message.isSelf)

/** 消息状态 */
const messageStatus = computed(() => props.message.status)
</script>

<template>
  <div
    class="message-bubble-wrapper"
    :class="{
      'message-bubble-wrapper--self': isSelfConversation,
      'message-bubble-wrapper--left': layout === 'left',
      'message-bubble-wrapper--hover-time': showTime === 'hover',
      'message-bubble-wrapper--selected': props.isSelected,
    }"
    @click="props.isMultiSelectMode && emit('toggle-select', props.message.id)"
  >
    <!-- 多选 Checkbox -->
    <div v-if="props.isMultiSelectMode" class="message-bubble-wrapper__checkbox">
      <div
        class="message-bubble-wrapper__check-icon"
        :class="{ 'message-bubble-wrapper__check-icon--checked': props.isSelected }"
      >
        <span v-if="props.isSelected">&#10003;</span>
      </div>
    </div>

    <!-- 头像区域 -->
    <div v-if="showAvatar" class="message-bubble-wrapper__avatar">
      <slot name="avatar" :message="message">
        <Avatar :name="message.from" :size="avatarSize" />
      </slot>
    </div>

    <!-- 内容区域 -->
    <div class="message-bubble-wrapper__content">
      <!-- 昵称 -->
      <div v-if="!message.isSelf" class="message-bubble-wrapper__nickname">
        <slot name="nickname" :message="message">
          {{ message.from }}
        </slot>
      </div>

      <!-- 消息渲染器 -->
      <div class="message-bubble-wrapper__body">
        <MessageInteractive
          :message="message"
          :config="actionConfig"
          @action="emit('action', $event)"
        >
          <MessageRenderer :message="message">
            <!-- 透传所有类型级插槽 -->
            <template
              v-for="(_, name) in $slots"
              :key="name"
              #[name]="slotProps"
            >
              <slot :name="name" v-bind="slotProps" />
            </template>
          </MessageRenderer>
        </MessageInteractive>
      </div>

      <!-- 消息状态指示器（仅己方消息） -->
      <div v-if="showStatus" class="message-bubble-wrapper__status">
        <!-- 发送中 -->
        <span v-if="messageStatus === MESSAGE_STATUS.SENDING" class="message-bubble-wrapper__status-icon message-bubble-wrapper__status-icon--loading">&#8226;</span>
        <!-- 已发送 -->
        <span v-else-if="messageStatus === MESSAGE_STATUS.SENT" class="message-bubble-wrapper__status-icon" title="已发送">&#10003;</span>
        <!-- 已送达 -->
        <span v-else-if="messageStatus === MESSAGE_STATUS.DELIVERED" class="message-bubble-wrapper__status-icon message-bubble-wrapper__status-icon--delivered" title="已送达">&#10003;&#10003;</span>
        <!-- 已读 -->
        <span v-else-if="messageStatus === MESSAGE_STATUS.READ" class="message-bubble-wrapper__status-icon message-bubble-wrapper__status-icon--read" title="已读">&#10003;&#10003;</span>
        <!-- 发送失败 -->
        <span v-else-if="messageStatus === MESSAGE_STATUS.FAILED" class="message-bubble-wrapper__status-icon message-bubble-wrapper__status-icon--failed" title="发送失败">&#33;</span>
      </div>

      <!-- 时间戳 -->
      <div v-if="shouldShowTime" class="message-bubble-wrapper__time">
        <slot name="time" :message="message">
          {{ formattedTime }}
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-bubble-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 100%;
}

/* 全部居左模式 */
.message-bubble-wrapper--left {
  justify-content: flex-start;
}

/* 对话模式：己方消息反向排列 */
.message-bubble-wrapper--self {
  flex-direction: row-reverse;
}

.message-bubble-wrapper--self .message-bubble-wrapper__content {
  align-items: flex-end;
}

.message-bubble-wrapper__avatar {
  flex-shrink: 0;
  margin-top: 2px;
}

.message-bubble-wrapper__content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 70%;
  min-width: 0;
}

.message-bubble-wrapper__nickname {
  font-size: 12px;
  color: var(--uikit-text-secondary);
  margin-bottom: 2px;
  padding-left: 2px;
}

.message-bubble-wrapper__body {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.message-bubble-wrapper__time {
  font-size: 11px;
  color: var(--uikit-text-secondary);
  margin-top: 2px;
  padding-left: 2px;
}

/* hover 显示时间 */
.message-bubble-wrapper--hover-time .message-bubble-wrapper__time {
  opacity: 0;
  transition: opacity 0.2s;
}

.message-bubble-wrapper--hover-time:hover .message-bubble-wrapper__time {
  opacity: 1;
}

/* 多选模式 */
.message-bubble-wrapper__checkbox {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-top: 8px;
}

.message-bubble-wrapper__check-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--uikit-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  transition: all 0.15s;
}

.message-bubble-wrapper__check-icon--checked {
  background-color: var(--uikit-primary-color);
  border-color: var(--uikit-primary-color);
}

.message-bubble-wrapper--selected {
  opacity: 0.85;
}

/* 消息状态指示器 */
.message-bubble-wrapper__status {
  display: flex;
  align-items: center;
  margin-top: 2px;
  padding-left: 2px;
  flex-shrink: 0;
}

.message-bubble-wrapper__status-icon {
  font-size: 12px;
  color: var(--uikit-text-secondary);
  line-height: 1;
}

.message-bubble-wrapper__status-icon--loading {
  animation: message-status-loading 1s infinite;
  color: var(--uikit-text-secondary);
}

.message-bubble-wrapper__status-icon--delivered {
  letter-spacing: -2px;
  font-size: 11px;
}

.message-bubble-wrapper__status-icon--read {
  color: var(--uikit-primary-color);
  letter-spacing: -2px;
  font-size: 11px;
}

.message-bubble-wrapper__status-icon--failed {
  color: #e74c3c;
  font-weight: bold;
  cursor: pointer;
}

@keyframes message-status-loading {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
