<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick, provide } from 'vue'
import { useChat } from '../../composables/use-chat'
import { useUIKit } from '../../composables/use-uikit'
import { useConversation } from '../../composables/use-conversation'
import { useQuote } from '../../composables/use-quote'
import { useLocale } from '../../locale'
import { CONVERSATION_TYPE } from '../../constants'
import MessageList from './message-list/message-list.vue'
import MessageInput from './message-input.vue'
import PinnedBar from './message-list/pinned-bar.vue'
import ChatInfoDrawer from './drawer/chat-info-drawer.vue'
import ForwardModal from './forward-modal.vue'
import MultiSelectBar from './multi-select-bar.vue'
import TypingIndicator from './typing-indicator.vue'
import Modal from '../../components/modal/modal.vue'
import Icon from '../../components/icon/icon.vue'
import Avatar from '../../components/avatar/avatar.vue'
import type { ChatConfig } from './types'
import type { Message } from '../../store/message'
import type { Conversation } from '../../store/conversation'

export interface ChatProps {
  config?: ChatConfig
}

export interface ChatEmits {
  (e: 'recall-failed', error: any, message: Message): void
}

const props = defineProps<ChatProps>()
const emit = defineEmits<ChatEmits>()

const messageStoreOptions = computed(() => ({
  maxMessageCount: props.config?.messageList?.maxMessageCount,
}))

const { currentConversation, isMultiSelectMode, messages, selectedMessages, selectedMessageIds, exitMultiSelectMode, fetchHistoryMessages, sendReadAckForMessage, fetchGroupReadDetail, editingMessage, enterEditMode, exitEditMode, fetchPinnedMessages, toggleTranslation, deleteMessages, forwardMessage, forwardCombineMessages, selectAllMessages, deselectAllMessages, setTyping, TYPING_DURATION } = useChat({ messageStoreOptions: messageStoreOptions.value })
const { stores } = useUIKit()
const { sendChannelAck } = useConversation()
const { clearQuote, requestLocate } = useQuote()
const { t } = useLocale()

/** 向后代组件提供 textMessage 配置（链接识别 & 拦截器） */
provide('textMessageConfig', computed(() => props.config?.textMessage))

/** 输入框组件引用 */
const messageInputRef = ref<InstanceType<typeof MessageInput>>()

/** 重新编辑：将撤回消息的原文回显到输入框 */
function onReedit(message: Message) {
  const originalText = message.originalMsg
  if (!originalText) return
  // 重新编辑是“发送一条新消息”，不进入编辑态
  exitEditMode()
  nextTick(() => messageInputRef.value?.setText?.(originalText))
}

/** 进入编辑态：仅文本消息 */
function onEdit(message: Message) {
  if (!message || message.type !== 'txt') return
  enterEditMode(message)
  const originalText = (message as unknown as { msg?: string }).msg || ''
  nextTick(() => messageInputRef.value?.setText?.(originalText))
}

/** 切换译文/原文 */
function onToggleTranslation(message: Message) {
  toggleTranslation(message.id)
}

/** @提及点击 */
function onMentionClick(userId: string) {
  // 默认行为：可扩展为跳转个人资料等
  console.log('[Chat] mention clicked:', userId)
}

/** 置顶横幅配置 */
const pinnedBarConfig = computed(() => props.config?.messageList?.pinnedBar)
const showPinnedBar = computed(() => pinnedBarConfig.value?.visible !== false)
const pinnedBarMaxLength = computed(() => pinnedBarConfig.value?.maxPreviewLength ?? 30)

/** 在消息列表中定位置顶消息 */
function onPinnedLocate(message: Message) {
  const target = message.mid || message.id
  if (target) requestLocate(target)
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

/** 是否启用输入状态提示 */
const enableTyping = computed(() => props.config?.input?.enableTyping !== false)

/** 当前会话对方是否正在输入 */
const isTyping = computed(() => {
  if (!enableTyping.value || !currentConversation.value) return false
  return stores.conversation.typingMap[currentConversation.value.id] || false
})

/** Typing 状态 5s 隐藏定时器 */
let typingHideTimer: ReturnType<typeof setTimeout> | null = null

/** 清除 typing 隐藏定时器 */
function clearTypingTimer() {
  if (typingHideTimer) {
    clearTimeout(typingHideTimer)
    typingHideTimer = null
  }
}

/** 收到 typing 后启动/重置 5s 隐藏定时器 */
function startTypingHideTimer() {
  clearTypingTimer()
  typingHideTimer = setTimeout(() => {
    if (currentConversation.value) {
      setTyping(currentConversation.value.id, false)
    }
    typingHideTimer = null
  }, TYPING_DURATION)
}

/** 监听 typing 状态变化：显示时启动定时器 */
watch(isTyping, (typing) => {
  if (typing) {
    startTypingHideTimer()
  } else {
    clearTypingTimer()
  }
})

/** 会话切换时清理 typing 状态 */
watch(currentConversation, (cvs, oldCvs) => {
  if (oldCvs && oldCvs.id !== cvs?.id) {
    clearTypingTimer()
    setTyping(oldCvs.id, false)
  }
})

/** 组件卸载时清理 */
onUnmounted(() => {
  clearTypingTimer()
})

/**
 * 会话切换时：
 * 1. 发送会话已读回执（useConversation.sendChannelAck 内部已有未读数守卫，单聊/群聊均支持）
 * 2. 首次拉取历史消息
 */
watch(currentConversation, async (cvs, oldCvs) => {
  if (!cvs || cvs.id === oldCvs?.id) return

  // 会话切换：清空引用状态与编辑态，避免跨会话残留
  clearQuote()
  exitEditMode()

  // 发送会话已读回执（内部已做未读数为 0 跳过；单聊/群聊均适用）
  sendChannelAck(cvs.id)

  // 首次拉取历史消息
  const existingMsgs = stores.message.getMessages(cvs.id)
  if (existingMsgs.length === 0) {
    await fetchHistoryMessages()
  }

  // 拉取服务端置顶消息列表
  fetchPinnedMessages()
}, { immediate: true })

/** 多选模式底部操作 */
/** 转发弹窗显示状态 */
const showForwardModal = ref(false)

/** 待转发的消息（单条或多选） */
const pendingForwardMessages = ref<Message[]>([])

/** 打开转发弹窗 */
function openForwardModal(messages: Message[]) {
  if (messages.length === 0) return
  pendingForwardMessages.value = messages
  showForwardModal.value = true
}

/** 当前转发模式：'oneByOne' 逐条转发 | 'combine' 合并转发 */
const forwardMode = ref<'oneByOne' | 'combine'>('combine')

/** 执行转发 */
async function onForwardConfirm(targetConversation: Conversation) {
  const messages = pendingForwardMessages.value
  if (messages.length === 0) return
  try {
    if (forwardMode.value === 'oneByOne') {
      // 逐条转发：每条消息单独转发
      for (const msg of messages) {
        await forwardMessage(msg, targetConversation)
      }
    } else {
      // 合并转发：使用合并消息 API
      await forwardCombineMessages(messages, targetConversation)
    }
  } catch (e) {
    console.warn('[Chat] forward messages failed:', e)
  }
  pendingForwardMessages.value = []
  exitMultiSelectMode()
}

/** 多选：逐条转发（每条消息单独转发） */
function onMultiSelectForwardOneByOne() {
  if (selectedMessages.value.length === 0) {
    exitMultiSelectMode()
    return
  }
  forwardMode.value = 'oneByOne'
  openForwardModal(selectedMessages.value)
}

/** 多选：合并转发 */
function onMultiSelectForwardCombine() {
  if (selectedMessages.value.length === 0) {
    exitMultiSelectMode()
    return
  }
  forwardMode.value = 'combine'
  openForwardModal(selectedMessages.value)
}

/** 多选：删除 */
function onMultiSelectDelete(messages: Message[]) {
  if (messages.length === 0) {
    exitMultiSelectMode()
    return
  }
  deleteMessages(messages.map(m => m.id))
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

    <!-- 置顶横幅 -->
    <PinnedBar
      v-if="showPinnedBar && currentConversation"
      :max-preview-length="pinnedBarMaxLength"
      @locate="onPinnedLocate"
    />

    <!-- 消息列表 -->
    <MessageList :config="props.config" @reedit="onReedit" @edit="onEdit" @forward="openForwardModal" @recall-failed="(err, msg) => emit('recall-failed', err, msg)" @mention-click="onMentionClick" />

    <!-- 输入状态提示 -->
    <TypingIndicator v-if="!isMultiSelectMode && isTyping" :show="isTyping" />

    <!-- 多选模式底部操作栏 -->
    <MultiSelectBar
      v-if="isMultiSelectMode"
      :selected-messages="selectedMessages"
      :total-messages="messages.length"
      @forward-one-by-one="onMultiSelectForwardOneByOne"
      @forward-combine="onMultiSelectForwardCombine"
      @delete="onMultiSelectDelete"
      @select-all="selectAllMessages(messages)"
      @deselect-all="deselectAllMessages()"
      @close="exitMultiSelectMode"
    />

    <!-- 输入框 -->
    <MessageInput v-if="!isMultiSelectMode" ref="messageInputRef" :config="props.config" :is-group="isGroupChat" />

    <!-- 聊天信息抽屉 -->
    <ChatInfoDrawer
      v-model:show="showDrawer"
      :conversation="currentConversation"
      :is-group="isGroupChat"
      :offset-top="headerHeight"
    />

    <!-- 转发弹窗 -->
    <ForwardModal
      v-model:show="showForwardModal"
      @forward="onForwardConfirm"
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
</style>
