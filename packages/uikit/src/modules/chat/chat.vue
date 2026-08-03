<script setup lang="ts">
import { computed, nextTick, onErrorCaptured, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { formatSdkError } from '../../utils/sdk-error'
import { useChat } from '../../composables/use-chat'
import { useUIKit } from '../../composables/use-uikit'
import { useConversation } from '../../composables/use-conversation'
import { useQuote } from '../../composables/use-quote'
import { useLocale } from '../../locale'
import { useToast } from '../../composables/use-toast'
import { useUserInfo } from '../../composables/use-user-info'
import { useGroup } from '../../composables/use-group'
import { provideChatPluginContext } from '../../composables/use-chat-plugin'
import { resolveLastMessageText } from '../../utils/resolve-last-message-text'
import { CONVERSATION_TYPE } from '../../constants'
import type { UiConversation as Conversation, LocationMessageBody, TextMessageBody, UiGroupMember, UiMessage } from '../../sdk/types'
import Icon from '../../components/icon/icon.vue'
import Avatar from '../../components/avatar/avatar.vue'
import InviteMemberModal from '../group/invite-member-modal.vue'
import Modal from '../../components/modal/modal.vue'
import UserCardModal from '../../components/user-card/user-card-modal.vue'
import GroupCardModal from '../../components/group-card/group-card-modal.vue'
import Empty from '../../components/empty/empty.vue'
import MessageList from './message-list/message-list.vue'
import MessageInput from './message-input/index.vue'
import PinnedBar from './message-list/pinned-bar.vue'
import ChatInfoDrawer from './drawer/chat-info-drawer.vue'
import ForwardModal from './forward-modal/forward-modal.vue'
import MultiSelectBar from './multi-select-bar/multi-select-bar.vue'
import type { ChatConfig, MentionContact } from './types'

/** 渲染错误信息 */
interface RenderError {
  message: string
  component?: string
}

export interface ChatProps {
  config?: ChatConfig
  /** 是否处于全局加载状态 */
  loading?: boolean
  /** 自定义根元素 class */
  class?: string
  /** 自定义根元素 style */
  style?: Record<string, string>
}

export interface ChatEmits {
  (e: 'recall-failed', error: any, message: UiMessage): void
  (e: 'at-me-click', userId: string): void
  (e: 'group-operation', payload: { type: string, groupId: string, userId?: string }): void
  (e: 'location-click', body: LocationMessageBody, message: UiMessage): void
  (e: 'custom-message-action', action: string, payload: any, message: UiMessage): void
}

const props = defineProps<ChatProps>()
const emit = defineEmits<ChatEmits>()

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
const { stores, h5, client } = useUIKit()
const { sendChannelAck, saveDraft, loadDraft, clearDraft, clearChatHistory, deleteConversation, selectConversation } = useConversation()
const { leaveGroup, destroyGroup, addGroupAdmin, removeGroupAdmin, removeGroupMembers, inviteUsersToGroup, fetchGroupMembers, fetchGroupInfo } = useGroup()
const { clearQuote, requestLocate } = useQuote()

/** 群已读回执配置：透传给 plugin 的发送方法 */
const groupReadReceiptConfig = computed(() => props.config?.groupReadReceipt)

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

/** 已解析过的最新消息 ID，避免切换会话/加载历史时重复更新 */
const lastResolvedMessageId = ref('')

/** 切换会话时重置解析状态 */
watch(
  () => currentConversation.value?.id,
  () => {
    lastResolvedMessageId.value = ''
  },
)

/** 当前会话最新消息变化时，自动更新会话列表的 lastMessageText */
watch(
  () => messages.value[messages.value.length - 1]?.msgServerId || messages.value[messages.value.length - 1]?.msgLocalId,
  (newId) => {
    if (!newId || newId === lastResolvedMessageId.value)
      return
    lastResolvedMessageId.value = newId
    const lastMsg = messages.value[messages.value.length - 1]
    const cvs = currentConversation.value
    if (!lastMsg || !cvs || lastMsg.conversationId !== cvs.id)
      return
    stores.conversation.updateConversation(cvs.id, {
      lastMessageText: resolveLastMessageText(lastMsg, lastMessageTextResolver.value),
      lastMessageTime: lastMsg.timestamp,
    })
  },
)

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
const { t } = useLocale()
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
  console.error('[Chat] render error captured:', err, info)
  return false
})

/** 清除错误状态 */
function clearRenderError() {
  renderError.value = null
}

/** 向后代组件提供 textMessage 配置（链接识别 & 拦截器） */
provide('textMessageConfig', computed(() => props.config?.textMessage))

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
  if (!message || message.type !== 'text')
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
const headerAlign = computed(() => headerConfig.value?.align ?? 'center')

/** 是否使用自定义 header 插槽 */
const customHeaderSlot = computed(() => headerConfig.value?.customSlot ?? false)

/** 是否显示 header 头像 */
const showHeaderAvatar = computed(() => headerConfig.value?.showAvatar ?? false)

/** 是否显示 drawer */
const showDrawer = ref(false)

/** 群信息抽屉组件引用 */
const chatInfoDrawerRef = ref<InstanceType<typeof ChatInfoDrawer>>()

/** 是否显示添加成员弹窗 */
const showInviteModal = ref(false)

/** 当前添加成员对应的群 ID */
const inviteGroupId = ref('')

/** 是否显示移除成员二次确认 */
const showRemoveConfirmModal = ref(false)

/** 待移除成员 */
const pendingRemoveMember = ref<UiGroupMember | null>(null)

/** 是否显示用户名片弹窗 */
const showUserCardModal = ref(false)

/** 用户名片弹窗展示的用户 ID */
const userCardUserId = ref('')

/** 是否显示群名片弹窗 */
const showGroupCardModal = ref(false)
/** 群名片弹窗展示的群 ID */
const groupCardGroupId = ref('')

/** 当前登录用户 ID */
const currentUserId = computed(() => client.value.currentUserId ?? '')
const headerRef = ref<HTMLElement>()

/** Header 实际高度 */
const headerHeight = ref(0)

/** 当前会话对方用户 ID（仅单聊） */
const peerUserId = computed(() =>
  currentConversation.value?.type === 'singleChat' ? currentConversation.value.id : undefined,
)
const { userInfo, avatarUrl, contact } = useUserInfo(peerUserId)

/** 顶部标题：群聊用会话名；单聊按 备注 > 资料昵称 > 会话名 > ID */
const headerTitle = computed(() => {
  if (!currentConversation.value)
    return t('chat.title')
  if (currentConversation.value.type === 'groupChat')
    return currentConversation.value.name || t('chat.title')
  return (
    contact.value?.remark
    || userInfo.value?.nickname
    || currentConversation.value.name
    || currentConversation.value.id
    || t('chat.title')
  )
})

/** 顶部头像：单聊优先取用户资料头像 */
const headerAvatar = computed(() => {
  if (currentConversation.value?.type === 'groupChat')
    return currentConversation.value.avatar
  return avatarUrl.value || currentConversation.value?.avatar
})

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (headerRef.value) {
    headerHeight.value = headerRef.value.offsetHeight
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height
        headerHeight.value = h
      }
    })
    resizeObserver.observe(headerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

/** 当前会话类型 */
const conversationType = computed(() => currentConversation.value?.type)

/** 是否是群聊 */
const isGroupChat = computed(() => conversationType.value === CONVERSATION_TYPE.GROUPCHAT)

/** 当前群是否全员禁言（仅对普通成员生效，群主/管理员不受影响） */
const isMutedAll = computed(() => {
  if (!isGroupChat.value || !currentConversation.value)
    return false
  const group = stores.group.getGroupById(currentConversation.value.id)
  if (group?.mute !== true)
    return false
  // 全员禁言不作用于群主和管理员
  const role = group?.role
  return role !== 'owner' && role !== 'admin'
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

/** 切换到群聊会话时，预拉群详情与成员列表 */
watch(
  () => currentConversation.value,
  async (cvs) => {
    if (cvs?.type !== 'groupChat' || !cvs.id)
      return
    // 先拉群详情，确保 memberCount 可用于群已读回执开关判断
    const group = stores.group.getGroupById(cvs.id)
    if (!group?.memberCount) {
      try {
        await fetchGroupInfo(cvs.id)
      }
      catch (err) {
        console.warn('[Chat] preload group info failed:', formatSdkError(err))
      }
    }
    // 再拉成员列表（用于 @提及 与群已读详情弹窗）
    const members = stores.group.getGroupMembers(cvs.id)
    if (members.length > 0)
      return
    try {
      await fetchGroupMembers(cvs.id)
    }
    catch (err) {
      console.warn('[Chat] preload group members for mention failed:', formatSdkError(err))
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
    console.warn('[Chat] @me message not in loaded history, scroll up to load more:', firstAtMeMsgId)
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

  // 拉取服务端置顶消息列表
  fetchPinnedMessages()

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

/** 待转发的消息（单条或多选） */
const pendingForwardMessages = ref<UiMessage[]>([])

/** 当前转发模式：'oneByOne' 逐条转发 | 'combine' 合并转发 */
const forwardMode = ref<'oneByOne' | 'combine'>('oneByOne')

/** 打开转发弹窗 */
function openForwardModal(messages: UiMessage[], mode?: 'oneByOne' | 'combine') {
  if (messages.length === 0)
    return
  pendingForwardMessages.value = messages
  // 显式指定模式优先；未指定时单条默认逐条转发，多条默认合并转发
  forwardMode.value = mode ?? (messages.length === 1 ? 'oneByOne' : 'combine')
  showForwardModal.value = true
}

/** 执行转发 */
async function onForwardConfirm(targetConversation: Conversation) {
  const messages = pendingForwardMessages.value
  if (messages.length === 0)
    return
  try {
    if (forwardMode.value === 'oneByOne') {
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
    console.warn('[Chat] forward messages failed:', formatSdkError(e))
    showToast(t('message.forward.failed') || '转发失败')
  }
}

/** 多选：逐条转发（每条消息单独转发） */
function onMultiSelectForwardOneByOne() {
  if (selectedMessages.value.length === 0) {
    exitMultiSelectMode()
    return
  }
  openForwardModal(selectedMessages.value, 'oneByOne')
}

/** 多选：合并转发 */
function onMultiSelectForwardCombine() {
  if (selectedMessages.value.length === 0) {
    exitMultiSelectMode()
    return
  }
  openForwardModal(selectedMessages.value, 'combine')
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
    showToast(t('chat.info.leaveGroupSuccess') || '已退出群聊')
  }
  catch (err) {
    console.warn('[Chat] leave group failed:', formatSdkError(err))
    showToast(t('chat.info.leaveGroupFailed') || '退出群聊失败')
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
    showToast(t('chat.info.destroyGroupSuccess') || '群聊已解散')
  }
  catch (err) {
    console.warn('[Chat] destroy group failed:', formatSdkError(err))
    showToast(t('chat.info.destroyGroupFailed') || '解散群聊失败')
  }
}

/** 清空聊天记录 */
async function onClearHistory(payload: { id: string, type: 'singleChat' | 'groupChat', deleteConversation?: boolean }) {
  try {
    await clearChatHistory(payload.id, true)
    stores.message.clearConversationMessages(payload.id)
    if (payload.deleteConversation) {
      await deleteConversation(payload.id)
      // 删除会话后清空当前选中，避免右侧继续展示已删除会话
      selectConversation('')
    }
    showToast(t('chat.info.clearHistorySuccess') || '聊天记录已清空', 'success')
  }
  catch (err) {
    console.warn('[Chat] clear history failed:', formatSdkError(err))
    showToast(t('chat.info.clearHistoryFailed') || '清空聊天记录失败', 'error')
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
    showToast(t('group.inviteMember.success') || '邀请已发送')
    // 刷新成员列表
    chatInfoDrawerRef.value?.refreshMemberList()
  }
  catch (err) {
    console.warn('[Chat] invite members failed:', formatSdkError(err))
    const message = String(err instanceof Error ? err.message : err)
    const isForbidden = message.toLowerCase().includes('forbidden') || message.toLowerCase().includes('access forbidden')
    showToast(
      isForbidden
        ? (t('group.inviteMember.forbidden') || '当前群组不允许邀请成员')
        : (t('group.inviteMember.failed') || '邀请失败'),
    )
  }
}

/** 点击聊天 header 头像打开名片 */
function onHeaderAvatarClick() {
  const conversation = currentConversation.value
  if (!conversation?.id)
    return
  if (conversation.type === 'singleChat') {
    userCardUserId.value = conversation.id
    showUserCardModal.value = true
  }
  else if (conversation.type === 'groupChat') {
    groupCardGroupId.value = conversation.id
    showGroupCardModal.value = true
  }
}

/** 从用户名片进入单聊 */
function onUserCardSendMessage(userId: string) {
  const existing = stores.conversation.conversationList.find(c => c.id === userId)
  if (!existing) {
    stores.conversation.addConversation({
      id: userId,
      name: userId,
      type: 'singleChat',
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
  const existing = stores.conversation.conversationList.find(c => c.id === groupId)
  if (!existing) {
    stores.conversation.addConversation({
      id: groupId,
      name: groupId,
      type: 'groupChat',
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
      type: 'singleChat',
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
  const groupId = currentConversation.value?.type === 'groupChat' ? currentConversation.value.id : ''
  if (!member || !groupId) {
    showRemoveConfirmModal.value = false
    return
  }
  pendingRemoveMember.value = null
  showRemoveConfirmModal.value = false
  try {
    await removeGroupMembers(groupId, [member.userId])
    showToast(t('chat.info.removeMemberSuccess') || '成员已移除')
    chatInfoDrawerRef.value?.removeMember(member.userId)
  }
  catch (err) {
    console.warn('[Chat] remove member failed:', formatSdkError(err))
    showToast(t('chat.info.removeMemberFailed') || '移除成员失败')
  }
}

function cancelRemoveMember() {
  pendingRemoveMember.value = null
  showRemoveConfirmModal.value = false
}

/** 设为管理员 */
async function onSetAdmin(member: UiGroupMember) {
  const groupId = currentConversation.value?.type === 'groupChat' ? currentConversation.value.id : ''
  if (!groupId)
    return
  try {
    await addGroupAdmin(groupId, member.userId)
    showToast(t('chat.info.setAdminSuccess') || '已设为管理员')
    chatInfoDrawerRef.value?.setMemberRole(member.userId, 'admin')
  }
  catch (err) {
    console.warn('[Chat] set admin failed:', formatSdkError(err))
    showToast(t('chat.info.setAdminFailed') || '设置管理员失败')
  }
}

/** 取消管理员 */
async function onRemoveAdmin(member: UiGroupMember) {
  const groupId = currentConversation.value?.type === 'groupChat' ? currentConversation.value.id : ''
  if (!groupId)
    return
  try {
    await removeGroupAdmin(groupId, member.userId)
    showToast(t('chat.info.removeAdminSuccess') || '已取消管理员')
    chatInfoDrawerRef.value?.setMemberRole(member.userId, 'member')
  }
  catch (err) {
    console.warn('[Chat] remove admin failed:', formatSdkError(err))
    showToast(t('chat.info.removeAdminFailed') || '取消管理员失败')
  }
}
</script>

<template>
  <div class="chat" :class="props.class" :style="props.style">
    <!-- 全局加载状态 -->
    <div v-if="props.loading" class="chat__loading">
      <slot name="loading">
        <span class="chat__loading-text">{{ t('conversation.loadingMore') || '加载中...' }}</span>
      </slot>
    </div>

    <!-- 错误边界：子组件渲染错误时显示降级 UI -->
    <div v-else-if="renderError" class="chat__error">
      <slot name="error" :error="renderError">
        <div class="chat__error-content">
          <Icon name="status/warning" :size="48" type="warning" class="chat__error-icon" />
          <span class="chat__error-text">{{ renderError.message }}</span>
          <button class="chat__error-retry" @click="clearRenderError">
            {{ t('button.confirm') || '重试' }}
          </button>
        </div>
      </slot>
    </div>

    <!-- 空状态：无当前会话 -->
    <div v-else-if="!currentConversation" class="chat__empty">
      <Empty
        icon="empty/chat"
        :description="t('chat.empty') || '请选择会话'"
        size="large"
      >
        <template #description>
          <slot name="empty">
            {{ t('chat.empty') || '请选择会话' }}
          </slot>
        </template>
      </Empty>
    </div>

    <template v-else>
      <!-- Header -->
      <div
        v-if="showHeader"
        ref="headerRef"
        class="chat__header"
        :class="{
          'chat__header--align-left': headerAlign === 'left',
          'chat__header--align-center': headerAlign === 'center',
          'chat__header--align-right': headerAlign === 'right',
        }"
      >
        <slot name="header" :conversation="currentConversation">
          <!-- 头像区域 -->
          <div v-if="showHeaderAvatar && currentConversation" class="chat__header-avatar">
            <slot name="header-avatar" :conversation="currentConversation">
              <Avatar
                :src="headerAvatar"
                :name="headerTitle"
                :size="36"
                @click="onHeaderAvatarClick"
              />
            </slot>
          </div>
          <div class="chat__header-main">
            <slot name="header-title" :conversation="currentConversation">
              <span class="chat__title">{{ headerTitle }}</span>
            </slot>
            <slot name="header-extra" :conversation="currentConversation" />
          </div>
          <button
            v-if="currentConversation"
            class="chat__header-more"
            @click.stop="showDrawer = true"
          >
            <Icon name="actions/ellipsis_vertical" :size="20" />
          </button>
        </slot>
      </div>

      <!-- 置顶横幅 -->
      <PinnedBar
        v-if="showPinnedBar && currentConversation"
        :max-preview-length="pinnedBarMaxLength"
        @locate="onPinnedLocate"
      />

      <!-- 消息列表 -->
      <MessageList
        ref="messageListRef"
        :config="props.config"
        @reedit="onReedit"
        @edit="onEdit"
        @forward="openForwardModal"
        @recall-failed="(err, msg) => emit('recall-failed', err, msg)"
        @mention-click="(userId) => emit('at-me-click', userId)"
        @location-click="(body, msg) => emit('location-click', body, msg)"
        @custom-message-action="(action, payload, msg) => emit('custom-message-action', action, payload, msg)"
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

      <!-- 多选模式底部操作栏 -->
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
      >
        <template #toolbar-extra="slotProps">
          <slot name="toolbar-extra" v-bind="slotProps" />
        </template>
        <template #input-panel="slotProps">
          <slot name="input-panel" v-bind="slotProps" />
        </template>
      </MessageInput>

      <!-- 聊天信息抽屉 -->
      <ChatInfoDrawer
        ref="chatInfoDrawerRef"
        v-model:show="showDrawer"
        :conversation="currentConversation"
        :is-group="isGroupChat"
        :offset-top="headerHeight"
        :group-management-display-mode="props.config?.groupManagement?.displayMode"
        :allow-chat="props.config?.groupMember?.allowChat"
        :show-mute-all="props.config?.groupManagement?.showMuteAll"
        :show-mute-list="props.config?.groupManagement?.showMuteList"
        :show-blocklist="props.config?.groupManagement?.showBlocklist"
        :show-allowlist="props.config?.groupManagement?.showAllowlist"
        :show-shared-files="props.config?.groupManagement?.showSharedFiles"
        :show-join-requests="props.config?.groupManagement?.showJoinRequests"
        @leave-group="onLeaveGroup"
        @destroy-group="onDestroyGroup"
        @clear-history="onClearHistory"
        @add-member="onAddMember"
        @group-operation="emit('group-operation', $event)"
        @chat-member="onChatMember"
        @remove-member="onRemoveMember"
        @set-admin="onSetAdmin"
        @remove-admin="onRemoveAdmin"
      />

      <!-- 移除成员二次确认 -->
      <Modal
        v-model:show="showRemoveConfirmModal"
        :title="t('group.memberList.removeConfirmTitle')"
        :confirm-text="t('button.confirm')"
        :cancel-text="t('button.cancel')"
        @confirm="confirmRemoveMember"
        @cancel="cancelRemoveMember"
      >
        <template v-if="pendingRemoveMember">
          {{ t('group.memberList.removeConfirmPrefix') }} {{ pendingRemoveMember.nickname || pendingRemoveMember.userId }} {{ t('group.memberList.removeConfirmSuffix') }}
        </template>
      </Modal>

      <!-- 添加成员弹窗 -->
      <InviteMemberModal
        v-model:show="showInviteModal"
        :group-id="inviteGroupId"
        :existing-member-ids="stores.group.getGroupMembers(inviteGroupId).map(m => m.userId)"
        @invited="onInviteMembers"
      />

      <!-- 转发弹窗 -->
      <ForwardModal
        v-model:show="showForwardModal"
        @forward="onForwardConfirm"
      />

      <!-- 用户名片弹窗 -->
      <UserCardModal
        v-model:show="showUserCardModal"
        :user-id="userCardUserId"
        @send-message="onUserCardSendMessage"
      />

      <!-- 群名片弹窗 -->
      <GroupCardModal
        v-model:show="showGroupCardModal"
        :group-id="groupCardGroupId"
        @send-message="onGroupCardSendMessage"
      />
    </template>
  </div>
</template>

<style scoped>
.chat {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--uikit-bg-base);
}

/* 空状态：上下左右居中 */
.chat__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 全局加载状态 */
.chat__loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat__loading-text {
  font-size: 14px;
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
  font-size: 14px;
  color: var(--uikit-text-secondary);
  text-align: center;
  word-break: break-word;
}

.chat__error-retry {
  padding: 8px 20px;
  border-radius: 6px;
  border: none;
  background-color: var(--uikit-primary-color);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.chat__error-retry:hover {
  opacity: 0.9;
}

.chat__header {
  position: relative;
  z-index: 101;
  padding: calc(12px + var(--uikit-safe-top, 0px)) 16px 12px;
  display: flex;
  align-items: center;
  min-height: 48px;
  gap: 8px;
}

.chat__header--align-left .chat__header-main {
  justify-content: flex-start;
}

.chat__header--align-center .chat__header-main {
  justify-content: center;
}

.chat__header--align-right .chat__header-main {
  justify-content: flex-end;
}

.chat__header-avatar {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.chat__header-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.chat__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.chat__header-more {
  background: none;
  border: none;
  color: var(--uikit-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.15s;
  flex-shrink: 0;
}

.chat__header-more:hover {
  background-color: var(--uikit-bg-secondary);
}
</style>
