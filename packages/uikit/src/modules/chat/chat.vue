<script setup lang="ts">
import { computed, nextTick, onErrorCaptured, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useChat } from '../../composables/use-chat'
import { useUIKit } from '../../composables/use-uikit'
import { useConversation } from '../../composables/use-conversation'
import { useQuote } from '../../composables/use-quote'
import { useLocale } from '../../locale'
import { useToast } from '../../composables/use-toast'
import { CONVERSATION_TYPE } from '../../constants'
import type { UiConversation as Conversation, TextMessageBody, UiMessage } from '../../sdk/types'
import Icon from '../../components/icon/icon.vue'
import Avatar from '../../components/avatar/avatar.vue'
import type { ChatConfig } from './types'
import MessageList from './message-list/message-list.vue'
import MessageInput from './message-input.vue'
import PinnedBar from './message-list/pinned-bar.vue'
import ChatInfoDrawer from './drawer/chat-info-drawer.vue'
import ForwardModal from './forward-modal/forward-modal.vue'
import MultiSelectBar from './multi-select-bar/multi-select-bar.vue'
import TypingIndicator from './typing-indicator/typing-indicator.vue'

/** 渲染错误信息 */
interface RenderError {
  message: string
  component?: string
}

export interface ChatProps {
  config?: ChatConfig
  /** 是否处于全局加载状态 */
  loading?: boolean
  /** 自定义根元素 class */
  class?: string
  /** 自定义根元素 style */
  style?: Record<string, string>
}

export interface ChatEmits {
  (e: 'recall-failed', error: any, message: UiMessage): void
  (e: 'at-me-click', userId: string): void
}

const props = defineProps<ChatProps>()
const emit = defineEmits<ChatEmits>()

/** 暴露输入框操作方法 */
defineExpose({
  setText: (text: string) => messageInputRef.value?.setText?.(text),
  getText: () => messageInputRef.value?.getText?.() || '',
})

const { currentConversation, isMultiSelectMode, messages, selectedMessages, exitMultiSelectMode, fetchHistoryMessages, enterEditMode, exitEditMode, fetchPinnedMessages, deleteMessages, forwardMessage, forwardCombineMessages, selectAllMessages, deselectAllMessages, setTyping, TYPING_DURATION } = useChat()
const { stores } = useUIKit()
const { sendChannelAck, saveDraft, loadDraft, clearDraft } = useConversation()
const { clearQuote, requestLocate } = useQuote()

/** 组件卸载时清理残留状态 */
onUnmounted(() => {
  exitMultiSelectMode()
  exitEditMode()
  clearQuote()
})
const { t } = useLocale()
const { show: showToast } = useToast()

/** 错误边界状态 */
const renderError = ref<RenderError | null>(null)

/** 捕获子组件渲染错误 */
onErrorCaptured((err, instance, info) => {
  const errMsg = err instanceof Error ? err.message : String(err)
  renderError.value = {
    message: errMsg,
    component: instance?.$options?.name || info,
  }
  console.error('[Chat] render error captured:', err, info)
  return false
})

/** 清除错误状态 */
function clearRenderError() {
  renderError.value = null
}

/** 向后代组件提供 textMessage 配置（链接识别 & 拦截器） */
provide('textMessageConfig', computed(() => props.config?.textMessage))

/** 输入框组件引用 */
const messageInputRef = ref<InstanceType<typeof MessageInput>>()

/** 重新编辑：将撤回消息的原文回显到输入框 */
function onReedit(message: UiMessage) {
  const originalText = message.originalMsg
  if (!originalText)
    return
  // 重新编辑是"发送一条新消息"，不进入编辑态
  exitEditMode()
  nextTick(() => messageInputRef.value?.setText?.(originalText))
}

/** 进入编辑态：仅文本消息 */
function onEdit(message: UiMessage) {
  if (!message || message.type !== 'text')
    return
  enterEditMode(message)
  const originalText = (message.body as TextMessageBody).content || ''
  nextTick(() => messageInputRef.value?.setText?.(originalText))
}

/** 草稿功能开关 */
const enableDraft = computed(() => props.config?.enableDraft !== false)

/** 恢复草稿到输入框（无草稿时清空输入） */
function restoreDraft(cvsId: string) {
  if (!enableDraft.value)
    return
  const draft = loadDraft(cvsId)
  nextTick(() => {
    // 防止异步竞态：仅当会话仍为目标会话时才操作输入框
    if (currentConversation.value?.id !== cvsId)
      return
    messageInputRef.value?.setText?.(draft || '')
  })
}

/** 保存当前输入框草稿 */
function saveCurrentDraft(cvsId: string) {
  if (!enableDraft.value)
    return
  const text = messageInputRef.value?.getText?.() || ''
  if (text.trim()) {
    saveDraft(cvsId, text)
  }
  else {
    clearDraft(cvsId)
  }
}

/** 发送成功后清除草稿 */
function handleSendSuccess() {
  if (!enableDraft.value)
    return
  const cvsId = currentConversation.value?.id
  if (!cvsId)
    return
  clearDraft(cvsId)
}

/** 置顶横幅配置 */
const pinnedBarConfig = computed(() => props.config?.messageList?.pinnedBar)
const showPinnedBar = computed(() => pinnedBarConfig.value?.visible !== false)
const pinnedBarMaxLength = computed(() => pinnedBarConfig.value?.maxPreviewLength ?? 30)

/** 在消息列表中定位置顶消息 */
function onPinnedLocate(message: UiMessage) {
  const target = message.msgServerId || message.msgLocalId
  if (target)
    requestLocate(target)
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
  if (!enableTyping.value || !currentConversation.value)
    return false
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
      setTyping()
    }
    typingHideTimer = null
  }, TYPING_DURATION)
}

/** 监听 typing 状态变化：显示时启动定时器 */
watch(isTyping, (typing) => {
  if (typing) {
    startTypingHideTimer()
  }
  else {
    clearTypingTimer()
  }
})

/** 会话切换时清理 typing 状态 */
watch(currentConversation, (cvs, oldCvs) => {
  if (oldCvs && oldCvs.id !== cvs?.id) {
    clearTypingTimer()
    setTyping()
  }
})

/** 组件卸载时清理 */
onUnmounted(() => {
  clearTypingTimer()
})

/**
 * 尝试定位到首条@我的消息
 * - 如果消息已存在于列表中，直接定位并清除该会话的@我记录
 * - 如果消息不在列表中（可能在更旧的历史中），给出提示
 */
function locateAtMeMessage(cvsId: string) {
  const atMeMsgIds = stores.message.getAtMeMessages(cvsId)
  if (atMeMsgIds.length === 0)
    return

  const firstAtMeMsgId = atMeMsgIds[0]
  const existingMsgs = stores.message.getMessages(cvsId)
  const found = existingMsgs.some(m => m.msgServerId === firstAtMeMsgId || m.msgLocalId === firstAtMeMsgId)

  if (found) {
    // 消息已加载，直接定位，定位完成后清除记录避免重复定位
    nextTick(() => {
      requestLocate(firstAtMeMsgId)
      stores.message.clearAtMe(cvsId)
    })
  }
  else {
    // 消息不在当前已加载列表中，提示用户向上加载更多历史
    // 可选：自动触发历史消息加载直到找到该消息（此处仅做提示）
    console.warn('[Chat] @me message not in loaded history, scroll up to load more:', firstAtMeMsgId)
  }
}

/**
 * 会话切换时：
 * 1. 发送会话已读回执（useConversation.sendChannelAck 内部已有未读数守卫，单聊/群聊均支持）
 * 2. 首次拉取历史消息
 * 3. 若有@我的消息，自动定位到首条@消息
 */
watch(currentConversation, async (cvs, oldCvs) => {
  if (!cvs || cvs.id === oldCvs?.id)
    return

  // 切换会话前：保存旧会话的未发送内容作为草稿
  if (oldCvs) {
    saveCurrentDraft(oldCvs.id)
  }

  // 会话切换：清空引用状态与编辑态，避免跨会话残留
  clearQuote()
  exitEditMode()

  // 发送会话已读回执（内部已做未读数为 0 跳过；单聊/群聊均适用）
  sendChannelAck(cvs.id)

  // 首次拉取历史消息
  const existingMsgs = stores.message.getMessages(cvs.id)
  let historyLoaded = false
  if (existingMsgs.length === 0) {
    await fetchHistoryMessages()
    historyLoaded = true
  }

  // 拉取服务端置顶消息列表
  fetchPinnedMessages()

  // 自动定位到首条@我的消息（如果启用）
  if (props.config?.messageList?.autoLocateAtMe !== false) {
    // 如果刚刚加载了历史消息，等待渲染完成后再定位
    if (historyLoaded) {
      nextTick(() => {
        locateAtMeMessage(cvs.id)
      })
    }
    else {
      locateAtMeMessage(cvs.id)
    }
  }

  // 恢复新会话的草稿到输入框
  restoreDraft(cvs.id)
}, { immediate: true })

/** 多选模式底部操作 */
/** 转发弹窗显示状态 */
const showForwardModal = ref(false)

/** 待转发的消息（单条或多选） */
const pendingForwardMessages = ref<UiMessage[]>([])

/** 打开转发弹窗 */
function openForwardModal(messages: UiMessage[]) {
  if (messages.length === 0)
    return
  pendingForwardMessages.value = messages
  showForwardModal.value = true
}

/** 当前转发模式：'oneByOne' 逐条转发 | 'combine' 合并转发 */
const forwardMode = ref<'oneByOne' | 'combine'>('combine')

/** 执行转发 */
async function onForwardConfirm(targetConversation: Conversation) {
  const messages = pendingForwardMessages.value
  if (messages.length === 0)
    return
  try {
    if (forwardMode.value === 'oneByOne') {
      // 逐条转发：每条消息单独转发
      for (const msg of messages) {
        await forwardMessage(msg, targetConversation)
      }
    }
    else {
      // 合并转发：使用合并消息 API
      await forwardCombineMessages(messages, targetConversation)
    }
    // 仅成功后才清空状态
    pendingForwardMessages.value = []
    exitMultiSelectMode()
  }
  catch (e) {
    console.warn('[Chat] forward messages failed:', e)
    showToast(t('message.forward.failed') || '转发失败')
  }
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
function onMultiSelectDelete(messages: UiMessage[]) {
  if (messages.length === 0) {
    exitMultiSelectMode()
    return
  }
  deleteMessages(messages.map(m => m.msgServerId || m.msgLocalId))
  exitMultiSelectMode()
}
</script>

<template>
  <div class="chat" :class="props.class" :style="props.style">
    <!-- 全局加载状态 -->
    <div v-if="props.loading" class="chat__loading">
      <slot name="loading">
        <span class="chat__loading-text">{{ t('conversation.loadingMore') || '加载中...' }}</span>
      </slot>
    </div>

    <!-- 错误边界：子组件渲染错误时显示降级 UI -->
    <div v-else-if="renderError" class="chat__error">
      <slot name="error" :error="renderError">
        <div class="chat__error-content">
          <span class="chat__error-icon">&#9888;</span>
          <span class="chat__error-text">{{ renderError.message }}</span>
          <button class="chat__error-retry" @click="clearRenderError">
            {{ t('button.confirm') || '重试' }}
          </button>
        </div>
      </slot>
    </div>

    <!-- 空状态：无当前会话 -->
    <div v-else-if="!currentConversation" class="chat__empty">
      <slot name="empty">
        <span class="chat__empty-text">{{ t('chat.empty') || '请选择会话' }}</span>
      </slot>
    </div>

    <template v-else>
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
      <MessageList :config="props.config" @reedit="onReedit" @edit="onEdit" @forward="openForwardModal" @recall-failed="(err, msg) => emit('recall-failed', err, msg)" @mention-click="(userId) => emit('at-me-click', userId)" />

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
      <MessageInput
        v-if="!isMultiSelectMode"
        ref="messageInputRef"
        :config="props.config"
        :is-group="isGroupChat"
        @send-success="handleSendSuccess"
      />

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
    </template>
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

/* 空状态：上下左右居中 */
.chat__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat__empty-text {
  font-size: 14px;
  color: var(--uikit-text-secondary);
}

/* 全局加载状态 */
.chat__loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat__loading-text {
  font-size: 14px;
  color: var(--uikit-text-secondary);
}

/* 错误边界 */
.chat__error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat__error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
}

.chat__error-icon {
  font-size: 32px;
  color: #e74c3c;
}

.chat__error-text {
  font-size: 14px;
  color: var(--uikit-text-secondary);
  text-align: center;
  word-break: break-word;
}

.chat__error-retry {
  padding: 8px 20px;
  border-radius: 6px;
  border: none;
  background-color: var(--uikit-primary-color);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.chat__error-retry:hover {
  opacity: 0.9;
}

.chat__header {
  position: relative;
  z-index: 101;
  padding: 12px 16px;
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
