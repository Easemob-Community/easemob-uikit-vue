<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import Icon from '../../../components/icon/icon.vue'
import Modal from '../../../components/modal/modal.vue'
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
const { setContactRemark } = useContact()
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
  action: 'leave' | 'destroy' | 'clear' | null
}>({
  show: false,
  title: '',
  content: '',
  action: null,
})

function openConfirm(action: 'leave' | 'destroy' | 'clear') {
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
  else {
    confirmModal.value = {
      show: true,
      title: t('chat.info.clearHistory') || '清空聊天记录',
      content: t('chat.info.clearHistoryConfirm') || '确定清空当前会话的聊天记录吗？',
      action,
    }
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
  confirmModal.value.show = false
  confirmModal.value.action = null
}

function onLeaveOrDelete() {
  if (props.isGroup) {
    openConfirm(isOwner.value ? 'destroy' : 'leave')
  }
  else {
    // 单聊：删除好友（暂不实现）
    onClose()
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
  /** 移除成员（更新本地列表） */
  removeMember: (userId: string) => memberListRef.value?.removeMember(userId),
  /** 设置成员角色（更新本地列表） */
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
        <div class="chat-info-drawer__profile">
          <Avatar :name="displayName" :src="displayAvatar" :size="64" />
          <!-- 群聊：群名称可编辑 -->
          <div v-if="isGroup" class="chat-info-drawer__name-row">
            <template v-if="!isEditingGroupName">
              <span class="chat-info-drawer__name">{{ displayName }}</span>
              <button
                v-if="isOwner"
                class="chat-info-drawer__inline-edit-btn"
                @click="isEditingGroupName = true"
              >
                <span class="chat-info-drawer__edit-label">{{ t('chat.info.edit') || '编辑' }}</span>
              </button>
            </template>
            <div v-else class="chat-info-drawer__inline-edit">
              <input
                ref="groupNameInputRef"
                v-model="groupNameInput"
                class="chat-info-drawer__inline-input"
                :placeholder="displayName"
                @keydown.enter="saveGroupName"
              >
              <button
                class="chat-info-drawer__inline-save"
                :disabled="savingGroupName"
                @click="saveGroupName"
              >
                {{ savingGroupName ? t('chat.info.saving') || '保存中...' : t('chat.info.save') }}
              </button>
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

        <!-- 单聊：备注编辑 -->
        <div v-if="!isGroup" class="chat-info-drawer__section">
          <div class="chat-info-drawer__section-title">
            {{ t('chat.info.remark') }}
          </div>
          <div v-if="!isEditingRemark" class="chat-info-drawer__remark" @click="isEditingRemark = true">
            <span>{{ remarkInput || t('chat.info.remarkPlaceholder') }}</span>
            <span class="chat-info-drawer__edit-label">{{ t('chat.info.edit') || '编辑' }}</span>
          </div>
          <div v-else class="chat-info-drawer__remark-edit">
            <input
              ref="remarkInputRef"
              v-model="remarkInput"
              class="chat-info-drawer__remark-input"
              :placeholder="t('chat.info.remarkInputPlaceholder')"
              @keydown.enter="saveRemark"
            >
            <button
              class="chat-info-drawer__remark-save"
              :disabled="savingRemark"
              @click="saveRemark"
            >
              {{ savingRemark ? t('chat.info.saving') || '保存中...' : t('chat.info.save') }}
            </button>
          </div>
        </div>

        <!-- 群聊：群公告 -->
        <div v-if="isGroup" class="chat-info-drawer__section">
          <div class="chat-info-drawer__section-title chat-info-drawer__section-title--row">
            <span>{{ t('chat.info.groupAnnouncement') }}</span>
            <button
              v-if="isAdminOrOwner && !isEditingAnnouncement"
              class="chat-info-drawer__text-btn"
              @click="isEditingAnnouncement = true"
            >
              {{ t('chat.info.edit') || '编辑' }}
            </button>
          </div>
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
              <button
                class="chat-info-drawer__inline-cancel"
                @click="isEditingAnnouncement = false"
              >
                {{ t('button.cancel') || '取消' }}
              </button>
              <button
                class="chat-info-drawer__inline-save"
                :disabled="savingAnnouncement"
                @click="saveAnnouncement"
              >
                {{ savingAnnouncement ? t('chat.info.saving') || '保存中...' : t('chat.info.save') }}
              </button>
            </div>
          </div>
        </div>

        <!-- 群聊：群描述 -->
        <div v-if="isGroup && (group?.description || isOwner)" class="chat-info-drawer__section">
          <div class="chat-info-drawer__section-title chat-info-drawer__section-title--row">
            <span>{{ t('chat.info.groupDescription') }}</span>
            <button
              v-if="isOwner && !isEditingDescription"
              class="chat-info-drawer__text-btn"
              @click="isEditingDescription = true"
            >
              {{ t('chat.info.edit') || '编辑' }}
            </button>
          </div>
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
              <button
                class="chat-info-drawer__inline-cancel"
                @click="isEditingDescription = false"
              >
                {{ t('button.cancel') || '取消' }}
              </button>
              <button
                class="chat-info-drawer__inline-save"
                :disabled="savingDescription"
                @click="saveDescription"
              >
                {{ savingDescription ? t('chat.info.saving') || '保存中...' : t('chat.info.save') }}
              </button>
            </div>
          </div>
        </div>

        <!-- 群聊：成员列表 -->
        <div v-if="isGroup" class="chat-info-drawer__section">
          <div class="chat-info-drawer__section-title chat-info-drawer__section-title--row">
            <span>{{ t('chat.info.groupMembers') }} <span class="chat-info-drawer__count">({{ memberCount }})</span></span>
            <button v-if="canAddMember" class="chat-info-drawer__text-btn" @click="onAddMember">
              <Icon name="actions/plus" :size="14" />
              {{ t('chat.info.addMember') }}
            </button>
          </div>
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

        <!-- 群聊：群管理 -->
        <GroupManagementSection
          v-if="isGroup"
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

        <!-- 通用操作 -->
        <div class="chat-info-drawer__section">
          <Cell auto-height @click="onClearHistory">
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
        />
      </div>
    </div>

    <!-- Footer 插槽 -->
    <template v-if="!showMemberList" #footer>
      <div class="chat-info-drawer__actions">
        <button
          class="chat-info-drawer__action-btn chat-info-drawer__action-btn--danger"
          @click="onLeaveOrDelete"
        >
          {{ isGroup ? (isOwner ? t('chat.info.destroyGroup') : t('chat.info.leaveGroup')) : t('chat.info.deleteFriend') }}
        </button>
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
  border-bottom: 1px solid var(--uikit-border-color, #f3f4f6);
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
}

.chat-info-drawer__profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
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

.chat-info-drawer__section {
  padding: 16px;
  border-top: 1px solid var(--uikit-border-color, #f3f4f6);
  flex-shrink: 0;
}

.chat-info-drawer__section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--uikit-text-primary);
  margin-bottom: 12px;
}

.chat-info-drawer__section-title--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.chat-info-drawer__count {
  font-weight: 400;
  color: var(--uikit-text-secondary);
}

.chat-info-drawer__remark {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
  font-size: 14px;
  cursor: pointer;
}

.chat-info-drawer__edit-label {
  font-size: 12px;
  color: var(--uikit-primary-color);
  white-space: nowrap;
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

.chat-info-drawer__remark-save {
  padding: 8px 16px;
  border-radius: var(--uikit-components-radius, 6px);
  border: none;
  background-color: var(--uikit-primary-color);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.chat-info-drawer__remark-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 群信息内联编辑 */
.chat-info-drawer__name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.chat-info-drawer__inline-edit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border: none;
  border-radius: var(--uikit-components-radius, 4px);
  background: none;
  color: var(--uikit-primary-color);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--uikit-anim-duration, 0.15s) var(--uikit-anim-easing, ease);
}

.chat-info-drawer__inline-edit-btn:hover {
  background-color: var(--uikit-bg-secondary);
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

.chat-info-drawer__inline-save {
  padding: 6px 14px;
  border-radius: var(--uikit-components-radius, 6px);
  border: none;
  background-color: var(--uikit-primary-color);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.chat-info-drawer__inline-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chat-info-drawer__inline-cancel {
  padding: 6px 14px;
  border-radius: var(--uikit-components-radius, 6px);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: 13px;
  cursor: pointer;
}

.chat-info-drawer__inline-cancel:hover {
  background-color: var(--uikit-bg-secondary);
}

.chat-info-drawer__announcement,
.chat-info-drawer__description {
  font-size: 14px;
  color: var(--uikit-text-primary);
  line-height: 1.6;
  word-break: break-word;
  padding: 10px 12px;
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-bg-secondary);
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

.chat-info-drawer__text-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  background: none;
  color: var(--uikit-primary-color);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
}

.chat-info-drawer__text-btn:hover {
  background-color: var(--uikit-bg-secondary);
}

.chat-info-drawer__actions {
  padding: 16px;
  border-top: 1px solid var(--uikit-border-color, #f3f4f6);
}

.chat-info-drawer__action-btn {
  width: 100%;
  padding: 12px;
  border-radius: var(--uikit-components-radius, 8px);
  border: none;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.chat-info-drawer__action-btn:hover {
  opacity: 0.9;
}

.chat-info-drawer__action-btn--danger {
  background-color: #fef2f2;
  color: #ef4444;
}

.chat-info-drawer__member-detail {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background-color: var(--uikit-bg-base);
}
</style>
