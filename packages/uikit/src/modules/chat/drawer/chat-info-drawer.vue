<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import Icon from '../../../components/icon/icon.vue'
import IconButton from '../../../components/icon-button/icon-button.vue'
import Modal from '../../../components/modal/modal.vue'
import Button from '../../../components/button/button.vue'
import Cell from '../../../components/cell/cell.vue'
import { useThemeStore } from '../../../store/theme'
import { useLocale } from '../../../locale'
import { useContact } from '../../../composables/use-contact'
import { useToast } from '../../../composables/use-toast'
import { useUserInfo } from '../../../composables/use-user-info'
import { useGroup } from '../../../composables/use-group'
import { useUIKit } from '../../../composables/use-uikit'
import type { UiConversation as Conversation, UiGroupMember } from '../../../sdk/types'
import GroupManagementSection from '../../group/group-management-section.vue'
import GroupMemberList from '../../group/group-member-list.vue'
import ChatInfoDrawerMemberCell from './chat-info-drawer-member-cell.vue'
import ChatDrawer from './chat-drawer.vue'

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
}

const props = withDefaults(defineProps<ChatInfoDrawerProps>(), {
  groupManagementDisplayMode: 'drawer',
  allowChat: 'all',
  showMuteAll: true,
  showMuteList: true,
  showBlocklist: true,
  showAllowlist: false,
  showSharedFiles: true,
  showJoinRequests: false,
})
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'leave-group', groupId: string): void
  (e: 'destroy-group', groupId: string): void
  (e: 'clear-history', payload: { id: string, type: 'singleChat' | 'groupChat' }): void
  (e: 'add-member', groupId: string): void
  (e: 'group-operation', payload: { type: string, groupId: string, userId?: string }): void
  // 群成员列表事件
  (e: 'chat-member', member: UiGroupMember): void
  (e: 'remove-member', member: UiGroupMember): void
  (e: 'set-admin', member: UiGroupMember): void
  (e: 'remove-admin', member: UiGroupMember): void
}>()

const themeStore = useThemeStore()
const { t } = useLocale()
const { setContactRemark, deleteContact } = useContact()
const { show: showToast } = useToast()
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

const closeBtnClass = computed(() =>
  themeStore.componentsShape === 'square' ? 'chat-info-drawer__close--square' : '',
)

/** 备注编辑状态 */
const isEditingRemark = ref(false)
const remarkInputRef = ref<HTMLInputElement>()
const remarkInput = ref('')
const savingRemark = ref(false)

// ===== 群信息编辑状态 =====
/** 群名称编辑 */
const isEditingGroupName = ref(false)
const groupNameInputRef = ref<HTMLInputElement>()
const groupNameInput = ref('')
const savingGroupName = ref(false)
/** 群公告编辑 */
const isEditingAnnouncement = ref(false)
const announcementInputRef = ref<HTMLTextAreaElement>()
const announcementInput = ref('')
const savingAnnouncement = ref(false)
/** 群描述编辑 */
const isEditingDescription = ref(false)
const descriptionInputRef = ref<HTMLTextAreaElement>()
const descriptionInput = ref('')
const savingDescription = ref(false)

const peerUserId = computed(() =>
  props.conversation?.type === 'singleChat' ? props.conversation.id : undefined,
)
const { userInfo, avatarUrl, contact } = useUserInfo(peerUserId)

watch(
  () => contact.value?.remark,
  (remark) => {
    if (!isEditingRemark.value)
      remarkInput.value = remark || ''
  },
  { immediate: true },
)

/** 当前名称/备注：单聊按 备注 > 资料昵称 > 会话名 > unnamed */
const displayName = computed(() => {
  if (props.conversation?.type === 'groupChat')
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
  if (props.conversation?.type === 'groupChat')
    return props.conversation.avatar
  return avatarUrl.value || props.conversation?.avatar
})

/** 关闭抽屉 */
function onClose() {
  emit('update:show', false)
  isEditingRemark.value = false
  isEditingGroupName.value = false
  isEditingAnnouncement.value = false
  isEditingDescription.value = false
}

/** 保存备注 */
async function saveRemark() {
  const userId = peerUserId.value
  if (!userId)
    return

  savingRemark.value = true
  try {
    await setContactRemark(userId, remarkInput.value)
    isEditingRemark.value = false
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.remarkSaveFailed') || '备注设置失败')
  }
  finally {
    savingRemark.value = false
  }
}

/** 取消备注编辑 */
function cancelEditRemark() {
  remarkInput.value = contact.value?.remark || ''
  isEditingRemark.value = false
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
const announcement = computed(() =>
  groupId.value ? getGroupAnnouncement(groupId.value) : '',
)
const currentUserRole = computed(() => {
  if (!currentUserId.value)
    return undefined
  return members.value.find(m => m.userId === currentUserId.value)?.role
})

const isOwner = computed(() => currentUserRole.value === 'owner')
const isAdmin = computed(() => currentUserRole.value === 'admin')
const isAdminOrOwner = computed(() => isOwner.value || isAdmin.value)

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
  () => announcement.value,
  (val) => {
    if (!isEditingAnnouncement.value)
      announcementInput.value = val || ''
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
watch(isEditingRemark, async (editing) => {
  if (editing) {
    await nextTick()
    remarkInputRef.value?.focus()
  }
})
watch(isEditingGroupName, async (editing) => {
  if (editing) {
    await nextTick()
    groupNameInputRef.value?.focus()
  }
})
watch(isEditingAnnouncement, async (editing) => {
  if (editing) {
    await nextTick()
    announcementInputRef.value?.focus()
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
  savingGroupName.value = true
  try {
    await updateGroupInfo(id, { name: groupNameInput.value })
    isEditingGroupName.value = false
    showToast(t('chat.info.groupInfoUpdated') || '更新成功')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.groupInfoUpdateFailed') || '更新失败')
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

/** 保存群公告 */
async function saveAnnouncement() {
  const id = groupId.value
  if (!id)
    return
  savingAnnouncement.value = true
  try {
    await updateGroupAnnouncement(id, announcementInput.value)
    isEditingAnnouncement.value = false
    showToast(t('chat.info.groupInfoUpdated') || '更新成功')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.groupInfoUpdateFailed') || '更新失败')
  }
  finally {
    savingAnnouncement.value = false
  }
}

/** 保存群描述 */
async function saveDescription() {
  const id = groupId.value
  if (!id)
    return
  savingDescription.value = true
  try {
    await updateGroupInfo(id, { description: descriptionInput.value })
    isEditingDescription.value = false
    showToast(t('chat.info.groupInfoUpdated') || '更新成功')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.groupInfoUpdateFailed') || '更新失败')
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
    console.warn('[ChatInfoDrawer] load group data failed:', err)
    showToast(t('chat.info.loadGroupInfoFailed') || '群信息加载失败')
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
  action: 'leave' | 'destroy' | 'clear' | 'deleteFriend' | 'transferOwner' | null
  /** transferOwner 专用：新群主用户 ID */
  targetUserId?: string
}>({
  show: false,
  title: '',
  content: '',
  action: null,
})

function openConfirm(action: 'leave' | 'destroy' | 'clear' | 'deleteFriend') {
  const id = props.conversation?.id
  if (!id)
    return
  if (action === 'leave') {
    confirmModal.value = {
      show: true,
      title: t('chat.info.leaveGroup') || '退出群聊',
      content: t('chat.info.leaveGroupConfirm') || '确定退出该群聊吗？',
      action,
    }
  }
  else if (action === 'destroy') {
    confirmModal.value = {
      show: true,
      title: t('chat.info.destroyGroup') || '解散群聊',
      content: t('chat.info.destroyGroupConfirm') || '确定解散该群聊吗？解散后无法恢复。',
      action,
    }
  }
  else if (action === 'deleteFriend') {
    confirmModal.value = {
      show: true,
      title: t('chat.info.deleteFriend') || '删除好友',
      content: t('chat.info.deleteFriendConfirm') || '确定删除该好友吗？',
      action,
    }
  }
  else {
    confirmModal.value = {
      show: true,
      title: t('chat.info.clearHistory') || '清空聊天记录',
      content: t('chat.info.clearHistoryConfirm') || '确定清空当前会话的聊天记录吗？',
      action,
    }
  }
}

/** 单聊：删除好友 */
async function doDeleteFriend(userId: string) {
  try {
    await deleteContact(userId)
    showToast(t('chat.info.deleteFriendSuccess') || '好友已删除', 'success')
    onClose()
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.deleteFriendFailed') || '删除好友失败', 'error')
  }
}

// ===== 群成员管理：禁言/拉黑（domain 内部已同步 store 的禁言/黑名单缓存） =====
async function onMuteMember(member: UiGroupMember) {
  const id = groupId.value
  if (!id)
    return
  try {
    // muteDuration -1：永久禁言，与群管理-禁言列表添加操作保持一致
    await muteGroupMembers(id, [member.userId], -1)
    showToast(t('toast.success') || '操作成功', 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('toast.error') || '操作失败', 'error')
  }
}

async function onUnmuteMember(member: UiGroupMember) {
  const id = groupId.value
  if (!id)
    return
  try {
    await unmuteGroupMembers(id, [member.userId])
    showToast(t('toast.success') || '操作成功', 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('toast.error') || '操作失败', 'error')
  }
}

async function onBlockMember(member: UiGroupMember) {
  const id = groupId.value
  if (!id)
    return
  try {
    await blockGroupMembers(id, [member.userId])
    showToast(t('toast.success') || '操作成功', 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('toast.error') || '操作失败', 'error')
  }
}

async function onUnblockMember(member: UiGroupMember) {
  const id = groupId.value
  if (!id)
    return
  try {
    await unblockGroupMembers(id, [member.userId])
    showToast(t('toast.success') || '操作成功', 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('toast.error') || '操作失败', 'error')
  }
}

/** 转让群主：二次确认（参照删除好友的确认弹窗模式） */
function onTransferOwner(member: UiGroupMember) {
  if (!groupId.value)
    return
  confirmModal.value = {
    show: true,
    title: t('group.memberList.transferOwner') || '转让群主',
    content: (t('chat.info.transferOwnerConfirm') || '确定将群主转让给 {name} 吗？转让后你将成为普通成员。')
      .replace('{name}', member.nickname || member.userId),
    action: 'transferOwner',
    targetUserId: member.userId,
  }
}

async function doTransferOwner(userId: string) {
  const id = groupId.value
  if (!id)
    return
  try {
    await changeGroupOwner(id, userId)
    // 同步本地成员角色缓存：新群主置为 owner，自己降级为 member，避免角色闪回
    stores.group.updateGroupMemberRole(id, userId, 'owner')
    if (currentUserId.value)
      stores.group.updateGroupMemberRole(id, currentUserId.value, 'member')
    showToast(t('chat.info.transferOwnerSuccess') || '群主已转让', 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.transferOwnerFailed') || '转让群主失败', 'error')
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
    emit('clear-history', { id, type })
  }
  else if (action === 'deleteFriend') {
    void doDeleteFriend(id)
  }
  else if (action === 'transferOwner') {
    const targetUserId = confirmModal.value.targetUserId
    if (targetUserId)
      void doTransferOwner(targetUserId)
  }
  confirmModal.value.show = false
  confirmModal.value.action = null
  confirmModal.value.targetUserId = undefined
}

function onLeaveOrDelete() {
  if (props.isGroup) {
    openConfirm(isOwner.value ? 'destroy' : 'leave')
  }
  else {
    // 单聊：删除好友（二次确认后调用 deleteContact）
    openConfirm('deleteFriend')
  }
}

function onClearHistory() {
  openConfirm('clear')
}

function onViewAllMembers() {
  showMemberList.value = true
}

function closeMemberList() {
  showMemberList.value = false
}

function onChatMember(member: UiGroupMember) {
  emit('update:show', false)
  emit('chat-member', member)
}

const memberListTitle = computed(() => t('chat.info.groupMembers') || '群成员')

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
</script>

<template>
  <ChatDrawer
    :show="props.show"
    :overlay="false"
    :offset-top="props.offsetTop"
    @update:show="emit('update:show', $event)"
    @close="onClose"
  >
    <!-- Header 插槽 -->
    <template #header>
      <div v-if="!showMemberList" class="chat-info-drawer__header">
        <span class="chat-info-drawer__header-placeholder" />
        <span class="chat-info-drawer__title">
          {{ isGroup ? t('chat.info.titleGroup') : t('chat.info.titleFriend') }}
        </span>
        <button class="chat-info-drawer__close" :class="closeBtnClass" @click="onClose">
          <Icon name="actions/xmark_thick" :size="16" />
        </button>
      </div>
      <div v-else class="chat-info-drawer__header">
        <button class="chat-info-drawer__back" @click="closeMemberList">
          <Icon name="arrows/arrowto" :size="16" />
        </button>
        <span class="chat-info-drawer__title">{{ memberListTitle }}</span>
        <span class="chat-info-drawer__header-placeholder" />
      </div>
    </template>

    <!-- Body 默认插槽 -->
    <div class="chat-info-drawer__body">
      <template v-if="!showMemberList">
        <div class="chat-info-drawer__section chat-info-drawer__section--profile">
          <div class="chat-info-drawer__profile">
            <Avatar :name="displayName" :src="displayAvatar" :size="64" />
            <!-- 群聊：群名称可编辑 -->
            <div v-if="isGroup" class="chat-info-drawer__name-row">
              <template v-if="!isEditingGroupName">
                <span class="chat-info-drawer__name">{{ displayName }}</span>
                <IconButton
                  v-if="isOwner"
                  icon="actions/edit"
                  size="small"
                  type="primary"
                  :title="t('chat.info.edit') || '编辑'"
                  @click="isEditingGroupName = true"
                />
              </template>
              <div v-else class="chat-info-drawer__inline-edit">
                <input
                  ref="groupNameInputRef"
                  v-model="groupNameInput"
                  class="chat-info-drawer__inline-input"
                  :placeholder="displayName"
                  @keydown.enter="saveGroupName"
                  @keydown.esc="cancelEditGroupName"
                >
                <div class="chat-info-drawer__inline-edit-actions">
                  <IconButton
                    icon="actions/xmark_thick"
                    size="small"
                    type="danger"
                    :title="t('button.cancel') || '取消'"
                    @click="cancelEditGroupName"
                  />
                  <IconButton
                    class="chat-info-drawer__inline-save"
                    icon="actions/check"
                    size="small"
                    type="success"
                    :disabled="savingGroupName"
                    :title="t('chat.info.save') || '保存'"
                    @click="saveGroupName"
                  />
                </div>
              </div>
            </div>
            <!-- 单聊：仅展示名称 -->
            <div v-else class="chat-info-drawer__name">
              {{ displayName }}
            </div>
            <div v-if="!isGroup" class="chat-info-drawer__id">
              ID: {{ conversation?.id }}
            </div>
          </div>
        </div>

        <!-- 单聊：备注编辑 -->
        <div v-if="!isGroup" class="chat-info-drawer__section-group">
          <div class="chat-info-drawer__section-label">
            {{ t('chat.info.remark') }}
          </div>
          <div class="chat-info-drawer__section">
            <div v-if="!isEditingRemark" class="chat-info-drawer__remark" @click="isEditingRemark = true">
              <span>{{ remarkInput || t('chat.info.remarkPlaceholder') }}</span>
              <IconButton
                icon="actions/edit"
                size="small"
                type="primary"
                :title="t('chat.info.edit') || '编辑'"
                @click.stop="isEditingRemark = true"
              />
            </div>
            <div v-else class="chat-info-drawer__remark-edit">
              <input
                ref="remarkInputRef"
                v-model="remarkInput"
                class="chat-info-drawer__remark-input"
                :placeholder="t('chat.info.remarkInputPlaceholder')"
                @keydown.enter="saveRemark"
                @keydown.esc="cancelEditRemark"
              >
              <IconButton
                icon="actions/xmark_thick"
                size="small"
                type="danger"
                :title="t('button.cancel') || '取消'"
                @click="cancelEditRemark"
              />
              <IconButton
                class="chat-info-drawer__remark-save"
                icon="actions/check"
                size="small"
                type="success"
                :disabled="savingRemark"
                :title="t('chat.info.save') || '保存'"
                @click="saveRemark"
              />
            </div>
          </div>
        </div>

        <!-- 群聊：群公告 -->
        <div v-if="isGroup" class="chat-info-drawer__section-group">
          <div class="chat-info-drawer__section-label-row">
            <span class="chat-info-drawer__section-label">{{ t('chat.info.groupAnnouncement') }}</span>
            <IconButton
              v-if="isAdminOrOwner && !isEditingAnnouncement"
              icon="actions/edit"
              size="small"
              type="primary"
              :title="t('chat.info.edit') || '编辑'"
              @click="isEditingAnnouncement = true"
            />
          </div>
          <div class="chat-info-drawer__section">
            <template v-if="!isEditingAnnouncement">
              <div class="chat-info-drawer__announcement">
                <span v-if="loadingGroup" class="chat-info-drawer__placeholder">{{ t('common.loading') }}</span>
                <span v-else-if="announcement">{{ announcement }}</span>
                <span v-else class="chat-info-drawer__placeholder">{{ t('chat.info.groupAnnouncementPlaceholder') }}</span>
              </div>
            </template>
            <div v-else class="chat-info-drawer__inline-edit">
              <textarea
                ref="announcementInputRef"
                v-model="announcementInput"
                class="chat-info-drawer__inline-textarea"
                :placeholder="t('chat.info.groupAnnouncementPlaceholder')"
                rows="3"
              />
              <div class="chat-info-drawer__inline-edit-actions">
                <IconButton
                  icon="actions/xmark_thick"
                  size="small"
                  type="danger"
                  :title="t('button.cancel') || '取消'"
                  @click="isEditingAnnouncement = false"
                />
                <IconButton
                  class="chat-info-drawer__inline-save"
                  icon="actions/check"
                  size="small"
                  type="success"
                  :disabled="savingAnnouncement"
                  :title="t('chat.info.save') || '保存'"
                  @click="saveAnnouncement"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 群聊：群描述 -->
        <div v-if="isGroup && (group?.description || isOwner)" class="chat-info-drawer__section-group">
          <div class="chat-info-drawer__section-label-row">
            <span class="chat-info-drawer__section-label">{{ t('chat.info.groupDescription') }}</span>
            <IconButton
              v-if="isOwner && !isEditingDescription"
              icon="actions/edit"
              size="small"
              type="primary"
              :title="t('chat.info.edit') || '编辑'"
              @click="isEditingDescription = true"
            />
          </div>
          <div class="chat-info-drawer__section">
            <template v-if="!isEditingDescription">
              <div v-if="group?.description" class="chat-info-drawer__description">
                {{ group.description }}
              </div>
              <div v-else class="chat-info-drawer__description">
                <span class="chat-info-drawer__placeholder">{{ t('chat.info.noGroupDescription') || '暂无群介绍' }}</span>
              </div>
            </template>
            <div v-else class="chat-info-drawer__inline-edit">
              <textarea
                ref="descriptionInputRef"
                v-model="descriptionInput"
                class="chat-info-drawer__inline-textarea"
                :placeholder="t('chat.info.noGroupDescription') || '暂无群介绍'"
                rows="3"
              />
              <div class="chat-info-drawer__inline-edit-actions">
                <IconButton
                  icon="actions/xmark_thick"
                  size="small"
                  type="danger"
                  :title="t('button.cancel') || '取消'"
                  @click="isEditingDescription = false"
                />
                <IconButton
                  class="chat-info-drawer__inline-save"
                  icon="actions/check"
                  size="small"
                  type="success"
                  :disabled="savingDescription"
                  :title="t('chat.info.save') || '保存'"
                  @click="saveDescription"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 群聊：成员列表 -->
        <div v-if="isGroup" class="chat-info-drawer__section-group">
          <div class="chat-info-drawer__section-label-row">
            <span class="chat-info-drawer__section-label">{{ t('chat.info.groupMembers') }} <span class="chat-info-drawer__count">({{ memberCount }})</span></span>
            <IconButton
              v-if="canAddMember"
              icon="actions/plus"
              size="small"
              type="primary"
              :title="t('chat.info.addMember')"
              @click="onAddMember"
            />
          </div>
          <div class="chat-info-drawer__section">
            <div class="chat-info-drawer__member-grid" @click="onViewAllMembers">
              <ChatInfoDrawerMemberCell
                v-for="member in displayedMembers"
                :key="member.userId"
                :member="member"
              />
            </div>
            <button v-if="hasMoreMembers || members.length === 0" class="chat-info-drawer__view-all" @click.stop="onViewAllMembers">
              {{ members.length === 0 ? t('chat.info.viewAllMembersEmpty') : t('chat.info.viewAllMembers') }}
            </button>
          </div>
        </div>

        <!-- 群聊：群管理 -->
        <div v-if="isGroup" class="chat-info-drawer__section-group">
          <div class="chat-info-drawer__section-label">{{ t('group.management.title') || '群管理' }}</div>
          <div class="chat-info-drawer__section">
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
        </div>

        <!-- 通用操作 -->
        <div class="chat-info-drawer__section">
          <Cell auto-height danger @click="onClearHistory">
            <template #leading>
              <Icon name="actions/trash" :size="18" />
            </template>
            <template #default>
              {{ t('chat.info.clearHistory') }}
            </template>
          </Cell>
        </div>
      </template>

      <!-- 群成员列表：二级页面 -->
      <div v-else class="chat-info-drawer__member-detail">
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
    </div>

    <!-- Footer 插槽 -->
    <template v-if="!showMemberList" #footer>
      <div class="chat-info-drawer__actions">
        <Button type="danger-outline" block @click="onLeaveOrDelete">
          {{ isGroup ? (isOwner ? t('chat.info.destroyGroup') : t('chat.info.leaveGroup')) : t('chat.info.deleteFriend') }}
        </Button>
      </div>
    </template>
  </ChatDrawer>

  <Modal
    v-model:show="confirmModal.show"
    :title="confirmModal.title"
    :confirm-text="t('button.confirm')"
    :cancel-text="t('button.cancel')"
    @confirm="onModalConfirm"
  >
    {{ confirmModal.content }}
  </Modal>
</template>

<style scoped>
.chat-info-drawer__header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--uikit-bg-secondary);
  gap: 12px;
}

.chat-info-drawer__close {
  background: none;
  border: none;
  color: var(--uikit-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--uikit-components-radius, 6px);
  padding: 0;
  transition: background-color 0.15s;
}

.chat-info-drawer__close:hover {
  background-color: var(--uikit-bg-secondary);
}

.chat-info-drawer__close--square {
  border-radius: 2px;
}

.chat-info-drawer__back {
  background: none;
  border: none;
  color: var(--uikit-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--uikit-components-radius, 6px);
  padding: 0;
  transition: background-color 0.15s;
}

.chat-info-drawer__back:hover {
  background-color: var(--uikit-bg-secondary);
}

.chat-info-drawer__header-placeholder {
  width: 32px;
  height: 32px;
}

.chat-info-drawer__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
  flex: 1;
  text-align: center;
}

.chat-info-drawer__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
  background-color: var(--uikit-bg-secondary);
  padding: 12px 16px;
  gap: 12px;
}

.chat-info-drawer__section-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.chat-info-drawer__section-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--uikit-text-secondary);
  padding: 0 4px;
}

.chat-info-drawer__section-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.chat-info-drawer__section {
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 12px);
  padding: 12px 16px;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--uikit-border-light, rgba(0, 0, 0, 0.04));
}

.chat-info-drawer__section--profile {
  padding: 24px 16px;
}

.chat-info-drawer__profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.chat-info-drawer__name {
  font-size: 18px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.chat-info-drawer__id {
  font-size: 13px;
  color: var(--uikit-text-secondary);
}

.chat-info-drawer__count {
  font-weight: 400;
  color: var(--uikit-text-secondary);
}

.chat-info-drawer__remark {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--uikit-text-primary);
  font-size: 14px;
  cursor: pointer;
}

.chat-info-drawer__remark-edit {
  display: flex;
  gap: 8px;
}

.chat-info-drawer__remark-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: var(--uikit-components-radius, 6px);
  font-size: 14px;
  outline: none;
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
}

.chat-info-drawer__remark-input:focus {
  border-color: var(--uikit-primary-color);
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
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: var(--uikit-components-radius, 6px);
  font-size: 16px;
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
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: var(--uikit-components-radius, 6px);
  font-size: 14px;
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

.chat-info-drawer__announcement,
.chat-info-drawer__description {
  font-size: 14px;
  color: var(--uikit-text-primary);
  line-height: 1.6;
  word-break: break-word;
}

.chat-info-drawer__placeholder {
  color: var(--uikit-text-secondary);
}

.chat-info-drawer__member-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px 8px;
}

.chat-info-drawer__view-all {
  width: 100%;
  margin-top: 12px;
  padding: 8px;
  border: none;
  background: none;
  color: var(--uikit-primary-color);
  font-size: 14px;
  cursor: pointer;
  border-radius: var(--uikit-components-radius, 6px);
}

.chat-info-drawer__view-all:hover {
  background-color: var(--uikit-bg-secondary);
}

.chat-info-drawer__actions {
  padding: 16px;
  background-color: var(--uikit-bg-secondary);
}

.chat-info-drawer__member-detail {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background-color: var(--uikit-bg-base);
}
</style>
