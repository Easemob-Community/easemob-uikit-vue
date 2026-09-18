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
  MESSAGE_TYPE,
  useClient,
  useContactStore,
  useConversation,
  useConversationTabs,
  useGroup,
  useLocale,
  useMessageSend,
  useNotification,
  useOwnUserInfo,
  useUIKit,
  useViewport,
} from '@easemob/uikit-im'
import type { ConversationTabKey, CreateGroupParams, CustomMessageBody, UiContact, UiGroup, UiMessage } from '@easemob/uikit-im'
import NavSidebar from './components/nav-sidebar.vue'
import DemoCardMessage from './components/demo-card-message.vue'
import DemoCardPickerModal from './components/demo-card-picker-modal.vue'
import DemoQuickReplyPanel from './components/demo-quick-reply-panel.vue'
import DemoMarkdownMessage from './components/ai/demo-markdown-message.vue'
import DemoWatermark from './components/demo-watermark.vue'
import {
  getMockAiReply,
  runMarkdownStreamDemo,
  simulateStreamMessage,
} from './components/ai/use-stream-demo'
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
  chatMessageServerSearchEnabled,
  chatMessageStatusShowText,
  chatMessageStatusDirection,
  chatMessageStatusPosition,
  chatMessageStatusStyle,
  chatBubbleStyle,
  chatVoiceUnreadDot,
  showHomeSearch,
  showContactSearch,
  showGroupSearch,
  conversationTabs,
  conversationTabsVisible,
  conversationTabsTakeover,
  conversationItemTakeover,
  messageActionMenuTakeover,
  userCardTakeover,
  watermarkEnabled,
  conversationActiveTab,
  statusBannerEnabled,
  conversationVariant,
  chatVariant,
  chatDrawerMode,
  chatDrawerCloseOnClickOutside,
  conversationShowAvatar,
  conversationUnreadMode,
  conversationUnreadPlacement,
  conversationBadgePlacement,
  sidebarWidth,
  persistSidebarWidth,
  devHintsEnabled,
  notificationEnable,
  notificationBrowser,
  notificationInApp,
  notificationAutoRequest,
  notificationTriggerMode,
  notificationSound,
  aiMockReplyEnabled,
} = useDemoSettings()

/** 水印文案：当前用户显示名 + userId（#watermark 插槽注入内容，聊天区与联系人列表共用） */
const watermarkText = computed(() => `${ownDisplayName.value || ''} ${currentUser.value || ''}`.trim() || 'demo')

/** 消息通知配置：面板改动实时同步到 useNotification 单例（Provider 已按 prop 接线） */
const { configureNotification, setNotificationHandler } = useNotification()
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
 * 新消息响铃演示：onNotify 送达回调（判定链命中且通知实际投递时触发）。
 * 铃声由业务侧实现——此处用 Web Audio 哔声演示；音频资源与 autoplay 解锁策略
 * （无用户手势时 AudioContext 处于 suspended）都是业务侧职责。
 */
let beepCtx: AudioContext | null = null
function playNotificationBeep() {
  try {
    beepCtx ??= new AudioContext()
    if (beepCtx.state === 'suspended')
      void beepCtx.resume()
    const osc = beepCtx.createOscillator()
    const gain = beepCtx.createGain()
    osc.connect(gain)
    gain.connect(beepCtx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.12, beepCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, beepCtx.currentTime + 0.35)
    osc.start()
    osc.stop(beepCtx.currentTime + 0.35)
  }
  catch {
    // 音频不可用（如无用户手势）时静默失败，不影响通知本身
  }
}

/** 响铃开关：注册/注销送达回调（Provider 的 notification.onNotify 与这条注册路径等价） */
watch(notificationSound, (on) => {
  setNotificationHandler(on ? () => playNotificationBeep() : null)
}, { immediate: true })

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

/** 当前右侧主区域展示的联系人详情用户 ID */
const detailUserId = ref<string | null>(null)
/** 当前右侧主区域展示的群组详情群 ID */
const detailGroupId = ref<string | null>(null)

// 通讯录操作弹窗
const showAddContactModal = ref(false)
const showCreateGroupModal = ref(false)

const { createGroup } = useGroup()

/** demo 造数：群名称格式化为「群组 + 创建日期时间」，便于区分多次创建的群 */
function formatDemoGroupName() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `群组 ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/**
 * 接管创建群组动作（EmCreateGroupModal create-fn）：
 * 改名为「群组 + 创建日期时间」后委托 useGroup().createGroup 走 SDK 默认创建；
 * 弹窗创建成功后仍会用自动生成的旧名字写入本地会话，这里在宏任务补一次改名，
 * 避免会话列表短暂显示旧名（下次会话同步后同样会纠正为服务端群名）。
 */
async function demoCreateGroup(params: CreateGroupParams) {
  const name = formatDemoGroupName()
  const result = await createGroup({ ...params, name })
  setTimeout(() => stores.conversation.updateConversation(result.groupId, { name }), 0)
  return result
}

// 名片消息演示：用户名片弹窗
const showCardUserId = ref('')
const showCardModal = ref(false)
// 名片选择弹窗
const showCardPickerModal = ref(false)
const chatContainerRef = ref<{ setText?: (text: string) => void }>()

/** EmChatContainer 配置（由设置面板状态实时组装） */
const chatConfig = computed(() => ({
  header: { showAvatar: true, align: 'left' as const },
  drawer: { mode: chatDrawerMode.value, closeOnClickOutside: chatDrawerCloseOnClickOutside.value },
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
    bubbleStyle: chatBubbleStyle.value,
    voiceUnreadDot: chatVoiceUnreadDot.value,
    search: {
      enabled: chatMessageSearchEnabled.value,
      enableServerSearch: chatMessageServerSearchEnabled.value,
    },
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

/* ============== AI 流式演示（mock） ============== */

/**
 * Toolbar「AI 演示」：向当前会话注入一条 markdown 流式演示消息
 * （代码块 / 表格 / 引用，见 use-stream-demo 的 markdownStreamDemoContent）。
 */
function runAiDemoFromToolbar() {
  const cvs = stores.conversation.currentConversation
  if (!cvs)
    return
  runMarkdownStreamDemo(stores.message, {
    conversationId: cvs.id,
    conversationType: cvs.type,
    to: stores.client.currentUser || '',
  })
}

/** 已触发过 AI 回复的本地消息 id（防同一条消息重复触发） */
const aiRepliedMessageIds = new Set<string>()

/**
 * AI 应答（mock）：开启后自己发送文本消息，自动注入 mock AI 的 markdown 流式回复。
 * 监听当前会话最后一条消息（isSelf 文本、非流式、非撤回）→ 延迟触发模拟器。
 * 真实接入时由业务服务端 / 模型 API 的流式返回驱动，无需改动内核。
 */
watch(
  () => {
    const cvsId = stores.conversation.currentConversationId
    if (!cvsId || !aiMockReplyEnabled.value)
      return ''
    const msgs = stores.message.getMessages(cvsId)
    const last = msgs[msgs.length - 1]
    if (!last || !last.isSelf || last.type !== MESSAGE_TYPE.TEXT || last.recalled || last.stream)
      return ''
    return last.msgServerId || last.msgLocalId || ''
  },
  (msgId) => {
    if (!msgId || aiRepliedMessageIds.has(msgId))
      return
    aiRepliedMessageIds.add(msgId)
    const cvs = stores.conversation.currentConversation
    if (!cvs)
      return
    const msgs = stores.message.getMessages(cvs.id)
    const last = msgs[msgs.length - 1]
    const question = (last?.body as { content?: string } | undefined)?.content || ''
    window.setTimeout(() => {
      simulateStreamMessage(stores.message, {
        conversationId: cvs.id,
        conversationType: cvs.type,
        to: stores.client.currentUser || '',
        customType: 'markdown',
        content: getMockAiReply(question),
      })
    }, 700)
  },
)
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
        :handle-size="10"
        class="demo-layout__sidebar"
        @resize-end="persistSidebarWidth"
      >
        <EmConversationContainer
          v-if="sidebarTab === 'conversation'"
          :tabs="effectiveConversationTabs"
          :active-tab="effectiveConversationActiveTab"
          :show-status-banner="statusBannerEnabled"
          :variant="conversationVariant"
          :show-avatar="conversationShowAvatar"
          :unread-mode="conversationUnreadMode"
          :unread-placement="conversationUnreadPlacement"
          :badge-placement="conversationBadgePlacement"
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
          <!-- 自定义会话项接管：显示会话名 + 摘要 + 未读角标 -->
          <template v-if="conversationItemTakeover" #item="{ conversation, active, select }">
            <div
              class="demo-conv-item"
              :class="{ 'is-active': active }"
              :data-conv-id="conversation.id"
              @click="select"
            >
              <div class="demo-conv-item__info">
                <span class="demo-conv-item__name">{{ conversation.name }}</span>
                <span class="demo-conv-item__text">{{ conversation.lastMessageText }}</span>
              </div>
              <span
                v-if="(conversation.unreadCount ?? 0) > 0"
                class="demo-conv-item__badge"
              >
                {{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}
              </span>
            </div>
          </template>
          <!-- 创建群组接管：群名改为「群组 + 创建日期时间」（区分造数） -->
          <template #create-group="{ show, close }">
            <EmCreateGroupModal :show="show" :create-fn="demoCreateGroup" @update:show="close" />
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
        >
          <!-- 水印覆盖层注入（铺满联系人列表区，不响应交互） -->
          <template v-if="watermarkEnabled" #watermark>
            <DemoWatermark :text="watermarkText" />
          </template>
        </EmContactContainer>
      </EmResizable>

      <!-- 右侧主体：聊天容器 / 联系人详情 / 群组详情；
           聊天 card 档位下容器自绘卡片，宿主壳去除边框/圆角/底色避免双卡 -->
      <div
        class="demo-layout__main"
        :class="{ 'demo-layout__main--bare': !detailUserId && !detailGroupId && chatVariant === 'card' }"
      >
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
          @leaved="detailGroupId = null"
          @destroyed="detailGroupId = null"
        />
        <EmChatContainer
          v-else
          ref="chatContainerRef"
          :config="chatConfig"
          :variant="chatVariant"
        >
          <template #toolbar-extra="{ togglePanel: toggleQuickReplyPanel }">
            <button
              class="demo-toolbar-btn"
              :title="t('demo.quickReply.title')"
              @click="toggleQuickReplyPanel"
            >
              <EmIcon name="lines/arrow-right_3bars" :size="22" />
            </button>
            <button
              class="demo-toolbar-btn"
              title="AI 流式演示（注入 markdown 流式消息）"
              :disabled="!stores.conversation.currentConversation"
              @click="runAiDemoFromToolbar"
            >
              <EmIcon name="bubble/rect/empty" :size="22" />
            </button>
            <button
              class="demo-toolbar-btn"
              :title="t('demo.card.send')"
              @click="showCardPickerModal = true"
            >
              <EmIcon name="person/single" :size="22" />
            </button>
          </template>
          <template #input-panel="{ showPanel }">
            <DemoQuickReplyPanel
              v-if="showPanel"
              @select="(text) => chatContainerRef?.setText?.(text)"
            />
          </template>
          <template #message-txt="{ message }">
            <DemoMarkdownMessage :message="message as UiMessage" />
          </template>
          <template #message-custom="{ message }">
            <DemoCardMessage
              v-if="isUserCardMessage(message as UiMessage)"
              :message="message as UiMessage"
              @card-click="openCardModal"
            />
            <EmCustomMessage v-else :message="message as UiMessage" />
          </template>
          <!-- 消息操作菜单接管：内置动作 + 自定义「举报」主菜单项 -->
          <template v-if="messageActionMenuTakeover" #message-action-menu="{ actions, select, close }">
            <div class="demo-action-menu">
              <button
                v-for="action in actions"
                :key="action.type"
                type="button"
                class="demo-action-menu__item"
                :class="{ 'is-danger': action.danger }"
                :disabled="action.disabled"
                @click="select(action.type, action)"
              >
                {{ action.label }}
              </button>
              <button
                type="button"
                class="demo-action-menu__item demo-action-menu__item--danger"
                @click="close"
              >
                举报（示例：业务在此接入举报接口）
              </button>
            </div>
          </template>
          <!-- 名片弹窗接管：点击头部头像时渲染业务自定义名片 -->
          <template v-if="userCardTakeover" #user-card="{ show, userId, close }">
            <div v-if="show" class="demo-card-overlay" @click.self="close">
              <div class="demo-card-popup">
                <p class="demo-card-popup__title">业务自定义用户名片</p>
                <p class="demo-card-popup__id">userId: {{ userId }}</p>
                <button type="button" class="demo-card-popup__btn" @click="close">关闭</button>
              </div>
            </div>
          </template>
          <template v-if="userCardTakeover" #group-card="{ show, groupId, close }">
            <div v-if="show" class="demo-card-overlay" @click.self="close">
              <div class="demo-card-popup">
                <p class="demo-card-popup__title">业务自定义群名片</p>
                <p class="demo-card-popup__id">groupId: {{ groupId }}</p>
                <button type="button" class="demo-card-popup__btn" @click="close">关闭</button>
              </div>
            </div>
          </template>
          <!-- 水印覆盖层注入（铺满聊天区，不响应交互） -->
          <template v-if="watermarkEnabled" #watermark>
            <DemoWatermark :text="watermarkText" />
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
            <EmIcon name="hamburger" :size="20" />
          </button>
          <span class="h5-page__title">{{ sidebarTab === 'conversation' ? '消息' : '通讯录' }}</span>
          <button class="h5-page__header-btn" @click="showSettings = true">
            <EmIcon name="flower" :size="20" />
          </button>
        </div>
        <div class="h5-page__body">
          <EmConversationContainer
            v-if="sidebarTab === 'conversation'"
            :pull-refresh="true"
            :tabs="effectiveConversationTabs"
            :active-tab="effectiveConversationActiveTab"
            :show-status-banner="statusBannerEnabled"
            :variant="conversationVariant"
            :show-avatar="conversationShowAvatar"
            :unread-mode="conversationUnreadMode"
            :unread-placement="conversationUnreadPlacement"
            :badge-placement="conversationBadgePlacement"
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
            <!-- 自定义会话项接管（H5） -->
            <template v-if="conversationItemTakeover" #item="{ conversation, active, select }">
              <div
                class="demo-conv-item"
                :class="{ 'is-active': active }"
                :data-conv-id="conversation.id"
                @click="select"
              >
                <div class="demo-conv-item__info">
                  <span class="demo-conv-item__name">{{ conversation.name }}</span>
                  <span class="demo-conv-item__text">{{ conversation.lastMessageText }}</span>
                </div>
                <span
                  v-if="(conversation.unreadCount ?? 0) > 0"
                  class="demo-conv-item__badge"
                >
                  {{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}
                </span>
              </div>
            </template>
            <!-- 创建群组接管：群名改为「群组 + 创建日期时间」（区分造数） -->
            <template #create-group="{ show, close }">
              <EmCreateGroupModal :show="show" :create-fn="demoCreateGroup" @update:show="close" />
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
          >
            <!-- 水印覆盖层注入（铺满联系人列表区，不响应交互） -->
            <template v-if="watermarkEnabled" #watermark>
              <DemoWatermark :text="watermarkText" />
            </template>
          </EmContactContainer>
        </div>
        <!-- H5 底部 TabBar -->
        <nav class="h5-tabbar">
          <button
            class="h5-tabbar__item"
            :class="{ 'h5-tabbar__item--active': sidebarTab === 'conversation' }"
            @click="sidebarTab = 'conversation'"
          >
            <EmIcon name="bubble/rect/empty" :size="22" />
            <span class="h5-tabbar__label">消息</span>
          </button>
          <button
            class="h5-tabbar__item"
            :class="{ 'h5-tabbar__item--active': sidebarTab === 'contact' }"
            @click="sidebarTab = 'contact'"
          >
            <EmIcon name="person/list" :size="22" />
            <span class="h5-tabbar__label">通讯录</span>
          </button>
        </nav>
      </div>

      <!-- 聊天页 -->
      <div v-show="h5Page === 'chat'" class="h5-page">
        <div class="h5-page__header">
          <button class="h5-page__header-btn" @click="h5BackToList">
            <EmIcon name="arrow/left" :size="20" />
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
                <EmIcon name="lines/arrow-right_3bars" :size="22" />
              </button>
              <button
                class="demo-toolbar-btn"
                title="AI 流式演示（注入 markdown 流式消息）"
                :disabled="!stores.conversation.currentConversation"
                @click="runAiDemoFromToolbar"
              >
                <EmIcon name="bubble/rect/empty" :size="22" />
              </button>
              <button
                class="demo-toolbar-btn"
                :title="t('demo.card.send')"
                @click="showCardPickerModal = true"
              >
                <EmIcon name="person/single" :size="22" />
              </button>
            </template>
            <template #input-panel="{ showPanel }">
              <DemoQuickReplyPanel
                v-if="showPanel"
                @select="(text) => chatContainerRef?.setText?.(text)"
              />
            </template>
            <template #message-txt="{ message }">
              <DemoMarkdownMessage :message="message as UiMessage" />
            </template>
            <template #message-custom="{ message }">
              <DemoCardMessage
                v-if="isUserCardMessage(message as UiMessage)"
                :message="message as UiMessage"
                @card-click="openCardModal"
              />
              <EmCustomMessage v-else :message="message as UiMessage" />
            </template>
            <!-- 水印覆盖层注入（铺满聊天区，不响应交互） -->
            <template v-if="watermarkEnabled" #watermark>
              <DemoWatermark :text="watermarkText" />
            </template>
          </EmChatContainer>
        </div>
      </div>

      <!-- 联系人/群组详情页 -->
      <div v-show="h5Page === 'detail'" class="h5-page">
        <div class="h5-page__header">
          <button class="h5-page__header-btn" @click="h5Page = 'list'">
            <EmIcon name="arrow/left" :size="20" />
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
            @leaved="detailGroupId = null; h5Page = 'list'"
            @destroyed="detailGroupId = null; h5Page = 'list'"
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
    <EmCreateGroupModal v-model:show="showCreateGroupModal" :create-fn="demoCreateGroup" />
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
  /* 拖拽宽度由 EmResizable 控制，容器跟随宿主宽度而非 UIKIT 默认 360px */
  --uikit-sidebar-width: 100%;
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

/* 聊天 card 档位：卡片壳由 EmChatContainer 自绘，宿主壳退化为纯定位容器 */
.demo-layout__main--bare {
  border: none;
  border-radius: 0;
  background-color: transparent;
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
  /* H5 列表页全宽，覆写 UIKIT 容器默认 360px */
  --uikit-sidebar-width: 100%;
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

/* ===== 会话项 #item 插槽完全接管 ===== */

.demo-conv-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
  transition: background-color var(--uikit-anim-duration, 0.15s) var(--uikit-anim-easing, ease);
}

.demo-conv-item:hover {
  background-color: var(--uikit-bg-hover, #f3f4f6);
}

.demo-conv-item.is-active {
  background-color: rgba(var(--uikit-primary-rgb, 59, 130, 246), 0.06);
}

.demo-conv-item__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.demo-conv-item__name {
  font-size: var(--uikit-font-size-14);
  font-weight: 500;
  color: var(--uikit-text-primary, #111827);
}

.demo-conv-item__text {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary, #6b7280);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.demo-conv-item__badge {
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  line-height: 18px;
  text-align: center;
  border-radius: 9px;
  background: var(--uikit-danger-color, #ef4444);
  color: #fff;
  font-size: var(--uikit-font-size-11);
}

/* ===== 消息操作菜单 #message-action-menu 插槽完全接管 ===== */

.demo-action-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 160px;
  padding: 6px;
}

.demo-action-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: none;
  border-radius: var(--uikit-components-radius, 8px);
  background: none;
  cursor: pointer;
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-primary, #111827);
  white-space: nowrap;
  transition: background-color var(--uikit-anim-duration, 0.15s) var(--uikit-anim-easing, ease);
}

.demo-action-menu__item:hover:not(:disabled) {
  background-color: var(--uikit-bg-hover, #f3f4f6);
}

.demo-action-menu__item:disabled {
  color: var(--uikit-text-secondary, #6b7280);
  cursor: not-allowed;
  opacity: 0.6;
}

.demo-action-menu__item--danger {
  color: var(--uikit-danger-color, #ef4444);
}

/* ===== 名片弹窗 #user-card / #group-card 插槽完全接管 ===== */

.demo-card-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.demo-card-popup {
  width: 280px;
  padding: 20px;
  border-radius: 12px;
  background: var(--uikit-bg-elevated, #fff);
  box-shadow: var(--uikit-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
}

.demo-card-popup__title {
  margin: 0 0 8px;
  font-size: var(--uikit-font-size-15);
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.demo-card-popup__id {
  margin: 0 0 16px;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary, #6b7280);
  word-break: break-all;
}

.demo-card-popup__btn {
  padding: 6px 14px;
  border: none;
  border-radius: var(--uikit-components-radius, 8px);
  background: var(--uikit-primary-color, #3b82f6);
  color: #fff;
  cursor: pointer;
  font-size: var(--uikit-font-size-13);
}
</style>
