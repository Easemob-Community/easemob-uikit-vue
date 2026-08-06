<script setup lang="ts">
import { onMounted } from 'vue'
import ConversationList from '../../modules/conversation/conversation-list.vue'
import { initDraftStorage, useConversation } from '../../composables/use-conversation'
import { createConversationTimeFormatter, createMessageFormatter } from '../../utils'
import { useLocale } from '../../locale'
import type { ConversationAction, ConversationTabKey } from '../../modules/conversation/types'
import { DEFAULT_CONVERSATION_TABS } from '../../modules/conversation/types'
import type { UiConversation as Conversation } from '../../sdk/types'

export interface ConversationContainerProps {
  /** 是否展示搜索框，默认 true */
  showSearch?: boolean
  /** 是否展示滚动置顶按钮，默认 true */
  showScrollToTop?: boolean
  /** 自定义 popup/action sheet 条目 */
  customActions?: ConversationAction[]
  /** 自定义时间格式化函数，覆盖内置智能格式 */
  timeFormatter?: (timestamp: number) => string
  /** 自定义消息摘要格式化函数，覆盖内置类型映射 */
  messageFormatter?: (msg: string, type?: string) => string
  /** 群聊是否显示发送者名称，默认 true */
  showSenderName?: boolean
  /** 空列表提示文字 */
  emptyText?: string
  /** 未读数显示模式：'count' 显示数字，'dot' 只显示红点，默认 'count' */
  unreadMode?: 'count' | 'dot'
  /** 是否展示头部区域，默认 true */
  showHeader?: boolean
  /** Header 标题文本 */
  title?: string
  /** Header 内容对齐方式：left | center | right，默认 left */
  headerAlign?: 'left' | 'center' | 'right'
  /** 自定义搜索过滤函数 */
  filterFn?: (keyword: string, item: Conversation) => boolean
  /** #body slot 是否固定不随列表滚动 */
  bodySticky?: boolean
  /** #footer slot 是否固定不随列表滚动 */
  footerSticky?: boolean
  /** 是否启用下拉刷新（H5），默认 false */
  pullRefresh?: boolean
  /** 是否展示单聊头像在线状态；不传则使用 Provider 全局 enablePresence 配置 */
  enablePresence?: boolean
  /**
   * 会话分栏 tab 集合，默认全量 ['all', 'unread', 'atMe', 'single', 'group']；
   * 顺序即渲染优先级；传空数组可隐藏 tab 栏。
   */
  tabs?: ConversationTabKey[]
  /** 当前激活的分栏 tab（v-model:active-tab），默认 'all' */
  activeTab?: ConversationTabKey
  /** 是否展示连接/同步状态横幅，默认 true */
  showStatusBanner?: boolean
  /**
   * 草稿存储模式：
   * - 'none' 仅内存缓存，页面关闭即丢失（默认）
   * - 'session' sessionStorage 持久化，浏览器标签关闭后丢失
   * - 'local' localStorage 持久化，关闭浏览器后仍保留
   */
  draftStorage?: 'none' | 'session' | 'local'
}

const props = withDefaults(defineProps<ConversationContainerProps>(), {
  showSearch: true,
  showScrollToTop: true,
  customActions: () => [],
  showSenderName: true,
  unreadMode: 'count',
  showHeader: true,
  headerAlign: 'left',
  bodySticky: false,
  footerSticky: false,
  pullRefresh: false,
  enablePresence: undefined,
  draftStorage: 'none',
  tabs: () => [...DEFAULT_CONVERSATION_TABS],
  activeTab: 'all',
  showStatusBanner: true,
})

const emit = defineEmits<{
  (e: 'conversation-select', conversation: Conversation): void
  (e: 'conversation-click', conversation: Conversation): void
  (e: 'update:active-tab', tab: ConversationTabKey): void
  /** 断网/连接失败横幅被点击时触发，由业务方决定重连策略 */
  (e: 'reconnect'): void
}>()

const { refreshConversations } = useConversation()
const { t } = useLocale()

const defaultTimeFormatter = createConversationTimeFormatter(t)
const defaultMessageFormatter = createMessageFormatter(t)

onMounted(() => {
  // 初始化草稿存储模式
  initDraftStorage(props.draftStorage ?? 'none')
  // SDK 5.x: 会话列表由 WebSocket 自动同步驱动。
  // onConversationListSyncDidFinish 事件会自动调用 getSessionList 填充 store。
  // 容器 mount 时尝试读取本地 SessionList（同步可能已完成或正在进行）。
  refreshConversations()
})

function handleConversationSelect(id: string, conversation: Conversation) {
  emit('conversation-select', conversation)
}

function handleConversationClick(id: string, conversation: Conversation) {
  emit('conversation-click', conversation)
}

function handleActiveTabChange(tab: ConversationTabKey) {
  emit('update:active-tab', tab)
}

function handleReconnect() {
  emit('reconnect')
}
</script>

<template>
  <div class="conversation-container">
    <ConversationList
      :show-search="props.showSearch"
      :show-scroll-to-top="props.showScrollToTop"
      :custom-actions="props.customActions"
      :time-formatter="props.timeFormatter ?? defaultTimeFormatter"
      :message-formatter="props.messageFormatter ?? defaultMessageFormatter"
      :show-sender-name="props.showSenderName"
      :empty-text="props.emptyText"
      :unread-mode="props.unreadMode"
      :show-header="props.showHeader"
      :title="props.title"
      :header-align="props.headerAlign"
      :filter-fn="props.filterFn"
      :body-sticky="props.bodySticky"
      :footer-sticky="props.footerSticky"
      :pull-refresh="props.pullRefresh"
      :enable-presence="props.enablePresence"
      :tabs="props.tabs"
      :active-tab="props.activeTab"
      :show-status-banner="props.showStatusBanner"
      @update:active-tab="handleActiveTabChange"
      @select="handleConversationSelect"
      @conversation-click="handleConversationClick"
      @reconnect="handleReconnect"
    >
      <template v-if="$slots.tabs" #tabs="slotProps">
        <slot name="tabs" v-bind="slotProps" />
      </template>
      <template v-if="$slots.header" #header>
        <slot name="header" />
      </template>
      <template v-if="$slots.empty" #empty="slotProps">
        <slot name="empty" v-bind="slotProps" />
      </template>
      <template v-if="$slots.statusBanner" #status-banner="slotProps">
        <slot name="status-banner" v-bind="slotProps" />
      </template>
      <template v-if="$slots.body" #body>
        <slot name="body" />
      </template>
      <template v-if="$slots.footer" #footer>
        <slot name="footer" />
      </template>
    </ConversationList>
  </div>
</template>

<style scoped>
.conversation-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  /* 防止宿主 flex 布局（row 方向无 min-width: 0）时被内部内容撑宽 */
  min-width: 0;
  background-color: var(--uikit-bg-base);
}
</style>
