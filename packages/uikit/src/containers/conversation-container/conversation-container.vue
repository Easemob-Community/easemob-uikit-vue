<script setup lang="ts">
import { onMounted } from 'vue'
import ConversationList from '../../modules/conversation/conversation-list.vue'
import { useConversation, initDraftStorage } from '../../composables/use-conversation'
import { createConversationTimeFormatter, createMessageFormatter } from '../../utils'
import { useLocale } from '../../locale'
import type { ConversationAction } from '../../modules/conversation/types'
import type { Conversation } from '../../store/conversation'

export interface ConversationContainerProps {
  /** 默认从服务端获取的会话数量，max 50，默认 20 */
  pageSize?: number
  /** 是否拉取空会话（无消息记录的会话），默认 false */
  includeEmptyConversations?: boolean
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
  /**
   * 草稿存储模式：
   * - 'none' 仅内存缓存，页面关闭即丢失（默认）
   * - 'session' sessionStorage 持久化，浏览器标签关闭后丢失
   * - 'local' localStorage 持久化，关闭浏览器后仍保留
   */
  draftStorage?: 'none' | 'session' | 'local'
  /**
   * 是否在容器首次 mount 时自动拉取远端会话列表，默认 true。
   * 内部已依赖 store 的已加载标记进行幂等：
   * - 首屏 / 刷新页面会拉取一次
   * - tab 切换导致容器重新 mount 时不会重复拉取
   * 若业务侧期望完全接管拉取时机，可将该项设为 false，
   * 然后通过 useConversation().refreshConversations() 主动触发。
   */
  autoFetch?: boolean
}

const props = withDefaults(defineProps<ConversationContainerProps>(), {
  pageSize: 20,
  includeEmptyConversations: false,
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
  draftStorage: 'none',
  autoFetch: true,
})

const emit = defineEmits<{
  (e: 'conversation-select', conversation: Conversation): void
}>()

const { fetchServerConversations } = useConversation()
const { t } = useLocale()

const defaultTimeFormatter = createConversationTimeFormatter(t)
const defaultMessageFormatter = createMessageFormatter(t)

onMounted(() => {
  // 初始化草稿存储模式
  initDraftStorage(props.draftStorage ?? 'none')
  if (!props.autoFetch) return
  // 仅首次（未加载过）会发起远端请求，
  // tab 切换导致的重复 mount 会被内部短路跳过。
  fetchServerConversations({
    pageSize: props.pageSize,
    includeEmptyConversations: props.includeEmptyConversations,
  })
})

function handleConversationSelect(id: string, conversation: Conversation) {
  emit('conversation-select', conversation)
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
      @select="handleConversationSelect"
    >
      <template v-if="$slots.header" #header>
        <slot name="header" />
      </template>
      <template v-if="$slots.empty" #empty="slotProps">
        <slot name="empty" v-bind="slotProps" />
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
  background-color: var(--uikit-bg-base);
}
</style>
