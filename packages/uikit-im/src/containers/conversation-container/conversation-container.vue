<script setup lang="ts">
import { computed, onMounted } from 'vue'
import ConversationList from '../../modules/conversation/conversation-list.vue'
import { initDraftStorage, useConversation } from '../../composables/use-conversation'
import { useUIKit } from '../../composables/use-uikit'
import { createConversationTimeFormatter, createMessageFormatter } from '../../utils'
import { useLocale } from '@easemob/uikit-core'
import type { ConversationAction, ConversationHeaderMenuItem, ConversationTabKey } from '../../modules/conversation/types'
import { DEFAULT_CONVERSATION_TABS } from '../../modules/conversation/types'
import type { UiConversation as Conversation } from '@easemob/uikit-core'

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
  /** 未读 Badge 位置（仅 unreadPlacement=avatar 头像角标时生效）：top-right（默认）/ bottom-right */
  badgePlacement?: 'top-right' | 'bottom-right'
  /**
   * 列表风格变体：card（默认；圆角白卡、无分割线、项间距 4px）/
   * compact（无圆角、无分割线、零间距的平铺列表）
   */
  variant?: 'card' | 'compact'
  /** 会话项是否展示头像（false = 仅会话信息模式），默认 true */
  showAvatar?: boolean
  /** 未读徽标归位：inline 信息区行尾（默认）/ avatar 头像右上角角标 */
  unreadPlacement?: 'inline' | 'avatar'
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
  /** 是否启用下拉刷新（H5）。显式 true/false 优先；未配置（undefined）时回落 Provider
   * h5.pullRefresh（默认 'auto'：触屏设备自动开启，见 core useH5Adaptation） */
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
   * Header `+` 菜单自定义项；不传时使用内置三项（新建会话/添加联系人/创建群组）；
   * 传空数组可隐藏菜单入口。
   */
  menuItems?: ConversationHeaderMenuItem[]
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
  variant: 'card',
  showAvatar: true,
  unreadPlacement: 'inline',
  showHeader: true,
  headerAlign: 'left',
  bodySticky: false,
  footerSticky: false,
  pullRefresh: undefined,
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
  /** 自定义 Header 菜单项未提供 handler 且非内置 key 时触发，负载为菜单 key */
  (e: 'header-menu-action', key: string): void
  /** 搜索关键字变化时触发（去空格后的值，清空时为 ''），可用于埋点或远程搜索 */
  (e: 'search', keyword: string): void
}>()

const { refreshConversations } = useConversation()
const { t, locale } = useLocale()
const { h5 } = useUIKit()

/** 下拉刷新生效值：prop 显式配置优先，未配置时回落 Provider h5.pullRefresh（auto 按触屏判定） */
const effectivePullRefresh = computed(() => props.pullRefresh ?? h5.enablePullRefresh.value)

/** 默认时间格式化函数：包一层 computed，locale 切换时函数引用变化，prop 透传链能感知更新 */
const defaultTimeFormatter = computed<(timestamp: number) => string>(() => createConversationTimeFormatter(t))
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
      :badge-placement="props.badgePlacement"
      :variant="props.variant"
      :show-avatar="props.showAvatar"
      :unread-placement="props.unreadPlacement"
      :show-header="props.showHeader"
      :title="props.title"
      :header-align="props.headerAlign"
      :filter-fn="props.filterFn"
      :body-sticky="props.bodySticky"
      :footer-sticky="props.footerSticky"
      :pull-refresh="effectivePullRefresh"
      :enable-presence="props.enablePresence"
      :tabs="props.tabs"
      :active-tab="props.activeTab"
      :show-status-banner="props.showStatusBanner"
      :menu-items="props.menuItems"
      @update:active-tab="handleActiveTabChange"
      @select="handleConversationSelect"
      @conversation-click="handleConversationClick"
      @reconnect="handleReconnect"
      @header-menu-action="(key: string) => emit('header-menu-action', key)"
      @search="(keyword: string) => emit('search', keyword)"
    >
      <template v-if="$slots['tabs']" #tabs="slotProps">
        <slot name="tabs" v-bind="slotProps" />
      </template>
      <template v-if="$slots['header']" #header>
        <slot name="header" />
      </template>
      <template v-if="$slots['empty']" #empty="slotProps">
        <slot name="empty" v-bind="slotProps" />
      </template>
      <template v-if="$slots['status-banner']" #status-banner="slotProps">
        <slot name="status-banner" v-bind="slotProps" />
      </template>
      <template v-if="$slots['body']" #body>
        <slot name="body" />
      </template>
      <template v-if="$slots['footer']" #footer>
        <slot name="footer" />
      </template>
      <template v-if="$slots['item']" #item="slotProps">
        <slot name="item" v-bind="slotProps" />
      </template>
      <template v-if="$slots['item-name-suffix']" #item-name-suffix="slotProps">
        <slot name="item-name-suffix" v-bind="slotProps" />
      </template>
      <template v-if="$slots['header-menu']" #header-menu="slotProps">
        <slot name="header-menu" v-bind="slotProps" />
      </template>
      <template v-if="$slots['new-chat']" #new-chat="slotProps">
        <slot name="new-chat" v-bind="slotProps" />
      </template>
      <template v-if="$slots['add-contact']" #add-contact="slotProps">
        <slot name="add-contact" v-bind="slotProps" />
      </template>
      <template v-if="$slots['create-group']" #create-group="slotProps">
        <slot name="create-group" v-bind="slotProps" />
      </template>
    </ConversationList>
  </div>
</template>

<style scoped>
.conversation-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  /* 独占宿主槽位时填满宿主分配的宽度；与兄弟组件并排时回落侧栏固定宽（见下方 :not(:only-child)） */
  width: 100%;
  max-width: 100%;
  /* 防止宿主 flex 布局（row 方向无 min-width: 0）时被内部内容撑宽 */
  min-width: 0;
  background-color: var(--uikit-bg-base);
}

/* 与兄弟组件并排（如 flex 行内的「会话列表 + 聊天区」布局）时保持侧栏默认宽；
   注意 EmResizable 等包裹组件的拖拽手柄也算兄弟节点，槽位场景仍建议显式覆写 token */
.conversation-container:not(:only-child) {
  width: var(--uikit-sidebar-width, 360px);
}
</style>
