<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useInfiniteScroll, useScroll } from '@vueuse/core'
import { useChat } from '../../composables/use-chat'
import { useViewport } from '../../composables/use-viewport'
import { usePullRefresh } from '../../composables/use-pull-refresh'
import { useLocale } from '../../locale'
import MessageBubbleWrapper from './message-item/message-bubble-wrapper.vue'
import MessageVirtualList from './message-virtual-list.vue'
import type { ChatConfig, MessageActionEvent } from './types'
import type { Message } from '../../store/message'

export interface MessageListProps {
  config?: ChatConfig
}

const props = defineProps<MessageListProps>()

const { messages, isMultiSelectMode, toggleMessageSelection, isMessageSelected, enterMultiSelectMode } = useChat()
const { isMobile } = useViewport()
const { t } = useLocale()

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
  if (mode === 'auto') return isMobile.value ? 'pull-down' : 'scroll-top'
  return mode
})

/** 加载历史消息中 */
const loadingHistory = ref(false)

/** 是否还有更多历史消息 */
const hasMoreHistory = ref(true)

/** 是否在底部 */
const isAtBottom = ref(true)

/** 未读新消息数 */
const unreadNewCount = ref(0)

/** 滚动状态 */
const { arrivedState } = useScroll(listRef, { throttle: 100 })

/** 监听滚动到底部状态 */
watch(() => arrivedState.bottom, (bottom) => {
  isAtBottom.value = bottom
  if (bottom && unreadNewCount.value > 0) {
    unreadNewCount.value = 0
  }
})

/** 监听消息变化，处理智能滚动 */
watch(
  () => messages.value.length,
  (newLen, oldLen) => {
    if (newLen > (oldLen || 0)) {
      // 有新消息加入
      const lastMsg = messages.value[messages.value.length - 1]
      if (lastMsg?.isSelf) {
        // 自己发送的消息，始终滚动到底部
        scrollToBottom()
      } else if (isAtBottom.value) {
        // 在底部，自动滚动
        scrollToBottom()
      } else {
        // 不在底部，累积未读
        unreadNewCount.value++
      }
    }
  }
)

/** 滚动到底部 */
function scrollToBottom() {
  nextTick(() => {
    if (enableVirtual.value) {
      virtualListRef.value?.scrollToBottom()
    } else if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  })
}

/** 点击新消息提示 */
function onNewMessageTipClick() {
  unreadNewCount.value = 0
  scrollToBottom()
}

/** 加载历史消息 */
async function loadMoreHistory() {
  if (loadingHistory.value || !hasMoreHistory.value) return
  loadingHistory.value = true
  const beforeCount = messages.value.length
  // TODO: 接入真实的历史消息加载逻辑
  await new Promise((resolve) => setTimeout(resolve, 800))
  const afterCount = messages.value.length
  if (afterCount <= beforeCount) {
    hasMoreHistory.value = false
  }
  loadingHistory.value = false
}

/** PC 端：滚动到顶部加载 */
useInfiniteScroll(
  listRef,
  () => {
    if (historyMode.value === 'scroll-top' && enableLoadHistory.value) {
      loadMoreHistory()
    }
  },
  { distance: 50 }
)

/** H5 端：下拉加载 */
const { isPulling, isRefreshing, pullDistance } = usePullRefresh(listRef, {
  onRefresh: async () => {
    if (historyMode.value === 'pull-down' && enableLoadHistory.value) {
      await loadMoreHistory()
    }
  },
})

/** 处理消息操作 */
function onMessageAction(event: MessageActionEvent) {
  if (event.action === 'multiSelect') {
    enterMultiSelectMode()
    toggleMessageSelection(event.message.id)
  }
  // TODO: 处理其他操作（引用、复制、删除、撤回、转发、翻译、置顶）
}

/** 处理多选切换 */
function onToggleSelect(msgId: string) {
  if (isMultiSelectMode.value) {
    toggleMessageSelection(msgId)
  }
}

/** 是否需要显示时间分割线 */
function shouldShowTimeDivider(current: Message, previous: Message | null): boolean {
  if (!previous) return true
  return current.timestamp - previous.timestamp > groupInterval.value
}

/** 格式化时间分割线 */
function formatDividerTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  if (isToday) return `${hours}:${minutes}`
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

/** 带时间分割线的消息列表 */
const messagesWithDividers = computed(() => {
  const result: Array<{ key: string; type: 'message' | 'divider'; data: Message | string; index: number }> = []
  let lastMsg: Message | null = null
  messages.value.forEach((msg, index) => {
    if (shouldShowTimeDivider(msg, lastMsg)) {
      result.push({ key: `divider-${msg.timestamp}`, type: 'divider', data: formatDividerTime(msg.timestamp), index: -1 })
    }
    result.push({ key: msg.id, type: 'message', data: msg, index })
    lastMsg = msg
  })
  return result
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

    <!-- PC 顶部加载指示器 -->
    <div
      v-if="historyMode === 'scroll-top' && loadingHistory"
      class="message-list__top-loading"
    >
      <span>{{ t('conversation.loadingMore') }}</span>
    </div>

    <!-- 虚拟滚动模式 -->
    <MessageVirtualList
      v-if="enableVirtual"
      ref="virtualListRef"
      :items="messagesWithDividers"
      key-field="key"
      :estimate-height="80"
      @reach-top="loadMoreHistory"
    >
      <template #default="{ item }">
        <!-- 时间分割线 -->
        <div v-if="item.type === 'divider'" class="message-list__divider">
          <span>{{ item.data }}</span>
        </div>
        <!-- 消息气泡 -->
        <MessageBubbleWrapper
          v-else
          :message="item.data as Message"
          :config="messageListConfig"
          :action-config="config?.messageAction"
          :is-multi-select-mode="isMultiSelectMode"
          :is-selected="isMessageSelected((item.data as Message).id)"
          @toggle-select="onToggleSelect"
          @action="onMessageAction"
        />
      </template>
    </MessageVirtualList>

    <!-- 普通滚动模式 -->
    <div v-else ref="listRef" class="message-list__scroll">
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
          :message="item.data as Message"
          :config="messageListConfig"
          :action-config="config?.messageAction"
          :is-multi-select-mode="isMultiSelectMode"
          :is-selected="isMessageSelected((item.data as Message).id)"
          @toggle-select="onToggleSelect"
          @action="onMessageAction"
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
  border-radius: 4px;
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
  bottom: 16px;
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
  transition: transform 0.2s, opacity 0.2s;
  z-index: 10;
}

.message-list__new-tip:hover {
  transform: translateX(-50%) translateY(-2px);
}

.message-list__new-tip-arrow {
  font-size: 12px;
}
</style>
