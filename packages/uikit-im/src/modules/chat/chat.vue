<script setup lang="ts">
import { computed, nextTick, onErrorCaptured, onMounted, onUnmounted, provide, ref, useSlots, watch, watchEffect } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { EmAvatar as Avatar, CONVERSATION_TYPE, EmEmpty as Empty, FORWARD_MODE, GROUP_MEMBER_ROLE, HEADER_ALIGN, INJECTION_KEY, EmIcon as Icon, EmIconButton as IconButton, MESSAGE_TYPE, EmModal as Modal, NOTICE_EVENT_TYPE, createLogger, formatSdkError, insertChatNotice, useLocale, usePresence, useToast } from '@easemob/uikit-core'
import type { UiConversation as Conversation, ConversationTypeValue, ForwardModeValue, LocationMessageBody, TextMessageBody, UiGroupMember, UiMessage } from '@easemob/uikit-core'
import { normalizeUserId } from '@easemob/uikit-sdk-contract'
import { useChat } from '../../composables/use-chat'
import { useUIKit } from '../../composables/use-uikit'
import { useConversation } from '../../composables/use-conversation'
import { useQuote } from '../../composables/use-quote'
import { useUserInfo } from '../../composables/use-user-info'
import { useGroup } from '../../composables/use-group'
import { provideChatPluginContext } from '../../composables/use-chat-plugin'
import { chineseMessagePreviewLabels, resolveLastMessageText, resolveSenderDisplayName } from '../../utils/resolve-last-message-text'
import InviteMemberModal from '../group/invite-member-modal.vue'
import CreateGroupModal from '../conversation/create-group-modal.vue'
import UserCardModal from '../../components/user-card/user-card-modal.vue'
import GroupCardModal from '../../components/group-card/group-card-modal.vue'
import MessageList from './message-list/message-list.vue'
import MessageInput from './message-input/index.vue'
import PinnedBar from './message-list/pinned-bar.vue'
import GroupAnnouncementBanner from './group-announcement-banner.vue'
import ChatInfoDrawer from './drawer/chat-info-drawer.vue'
import ForwardModal from './forward-modal/forward-modal.vue'
import MultiSelectBar from './multi-select-bar/multi-select-bar.vue'
import MessageSearchModal from './message-search/message-search-modal.vue'
import type { ChatConfig, MentionContact } from './types'

const props = defineProps<ChatProps>()

const emit = defineEmits<ChatEmits>()

const logger = createLogger('UIKit:Chat')

/** 渲染错误信息 */
interface RenderError {
  message: string
  component?: string
}

export interface ChatProps {
  /** 聊天容器完整配置（输入框 / 消息列表 / 消息操作 / 群能力等，见 ChatConfig） */
  config?: ChatConfig
  /** 是否处于全局加载状态 */
  loading?: boolean
  /** 自定义根元素 class */
  class?: string
  /** 自定义根元素 style */
  style?: Record<string, string>
}

export interface ChatEmits {
  /** 消息撤回失败时触发，参数为错误对象与目标消息 / Emitted when recalling a message fails, with the error and the target message */
  (e: 'recall-failed', error: any, message: UiMessage): void
  /** 点击消息中的 @提及（@mention）时触发，参数为被提及的用户 ID / Emitted when an @mention in a message is clicked, with the mentioned user ID */
  (e: 'at-me-click', userId: string): void
  /** 群管理操作（全员禁言、成员禁言/拉黑、入群申请处理等）时触发，参数为操作类型、群 ID，成员类操作附带 userId / Emitted when a group management action is performed, with the action type, group ID and optional user ID */
  (e: 'group-operation', payload: { type: string, groupId: string, userId?: string }): void
  /** 点击位置（location）消息时触发，参数为位置消息体与对应消息 / Emitted when a location message is clicked, with the location body and the message */
  (e: 'location-click', body: LocationMessageBody, message: UiMessage): void
  /** 点击自定义消息（custom）上的操作按钮时触发，参数为操作标识、载荷与对应消息 / Emitted when an action button on a custom message is clicked, with the action key, payload and the message */
  (e: 'custom-message-action', action: string, payload: any, message: UiMessage): void
  /** 点击输入框工具栏翻译按钮时触发（需在 config.input.features.translation 开启后展示，翻译业务交由宿主接入） / Emitted when the translation button in the input toolbar is clicked (shown when config.input.features.translation is enabled; translation logic is left to the host) */
  (e: 'translation-click'): void
  /** 点击输入框工具栏名片按钮时触发（需在 config.input.features.contactCard 开启后展示，名片发送业务交由宿主接入） / Emitted when the contact card button in the input toolbar is clicked (shown when config.input.features.contactCard is enabled; contact card sending is left to the host) */
  (e: 'contact-card-click'): void
}

/** 输入框组件引用 */
const messageInputRef = ref<InstanceType<typeof MessageInput>>()

/** 消息列表组件引用 */
const messageListRef = ref<InstanceType<typeof MessageList>>()

/** 暴露输入框操作方法 */
defineExpose({
  setText: (text: string) => messageInputRef.value?.setText?.(text),
  getText: () => messageInputRef.value?.getText?.() || '',
})

const {
  currentConversation,
  isMultiSelectMode,
  messages,
  selectedMessages,
  exitMultiSelectMode,
  fetchHistoryMessages,
  enterEditMode,
  exitEditMode,
  fetchPinnedMessages,
  deleteMessages,
  forwardMessage,
  forwardCombineMessages,
  selectAllMessages,
  deselectAllMessages,
  sendTextMessage,
  sendCustomMessage,
  sendImageMessage,
  sendFileMessage,
  sendAudioMessage,
  sendVideoMessage,
  sendLocationMessage,
} = useChat()
const { stores, domains, h5, client, capabilities } = useUIKit()
const { sendChannelAck, saveDraft, loadDraft, clearDraft, clearChatHistory, deleteConversation, selectConversation } = useConversation()
const { leaveGroup, destroyGroup, addGroupAdmin, removeGroupAdmin, removeGroupMembers, inviteUsersToGroup, fetchGroupMembers, fetchGroupInfo, fetchGroupAnnouncement } = useGroup()
const { clearQuote, requestLocate } = useQuote()

/**
 * 群已读回执配置：透传给 plugin 的发送方法。
 * 与 SDK 客观能力取交集：adapter 上报 groupReadReceipt=false 时强制关闭
 * （能力缺省 true，未上报的 adapter 行为不变）。
 */
const groupReadReceiptConfig = computed(() =>
  capabilities.groupReadReceipt === false ? undefined : props.config?.groupReadReceipt)

/** 获取用户显示名（备注 > 用户资料昵称 > ID） */
function getUserDisplayName(userId: string): string {
  const contact = stores.contact.getContact(userId)
  const userInfo = stores.userInfo.getUserInfo(userId)
  return contact?.remark || userInfo?.nickname || userId
}

/** 获取用户头像 */
function getUserAvatar(userId: string): string | undefined {
  const contact = stores.contact.getContact(userId)
  const userInfo = stores.userInfo.getUserInfo(userId)
  return userInfo?.avatarUrl || contact?.avatar
}

/** 向 plugin 提供聊天上下文与发送能力 */
provideChatPluginContext({
  currentConversation,
  currentUserId: computed(() => client.value.currentUserId),
  send: {
    sendTextMessage: (text, ext) => sendTextMessage(text, ext, groupReadReceiptConfig.value),
    sendCustomMessage,
    sendImageMessage: (data, ext) => sendImageMessage(data, groupReadReceiptConfig.value, ext),
    sendFileMessage: (file, ext) => sendFileMessage(file, groupReadReceiptConfig.value, ext),
    sendAudioMessage: (file, duration, ext) => sendAudioMessage(file, duration, groupReadReceiptConfig.value, ext),
    sendVideoMessage: (file, duration, ext) => sendVideoMessage(file, duration, groupReadReceiptConfig.value, ext),
    sendLocationMessage: (body, ext) => sendLocationMessage(body.latitude, body.longitude, body.address, ext),
  },
  getUserDisplayName,
  getUserAvatar,
})

/** 会话列表最新一条消息文案解析器 */
const lastMessageTextResolver = computed(() => props.config?.lastMessageTextResolver)

/**
 * 当前会话最新一条消息的摘要快照（computed 驱动）。
 *
 * 依赖面 = 最新消息 + 发送者资料（联系人备注 / 用户资料昵称）+ 资料加载状态：
 * 发送者资料异步加载完成（如点击会话后 fetchUserInfos 返回）时，
 * computed 会自动重算，watch 随之重新写入会话 store；senderReady 为 false
 * 时跳过写入，保证摘要不会闪动到 userId 中间态。
 */
const { t } = useLocale()
const lastMessageSummary = computed(() => {
  const lastMsg = messages.value[messages.value.length - 1]
  const cvs = currentConversation.value
  if (!lastMsg || !cvs || lastMsg.conversationId !== cvs.id)
    return null
  const isGroup = cvs.type === CONVERSATION_TYPE.GROUPCHAT
  const from = lastMsg.from || ''
  // 群聊摘要统一拼接 "发送者: 消息" 前缀（与同步数据 conversation-adapter 的
  // formatConversationPreview 规则一致），避免点击进入会话后摘要样式割裂。
  // 发送者名用共享解析链路（备注 > 资料昵称 > 消息 ext 快照 > userId）：
  // 历史消息场景资料可能未加载完成，ext 快照兜底避免前缀退化为 userId。
  const senderName = isGroup ? resolveSenderDisplayName(stores, lastMsg) : undefined
  // 发送者资料加载中且只能兜底 userId 时标记未就绪：推迟写入摘要
  // （保持进入会话前的昵称展示），待资料就绪后直接刷新为最终态，
  // 避免 "userId → 昵称" 的闪动过程。
  const senderReady = !isGroup || senderName !== from || !stores.userInfo.isLoading(from)
  return {
    id: lastMsg.msgServerId || lastMsg.msgLocalId,
    text: resolveLastMessageText(lastMsg, lastMessageTextResolver.value, senderName, t('message.recalledPreview'), chineseMessagePreviewLabels),
    timestamp: lastMsg.timestamp,
    senderReady,
  }
})

/**
 * 摘要发送者资料预拉：群聊摘要解析不到昵称时主动拉取资料。
 * 与 useUserInfo 相同的守卫（已缓存 / 加载中 / 失败均跳过），
 * 资料就绪后 lastMessageSummary 重算，摘要直接以昵称落盘，无中间态。
 */
watchEffect(() => {
  const lastMsg = messages.value[messages.value.length - 1]
  const cvs = currentConversation.value
  if (!lastMsg || !cvs || cvs.type !== CONVERSATION_TYPE.GROUPCHAT)
    return
  const from = lastMsg.from || ''
  if (!from)
    return
  if (
    stores.userInfo.getUserInfo(from)
    || stores.userInfo.isLoading(from)
    || stores.userInfo.isFetchFailed(from)
  ) {
    return
  }
  void domains.userInfo.fetchUserInfos([from])
})

/** 上一次写入的摘要指纹（id|text|timestamp），内容未变时不重复写入 */
const lastSummaryFingerprint = ref('')

/** 摘要快照变化时，自动更新会话列表的 lastMessageText */
watch(lastMessageSummary, (summary) => {
  if (!summary?.id || !summary.senderReady)
    return
  const cvs = currentConversation.value
  if (!cvs)
    return
  const fingerprint = `${summary.id}|${summary.text}|${summary.timestamp || ''}`
  if (fingerprint === lastSummaryFingerprint.value)
    return
  lastSummaryFingerprint.value = fingerprint
  const patch: Partial<Conversation> = {
    lastMessageText: summary.text,
  }
  // lastMessageTime 仅单调递增更新：本地消息 timestamp 与服务端 lastMessageAt 存在
  // 时钟偏差时，无条件覆盖会让进入会话瞬间列表按本地时间重排（会话项跳动）。
  if (summary.timestamp && (!cvs.lastMessageTime || summary.timestamp > cvs.lastMessageTime)) {
    patch.lastMessageTime = summary.timestamp
  }
  stores.conversation.updateConversation(cvs.id, patch)
})

/** 组件卸载时清理残留状态 */
onUnmounted(() => {
  exitMultiSelectMode()
  exitEditMode()
  clearQuote()
})

/**
 * 键盘高度变化后再滚动消息列表到底部：
 * @focus 触发时键盘动画尚未完成，立即滚动仍会被键盘遮挡，
 * 等 keyboardHeight 更新（动画推进/完成）后 nextTick 滚动才能保证最新消息可见。
 */
watch(h5.keyboardHeight, async () => {
  await nextTick()
  messageListRef.value?.scrollToBottom?.()
})
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
  logger.error('[Chat] render error captured:', err, info)
  return false
})

/** 清除错误状态 */
function clearRenderError() {
  renderError.value = null
}

/** 向后代组件提供 textMessage 配置（链接识别 & 拦截器） */
provide(INJECTION_KEY.TEXT_MESSAGE_CONFIG, computed(() => props.config?.textMessage))

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
  if (!message || message.type !== MESSAGE_TYPE.TEXT)
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
const headerAlign = computed(() => headerConfig.value?.align ?? HEADER_ALIGN.CENTER)

/** 是否显示 header 头像 */
const showHeaderAvatar = computed(() => headerConfig.value?.showAvatar ?? false)

/** 是否显示 header 抽屉入口按钮，默认 true */
const showDrawerEntry = computed(() => headerConfig.value?.showDrawerEntry !== false)

/** 点击 header（标题/副标题区域）是否展开会话详情抽屉，默认 true */
const headerClickOpenDrawer = computed(() => headerConfig.value?.clickOpenDrawer !== false)

/** 是否显示 header 搜索消息按钮，默认 false（搜索入口归口会话详情抽屉，可选开启） */
const showHeaderSearchEntry = computed(() => headerConfig.value?.showSearchEntry === true)

/** 抽屉展示模式：push 占位挤压聊天区（默认）/ overlay 完全遮挡 */
const drawerMode = computed(() => props.config?.drawer?.mode ?? 'push')

/** 抽屉宽度（px），默认 320 */
const drawerWidth = computed(() => props.config?.drawer?.width ?? 320)

/** 点击抽屉外部（聊天区 / 空白处）是否自动关闭抽屉，默认 true；仅 push 模式生效 */
const drawerCloseOnClickOutside = computed(() => props.config?.drawer?.closeOnClickOutside ?? true)

/** 抽屉预览区点击头像是否打开用户名片，默认 true */
const drawerAvatarClickViewProfile = computed(() => props.config?.drawer?.avatarClickViewProfile !== false)

/** 移动端窄屏（viewport < 768）：抽屉一律回落满铺全屏（独立页面观感） */
const isMobileView = h5.isMobile

/** 是否启用消息搜索入口 */
const searchEnabled = computed(() => props.config?.messageList?.search?.enabled === true)

/** 是否显示 drawer */
const showDrawer = ref(false)

/** 打开抽屉 */
function openDrawer() {
  showDrawer.value = true
}

/** 关闭抽屉 */
function closeDrawer() {
  showDrawer.value = false
}

const slots = useSlots()

/** 过滤出 drawer-* 前缀的 section 插槽，透传给 ChatInfoDrawer（useSlots 返回非响应式对象，无需 computed） */
function getDrawerSectionSlots() {
  const result: Record<string, any> = {}
  for (const name of Object.keys(slots)) {
    if (name.startsWith('drawer-')) {
      result[name] = slots[name]
    }
  }
  return result
}

/** 是否显示消息搜索弹窗 */
const showSearchPanel = ref(false)

/** 群信息抽屉组件引用 */
const chatInfoDrawerRef = ref<InstanceType<typeof ChatInfoDrawer>>()

/** 是否显示添加成员弹窗 */
const showInviteModal = ref(false)

/** 单聊抽屉「添加」：发起群聊弹窗（预选对方为初始成员） */
const showCreateGroupModal = ref(false)
const createGroupInitialIds = ref<string[]>([])

function onDrawerCreateGroup(userId: string) {
  createGroupInitialIds.value = userId ? [userId] : []
  showCreateGroupModal.value = true
}

/** 当前添加成员对应的群 ID */
const inviteGroupId = ref('')

/** 添加成员弹窗关闭句柄（#invite-member 插槽 scope；open 复用 onAddMember） */
function closeInviteModal() {
  showInviteModal.value = false
}
/** 消息搜索弹窗开关句柄（#message-search 插槽 scope） */
function openSearchPanel() {
  showSearchPanel.value = true
}
function closeSearchPanel() {
  showSearchPanel.value = false
}

/** 是否显示移除成员二次确认 */
const showRemoveConfirmModal = ref(false)

/** 待移除成员 */
const pendingRemoveMember = ref<UiGroupMember | null>(null)

/** 是否显示用户名片弹窗 */
const showUserCardModal = ref(false)

/** 用户名片弹窗展示的用户 ID */
const userCardUserId = ref('')

/** 用户名片弹层的锚定触发元素（头像等），为空时居中弹窗 */
const userCardAnchor = ref<HTMLElement>()

/** header 头像容器元素（单聊时作为名片弹层锚点） */
const headerAvatarRef = ref<HTMLElement>()

/** 是否显示群名片弹窗 */
const showGroupCardModal = ref(false)
/** 群名片弹窗展示的群 ID */
const groupCardGroupId = ref('')

/** 用户名片弹窗开关句柄（#user-card 插槽 scope） */
function openUserCardModal() {
  showUserCardModal.value = true
}
function closeUserCardModal() {
  showUserCardModal.value = false
}
/** 群名片弹窗开关句柄（#group-card 插槽 scope） */
function openGroupCardModal() {
  showGroupCardModal.value = true
}
function closeGroupCardModal() {
  showGroupCardModal.value = false
}

/** 当前登录用户 ID */
const currentUserId = computed(() => client.value.currentUserId ?? '')
const headerRef = ref<HTMLElement>()

/** Header 实际高度 */
const headerHeight = ref(0)

/** 当前会话对方用户 ID（仅单聊） */
const peerUserId = computed(() =>
  currentConversation.value?.type === CONVERSATION_TYPE.SINGLECHAT ? currentConversation.value.id : undefined,
)
const { userInfo, avatarUrl, contact } = useUserInfo(peerUserId, ['nickname', 'avatarUrl', 'sign'])

/** 顶部标题：群聊用会话名；单聊按 备注 > 资料昵称 > 会话名 > ID */
const headerTitle = computed(() => {
  if (!currentConversation.value)
    return t('chat.title')
  if (currentConversation.value.type === CONVERSATION_TYPE.GROUPCHAT)
    return currentConversation.value.name || t('chat.title')
  return (
    contact.value?.remark
    || userInfo.value?.nickname
    || currentConversation.value.name
    || currentConversation.value.id
    || t('chat.title')
  )
})

/** 当前会话类型 */
const conversationType = computed(() => currentConversation.value?.type)

/** 是否是群聊 */
const isGroupChat = computed(() => conversationType.value === CONVERSATION_TYPE.GROUPCHAT)

/** 当前单聊会话对方是否正在输入 */
const isPeerTyping = computed(() => {
  if (!currentConversation.value || isGroupChat.value)
    return false
  return !!stores.conversation.typingMap[currentConversation.value.id]
})

/** 单聊副标题档位（默认 'auto'；仅单聊生效） */
const subtitleMode = computed(() => headerConfig.value?.subtitle ?? 'auto')

/** 是否展示副标题区（none 档连「正在输入」一起关闭；群聊无副标题区） */
const showSubtitleArea = computed(() => !!peerUserId.value && subtitleMode.value !== 'none')

/** 当前档位是否需要在线状态数据（auto / presence） */
const subtitleNeedsPresence = computed(() =>
  showSubtitleArea.value && (subtitleMode.value === 'auto' || subtitleMode.value === 'presence'),
)

const presence = usePresence()

/** 订阅/退订对方在线状态（跟随会话切换与档位变化；组件销毁时自动退订） */
presence.watch(computed(() =>
  subtitleNeedsPresence.value && peerUserId.value ? [peerUserId.value] : [],
))

/** 对方在线状态（响应式） */
const peerPresence = computed(() =>
  subtitleNeedsPresence.value && peerUserId.value ? presence.get(peerUserId.value).value : undefined,
)

/** 在线状态展示文本：custom 状态优先展示自定义描述 */
const presenceText = computed(() => {
  const p = peerPresence.value
  if (!p)
    return ''
  if (p.status === 'custom')
    return p.ext || t('presence.custom', '自定义')
  return t(`presence.${p.status}`)
})

/** 对方个性签名 */
const peerSign = computed(() => userInfo.value?.sign || '')

/** 是否展示在线状态段 */
const showPresenceText = computed(() => subtitleNeedsPresence.value && !!presenceText.value)

/** 是否展示签名段（auto / sign 档且有签名） */
const showSignText = computed(() =>
  showSubtitleArea.value && (subtitleMode.value === 'auto' || subtitleMode.value === 'sign') && !!peerSign.value,
)

/** 顶部头像：单聊优先取用户资料头像 */
const headerAvatar = computed(() => {
  if (currentConversation.value?.type === CONVERSATION_TYPE.GROUPCHAT)
    return currentConversation.value.avatar
  return avatarUrl.value || currentConversation.value?.avatar
})

// useResizeObserver 内部 watch ref：header 在未选会话时不渲染（v-if），
// 元素后续挂载也会自动接上观测，避免 onMounted 一次性绑定导致 headerHeight 恒为 0
useResizeObserver(headerRef, (entries) => {
  for (const entry of entries) {
    const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height
    headerHeight.value = h
  }
})

/** 是否显示群成员数后缀 */
const showHeaderMemberCount = computed(() => headerConfig.value?.showMemberCount ?? true)

/** 当前群成员数（从 group store 读取） */
const groupMemberCount = computed(() => {
  if (!isGroupChat.value || !currentConversation.value)
    return undefined
  return stores.group.getGroupById(currentConversation.value.id)?.memberCount
})

/** 当前群是否全员禁言（仅对普通成员生效，群主/管理员不受影响） */
const isMutedAll = computed(() => {
  if (!isGroupChat.value || !currentConversation.value)
    return false
  const group = stores.group.getGroupById(currentConversation.value.id)
  if (group?.mute !== true)
    return false
  // 全员禁言不作用于群主和管理员
  const role = group?.role
  return role !== GROUP_MEMBER_ROLE.OWNER && role !== GROUP_MEMBER_ROLE.ADMIN
})

/** 群聊 @提及成员列表：走用户属性展示链（备注 > 用户资料昵称 > 群成员昵称 > ID） */
const mentionContacts = computed<MentionContact[]>(() => {
  if (!isGroupChat.value || !currentConversation.value)
    return []
  return stores.group
    .getGroupMembers(currentConversation.value.id)
    .filter(m => m.userId !== currentUserId.value)
    .map((m) => {
      const contact = stores.contact.getContact(m.userId)
      const userInfo = stores.userInfo.getUserInfo(m.userId)
      const displayName = contact?.remark || userInfo?.nickname || m.nickname || m.userId
      return {
        userId: m.userId,
        name: displayName,
        avatar: userInfo?.avatarUrl || contact?.avatar || m.avatarUrl,
        remark: contact?.remark,
      }
    })
})

/** 切换到群聊会话时，预拉群详情、成员列表与公告 */
watch(
  () => currentConversation.value,
  async (cvs) => {
    if (cvs?.type !== CONVERSATION_TYPE.GROUPCHAT || !cvs.id)
      return
    // 先拉群详情，确保 memberCount 可用于群已读回执开关判断
    const group = stores.group.getGroupById(cvs.id)
    if (!group?.memberCount) {
      try {
        await fetchGroupInfo(cvs.id)
      }
      catch (err) {
        logger.warn('[Chat] preload group info failed:', formatSdkError(err))
      }
    }
    // 再拉成员列表（用于 @提及 与群已读详情弹窗）
    const members = stores.group.getGroupMembers(cvs.id)
    if (members.length === 0) {
      try {
        await fetchGroupMembers(cvs.id)
      }
      catch (err) {
        logger.warn('[Chat] preload group members for mention failed:', formatSdkError(err))
      }
    }
    // 预拉群公告，使聊天页面顶部横幅无需打开抽屉即可展示。
    // 用 undefined 区分“未获取”与“已获取但为空”，避免空公告每次切换会话都重复请求。
    const announcement = stores.group.getGroupAnnouncement(cvs.id)
    if (announcement === undefined) {
      try {
        await fetchGroupAnnouncement(cvs.id)
      }
      catch (err) {
        logger.warn('[Chat] preload group announcement failed:', formatSdkError(err))
      }
    }
  },
  { immediate: true },
)

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
    logger.warn('[Chat] @me message not in loaded history, scroll up to load more:', firstAtMeMsgId)
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

  // 会话级内存淘汰（opt-in）：标记当前会话为最近使用，保护其不被淘汰
  stores.message.touchConversation(cvs.id)

  // 会话切换：退出多选模式，避免多选栏跨会话残留
  exitMultiSelectMode()

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

  // 拉取服务端置顶消息列表（失败不阻断会话进入）
  fetchPinnedMessages().catch((err: unknown) => {
    logger.warn('[Chat] fetchPinnedMessages failed:', formatSdkError(err))
  })

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

/** 转发弹窗关闭句柄（#forward 插槽 scope；open 复用 openForwardModal） */
function closeForwardModal() {
  showForwardModal.value = false
}

/** 待转发的消息（单条或多选） */
const pendingForwardMessages = ref<UiMessage[]>([])

/** 当前转发模式：逐条转发（FORWARD_MODE.ONE_BY_ONE）或合并转发（FORWARD_MODE.COMBINE） */
const forwardMode = ref<ForwardModeValue>(FORWARD_MODE.ONE_BY_ONE)

/** 打开转发弹窗 */
function openForwardModal(messages: UiMessage[], mode?: ForwardModeValue) {
  if (messages.length === 0)
    return
  pendingForwardMessages.value = messages
  // 显式指定模式优先；未指定时单条默认逐条转发，多条默认合并转发；
  // SDK 上报不支持合并消息（capabilities.combineMessage=false）时多条也回落逐条转发
  forwardMode.value = mode ?? (messages.length === 1 || capabilities.combineMessage === false ? FORWARD_MODE.ONE_BY_ONE : FORWARD_MODE.COMBINE)
  showForwardModal.value = true
}

/** 执行转发 */
async function onForwardConfirm(targetConversation: Conversation) {
  const messages = pendingForwardMessages.value
  if (messages.length === 0)
    return
  try {
    if (forwardMode.value === FORWARD_MODE.ONE_BY_ONE) {
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
    logger.warn('[Chat] forward messages failed:', formatSdkError(e))
    showToast(t('message.forward.failed', '转发失败'), 'error')
  }
}

/** 多选：逐条转发（每条消息单独转发） */
function onMultiSelectForwardOneByOne() {
  if (selectedMessages.value.length === 0) {
    exitMultiSelectMode()
    return
  }
  openForwardModal(selectedMessages.value, FORWARD_MODE.ONE_BY_ONE)
}

/** 多选：合并转发 */
function onMultiSelectForwardCombine() {
  if (selectedMessages.value.length === 0) {
    exitMultiSelectMode()
    return
  }
  openForwardModal(selectedMessages.value, FORWARD_MODE.COMBINE)
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

/** 退出群聊 */
async function onLeaveGroup(groupId: string) {
  try {
    await leaveGroup(groupId)
    const cvs = currentConversation.value
    if (cvs) {
      stores.conversation.deleteConversation(cvs.id)
      stores.message.clearConversationMessages(cvs.id)
    }
    showToast(t('chat.info.leaveGroupSuccess', '已退出群聊'), 'success')
  }
  catch (err) {
    logger.warn('[Chat] leave group failed:', formatSdkError(err))
    showToast(t('chat.info.leaveGroupFailed', '退出群聊失败'), 'error')
  }
}

/** 解散群聊 */
async function onDestroyGroup(groupId: string) {
  try {
    await destroyGroup(groupId)
    const cvs = currentConversation.value
    if (cvs) {
      stores.conversation.deleteConversation(cvs.id)
      stores.message.clearConversationMessages(cvs.id)
    }
    showToast(t('chat.info.destroyGroupSuccess', '群聊已解散'), 'success')
  }
  catch (err) {
    logger.warn('[Chat] destroy group failed:', formatSdkError(err))
    showToast(t('chat.info.destroyGroupFailed', '解散群聊失败'), 'error')
  }
}

/** 清空聊天记录 */
async function onClearHistory(payload: { id: string, type: ConversationTypeValue, deleteConversation?: boolean, deleteRoaming?: boolean }) {
  try {
    // deleteRoaming 仅在「删除会话」链路由用户勾选决定；纯清空保持原行为（删除漫游消息）
    const deleteRoaming = payload.deleteRoaming ?? true
    await clearChatHistory(payload.id, deleteRoaming)
    stores.message.clearConversationMessages(payload.id)
    if (payload.deleteConversation) {
      await deleteConversation(payload.id, deleteRoaming)
      // 删除会话后清空当前选中，避免右侧继续展示已删除会话
      selectConversation('')
    }
    showToast(t('chat.info.clearHistorySuccess', '聊天记录已清空'), 'success')
  }
  catch (err) {
    logger.warn('[Chat] clear history failed:', formatSdkError(err))
    showToast(t('chat.info.clearHistoryFailed', '清空聊天记录失败'), 'error')
  }
}

/** 添加成员 */
function onAddMember(groupId: string) {
  inviteGroupId.value = groupId
  showInviteModal.value = true
}

/** 邀请成员入群 */
async function onInviteMembers(userIds: string[]) {
  const groupId = inviteGroupId.value
  if (!groupId || userIds.length === 0)
    return
  try {
    await inviteUsersToGroup(groupId, userIds)
    showInviteModal.value = false
    showToast(t('group.inviteMember.success', '邀请已发送'), 'success')
    // 刷新成员列表
    chatInfoDrawerRef.value?.refreshMemberList()
  }
  catch (err) {
    logger.warn('[Chat] invite members failed:', formatSdkError(err))
    const message = String(err instanceof Error ? err.message : err)
    const isForbidden = message.toLowerCase().includes('forbidden') || message.toLowerCase().includes('access forbidden')
    showToast(
      isForbidden
        ? (t('group.inviteMember.forbidden', '当前群组不允许邀请成员'))
        : (t('group.inviteMember.failed', '邀请失败')),
      'error',
    )
  }
}

/** 点击聊天 header 头像打开名片 */
function onHeaderAvatarClick() {
  const conversation = currentConversation.value
  if (!conversation?.id)
    return
  if (conversation.type === CONVERSATION_TYPE.SINGLECHAT) {
    toggleUserCardModal(conversation.id, headerAvatarRef.value)
  }
  else if (conversation.type === CONVERSATION_TYPE.GROUPCHAT) {
    groupCardGroupId.value = conversation.id
    showGroupCardModal.value = true
  }
}

/** 点击 header（标题/副标题区域）展开会话详情抽屉；头像与右侧按钮已各自拦截，不受影响 */
function onHeaderClick() {
  if (!headerClickOpenDrawer.value || !currentConversation.value)
    return
  openDrawer()
}

/** 抽屉预览区头像点击：打开用户名片（抽屉保持打开，名片为 body 级弹层） */
function onDrawerViewProfile(userId: string, anchor?: HTMLElement) {
  toggleUserCardModal(userId, anchor)
}

/** 打开用户名片；同一用户重复点击时 toggle 关闭（锚定弹层下点头像不触发外部关闭，需在此处理） */
function toggleUserCardModal(userId: string, anchor?: HTMLElement) {
  if (showUserCardModal.value && userCardUserId.value === userId) {
    showUserCardModal.value = false
    return
  }
  userCardUserId.value = userId
  userCardAnchor.value = anchor
  showUserCardModal.value = true
}

/** 消息头像左键点击 / 右键菜单「查看资料」 */
function onAvatarViewProfile(userId: string, anchor?: HTMLElement) {
  toggleUserCardModal(userId, anchor)
}

/** 右键头像：@ 提及 */
function onAvatarMention(payload: { userId: string, name: string }) {
  const contact: MentionContact = {
    userId: payload.userId,
    name: payload.name,
  }
  messageInputRef.value?.appendMention?.(contact)
}

/**
 * 消息搜索定位：全局搜索可能命中其它会话的消息，需先切换会话并等消息加载后再定位
 */
function onSearchLocate(payload: { msgId: string, conversationId: string }) {
  const { msgId, conversationId } = payload
  if (!conversationId || conversationId === currentConversation.value?.id) {
    requestLocate(msgId)
    return
  }
  const cvs = stores.conversation.conversationList.find(c => c.id === conversationId)
  if (!cvs) {
    showToast(t('message.search.cvsNotLoaded') ?? '会话不存在或未加载', 'warning')
    return
  }
  selectConversation(conversationId)
  if (stores.message.getMessages(conversationId).length > 0) {
    nextTick(() => requestLocate(msgId))
    return
  }
  // 等目标会话首批消息加载完成再定位；3s 超时兜底防泄漏
  const stop = watch(
    () => stores.message.getMessages(conversationId).length,
    (len) => {
      if (len > 0) {
        stop()
        nextTick(() => requestLocate(msgId))
      }
    },
  )
  setTimeout(stop, 3000)
}

/**
 * 点击消息中的 @名字：
 * - 若未关闭 locateOnMentionClick，在消息列表内定位该用户最近一条消息（复用引用定位高亮）
 * - 同时对外转发 at-me-click，保留外部处理（查看资料/跳单聊等）的能力
 */
function onMentionClick(userId: string) {
  if (props.config?.textMessage?.locateOnMentionClick !== false) {
    locateLatestMessageByUser(userId)
  }
  emit('at-me-click', userId)
}

/** 在已加载消息中从最新往前定位该用户最近一条消息；未找到时提示 */
function locateLatestMessageByUser(userId: string) {
  const cvsId = currentConversation.value?.id
  if (!cvsId || !userId)
    return
  const messages = stores.message.getMessages(cvsId)
  const normalized = normalizeUserId(userId)
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (normalizeUserId(m.from) !== normalized)
      continue
    const target = m.msgServerId || m.msgLocalId
    if (target)
      requestLocate(target)
    return
  }
  showToast(t('message.mention.locatorNotFound') ?? '未找到该用户的消息', 'warning')
}

/** 从用户名片进入单聊 */
function onUserCardSendMessage(userId: string) {
  const existing = stores.conversation.conversationList.find(c => c.id === userId)
  if (!existing) {
    stores.conversation.addConversation({
      id: userId,
      name: userId,
      type: CONVERSATION_TYPE.SINGLECHAT,
      unreadCount: 0,
      lastMessageText: '',
      isPinned: false,
      isMuted: false,
      marks: [],
    })
  }
  selectConversation(userId)
}

/** 从群名片进入/刷新群聊 */
function onGroupCardSendMessage(groupId: string) {
  const group = stores.group.getGroupById(groupId)
  if (!group) {
    showToast(t('chat.groupCardNotJoined'), 'warning')
    return
  }
  const existing = stores.conversation.conversationList.find(c => c.id === groupId)
  if (!existing) {
    stores.conversation.addConversation({
      id: groupId,
      name: group.groupName || groupId,
      avatar: group.avatar,
      type: CONVERSATION_TYPE.GROUPCHAT,
      unreadCount: 0,
      lastMessageText: '',
      isPinned: false,
      isMuted: false,
      marks: [],
    })
  }
  selectConversation(groupId)
}

/** 与成员发起单聊 */
function onChatMember(member: UiGroupMember) {
  const existing = stores.conversation.conversationList.find(c => c.id === member.userId)
  if (!existing) {
    stores.conversation.addConversation({
      id: member.userId,
      name: member.nickname || member.userId,
      avatar: member.avatarUrl,
      type: CONVERSATION_TYPE.SINGLECHAT,
      unreadCount: 0,
      lastMessageText: '',
      isPinned: false,
      isMuted: false,
      marks: [],
    })
  }
  selectConversation(member.userId)
}

/** 移除成员 */
function onRemoveMember(member: UiGroupMember) {
  pendingRemoveMember.value = member
  showRemoveConfirmModal.value = true
}

/** 确认移除成员 */
async function confirmRemoveMember() {
  const member = pendingRemoveMember.value
  const groupId = currentConversation.value?.type === CONVERSATION_TYPE.GROUPCHAT ? currentConversation.value.id : ''
  if (!member || !groupId) {
    showRemoveConfirmModal.value = false
    return
  }
  pendingRemoveMember.value = null
  showRemoveConfirmModal.value = false
  try {
    await removeGroupMembers(groupId, [member.userId])
    showToast(t('chat.info.removeMemberSuccess', '成员已移除'), 'success')
    chatInfoDrawerRef.value?.removeMember(member.userId)
  }
  catch (err) {
    logger.warn('[Chat] remove member failed:', formatSdkError(err))
    showToast(t('chat.info.removeMemberFailed', '移除成员失败'), 'error')
  }
}

function cancelRemoveMember() {
  pendingRemoveMember.value = null
  showRemoveConfirmModal.value = false
}

/** 设为/取消管理员：二次确认 */
const showAdminConfirmModal = ref(false)
const pendingAdminAction = ref<{ member: UiGroupMember, action: 'set' | 'remove' } | null>(null)

/** 设为管理员 */
function onSetAdmin(member: UiGroupMember) {
  pendingAdminAction.value = { member, action: 'set' }
  showAdminConfirmModal.value = true
}

/** 取消管理员 */
function onRemoveAdmin(member: UiGroupMember) {
  pendingAdminAction.value = { member, action: 'remove' }
  showAdminConfirmModal.value = true
}

async function confirmAdminAction() {
  const pending = pendingAdminAction.value
  pendingAdminAction.value = null
  showAdminConfirmModal.value = false
  if (!pending)
    return
  if (pending.action === 'set')
    await doSetAdmin(pending.member)
  else
    await doRemoveAdmin(pending.member)
}

function cancelAdminAction() {
  pendingAdminAction.value = null
  showAdminConfirmModal.value = false
}

async function doSetAdmin(member: UiGroupMember) {
  const groupId = currentConversation.value?.type === CONVERSATION_TYPE.GROUPCHAT ? currentConversation.value.id : ''
  if (!groupId)
    return
  try {
    await addGroupAdmin(groupId, member.userId)
    chatInfoDrawerRef.value?.setMemberRole(member.userId, GROUP_MEMBER_ROLE.ADMIN)
    // 发布方本地插入灰色通知：SDK 的 onAdminAdded 事件不回推操作者本人，与接收方文案保持一致
    const name = member.nickname || member.userId
    insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
      eventType: NOTICE_EVENT_TYPE.ADMIN_ADDED,
      params: { name, userId: member.userId },
      defaultText: t('chat.notice.adminAdded').replace('{name}', name),
    })
    showToast(t('chat.info.setAdminSuccess', '已设为管理员'), 'success')
  }
  catch (err) {
    logger.warn('[Chat] set admin failed:', formatSdkError(err))
    showToast(t('chat.info.setAdminFailed', '设置管理员失败'), 'error')
  }
}

/** 取消管理员 */
async function doRemoveAdmin(member: UiGroupMember) {
  const groupId = currentConversation.value?.type === CONVERSATION_TYPE.GROUPCHAT ? currentConversation.value.id : ''
  if (!groupId)
    return
  try {
    await removeGroupAdmin(groupId, member.userId)
    chatInfoDrawerRef.value?.setMemberRole(member.userId, GROUP_MEMBER_ROLE.MEMBER)
    // 发布方本地插入灰色通知：SDK 的 onAdminRemoved 事件不回推操作者本人，与接收方文案保持一致
    const name = member.nickname || member.userId
    insertChatNotice(stores, groupId, CONVERSATION_TYPE.GROUPCHAT, {
      eventType: NOTICE_EVENT_TYPE.ADMIN_REMOVED,
      params: { name, userId: member.userId },
      defaultText: t('chat.notice.adminRemoved').replace('{name}', name),
    })
    showToast(t('chat.info.removeAdminSuccess', '已取消管理员'), 'success')
  }
  catch (err) {
    logger.warn('[Chat] remove admin failed:', formatSdkError(err))
    showToast(t('chat.info.removeAdminFailed', '取消管理员失败'), 'error')
  }
}
</script>

<template>
  <div class="chat" :class="[props.class, { 'chat--drawer-push': drawerMode === 'push' }]" :style="props.style">
    <!-- 全局加载状态 -->
    <div v-if="props.loading" class="chat__loading">
      <slot name="loading">
        <span class="chat__loading-text">{{ t('conversation.loadingMore', '加载中...') }}</span>
      </slot>
    </div>

    <!-- 错误边界：子组件渲染错误时显示降级 UI -->
    <div v-else-if="renderError" class="chat__error">
      <slot name="error" :error="renderError">
        <div class="chat__error-content">
          <Icon name="triangle/exclamation" :size="48" type="warning" class="chat__error-icon" />
          <span class="chat__error-text">{{ renderError.message }}</span>
          <button class="chat__error-retry" @click="clearRenderError">
            {{ t('button.confirm', '重试') }}
          </button>
        </div>
      </slot>
    </div>

    <!-- 空状态：无当前会话 -->
    <div v-else-if="!currentConversation" class="chat__empty">
      <Empty
        icon="bubble/rect/2"
        :description="t('chat.empty', '选择一个会话')"
        size="large"
      >
        <template #description>
          <slot name="empty">
            {{ t('chat.empty', '选择一个会话') }}
          </slot>
        </template>
      </Empty>
    </div>

    <template v-else>
      <!-- 主区 + 抽屉位：push 抽屉模式下为横向 flex，抽屉占位挤压主区 -->
      <div class="chat__body" :class="{ 'chat__body--drawer-push': drawerMode === 'push' }">
        <div class="chat__main">
          <!-- Header -->
          <div
            v-if="showHeader"
            ref="headerRef"
            class="chat__header"
            :class="{
              'chat__header--align-left': headerAlign === HEADER_ALIGN.LEFT,
              'chat__header--align-center': headerAlign === HEADER_ALIGN.CENTER,
              'chat__header--align-right': headerAlign === HEADER_ALIGN.RIGHT,
              'chat__header--clickable': headerClickOpenDrawer && currentConversation,
            }"
            @click="onHeaderClick"
          >
            <slot name="header" :conversation="currentConversation">
              <!-- 头像区域（点击打开名片，阻止冒泡避免触发 header 展开抽屉） -->
              <div v-if="showHeaderAvatar && currentConversation" ref="headerAvatarRef" class="chat__header-avatar" @click.stop>
                <slot name="header-avatar" :conversation="currentConversation">
                  <Avatar
                    :src="headerAvatar"
                    :name="headerTitle"
                    :size="40"
                    @click="onHeaderAvatarClick"
                  />
                  <!-- 群聊会话：头像右下角群组标识（设计稿 Group Status 角标） -->
                  <span v-if="isGroupChat" class="chat__header-avatar-group-badge" aria-hidden="true">
                    <Icon name="filled/shield" :size="8" />
                  </span>
                </slot>
              </div>
              <div class="chat__header-main">
                <div class="chat__header-title-row">
                  <slot name="header-title" :conversation="currentConversation">
                    <span class="chat__title">{{ headerTitle }}</span>
                    <span
                      v-if="isGroupChat && showHeaderMemberCount && groupMemberCount != null"
                      class="chat__header-member-count"
                    >({{ groupMemberCount }})</span>
                  </slot>
                </div>
                <!-- 副标题区（仅单聊）：正在输入 > 在线状态 + 个性签名；可被 #header-subtitle 整体接管 -->
                <slot
                  name="header-subtitle"
                  :conversation="currentConversation"
                  :typing="isPeerTyping"
                  :presence="peerPresence"
                  :sign="peerSign"
                >
                  <div
                    v-if="showSubtitleArea && (isPeerTyping || showPresenceText || showSignText)"
                    class="chat__header-subtitle"
                  >
                    <span v-if="isPeerTyping" class="chat__typing">
                      <span class="typing-dots" aria-hidden="true">
                        <span class="typing-dots__dot" />
                        <span class="typing-dots__dot" />
                        <span class="typing-dots__dot" />
                      </span>
                      <span>{{ t('chat.typing', '对方正在输入...') }}</span>
                    </span>
                    <template v-else>
                      <span v-if="showPresenceText" class="chat__header-subtitle-presence">{{ presenceText }}</span>
                      <span v-if="showPresenceText && showSignText" class="chat__header-subtitle-sep">·</span>
                      <span v-if="showSignText" class="chat__header-subtitle-sign">{{ peerSign }}</span>
                    </template>
                  </div>
                </slot>
                <slot name="header-extra" :conversation="currentConversation" />
              </div>
              <IconButton
                v-if="searchEnabled && showHeaderSearchEntry"
                icon="search"
                :icon-size="22"
                @click.stop="showSearchPanel = true"
              />
              <IconButton
                v-if="showDrawerEntry && currentConversation"
                icon="vertical"
                :icon-size="22"
                @click.stop="openDrawer"
              />
            </slot>
          </div>

          <!-- 置顶横幅 -->
          <PinnedBar
            v-if="showPinnedBar && currentConversation"
            :max-preview-length="pinnedBarMaxLength"
            @locate="onPinnedLocate"
          />

          <!-- 群公告横幅 -->
          <GroupAnnouncementBanner
            v-if="isGroupChat && currentConversation"
            :group-id="currentConversation.id"
          />

          <!-- 消息列表 -->
          <MessageList
            ref="messageListRef"
            :config="props.config"
            @reedit="onReedit"
            @edit="onEdit"
            @forward="openForwardModal"
            @recall-failed="(err, msg) => emit('recall-failed', err, msg)"
            @mention-click="onMentionClick"
            @location-click="(body, msg) => emit('location-click', body, msg)"
            @custom-message-action="(action, payload, msg) => emit('custom-message-action', action, payload, msg)"
            @avatar-view-profile="onAvatarViewProfile"
            @avatar-click="onAvatarViewProfile"
            @avatar-mention="onAvatarMention"
          >
            <!-- 透传消息类型级插槽（如 #message-custom）到消息渲染链 -->
            <template
              v-for="(_, name) in $slots"
              :key="name"
              #[name]="slotProps"
            >
              <slot :name="name" v-bind="slotProps" />
            </template>
          </MessageList>

          <!-- 多选模式底部操作栏（#multi-select-bar：完全接管多选操作栏渲染） -->
          <slot
            name="multi-select-bar"
            :visible="isMultiSelectMode"
            :selected-messages="selectedMessages"
            :total-messages="messages.length"
            :select-all="() => selectAllMessages(messages)"
            :deselect-all="deselectAllMessages"
            :forward-one-by-one="onMultiSelectForwardOneByOne"
            :forward-combine="onMultiSelectForwardCombine"
            :delete="onMultiSelectDelete"
            :close="exitMultiSelectMode"
          >
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
          </slot>

          <!-- 输入框 -->
          <MessageInput
            v-if="!isMultiSelectMode"
            ref="messageInputRef"
            :config="props.config"
            :is-group="isGroupChat"
            :muted="isMutedAll"
            :keyboard-height="h5.keyboardHeight.value"
            :mention-contacts="mentionContacts"
            @send-success="handleSendSuccess"
            @focus="messageListRef?.scrollToBottom()"
            @translation-click="emit('translation-click')"
            @contact-card-click="emit('contact-card-click')"
          >
            <template #toolbar-extra="slotProps">
              <slot name="toolbar-extra" v-bind="slotProps" />
            </template>
            <template #input-panel="slotProps">
              <slot name="input-panel" v-bind="slotProps" />
            </template>
          </MessageInput>
        </div>

        <!-- 聊天信息抽屉 -->
        <slot
          name="drawer"
          :conversation="currentConversation"
          :is-group="isGroupChat"
          :show="showDrawer"
          :open="openDrawer"
          :close="closeDrawer"
          :offset-top="headerHeight"
          :mode="drawerMode"
          :fullscreen="isMobileView"
        >
          <ChatInfoDrawer
            ref="chatInfoDrawerRef"
            v-model:show="showDrawer"
            :conversation="currentConversation"
            :is-group="isGroupChat"
            :offset-top="headerHeight"
            :mode="drawerMode"
            :width="drawerWidth"
            :fullscreen="isMobileView"
            :close-on-click-outside="drawerCloseOnClickOutside"
            :group-management-display-mode="props.config?.groupManagement?.displayMode"
            :allow-chat="props.config?.groupMember?.allowChat"
            :show-mute-all="props.config?.groupManagement?.showMuteAll"
            :show-mute-list="props.config?.groupManagement?.showMuteList"
            :show-blocklist="props.config?.groupManagement?.showBlocklist"
            :show-allowlist="props.config?.groupManagement?.showAllowlist"
            :show-shared-files="props.config?.groupManagement?.showSharedFiles"
            :show-join-requests="props.config?.groupManagement?.showJoinRequests"
            :show-message-search="searchEnabled"
            :avatar-click-view-profile="drawerAvatarClickViewProfile"
            @leave-group="onLeaveGroup"
            @destroy-group="onDestroyGroup"
            @clear-history="onClearHistory"
            @add-member="onAddMember"
            @search-message="openSearchPanel"
            @create-group="onDrawerCreateGroup"
            @view-profile="onDrawerViewProfile"
            @group-operation="emit('group-operation', $event)"
            @chat-member="onChatMember"
            @remove-member="onRemoveMember"
            @set-admin="onSetAdmin"
            @remove-admin="onRemoveAdmin"
          >
            <template
              v-for="(_, name) in getDrawerSectionSlots()"
              :key="name"
              #[name]="slotProps"
            >
              <slot :name="name" v-bind="slotProps" />
            </template>
          </ChatInfoDrawer>
        </slot>
      </div>

      <!-- 消息搜索弹窗（居中 Modal，自带 Popup 壳；#message-search：完全接管搜索弹窗渲染） -->
      <slot
        name="message-search"
        :show="showSearchPanel"
        :config="props.config?.messageList?.search"
        :locate="onSearchLocate"
        :open="openSearchPanel"
        :close="closeSearchPanel"
      >
        <MessageSearchModal
          v-if="searchEnabled"
          v-model:show="showSearchPanel"
          :config="props.config?.messageList?.search"
          @locate="onSearchLocate"
          @close="showSearchPanel = false"
        />
      </slot>

      <!-- 移除成员二次确认 -->
      <Modal
        v-model:show="showRemoveConfirmModal"
        :title="t('group.memberList.removeConfirmTitle')"
        :width="719"
        type="warning"
        :confirm-text="t('button.confirm')"
        :cancel-text="t('button.cancel')"
        @confirm="confirmRemoveMember"
        @cancel="cancelRemoveMember"
      >
        <template v-if="pendingRemoveMember">
          {{ t('group.memberList.removeConfirmPrefix') }} {{ pendingRemoveMember.nickname || pendingRemoveMember.userId }} {{ t('group.memberList.removeConfirmSuffix') }}
        </template>
      </Modal>

      <!-- 设为/取消管理员二次确认 -->
      <Modal
        v-model:show="showAdminConfirmModal"
        :title="pendingAdminAction?.action === 'remove' ? t('chat.info.removeAdminConfirmTitle') : t('chat.info.setAdminConfirmTitle')"
        :width="719"
        type="warning"
        :confirm-text="t('button.confirm')"
        :cancel-text="t('button.cancel')"
        @confirm="confirmAdminAction"
        @cancel="cancelAdminAction"
      >
        <template v-if="pendingAdminAction">
          {{ pendingAdminAction.action === 'remove'
            ? t('chat.info.removeAdminConfirmContent').replace('{name}', pendingAdminAction.member.nickname || pendingAdminAction.member.userId)
            : t('chat.info.setAdminConfirmContent').replace('{name}', pendingAdminAction.member.nickname || pendingAdminAction.member.userId) }}
        </template>
      </Modal>

      <!-- 添加成员弹窗（#invite-member：完全接管入群邀请弹窗渲染） -->
      <slot
        name="invite-member"
        :show="showInviteModal"
        :group-id="inviteGroupId"
        :existing-member-ids="stores.group.getGroupMembers(inviteGroupId).map(m => m.userId)"
        :open="onAddMember"
        :close="closeInviteModal"
      >
        <InviteMemberModal
          v-model:show="showInviteModal"
          :group-id="inviteGroupId"
          :existing-member-ids="stores.group.getGroupMembers(inviteGroupId).map(m => m.userId)"
          @invited="onInviteMembers"
        />
      </slot>

      <!-- 发起群聊弹窗（单聊抽屉「添加」入口，预选对方为初始成员） -->
      <CreateGroupModal
        v-model:show="showCreateGroupModal"
        :config="{ initialSelectedIds: createGroupInitialIds }"
      />

      <!-- 转发弹窗（#forward：完全接管转发弹窗渲染） -->
      <slot
        name="forward"
        :show="showForwardModal"
        :messages="pendingForwardMessages"
        :mode="forwardMode"
        :open="openForwardModal"
        :close="closeForwardModal"
      >
        <ForwardModal
          v-model:show="showForwardModal"
          @forward="onForwardConfirm"
        />
      </slot>

      <!-- 用户名片弹窗（#user-card：完全接管用户名片弹窗渲染） -->
      <slot
        name="user-card"
        :show="showUserCardModal"
        :user-id="userCardUserId"
        :anchor="userCardAnchor"
        :open="openUserCardModal"
        :close="closeUserCardModal"
      >
        <UserCardModal
          v-model:show="showUserCardModal"
          :user-id="userCardUserId"
          :anchor="userCardAnchor"
          @send-message="onUserCardSendMessage"
        />
      </slot>

      <!-- 群名片弹窗（#group-card：完全接管群名片弹窗渲染） -->
      <slot
        name="group-card"
        :show="showGroupCardModal"
        :group-id="groupCardGroupId"
        :open="openGroupCardModal"
        :close="closeGroupCardModal"
      >
        <GroupCardModal
          v-model:show="showGroupCardModal"
          :group-id="groupCardGroupId"
          @send-message="onGroupCardSendMessage"
        />
      </slot>
    </template>

    <!-- 水印覆盖层（#watermark：用户注入水印内容，铺满整个聊天区，不响应交互） -->
    <div v-if="$slots.watermark" class="chat__watermark">
      <slot name="watermark" :conversation="currentConversation" />
    </div>
  </div>
</template>

<style scoped>
.chat {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--uikit-chat-bg);
}

/* 主区 + 抽屉位：overlay 模式下为普通静态包裹（抽屉 absolute 相对 .chat 定位，视觉与历史一致）；
   push 模式下为横向 flex，抽屉作为第二 flex 项占位挤压主区 */
.chat__body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.chat__body--drawer-push {
  gap: var(--uikit-container-gap, 8px);
}

.chat__main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

/* push 抽屉模式：容器壳透明（见 chat-container--drawer-push），主区与抽屉为平级平面区域，
   无描边卡片边线，间隙（--uikit-container-gap）透出宿主底色 */
.chat--drawer-push {
  background: transparent;
}

.chat--drawer-push .chat__main {
  background: var(--uikit-chat-bg);
  border-radius: var(--uikit-components-radius, 8px);
  overflow: hidden;
}

/* 水印覆盖层：铺满聊天区，穿透事件；层级低于抽屉(200)/弹窗 */
.chat__watermark {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  overflow: hidden;
}

/* 空状态：上下左右居中 */
.chat__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 空状态图标与文案：占位色 token（浅 #E6E6E6 / 深 #4B5563），可被接入方覆盖 */
.chat__empty :deep(.uikit-empty__icon),
.chat__empty :deep(.uikit-empty__description) {
  color: var(--uikit-empty-icon-color, #E6E6E6);
}

/* 全局加载状态 */
.chat__loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat__loading-text {
  font-size: var(--uikit-font-size-14);
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
  display: inline-flex;
}

.chat__error-text {
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
  text-align: center;
  word-break: break-word;
}

.chat__error-retry {
  padding: 8px 20px;
  border-radius: var(--uikit-components-radius, 8px);
  border: none;
  background-color: var(--uikit-primary-color);
  color: var(--uikit-text-inverse);
  font-size: var(--uikit-font-size-14);
  cursor: pointer;
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .chat__error-retry:hover {
    opacity: 0.9;
  }
}

.chat__header {
  position: relative;
  z-index: 101;
  /* border-box + 固定高度：总高恒 56px，不随副标题（在线状态/签名/typing）有无而变化，
     与会话列表 header 的分隔线严格对齐 */
  box-sizing: border-box;
  height: calc(56px + var(--uikit-safe-top, 0px));
  padding: calc(var(--uikit-header-padding-y, 8px) + var(--uikit-safe-top, 0px)) 12px
    var(--uikit-header-padding-y, 8px);
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
  /* 头部图标按钮圆角 4px（IconButton 消费 --uikit-components-radius，局部覆写不影响全局） */
  --uikit-components-radius: 4px;
}

.chat__header--align-left .chat__header-main {
  justify-content: flex-start;
}

/* 点击 header 展开抽屉开启时给出可点击提示（头像/按钮区域已各自拦截） */
.chat__header--clickable {
  cursor: pointer;
}

.chat__header--align-center .chat__header-main {
  justify-content: center;
}

.chat__header--align-right .chat__header-main {
  justify-content: flex-end;
}

.chat__header-avatar {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* 群聊头像右下角群组角标：16px 橙底白边圆（含 2px 白环），内嵌 8px 白色盾牌图标 */
.chat__header-avatar-group-badge {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 16px;
  height: 16px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid var(--uikit-bg-base);
  background-color: var(--uikit-warning-color, #FFAB00);
  color: var(--uikit-text-inverse);
  pointer-events: none;
}

.chat__header-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  /* 设计稿：标题行 22px + 副标题行 18px 无间距堆叠，合计 40px 与 40px 头像等高 */
  gap: 0;
  min-width: 0;
  /* header 固定 56px：主区内容超高（如大字号缩放）时裁剪而非撑破 header */
  overflow: hidden;
}

.chat__header-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.chat__title {
  font-size: var(--uikit-font-size-18);
  font-weight: var(--uikit-font-weight-medium, 500);
  line-height: 22px;
  color: var(--uikit-text-primary, #171A1C);
}

.chat__header-member-count {
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  color: var(--uikit-text-secondary);
  white-space: nowrap;
}

.chat__typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--uikit-font-size-12);
  /* 设计师稿：正在输入低调展示，固定灰色不跟随主题色 */
  color: var(--uikit-text-secondary);
}

/* 单聊副标题区：在线状态 + 个性签名（正在输入时整行被 typing 占据） */
.chat__header-subtitle {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  font-size: var(--uikit-font-size-14);
  line-height: 18px;
  color: var(--uikit-text-secondary, #5E686E);
  white-space: nowrap;
}

.chat__header-subtitle-presence {
  flex-shrink: 0;
}

.chat__header-subtitle-sep {
  flex-shrink: 0;
}

.chat__header-subtitle-sign {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.typing-dots {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.typing-dots__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background-color: currentColor;
  animation: typing-bounce 1.4s ease-in-out infinite both;
}

.typing-dots__dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-dots__dot:nth-child(2) {
  animation-delay: 0.16s;
}

.typing-dots__dot:nth-child(3) {
  animation-delay: 0.32s;
}

@keyframes typing-bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  40% {
    transform: translateY(-3px);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .typing-dots__dot {
    animation: none;
    opacity: 1;
  }
}
</style>
