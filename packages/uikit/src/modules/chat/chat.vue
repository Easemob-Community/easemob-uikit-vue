<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useChat } from '../../composables/use-chat'
import { useUIKit } from '../../composables/use-uikit'
import { useConversation } from '../../composables/use-conversation'
import { useLocale } from '../../locale'
import { CONVERSATION_TYPE } from '../../constants'
import MessageList from './message-list/message-list.vue'
import MessageInput from './message-input.vue'
import ChatInfoDrawer from './drawer/chat-info-drawer.vue'
import Icon from '../../components/icon/icon.vue'
import Avatar from '../../components/avatar/avatar.vue'
import type { ChatConfig } from './types'
import type { Message } from '../../store/message'

export interface ChatProps {
  config?: ChatConfig
}

export interface ChatEmits {
  (e: 'recall-failed', error: any, message: Message): void
}

const props = defineProps<ChatProps>()
const emit = defineEmits<ChatEmits>()

const { currentConversation, isMultiSelectMode, selectedMessages, exitMultiSelectMode, fetchHistoryMessages, sendReadAckForMessage, fetchGroupReadDetail } = useChat()
const { stores } = useUIKit()
const { sendChannelAck } = useConversation()
const { t } = useLocale()

/** 输入框组件引用 */
const messageInputRef = ref<InstanceType<typeof MessageInput>>()

/** 重新编辑：将撤回消息的原文回显到输入框 */
function onReedit(message: Message) {
  const originalText = message.originalMsg
  // eslint-disable-next-line no-console
  console.log('[chat] onReedit', { originalText, ref: messageInputRef.value, hasSetText: !!messageInputRef.value?.setText })
  if (!originalText) return
  messageInputRef.value?.setText?.(originalText)
}

/** Header 配置 */
const headerConfig = computed(() => props.config?.header)

/** 是否显示 header */
const showHeader = computed(() => headerConfig.value?.visible !== false)

/** Header 对齐方式 */
const headerAlign = computed(() => headerConfig.value?.align ?? 'center')

/** 是否使用自定义 header 插槽 */
const customHeaderSlot = computed(() => headerConfig.value?.customSlot ?? false)

/** 是否显示 header 头像 */
const showHeaderAvatar = computed(() => headerConfig.value?.showAvatar ?? false)

/** 是否显示 drawer */
const showDrawer = ref(false)

/** Header 元素引用 */
const headerRef = ref<HTMLElement>()

/** Header 实际高度 */
const headerHeight = ref(0)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (headerRef.value) {
    headerHeight.value = headerRef.value.offsetHeight
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height
        headerHeight.value = h
      }
    })
    resizeObserver.observe(headerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

/** 当前会话类型 */
const conversationType = computed(() => currentConversation.value?.type)

/** 是否是群聊 */
const isGroupChat = computed(() => conversationType.value === CONVERSATION_TYPE.GROUPCHAT)

/**
 * 会话切换时：
 * 1. 发送已读回执（useConversation.sendChannelAck 内部已有未读数守卫和群聊跳过逻辑）
 * 2. 首次拉取历史消息
 */
watch(currentConversation, async (cvs, oldCvs) => {
  if (!cvs || cvs.id === oldCvs?.id) return

  // 发送会话已读回执（内部已做：群聊跳过 + 未读为 0 跳过）
  sendChannelAck(cvs.id)

  // 首次拉取历史消息
  const existingMsgs = stores.message.getMessages(cvs.id)
  if (existingMsgs.length === 0) {
    await fetchHistoryMessages()
  }
}, { immediate: true })

/** 多选模式底部操作 */
function onMultiSelectForward() {
  // TODO: 转发选中的消息
  exitMultiSelectMode()
}

function onMultiSelectDelete() {
  // TODO: 删除选中的消息
  exitMultiSelectMode()
}
</script>

<template>
  <div class="chat">
    <!-- Header -->
    <div
      v-if="showHeader"
      ref="headerRef"
      class="chat__header"
      :class="{
        'chat__header--align-left': headerAlign === 'left',
        'chat__header--align-center': headerAlign === 'center',
        'chat__header--align-right': headerAlign === 'right',
      }"
    >
      <slot name="header" :conversation="currentConversation">
        <!-- 头像区域 -->
        <div v-if="showHeaderAvatar && currentConversation" class="chat__header-avatar">
          <slot name="header-avatar" :conversation="currentConversation">
            <Avatar
              :src="currentConversation.avatar"
              :name="currentConversation.name"
              :size="36"
            />
          </slot>
        </div>
        <div class="chat__header-main">
          <template v-if="customHeaderSlot">
            <slot name="header-title" :conversation="currentConversation">
              <span class="chat__title">{{ currentConversation?.name || t('chat.title') }}</span>
            </slot>
            <slot name="header-extra" :conversation="currentConversation" />
          </template>
          <template v-else>
            <span class="chat__title">{{ currentConversation?.name || t('chat.title') }}</span>
          </template>
        </div>
        <button
          v-if="currentConversation"
          class="chat__header-more"
          @click.stop="showDrawer = true"
        >
          <Icon name="actions/ellipsis_vertical" :size="20" />
        </button>
      </slot>
    </div>

    <!-- 消息列表 -->
    <MessageList :config="props.config" @reedit="onReedit" @recall-failed="(err, msg) => emit('recall-failed', err, msg)" />

    <!-- 多选模式底部操作栏 -->
    <div v-if="isMultiSelectMode" class="chat__multi-select-bar">
      <span class="chat__multi-select-count">已选 {{ selectedMessages.length }} 条</span>
      <div class="chat__multi-select-actions">
        <button class="chat__multi-select-btn" @click="onMultiSelectForward">
          转发
        </button>
        <button class="chat__multi-select-btn chat__multi-select-btn--danger" @click="onMultiSelectDelete">
          删除
        </button>
        <button class="chat__multi-select-btn" @click="exitMultiSelectMode">
          取消
        </button>
      </div>
    </div>

    <!-- 输入框 -->
    <MessageInput v-if="!isMultiSelectMode" ref="messageInputRef" :config="props.config" :is-group="isGroupChat" />

    <!-- 聊天信息抽屉 -->
    <ChatInfoDrawer
      v-model:show="showDrawer"
      :conversation="currentConversation"
      :is-group="isGroupChat"
      :offset-top="headerHeight"
    />
  </div>
</template>

<style scoped>
.chat {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--uikit-bg-base);
}

.chat__header {
  position: relative;
  z-index: 101;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  min-height: 48px;
  gap: 8px;
}

.chat__header--align-left .chat__header-main {
  justify-content: flex-start;
}

.chat__header--align-center .chat__header-main {
  justify-content: center;
}

.chat__header--align-right .chat__header-main {
  justify-content: flex-end;
}

.chat__header-avatar {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.chat__header-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.chat__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.chat__header-more {
  background: none;
  border: none;
  color: var(--uikit-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.15s;
  flex-shrink: 0;
}

.chat__header-more:hover {
  background-color: var(--uikit-bg-secondary);
}

/* 多选模式底部栏 */
.chat__multi-select-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background-color: var(--uikit-bg-secondary);
  border-top: 1px solid #e5e7eb;
}

.chat__multi-select-count {
  font-size: 14px;
  color: var(--uikit-text-primary);
}

.chat__multi-select-actions {
  display: flex;
  gap: 12px;
}

.chat__multi-select-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: none;
  background-color: var(--uikit-primary-color);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.chat__multi-select-btn:hover {
  opacity: 0.9;
}

.chat__multi-select-btn--danger {
  background-color: #ef4444;
}
</style>
