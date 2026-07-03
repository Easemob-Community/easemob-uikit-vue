<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import Icon from '../../../components/icon/icon.vue'
import Modal from '../../../components/modal/modal.vue'
import { useThemeStore } from '../../../store/theme'
import { useLocale } from '../../../locale'
import { useContact } from '../../../composables/use-contact'
import { useToast } from '../../../composables/use-toast'
import { useUserInfo } from '../../../composables/use-user-info'
import { useGroup } from '../../../composables/use-group'
import { useUIKit } from '../../../composables/use-uikit'
import type { UiConversation as Conversation, UiGroupMember } from '../../../sdk/types'
import ChatDrawer from './chat-drawer.vue'

export interface ChatInfoDrawerProps {
  show: boolean
  conversation?: Conversation | null
  isGroup?: boolean
  offsetTop?: string | number
}

const props = defineProps<ChatInfoDrawerProps>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'leave-group', groupId: string): void
  (e: 'destroy-group', groupId: string): void
  (e: 'clear-history', payload: { id: string, type: 'singleChat' | 'groupChat' }): void
  (e: 'view-all-members', groupId: string): void
  (e: 'add-member', groupId: string): void
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
  } = useGroup()

const closeBtnClass = computed(() =>
  themeStore.componentsShape === 'square' ? 'chat-info-drawer__close--square' : '',
)

/** 备注编辑状态 */
const isEditingRemark = ref(false)
const remarkInput = ref('')
const savingRemark = ref(false)

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
  const id = groupId.value
  if (id)
    emit('view-all-members', id)
}

function onAddMember() {
  const id = groupId.value
  if (id)
    emit('add-member', id)
}

const displayedMembers = computed(() => members.value.slice(0, 6))
const hasMoreMembers = computed(() => members.value.length > displayedMembers.value.length)
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
      <div class="chat-info-drawer__header">
        <button class="chat-info-drawer__close" :class="closeBtnClass" @click="onClose">
          <Icon name="arrows/arrow_left_thick" :size="16" />
        </button>
        <span class="chat-info-drawer__title">
          {{ isGroup ? t('chat.info.titleGroup') : t('chat.info.titleFriend') }}
        </span>
        <button class="chat-info-drawer__close" :class="closeBtnClass" @click="onClose">
          <Icon name="actions/xmark_thick" :size="16" />
        </button>
      </div>
    </template>

    <!-- Body 默认插槽 -->
    <div class="chat-info-drawer__body">
      <div class="chat-info-drawer__profile">
        <Avatar :name="displayName" :src="displayAvatar" :size="64" />
        <div class="chat-info-drawer__name">
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
          <Icon name="misc/edit" :size="16" />
        </div>
        <div v-else class="chat-info-drawer__remark-edit">
          <input
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
        <div class="chat-info-drawer__section-title">
          {{ t('chat.info.groupAnnouncement') }}
        </div>
        <div class="chat-info-drawer__announcement">
          <span v-if="loadingGroup" class="chat-info-drawer__placeholder">{{ t('common.loading') }}</span>
          <span v-else-if="announcement">{{ announcement }}</span>
          <span v-else class="chat-info-drawer__placeholder">{{ t('chat.info.groupAnnouncementPlaceholder') }}</span>
        </div>
      </div>

      <!-- 群聊：群描述 -->
      <div v-if="isGroup && group?.description" class="chat-info-drawer__section">
        <div class="chat-info-drawer__section-title">
          {{ t('chat.info.groupDescription') }}
        </div>
        <div class="chat-info-drawer__description">
          {{ group.description }}
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
          <div
            v-for="member in displayedMembers"
            :key="member.userId"
            class="chat-info-drawer__member-cell"
          >
            <Avatar :name="member.nickname || member.userId" :src="member.avatarUrl" :size="48" />
            <span class="chat-info-drawer__member-name">{{ member.nickname || member.userId }}</span>
            <span v-if="member.role === 'owner'" class="chat-info-drawer__member-tag chat-info-drawer__member-tag--owner">{{ t('chat.info.groupOwner') }}</span>
            <span v-else-if="member.role === 'admin'" class="chat-info-drawer__member-tag chat-info-drawer__member-tag--admin">{{ t('chat.info.groupAdmin') }}</span>
          </div>
        </div>
        <button v-if="hasMoreMembers || members.length === 0" class="chat-info-drawer__view-all" @click.stop="onViewAllMembers">
          {{ members.length === 0 ? t('chat.info.viewAllMembersEmpty') : t('chat.info.viewAllMembers') }}
        </button>
      </div>

      <!-- 通用操作 -->
      <div class="chat-info-drawer__section">
        <button class="chat-info-drawer__action-row" @click="onClearHistory">
          <Icon name="actions/trash" :size="18" />
          <span>{{ t('chat.info.clearHistory') }}</span>
        </button>
      </div>
    </div>

    <!-- Footer 插槽 -->
    <template #footer>
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

.chat-info-drawer__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
  flex: 1;
  text-align: center;
}

.chat-info-drawer__body {
  flex: 1;
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
  grid-template-columns: repeat(5, 1fr);
  gap: 12px 8px;
}

.chat-info-drawer__member-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.chat-info-drawer__member-name {
  font-size: 12px;
  color: var(--uikit-text-primary);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-info-drawer__member-tag {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
  line-height: 1.2;
}

.chat-info-drawer__member-tag--owner {
  background-color: #fef3c7;
  color: #d97706;
}

.chat-info-drawer__member-tag--admin {
  background-color: #dbeafe;
  color: #2563eb;
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

.chat-info-drawer__action-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--uikit-components-radius, 8px);
  border: none;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.chat-info-drawer__action-row:hover {
  background-color: var(--uikit-border-color, #f3f4f6);
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
</style>
