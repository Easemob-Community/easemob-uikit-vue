<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useInfiniteScroll } from '@vueuse/core'
import { useConversation } from '../../composables/use-conversation'
import { useArrowNavigation, useEscToClose, useKeyBindings, usePresence, usePullRefresh, useViewport } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { CONVERSATION_TYPE } from '@easemob/uikit-core'
import { useUIKit } from '../../composables/use-uikit'
import { EmModal as Modal } from '@easemob/uikit-core'
import { EmInput as Input } from '@easemob/uikit-core'
import { EmCheckbox as Checkbox } from '@easemob/uikit-core'
import { EmIcon as Icon } from '@easemob/uikit-core'
import { EmPopup as Popup } from '@easemob/uikit-core'
import { EmActionSheet as ActionSheet } from '@easemob/uikit-core'
import { EmScrollToTop as ScrollToTop } from '@easemob/uikit-core'
import { EmEmpty as Empty } from '@easemob/uikit-core'
import { EmStatusBanner as StatusBanner } from '@easemob/uikit-core'
import { EmSkeleton as Skeleton } from '@easemob/uikit-core'
import type { UiConversation as Conversation } from '@easemob/uikit-core'
import { DEFAULT_CONVERSATION_TABS } from './types'
import type { ConversationAction, ConversationHeaderMenuItem, ConversationTabKey } from './types'
import ConversationItem from './conversation-item.vue'
import ConversationTabs from './conversation-tabs.vue'
import NewChatModal from './new-chat-modal.vue'
import AddContactModal from './add-contact-modal.vue'
import CreateGroupModal from './create-group-modal.vue'

interface ConversationListProps {
  /** 是否展示搜索框，默认 true */
  showSearch?: boolean
  /** 自定义操作项列表，追加到会话项右键菜单/H5 长按 ActionSheet；未提供 handler 的项点击后触发 custom-action 事件 */
  customActions?: ConversationAction[]
  /** 是否展示滚动置顶按钮，默认 true */
  showScrollToTop?: boolean
  /** 时间格式化函数，入参为毫秒时间戳（ms），返回展示文本；不传时按当前 locale 用 toLocaleTimeString 兜底 */
  timeFormatter?: (timestamp: number) => string
  /** 消息摘要格式化函数，入参为原始摘要文本与消息类型（当前实现固定传入 'text'），返回展示文本；不传时原样展示 */
  messageFormatter?: (msg: string, type?: string) => string
  /** 群聊会话摘要是否显示发送者名称前缀，默认 true */
  showSenderName?: boolean
  /** 空列表提示文案，优先于各分栏 tab 的默认空状态文案 */
  emptyText?: string
  /** 未读数量展示模式：count 显示数字，dot 仅显示红点，默认 'count' */
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
  /** 是否启用下拉刷新（H5）。true 强制开启；false 或未配置时回落 Provider h5.pullRefresh
   *（默认 'auto'：触屏设备自动开启，见 core useH5Adaptation） */
  pullRefresh?: boolean
  /** 是否展示单聊头像在线状态；不传则使用 Provider 全局 enablePresence 配置 */
  enablePresence?: boolean
  /**
   * 会话分栏 tab 集合，默认全量 ['all', 'unread', 'atMe', 'single', 'group']；
   * 顺序即渲染优先级；传空数组可隐藏 tab 栏。
   */
  tabs?: ConversationTabKey[]
  /** 当前激活的分栏 tab（v-model:active-tab）。可受控（绑定 v-model 由外部驱动）也可不受控（默认，组件内部自行维护，开箱即用） */
  activeTab?: ConversationTabKey
  /** 是否展示连接/同步状态横幅，默认 true */
  showStatusBanner?: boolean
  /**
   * Header `+` 菜单自定义项；不传时使用内置三项（新建会话/添加联系人/创建群组）；
   * 传空数组可隐藏菜单入口。
   */
  menuItems?: ConversationHeaderMenuItem[]
}

const props = withDefaults(defineProps<ConversationListProps>(), {
  showSearch: true,
  customActions: () => [],
  showScrollToTop: true,
  showSenderName: true,
  unreadMode: 'count',
  variant: 'card',
  showAvatar: true,
  unreadPlacement: 'inline',
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
  /** 会话选中完成（已切换会话、发送已读回执、加载草稿等内部逻辑之后）时触发，负载为会话 id 与会话对象 */
  (e: 'select', id: string, conversation: Conversation): void
  /** 点击会话项时立即触发（先于内部选中逻辑，供 H5 页面栈导航等使用），负载为会话 id 与会话对象 */
  (e: 'conversation-click', id: string, conversation: Conversation): void
  /** 点击带未清除 @我 状态的会话时触发（在 select 之后），负载为会话 id 与会话对象 */
  (e: 'at-me-click', id: string, conversation: Conversation): void
  /** 自定义操作项未提供 handler 时向上触发，负载为操作 key 与会话对象 */
  (e: 'custom-action', key: string, conversation: Conversation): void
  /** 切换分栏 tab 时触发（v-model:active-tab），负载为新的 tab key */
  (e: 'update:active-tab', tab: ConversationTabKey): void
  /** 断网/连接失败横幅被点击时触发，由业务方决定重连策略 */
  (e: 'reconnect'): void
  /** 自定义 Header 菜单项未提供 handler 且非内置 key 时触发，负载为菜单 key */
  (e: 'header-menu-action', key: string): void
  /** 搜索关键字变化时触发（去空格后的值，清空时为 ''），可用于埋点或远程搜索 */
  (e: 'search', keyword: string): void
}>()

const { conversationList, currentConversation, hasMore, loadingMore, selectConversation, pinConversation, muteConversation, sendChannelAck, deleteConversation, loadMoreConversations, refreshConversations, loadDraft, clearDraft } = useConversation()
const { stores, h5, features } = useUIKit()
const { t } = useLocale()
const { isMobile } = useViewport()
const presence = usePresence()

/**
 * 分栏 tab 支持「受控 / 不受控」两种用法：
 * - 受控：外部绑定 v-model:active-tab（显式传 activeTab），由外部驱动；prop 变化同步进内部态。
 * - 不受控（默认）：外部不绑定 v-model:active-tab，组件内部自行维护态，
 *   保证分栏 tab「开箱即用」——点击即可切换会话列表数据，无需消费者额外接线。
 * 实现：以 internalActiveTab 为唯一状态源；activeTab prop 变化时经 watch 覆写进来；
 * 点击 tab 时更新内部态并向上 emit update:active-tab（供受控场景/上层同步）。
 * 注意：外部传入默认值 'all' 且不再变化时（多数不受控场景），watch 不会触发，
 * 故内部态不被外部覆盖，点击切换得以生效。
 */
const internalActiveTab = ref<ConversationTabKey>(props.activeTab ?? 'all')
watch(() => props.activeTab, (value) => {
  if (value !== undefined && value !== null)
    internalActiveTab.value = value
})
/** 实际生效的分栏 tab：不受控场景下等于 internalActiveTab，受控场景下随 prop 同步 */
const effectiveActiveTab = computed<ConversationTabKey>(() => internalActiveTab.value)

/** 会话列表是否正在从服务端同步（WebSocket 同步阶段） */
const isSyncing = computed(() => stores.conversation.isSyncingConversations)

/** 消息是否正在同步（离线消息同步阶段） */
const isSyncingMessages = computed(() => stores.message.isSyncingMessages)

/** 被踢文案按错误码差异化（sdk-contract KICK_ERROR_CODE） */
const kickedTitle = computed(() => {
  switch (stores.client.kickCode) {
    case 206:
      return t('status.kickedAnotherDevice')
    case 216:
      return t('status.kickedPasswordChanged')
    case 214:
      return t('status.kickedDeviceLimit')
    default:
      return t('status.kickedOffline')
  }
})

/** 连接/同步状态横幅当前应展示的内容；按优先级：被踢 > 断网 > 连接中 > 会话同步 > 消息同步 */
const bannerState = computed(() => {
  const connected = stores.client.connected
  const connecting = stores.client.connecting
  // 被踢/账号失效：账号态终态，SDK 不再自动重连，展示被踢文案且不可点击重连
  if (stores.client.kicked) {
    return {
      visible: true,
      type: 'error' as const,
      loading: false,
      title: kickedTitle.value,
      description: '',
      clickable: false,
    }
  }
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
      // 首次连接与自动重连差异化文案：曾成功连接过即为重连中
      title: stores.client.hasConnectedOnce ? t('status.reconnecting') : t('status.connecting'),
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

/** 关键字变化对外抛出（埋点 / 远程搜索用） */
watch(normalizedSearchKeyword, keyword => emit('search', keyword))
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

/** Header 菜单项定义：props.menuItems 提供时使用自定义项；未提供时使用内置三项 */
const headerMenuItems = computed<ConversationHeaderMenuItem[]>(() => {
  if (props.menuItems)
    return props.menuItems
  return [
    { key: 'newChat', label: t('conversation.newChat'), icon: 'bubble/rect/empty' },
    { key: 'addContact', label: t('conversation.addContact'), icon: 'person/plus' },
    { key: 'createGroup', label: t('conversation.createGroup'), icon: 'person/double' },
  ]
})

/** 是否展示 Header 菜单入口：菜单项非空才展示（传空数组可隐藏） */
const showHeaderMenuEntry = computed(() => headerMenuItems.value.length > 0)

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

function onHeaderActionSheetSelect(_item: { name: string, icon?: string }, index: number) {
  const menuItem = headerMenuItems.value[index]
  if (menuItem)
    onHeaderMenuItemClick(menuItem)
}

function onHeaderMenuItemClick(item: ConversationHeaderMenuItem) {
  showHeaderMenu.value = false
  handleHeaderAction(item)
}

/**
 * 处理 Header 菜单项点击：自定义 handler 优先；未提供 handler 时内置 key 走内置弹窗，
 * 其余 key 上抛 header-menu-action 事件由业务处理。
 */
function handleHeaderAction(item: ConversationHeaderMenuItem) {
  if (item.handler) {
    item.handler(item.key)
    return
  }
  if (item.key === 'newChat')
    openNewChatModal()
  else if (item.key === 'addContact')
    openAddContactModal()
  else if (item.key === 'createGroup')
    openCreateGroupModal()
  else
    emit('header-menu-action', item.key)
}

/** 新会话弹窗开关句柄（#new-chat 插槽 scope） */
function openNewChatModal() {
  showNewChatModal.value = true
}
function closeNewChatModal() {
  showNewChatModal.value = false
}
/** 添加联系人弹窗开关句柄（#add-contact 插槽 scope） */
function openAddContactModal() {
  showAddContactModal.value = true
}
function closeAddContactModal() {
  showAddContactModal.value = false
}
/** 创建群组弹窗开关句柄（#create-group 插槽 scope） */
function openCreateGroupModal() {
  showCreateGroupModal.value = true
}
function closeCreateGroupModal() {
  showCreateGroupModal.value = false
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
  if (tab === effectiveActiveTab.value)
    return
  internalActiveTab.value = tab
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
  const tab = effectiveActiveTab.value
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
  return props.emptyText || tabEmptyTexts[effectiveActiveTab.value] || t('conversation.empty')
})

/** 当前会话列表中可见的单聊对方用户 ID，用于 Presence 兜底拉取 */
const visibleUserIds = computed(() =>
  effectiveEnablePresence.value
    ? filteredConversationList.value
      .filter(item => item.type === CONVERSATION_TYPE.SINGLECHAT)
      .map(item => item.id)
    : [],
)

/**
 * 按可见联系人自动订阅/取消订阅在线状态。
 * 不做 setup 期静态开关判断：visibleUserIds 已按 enablePresence 返回空数组，
 * watch 的增量订阅/退订逻辑天然支持运行时切换（关闭时空数组 = 全量退订）。
 */
presence.watch(visibleUserIds)

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

  // 先向外抛点击事件，供 H5 等业务做页面栈导航（在 selection 逻辑之前）
  if (cvs) {
    emit('conversation-click', id, cvs)
  }

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

/* ===== 键盘导航：鼠标进入列表区域后 ↑/↓ 移动高亮，Enter 确认切换会话 ===== */

/** 键盘导航是否激活：鼠标进入列表区域或点击列表时启用，Esc / 鼠标离开时停用 */
const keyboardNavActive = ref(false)
/** 键盘高亮是否可见：仅在方向键真正移动后才显示，避免鼠标进入列表时当前选中项误出现灰色 hover */
const keyboardFocusVisible = ref(false)
function enableKeyboardNav() {
  keyboardNavActive.value = true
}
function disableKeyboardNav() {
  keyboardNavActive.value = false
  keyboardFocusVisible.value = false
}
/** Esc 退出键盘导航 */
useEscToClose(keyboardNavActive, disableKeyboardNav)

const { activeIndex } = useArrowNavigation({
  count: computed(() => filteredConversationList.value.length),
  wrap: true,
  active: keyboardNavActive,
  // 搜索框聚焦时方向键让位给输入光标
  ignoreWhenTyping: true,
  onActiveChange: (index) => {
    // 方向键真正移动后，键盘高亮才可见
    keyboardFocusVisible.value = true
    // 方向键只移动高亮，不切换会话；Enter 才确认
    const item = filteredConversationList.value[index]
    if (item) {
      scrollConversationIntoView(item.id)
      // 移动后把焦点保留在列表容器，避免后续方向键被输入态豁免拦截
      nextTick(() => itemsRef.value?.focus())
    }
  },
})

/** Enter 选中当前键盘高亮的会话 */
useKeyBindings({
  Enter: () => {
    const item = filteredConversationList.value[activeIndex.value]
    if (item)
      handleSelect(item.id)
  },
}, {
  active: keyboardNavActive,
  ignoreWhenTyping: true,
})

/** 当前会话变化时同步键盘导航位置：首次按键从当前会话继续移动 */
watch(currentConversation, (cvs) => {
  if (!cvs)
    return
  const idx = filteredConversationList.value.findIndex(c => c.id === cvs.id)
  if (idx >= 0)
    activeIndex.value = idx
}, { immediate: true })

/** 将目标会话项滚动进可视区（键盘切换超出可视范围时跟随） */
function scrollConversationIntoView(id: string) {
  nextTick(() => {
    const el = itemsRef.value?.querySelector<HTMLElement>(`[data-conv-id="${id}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  })
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
  <div class="conversation-list" :class="`conversation-list--${props.variant}`">
    <div v-if="props.showHeader" class="conversation-list__header" :class="`conversation-list__header--${props.headerAlign}`">
      <slot name="header">
        <span class="conversation-list__title">{{ props.title || t('conversation.title') }}</span>
      </slot>
      <div class="conversation-list__menu-wrapper">
        <!-- #header-menu：完全接管 Header 菜单区域（触发按钮 + 弹出层），scope 提供菜单项与开关句柄 -->
        <slot
          name="header-menu"
          :menu-items="headerMenuItems"
          :open="onHeaderMenuClick"
          :close="onHeaderMenuClose"
        >
          <template v-if="showHeaderMenuEntry">
            <div ref="headerMenuTriggerRef" class="conversation-list__menu-trigger" @click="onHeaderMenuClick">
              <Icon name="circle/plus" :size="22" />
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
                  @click.stop="onHeaderMenuItemClick(item)"
                >
                  <Icon v-if="item.icon" :name="item.icon" :size="18" />
                  <span>{{ item.label }}</span>
                </div>
              </div>
            </Popup>
          </template>
        </slot>
      </div>
    </div>
    <!-- 分栏 tab：header 之下、搜索框之上；tabs 为空数组时隐藏；
         提供 #tabs 插槽（作用域 tabs/activeTab/selectTab）时完全接管渲染 -->
    <ConversationTabs
      :tabs="props.tabs"
      :active-tab="effectiveActiveTab"
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
        pill
        clearable
        clear-icon="search/xmark"
        :placeholder="t('conversation.searchPlaceholder')"
        prefix-icon="search"
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
    <div
      ref="itemsRef"
      tabindex="0"
      class="conversation-list__items"
      @mouseenter="enableKeyboardNav"
      @mouseleave="disableKeyboardNav"
      @click="enableKeyboardNav"
    >
      <!-- 下拉刷新指示器（H5） -->
      <div v-if="effectivePullRefresh && isPullRefreshing" class="conversation-list__pull-refresh">
        {{ t('conversation.pullRefresh') }}
      </div>
      <!-- body slot - 非 sticky 模式放在滚动容器内部 -->
      <div v-if="$slots.body && !props.bodySticky" class="conversation-list__body">
        <slot name="body" />
      </div>
      <!-- #item：完全接管会话项渲染（对齐 contact/group 列表的 #item 惯例），
           scope 提供会话数据、选中/高亮态与内置动作句柄；不传时默认渲染 ConversationItem -->
      <template v-for="(item, index) in filteredConversationList" :key="item.id">
        <slot
          name="item"
          :conversation="item"
          :active="currentConversation?.id === item.id"
          :keyboard-focus="keyboardFocusVisible && keyboardNavActive && activeIndex === index"
          :select="() => handleSelect(item.id)"
          :pin="(pinned: boolean) => pinConversation(item.id, pinned)"
          :mute="(muted: boolean) => muteConversation(item.id, muted)"
          :delete="() => handleDelete(item.id)"
          :read="() => sendChannelAck(item.id)"
          :custom-action="(key: string) => handleCustomAction(key, item)"
        >
          <ConversationItem
            :data-conv-id="item.id"
            :conversation="item"
            :class="{
              'is-active': currentConversation?.id === item.id,
              'is-keyboard-focus': keyboardFocusVisible && keyboardNavActive && activeIndex === index,
            }"
            :custom-actions="props.customActions"
            :time-formatter="props.timeFormatter"
            :message-formatter="props.messageFormatter"
            :show-sender-name="props.showSenderName"
            :unread-mode="props.unreadMode"
            :badge-placement="props.badgePlacement"
            :show-avatar="props.showAvatar"
            :unread-placement="props.unreadPlacement"
            :has-at-me="!!stores.conversation.atMeMap[item.id]"
            :is-typing="item.type === CONVERSATION_TYPE.SINGLECHAT && !!stores.conversation.typingMap[item.id]"
            @select="handleSelect"
            @pin="pinConversation"
            @mute="muteConversation"
            @delete="handleDelete"
            @read="sendChannelAck"
            @custom-action="handleCustomAction"
          >
            <!-- 转发名字后扩展位（企业/官方 tag 等），无需整项接管 #item -->
            <template v-if="$slots['item-name-suffix']" #name-suffix="slotProps">
              <slot name="item-name-suffix" v-bind="slotProps" />
            </template>
          </ConversationItem>
        </slot>
      </template>
      <!-- 会话列表同步中（WebSocket 首次同步）：骨架屏替代转圈 -->
      <div v-if="isSyncing && !filteredConversationList.length" class="conversation-list__skeleton">
        <div v-for="i in 6" :key="i" class="conversation-list__skeleton-item">
          <Skeleton variant="avatar" shape="rounded" />
          <div class="conversation-list__skeleton-lines">
            <Skeleton variant="text" style="width: 40%;" />
            <Skeleton variant="text" style="width: 70%;" />
          </div>
        </div>
      </div>
      <div v-if="loadingMore" class="conversation-list__loading">
        {{ t('conversation.loadingMore') }}
      </div>
      <div
        v-if="!filteredConversationList.length && !loadingMore && !isSyncing"
        class="conversation-list__empty-wrap"
      >
        <Empty
          class="conversation-list__empty"
          :icon="normalizedSearchKeyword ? 'search' : 'list/bullet'"
          :description="emptyDescription"
        >
          <template #description>
            <slot name="empty" :search-keyword="normalizedSearchKeyword" :active-tab="effectiveActiveTab">
              {{ emptyDescription }}
            </slot>
          </template>
        </Empty>
      </div>
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
      :width="719"
      type="warning"
      :confirm-text="t('button.confirm')"
      :cancel-text="t('button.cancel')"
      @confirm="confirmDelete"
    >
      <div class="conversation-list__delete-body">
        <div>{{ t('conversation.deleteConfirm') }}</div>
        <div class="conversation-list__delete-option" @click="deleteWithHistory = !deleteWithHistory">
          <Checkbox :checked="deleteWithHistory" :size="16" />
          <span>{{ t('conversation.deleteWithHistory', '同时删除聊天记录') }}</span>
        </div>
      </div>
    </Modal>

    <!-- H5 Header 菜单 ActionSheet -->
    <ActionSheet
      v-model:show="showHeaderActionSheet"
      :actions="headerActionSheetActions"
      @select="onHeaderActionSheetSelect"
    />

    <!-- 新会话（#new-chat：接管弹窗渲染，scope 提供开关句柄） -->
    <slot
      name="new-chat"
      :show="showNewChatModal"
      :open="openNewChatModal"
      :close="closeNewChatModal"
    >
      <NewChatModal v-model:show="showNewChatModal" />
    </slot>

    <!-- 添加联系人（#add-contact：接管弹窗渲染，scope 提供开关句柄） -->
    <slot
      name="add-contact"
      :show="showAddContactModal"
      :open="openAddContactModal"
      :close="closeAddContactModal"
    >
      <AddContactModal v-model:show="showAddContactModal" />
    </slot>

    <!-- 创建群组（#create-group：接管弹窗渲染，scope 提供开关句柄） -->
    <slot
      name="create-group"
      :show="showCreateGroupModal"
      :open="openCreateGroupModal"
      :close="closeCreateGroupModal"
    >
      <CreateGroupModal v-model:show="showCreateGroupModal" />
    </slot>
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
  /* 列表自带底色（默认与聊天背景一致：亮色白/暗色页面底色）；接入方可覆盖 --uikit-conversation-list-bg 定制 */
  background: var(--uikit-conversation-list-bg, var(--uikit-bg-base));
}

/* ===== 风格变体（列表根作用域覆写 Cell 变量，不影响全局主题） ===== */

/* card（默认）：圆角白卡、无分割线、项间距 4px。
   hover/active 圆角不在此固定，交由全局 hoverStyle 主题开关（--uikit-item-hover-radius /
   --uikit-item-active-radius）驱动：默认档同为 8px，与 card 设计一致；方正档直角、圆角档保留左右缩进 */
.conversation-list--card {
  --uikit-cell-bg: var(--uikit-bg-elevated);
  --uikit-cell-gap: 4px;
  /* 设计稿：项内容水平内边距 12px（头像左缘 = 列表 4px + 12px = 16px） */
  --uikit-item-hover-padding-x: 12px;
  /* 设计稿会话项总高 64px：autoHeight 上下各 8px + 内容 48px（头像） */
  --uikit-cell-padding-y: 8px;
}

/* 卡片列表的可视区内边距 */
.conversation-list--card .conversation-list__items {
  padding: 4px;
}

/* 卡片模式下 hover/active 背景顶满整卡（默认 is-inset-hover 会水平内缩，与卡片圆角不匹配） */
.conversation-list--card :deep(.uikit-cell.is-inset-hover)::before {
  inset: 0;
}

/* compact：无圆角、无分割线、零间距的平铺列表 */
.conversation-list--compact {
  --uikit-cell-bg: transparent;
  --uikit-cell-gap: 0px;
  --uikit-item-hover-radius: 0px;
  --uikit-item-active-radius: 0px;
}

/* 设计稿 header：上下 12.5px、左右 12px；border-box 总高统一 56px；
   底部分隔线宽度随全局 headerBorder 开关（--uikit-header-border-width，默认 0 关闭） */
.conversation-list__header {
  box-sizing: border-box;
  padding: calc(12.5px + var(--uikit-safe-top, 0px)) 12px 12.5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  border-bottom: var(--uikit-header-border-width, 0px) solid var(--uikit-border-color);
}

.conversation-list__header--center {
  justify-content: center;
  position: relative;
}

.conversation-list__header--center .conversation-list__menu-wrapper {
  position: absolute;
  right: 12px;
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
  /* 设计稿：22px 图标 + 4px 内边距 = 30×30 触发盒 */
  padding: 4px;
  border-radius: var(--uikit-components-radius, 8px);
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .conversation-list__menu-trigger:hover {
    background-color: var(--uikit-bg-secondary);
  }
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
  border-radius: var(--uikit-item-hover-radius, 8px);
  transition: background-color var(--uikit-anim-duration, 0.15s) var(--uikit-anim-easing, ease);
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (hover: hover) {
  .context-menu__item:hover {
    background-color: var(--uikit-bg-hover, #F5F5F5);
  }
}

/* 设计稿搜索槽：上下 8px、左右 12px（与 header 标题、分栏 tab 左缘对齐） */
.conversation-list__search {
  padding: 8px 12px;
}

.conversation-list__status-banner {
  padding: 0 12px 8px;
  flex-shrink: 0;
}

/* 设计稿标题：18px Medium（500）/ 行高 22px */
.conversation-list__title {
  font-size: var(--uikit-font-size-18);
  font-weight: var(--uikit-font-weight-medium);
  line-height: 22px;
  color: var(--uikit-text-primary);
}

.conversation-list__items {
  flex: 1;
  overflow-y: auto;
  /* 滚动到边界时不把滚动链穿透给外层页面（H5 下拉刷新场景） */
  overscroll-behavior-y: contain;
  /* 键盘导航时容器可获得焦点，但不显示默认轮廓 */
  outline: none;
  /* flex 列布局：让空状态撑高层可以用 flex:1 占满剩余可视区（不依赖百分比高度，不产生溢出滚动条） */
  display: flex;
  flex-direction: column;
}

/* 键盘方向键高亮：与当前激活会话区分开，提供导航视觉反馈 */
.conversation-list__items :deep(.is-keyboard-focus) {
  background-color: var(--uikit-bg-hover, #F5F5F5);
}

.conversation-list__loading {
  padding: 12px 16px;
  text-align: center;
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
}

/* 空状态撑高层：flex:1 占满列表剩余可视区；自身无 padding，不会产生溢出滚动条 */
.conversation-list__empty-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 空状态占位规格：图标 100×100，文案 16px，间距 8px；颜色统一由 core Empty 消费
   --uikit-empty-icon-color / --uikit-empty-text-color，此处不再覆写 */
.conversation-list__empty {
  gap: 8px;
  flex: 1;
}

.conversation-list__empty :deep(.uikit-empty__icon svg) {
  width: 100px;
  height: 100px;
}

.conversation-list__empty :deep(.uikit-empty__description) {
  font-size: var(--uikit-font-size-16);
}

.conversation-list__skeleton {
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.conversation-list__skeleton-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.conversation-list__skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  align-items: center;
  gap: 12px;
}

.conversation-list__delete-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
  cursor: pointer;
}
</style>
