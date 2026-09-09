<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { formatSdkError } from '@easemob/uikit-core'
import { EmAvatar as Avatar } from '@easemob/uikit-core'
import { EmIcon as Icon } from '@easemob/uikit-core'
import { EmIconButton as IconButton } from '@easemob/uikit-core'
import { EmModal as Modal } from '@easemob/uikit-core'
import { EmButton as Button } from '@easemob/uikit-core'
import { EmSwitch as Switch } from '@easemob/uikit-core'
import { EmCopyableText as CopyableText } from '@easemob/uikit-core'
import { EmCell as Cell } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { useToast } from '@easemob/uikit-core'
import { useUserInfo } from '../../../composables/use-user-info'
import { useGroup } from '../../../composables/use-group'
import { useConversation } from '../../../composables/use-conversation'
import { useUIKit } from '../../../composables/use-uikit'
import { CONVERSATION_TYPE, GROUP_INFO_LIMIT, GROUP_MEMBER_ROLE, NOTICE_EVENT_TYPE } from '@easemob/uikit-core'
import type { ConversationTypeValue } from '@easemob/uikit-core'
import { insertChatNotice } from '@easemob/uikit-core'
import type { UiConversation as Conversation, UiGroup, UiGroupMember } from '@easemob/uikit-core'
import type { ChatInfoDrawerSlotScope } from '../types'
import GroupManagementSection from '../../group/group-management-section.vue'
import GroupMemberList from '../../group/group-member-list.vue'
import GroupAnnouncement from '../../group/group-announcement.vue'
import { createLogger } from '@easemob/uikit-core'
import ChatInfoDrawerMemberCell from './chat-info-drawer-member-cell.vue'
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
  /** 群管理二级页面展示方式：drawer（抽屉）或 modal（居中弹窗） */
  groupManagementDisplayMode?: 'drawer' | 'modal'
  /** 是否允许对成员发起单聊：'all' 所有人，'contact' 仅联系人，'none' 不允许 */
  allowChat?: 'all' | 'contact' | 'none'
  /** 是否展示全员禁言开关 */
  showMuteAll?: boolean
  /** 是否展示禁言列表入口 */
  showMuteList?: boolean
  /** 是否展示黑名单入口 */
  showBlocklist?: boolean
  /** 是否展示白名单入口 */
  showAllowlist?: boolean
  /** 是否展示共享文件入口 */
  showSharedFiles?: boolean
  /** 是否展示入群申请入口 */
  showJoinRequests?: boolean
  /** 抽屉展示模式：push 占位挤压聊天区（默认）/ overlay 完全遮挡 */
  mode?: 'overlay' | 'push'
  /** 全屏模式（移动端独立页面）：满铺聊天容器、圆角归零，header 主档显示返回箭头 */
  fullscreen?: boolean
  /** 抽屉宽度（px），默认 320；全屏模式忽略 */
  width?: number
  /** 是否展示「消息搜索」入口行（由宿主按 messageList.search 配置下发） */
  showMessageSearch?: boolean
}

const { t } = useLocale()

function formatCharCount(current: number, max: number): string {
  return t('common.charCount', '{current}/{max}').replace('{current}', String(current)).replace('{max}', String(max))
}

const { show: showToast } = useToast()
const { pinConversation, muteConversation } = useConversation()
const { stores } = useUIKit()
const {
  fetchGroupInfo,
  fetchGroupMembers,
  fetchGroupAnnouncement,
  getGroupMembers,
  updateGroupInfo,
  changeGroupOwner,
  muteGroupMembers,
  unmuteGroupMembers,
  blockGroupMembers,
  unblockGroupMembers,
} = useGroup()

/** 备注编辑状态已随好友抽屉改版移除（设计稿不再包含备注/拉黑入口） */

// ===== 群信息编辑状态 =====
/** 群名称编辑 */
const isEditingGroupName = ref(false)
const groupNameInputRef = ref<HTMLInputElement>()
const groupNameInput = ref('')
const savingGroupName = ref(false)
/** 群描述编辑 */
const isEditingDescription = ref(false)
const descriptionInputRef = ref<HTMLTextAreaElement>()
const descriptionInput = ref('')
const savingDescription = ref(false)

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

/** 关闭抽屉 */
function onClose() {
  emit('update:show', false)
  isEditingGroupName.value = false
  isEditingDescription.value = false
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

// 群信息编辑：数据同步
watch(
  () => props.conversation?.name,
  (name) => {
    if (!isEditingGroupName.value)
      groupNameInput.value = name || ''
  },
  { immediate: true },
)
watch(
  () => group.value?.description,
  (val) => {
    if (!isEditingDescription.value)
      descriptionInput.value = val || ''
  },
  { immediate: true },
)

// 自动聚焦编辑输入框
watch(isEditingGroupName, async (editing) => {
  if (editing) {
    await nextTick()
    groupNameInputRef.value?.focus()
  }
})
watch(isEditingDescription, async (editing) => {
  if (editing) {
    await nextTick()
    descriptionInputRef.value?.focus()
  }
})

/** 保存群名称 */
async function saveGroupName() {
  const id = groupId.value
  if (!id)
    return
  if (groupNameInput.value.length > GROUP_INFO_LIMIT.NAME_MAX_LENGTH) {
    showToast(t('chat.info.groupNameTooLong').replace('{max}', String(GROUP_INFO_LIMIT.NAME_MAX_LENGTH)), 'error')
    return
  }
  savingGroupName.value = true
  try {
    // 记录旧群名（updateGroupInfo 会同步更新 store，必须先取）
    const prevGroupName = stores.group.getGroupById(id)?.groupName
    await updateGroupInfo(id, { name: groupNameInput.value })
    isEditingGroupName.value = false
    // 发布方本地插入灰色通知：SDK 的 onGroupInfoChanged 事件不回推操作者本人，
    // 仅名称实际变更时插入，与接收方文案保持一致
    if (prevGroupName && prevGroupName !== groupNameInput.value) {
      insertChatNotice(stores, id, CONVERSATION_TYPE.GROUPCHAT, {
        eventType: NOTICE_EVENT_TYPE.GROUP_NAME_CHANGED,
        params: { name: groupNameInput.value },
        defaultText: t('chat.notice.groupNameChanged').replace('{name}', groupNameInput.value),
      })
    }
    // 同步会话名称：会话列表/聊天头部/详情抽屉均展示 conversation.name，
    // 否则需刷新（重新同步会话）才能看到新群名
    stores.conversation.updateConversation(id, { name: groupNameInput.value })
    showToast(t('chat.info.groupInfoUpdated', '更新成功'), 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.groupInfoUpdateFailed', '更新失败'), 'error')
  }
  finally {
    savingGroupName.value = false
  }
}

/** 取消群名称编辑 */
function cancelEditGroupName() {
  groupNameInput.value = props.conversation?.name || ''
  isEditingGroupName.value = false
}

/** 保存群描述 */
async function saveDescription() {
  const id = groupId.value
  if (!id)
    return
  if (descriptionInput.value.length > GROUP_INFO_LIMIT.DESCRIPTION_MAX_LENGTH) {
    showToast(t('chat.info.groupDescriptionTooLong').replace('{max}', String(GROUP_INFO_LIMIT.DESCRIPTION_MAX_LENGTH)), 'error')
    return
  }
  savingDescription.value = true
  try {
    await updateGroupInfo(id, { description: descriptionInput.value })
    isEditingDescription.value = false
    // 重新拉取群详情，确保 store 中的 description 与后端一致并触发 UI 回显
    await fetchGroupInfo(id)
    showToast(t('chat.info.groupInfoUpdated', '更新成功'), 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.groupInfoUpdateFailed', '更新失败'), 'error')
  }
  finally {
    savingDescription.value = false
  }
}

/** 群成员列表二级页面状态 */
const showMemberList = ref(false)
const memberListRef = ref<InstanceType<typeof GroupMemberList>>()

/** 是否展示「添加成员」按钮：群主/管理员始终可邀请；普通成员需 group.allowInvites 为 true */
const canAddMember = computed(() => {
  if (!currentUserId.value)
    return false
  if (isOwner.value || isAdmin.value)
    return true
  return group.value?.allowInvites === true
})

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
      showMemberList.value = false
    }
  },
  { immediate: true },
)

/** 弹窗状态 */
const confirmModal = ref<{
  show: boolean
  title: string
  content: string
  action: 'leave' | 'destroy' | 'clear' | 'deleteConversation' | 'transferOwner' | null
  /** transferOwner 专用：新群主用户 ID */
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
async function onMuteMember(member: UiGroupMember) {
  const id = groupId.value
  if (!id)
    return
  try {
    // SDK 5.0.0+ muteDuration 单位为毫秒，-1 表示永久禁言，与群管理-禁言列表添加操作保持一致
    await muteGroupMembers(id, [member.userId], -1)
    showToast(t('toast.success', '操作成功'), 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('toast.error', '操作失败'), 'error')
  }
}

async function onUnmuteMember(member: UiGroupMember) {
  const id = groupId.value
  if (!id)
    return
  try {
    await unmuteGroupMembers(id, [member.userId])
    showToast(t('toast.success', '操作成功'), 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('toast.error', '操作失败'), 'error')
  }
}

async function onBlockMember(member: UiGroupMember) {
  const id = groupId.value
  if (!id)
    return
  try {
    await blockGroupMembers(id, [member.userId])
    showToast(t('toast.success', '操作成功'), 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('toast.error', '操作失败'), 'error')
  }
}

async function onUnblockMember(member: UiGroupMember) {
  const id = groupId.value
  if (!id)
    return
  try {
    await unblockGroupMembers(id, [member.userId])
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
  confirmModal.value.show = false
  confirmModal.value.action = null
  confirmModal.value.targetUserId = undefined
  confirmModal.value.targetUserName = undefined
}

/** 群聊 footer：退出/解散 */
function onLeaveOrDelete() {
  openConfirm(isOwner.value ? 'destroy' : 'leave')
}

function onClearHistory() {
  openConfirm('clear')
}

/** 单聊 footer：删除会话（清空记录并删除会话本身） */
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
  showMemberList.value = true
}

function onViewMembersForTransfer() {
  showMemberList.value = true
}

function onViewMembersForAdmin() {
  showMemberList.value = true
}

function closeMemberList() {
  showMemberList.value = false
}

function onChatMember(member: UiGroupMember) {
  emit('update:show', false)
  emit('chat-member', member)
}

const memberListTitle = computed(() => t('chat.info.groupMembers', '群成员'))

function onAddMember() {
  const id = groupId.value
  if (id)
    emit('add-member', id)
}

const displayedMembers = computed(() => members.value.slice(0, 6))
const hasMoreMembers = computed(() => members.value.length > displayedMembers.value.length)

/** 暴露成员列表操作方法供父组件调用 */
defineExpose({
  /** 移除成员（更新 store 成员缓存） */
  removeMember: (userId: string) => memberListRef.value?.removeMember(userId),
  /** 设置成员角色（更新 store 成员缓存） */
  setMemberRole: (userId: string, role: UiGroupMember['role']) => memberListRef.value?.setMemberRole(userId, role),
  /** 刷新成员列表 */
  refreshMemberList: () => memberListRef.value?.refresh(),
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
  showMemberList: showMemberList.value,
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
    @update:show="emit('update:show', $event)"
    @close="onClose"
  >
    <!-- Header 插槽 -->
    <template #header>
      <slot name="drawer-header" v-bind="drawerSlotScope">
        <div v-if="!showMemberList" class="chat-info-drawer__header">
          <!-- 全屏模式（移动端独立页面）：左侧返回箭头替代右上角关闭 -->
          <IconButton
            v-if="props.fullscreen"
            class="chat-info-drawer__back"
            icon="chevron/left"
            size="small"
            variant="ghost"
            :title="t('button.back', '返回')"
            @click="onClose"
          />
          <!-- 单聊标题左对齐（设计稿），群聊保持居中：居中需要左侧占位平衡关闭按钮 -->
          <span v-else-if="isGroup" class="chat-info-drawer__header-placeholder" />
          <span class="chat-info-drawer__title" :class="{ 'chat-info-drawer__title--left': !isGroup && !props.fullscreen }">
            {{ isGroup ? t('chat.info.titleGroup') : t('chat.info.titleFriend') }}
          </span>
          <IconButton
            v-if="!props.fullscreen"
            class="chat-info-drawer__close"
            icon="xmark/bold"
            :icon-size="14"
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
            size="small"
            variant="ghost"
            :title="t('button.back', '返回')"
            @click="closeMemberList"
          />
          <span class="chat-info-drawer__title">{{ memberListTitle }}</span>
          <span class="chat-info-drawer__header-placeholder" />
        </div>
      </slot>
    </template>

    <!-- Body 默认插槽 -->
    <div class="chat-info-drawer__body">
      <template v-if="!showMemberList">
        <slot name="drawer-profile" v-bind="drawerSlotScope">
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
          <!-- 群聊：资料卡（群名/群描述可编辑） -->
          <div v-else class="chat-info-drawer__section chat-info-drawer__section--profile">
            <div class="chat-info-drawer__profile">
              <Avatar :name="displayName" :src="displayAvatar" :size="64" />
              <!-- 群聊：群名称可编辑 -->
              <div v-if="isGroup" class="chat-info-drawer__name-row">
                <template v-if="!isEditingGroupName">
                  <span class="chat-info-drawer__name">{{ displayName }}</span>
                  <IconButton
                    v-if="isOwner"
                    icon="rect/pencil"
                    size="small"
                    type="primary"
                    :title="t('chat.info.edit', '编辑')"
                    @click="isEditingGroupName = true"
                  />
                </template>
                <div v-else class="chat-info-drawer__inline-edit">
                  <input
                    ref="groupNameInputRef"
                    v-model="groupNameInput"
                    class="chat-info-drawer__inline-input"
                    :placeholder="displayName"
                    :maxlength="GROUP_INFO_LIMIT.NAME_MAX_LENGTH"
                    @keydown.enter="saveGroupName"
                    @keydown.esc="cancelEditGroupName"
                  >
                  <div
                    class="chat-info-drawer__char-count"
                    :class="{ 'is-near-limit': groupNameInput.length > GROUP_INFO_LIMIT.NAME_MAX_LENGTH * 0.9 }"
                  >
                    {{ formatCharCount(groupNameInput.length, GROUP_INFO_LIMIT.NAME_MAX_LENGTH) }}
                  </div>
                  <div class="chat-info-drawer__inline-edit-actions">
                    <IconButton
                      icon="xmark/bold"
                      size="small"
                      type="danger"
                      :title="t('button.cancel', '取消')"
                      @click="cancelEditGroupName"
                    />
                    <IconButton
                      class="chat-info-drawer__inline-save"
                      icon="check/single"
                      size="small"
                      type="success"
                      :disabled="savingGroupName"
                      :title="t('chat.info.save', '保存')"
                      @click="saveGroupName"
                    />
                  </div>
                </div>
              </div>
              <!-- 群聊：群描述（弱化，合并为普通说明文字） -->
              <div v-if="isGroup && (group?.description || isOwner)" class="chat-info-drawer__description-row">
                <template v-if="!isEditingDescription">
                  <span class="chat-info-drawer__description-text" :class="{ 'is-placeholder': !group?.description }">
                    {{ group?.description || t('chat.info.noGroupDescription', '暂无群介绍') }}
                  </span>
                  <IconButton
                    v-if="isOwner"
                    icon="rect/pencil"
                    size="small"
                    type="primary"
                    :title="t('chat.info.edit', '编辑')"
                    @click.stop="isEditingDescription = true"
                  />
                </template>
                <div v-else class="chat-info-drawer__inline-edit chat-info-drawer__inline-edit--description">
                  <textarea
                    ref="descriptionInputRef"
                    v-model="descriptionInput"
                    class="chat-info-drawer__inline-textarea"
                    :placeholder="t('chat.info.noGroupDescription', '暂无群介绍')"
                    rows="2"
                    :maxlength="GROUP_INFO_LIMIT.DESCRIPTION_MAX_LENGTH"
                    @keydown.esc="isEditingDescription = false"
                  />
                  <div
                    class="chat-info-drawer__char-count"
                    :class="{ 'is-near-limit': descriptionInput.length > GROUP_INFO_LIMIT.DESCRIPTION_MAX_LENGTH * 0.9 }"
                  >
                    {{ formatCharCount(descriptionInput.length, GROUP_INFO_LIMIT.DESCRIPTION_MAX_LENGTH) }}
                  </div>
                  <div class="chat-info-drawer__inline-edit-actions">
                    <IconButton
                      icon="xmark/bold"
                      size="small"
                      type="danger"
                      :title="t('button.cancel', '取消')"
                      @click="isEditingDescription = false"
                    />
                    <IconButton
                      class="chat-info-drawer__inline-save"
                      icon="check/single"
                      size="small"
                      type="success"
                      :disabled="savingDescription"
                      :title="t('chat.info.save', '保存')"
                      @click="saveDescription"
                    />
                  </div>
                </div>
              </div>
              <div class="chat-info-drawer__id">
                <CopyableText :text="props.conversation?.id || ''" label="ID:" />
              </div>
            </div>
          </div>
        </slot>

        <!-- 会话设置：消息搜索 / 免打扰 / 置顶（单群通用，conversation 级状态） -->
        <slot name="drawer-settings" v-bind="drawerSlotScope">
          <div class="chat-info-drawer__settings">
            <Cell
              v-if="props.showMessageSearch"
              :title="t('message.search.title')"
              size="compact"
              show-arrow
              border="bottom"
              :inset-hover="false"
              @click="onOpenMessageSearch"
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

        <!-- 群聊：群公告 -->
        <div v-if="isGroup" class="chat-info-drawer__section-group">
          <slot name="drawer-announcement" v-bind="drawerSlotScope">
            <GroupAnnouncement :group-id="groupId" :loading="loadingGroup" />
          </slot>
        </div>

        <!-- 群聊：成员列表 -->
        <div v-if="isGroup" class="chat-info-drawer__section-group">
          <div class="chat-info-drawer__section-label-row">
            <span class="chat-info-drawer__section-label">{{ t('chat.info.groupMembers') }} <span class="chat-info-drawer__count">({{ memberCount }})</span></span>
          </div>
          <slot name="drawer-members" v-bind="drawerSlotScope">
            <div class="chat-info-drawer__section">
              <div class="chat-info-drawer__member-grid" @click="onViewAllMembers">
                <ChatInfoDrawerMemberCell
                  v-for="member in displayedMembers"
                  :key="member.userId"
                  :member="member"
                />
                <div
                  v-if="canAddMember"
                  class="chat-info-drawer__member-cell chat-info-drawer__member-cell--add"
                  @click.stop="onAddMember"
                >
                  <Icon name="plus" :size="48" />
                </div>
              </div>
              <button v-if="hasMoreMembers || members.length === 0" class="chat-info-drawer__view-all" @click.stop="onViewAllMembers">
                {{ members.length === 0 ? t('chat.info.viewAllMembersEmpty') : t('chat.info.viewAllMembers') }}
              </button>
            </div>
          </slot>
        </div>

        <!-- 群聊：群主/管理员专属入口 -->
        <div v-if="isGroup && isOwner" class="chat-info-drawer__section-group">
          <div class="chat-info-drawer__section-label">
            {{ t('chat.info.groupAdminActions', '群主操作') }}
          </div>
          <slot name="drawer-admin-actions" v-bind="drawerSlotScope">
            <div class="chat-info-drawer__section chat-info-drawer__section--admin-actions">
              <Cell
                :title="t('chat.info.transferOwnerEntry', '转让群主')"
                size="compact"
                :inset-hover="false"
                @click="onViewMembersForTransfer"
              >
                <template #leading>
                  <Icon name="crown" :size="18" />
                </template>
              </Cell>
              <Cell
                :title="t('chat.info.setAdminEntry', '设置管理员')"
                size="compact"
                :inset-hover="false"
                @click="onViewMembersForAdmin"
              >
                <template #leading>
                  <Icon name="shield/person" :size="18" />
                </template>
              </Cell>
            </div>
          </slot>
        </div>

        <!-- 群聊：群管理 -->
        <div v-if="isGroup" class="chat-info-drawer__section-group">
          <div class="chat-info-drawer__section-label">
            {{ t('group.management.title', '群管理') }}
          </div>
          <slot name="drawer-management" v-bind="drawerSlotScope">
            <div class="chat-info-drawer__section chat-info-drawer__section--management">
              <GroupManagementSection
                :group-id="groupId"
                :display-mode="props.groupManagementDisplayMode"
                :show-mute-all="props.showMuteAll"
                :show-mute-list="props.showMuteList"
                :show-blocklist="props.showBlocklist"
                :show-allowlist="props.showAllowlist"
                :show-shared-files="props.showSharedFiles"
                :show-join-requests="props.showJoinRequests"
                @group-operation="emit('group-operation', $event)"
              />
            </div>
          </slot>
        </div>

        <!-- 通用操作（默认内容仅群聊：单聊的清空/删除入口已移至 footer 圆角按钮组） -->
        <slot name="drawer-actions" v-bind="drawerSlotScope">
          <div v-if="isGroup" class="chat-info-drawer__section">
            <Button type="danger-outline" block @click="onClearHistory">
              <Icon name="trash" :size="18" />
              {{ t('chat.info.clearHistory') }}
            </Button>
          </div>
        </slot>
      </template>

      <!-- 群成员列表：二级页面 -->
      <slot v-else name="drawer-member-detail" v-bind="drawerSlotScope">
        <div class="chat-info-drawer__member-detail">
          <GroupMemberList
            v-if="groupId"
            ref="memberListRef"
            :group-id="groupId"
            :current-user-id="currentUserId"
            :allow-chat="props.allowChat"
            :show-header="false"
            closable
            @close="closeMemberList"
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
      </slot>
    </div>

    <!-- Footer 插槽 -->
    <template v-if="!showMemberList" #footer>
      <slot name="drawer-footer" v-bind="drawerSlotScope">
        <div class="chat-info-drawer__actions">
          <!-- 单聊：清空聊天记录 + 删除会话（圆角胶囊按钮，设计稿） -->
          <template v-if="!isGroup">
            <Button type="default" block class="chat-info-drawer__pill-btn" @click="onClearHistory">
              {{ t('chat.info.clearHistory') }}
            </Button>
            <Button type="default" block class="chat-info-drawer__pill-btn chat-info-drawer__pill-btn--danger" @click="onDeleteConversation">
              {{ t('chat.info.deleteConversation', '删除会话') }}
            </Button>
          </template>
          <!-- 群聊：退出/解散 -->
          <Button v-else type="danger-outline" block @click="onLeaveOrDelete">
            {{ isOwner ? t('chat.info.destroyGroup') : t('chat.info.leaveGroup') }}
          </Button>
        </div>
      </slot>
    </template>
  </ChatDrawer>

  <Modal
    v-model:show="confirmModal.show"
    :title="confirmModal.title"
    :confirm-text="t('button.confirm')"
    :cancel-text="t('button.cancel')"
    @confirm="onModalConfirm"
  >
    <div class="chat-info-drawer__confirm-body">
      <p>{{ confirmModal.content }}</p>
      <label
        v-if="confirmModal.action === 'deleteConversation'"
        class="chat-info-drawer__confirm-checkbox"
      >
        <input
          v-model="confirmModal.deleteRoaming"
          type="checkbox"
        >
        <span>{{ t('chat.info.deleteRoamingMessages', '同时删除历史消息') }}</span>
      </label>
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

/* 关闭图标颜色按设计稿为纯黑（可用 --uikit-drawer-close-color 主题化覆盖，如深色主题） */
.chat-info-drawer__header .chat-info-drawer__close {
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

.chat-info-drawer__header-placeholder {
  width: 32px;
  height: 32px;
}

.chat-info-drawer__title {
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  color: var(--uikit-text-primary);
  flex: 1;
  text-align: center;
}

/* 单聊（好友详情）标题左对齐（设计稿）；群聊保持居中 */
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

.chat-info-drawer__section-label {
  font-size: var(--uikit-font-size-13);
  font-weight: 500;
  color: var(--uikit-text-secondary);
  padding: 0 16px;
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

.chat-info-drawer__section--profile {
  padding: calc(var(--uikit-drawer-padding, 16px) * 1.5) var(--uikit-drawer-padding, 16px);
}

.chat-info-drawer__profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.chat-info-drawer__name {
  font-size: var(--uikit-font-size-18);
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.chat-info-drawer__id {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
}

.chat-info-drawer__count {
  font-weight: 400;
  color: var(--uikit-text-secondary);
}

/* 群信息内联编辑 */
.chat-info-drawer__name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.chat-info-drawer__inline-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-info-drawer__inline-input {
  padding: 8px 12px;
  border: 1px solid var(--uikit-border-color);
  border-radius: var(--uikit-components-radius);
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  text-align: center;
  outline: none;
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
}

.chat-info-drawer__inline-input:focus {
  border-color: var(--uikit-primary-color);
}

.chat-info-drawer__inline-textarea {
  padding: 8px 12px;
  border: 1px solid var(--uikit-border-color);
  border-radius: var(--uikit-components-radius);
  font-size: var(--uikit-font-size-14);
  line-height: 1.5;
  outline: none;
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  resize: vertical;
  font-family: inherit;
}

.chat-info-drawer__inline-textarea:focus {
  border-color: var(--uikit-primary-color);
}

.chat-info-drawer__inline-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.chat-info-drawer__char-count {
  align-self: flex-end;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-tertiary);
  line-height: 1;
}

.chat-info-drawer__char-count.is-near-limit {
  color: var(--uikit-warning-color, var(--uikit-error-color, #f59e0b));
}

.chat-info-drawer__description {
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-primary);
  line-height: 1.6;
  word-break: break-word;
}

.chat-info-drawer__description-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  max-width: 260px;
  font-size: var(--uikit-font-size-13);
  line-height: 1.5;
  color: var(--uikit-text-secondary);
  text-align: center;
}

.chat-info-drawer__description-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
}

.chat-info-drawer__description-text.is-placeholder {
  opacity: 0.7;
}

.chat-info-drawer__inline-edit--description {
  width: 100%;
  max-width: 320px;
}

.chat-info-drawer__placeholder {
  color: var(--uikit-text-secondary);
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

/* 会话设置行组：行间 1px 分隔线、内容 12px 内收均为 Cell 分割线模式（border="bottom"）的默认风格，
   此处无需覆盖，详见 uikit-core cell.vue「分割线模式」注释 */
.chat-info-drawer__settings {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.chat-info-drawer__member-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 16px;
}

.chat-info-drawer__member-grid > * {
  flex: 0 0 calc((100% - 4 * 16px) / 5);
  max-width: calc((100% - 4 * 16px) / 5);
}

.chat-info-drawer__member-cell--add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 2px;
  cursor: pointer;
  border-radius: var(--uikit-components-radius, 8px);
}

.chat-info-drawer__member-cell--add :deep(.uikit-icon) {
  width: 48px;
  height: 48px;
  color: var(--uikit-icon-muted);
  transition: transform var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .chat-info-drawer__member-cell--add:hover :deep(.uikit-icon) {
    transform: scale(1.2);
  }
}

.chat-info-drawer__view-all {
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
   删除会话为灰底红字） */
.chat-info-drawer__actions .chat-info-drawer__pill-btn {
  height: 42px;
  padding: 12px 4px;
  border-radius: 999px;
}

.chat-info-drawer__actions .chat-info-drawer__pill-btn--danger {
  color: var(--uikit-danger-color);
}

.chat-info-drawer__member-detail {
  flex: 0 0 auto;
  min-height: 0;
  overflow: hidden;
  /* body 无内边距，成员二级页内容自行内收 */
  padding: 0 16px;
}

/* 内容少时卡片高度由成员列表决定，不强制撑满抽屉；成员多时由外层 body 滚动 */
.chat-info-drawer__member-detail .group-member-list {
  height: auto;
}

.chat-info-drawer__section--admin-actions {
  display: flex;
  flex-direction: column;
  padding: 4px;
  /* 卡片内操作项：紧凑 padding + hover 背景顶满 */
  --uikit-item-hover-padding-x: 12px;
  --uikit-cell-height-compact: 40px;
}

.chat-info-drawer__section--management {
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

.chat-info-drawer__confirm-checkbox input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--uikit-primary-color);
  cursor: pointer;
}
</style>
