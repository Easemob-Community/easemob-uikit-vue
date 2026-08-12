<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  EmAddContactModal,
  EmChatContainer,
  EmContactContainer,
  EmContactDetail,
  EmConversationContainer,
  EmCreateGroupModal,
  EmCustomMessage,
  EmGroupDetail,
  EmIcon,
  EmResizable,
  EmUserCardModal,
  useClient,
  useContactStore,
  useConversation,
  useConversationTabs,
  useLocale,
  useMessageSend,
  useNotification,
  useOwnUserInfo,
  useUIKit,
  useViewport,
} from '@easemob/uikit'
import type { ConversationTabKey, CustomMessageBody, UiContact, UiConversation, UiGroup, UiMessage } from '@easemob/uikit'
import NavSidebar from './components/nav-sidebar.vue'
import DemoCardMessage from './components/demo-card-message.vue'
import DemoCardPickerModal from './components/demo-card-picker-modal.vue'
import DemoQuickReplyPanel from './components/demo-quick-reply-panel.vue'
import DemoSettingsDrawer from './components/settings/demo-settings-drawer.vue'
import DemoDevHintCard from './dev-hints/demo-dev-hint-card.vue'
import { useDevHints } from './dev-hints/use-dev-hints'
import { demoStickerPacks, useDemoSettings } from './composables/use-demo-settings'

/**
 * Demo 主页面
 *
 * 布局：PC 三栏（导航 + 会话/联系人列表 + 主区）/ H5 单栏栈式（列表 → 聊天 → 详情）。
 * 设置抽屉与全部可配置状态已抽离到 components/settings/* 与 useDemoSettings：
 * 本文件只保留页面编排、会话/联系人/名片等业务逻辑，以及组装 chatConfig。
 */

/** Provider 面四开关 + 自定义 dataSource（v-model 双向绑定到 app.vue） */
const props = defineProps<{
  enableContact: boolean
  enableBlocklist: boolean
  enablePresence: boolean
  enableDraft: boolean
  enableAtMe: boolean
  enableTyping: boolean
  useCustomDataSource: boolean
}>()
const emit = defineEmits<{
  (e: 'update:enableContact', v: boolean): void
  (e: 'update:enableBlocklist', v: boolean): void
  (e: 'update:enablePresence', v: boolean): void
  (e: 'update:enableDraft', v: boolean): void
  (e: 'update:enableAtMe', v: boolean): void
  (e: 'update:enableTyping', v: boolean): void
  (e: 'update:useCustomDataSource', v: boolean): void
  (e: 'logout'): void
}>()
function toggleEnableContact(v: boolean) {
  emit('update:enableContact', v)
}
function toggleEnableBlocklist(v: boolean) {
  emit('update:enableBlocklist', v)
}
function toggleEnablePresence(v: boolean) {
  emit('update:enablePresence', v)
}
function toggleEnableDraft(v: boolean) {
  emit('update:enableDraft', v)
}
function toggleEnableAtMe(v: boolean) {
  emit('update:enableAtMe', v)
}
function toggleEnableTyping(v: boolean) {
  emit('update:enableTyping', v)
}
function toggleCustomDataSource(v: boolean) {
  emit('update:useCustomDataSource', v)
}

const { t } = useLocale()
const { stores } = useUIKit()
const { currentUser } = useClient()
const { selectConversation } = useConversation()
const { sendCustomMessage } = useMessageSend()
const { displayName: ownDisplayName, avatarUrl: ownAvatarUrl } = useOwnUserInfo()
const { isMobile } = useViewport()

/** 设置状态（聊天配置 / 搜索控制等），见 use-demo-settings.ts */
const {
  chatInputMode,
  chatInputStyle,
  chatInputFeatures,
  chatInputAutoFocus,
  chatInputFocusBorderColor,
  chatInputCaretColor,
  chatInputSelectionColor,
  chatInputMaxLength,
  groupReadReceiptEnabled,
  groupReadReceiptMaxSize,
  chatShowTime,
  chatMessageSearchEnabled,
  chatMessageStatusShowText,
  chatMessageStatusDirection,
  chatMessageStatusPosition,
  chatMessageStatusStyle,
  showHomeSearch,
  showContactSearch,
  showGroupSearch,
  conversationTabs,
  conversationTabsVisible,
  conversationTabsTakeover,
  conversationActiveTab,
  statusBannerEnabled,
  sidebarWidth,
  persistSidebarWidth,
  devHintsEnabled,
  notificationEnable,
  notificationBrowser,
  notificationInApp,
  notificationAutoRequest,
  notificationTriggerMode,
} = useDemoSettings()

/** 消息通知配置：面板改动实时同步到 useNotification 单例（Provider 已按 prop 接线） */
const { configureNotification } = useNotification()
watch(
  [
    notificationEnable,
    notificationBrowser,
    notificationInApp,
    notificationAutoRequest,
    notificationTriggerMode,
  ],
  ([enabled, browserEnabled, inAppEnabled, autoRequestPermission, triggerMode]) => {
    configureNotification({
      enabled,
      browserEnabled,
      inAppEnabled,
      autoRequestPermission,
      triggerMode,
    })
  },
  { immediate: true },
)

/**
 * Dev Hints 开发者友好模式（D87）：悬停会话项/气泡等区域浮出环信接口 + UIKit 实现思路。
 * 事件委托挂在 .demo-layout 根上；开关由设置抽屉「开发者」分类控制（默认开），
 * 移动端无 hover 能力，自动禁用。
 */
const devHintsActive = computed(() => devHintsEnabled.value && !isMobile.value)
const { rootRef, badge, highlightEl, detail, openDetail, closeDetail } = useDevHints(devHintsActive)

/** 会话分栏：面板配置的 tabs 与 hook 状态；接管模式下由 #tabs 插槽完全自绘 */
const { tabs: takeoverTabs, activeTab: takeoverActiveTab, selectTab: takeoverSelectTab } = useConversationTabs({
  tabs: ['all', 'unread', 'single', 'group'],
  activeTab: 'all',
})

/** 实际传给会话容器的 tabs（显隐开关关闭时置空） */
const effectiveConversationTabs = computed(() =>
  conversationTabsTakeover.value ? takeoverTabs.value : (conversationTabsVisible.value ? conversationTabs.value : []),
)

/** 实际激活的 tab：接管模式用 hook 状态，普通模式用面板状态 */
const effectiveConversationActiveTab = computed(() =>
  conversationTabsTakeover.value ? takeoverActiveTab.value : conversationActiveTab.value,
)

function onConversationActiveTabChange(tab: ConversationTabKey) {
  if (conversationTabsTakeover.value)
    takeoverSelectTab(tab)
  else
    conversationActiveTab.value = tab
}

/** 接管模式下的 tab 标签（demo 自绘按钮用） */
const takeoverTabLabels = computed<Record<string, string>>(() => ({
  all: t('conversation.tabAll'),
  unread: t('conversation.tabUnread'),
  single: t('conversation.tabSingle'),
  group: t('conversation.tabGroup'),
}))

/** 左侧边栏 tab：会话 / 联系人 */
const sidebarTab = ref<'conversation' | 'contact'>('conversation')

/** H5 页面栈：'list' 会话/联系人列表 | 'chat' 聊天详情 | 'detail' 联系人/群组详情 */
const h5Page = ref<'list' | 'chat' | 'detail'>('list')

const showSettings = ref(false)

/* ============== 会话分栏 Mock 演示数据 ============== */

/**
 * 登录后若会话列表为空（账号无会话或 SDK 同步未完成），注入一组 mock 会话
 * 用于演示「全部 / 未读 / @我 / 单聊 / 群组」分栏效果；
 * 一旦见到真实列表（SDK 同步或业务创建）即停止兜底注入。
 */
const sawRealConversationList = ref(false)
let mockConversationsInjected = false

function injectMockConversations() {
  const now = Date.now()
  const list: UiConversation[] = [
    {
      id: 'mock_alice',
      name: 'Alice',
      type: 'singleChat',
      unreadCount: 2,
      lastMessageText: '晚上一起吃饭吗？',
      lastMessageTime: now - 5 * 60 * 1000,
      isPinned: true,
      isMuted: false,
      marks: [],
    },
    {
      id: 'mock_dev_group',
      name: '产品技术交流群',
      type: 'groupChat',
      unreadCount: 5,
      lastMessageText: 'Tom: 新版本已经发布，大家看下',
      lastMessageTime: now - 12 * 60 * 1000,
      isPinned: false,
      isMuted: false,
      marks: [],
    },
    {
      id: 'mock_bob',
      name: 'Bob',
      type: 'singleChat',
      unreadCount: 0,
      lastMessageText: '文件已发送',
      lastMessageTime: now - 30 * 60 * 1000,
      isPinned: false,
      isMuted: false,
      marks: [],
    },
    {
      id: 'mock_qa_group',
      name: 'QA 测试组',
      type: 'groupChat',
      unreadCount: 3,
      lastMessageText: 'Lily: 回归用例已更新',
      lastMessageTime: now - 2 * 60 * 60 * 1000,
      isPinned: false,
      isMuted: true,
      marks: [],
    },
    {
      id: 'mock_carol',
      name: 'Carol',
      type: 'singleChat',
      unreadCount: 0,
      lastMessageText: '收到，谢谢！',
      lastMessageTime: now - 24 * 60 * 60 * 1000,
      isPinned: false,
      isMuted: false,
      marks: [],
    },
  ]
  stores.conversation.setConversationList(list)
  // @我 标记：与 chat-events 的 em_at_list 命中机制同源（store 层 atMeMap）
  stores.conversation.setAtMe('mock_alice', true)
  stores.conversation.setAtMe('mock_dev_group', true)
  mockConversationsInjected = true
}

/** 会话列表为空且不在同步中时兜底注入 mock；见到真实数据后不再注入 */
watch(
  [
    () => stores.conversation.conversationList.length,
    () => stores.conversation.isSyncingConversations,
  ],
  ([len, syncing]) => {
    if (len > 0) {
      sawRealConversationList.value = true
      mockConversationsInjected = false
      return
    }
    if (!syncing && !sawRealConversationList.value && !mockConversationsInjected)
      injectMockConversations()
  },
  { immediate: true },
)

/** 当前右侧主区域展示的联系人详情用户 ID */
const detailUserId = ref<string | null>(null)
/** 当前右侧主区域展示的群组详情群 ID */
const detailGroupId = ref<string | null>(null)

// 通讯录操作弹窗
const showAddContactModal = ref(false)
const showCreateGroupModal = ref(false)

// 名片消息演示：用户名片弹窗
const showCardUserId = ref('')
const showCardModal = ref(false)
// 名片选择弹窗
const showCardPickerModal = ref(false)
const chatContainerRef = ref<{ setText?: (text: string) => void }>()

/** EmChatContainer 配置（由设置面板状态实时组装） */
const chatConfig = computed(() => ({
  header: { showAvatar: false },
  groupReadReceipt: {
    enabled: groupReadReceiptEnabled.value,
    maxGroupSize: groupReadReceiptMaxSize.value,
  },
  groupManagement: {
    showMuteAll: true,
    showMuteList: true,
    showBlocklist: true,
    showAllowlist: false,
    showSharedFiles: true,
    showJoinRequests: false,
  },
  input: {
    mode: chatInputMode.value,
    style: chatInputStyle.value,
    features: { ...chatInputFeatures.value },
    autoFocus: chatInputAutoFocus.value,
    showSendButton: false,
    stickerPacks: demoStickerPacks,
    ...(chatInputFocusBorderColor.value ? { focusBorderColor: chatInputFocusBorderColor.value } : {}),
    ...(chatInputCaretColor.value ? { caretColor: chatInputCaretColor.value } : {}),
    ...(chatInputSelectionColor.value ? { selectionColor: chatInputSelectionColor.value } : {}),
    ...(chatInputMaxLength.value > 0 ? { maxLength: chatInputMaxLength.value } : {}),
  },
  messageList: {
    showTime: chatShowTime.value,
    search: { enabled: chatMessageSearchEnabled.value },
    messageStatus: {
      showText: chatMessageStatusShowText.value,
      direction: chatMessageStatusDirection.value,
      position: chatMessageStatusPosition.value,
      style: chatMessageStatusStyle.value,
    },
  },
}))

/** 发送指定用户的名片到当前会话（扩展消息演示） */
async function sendCard(userId: string) {
  const cvs = stores.conversation.currentConversation
  if (!cvs || !userId)
    return
  const params: Record<string, string> = { uid: userId }
  const contact = stores.contact.getContact(userId)
  const userInfo = stores.userInfo.getUserInfo(userId)
  const nickname = contact?.remark || userInfo?.nickname || (userId === currentUser.value ? ownDisplayName.value : undefined) || userId
  params.nickname = nickname
  const avatar = userInfo?.avatarUrl || contact?.avatar || (userId === currentUser.value ? ownAvatarUrl.value : undefined)
  if (avatar)
    params.avatar = avatar
  await sendCustomMessage('userCard', params)
}

/** 判断 custom 消息是否为名片 */
function isUserCardMessage(message: UiMessage): boolean {
  return message.type === 'custom' && (message.body as CustomMessageBody).event === 'userCard'
}

/** 打开名片弹窗 */
function openCardModal(userId: string) {
  showCardUserId.value = userId
  showCardModal.value = true
}

/** 从联系人详情页进入单聊 */
function enterChatWithUser(userId: string) {
  const contactStore = useContactStore()
  const contact = contactStore.getContact(userId)
  const existing = stores.conversation.conversationList.find(c => c.id === userId)
  if (!existing) {
    stores.conversation.addConversation({
      id: userId,
      name: contact?.name || contact?.remark || userId,
      avatar: contact?.avatar,
      type: 'singleChat',
      unreadCount: 0,
      lastMessageText: '',
      isPinned: false,
      isMuted: false,
      marks: [],
    })
  }
  selectConversation(userId)
  sidebarTab.value = 'conversation'
  detailUserId.value = null
  if (isMobile.value) {
    h5Page.value = 'chat'
  }
}

/** 从群组详情页进入群聊 */
function enterChatWithGroup(groupId: string) {
  const existing = stores.conversation.conversationList.find(c => c.id === groupId)
  if (!existing) {
    const group = stores.group.getGroupById(groupId)
    stores.conversation.addConversation({
      id: groupId,
      name: group?.groupName || groupId,
      avatar: group?.avatar,
      type: 'groupChat',
      unreadCount: 0,
      lastMessageText: '',
      isPinned: false,
      isMuted: false,
      marks: [],
    })
  }
  selectConversation(groupId)
  sidebarTab.value = 'conversation'
  detailGroupId.value = null
  if (isMobile.value) {
    h5Page.value = 'chat'
  }
}

/** H5：从聊天返回列表 */
function h5BackToList() {
  h5Page.value = 'list'
  stores.conversation.setCurrentConversationId(null)
}

/** H5：进入联系人/群组详情 */
function h5EnterDetail(type: 'user' | 'group', id: string) {
  if (type === 'user') {
    detailUserId.value = id
    detailGroupId.value = null
  }
  else {
    detailGroupId.value = id
    detailUserId.value = null
  }
  h5Page.value = 'detail'
}

/** 设置抽屉内登出成功：清状态回到登录页（SDK 登出动作由 SDK 面板完成） */
function handleLogout() {
  emit('logout')
}

/* ============== 页面联动 ============== */

/** 切到联系人页时清空当前会话，避免右侧 Chat 仍显示旧会话 */
watch(sidebarTab, (tab) => {
  if (tab === 'contact') {
    stores.conversation.setCurrentConversationId(null)
  }
  else if (tab === 'conversation') {
    detailUserId.value = null
    detailGroupId.value = null
  }
})

/** 选中会话后清空联系人详情页；H5 时自动跳聊天页 */
watch(() => stores.conversation.currentConversationId, (id) => {
  if (id) {
    detailUserId.value = null
    detailGroupId.value = null
    if (isMobile.value) {
      h5Page.value = 'chat'
    }
  }
})
</script>

<template>
  <!-- 事件委托根：Dev Hints 引擎在此监听悬停（rootRef 绑定） -->
  <div ref="rootRef" class="demo-layout">
    <!-- ==================== PC 三栏布局 ==================== -->
    <template v-if="!isMobile">
      <!-- 左侧导航栏（仿微信） -->
      <NavSidebar
        v-model="sidebarTab"
        @open-settings="showSettings = true"
      />

      <!-- 中间侧边栏：会话列表 / 联系人列表（宽度可拖拽调整 240~480，宽度持久化到 UIKIT 内部配置存储） -->
      <EmResizable
        v-model="sidebarWidth"
        axis="horizontal"
        :min="240"
        :max="480"
        class="demo-layout__sidebar"
        @resize-end="persistSidebarWidth"
      >
        <EmConversationContainer
          v-if="sidebarTab === 'conversation'"
          :tabs="effectiveConversationTabs"
          :active-tab="effectiveConversationActiveTab"
          :show-status-banner="statusBannerEnabled"
          @update:active-tab="onConversationActiveTabChange"
        >
          <template v-if="conversationTabsTakeover" #tabs="{ tabs, activeTab, selectTab }">
            <div class="demo-takeover-tabs">
              <button
                v-for="tab in tabs"
                :key="tab"
                type="button"
                class="demo-takeover-tab"
                :class="{ 'is-active': activeTab === tab }"
                @click="selectTab(tab)"
              >
                {{ takeoverTabLabels[tab] || tab }}
              </button>
            </div>
          </template>
        </EmConversationContainer>
        <EmContactContainer
          v-else
          :show-home-search="showHomeSearch"
          :show-contact-search="showContactSearch"
          :show-group-search="showGroupSearch"
          @view-change="() => { detailUserId = null; detailGroupId = null }"
          @contact-click="(c: UiContact) => { detailUserId = c.userId; detailGroupId = null }"
          @group-click="(g: UiGroup) => { detailGroupId = g.groupId; detailUserId = null }"
          @add-contact="showAddContactModal = true"
          @create-group="showCreateGroupModal = true"
        />
      </EmResizable>

      <!-- 右侧主体：聊天容器 / 联系人详情 / 群组详情 -->
      <div class="demo-layout__main">
        <EmContactDetail
          v-if="detailUserId"
          :user-id="detailUserId"
          @send-message="enterChatWithUser"
          @deleted="detailUserId = null"
        />
        <EmGroupDetail
          v-else-if="detailGroupId"
          :group-id="detailGroupId"
          @send-message="enterChatWithGroup"
        />
        <EmChatContainer
          v-else
          ref="chatContainerRef"
          :config="chatConfig"
        >
          <template #toolbar-extra="{ togglePanel: toggleQuickReplyPanel }">
            <button
              class="demo-toolbar-btn"
              :title="t('demo.quickReply.title')"
              @click="toggleQuickReplyPanel"
            >
              <EmIcon name="chat/3lines_n_arrow" :size="22" />
            </button>
            <button
              class="demo-toolbar-btn"
              :title="t('demo.card.send')"
              @click="showCardPickerModal = true"
            >
              <EmIcon name="people/person_single" :size="22" />
            </button>
          </template>
          <template #input-panel="{ showPanel }">
            <DemoQuickReplyPanel
              v-if="showPanel"
              @select="(text) => chatContainerRef?.setText?.(text)"
            />
          </template>
          <template #message-custom="{ message }">
            <DemoCardMessage
              v-if="isUserCardMessage(message as UiMessage)"
              :message="message as UiMessage"
              @card-click="openCardModal"
            />
            <EmCustomMessage v-else :message="message as UiMessage" />
          </template>
        </EmChatContainer>
      </div>
    </template>

    <!-- ==================== H5 单栏栈式布局 ==================== -->
    <template v-else>
      <!-- 列表页（会话 / 联系人） -->
      <div v-show="h5Page === 'list'" class="h5-page">
        <div class="h5-page__header">
          <button class="h5-page__header-btn" @click="showSettings = true">
            <EmIcon name="actions/menu" :size="20" />
          </button>
          <span class="h5-page__title">{{ sidebarTab === 'conversation' ? '消息' : '通讯录' }}</span>
          <button class="h5-page__header-btn" @click="showSettings = true">
            <EmIcon name="misc/gear" :size="20" />
          </button>
        </div>
        <div class="h5-page__body">
          <EmConversationContainer
            v-if="sidebarTab === 'conversation'"
            :pull-refresh="true"
            :tabs="effectiveConversationTabs"
            :active-tab="effectiveConversationActiveTab"
            :show-status-banner="statusBannerEnabled"
            @update:active-tab="onConversationActiveTabChange"
          >
            <template v-if="conversationTabsTakeover" #tabs="{ tabs, activeTab, selectTab }">
              <div class="demo-takeover-tabs">
                <button
                  v-for="tab in tabs"
                  :key="tab"
                  type="button"
                  class="demo-takeover-tab"
                  :class="{ 'is-active': activeTab === tab }"
                  @click="selectTab(tab)"
                >
                  {{ takeoverTabLabels[tab] || tab }}
                </button>
              </div>
            </template>
          </EmConversationContainer>
          <EmContactContainer
            v-else
            :show-home-search="showHomeSearch"
            :show-contact-search="showContactSearch"
            :show-group-search="showGroupSearch"
            @view-change="() => { detailUserId = null; detailGroupId = null }"
            @contact-click="(c: UiContact) => h5EnterDetail('user', c.userId)"
            @group-click="(g: UiGroup) => h5EnterDetail('group', g.groupId)"
            @add-contact="showAddContactModal = true"
            @create-group="showCreateGroupModal = true"
          />
        </div>
        <!-- H5 底部 TabBar -->
        <nav class="h5-tabbar">
          <button
            class="h5-tabbar__item"
            :class="{ 'h5-tabbar__item--active': sidebarTab === 'conversation' }"
            @click="sidebarTab = 'conversation'"
          >
            <EmIcon name="chat/bubble_fill" :size="22" />
            <span class="h5-tabbar__label">消息</span>
          </button>
          <button
            class="h5-tabbar__item"
            :class="{ 'h5-tabbar__item--active': sidebarTab === 'contact' }"
            @click="sidebarTab = 'contact'"
          >
            <EmIcon name="people/person_3lines_fill" :size="22" />
            <span class="h5-tabbar__label">通讯录</span>
          </button>
        </nav>
      </div>

      <!-- 聊天页 -->
      <div v-show="h5Page === 'chat'" class="h5-page">
        <div class="h5-page__header">
          <button class="h5-page__header-btn" @click="h5BackToList">
            <EmIcon name="arrows/arrow_left" :size="20" />
          </button>
          <span class="h5-page__title">聊天</span>
          <span class="h5-page__header-spacer" />
        </div>
        <div class="h5-page__body">
          <EmChatContainer
            ref="chatContainerRef"
            :config="chatConfig"
          >
            <template #toolbar-extra="{ togglePanel: toggleQuickReplyPanel }">
              <button
                class="demo-toolbar-btn"
                :title="t('demo.quickReply.title')"
                @click="toggleQuickReplyPanel"
              >
                <EmIcon name="chat/3lines_n_arrow" :size="22" />
              </button>
              <button
                class="demo-toolbar-btn"
                :title="t('demo.card.send')"
                @click="showCardPickerModal = true"
              >
                <EmIcon name="people/person_single" :size="22" />
              </button>
            </template>
            <template #input-panel="{ showPanel }">
              <DemoQuickReplyPanel
                v-if="showPanel"
                @select="(text) => chatContainerRef?.setText?.(text)"
              />
            </template>
            <template #message-custom="{ message }">
              <DemoCardMessage
                v-if="isUserCardMessage(message as UiMessage)"
                :message="message as UiMessage"
                @card-click="openCardModal"
              />
              <EmCustomMessage v-else :message="message as UiMessage" />
            </template>
          </EmChatContainer>
        </div>
      </div>

      <!-- 联系人/群组详情页 -->
      <div v-show="h5Page === 'detail'" class="h5-page">
        <div class="h5-page__header">
          <button class="h5-page__header-btn" @click="h5Page = 'list'">
            <EmIcon name="arrows/arrow_left" :size="20" />
          </button>
          <span class="h5-page__title">详情</span>
          <span class="h5-page__header-spacer" />
        </div>
        <div class="h5-page__body">
          <EmContactDetail
            v-if="detailUserId"
            :user-id="detailUserId"
            @send-message="enterChatWithUser"
            @deleted="detailUserId = null; h5Page = 'list'"
          />
          <EmGroupDetail
            v-else-if="detailGroupId"
            :group-id="detailGroupId"
            @send-message="enterChatWithGroup"
          />
        </div>
      </div>
    </template>

    <!-- 设置抽屉（分类导航，见 components/settings/） -->
    <DemoSettingsDrawer
      v-model:show="showSettings"
      :is-mobile="isMobile"
      :enable-contact="props.enableContact"
      :enable-blocklist="props.enableBlocklist"
      :enable-presence="props.enablePresence"
      :enable-draft="props.enableDraft"
      :enable-at-me="props.enableAtMe"
      :enable-typing="props.enableTyping"
      :use-custom-data-source="props.useCustomDataSource"
      @update:enable-contact="toggleEnableContact"
      @update:enable-blocklist="toggleEnableBlocklist"
      @update:enable-presence="toggleEnablePresence"
      @update:enable-draft="toggleEnableDraft"
      @update:enable-at-me="toggleEnableAtMe"
      @update:enable-typing="toggleEnableTyping"
      @update:use-custom-data-source="toggleCustomDataSource"
      @logout="handleLogout"
    />

    <!-- 添加好友 / 创建群组 / 名片弹窗 -->
    <EmAddContactModal v-model:show="showAddContactModal" />
    <EmCreateGroupModal v-model:show="showCreateGroupModal" />
    <EmUserCardModal v-model:show="showCardModal" :user-id="showCardUserId" @send-message="enterChatWithUser" />
    <DemoCardPickerModal
      v-model:show="showCardPickerModal"
      :own-user-id="currentUser || undefined"
      :contacts="stores.contact.contactList"
      @select="sendCard"
    />

    <!-- Dev Hints 开发者友好模式覆盖层（仅 PC；移动端无 hover 不启用） -->
    <div v-if="!isMobile" class="demo-dev-hints-layer">
      <DemoDevHintCard
        :badge="badge"
        :highlight-el="highlightEl"
        :detail="detail"
        @open-detail="openDetail"
        @close-detail="closeDetail"
      />
    </div>
  </div>
</template>

<style scoped>
.demo-layout {
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100vw;
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  color: var(--uikit-text-primary, #111827);
  overflow: hidden;
  gap: var(--uikit-container-gap, 8px);
  padding: var(--uikit-container-gap, 8px);
  box-sizing: border-box;
}

.demo-toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--uikit-components-radius, 6px);
  background: none;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  transition:
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing),
    color var(--uikit-anim-duration) var(--uikit-anim-easing);
  flex-shrink: 0;
}

.demo-toolbar-btn:hover {
  background-color: var(--uikit-bg-hover);
  color: var(--uikit-text-primary);
}

.demo-layout__sidebar {
  flex-shrink: 0;
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  border-radius: var(--uikit-components-radius, 8px);
  overflow: auto;
  height: 100%;
  background-color: var(--uikit-bg-base, #ffffff);
}

.demo-layout__main {
  flex: 1;
  min-width: 0;
  overflow: auto;
  height: 100%;
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-bg-base, #ffffff);
}

/* ===== H5 单栏布局 ===== */

.h5-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: var(--uikit-bg-base, #ffffff);
  overflow: hidden;
}

.h5-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  padding-top: calc(var(--uikit-safe-top, 0px) + 8px);
  border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
  flex-shrink: 0;
  min-height: 44px;
}

.h5-page__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.h5-page__header-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--uikit-text-primary, #111827);
  cursor: pointer;
  padding: 0;
}

.h5-page__header-btn:active {
  background-color: var(--uikit-bg-hover, #e5e7eb);
}

.h5-page__header-spacer {
  width: 36px;
}

.h5-page__body {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* H5 底部 TabBar */
.h5-tabbar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 50px;
  padding-bottom: var(--uikit-safe-bottom, 0px);
  border-top: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: var(--uikit-bg-base, #ffffff);
  flex-shrink: 0;
}

.h5-tabbar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  background: transparent;
  color: var(--uikit-text-tertiary, #9ca3af);
  cursor: pointer;
  padding: 4px 16px;
  transition: color var(--uikit-anim-duration, 300ms) var(--uikit-anim-easing, ease);
}

.h5-tabbar__item--active {
  color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

.h5-tabbar__label {
  font-size: 11px;
  line-height: 1;
}

/* ===== 会话分栏 #tabs 插槽完全接管（demo 下划线风格） ===== */

.demo-takeover-tabs {
  display: flex;
  gap: 4px;
  padding: 2px 16px 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.demo-takeover-tabs::-webkit-scrollbar {
  display: none;
}

.demo-takeover-tab {
  flex-shrink: 0;
  padding: 6px 10px;
  font-size: 13px;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--uikit-text-secondary, #6b7280);
  cursor: pointer;
  transition:
    color var(--uikit-anim-duration, 0.15s) var(--uikit-anim-easing, ease),
    border-color var(--uikit-anim-duration, 0.15s) var(--uikit-anim-easing, ease);
}

.demo-takeover-tab:hover {
  color: var(--uikit-text-primary, #111827);
}

.demo-takeover-tab.is-active {
  color: var(--uikit-primary-color, #3b82f6);
  border-bottom-color: var(--uikit-primary-color, #3b82f6);
  font-weight: 600;
}
</style>
