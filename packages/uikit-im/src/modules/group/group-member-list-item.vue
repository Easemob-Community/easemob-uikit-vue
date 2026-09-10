<script setup lang="ts">
import { computed, ref } from 'vue'
import { EmAvatar as Avatar } from '@easemob/uikit-core'
import { EmIcon as Icon } from '@easemob/uikit-core'
import { EmPopup as Popup } from '@easemob/uikit-core'
import { EmCell as Cell } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { useToast } from '@easemob/uikit-core'
import { GROUP_MEMBER_ROLE } from '@easemob/uikit-core'
import type { GroupMemberRoleValue } from '@easemob/uikit-core'
import { useUIKit } from '../../composables/use-uikit'
import { useUserInfo } from '../../composables/use-user-info'
import { useContact } from '../../composables/use-contact'
import type { UiGroupMember } from '@easemob/uikit-core'
import type { PresenceDisplayStatus } from '@easemob/uikit-core'

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
  /** 显示名命中高亮子串（搜索场景传入关键词，命中部分以主色高亮） */
  highlight?: string
  /** 是否显示第二行 ID，默认 true；会话详情抽屉成员页传 false（设计稿无 ID 行） */
  showId?: boolean
  /**
   * 分隔线（透传 EmCell 的 border 能力）：true/'bottom' = 底部发丝线，'top' = 顶部分隔线，false/缺省 = 无。
   * 默认无（不影响群管理等其他消费方）；会话详情抽屉成员页传 'bottom'。
   */
  border?: boolean | 'top' | 'bottom'
  /** ⋮ 菜单项是否显示图标，默认 false（设计稿菜单为纯文字项） */
  menuWithIcon?: boolean
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
const { show: showToast } = useToast()
const { stores } = useUIKit()
const { addContact } = useContact()

// ✅ 使用 useUserInfo 解析显示名和头像（优先级：备注 > 昵称 > userId）
const { displayName, avatarUrl } = useUserInfo(() => props.member.userId)

/** 显示名命中高亮分段：keyword 为空或未命中时仅一段原文 */
const nameSegments = computed(() => {
  const name = displayName.value
  const keyword = props.highlight?.trim()
  if (!keyword)
    return [{ text: name, hit: false }]
  const index = name.toLowerCase().indexOf(keyword.toLowerCase())
  if (index < 0)
    return [{ text: name, hit: false }]
  const segments: { text: string, hit: boolean }[] = []
  if (index > 0)
    segments.push({ text: name.slice(0, index), hit: false })
  segments.push({ text: name.slice(index, index + keyword.length), hit: true })
  if (index + keyword.length < name.length)
    segments.push({ text: name.slice(index + keyword.length), hit: false })
  return segments
})

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
  if (member.userId === props.currentUserId)
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

/** 是否本人联系人（决定 ⋮ 菜单首项为「私聊」还是「添加为联系人」） */
function isContact(userId: string): boolean {
  return !!stores.contact.getContact(userId)
}

/** 添加为联系人（contact domain，与添加联系人弹窗同一链路） */
async function onAddContact(member: UiGroupMember) {
  try {
    await addContact(member.userId)
    showToast(t('toast.success', '操作成功'), 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('contact.addFailed', '添加失败'), 'error')
  }
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

/** 成员操作菜单项（#member-menu 插槽 scope 的 actions 元素类型） */
export interface GroupMemberMoreAction extends MoreAction {}

function getMoreActions(member: UiGroupMember): GroupMemberMoreAction[] {
  const actions: MoreAction[] = []
  // 首项按好友关系差异化（设计稿）：是好友 → 私聊（仍受 showChatAction/allowChat 约束）；
  // 非好友 → 添加为联系人
  if (member.userId !== props.currentUserId) {
    if (isContact(member.userId)) {
      if (canChat(member))
        actions.push({ key: 'chat', icon: 'bubble', label: t('group.memberList.chat', '私聊') })
    }
    else {
      actions.push({ key: 'addContact', icon: 'person/plus', label: t('group.memberList.addContact', '添加为联系人') })
    }
  }
  if (props.showAdminAction && canSetAdmin(member))
    actions.push({ key: 'setAdmin', icon: 'shield/person', label: t('group.memberList.setAdmin', '设管理员') })
  if (props.showAdminAction && canRemoveAdmin(member))
    actions.push({ key: 'removeAdmin', icon: 'shield/person', label: t('group.memberList.removeAdmin', '取消管理员') })
  if (canMute(member))
    actions.push({ key: 'mute', icon: 'person/clock', label: t('group.memberList.mute', '禁言') })
  if (canUnmute(member))
    actions.push({ key: 'unmute', icon: 'person/clock', label: t('group.memberList.unmute', '取消禁言') })
  if (canBlock(member))
    actions.push({ key: 'block', icon: 'person/xmark', label: t('group.memberList.block', '拉黑') })
  if (canUnblock(member))
    actions.push({ key: 'unblock', icon: 'person/check', label: t('group.memberList.unblock', '取消拉黑') })
  // 转让群主严格仅群主可见（canTransferOwner 已限定 isOwner）
  if (canTransferOwner(member))
    actions.push({ key: 'transferOwner', icon: 'crown', label: t('group.memberList.transferOwner', '转让群主'), danger: true })
  if (props.showRemoveAction && canRemove(member))
    actions.push({ key: 'remove', icon: 'person/minus', label: t('group.memberList.remove', '移除'), danger: true })
  return actions
}

function onMoreActionClick(member: UiGroupMember, actionKey: string) {
  activeMoreMenu.value = false
  switch (actionKey) {
    case 'chat':
      emit('chat-member', member)
      break
    case 'addContact':
      void onAddContact(member)
      break
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

/** 关闭成员操作菜单（#member-menu 插槽 scope） */
function closeMoreMenu() {
  activeMoreMenu.value = false
}
</script>

<template>
  <Cell
    class="group-member-list__item"
    auto-height
    :clickable="false"
    :border="props.border"
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
          <span class="group-member-list__name"><template v-for="(seg, i) in nameSegments" :key="i"><span v-if="seg.hit" class="group-member-list__name-highlight">{{ seg.text }}</span><template v-else>{{ seg.text }}</template></template></span>
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
        <div v-if="props.showId !== false" class="group-member-list__id">
          ID: {{ props.member.userId }}
        </div>
      </div>
    </template>

    <template #trailing>
      <!-- 行尾操作区仅 ⋮ 菜单按钮（纯净 icon 无底色）；「私聊/添加为联系人」在 ⋮ 菜单首项 -->
      <div class="group-member-list__actions" @click.stop>
        <div
          v-if="getMoreActions(props.member).length > 0"
          :ref="(el) => setMoreTriggerRef(el as HTMLElement)"
          class="group-member-list__more"
        >
          <button
            class="group-member-list__more-btn"
            @click.stop="activeMoreMenu = true"
          >
            <Icon name="vertical" :size="16" />
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
            <!-- #member-menu：完全接管成员操作菜单内容，scope 提供成员、内置动作列表与选择/关闭句柄 -->
            <slot
              name="member-menu"
              :member="props.member"
              :actions="getMoreActions(props.member)"
              :select="(key: string) => onMoreActionClick(props.member, key)"
              :close="closeMoreMenu"
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
                  <!-- 菜单项图标默认不展示（menu-with-icon 开启时才渲染） -->
                  <template v-if="props.menuWithIcon" #leading>
                    <Icon :name="action.icon" :size="18" />
                  </template>
                </Cell>
              </div>
            </slot>
          </Popup>
        </div>
      </div>
    </template>
  </Cell>
</template>

<style scoped>
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

/* 成员名：设计稿纯黑 #000（群组场景主文案） */
.group-member-list__name {
  font-size: var(--uikit-font-size-15);
  font-weight: 500;
  color: var(--uikit-member-name-color, #000000);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-member-list__name-highlight {
  color: var(--uikit-primary-color);
}

.group-member-list__role {
  font-size: var(--uikit-font-size-10);
  padding: 1px 5px;
  border-radius: 4px;
  line-height: 1.2;
  flex-shrink: 0;
}

/* 角色 tag 配色（设计稿）：Owner = 主色蓝、Admin = warning 橙 */
.group-member-list__role--owner {
  background-color: rgba(var(--uikit-primary-rgb), 0.12);
  color: var(--uikit-primary-color);
}

.group-member-list__role--admin {
  background-color: rgba(var(--uikit-warning-rgb), 0.12);
  color: var(--uikit-warning-color);
}

.group-member-list__status-tag {
  font-size: var(--uikit-font-size-10);
  padding: 1px 5px;
  border-radius: 4px;
  line-height: 1.2;
  flex-shrink: 0;
}

/* 状态标签配色（设计稿指定值）：禁言 = #A9AEB2、黑名单 = #484D51（同系 12% 底色） */
.group-member-list__status-tag--muted {
  background-color: rgba(169, 174, 178, 0.12);
  color: #a9aeb2;
}

.group-member-list__status-tag--blocked {
  background-color: rgba(72, 77, 81, 0.12);
  color: #484d51;
}

.group-member-list__status-tag--allowlist {
  background-color: rgba(var(--uikit-success-rgb), 0.12);
  color: var(--uikit-success-color);
}

.group-member-list__id {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}

/* 行内操作区：仅 ⋮ 菜单按钮常驻（纯净 icon 无底色无边框） */
.group-member-list__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* ⋮ 按钮：图标本身展示（平时无底色），padding 撑出可点击热区；
   hover 对齐抽屉 header X 按钮语义：--uikit-bg-hover 圆角底色 + 图标色加深，过渡走 --uikit-anim-* */
.group-member-list__more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: none;
  background: none;
  border-radius: var(--uikit-components-radius);
  color: var(--uikit-text-secondary);
  cursor: pointer;
  transition: color var(--uikit-anim-duration) var(--uikit-anim-easing),
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .group-member-list__more-btn:hover {
    background-color: var(--uikit-bg-hover);
    color: var(--uikit-text-primary);
  }
}

.group-member-list__more {
  position: relative;
  display: inline-flex;
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
