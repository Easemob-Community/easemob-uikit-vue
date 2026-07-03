<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useClipboard, useScroll } from '@vueuse/core'
import type { GroupMessageReadUsersResult } from 'easemob-websdk'
import { useChat } from '../../../composables/use-chat'
import { useQuote } from '../../../composables/use-quote'
import { useViewport } from '../../../composables/use-viewport'
import { usePullRefresh } from '../../../composables/use-pull-refresh'
import { useLocale } from '../../../locale'
import MessageBubbleWrapper from '../message-item/message-bubble-wrapper.vue'
import GroupReadReceiptModal from '../group-read-receipt-modal/group-read-receipt-modal.vue'
import Modal from '../../../components/modal/modal.vue'
import type { TextMessageBody, UiMessage } from '../../../sdk/types'
import type { ChatConfig, MessageActionEvent } from '../types'
import { useToast } from '../../../composables/use-toast'
import MessageVirtualList from './message-virtual-list.vue'

export interface MessageListProps {
  config?: ChatConfig
}

export interface MessageListEmits {
  (e: 'reedit', message: UiMessage): void
  (e: 'recall-failed', error: any, message: UiMessage): void
  (e: 'edit', message: UiMessage): void
  (e: 'forward', messages: UiMessage[]): void
  (e: 'mention-click', userId: string): void
}

const props = defineProps<MessageListProps>()
const emit = defineEmits<MessageListEmits>()

const { messages, currentConversation, isMultiSelectMode, toggleMessageSelection, isMessageSelected, enterMultiSelectMode, fetchHistoryMessages, fetchGroupReadDetail, recallMessage, deleteMessage, pinMessage, unpinMessage, translateTextMessage, toggleTranslation, resendMessage, getHistoryCursor } = useChat()
const { setQuote, locateRequest, setHighlight } = useQuote()
const { isMobile } = useViewport()
const { t } = useLocale()
const { show: showToast } = useToast()

/** 剪贴板能力：优先使用 navigator.clipboard，不可用时自动降级 execCommand */
const { copy: copyToClipboard, isSupported: isClipboardSupported } = useClipboard({ legacy: true })

/** 消息列表容器引用 */
const listRef = ref<HTMLElement>()
/** 虚拟列表引用 */
const virtualListRef = ref<InstanceType<typeof MessageVirtualList>>()

/** 消息列表配置 */
const messageListConfig = computed(() => props.config?.messageList)

/** 虚拟滚动阈值 */
const virtualThreshold = computed(() => messageListConfig.value?.virtualScrollThreshold ?? 100)

/** 是否启用虚拟滚动 */
const enableVirtual = computed(() => messages.value.length > virtualThreshold.value)

/** 时间分组间隔 */
const groupInterval = computed(() => messageListConfig.value?.groupInterval ?? 5 * 60 * 1000)

/** 历史消息加载配置 */
const loadHistoryConfig = computed(() => messageListConfig.value?.loadHistory)

/** 是否启用历史加载 */
const enableLoadHistory = computed(() => loadHistoryConfig.value?.enable !== false)

/** 历史加载模式 */
const historyMode = computed(() => {
  const mode = loadHistoryConfig.value?.mode ?? 'auto'
  if (mode !== 'auto')
    return mode
  // PC 端（非触摸设备）强制使用 scroll-top，移动端使用 pull-down
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  if (!isTouchDevice)
    return 'scroll-top'
  return isMobile.value ? 'pull-down' : 'scroll-top'
})

/** 历史消息分页游标 */
const historyCursor = ref('')

/** 加载历史消息中 */
const loadingHistory = ref(false)

/** 是否还有更多历史消息 */
const hasMoreHistory = ref(true)

/** 是否在底部 */
const isAtBottom = ref(true)

/** 未读新消息数 */
const unreadNewCount = ref(0)

/** 用于区分新消息追加与历史消息前置 */
const previousConversationId = ref('')
const previousLastMsgId = ref('')

/** 滚动状态 —— 仅普通滚动模式使用 */
const { arrivedState } = useScroll(listRef, { throttle: 100 })

/** 监听滚动到底部状态（普通滚动模式） */
watch(() => arrivedState.bottom, (bottom) => {
  if (!enableVirtual.value) {
    isAtBottom.value = bottom
    if (bottom && unreadNewCount.value > 0) {
      unreadNewCount.value = 0
    }
  }
})

/** 虚拟列表滚动事件处理 */
function onVirtualScroll(event: Event) {
  const el = event.target as HTMLElement
  if (!el)
    return
  const threshold = 2
  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold
  isAtBottom.value = atBottom
  if (atBottom && unreadNewCount.value > 0) {
    unreadNewCount.value = 0
  }
}

/**
 * 监听当前会话切换，重置状态并滚动到底部
 *  ⚠️ 切勿改回监听 messages.value 引用：prependMessages 加载历史时也会替换数组引用，
 *     会被误判为切换会话从而把列表强制滚到底部，导致触顶加载只能触发一次。
 */
watch(
  () => currentConversation.value?.id,
  (cvsId) => {
    if (!cvsId)
      return
    unreadNewCount.value = 0
    isAtBottom.value = true
    previousConversationId.value = cvsId
    previousLastMsgId.value = messages.value[messages.value.length - 1]?.msgServerId || messages.value[messages.value.length - 1]?.msgLocalId || ''
    // 同步 cursor 状态：如果 useChat 已经加载过历史，使用缓存
    const cached = getHistoryCursor(cvsId)
    historyCursor.value = cached.cursor
    hasMoreHistory.value = !cached.isLast
    loadingHistory.value = false
    scrollToBottom()
    // 如果消息不足以撑满视口，自动加载历史，直到可滚动或没有更多
    void ensureHistoryFill()
  },
  { flush: 'post', immediate: true },
)

/** 监听消息数量变化，处理新消息到达时的智能滚动 */
watch(
  () => messages.value.length,
  async (newLen, oldLen) => {
    const cvsId = currentConversation.value?.id || ''
    // 切换会话时重置基准，避免把旧会话的 lastMsgId 带过来
    if (cvsId !== previousConversationId.value) {
      previousConversationId.value = cvsId
      previousLastMsgId.value = messages.value[newLen - 1]?.msgServerId || messages.value[newLen - 1]?.msgLocalId || ''
      return
    }
    if (newLen <= (oldLen || 0))
      return
    const lastMsg = messages.value[newLen - 1]
    const lastId = lastMsg?.msgServerId || lastMsg?.msgLocalId || ''
    // lastId 没变说明是前置历史消息，不应该计入新消息
    const isAppend = lastId !== '' && lastId !== previousLastMsgId.value
    previousLastMsgId.value = lastId
    if (isAppend) {
      if (lastMsg?.isSelf) {
        // 自己发送的消息，始终滚动到底部
        scrollToBottom()
      }
      else if (isAtBottom.value) {
        // 在底部，自动滚动
        scrollToBottom()
      }
      else {
        // 不在底部，累积未读
        unreadNewCount.value++
      }
    }
    // 如果消息列表仍未撑满视口，继续自动加载历史
    await ensureHistoryFill()
  },
)

/** 滚动到底部 */
function scrollToBottom() {
  nextTick(() => {
    if (enableVirtual.value) {
      virtualListRef.value?.scrollToBottom()
    }
    else if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  })
}

defineExpose({
  scrollToBottom,
})

/** 点击新消息提示 */
function onNewMessageTipClick() {
  unreadNewCount.value = 0
  scrollToBottom()
}

/** 加载历史消息 */
async function loadMoreHistory() {
  if (loadingHistory.value || !hasMoreHistory.value)
    return
  loadingHistory.value = true

  // 根据当前模式选择正确的容器和恢复方式
  const isVirtual = enableVirtual.value
  const container = isVirtual
    ? (virtualListRef.value as unknown as { listRef?: HTMLElement } | undefined)?.listRef
    : listRef.value

  const prevScrollHeight = container?.scrollHeight ?? 0
  const prevScrollTop = container?.scrollTop ?? 0

  try {
    // fetchHistoryMessages 内部会自动管理 cursor，无需传入
    const result = await fetchHistoryMessages()
    if (result) {
      historyCursor.value = result.cursor
      // SDK 返回 isLast 表示是否为最后一页
      if (result.isLast || result.messages.length === 0) {
        hasMoreHistory.value = false
      }
    }
    else {
      hasMoreHistory.value = false
    }
  }
  catch (e) {
    console.error('[MessageList] loadMoreHistory failed:', e)
    hasMoreHistory.value = false
  }
  loadingHistory.value = false

  // 恢复滚动位置：加载后 scrollHeight 变化了，需要补偿 scrollTop
  if (isVirtual && virtualListRef.value) {
    // 虚拟列表模式：通过组件方法恢复
    (virtualListRef.value as unknown as { preserveScrollPosition?: (t: number, h: number) => void })?.preserveScrollPosition?.(prevScrollTop, prevScrollHeight)
  }
  else if (container && prevScrollHeight > 0) {
    // 普通滚动模式：直接操作 DOM，确保恢复后 scrollTop > threshold 避免立即再次触发
    await nextTick()
    const newScrollHeight = container.scrollHeight
    const targetScrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight)
    container.scrollTop = Math.max(targetScrollTop, 60)
  }
}

/**
 * 自动填充历史消息：当消息列表不足以撑满视口且还有历史消息时，
 * 自动继续加载，避免登录后只有几条新消息时无法触发滚动加载。
 */
async function ensureHistoryFill() {
  if (!enableLoadHistory.value || !hasMoreHistory.value || loadingHistory.value)
    return
  if (enableVirtual.value)
    return

  await nextTick()
  const container = listRef.value
  if (!container)
    return

  let attempts = 0
  const maxAttempts = 5
  while (
    container.scrollHeight <= container.clientHeight + 1
    && hasMoreHistory.value
    && !loadingHistory.value
    && attempts < maxAttempts
  ) {
    attempts++
    await loadMoreHistory()
    await nextTick()
  }
}

/** PC 端：滚动到顶部加载（自定义实现，避免 useInfiniteScroll 空容器疯狂触发） */
function onNativeScroll(event: Event) {
  const el = event.target as HTMLElement
  if (!el)
    return
  if (historyMode.value !== 'scroll-top' || !enableLoadHistory.value)
    return
  if (loadingHistory.value || !hasMoreHistory.value)
    return
  if (messages.value.length === 0)
    return

  const threshold = 50
  if (el.scrollTop <= threshold) {
    loadMoreHistory()
  }
}

/** H5 端：下拉加载 */
const { isPulling, isRefreshing, pullDistance } = usePullRefresh(listRef, {
  onRefresh: async () => {
    if (historyMode.value === 'pull-down' && enableLoadHistory.value) {
      await loadMoreHistory()
    }
  },
})

/** 群已读弹窗状态 */
const showGroupReadModal = ref(false)
const modalReadList = ref<string[]>([])
const modalUnreadList = ref<string[]>([])

/** 删除确认弹窗状态 */
const showDeleteConfirm = ref(false)
const pendingDeleteMessage = ref<UiMessage | null>(null)

/** 处理消息操作 */
async function onMessageAction(event: MessageActionEvent) {
  if (event.action === 'multiSelect') {
    enterMultiSelectMode()
    toggleMessageSelection(event.message.msgServerId || event.message.msgLocalId)
    return
  }
  if (event.action === 'recall') {
    try {
      await recallMessage(event.message.msgServerId || event.message.msgLocalId)
    }
    catch (e) {
      emit('recall-failed', e, event.message)
    }
    return
  }
  if (event.action === 'copy') {
    await handleCopyMessage(event.message)
    return
  }
  if (event.action === 'quote') {
    setQuote(event.message)
    return
  }
  if (event.action === 'delete') {
    pendingDeleteMessage.value = event.message
    showDeleteConfirm.value = true
    return
  }
  if (event.action === 'forward') {
    emit('forward', [event.message])
    return
  }
  if (event.action === 'edit') {
    // 编辑：向上层 emit 'edit'，chat.vue 负责进入编辑模式并回填输入框
    if (event.message.type === 'text' && !event.message.recalled) {
      emit('edit', event.message)
    }
    return
  }
  if (event.action === 'pin') {
    try {
      await pinMessage(event.message)
    }
    catch (e: unknown) {
      console.warn('[MessageList] pinMessage failed:', e)
      showToast(e instanceof Error ? e.message : String(e) || t('message.action.pin') || '置顶失败')
    }
    return
  }
  if (event.action === 'unpin') {
    try {
      await unpinMessage(event.message)
    }
    catch (e: unknown) {
      console.warn('[MessageList] unpinMessage failed:', e)
      showToast(e instanceof Error ? e.message : String(e) || t('message.action.unpin') || '取消置顶失败')
    }
    return
  }
  if (event.action === 'translate') {
    if (event.message.type !== 'text')
      return
    try {
      await translateTextMessage(event.message, props.config?.messageAction?.translateTargetLang)
    }
    catch (e: unknown) {
      console.warn('[MessageList] translateTextMessage failed:', e)
      showToast(resolveTranslateErrorMessage(e))
    }
  }
  // TODO: 处理其他操作（转发）
}

/** 根据 SDK 翻译错误提取友好的提示文案 */
function resolveTranslateErrorMessage(e: unknown): string {
  const httpStatus = (e as { details?: { httpStatus?: number } })?.details?.httpStatus
  if (httpStatus === 403) {
    return t('message.translate.noPermission') || '暂无翻译权限'
  }
  if (typeof httpStatus === 'number' && (httpStatus === 404 || httpStatus === 503 || httpStatus >= 500)) {
    return t('message.translate.serviceUnavailable') || '翻译服务未开通，请联系管理员开通'
  }
  return t('message.translate.failed') || '翻译失败，请稍后重试'
}

/** 文本消息翻译切换（显示译文/原文） */
function onToggleTranslation(message: UiMessage) {
  toggleTranslation(message.msgServerId || message.msgLocalId)
}

/** 通过 VueUse useClipboard 复制消息文本 */
async function handleCopyMessage(message: UiMessage) {
  const text = message.type === 'text' ? (message.body as TextMessageBody).content || '' : ''
  if (!text) {
    showToast(t('message.copyFailed') ?? '复制失败')
    return
  }
  if (!isClipboardSupported.value) {
    showToast(t('message.copyFailed') ?? '复制失败')
    return
  }
  try {
    await copyToClipboard(text)
    showToast(t('message.copySuccess') ?? '已复制')
  }
  catch {
    showToast(t('message.copyFailed') ?? '复制失败')
  }
}

/** 处理重新编辑 */
function onReedit(message: UiMessage) {
  emit('reedit', message)
}

/** 处理重发失败消息 */
async function onResend(message: UiMessage) {
  try {
    await resendMessage(message)
  }
  catch (e: unknown) {
    console.warn('[MessageList] resend failed:', e)
    showToast(e instanceof Error ? e.message : String(e) || t('message.resend.failed') || '重发失败')
  }
}

/** 处理群已读点击 */
async function onGroupReadClick(msgId: string, groupId: string) {
  try {
    const result: GroupMessageReadUsersResult = await fetchGroupReadDetail(msgId, groupId)
    // SDK 返回 users 为已读用户列表，每个 GroupMessageReadUser 包含 userId
    const readUsers = result?.users?.map(u => u.userId) || []
    // 未读用户列表：当前无法直接从 SDK 获取，需业务层维护群成员列表后做差集
    // 此处先展示已读列表，未读列表留空（或后续接入群成员全量列表后补充）
    modalReadList.value = readUsers
    modalUnreadList.value = []
    showGroupReadModal.value = true
  }
  catch (e) {
    console.warn('[MessageList] fetchGroupReadDetail failed:', e)
  }
}

/** 处理多选切换 */
function onToggleSelect(msgId: string) {
  if (isMultiSelectMode.value) {
    toggleMessageSelection(msgId)
  }
}

/** 是否需要显示时间分割线 */
function shouldShowTimeDivider(current: UiMessage, previous: UiMessage | null): boolean {
  if (!previous)
    return true
  return current.timestamp - previous.timestamp > groupInterval.value
}

/** 格式化时间分割线 */
function formatDividerTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  if (isToday)
    return `${hours}:${minutes}`
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

/** 带时间分割线的消息列表 */
const messagesWithDividers = computed(() => {
  const result: Array<{ key: string, type: 'message' | 'divider', data: UiMessage | string, index: number }> = []
  let lastMsg: UiMessage | null = null
  messages.value.forEach((msg, index) => {
    if (shouldShowTimeDivider(msg, lastMsg)) {
      result.push({ key: `divider-${msg.timestamp}`, type: 'divider', data: formatDividerTime(msg.timestamp), index: -1 })
    }
    result.push({ key: msg.msgServerId || msg.msgLocalId, type: 'message', data: msg, index })
    lastMsg = msg
  })
  return result
})

/** 闪烁高亮计时器，避免连续点击多个计时器堆积 */
let highlightTimer: ReturnType<typeof setTimeout> | null = null

/** 定位并闪烁原消息；优先匹配 msgServerId，其次 msgLocalId；未找到返回 false */
function locateAndFlash(targetMsgID: string): boolean {
  if (!targetMsgID)
    return false
  const targetIndex = messages.value.findIndex(m => m.msgServerId === targetMsgID || m.msgLocalId === targetMsgID)
  if (targetIndex === -1)
    return false
  // 虚拟列表：先通过索引滚动使原消息被渲染，再在下一帧查找 DOM 进行平滑居中
  const useVirtual = enableVirtual.value
  if (useVirtual) {
    // 虚拟列表中消息项位于 messagesWithDividers，需定位到包含该消息的项索引
    const targetMsg = messages.value[targetIndex]
    const itemIndex = messagesWithDividers.value.findIndex(
      it => it.type === 'message'
        && ((it.data as UiMessage).msgServerId === targetMsg.msgServerId
          || (it.data as UiMessage).msgLocalId === targetMsg.msgLocalId),
    )
    if (itemIndex !== -1)
      virtualListRef.value?.scrollToIndex(itemIndex)
  }
  nextTick(() => {
    const root = useVirtual
      ? (virtualListRef.value as unknown as { listRef?: HTMLElement } | undefined)?.listRef
      : listRef.value
    if (root) {
      const el = root.querySelector<HTMLElement>(`[data-msg-id="${targetMsgID}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    setHighlight(targetMsgID)
    if (highlightTimer)
      clearTimeout(highlightTimer)
    highlightTimer = setTimeout(() => {
      setHighlight('')
      highlightTimer = null
    }, 1300)
  })
  return true
}

/** watch 引用点击发起的定位请求 */
watch(locateRequest, (req) => {
  if (!req)
    return
  const ok = locateAndFlash(req.msgID)
  if (!ok) {
    showToast(t('message.quote.notFound') ?? '原消息已删除或未加载')
  }
})
</script>

<template>
  <div class="message-list">
    <!-- H5 下拉刷新指示器 -->
    <div
      v-if="historyMode === 'pull-down' && enableLoadHistory"
      class="message-list__pull-indicator"
      :style="{ height: `${pullDistance}px` }"
    >
      <span v-if="isRefreshing">{{ t('conversation.loadingMore') }}</span>
      <span v-else-if="isPulling">{{ t('conversation.pullRefresh') }}</span>
    </div>

    <!-- PC 顶部加载/无更多指示器 -->
    <div
      v-if="historyMode === 'scroll-top' && messages.length > 0 && (loadingHistory || !hasMoreHistory)"
      class="message-list__top-loading"
    >
      <span v-if="loadingHistory">{{ t('conversation.loadingMore') }}</span>
      <span v-else>{{ t('conversation.noMoreHistory') || '没有更多历史消息' }}</span>
    </div>

    <!-- 虚拟滚动模式 -->
    <MessageVirtualList
      v-if="enableVirtual"
      ref="virtualListRef"
      :items="messagesWithDividers"
      key-field="key"
      :estimate-height="80"
      @reach-top="loadMoreHistory"
      @scroll="onVirtualScroll"
    >
      <template #default="{ item }">
        <!-- 时间分割线 -->
        <div v-if="item.type === 'divider'" class="message-list__divider">
          <span>{{ item.data }}</span>
        </div>
        <!-- 消息气泡 -->
        <MessageBubbleWrapper
          v-else
          :message="item.data as UiMessage"
          :config="messageListConfig"
          :action-config="config?.messageAction"
          :is-multi-select-mode="isMultiSelectMode"
          :is-selected="isMessageSelected((item.data as UiMessage).msgServerId || (item.data as UiMessage).msgLocalId)"
          @toggle-select="onToggleSelect"
          @action="onMessageAction"
          @group-read-click="onGroupReadClick"
          @reedit="onReedit"
          @resend="onResend"
          @toggle-translation="onToggleTranslation"
          @mention-click="emit('mention-click', $event)"
        />
      </template>
    </MessageVirtualList>

    <!-- 普通滚动模式 -->
    <div v-else ref="listRef" class="message-list__scroll" @scroll="onNativeScroll">
      <div
        v-for="item in messagesWithDividers"
        :key="item.key"
        class="message-list__item"
      >
        <!-- 时间分割线 -->
        <div v-if="item.type === 'divider'" class="message-list__divider">
          <span>{{ item.data }}</span>
        </div>
        <!-- 消息气泡 -->
        <MessageBubbleWrapper
          v-else
          :message="item.data as UiMessage"
          :config="messageListConfig"
          :action-config="config?.messageAction"
          :is-multi-select-mode="isMultiSelectMode"
          :is-selected="isMessageSelected((item.data as UiMessage).msgServerId || (item.data as UiMessage).msgLocalId)"
          @toggle-select="onToggleSelect"
          @action="onMessageAction"
          @group-read-click="onGroupReadClick"
          @reedit="onReedit"
          @resend="onResend"
          @toggle-translation="onToggleTranslation"
          @mention-click="emit('mention-click', $event)"
        />
      </div>
    </div>

    <!-- 新消息提示 -->
    <div
      v-if="unreadNewCount > 0"
      class="message-list__new-tip"
      @click="onNewMessageTipClick"
    >
      <span>{{ unreadNewCount }} 条新消息</span>
      <span class="message-list__new-tip-arrow">&#8595;</span>
    </div>

    <!-- 群已读详情弹窗 -->
    <GroupReadReceiptModal
      v-model:show="showGroupReadModal"
      :read-list="modalReadList"
      :unread-list="modalUnreadList"
    />

    <!-- 删除确认弹窗 -->
    <Modal
      v-model:show="showDeleteConfirm"
      :title="t('message.action.delete')"
      :confirm-text="t('button.confirm')"
      :cancel-text="t('button.cancel')"
      @confirm="pendingDeleteMessage && deleteMessage(pendingDeleteMessage.msgServerId || pendingDeleteMessage.msgLocalId); pendingDeleteMessage = null"
      @cancel="pendingDeleteMessage = null"
    >
      {{ t('message.delete.confirm') }}
    </Modal>
  </div>
</template>

<style scoped>
.message-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.message-list__scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  -webkit-overflow-scrolling: touch;
}

.message-list__item {
  display: flex;
  flex-direction: column;
}

.message-list__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}

.message-list__divider span {
  padding: 2px 10px;
  border-radius: var(--uikit-components-radius, 4px);
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-secondary);
  font-size: 12px;
}

/* 下拉刷新指示器 */
.message-list__pull-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: height 0.1s;
  color: var(--uikit-text-secondary);
  font-size: 13px;
}

/* 顶部加载指示器 */
.message-list__top-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  color: var(--uikit-text-secondary);
  font-size: 13px;
}

/* 新消息提示 */
.message-list__new-tip {
  position: absolute;
  bottom: calc(16px + var(--uikit-safe-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  border-radius: 20px;
  background-color: var(--uikit-primary-color);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition:
    transform var(--uikit-anim-duration) var(--uikit-anim-easing),
    opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
  z-index: 10;
}

.message-list__new-tip:hover {
  transform: translateX(-50%) translateY(-2px);
}

.message-list__new-tip-arrow {
  font-size: 12px;
}
</style>
