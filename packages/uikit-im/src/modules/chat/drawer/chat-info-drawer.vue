<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatSdkError } from '@easemob/uikit-core'
import { EmAvatar as Avatar } from '@easemob/uikit-core'
import { EmCheckbox as Checkbox } from '@easemob/uikit-core'
import { EmIcon as Icon } from '@easemob/uikit-core'
import { EmIconButton as IconButton } from '@easemob/uikit-core'
import { EmModal as Modal } from '@easemob/uikit-core'
import { EmButton as Button } from '@easemob/uikit-core'
import { EmSwitch as Switch } from '@easemob/uikit-core'
import { EmCell as Cell } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { useToast } from '@easemob/uikit-core'
import { useThemeStore } from '@easemob/uikit-core'
import { useUserInfo } from '../../../composables/use-user-info'
import { useGroup } from '../../../composables/use-group'
import { useConversation } from '../../../composables/use-conversation'
import { useUIKit } from '../../../composables/use-uikit'
import { CONVERSATION_TYPE, GROUP_INFO_LIMIT, GROUP_MEMBER_ROLE, NOTICE_EVENT_TYPE } from '@easemob/uikit-core'
import type { ConversationTypeValue } from '@easemob/uikit-core'
import { buildAnnouncementNoticeText, insertChatNotice } from '@easemob/uikit-core'
import type { UiConversation as Conversation, UiGroup, UiGroupMember } from '@easemob/uikit-core'
import type { ChatInfoDrawerPage, ChatInfoDrawerSlotScope } from '../types'
import SharedFileList from '../../group/group-management/shared-file-list.vue'
import { createLogger } from '@easemob/uikit-core'
import ChatInfoDrawerMemberCell from './chat-info-drawer-member-cell.vue'
import ChatInfoDrawerMembers from './chat-info-drawer-members.vue'
import ChatInfoDrawerMemberSearch from './chat-info-drawer-member-search.vue'
import ChatInfoDrawerFieldEditModal from './chat-info-drawer-field-edit-modal.vue'
import ChatInfoDrawerMemberRemoveModal from './chat-info-drawer-member-remove-modal.vue'
import ChatDrawer from './chat-drawer.vue'

const props = withDefaults(defineProps<ChatInfoDrawerProps>(), {
  groupManagementDisplayMode: 'drawer',
  allowChat: 'all',
  showMuteAll: true,
  showMuteList: true,
  showBlocklist: true,
  showAllowlist: false,
  showSharedFiles: true,
  showJoinRequests: false,
  mode: 'push',
  fullscreen: false,
  closeOnClickOutside: true,
})

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'leave-group', groupId: string): void
  (e: 'destroy-group', groupId: string): void
  (e: 'clear-history', payload: { id: string, type: ConversationTypeValue, deleteConversation?: boolean, deleteRoaming?: boolean }): void
  (e: 'add-member', groupId: string): void
  (e: 'group-operation', payload: { type: string, groupId: string, userId?: string }): void
  // 群成员列表事件
  (e: 'chat-member', member: UiGroupMember): void
  (e: 'remove-member', member: UiGroupMember): void
  (e: 'set-admin', member: UiGroupMember): void
  (e: 'remove-admin', member: UiGroupMember): void
  /**
   * 单聊拉黑/取消拉黑状态变更。
   * 默认 UI 已按新设计稿移除拉黑入口；保留事件声明供 drawer-actions 等插槽接管时触发。
   */
  (e: 'block-changed', userId: string, blocked: boolean): void
  /** 打开消息搜索（由宿主 chat 容器接管搜索弹窗） */
  (e: 'search-message'): void
  /** 单聊「添加」：以对方为初始成员发起群聊 */
  (e: 'create-group', userId: string): void
}>()

const logger = createLogger('UIKit:ChatInfoDrawer')

export interface ChatInfoDrawerProps {
  show: boolean
  conversation?: Conversation | null
  isGroup?: boolean
  offsetTop?: string | number
  /**
   * 群管理二级页面展示方式：drawer（抽屉）或 modal（居中弹窗）。
   * @deprecated 新设计稿群管理页为抽屉内二级页，该 prop 默认 UI 不再消费，仅为兼容保留。
   */
  groupManagementDisplayMode?: 'drawer' | 'modal'
  /** 是否允许对成员发起单聊：'all' 所有人，'contact' 仅联系人，'none' 不允许 */
  allowChat?: 'all' | 'contact' | 'none'
  /**
   * 是否展示全员禁言开关
   * @deprecated 新设计稿默认 UI 不再消费（GroupManagementSection 不再挂载），仅为兼容保留
   */
  showMuteAll?: boolean
  /**
   * 是否展示禁言列表入口
   * @deprecated 同 showMuteAll
   */
  showMuteList?: boolean
  /**
   * 是否展示黑名单入口
   * @deprecated 同 showMuteAll
   */
  showBlocklist?: boolean
  /**
   * 是否展示白名单入口
   * @deprecated 同 showMuteAll
   */
  showAllowlist?: boolean
  /**
   * 是否展示共享文件入口
   * @deprecated 同 showMuteAll（群文件已提为一级导航行，固定展示）
   */
  showSharedFiles?: boolean
  /**
   * 是否展示入群申请入口
   * @deprecated 同 showMuteAll
   */
  showJoinRequests?: boolean
  /** 抽屉展示模式：push 占位挤压聊天区（默认）/ overlay 完全遮挡 */
  mode?: 'overlay' | 'push'
  /** 点击抽屉外部（聊天区 / 空白处）是否关闭，默认 true；透传 ChatDrawer 的 closeOnClickOutside，仅 push 模式生效 */
  closeOnClickOutside?: boolean
  /** 全屏模式（移动端独立页面）：满铺聊天容器、圆角归零，header 主档显示返回箭头 */
  fullscreen?: boolean
  /** 抽屉宽度（px），默认 320；全屏模式忽略 */
  width?: number
  /** 是否展示「消息搜索」入口行（由宿主按 messageList.search 配置下发） */
  showMessageSearch?: boolean
}

const { t } = useLocale()

const { show: showToast } = useToast()
const { pinConversation, muteConversation } = useConversation()
const { stores } = useUIKit()
const {
  fetchGroupInfo,
  fetchGroupMembers,
  fetchGroupAnnouncement,
  getGroupMembers,
  getGroupAnnouncement,
  updateGroupInfo,
  updateGroupAnnouncement,
  changeGroupOwner,
  muteGroupMembers,
  unmuteGroupMembers,
  blockGroupMembers,
  unblockGroupMembers,
} = useGroup()

/** 备注编辑状态已随好友抽屉改版移除（设计稿不再包含备注/拉黑入口） */

const peerUserId = computed(() =>
  props.conversation?.type === CONVERSATION_TYPE.SINGLECHAT ? props.conversation.id : undefined,
)
const { userInfo, avatarUrl, contact } = useUserInfo(peerUserId)

/** 当前名称/备注：单聊按 备注 > 资料昵称 > 会话名 > unnamed */
const displayName = computed(() => {
  if (props.conversation?.type === CONVERSATION_TYPE.GROUPCHAT)
    return props.conversation.name || t('chat.info.unnamed')
  return (
    contact.value?.remark
    || userInfo.value?.nickname
    || props.conversation?.name
    || t('chat.info.unnamed')
  )
})

/** 当前头像：单聊优先取用户资料头像 */
const displayAvatar = computed(() => {
  if (props.conversation?.type === CONVERSATION_TYPE.GROUPCHAT)
    return props.conversation.avatar
  return avatarUrl.value || props.conversation?.avatar
})

// ===== 二级页导航与弹窗状态 =====
/** 二级页导航状态：null = 一级页 */
const activePage = ref<ChatInfoDrawerPage>(null)
const memberListRef = ref<InstanceType<typeof ChatInfoDrawerMembers>>()
const sharedFileListRef = ref<InstanceType<typeof SharedFileList>>()
/** 字段编辑 modal 状态（群名称 / 群公告共用） */
const fieldEditModal = ref<{ show: boolean, field: 'name' | 'notice' | null }>({
  show: false,
  field: null,
})
const savingField = ref(false)
/** 移除成员选择 modal */
const showMemberRemoveModal = ref(false)

/** 关闭抽屉 */
function onClose() {
  emit('update:show', false)
  activePage.value = null
  fieldEditModal.value.show = false
  showMemberRemoveModal.value = false
}

// ===== 群聊相关 =====
const currentUserId = computed(() => stores.client.currentUser)
const groupId = computed(() =>
  props.isGroup && props.conversation ? props.conversation.id : '',
)
const group = computed(() =>
  groupId.value ? stores.group.getGroupById(groupId.value) : undefined,
)
const members = computed<UiGroupMember[]>(() =>
  groupId.value ? getGroupMembers(groupId.value) : [],
)
const currentUserRole = computed(() => {
  if (!currentUserId.value)
    return undefined
  return members.value.find(m => m.userId === currentUserId.value)?.role
})

const isOwner = computed(() => currentUserRole.value === GROUP_MEMBER_ROLE.OWNER)
const isAdmin = computed(() => currentUserRole.value === GROUP_MEMBER_ROLE.ADMIN)

/** 群公告（store 缓存，loadGroupData 已拉取） */
const announcement = computed(() => (groupId.value ? getGroupAnnouncement(groupId.value) : '') || '')

/** 保存群名称（字段编辑 modal 触发） */
async function saveGroupName(value: string) {
  const id = groupId.value
  if (!id)
    return
  if (value.length > GROUP_INFO_LIMIT.NAME_MAX_LENGTH) {
    showToast(t('chat.info.groupNameTooLong').replace('{max}', String(GROUP_INFO_LIMIT.NAME_MAX_LENGTH)), 'error')
    return
  }
  savingField.value = true
  try {
    // 记录旧群名（updateGroupInfo 会同步更新 store，必须先取）
    const prevGroupName = stores.group.getGroupById(id)?.groupName
    await updateGroupInfo(id, { name: value })
    fieldEditModal.value.show = false
    // 发布方本地插入灰色通知：SDK 的 onGroupInfoChanged 事件不回推操作者本人，
    // 仅名称实际变更时插入，与接收方文案保持一致
    if (prevGroupName && prevGroupName !== value) {
      insertChatNotice(stores, id, CONVERSATION_TYPE.GROUPCHAT, {
        eventType: NOTICE_EVENT_TYPE.GROUP_NAME_CHANGED,
        params: { name: value },
        defaultText: t('chat.notice.groupNameChanged').replace('{name}', value),
      })
    }
    // 同步会话名称：会话列表/聊天头部/详情抽屉均展示 conversation.name，
    // 否则需刷新（重新同步会话）才能看到新群名
    stores.conversation.updateConversation(id, { name: value })
    showToast(t('chat.info.groupInfoUpdated', '更新成功'), 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.groupInfoUpdateFailed', '更新失败'), 'error')
  }
  finally {
    savingField.value = false
  }
}

/** 保存群公告（字段编辑 modal 触发，保存逻辑同 group-announcement.vue） */
async function saveGroupNotice(value: string) {
  const id = groupId.value
  if (!id)
    return
  if (value.length > GROUP_INFO_LIMIT.ANNOUNCEMENT_MAX_LENGTH) {
    showToast(t('chat.info.groupAnnouncementTooLong').replace('{max}', String(GROUP_INFO_LIMIT.ANNOUNCEMENT_MAX_LENGTH)), 'error')
    return
  }
  savingField.value = true
  try {
    await updateGroupAnnouncement(id, value)
    fieldEditModal.value.show = false
    // 发布方本地插入灰色通知：SDK 的 onAnnouncementChanged 事件不回推操作者本人，
    // 需自行插入，与接收方文案保持一致（带最新公告内容）
    insertChatNotice(stores, id, CONVERSATION_TYPE.GROUPCHAT, {
      eventType: NOTICE_EVENT_TYPE.ANNOUNCEMENT_CHANGED,
      params: { announcement: value },
      defaultText: buildAnnouncementNoticeText(value),
    })
    showToast(t('chat.info.groupInfoUpdated', '更新成功'), 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.groupInfoUpdateFailed', '更新失败'), 'error')
  }
  finally {
    savingField.value = false
  }
}

// ===== 字段编辑 modal（群名称 / 群公告共用） =====
const fieldEditTitle = computed(() =>
  fieldEditModal.value.field === 'notice'
    ? t('chat.info.groupNotice', '群公告')
    : t('chat.info.groupName', '群名称'),
)
const fieldEditValue = computed(() =>
  fieldEditModal.value.field === 'notice'
    ? announcement.value
    : (props.conversation?.name || ''),
)
const fieldEditMaxLength = computed(() =>
  fieldEditModal.value.field === 'notice'
    ? GROUP_INFO_LIMIT.ANNOUNCEMENT_MAX_LENGTH
    : GROUP_INFO_LIMIT.NAME_MAX_LENGTH,
)

function openFieldEdit(field: 'name' | 'notice') {
  fieldEditModal.value = { show: true, field }
}

function onFieldSave(value: string) {
  if (fieldEditModal.value.field === 'notice')
    void saveGroupNotice(value)
  else
    void saveGroupName(value)
}

/** 是否展示「添加成员」按钮：群主/管理员始终可邀请；普通成员需 group.allowInvites 为 true */
const canAddMember = computed(() => {
  if (!currentUserId.value)
    return false
  if (isOwner.value || isAdmin.value)
    return true
  return group.value?.allowInvites === true
})

/** 是否展示「移除成员」入口：群主/管理员可见 */
const canRemoveMembers = computed(() => isOwner.value || isAdmin.value)

const memberCount = computed(() =>
  group.value?.memberCount ?? members.value.length,
)

const loadingGroup = ref(false)

async function loadGroupData() {
  const id = groupId.value
  if (!id)
    return
  loadingGroup.value = true
  try {
    await Promise.all([
      fetchGroupInfo(id),
      fetchGroupMembers(id),
      fetchGroupAnnouncement(id),
    ])
  }
  catch (err) {
    logger.warn('[ChatInfoDrawer] load group data failed:', formatSdkError(err))
    showToast(t('chat.info.loadGroupInfoFailed', '群信息加载失败'), 'error')
  }
  finally {
    loadingGroup.value = false
  }
}

watch(
  () => [props.show, props.isGroup, groupId.value] as const,
  ([show, isGroup, id]) => {
    if (show && isGroup && id) {
      loadGroupData()
    }
    if (!show) {
      activePage.value = null
    }
  },
  { immediate: true },
)

/** 弹窗状态 */
const confirmModal = ref<{
  show: boolean
  title: string
  content: string
  action: 'leave' | 'destroy' | 'clear' | 'deleteConversation' | 'transferOwner' | 'muteMember' | 'unmuteMember' | 'blockMember' | 'unblockMember' | null
  /** transferOwner/muteMember/unmuteMember/blockMember/unblockMember 专用：目标用户 ID */
  targetUserId?: string
  /** transferOwner 专用：新群主展示名（发布方本地通知用） */
  targetUserName?: string
  /** deleteConversation 专用：是否同时删除服务器漫游历史消息 */
  deleteRoaming?: boolean
}>({
  show: false,
  title: '',
  content: '',
  action: null,
  deleteRoaming: false,
})

function openConfirm(action: 'leave' | 'destroy' | 'clear' | 'deleteConversation') {
  const id = props.conversation?.id
  if (!id)
    return
  if (action === 'leave') {
    confirmModal.value = {
      show: true,
      title: t('chat.info.leaveGroup', '退出群聊'),
      content: t('chat.info.leaveGroupConfirm', '确定退出该群聊吗？'),
      action,
    }
  }
  else if (action === 'destroy') {
    confirmModal.value = {
      show: true,
      title: t('chat.info.destroyGroup', '解散群聊'),
      content: t('chat.info.destroyGroupConfirm', '确定解散该群聊吗？解散后无法恢复。'),
      action,
    }
  }
  else if (action === 'deleteConversation') {
    confirmModal.value = {
      show: true,
      title: t('chat.info.deleteConversation', '删除会话'),
      content: t('chat.info.deleteConversationConfirm', '确定删除该会话吗？'),
      action,
      deleteRoaming: false,
    }
  }
  else {
    confirmModal.value = {
      show: true,
      title: t('chat.info.clearHistory', '清空聊天记录'),
      content: t('chat.info.clearHistoryConfirm', '确定清空当前会话的聊天记录吗？'),
      action,
    }
  }
}

// ===== 群成员管理：禁言/拉黑（domain 内部已同步 store 的禁言/黑名单缓存） =====
// 成员 ⋮ 菜单操作统一先走二次确认（confirmModal），确认后由 onModalConfirm 分发到 do* 执行

/** 禁言成员：二次确认 */
function onMuteMember(member: UiGroupMember) {
  const name = member.nickname || member.userId
  confirmModal.value = {
    show: true,
    title: t('chat.info.muteMemberConfirmTitle', '禁言成员'),
    content: t('chat.info.muteMemberConfirmContent', '确定禁言 {name} 吗？禁言后该成员将无法在群内发言。').replace('{name}', name),
    action: 'muteMember',
    targetUserId: member.userId,
  }
}

/** 取消禁言：二次确认 */
function onUnmuteMember(member: UiGroupMember) {
  const name = member.nickname || member.userId
  confirmModal.value = {
    show: true,
    title: t('chat.info.unmuteMemberConfirmTitle', '取消禁言'),
    content: t('chat.info.unmuteMemberConfirmContent', '确定解除 {name} 的禁言吗？').replace('{name}', name),
    action: 'unmuteMember',
    targetUserId: member.userId,
  }
}

/** 加入黑名单：二次确认（拉黑即移出群组，需特别提示） */
function onBlockMember(member: UiGroupMember) {
  const name = member.nickname || member.userId
  confirmModal.value = {
    show: true,
    title: t('chat.info.blockMemberConfirmTitle', '加入黑名单'),
    content: t('chat.info.blockMemberConfirmContent', '确定将 {name} 加入黑名单吗？该成员将被同时移出群组。').replace('{name}', name),
    action: 'blockMember',
    targetUserId: member.userId,
  }
}

/** 移出黑名单：二次确认 */
function onUnblockMember(member: UiGroupMember) {
  const name = member.nickname || member.userId
  confirmModal.value = {
    show: true,
    title: t('chat.info.unblockMemberConfirmTitle', '移出黑名单'),
    content: t('chat.info.unblockMemberConfirmContent', '确定将 {name} 移出黑名单吗？').replace('{name}', name),
    action: 'unblockMember',
    targetUserId: member.userId,
  }
}

async function doMuteMember(userId: string) {
  const id = groupId.value
  if (!id)
    return
  try {
    // SDK 5.0.0+ muteDuration 单位为毫秒，-1 表示永久禁言，与群管理-禁言列表添加操作保持一致
    await muteGroupMembers(id, [userId], -1)
    showToast(t('toast.success', '操作成功'), 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('toast.error', '操作失败'), 'error')
  }
}

async function doUnmuteMember(userId: string) {
  const id = groupId.value
  if (!id)
    return
  try {
    await unmuteGroupMembers(id, [userId])
    showToast(t('toast.success', '操作成功'), 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('toast.error', '操作失败'), 'error')
  }
}

async function doBlockMember(userId: string) {
  const id = groupId.value
  if (!id)
    return
  try {
    await blockGroupMembers(id, [userId])
    // 拉黑即移出群组（SDK 语义），且操作者本人收不到成员变更事件回推：
    // 同步本地成员缓存与群成员计数，避免列表/计数残留已拉黑成员
    stores.group.removeGroupMembers(id, [userId])
    stores.group.decrementMemberCount(id, 1)
    showToast(t('toast.success', '操作成功'), 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('toast.error', '操作失败'), 'error')
  }
}

async function doUnblockMember(userId: string) {
  const id = groupId.value
  if (!id)
    return
  try {
    await unblockGroupMembers(id, [userId])
    showToast(t('toast.success', '操作成功'), 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('toast.error', '操作失败'), 'error')
  }
}

/** 转让群主：二次确认（参照删除好友的确认弹窗模式） */
function onTransferOwner(member: UiGroupMember) {
  if (!groupId.value)
    return
  confirmModal.value = {
    show: true,
    title: t('group.memberList.transferOwner', '转让群主'),
    content: (t('chat.info.transferOwnerConfirm', '确定将群主转让给 {name} 吗？转让后你将成为普通成员。'))
      .replace('{name}', member.nickname || member.userId),
    action: 'transferOwner',
    targetUserId: member.userId,
    targetUserName: member.nickname || member.userId,
  }
}

async function doTransferOwner(userId: string, userName?: string) {
  const id = groupId.value
  if (!id)
    return
  // 4.x SDK 的 changeOwner 事件 payload.from 是旧群主而非新群主，
  // 用 pending 标记飞行中的转让目标，供事件处理层识别真正的 newOwner。
  stores.group.setPendingOwnerTransfer(id, userId)
  try {
    await changeGroupOwner(id, userId)
    // 同步本地群资料与成员角色缓存：群主字段、当前用户角色、新旧群主成员角色
    const patch: Partial<UiGroup> = { owner: userId }
    if (currentUserId.value)
      patch.role = GROUP_MEMBER_ROLE.MEMBER
    stores.group.updateGroup(id, patch)
    stores.group.updateGroupMemberRole(id, userId, GROUP_MEMBER_ROLE.OWNER)
    if (currentUserId.value)
      stores.group.updateGroupMemberRole(id, currentUserId.value, GROUP_MEMBER_ROLE.MEMBER)
    // 发布方本地插入灰色通知：SDK 的 onOwnerChanged 事件不回推操作者本人，与接收方文案保持一致
    const name = userName || userId
    insertChatNotice(stores, id, CONVERSATION_TYPE.GROUPCHAT, {
      eventType: NOTICE_EVENT_TYPE.OWNER_CHANGED,
      params: { name, ownerId: userId },
      defaultText: t('chat.notice.ownerChanged').replace('{name}', name),
    })
    showToast(t('chat.info.transferOwnerSuccess', '群主已转让'), 'success')
  }
  catch (err) {
    stores.group.clearPendingOwnerTransfer(id)
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.transferOwnerFailed', '转让群主失败'), 'error')
  }
}

function onModalConfirm() {
  const action = confirmModal.value.action
  const id = props.conversation?.id
  const type = props.conversation?.type
  if (!action || !id || !type)
    return

  if (action === 'leave') {
    emit('leave-group', id)
  }
  else if (action === 'destroy') {
    emit('destroy-group', id)
  }
  else if (action === 'clear') {
    emit('clear-history', { id, type, deleteConversation: false })
  }
  else if (action === 'deleteConversation') {
    emit('clear-history', { id, type, deleteConversation: true, deleteRoaming: confirmModal.value.deleteRoaming })
  }
  else if (action === 'transferOwner') {
    const targetUserId = confirmModal.value.targetUserId
    if (targetUserId)
      void doTransferOwner(targetUserId, confirmModal.value.targetUserName)
  }
  else if (action === 'muteMember') {
    if (confirmModal.value.targetUserId)
      void doMuteMember(confirmModal.value.targetUserId)
  }
  else if (action === 'unmuteMember') {
    if (confirmModal.value.targetUserId)
      void doUnmuteMember(confirmModal.value.targetUserId)
  }
  else if (action === 'blockMember') {
    if (confirmModal.value.targetUserId)
      void doBlockMember(confirmModal.value.targetUserId)
  }
  else if (action === 'unblockMember') {
    if (confirmModal.value.targetUserId)
      void doUnblockMember(confirmModal.value.targetUserId)
  }
  confirmModal.value.show = false
  confirmModal.value.action = null
  confirmModal.value.targetUserId = undefined
  confirmModal.value.targetUserName = undefined
}

/** 群管理二级页底部：退出/解散 */
function onLeaveOrDelete() {
  openConfirm(isOwner.value ? 'destroy' : 'leave')
}

function onClearHistory() {
  openConfirm('clear')
}

/** 删除会话（清空记录并删除会话本身） */
function onDeleteConversation() {
  openConfirm('deleteConversation')
}

// ===== 会话级设置：消息搜索 / 免打扰 / 置顶（单群通用） =====
const conversationMuted = computed(() => props.conversation?.isMuted ?? false)
const conversationPinned = computed(() => props.conversation?.isPinned ?? false)
/** 免打扰/置顶请求的 in-flight 守卫：防止重复点击并发请求（不再用于禁用开关） */
const updatingConversationSetting = ref(false)

/** 切换会话免打扰 */
async function onToggleMute(muted: boolean) {
  const id = props.conversation?.id
  if (!id || updatingConversationSetting.value)
    return
  updatingConversationSetting.value = true
  try {
    await muteConversation(id, muted)
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('toast.error', '操作失败'), 'error')
  }
  finally {
    updatingConversationSetting.value = false
  }
}

/** 切换会话置顶 */
async function onTogglePin(pinned: boolean) {
  const id = props.conversation?.id
  if (!id || updatingConversationSetting.value)
    return
  updatingConversationSetting.value = true
  try {
    await pinConversation(id, pinned)
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('toast.error', '操作失败'), 'error')
  }
  finally {
    updatingConversationSetting.value = false
  }
}

/** 打开消息搜索（由宿主容器接管） */
function onOpenMessageSearch() {
  emit('search-message')
}

/** 单聊「添加」：以对方为初始成员发起群聊 */
function onCreateGroupFromPeer() {
  if (peerUserId.value)
    emit('create-group', peerUserId.value)
}

function onViewAllMembers() {
  activePage.value = 'members'
}

function onOpenMemberSearch() {
  activePage.value = 'member-search'
}

function closeMemberList() {
  activePage.value = null
}

function onChatMember(member: UiGroupMember) {
  emit('update:show', false)
  emit('chat-member', member)
}

/** 二级页标题（随 activePage 切换） */
const activePageTitle = computed(() => {
  switch (activePage.value) {
    case 'members':
      return t('chat.info.groupMembers', '群成员')
    case 'member-search':
      return t('chat.info.searchMembers', '搜索成员')
    case 'files':
      return t('group.management.sharedFiles', '群文件')
    default:
      return ''
  }
})

function onAddMember() {
  const id = groupId.value
  if (id)
    emit('add-member', id)
}

const displayedMembers = computed(() => members.value.slice(0, 8))

/** 宫格 +/− 单元格圆角跟随主题头像形状（与 Avatar 组件同一取值口径：circle=50% / square=8px） */
const themeStore = useThemeStore()
const gridActionShapeStyle = computed(() =>
  `--uikit-drawer-grid-action-radius: ${themeStore.avatarShape === 'square' ? '8px' : '50%'}`,
)
const hasMoreMembers = computed(() => members.value.length > displayedMembers.value.length)

/** 暴露成员列表操作方法供父组件调用 */
defineExpose({
  /** 移除成员（更新 store 成员缓存） */
  removeMember: (userId: string) => memberListRef.value?.removeMember(userId),
  /** 设置成员角色（更新 store 成员缓存） */
  setMemberRole: (userId: string, role: UiGroupMember['role']) => memberListRef.value?.setMemberRole(userId, role),
  /** 刷新成员列表 */
  refreshMemberList: () => memberListRef.value?.refreshMemberList(),
})

/** Section 插槽统一 scope：只给数据 + close，内部动作仍走已有 emits / composable */
const drawerSlotScope = computed<ChatInfoDrawerSlotScope>(() => ({
  conversation: props.conversation,
  isGroup: props.isGroup ?? false,
  groupId: groupId.value,
  group: group.value,
  members: members.value,
  memberCount: memberCount.value,
  currentUserId: currentUserId.value ?? '',
  isOwner: isOwner.value,
  isAdmin: isAdmin.value,
  canAddMember: canAddMember.value,
  loadingGroup: loadingGroup.value,
  activePage: activePage.value,
  closeMemberList,
  close: onClose,
}))
</script>

<template>
  <ChatDrawer
    :show="props.show"
    :overlay="false"
    :offset-top="props.offsetTop"
    :mode="props.mode"
    :width="props.width ?? 320"
    :fullscreen="props.fullscreen"
    :close-on-click-outside="props.closeOnClickOutside"
    @update:show="emit('update:show', $event)"
    @close="onClose"
  >
    <!-- Header 插槽 -->
    <template #header>
      <slot name="drawer-header" v-bind="drawerSlotScope">
        <div v-if="!activePage" class="chat-info-drawer__header">
          <!-- 全屏模式（移动端独立页面）：左侧返回箭头替代右上角关闭 -->
          <IconButton
            v-if="props.fullscreen"
            class="chat-info-drawer__back"
            icon="chevron/left"
            :icon-size="22"
            size="small"
            variant="ghost"
            :title="t('button.back', '返回')"
            @click="onClose"
          />
          <span class="chat-info-drawer__title" :class="{ 'chat-info-drawer__title--left': !props.fullscreen }">
            {{ isGroup ? t('chat.info.titleGroup') : t('chat.info.titleFriend') }}
          </span>
          <IconButton
            v-if="!props.fullscreen"
            class="chat-info-drawer__close"
            icon="xmark/bold"
            :icon-size="22"
            size="small"
            variant="ghost"
            :title="t('button.close', '关闭')"
            @click="onClose"
          />
          <span v-else class="chat-info-drawer__header-placeholder" />
        </div>
        <div v-else class="chat-info-drawer__header">
          <IconButton
            class="chat-info-drawer__back"
            icon="chevron/left"
            :icon-size="22"
            size="small"
            variant="ghost"
            :title="t('button.back', '返回')"
            @click="closeMemberList"
          />
          <span class="chat-info-drawer__title chat-info-drawer__title--left">{{ activePageTitle }}</span>
          <!-- 群文件二级页：header 右侧上传按钮（实现方式与左侧返回箭头完全一致：
               默认 type + ghost variant 的中性 IconButton，无任何颜色 override） -->
          <IconButton
            v-if="activePage === 'files'"
            class="chat-info-drawer__upload"
            icon="arrow/up_tray"
            :icon-size="22"
            size="small"
            variant="ghost"
            :title="t('group.sharedFile.uploadText', '上传')"
            @click="sharedFileListRef?.triggerUpload()"
          />
          <span v-else class="chat-info-drawer__header-placeholder" />
        </div>
      </slot>
    </template>

    <!-- Body 默认插槽 -->
    <div class="chat-info-drawer__body">
      <template v-if="!activePage">
        <!-- 单聊：成员条（对方头像 + 添加单元格，添加 = 以对方为初始成员发起群聊） -->
        <div v-if="!isGroup" class="chat-info-drawer__member-strip">
          <div class="chat-info-drawer__strip-cell">
            <Avatar :name="displayName" :src="displayAvatar" :size="48" />
            <span class="chat-info-drawer__strip-name">{{ displayName }}</span>
          </div>
          <div class="chat-info-drawer__strip-cell chat-info-drawer__strip-cell--add" @click="onCreateGroupFromPeer">
            <span class="chat-info-drawer__strip-add-circle">
              <Icon name="plus" :size="20" />
            </span>
            <span class="chat-info-drawer__strip-name">{{ t('chat.info.add', '添加') }}</span>
          </div>
        </div>

        <template v-else>
          <!-- 群聊：成员区（label + 假搜索框 + 网格 + 查看全部） -->
          <div class="chat-info-drawer__section-group">
            <div class="chat-info-drawer__section-label-row">
              <span class="chat-info-drawer__section-label">{{ t('chat.info.groupMembers') }} <span class="chat-info-drawer__count">({{ memberCount }})</span></span>
            </div>
            <!-- 假搜索框：readonly 视觉同搜索输入框，点击进入 Members Search 二级页 -->
            <div class="chat-info-drawer__fake-search" @click="onOpenMemberSearch">
              <Icon name="search" :size="16" />
              <span class="chat-info-drawer__fake-search-placeholder">{{ t('group.memberList.searchPlaceholder', '搜索群成员') }}</span>
            </div>
            <slot name="drawer-members" v-bind="drawerSlotScope">
              <div class="chat-info-drawer__section">
                <div class="chat-info-drawer__member-grid" :style="gridActionShapeStyle" @click="onViewAllMembers">
                  <ChatInfoDrawerMemberCell
                    v-for="member in displayedMembers"
                    :key="member.userId"
                    :member="member"
                  />
                  <div
                    v-if="canAddMember"
                    class="chat-info-drawer__grid-action"
                    @click.stop="onAddMember"
                  >
                    <span class="chat-info-drawer__grid-action-circle">
                      <Icon name="plus" :size="20" />
                    </span>
                    <span class="chat-info-drawer__grid-action-name">{{ t('chat.info.add', '添加') }}</span>
                  </div>
                  <div
                    v-if="canRemoveMembers"
                    class="chat-info-drawer__grid-action"
                    @click.stop="showMemberRemoveModal = true"
                  >
                    <span class="chat-info-drawer__grid-action-circle">
                      <Icon name="minus" :size="20" />
                    </span>
                    <span class="chat-info-drawer__grid-action-name">{{ t('group.memberList.remove', '移除') }}</span>
                  </div>
                </div>
                <button v-if="hasMoreMembers || members.length === 0" class="chat-info-drawer__view-all" @click.stop="onViewAllMembers">
                  {{ members.length === 0 ? t('chat.info.viewAllMembersEmpty') : t('chat.info.checkAll', '查看全部') }}
                  <Icon name="chevron/down" :size="14" />
                </button>
              </div>
            </slot>
          </div>

          <!-- 群聊：可编辑字段行（群名称 / 群公告，点击铅笔弹统一字段编辑 modal） -->
          <div class="chat-info-drawer__fields">
            <div class="chat-info-drawer__field">
              <span class="chat-info-drawer__field-label">{{ t('chat.info.groupName', '群名称') }}</span>
              <div class="chat-info-drawer__field-main">
                <span class="chat-info-drawer__field-value">{{ displayName }}</span>
                <IconButton
                  v-if="isOwner"
                  class="chat-info-drawer__field-edit-btn"
                  icon="rect_notched/pen"
                  :icon-size="22"
                  variant="ghost"
                  :title="t('chat.info.edit', '编辑')"
                  @click="openFieldEdit('name')"
                />
              </div>
            </div>
            <div class="chat-info-drawer__field">
              <span class="chat-info-drawer__field-label">{{ t('chat.info.groupNotice', '群公告') }}</span>
              <div class="chat-info-drawer__field-main">
                <span
                  class="chat-info-drawer__field-value chat-info-drawer__field-value--ellipsis"
                  :class="{ 'is-placeholder': !announcement }"
                >{{ announcement || t('chat.info.groupAnnouncementPlaceholder') }}</span>
                <IconButton
                  v-if="isOwner || isAdmin"
                  class="chat-info-drawer__field-edit-btn"
                  icon="rect_notched/pen"
                  :icon-size="22"
                  variant="ghost"
                  :title="t('chat.info.edit', '编辑')"
                  @click="openFieldEdit('notice')"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- 会话设置：消息搜索 / 群文件 / 免打扰 / 置顶（单群通用，conversation 级状态） -->
        <slot name="drawer-settings" v-bind="drawerSlotScope">
          <div class="chat-info-drawer__settings" :class="{ 'chat-info-drawer__settings--group': isGroup }">
            <Cell
              v-if="props.showMessageSearch"
              :title="t('message.search.title')"
              size="compact"
              show-arrow
              border="bottom"
              :inset-hover="false"
              @click="onOpenMessageSearch"
            />
            <Cell
              v-if="isGroup"
              :title="t('group.management.sharedFiles', '群文件')"
              size="compact"
              show-arrow
              border="bottom"
              :inset-hover="false"
              @click="activePage = 'files'"
            />
            <Cell :title="t('chat.info.conversationMute')" size="compact" border="bottom" :clickable="false" :inset-hover="false">
              <template #trailing>
                <!-- 不在请求中禁用开关（避免鼠标悬停时闪现 not-allowed 光标）；
                     重复点击由 onToggleMute 内的 in-flight 守卫拦截，失败时状态自然回弹 -->
                <Switch
                  :model-value="conversationMuted"
                  @change="onToggleMute"
                />
              </template>
            </Cell>
            <Cell :title="t('chat.info.conversationPin')" size="compact" border="bottom" :clickable="false" :inset-hover="false">
              <template #trailing>
                <Switch
                  :model-value="conversationPinned"
                  @change="onTogglePin"
                />
              </template>
            </Cell>
          </div>
        </slot>

        <!-- 通用操作接管位（默认无内容；群聊清空/删除已移至 footer 胶囊按钮组） -->
        <slot name="drawer-actions" v-bind="drawerSlotScope" />
      </template>

      <!-- 二级页：群成员列表（分栏：All / Admin / Allowed / Blocked / Muted） -->
      <slot v-if="activePage === 'members'" name="drawer-member-detail" v-bind="drawerSlotScope">
        <div class="chat-info-drawer__member-detail">
          <ChatInfoDrawerMembers
            v-if="groupId"
            ref="memberListRef"
            :group-id="groupId"
            :members="members"
            :current-user-id="currentUserId ?? ''"
            :is-owner="isOwner"
            :is-admin="isAdmin"
            :allow-chat="props.allowChat"
            @chat-member="onChatMember"
            @remove-member="emit('remove-member', $event)"
            @set-admin="emit('set-admin', $event)"
            @remove-admin="emit('remove-admin', $event)"
            @mute-member="onMuteMember"
            @unmute-member="onUnmuteMember"
            @block-member="onBlockMember"
            @unblock-member="onUnblockMember"
            @transfer-owner="onTransferOwner"
            @group-operation="emit('group-operation', $event)"
          />
        </div>
      </slot>

      <!-- 二级页：成员搜索 -->
      <div v-else-if="activePage === 'member-search'" class="chat-info-drawer__subpage">
        <ChatInfoDrawerMemberSearch
          v-if="groupId"
          :group-id="groupId"
          :members="members"
          :current-user-id="currentUserId ?? ''"
          :allow-chat="props.allowChat"
          @chat-member="onChatMember"
          @remove-member="emit('remove-member', $event)"
          @set-admin="emit('set-admin', $event)"
          @remove-admin="emit('remove-admin', $event)"
          @mute-member="onMuteMember"
          @unmute-member="onUnmuteMember"
          @block-member="onBlockMember"
          @unblock-member="onUnblockMember"
          @transfer-owner="onTransferOwner"
        />
      </div>

      <!-- 二级页：群文件（header 右侧上传按钮调 triggerUpload；行 EmCell 发丝线，容器通栏） -->
      <div v-else-if="activePage === 'files'" class="chat-info-drawer__subpage chat-info-drawer__subpage--files">
        <SharedFileList
          v-if="groupId"
          ref="sharedFileListRef"
          :group-id="groupId"
          border="bottom"
        />
      </div>
    </div>

    <!-- Footer 插槽 -->
    <template v-if="!activePage" #footer>
      <slot name="drawer-footer" v-bind="drawerSlotScope">
        <div class="chat-info-drawer__actions">
          <!-- 单群一致：清空聊天记录 + 删除会话（圆角胶囊按钮，设计稿） -->
          <Button type="default" block class="chat-info-drawer__pill-btn" @click="onClearHistory">
            {{ t('chat.info.clearHistory') }}
          </Button>
          <Button type="default" block class="chat-info-drawer__pill-btn chat-info-drawer__pill-btn--danger" @click="onDeleteConversation">
            {{ t('chat.info.deleteConversation', '删除会话') }}
          </Button>
          <!-- 群聊：退出/解散（与清空/删除同款灰底胶囊，破坏性操作灰底红字，走现有 confirm Modal） -->
          <Button
            v-if="isGroup"
            type="default"
            block
            class="chat-info-drawer__pill-btn chat-info-drawer__pill-btn--danger"
            @click="onLeaveOrDelete"
          >
            {{ isOwner ? t('chat.info.destroyGroup', '解散群聊') : t('chat.info.leaveGroup', '退出群聊') }}
          </Button>
        </div>
      </slot>
    </template>
  </ChatDrawer>

  <!-- 字段编辑 modal（群名称 / 群公告共用） -->
  <ChatInfoDrawerFieldEditModal
    v-model:show="fieldEditModal.show"
    :title="fieldEditTitle"
    :value="fieldEditValue"
    :max-length="fieldEditMaxLength"
    :multiline="fieldEditModal.field === 'notice'"
    :saving="savingField"
    @save="onFieldSave"
  />

  <!-- 移除成员选择 modal -->
  <ChatInfoDrawerMemberRemoveModal
    v-model:show="showMemberRemoveModal"
    :group-id="groupId"
    :members="members"
    :current-user-id="currentUserId ?? ''"
    :current-user-role="currentUserRole"
  />

  <Modal
    v-model:show="confirmModal.show"
    :title="confirmModal.title"
    :confirm-text="t('button.confirm')"
    :cancel-text="t('button.cancel')"
    @confirm="onModalConfirm"
  >
    <div class="chat-info-drawer__confirm-body">
      <p>{{ confirmModal.content }}</p>
      <div
        v-if="confirmModal.action === 'deleteConversation'"
        class="chat-info-drawer__confirm-checkbox"
        @click="confirmModal.deleteRoaming = !confirmModal.deleteRoaming"
      >
        <Checkbox :checked="confirmModal.deleteRoaming" :size="16" />
        <span>{{ t('chat.info.deleteRoamingMessages', '同时删除历史消息') }}</span>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.chat-info-drawer__header {
  display: flex;
  align-items: center;
  /* 与聊天表头（.chat__header）严格对齐：12px/16px 内边距、48px 最小高度、8px 间距 */
  padding: calc(var(--uikit-header-padding-y, 12px) + var(--uikit-safe-top, 0px)) 16px
    var(--uikit-header-padding-y, 12px);
  min-height: 48px;
  gap: 8px;
}

.chat-info-drawer__close,
.chat-info-drawer__back {
  flex-shrink: 0;
}

/* header 内 icon 统一纯黑（设计稿 #000000，不随主题色）：
   关闭 X 走 --uikit-drawer-close-color（可主题化覆盖，默认 #000），返回/上传与 X 同规格 */
.chat-info-drawer__header .chat-info-drawer__close {
  color: var(--uikit-drawer-close-color, #000000);
}

.chat-info-drawer__header .chat-info-drawer__back,
.chat-info-drawer__header .chat-info-drawer__upload {
  color: var(--uikit-drawer-close-color, #000000);
}

/* 关闭按钮 hover 底色走 --uikit-bg-hover 语义 token：
   跟随主题明暗默认值（浅 #F5F5F5 / 深 #374151），也跟随 hoverColor 自定义配置；
   相比旧硬编码 rgba 值视觉接近，且不再需要单独维护深色覆盖。 */

@media (hover: hover) {
  .chat-info-drawer__close:hover:not(:disabled) {
    background-color: var(--uikit-bg-hover) !important;
  }
}

/* 群文件页 header 上传按钮：与返回箭头（.chat-info-drawer__back）完全同款——
   仅做布局防压缩，颜色/hover 全部走 IconButton default+ghost 的中性默认样式，无任何 override */
.chat-info-drawer__upload {
  flex-shrink: 0;
}

.chat-info-drawer__header-placeholder {
  width: 32px;
  height: 32px;
}

.chat-info-drawer__title {
  font-size: var(--uikit-font-size-18);
  font-weight: 600;
  color: var(--uikit-text-primary);
  flex: 1;
  text-align: center;
}

/* 一级页与二级页标题均左对齐（设计稿：二级页为返回箭头 + 左对齐标题） */
.chat-info-drawer__title--left {
  text-align: left;
}

.chat-info-drawer__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
  /* body 默认无内边距：分隔线/列表行通栏满铺，内容由各区块自行内收 */
  padding: 0;
  gap: 12px;
}

.chat-info-drawer__section-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

/* 成员区顶部 label（Members (N)）：与下方可编辑字段行 label（群名称/群公告）完全一致
   的字体风格——12px 灰字（设计稿），横向内边距由外层 section-label-row 统一提供
   （16px，与 header 标题左边缘对齐），自身不再重复 padding */
.chat-info-drawer__section-label {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}

.chat-info-drawer__section-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.chat-info-drawer__section {
  padding: var(--uikit-drawer-padding, 16px) var(--uikit-drawer-padding, 16px);
  flex-shrink: 0;
}

.chat-info-drawer__count {
  font-weight: 400;
  color: var(--uikit-text-secondary);
}

/* 假搜索框：readonly 视觉同搜索输入框，点击进入 Members Search 二级页 */
.chat-info-drawer__fake-search {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 16px;
  padding: 0 12px;
  height: 32px;
  border-radius: 999px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-tertiary);
  font-size: var(--uikit-font-size-13);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .chat-info-drawer__fake-search:hover {
    background-color: var(--uikit-bg-hover);
  }
}

.chat-info-drawer__fake-search-placeholder {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 可编辑字段行：label 小灰 + 值粗体 + 右侧编辑按钮 + 底部发丝线（EmCell border 契约同款规格：
   行通栏、内容 16px 内收、发丝线 ::after 左内收 16px 右顶满，与下方 EmCell 导航行分割线端点完全一致） */
.chat-info-drawer__fields {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.chat-info-drawer__field {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 16px;
}

.chat-info-drawer__field::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 0;
  bottom: 0;
  height: 1px;
  background-color: var(--uikit-divider-color, rgba(0, 0, 0, 0.06));
  pointer-events: none;
}

.chat-info-drawer__field-label {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}

.chat-info-drawer__field-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
}

.chat-info-drawer__field-value {
  font-size: var(--uikit-font-size-16);
  font-weight: 500;
  color: var(--uikit-text-primary);
  min-width: 0;
}

.chat-info-drawer__field-value--ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-info-drawer__field-value.is-placeholder {
  font-weight: 400;
  color: var(--uikit-text-tertiary);
}

/* 字段编辑按钮：设计稿色值 #C9CDCF（现有 token 中 --uikit-switch-off-bg 同值但语义不符、
   --uikit-icon-muted #949A9E 为最近语义 token 但偏深，均不直接复用；
   走可主题化变量 + 设计稿色值回退） */
.chat-info-drawer__field-edit-btn {
  color: var(--uikit-drawer-field-action-color, #c9cdcf);
}

/* 单聊成员条：对方头像 + 添加单元格（实线圆），单元格间距 20px（设计稿） */
.chat-info-drawer__member-strip {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  /* body 无内边距，成员条自行内收，与表头标题左边距对齐 */
  padding: 4px 16px;
  flex-shrink: 0;
}

.chat-info-drawer__strip-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 56px;
}

.chat-info-drawer__strip-name {
  max-width: 100%;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-info-drawer__strip-cell--add {
  cursor: pointer;
  border-radius: var(--uikit-components-radius, 8px);
}

.chat-info-drawer__strip-add-circle {
  /* border-box：1px 边框计入 48px 总尺寸，与 Avatar（48px 无边框）等高，保证两者下方文字同一基线 */
  box-sizing: border-box;
  width: 48px;
  height: 48px;
  border: 1px solid var(--uikit-border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--uikit-icon-muted);
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .chat-info-drawer__strip-cell--add:hover .chat-info-drawer__strip-add-circle {
    background-color: var(--uikit-bg-hover);
  }
}

/* 会话设置行组：行间 1px 分隔线、内容内收均为 Cell 分割线模式（border="bottom"）的默认风格，
   单聊保持默认（12px 内收、14px 标题），群聊按设计稿覆盖（见下） */
.chat-info-drawer__settings {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

/* 群聊：内收值覆盖为 16px（--uikit-cell-border-padding-x，cell 契约变量），与可编辑字段行左侧对齐 */
.chat-info-drawer__settings--group {
  --uikit-cell-border-padding-x: 16px;
}

/* 群聊：导航/开关行标题字号统一 16px（设计稿，与字段行值字号一致） */
.chat-info-drawer__settings--group :deep(.uikit-cell__title) {
  font-size: var(--uikit-font-size-16);
}

/* 成员二级页行样式（设计稿 Members Search）：名字 16px；
   发丝分割线走 EmCell 自带 border 能力（GroupMemberList(Item) 传 border="bottom"），
   ID 行与「没有更多了」由 showId/showNoMore prop 关闭 */
.chat-info-drawer__member-detail :deep(.group-member-list__name),
.chat-info-drawer__subpage :deep(.group-member-list__name) {
  font-size: var(--uikit-font-size-16);
}

/* 成员网格：严格 5 列等宽（CSS grid 按轨道均分，不受单元格 padding/box-sizing 影响），
   成员不足时按列左起排布、不拉伸变形；
   间距按设计稿标注：横向 20px、纵向 16px；左右留白由外层 section 的 16px padding 提供 */
.chat-info-drawer__member-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  column-gap: 20px;
  row-gap: 16px;
}

.chat-info-drawer__member-grid > * {
  box-sizing: border-box;
  /* 允许长名字在列宽内省略而非撑破轨道 */
  min-width: 0;
}

/* 网格 + / − 操作单元格：实线圆 + 下方文字（与成员单元格同规格：padding 6px、gap 4px、
   48px 内容高度、12px 名字行，保证两格类型视觉基线一致） */
.chat-info-drawer__grid-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px;
  cursor: pointer;
  border-radius: var(--uikit-components-radius, 8px);
}

.chat-info-drawer__grid-action-circle {
  box-sizing: border-box;
  width: 48px;
  height: 48px;
  border: 1px solid var(--uikit-border-color);
  /* 圆角跟随主题头像形状（grid 容器注入 --uikit-drawer-grid-action-radius，缺省正圆） */
  border-radius: var(--uikit-drawer-grid-action-radius, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--uikit-icon-muted);
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.chat-info-drawer__grid-action-name {
  max-width: 100%;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (hover: hover) {
  .chat-info-drawer__grid-action:hover .chat-info-drawer__grid-action-circle {
    background-color: var(--uikit-bg-hover);
  }
}

.chat-info-drawer__view-all {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  margin-top: 12px;
  padding: 8px;
  border: none;
  background: none;
  color: var(--uikit-primary-color);
  font-size: var(--uikit-font-size-14);
  cursor: pointer;
  border-radius: var(--uikit-components-radius);
}

@media (hover: hover) {
  .chat-info-drawer__view-all:hover {
    background-color: var(--uikit-bg-secondary);
  }
}

.chat-info-drawer__actions {
  padding: var(--uikit-drawer-padding, 16px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* footer 圆角胶囊按钮（设计稿：灰底通栏胶囊，高 42px、内 padding 上下 12px 左右 4px；
   文字按 body/large/medium：Inter 16px/500/行高 normal，默认色 #000（可经变量主题化）；
   删除会话为灰底红字） */
.chat-info-drawer__actions .chat-info-drawer__pill-btn {
  height: 42px;
  padding: 12px 4px;
  border-radius: 999px;
  font-family: var(--uikit-font-family);
  font-size: var(--uikit-font-size-16);
  font-weight: var(--uikit-font-weight-medium);
  line-height: normal;
  color: var(--uikit-drawer-action-btn-color, #000000);
}

.chat-info-drawer__actions .chat-info-drawer__pill-btn--danger {
  color: var(--uikit-danger-color);
}

.chat-info-drawer__member-detail {
  flex: 0 0 auto;
  min-height: 0;
  overflow: hidden;
  /* 成员列表区通栏：行撑满抽屉宽度，EmCell 发丝线右端顶满抽屉右边缘；
     tabs 行/搜索框自行内收 16px，成员行内容内收由下方契约变量统一为 16px（与 tabs 左缘对齐） */
  --uikit-cell-border-padding-x: 16px;
}

/* 内容少时卡片高度由成员列表决定，不强制撑满抽屉；成员多时由外层 body 滚动 */
.chat-info-drawer__member-detail .group-member-list {
  height: auto;
}

/* 二级页通用容器（成员搜索 / 群文件 / 群管理） */
.chat-info-drawer__subpage {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  /* 成员搜索页行通栏：内容内收统一 16px（与页内搜索框左缘对齐），发丝线右端顶满抽屉右边缘 */
  --uikit-cell-border-padding-x: 16px;
}

/* 群文件页容器通栏（无横向 padding）：文件行撑满抽屉宽度，
   内容内收由上方 --uikit-cell-border-padding-x = 16px 控制（文件 icon 左缘与返回箭头对齐），
   EmCell 发丝线右端顶满抽屉右边缘 */
.chat-info-drawer__subpage--files {
  padding: 0;
}

.chat-info-drawer__confirm-body {
  text-align: center;
}

.chat-info-drawer__confirm-body > p {
  margin: 0 0 12px;
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-14);
  line-height: 1.5;
}

.chat-info-drawer__confirm-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-primary);
}
</style>
