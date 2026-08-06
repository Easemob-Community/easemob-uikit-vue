<script setup lang="ts">
import { computed, ref } from 'vue'
import { useInfiniteScroll } from '@vueuse/core'
import { useConversation } from '../../composables/use-conversation'
import { useViewport } from '../../composables/use-viewport'
import { usePullRefresh } from '../../composables/use-pull-refresh'
import { useLocale } from '../../locale'
import { CONVERSATION_TYPE } from '../../constants'
import { useUIKit } from '../../composables/use-uikit'
import { usePresence } from '../../composables/use-presence'
import Modal from '../../components/modal/modal.vue'
import Input from '../../components/input/input.vue'
import Icon from '../../components/icon/icon.vue'
import Popup from '../../components/popup/popup.vue'
import ActionSheet from '../../components/action-sheet/action-sheet.vue'
import ScrollToTop from '../../components/scroll-to-top/scroll-to-top.vue'
import Empty from '../../components/empty/empty.vue'
import StatusBanner from '../../components/status-banner/status-banner.vue'
import type { UiConversation as Conversation } from '../../sdk/types'
import { DEFAULT_CONVERSATION_TABS } from './types'
import type { ConversationAction, ConversationTabKey } from './types'
import ConversationItem from './conversation-item.vue'
import ConversationTabs from './conversation-tabs.vue'
import NewChatModal from './new-chat-modal.vue'
import AddContactModal from './add-contact-modal.vue'
import CreateGroupModal from './create-group-modal.vue'

interface ConversationListProps {
  showSearch?: boolean
  customActions?: ConversationAction[]
  showScrollToTop?: boolean
  timeFormatter?: (timestamp: number) => string
  messageFormatter?: (msg: string, type?: string) => string
  showSenderName?: boolean
  emptyText?: string
  unreadMode?: 'count' | 'dot'
  /** 是否展示头部区域，默认 true */
  showHeader?: boolean
  /** Header 标题文本，不传则使用 i18n 默认值 */
  title?: string
  /** Header 内容对齐方式：left | center | right，默认 left */
  headerAlign?: 'left' | 'center' | 'right'
  /** 自定义搜索过滤函数 */
  filterFn?: (keyword: string, item: Conversation) => boolean
  /** #body slot 是否固定不随列表滚动，默认 false */
  bodySticky?: boolean
  /** #footer slot 是否固定不随列表滚动，默认 false */
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
}

const props = withDefaults(defineProps<ConversationListProps>(), {
  showSearch: true,
  customActions: () => [],
  showScrollToTop: true,
  showSenderName: true,
  unreadMode: 'count',
  showHeader: true,
  headerAlign: 'left',
  bodySticky: false,
  footerSticky: false,
  pullRefresh: false,
  tabs: () => [...DEFAULT_CONVERSATION_TABS],
  activeTab: 'all',
  showStatusBanner: true,
})

const emit = defineEmits<{
  (e: 'select', id: string, conversation: Conversation): void
  (e: 'at-me-click', id: string, conversation: Conversation): void
  (e: 'custom-action', key: string, conversation: Conversation): void
  (e: 'update:active-tab', tab: ConversationTabKey): void
  /** 断网/连接失败横幅被点击时触发，由业务方决定重连策略 */
  (e: 'reconnect'): void
}>()

const { conversationList, currentConversation, hasMore, loadingMore, selectConversation, pinConversation, muteConversation, sendChannelAck, deleteConversation, loadMoreConversations, refreshConversations, loadDraft, clearDraft } = useConversation()
const { stores, h5, features } = useUIKit()
const { t } = useLocale()
const { isMobile } = useViewport()
const presence = usePresence()

/** 会话列表是否正在从服务端同步（WebSocket 同步阶段） */
const isSyncing = computed(() => stores.conversation.isSyncingConversations)

/** 消息是否正在同步（离线消息同步阶段） */
const isSyncingMessages = computed(() => stores.message.isSyncingMessages)

/** 连接/同步状态横幅当前应展示的内容；按优先级：断网 > 连接中 > 会话同步 > 消息同步 */
const bannerState = computed(() => {
  const connected = stores.client.connected
  const connecting = stores.client.connecting
  if (!connected && !connecting) {
    return {
      visible: true,
      type: 'error' as const,
      loading: false,
      title: t('status.networkError'),
      description: '',
      clickable: true,
    }
  }
  if (connecting) {
    return {
      visible: true,
      type: 'warning' as const,
      loading: true,
      title: t('status.connecting'),
      description: '',
      clickable: false,
    }
  }
  if (isSyncing.value) {
    return {
      visible: true,
      type: 'info' as const,
      loading: true,
      title: t('status.syncingConversations'),
      description: '',
      clickable: false,
    }
  }
  if (isSyncingMessages.value) {
    return {
      visible: true,
      type: 'info' as const,
      loading: true,
      title: t('status.syncingMessages'),
      description: '',
      clickable: false,
    }
  }
  return {
    visible: false,
    type: 'info' as const,
    loading: false,
    title: '',
    description: '',
    clickable: false,
  }
})

function handleReconnect() {
  if (bannerState.value.clickable)
    emit('reconnect')
}

/** 实际是否启用下拉刷新：prop 优先，未显式开启时走 Provider H5 配置 */
const effectivePullRefresh = computed(() => props.pullRefresh || h5.enablePullRefresh.value)

/** 实际是否启用 Presence：组件 prop 优先，未传时走 Provider 全局配置 */
const effectiveEnablePresence = computed(() => props.enablePresence ?? features.enablePresence)

const itemsRef = ref<HTMLElement>()
const searchKeyword = ref('')
/** 规范化后的搜索关键字（去空格），用于过滤和空状态判断 */
const normalizedSearchKeyword = computed(() => searchKeyword.value.trim())
const showHeaderMenu = ref(false)
const headerMenuTriggerRef = ref<HTMLElement>()
const showHeaderActionSheet = ref(false)

const showNewChatModal = ref(false)
const showAddContactModal = ref(false)
const showCreateGroupModal = ref(false)

/** 下拉刷新 */
const { isRefreshing: isPullRefreshing } = usePullRefresh(
  itemsRef,
  {
    enabled: effectivePullRefresh,
    onRefresh: async () => {
      // 下拉刷新需要明确拿最新数据，走强制刷新接口以跳过本地已加载短路
      await refreshConversations()
    },
  },
)

function onHeaderMenuClose() {
  showHeaderMenu.value = false
}

/** Header 菜单项定义 */
const headerMenuItems = computed(() => [
  { key: 'newChat', label: t('conversation.newChat'), icon: 'chat/bubble_fill' },
  { key: 'addContact', label: t('conversation.addContact'), icon: 'people/person_add' },
  { key: 'createGroup', label: t('conversation.createGroup'), icon: 'people/person_double_fill' },
])

const headerActionSheetActions = computed(() =>
  headerMenuItems.value.map(item => ({ name: item.label, icon: item.icon })),
)

function onHeaderMenuClick() {
  if (isMobile.value) {
    showHeaderActionSheet.value = true
  }
  else {
    showHeaderMenu.value = true
  }
}

function onHeaderActionSheetSelect(item: { name: string, icon?: string }, index: number) {
  const key = headerMenuItems.value[index]?.key
  if (key)
    handleHeaderAction(key)
}

function onHeaderMenuItemClick(key: string) {
  showHeaderMenu.value = false
  handleHeaderAction(key)
}

function handleHeaderAction(key: string) {
  if (key === 'newChat')
    showNewChatModal.value = true
  else if (key === 'addContact')
    showAddContactModal.value = true
  else if (key === 'createGroup')
    showCreateGroupModal.value = true
}

/** 获取会话可用于搜索的文本字段（ID、会话名、备注、昵称、群名、最后消息等） */
function getConversationSearchFields(item: Conversation): string[] {
  const fields: (string | undefined)[] = [item.id, item.name, item.lastMessageText]
  if (item.type === CONVERSATION_TYPE.SINGLECHAT) {
    const contact = stores.contact.getContact(item.id)
    const userInfo = stores.userInfo.getUserInfo(item.id)
    fields.push(contact?.remark, contact?.name, userInfo?.nickname)
  }
  else if (item.type === CONVERSATION_TYPE.GROUPCHAT) {
    const group = stores.group.getGroupById(item.id)
    fields.push(group?.groupName)
  }
  return fields.filter((text): text is string => !!text)
}

/** 各 tab 空状态文案 */
const tabEmptyTexts: Record<ConversationTabKey, string> = {
  all: t('conversation.empty'),
  unread: t('conversation.emptyUnread'),
  atMe: t('conversation.emptyAtMe'),
  single: t('conversation.emptySingle'),
  group: t('conversation.emptyGroup'),
}

/** 切换分栏 tab */
function selectTab(tab: ConversationTabKey) {
  if (tab === props.activeTab)
    return
  emit('update:active-tab', tab)
}

/**
 * 按分栏 tab 过滤（在搜索过滤之前执行）：
 * - all：不过滤
 * - unread：unreadCount > 0
 * - atMe：本地 atMeMap 命中（@我 消息进入会话后清除）
 * - single / group：按会话类型过滤
 */
const tabFilteredList = computed(() => {
  const tab = props.activeTab
  if (tab === 'all' || !tab)
    return conversationList.value
  if (tab === 'unread')
    return conversationList.value.filter(item => (item.unreadCount ?? 0) > 0)
  if (tab === 'atMe')
    return conversationList.value.filter(item => !!stores.conversation.atMeMap[item.id])
  if (tab === 'single')
    return conversationList.value.filter(item => item.type === CONVERSATION_TYPE.SINGLECHAT)
  if (tab === 'group')
    return conversationList.value.filter(item => item.type === CONVERSATION_TYPE.GROUPCHAT)
  return conversationList.value
})

const filteredConversationList = computed(() => {
  if (!normalizedSearchKeyword.value)
    return tabFilteredList.value
  const kw = normalizedSearchKeyword.value.toLowerCase()
  if (props.filterFn) {
    return tabFilteredList.value.filter(item => props.filterFn!(kw, item))
  }
  return tabFilteredList.value.filter((item) => {
    return getConversationSearchFields(item).some(text => text.toLowerCase().includes(kw))
  })
})

/** 空状态描述：搜索中优先显示无搜索结果，其次按当前 tab 区分文案 */
const emptyDescription = computed(() => {
  if (normalizedSearchKeyword.value)
    return t('conversation.noSearchResult')
  return props.emptyText || tabEmptyTexts[props.activeTab] || t('conversation.empty')
})

/** 当前会话列表中可见的单聊对方用户 ID，用于 Presence 兜底拉取 */
const visibleUserIds = computed(() =>
  effectiveEnablePresence.value
    ? filteredConversationList.value
      .filter(item => item.type === CONVERSATION_TYPE.SINGLECHAT)
      .map(item => item.id)
    : [],
)

/** 启用 Presence 时，按可见联系人自动订阅/取消订阅在线状态 */
if (effectiveEnablePresence.value) {
  presence.watch(visibleUserIds)
}

useInfiniteScroll(
  itemsRef,
  () => {
    if (hasMore.value && !loadingMore.value) {
      loadMoreConversations()
    }
  },
  { distance: 50 },
)

function handleSelect(id: string) {
  const cvs = conversationList.value.find((c: Conversation) => c.id === id)
  const hadAtMe = !!stores.conversation.atMeMap[id]

  // 切换会话前，为当前会话保存草稿（如果有输入内容，由 chat-container 侧触发）
  selectConversation(id)
  // 进入会话后发送已读回执
  sendChannelAck(id)
  // 加载目标会话的草稿
  loadDraft(id)

  // 清除该会话的@我高亮状态（UI 层面）
  // 注意：atMeMessageMap 保留用于 chat.vue 定位，定位完成后由 chat.vue 自行清除
  if (hadAtMe) {
    stores.conversation.setAtMe(id, false)
  }

  // 通知上层
  if (cvs) {
    emit('select', id, cvs)
    if (hadAtMe) {
      emit('at-me-click', id, cvs)
    }
  }
}

/** 删除确认 */
const showDeleteModal = ref(false)
const pendingDeleteId = ref('')
/** 是否同时删除漫游历史消息，默认不勾选（删除会话≠删历史） */
const deleteWithHistory = ref(false)

function handleDelete(id: string) {
  pendingDeleteId.value = id
  deleteWithHistory.value = false
  showDeleteModal.value = true
}

function confirmDelete() {
  if (pendingDeleteId.value) {
    clearDraft(pendingDeleteId.value)
    deleteConversation(pendingDeleteId.value, deleteWithHistory.value)
    pendingDeleteId.value = ''
  }
}

/** 自定义操作项未传 handler 时，向上 re-emit 给外层处理 */
function handleCustomAction(key: string, conversation: Conversation) {
  emit('custom-action', key, conversation)
}
</script>

<template>
  <div class="conversation-list">
    <div v-if="props.showHeader" class="conversation-list__header" :class="`conversation-list__header--${props.headerAlign}`">
      <slot name="header">
        <span class="conversation-list__title">{{ props.title || t('conversation.title') }}</span>
      </slot>
      <div class="conversation-list__menu-wrapper">
        <div ref="headerMenuTriggerRef" class="conversation-list__menu-trigger" @click="onHeaderMenuClick">
          <Icon name="actions/plus_in_circle" :size="22" />
        </div>
        <Popup
          :show="showHeaderMenu && !isMobile"
          :anchor="headerMenuTriggerRef ?? undefined"
          placement="bottom"
          :overlay="false"
          :close-on-click-overlay="true"
          group="conversation-header-menu"
          @update:show="onHeaderMenuClose"
          @close="onHeaderMenuClose"
        >
          <div class="context-menu">
            <div
              v-for="item in headerMenuItems"
              :key="item.key"
              class="context-menu__item"
              @click.stop="onHeaderMenuItemClick(item.key)"
            >
              <Icon :name="item.icon" :size="18" />
              <span>{{ item.label }}</span>
            </div>
          </div>
        </Popup>
      </div>
    </div>
    <!-- 分栏 tab：header 之下、搜索框之上；tabs 为空数组时隐藏；
         提供 #tabs 插槽（作用域 tabs/activeTab/selectTab）时完全接管渲染 -->
    <ConversationTabs
      :tabs="props.tabs"
      :active-tab="props.activeTab"
      @update:active-tab="selectTab"
    >
      <template v-if="$slots.tabs" #default="slotScope">
        <slot name="tabs" v-bind="slotScope" />
      </template>
    </ConversationTabs>
    <div v-if="props.showSearch" class="conversation-list__search">
      <Input
        v-model="searchKeyword"
        variant="search"
        :placeholder="t('conversation.searchPlaceholder')"
        prefix-icon="misc/magnifier2"
      />
    </div>
    <!-- 连接/同步状态横幅：搜索栏下方、列表上方 -->
    <div v-if="props.showStatusBanner && bannerState.visible" class="conversation-list__status-banner">
      <slot
        name="status-banner"
        v-bind="bannerState"
      >
        <StatusBanner
          :type="bannerState.type"
          :loading="bannerState.loading"
          :title="bannerState.title"
          :clickable="bannerState.clickable"
          @click="handleReconnect"
        />
      </slot>
    </div>
    <!-- body slot - sticky 模式放在滚动容器外部 -->
    <div v-if="$slots.body && props.bodySticky" class="conversation-list__body conversation-list__body--sticky">
      <slot name="body" />
    </div>
    <div ref="itemsRef" class="conversation-list__items">
      <!-- 下拉刷新指示器（H5） -->
      <div v-if="effectivePullRefresh && isPullRefreshing" class="conversation-list__pull-refresh">
        {{ t('conversation.pullRefresh') }}
      </div>
      <!-- body slot - 非 sticky 模式放在滚动容器内部 -->
      <div v-if="$slots.body && !props.bodySticky" class="conversation-list__body">
        <slot name="body" />
      </div>
      <ConversationItem
        v-for="item in filteredConversationList"
        :key="item.id"
        :conversation="item"
        :class="{ 'is-active': currentConversation?.id === item.id }"
        :custom-actions="props.customActions"
        :time-formatter="props.timeFormatter"
        :message-formatter="props.messageFormatter"
        :show-sender-name="props.showSenderName"
        :unread-mode="props.unreadMode"
        :has-at-me="!!stores.conversation.atMeMap[item.id]"
        @select="handleSelect"
        @pin="pinConversation"
        @mute="muteConversation"
        @delete="handleDelete"
        @read="sendChannelAck"
        @custom-action="handleCustomAction"
      />
      <!-- 会话列表同步中（WebSocket 首次同步） -->
      <div v-if="isSyncing && !filteredConversationList.length" class="conversation-list__syncing">
        <Icon name="actions/loading_circle" :size="20" class="conversation-list__syncing-icon" />
        <span>{{ t('conversation.syncing') }}</span>
      </div>
      <div v-if="loadingMore" class="conversation-list__loading">
        {{ t('conversation.loadingMore') }}
      </div>
      <Empty
        v-if="!filteredConversationList.length && !loadingMore && !isSyncing"
        :icon="normalizedSearchKeyword ? 'empty/search' : 'empty/conversation'"
        :description="emptyDescription"
      >
        <template #description>
          <slot name="empty" :search-keyword="normalizedSearchKeyword" :active-tab="props.activeTab">
            {{ emptyDescription }}
          </slot>
        </template>
      </Empty>
      <!-- footer slot - 非 sticky 模式放在滚动容器内部 -->
      <div v-if="$slots.footer && !props.footerSticky" class="conversation-list__footer">
        <slot name="footer" />
      </div>
    </div>

    <!-- footer slot - sticky 模式放在滚动容器外部 -->
    <div v-if="$slots.footer && props.footerSticky" class="conversation-list__footer conversation-list__footer--sticky">
      <slot name="footer" />
    </div>

    <!-- 滚动置顶按钮：放在滚动容器外部，由 conversation-list 定位 -->
    <ScrollToTop
      v-if="props.showScrollToTop"
      :target="itemsRef ?? undefined"
      :visibility-height="200"
      :bottom="12"
      :right="12"
    />

    <!-- 删除会话二次确认 -->
    <Modal
      v-model:show="showDeleteModal"
      :title="t('conversation.delete')"
      :confirm-text="t('button.confirm')"
      :cancel-text="t('button.cancel')"
      @confirm="confirmDelete"
    >
      <div class="conversation-list__delete-body">
        <div>{{ t('conversation.deleteConfirm') }}</div>
        <label class="conversation-list__delete-option">
          <input v-model="deleteWithHistory" type="checkbox">
          <span>{{ t('conversation.deleteWithHistory') || '同时删除聊天记录' }}</span>
        </label>
      </div>
    </Modal>

    <!-- H5 Header 菜单 ActionSheet -->
    <ActionSheet
      v-model:show="showHeaderActionSheet"
      :actions="headerActionSheetActions"
      @select="onHeaderActionSheetSelect"
    />

    <!-- 新会话 -->
    <NewChatModal v-model:show="showNewChatModal" />

    <!-- 添加联系人 -->
    <AddContactModal v-model:show="showAddContactModal" />

    <!-- 创建群组 -->
    <CreateGroupModal v-model:show="showCreateGroupModal" />
  </div>
</template>

<style scoped>
.conversation-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  /* 防止宿主 flex 布局（row 方向无 min-width: 0）时被内部内容撑宽，保证 tab 栏内部横向滚动成立 */
  min-width: 0;
}

.conversation-list__header {
  padding: calc(12px + var(--uikit-safe-top, 0px)) 16px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
}

.conversation-list__header--center {
  justify-content: center;
  position: relative;
}

.conversation-list__header--center .conversation-list__menu-wrapper {
  position: absolute;
  right: 16px;
}

.conversation-list__header--right {
  flex-direction: row-reverse;
}

.conversation-list__header--right .conversation-list__menu {
  left: 0;
  right: auto;
}

.conversation-list__menu-wrapper {
  position: relative;
}

.conversation-list__menu-trigger {
  cursor: pointer;
  color: var(--uikit-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border-radius: var(--uikit-components-radius, 8px);
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.conversation-list__menu-trigger:hover {
  background-color: var(--uikit-bg-secondary);
}

/* PC Header 菜单 —— 与 conversation-item 右键菜单风格统一。
   外层外壳由 Popup 统一提供，此处只负责内容布局。 */
.context-menu {
  display: flex;
  flex-direction: column;
  min-width: 160px;
  padding: 6px;
}

.context-menu__item {
  padding: 10px 12px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-primary);
  cursor: pointer;
  white-space: nowrap;
  border-radius: var(--uikit-components-radius, 8px);
  transition: background-color var(--uikit-anim-duration, 0.15s) var(--uikit-anim-easing, ease);
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-menu__item:hover {
  background-color: var(--uikit-bg-hover, #f3f4f6);
}

.conversation-list__search {
  padding: 2px 16px 8px;
}

.conversation-list__status-banner {
  padding: 0 16px 8px;
  flex-shrink: 0;
}

.conversation-list__title {
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.conversation-list__items {
  flex: 1;
  overflow-y: auto;
  /* 滚动到边界时不把滚动链穿透给外层页面（H5 下拉刷新场景） */
  overscroll-behavior-y: contain;
}

.conversation-list__loading {
  padding: 12px 16px;
  text-align: center;
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
}

.conversation-list__syncing {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  text-align: center;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
}

.conversation-list__syncing-icon {
  animation: conversation-list-spin 1s linear infinite;
}

@keyframes conversation-list-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.conversation-list__body {
  padding: 0 16px;
}

.conversation-list__body--sticky {
  flex-shrink: 0;
}

.conversation-list__footer {
  padding: 8px 16px calc(8px + var(--uikit-safe-bottom, 0px));
}

.conversation-list__footer--sticky {
  flex-shrink: 0;
}

.conversation-list__pull-refresh {
  padding: 12px 16px;
  text-align: center;
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
}

.conversation-list__delete-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.conversation-list__delete-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
  cursor: pointer;
}

.conversation-list__delete-option input {
  width: 16px;
  height: 16px;
  accent-color: var(--uikit-primary-color);
  cursor: pointer;
  flex-shrink: 0;
}
</style>
