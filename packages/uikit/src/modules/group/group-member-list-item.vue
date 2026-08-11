<script setup lang="ts">
import { computed, ref } from 'vue'
import Avatar from '../../components/avatar/avatar.vue'
import Icon from '../../components/icon/icon.vue'
import Popup from '../../components/popup/popup.vue'
import Cell from '../../components/cell/cell.vue'
import { useLocale } from '../../locale'
import { GROUP_MEMBER_ROLE } from '../../constants'
import type { GroupMemberRoleValue } from '../../constants'
import { useUIKit } from '../../composables/use-uikit'
import { useUserInfo } from '../../composables/use-user-info'
import type { UiGroupMember } from '../../sdk/types'
import type { PresenceDisplayStatus } from '../../components/avatar/avatar.vue'

interface Props {
  member: UiGroupMember
  groupId: string
  currentUserId: string
  currentUserRole: GroupMemberRoleValue
  showMuteAction: boolean
  showBlockAction: boolean
  showAdminAction: boolean
  showRemoveAction: boolean
  showChatAction: boolean
  allowChat: 'all' | 'contact' | 'none'
  presence?: PresenceDisplayStatus
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'click-member', member: UiGroupMember): void
  (e: 'chat-member', member: UiGroupMember): void
  (e: 'remove-member', member: UiGroupMember): void
  (e: 'set-admin', member: UiGroupMember): void
  (e: 'remove-admin', member: UiGroupMember): void
  (e: 'mute-member', member: UiGroupMember): void
  (e: 'unmute-member', member: UiGroupMember): void
  (e: 'block-member', member: UiGroupMember): void
  (e: 'unblock-member', member: UiGroupMember): void
  (e: 'transfer-owner', member: UiGroupMember): void
}>()

const { t } = useLocale()
const { stores } = useUIKit()

// ✅ 使用 useUserInfo 解析显示名和头像（优先级：备注 > 昵称 > userId）
const { displayName, avatarUrl } = useUserInfo(() => props.member.userId)

const isOwner = computed(() => props.currentUserRole === GROUP_MEMBER_ROLE.OWNER)
const isAdmin = computed(() => props.currentUserRole === GROUP_MEMBER_ROLE.ADMIN)

function roleClass(role?: string): string {
  if (role === GROUP_MEMBER_ROLE.OWNER)
    return 'group-member-list__role--owner'
  if (role === GROUP_MEMBER_ROLE.ADMIN)
    return 'group-member-list__role--admin'
  return ''
}

function roleLabel(role?: string): string {
  if (role === GROUP_MEMBER_ROLE.OWNER)
    return t('group.memberList.owner', '群主')
  if (role === GROUP_MEMBER_ROLE.ADMIN)
    return t('group.memberList.admin', '管理员')
  return t('group.memberList.member', '成员')
}

// ===== 禁言/拉黑/白名单状态检查 =====
function isMemberMuted(groupId: string, userId: string): boolean {
  const muteList = stores.group.groupMuteListMap[groupId] || []
  return muteList.some(m => m.userId === userId)
}

function isMemberBlocked(groupId: string, userId: string): boolean {
  const blocklist = stores.group.groupBlocklistMap[groupId] || []
  return blocklist.some(m => m.userId === userId)
}

function isMemberInAllowlist(groupId: string, userId: string): boolean {
  const allowlist = stores.group.groupAllowlistMap[groupId] || []
  return allowlist.some(m => m.userId === userId)
}

// ===== 权限检查 =====
function canRemove(member: UiGroupMember): boolean {
  if (member.userId === props.currentUserId)
    return false
  if (isOwner.value)
    return true
  if (isAdmin.value && member.role === GROUP_MEMBER_ROLE.MEMBER)
    return true
  return false
}

function canSetAdmin(member: UiGroupMember): boolean {
  return isOwner.value && member.userId !== props.currentUserId && member.role !== GROUP_MEMBER_ROLE.ADMIN
}

function canRemoveAdmin(member: UiGroupMember): boolean {
  return isOwner.value && member.userId !== props.currentUserId && member.role === GROUP_MEMBER_ROLE.ADMIN
}

function canChat(member: UiGroupMember): boolean {
  if (!props.showChatAction)
    return false
  if (member.userId === props.currentUserId)
    return false
  if (props.allowChat === 'none')
    return false
  if (props.allowChat === 'contact')
    return !!stores.contact.getContact(member.userId)
  return true
}

function canMute(member: UiGroupMember): boolean {
  if (!props.showMuteAction)
    return false
  if (member.userId === props.currentUserId)
    return false
  if (isMemberMuted(props.groupId, member.userId))
    return false
  if (isOwner.value)
    return true
  if (isAdmin.value && member.role === GROUP_MEMBER_ROLE.MEMBER)
    return true
  return false
}

function canUnmute(member: UiGroupMember): boolean {
  if (!props.showMuteAction)
    return false
  if (!isMemberMuted(props.groupId, member.userId))
    return false
  if (isOwner.value)
    return true
  if (isAdmin.value && member.role === GROUP_MEMBER_ROLE.MEMBER)
    return true
  return false
}

function canBlock(member: UiGroupMember): boolean {
  if (!props.showBlockAction)
    return false
  if (member.userId === props.currentUserId)
    return false
  if (isMemberBlocked(props.groupId, member.userId))
    return false
  if (isOwner.value || isAdmin.value)
    return true
  return false
}

function canUnblock(member: UiGroupMember): boolean {
  if (!props.showBlockAction)
    return false
  if (!isMemberBlocked(props.groupId, member.userId))
    return false
  if (isOwner.value || isAdmin.value)
    return true
  return false
}

// 转让群主：仅当前用户是群主且目标成员不是自己时可见
function canTransferOwner(member: UiGroupMember): boolean {
  return isOwner.value && member.userId !== props.currentUserId
}

// ===== 更多操作菜单 =====
const activeMoreMenu = ref(false)
const moreMenuTriggerRef = ref<HTMLElement | undefined>()

function setMoreTriggerRef(el: HTMLElement | null) {
  moreMenuTriggerRef.value = el ?? undefined
}

interface MoreAction {
  key: string
  label: string
  icon: string
  danger?: boolean
}

function getMoreActions(member: UiGroupMember): MoreAction[] {
  const actions: MoreAction[] = []
  if (canMute(member))
    actions.push({ key: 'mute', icon: 'group/person-clock', label: t('group.memberList.mute', '禁言') })
  if (canUnmute(member))
    actions.push({ key: 'unmute', icon: 'group/person-clock', label: t('group.memberList.unmute', '取消禁言') })
  if (canBlock(member))
    actions.push({ key: 'block', icon: 'actions/user-x', label: t('group.memberList.block', '拉黑') })
  if (canUnblock(member))
    actions.push({ key: 'unblock', icon: 'actions/user-check', label: t('group.memberList.unblock', '取消拉黑') })
  if (props.showAdminAction && canSetAdmin(member))
    actions.push({ key: 'setAdmin', icon: 'group/shield-person', label: t('group.memberList.setAdmin', '设管理员') })
  if (props.showAdminAction && canRemoveAdmin(member))
    actions.push({ key: 'removeAdmin', icon: 'group/shield-person', label: t('group.memberList.removeAdmin', '取消管理员') })
  if (canTransferOwner(member))
    actions.push({ key: 'transferOwner', icon: 'group/crown', label: t('group.memberList.transferOwner', '转让群主'), danger: true })
  if (props.showRemoveAction && canRemove(member))
    actions.push({ key: 'remove', icon: 'actions/user-minus', label: t('group.memberList.remove', '移除'), danger: true })
  return actions
}

function onMoreActionClick(member: UiGroupMember, actionKey: string) {
  activeMoreMenu.value = false
  switch (actionKey) {
    case 'mute':
      emit('mute-member', member)
      break
    case 'unmute':
      emit('unmute-member', member)
      break
    case 'block':
      emit('block-member', member)
      break
    case 'unblock':
      emit('unblock-member', member)
      break
    case 'setAdmin':
      emit('set-admin', member)
      break
    case 'removeAdmin':
      emit('remove-admin', member)
      break
    case 'transferOwner':
      emit('transfer-owner', member)
      break
    case 'remove':
      emit('remove-member', member)
      break
  }
}
</script>

<template>
  <Cell
    class="group-member-list__item"
    auto-height
    :clickable="false"
    :data-member-id="props.member.userId"
    @click="emit('click-member', props.member)"
  >
    <template #leading>
      <Avatar
        :name="displayName"
        :src="avatarUrl"
        :size="40"
        :presence="props.presence"
      />
    </template>

    <template #default>
      <div class="group-member-list__info">
        <div class="group-member-list__name-row">
          <span class="group-member-list__name">{{ displayName }}</span>
          <span
            v-if="props.member.role !== GROUP_MEMBER_ROLE.MEMBER"
            class="group-member-list__role"
            :class="roleClass(props.member.role)"
          >
            {{ roleLabel(props.member.role) }}
          </span>
          <span
            v-if="isMemberMuted(props.groupId, props.member.userId)"
            class="group-member-list__status-tag group-member-list__status-tag--muted"
          >
            {{ t('group.memberList.muted', '禁言中') }}
          </span>
          <span
            v-if="isMemberBlocked(props.groupId, props.member.userId)"
            class="group-member-list__status-tag group-member-list__status-tag--blocked"
          >
            {{ t('group.memberList.blocked', '已拉黑') }}
          </span>
          <span
            v-if="isMemberInAllowlist(props.groupId, props.member.userId)"
            class="group-member-list__status-tag group-member-list__status-tag--allowlist"
          >
            {{ t('group.memberList.inAllowlist', '白名单') }}
          </span>
        </div>
        <div class="group-member-list__id">
          ID: {{ props.member.userId }}
        </div>
      </div>
    </template>

    <template #trailing>
      <div class="group-member-list__actions" @click.stop>
        <button
          v-if="canChat(props.member)"
          class="group-member-list__action-btn"
          @click="emit('chat-member', props.member)"
        >
          {{ t('group.memberList.chat', '发消息') }}
        </button>

        <div
          v-if="getMoreActions(props.member).length > 0"
          :ref="(el) => setMoreTriggerRef(el as HTMLElement)"
          class="group-member-list__more"
        >
          <button
            class="group-member-list__action-btn group-member-list__action-btn--icon"
            @click.stop="activeMoreMenu = true"
          >
            <Icon name="actions/ellipsis_vertical" :size="16" />
          </button>
          <Popup
            :show="activeMoreMenu"
            :anchor="moreMenuTriggerRef"
            placement="bottom"
            :overlay="false"
            :close-on-click-overlay="true"
            group="group-member-more-menu"
            @update:show="activeMoreMenu = false"
            @close="activeMoreMenu = false"
          >
            <div class="group-member-list__context-menu">
              <Cell
                v-for="action in getMoreActions(props.member)"
                :key="action.key"
                size="compact"
                :inset-hover="false"
                :danger="action.danger"
                :title="action.label"
                @click.stop="onMoreActionClick(props.member, action.key)"
              >
                <template #leading>
                  <Icon :name="action.icon" :size="18" />
                </template>
              </Cell>
            </div>
          </Popup>
        </div>
      </div>
    </template>
  </Cell>
</template>

<style scoped>
.group-member-list__item:hover .group-member-list__actions {
  opacity: 1;
}

.group-member-list__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-member-list__name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-member-list__name {
  font-size: var(--uikit-font-size-15);
  font-weight: 500;
  color: var(--uikit-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-member-list__role {
  font-size: var(--uikit-font-size-10);
  padding: 1px 5px;
  border-radius: 4px;
  line-height: 1.2;
  flex-shrink: 0;
}

.group-member-list__role--owner {
  background-color: #fef3c7;
  color: #d97706;
}

.group-member-list__role--admin {
  background-color: #dbeafe;
  color: #2563eb;
}

.group-member-list__status-tag {
  font-size: var(--uikit-font-size-10);
  padding: 1px 5px;
  border-radius: 4px;
  line-height: 1.2;
  flex-shrink: 0;
}

.group-member-list__status-tag--muted {
  background-color: #fee2e2;
  color: #dc2626;
}

.group-member-list__status-tag--blocked {
  background-color: #f3f4f6;
  color: #6b7280;
}

.group-member-list__status-tag--allowlist {
  background-color: #d1fae5;
  color: #059669;
}

.group-member-list__id {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}

.group-member-list__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.group-member-list__action-btn {
  padding: 5px 10px;
  border-radius: var(--uikit-components-radius, 5px);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: var(--uikit-font-size-12);
  cursor: pointer;
  transition: all 0.15s;
}

@media (hover: hover) {
.group-member-list__action-btn:hover {
  background-color: var(--uikit-bg-secondary);
}
}

.group-member-list__action-btn--danger {
  border-color: #fecaca;
  color: #ef4444;
}

@media (hover: hover) {
.group-member-list__action-btn--danger:hover {
  background-color: #fef2f2;
}
}

.group-member-list__action-btn--icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
}

.group-member-list__more {
  position: relative;
  display: inline-flex;
}

@media (max-width: 480px) {
  .group-member-list__actions {
    opacity: 1;
  }
}

.group-member-list__context-menu {
  display: flex;
  flex-direction: column;
  min-width: 140px;
  padding: 4px;
  /* 卡片内操作项：紧凑 padding + hover 背景顶满 */
  --uikit-item-hover-padding-x: 12px;
  --uikit-cell-height-compact: 40px;
}
</style>
