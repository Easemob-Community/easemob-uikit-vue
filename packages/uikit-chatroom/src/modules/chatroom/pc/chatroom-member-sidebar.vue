<script setup lang="ts">
/**
 * 聊天室成员侧栏（P5 PC 模式）：split 布局下的常驻成员列，与 H5 底部弹层
 * （ChatroomMemberPanel）并列的 PC 原生形态。
 *
 * - 复用公开 composable 契约（§5.10）：成员分页 / 禁言 / 踢人 / 管理员 / 黑名单；
 * - PC 交互：成员行悬停快捷操作（禁言 / 移除）+ 点击/右键弹出上下文菜单
 *   （ChatroomContextMenu，完整操作清单）+ 危险操作居中确认弹窗；
 * - 操作显隐统一走 `canManageMember`（公开原语）+ 场景 `management` 开关组，
 *   UIKit 不感知业务角色（主播/老师等由业务层自行映射到权限）。
 */
import { computed, onMounted, ref } from 'vue'
import { EmPopup, normalizeUserId, t } from '@easemob/uikit-core'
import { CHATROOM_MEMBER_ROLE } from '../../../constants'
import { getChatroomPopupTarget } from '../../../config/popup-target'
import { useChatroom } from '../../../composables/use-chatroom'
import { useChatroomMember } from '../../../composables/use-chatroom-member'
import type { ChatroomManagementFeature } from '../../../composables/use-chatroom-scene'
import type { ChatroomMember } from '../../../sdk/domain/chatroom-domain'
import ChatroomMemberItem from '../common/chatroom-member-item.vue'
import ChatroomContextMenu from './chatroom-context-menu.vue'
import type { ChatroomContextMenuItem } from './chatroom-context-menu.vue'

export interface ChatroomMemberSidebarProps {
  /** 全员禁言入口（场景 features.muteAll 驱动，与 H5 面板同口径） */
  muteAllEnabled?: boolean
  /** 管理位能力开关（场景 features.management；缺省按权限可用） */
  management?: ChatroomManagementFeature
}

const props = withDefaults(defineProps<ChatroomMemberSidebarProps>(), {
  muteAllEnabled: false,
  management: undefined,
})

// 只消费公开 composable 契约（§5.10：禁止直取 store）
const { roomInfo, isAllMuted } = useChatroom()
const {
  members,
  membersHasMore,
  muteList,
  isOwner,
  canManage,
  canManageMember,
  loadMembers,
  refreshMuteList,
  muteMembers,
  unmuteMembers,
  kickMembers,
  addAdmin,
  removeAdmin,
  muteAll,
  unmuteAll,
  loadBlocklist,
  unblockMembers,
} = useChatroomMember()
/** 在线人数（房间详情接口的当前人数，列表只展示已加载页） */
const memberCount = computed(() => roomInfo.value?.memberCount ?? 0)

/** tab：成员 / 黑名单（黑名单仅 owner/admin 且场景未关闭） */
const activeTab = ref<'members' | 'blocklist'>('members')
const blocklist = ref<ChatroomMember[]>([])

/** 黑名单 tab 是否可用 */
const blocklistEnabled = computed(
  () => canManage.value && props.management?.blocklist !== false,
)
/** 全员禁言入口（场景 muteAllEnabled 且场景未关闭） */
const muteAllEntryEnabled = computed(
  () => props.muteAllEnabled && canManage.value && props.management?.muteAll !== false,
)

onMounted(() => {
  void loadMembers(false).catch(() => {})
  void refreshMuteList().catch(() => {})
})

/** 成员是否在禁言名单中（双方归一化比较，与成员项标记同口径） */
function isMutedMember(member: ChatroomMember): boolean {
  return muteList.value.some(item => normalizeUserId(item.userId) === member.userId)
}

/** 滚动到底部加载下一页成员 */
function handleListScroll(event: Event) {
  const el = event.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40 && membersHasMore.value) {
    void loadMembers(true).catch(() => {})
  }
}

/** 切换 tab：黑名单首次进入拉取 */
function switchTab(tab: 'members' | 'blocklist') {
  activeTab.value = tab
  if (tab === 'blocklist' && blocklist.value.length === 0) {
    void loadBlocklist(false).then((items) => {
      blocklist.value = items
    }).catch(() => {})
  }
}

/** 移出黑名单（成功后本地移除） */
async function handleUnblock(userId: string) {
  try {
    await unblockMembers([userId])
    blocklist.value = blocklist.value.filter(item => item.userId !== userId)
  }
  catch {
    // 失败已由 useChatroomMember toast
  }
}

/** 全员禁言 / 解除 */
function handleToggleMuteAll() {
  if (isAllMuted.value)
    void unmuteAll().catch(() => {})
  else
    void muteAll().catch(() => {})
}

/* ===== 上下文菜单（点击 / 右键打开） ===== */

type ManageAction = 'unmute' | 'mute-10m' | 'mute-1h' | 'mute-1d' | 'kick' | 'set-admin' | 'remove-admin'

interface ContextMenuState {
  show: boolean
  x: number
  y: number
  member: ChatroomMember | null
  items: Array<ChatroomContextMenuItem & { action: ManageAction }>
}

const contextMenu = ref<ContextMenuState>({ show: false, x: 0, y: 0, member: null, items: [] })

/* ===== 危险操作确认弹窗（踢人 / 移除管理员） ===== */

const confirmTarget = ref<ChatroomMember | null>(null)
const confirmKind = ref<'kick' | 'remove-admin' | null>(null)

/** 组装成员操作清单（按权限 + 场景 management 开关过滤） */
function buildManageItems(member: ChatroomMember): Array<ChatroomContextMenuItem & { action: ManageAction }> {
  if (!canManageMember(member))
    return []
  const management = props.management
  const items: Array<ChatroomContextMenuItem & { action: ManageAction }> = []
  const muted = isMutedMember(member)
  if (management?.mute !== false) {
    if (muted)
      items.push({ action: 'unmute', label: t('chatroom.ui.unmute') })
    items.push(
      { action: 'mute-10m', label: t('chatroom.ui.muteMinutes', '', { minutes: 10 }) },
      { action: 'mute-1h', label: t('chatroom.ui.muteHours', '', { hours: 1 }) },
      { action: 'mute-1d', label: t('chatroom.ui.muteDay') },
    )
  }
  if (management?.kick !== false)
    items.push({ action: 'kick', label: t('chatroom.ui.kickMember'), danger: true })
  if (isOwner.value && management?.admin !== false) {
    items.push(
      member.role === CHATROOM_MEMBER_ROLE.ADMIN
        ? { action: 'remove-admin', label: t('chatroom.ui.removeAdmin'), danger: true }
        : { action: 'set-admin', label: t('chatroom.ui.setAdmin') },
    )
  }
  return items
}

/** 打开上下文菜单（点击 / 右键同一入口） */
function openContextMenu(event: MouseEvent, member: ChatroomMember) {
  const items = buildManageItems(member)
  if (items.length === 0)
    return
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    member,
    items,
  }
}

/** 执行菜单操作（按 action 分发；菜单项经闭包携带 action 标签） */
function handleContextSelect(item: ChatroomContextMenuItem) {
  const target = contextMenu.value.member
  if (!target)
    return
  const action = (item as ChatroomContextMenuItem & { action: ManageAction }).action
  if (action === 'unmute') {
    void unmuteMembers([target.userId]).catch(() => {})
    return
  }
  if (action === 'mute-10m') {
    void muteMembers([target.userId], 10 * 60).catch(() => {})
    return
  }
  if (action === 'mute-1h') {
    void muteMembers([target.userId], 60 * 60).catch(() => {})
    return
  }
  if (action === 'mute-1d') {
    void muteMembers([target.userId], 24 * 60 * 60).catch(() => {})
    return
  }
  if (action === 'kick') {
    confirmTarget.value = target
    confirmKind.value = 'kick'
    return
  }
  if (action === 'set-admin') {
    void addAdmin(target.userId).catch(() => {})
    return
  }
  if (action === 'remove-admin') {
    confirmTarget.value = target
    confirmKind.value = 'remove-admin'
  }
}

/* ===== 悬停快捷操作（member-item #manage-actions 插槽） ===== */

/** 快捷禁言/解除（10 分钟，菜单里提供完整时长档位） */
function handleQuickMute(member: ChatroomMember) {
  if (isMutedMember(member))
    void unmuteMembers([member.userId]).catch(() => {})
  else
    void muteMembers([member.userId], 10 * 60).catch(() => {})
}

/** 快捷移除（危险操作走确认弹窗） */
function handleQuickKick(member: ChatroomMember) {
  confirmTarget.value = member
  confirmKind.value = 'kick'
}

/* ===== 危险操作确认弹窗（踢人 / 移除管理员） ===== */

const confirmText = computed(() => {
  const target = confirmTarget.value
  if (!target)
    return ''
  return confirmKind.value === 'kick'
    ? t('chatroom.ui.confirmKick', '', { name: target.nickname || target.userId })
    : t('chatroom.ui.confirmRemoveAdmin', '', { name: target.nickname || target.userId })
})

async function handleConfirm() {
  const target = confirmTarget.value
  const kind = confirmKind.value
  confirmTarget.value = null
  confirmKind.value = null
  if (!target || !kind)
    return
  try {
    if (kind === 'kick')
      await kickMembers([target.userId])
    else
      await removeAdmin(target.userId)
  }
  catch {
    // 失败已由 useChatroomMember toast
  }
}
</script>

<template>
  <div class="chatroom-member-sidebar">
    <!-- 头部：标题 + 在线人数 -->
    <div class="chatroom-member-sidebar__header">
      <span class="chatroom-member-sidebar__title">{{ t('chatroom.ui.memberPanelTitle') }}</span>
      <span class="chatroom-member-sidebar__count">{{ t('chatroom.ui.memberCount', '', { count: memberCount }) }}</span>
    </div>

    <!-- tab 栏：成员 / 黑名单（owner/admin）/ 全员禁言（场景开启） -->
    <div class="chatroom-member-sidebar__tabs">
      <button
        class="chatroom-member-sidebar__tab"
        :class="{ 'chatroom-member-sidebar__tab--active': activeTab === 'members' }"
        @click="switchTab('members')"
      >
        {{ t('chatroom.ui.members') }}
      </button>
      <button
        v-if="blocklistEnabled"
        class="chatroom-member-sidebar__tab"
        :class="{ 'chatroom-member-sidebar__tab--active': activeTab === 'blocklist' }"
        @click="switchTab('blocklist')"
      >
        {{ t('chatroom.ui.blocklist') }}
      </button>
      <button
        v-if="muteAllEntryEnabled"
        class="chatroom-member-sidebar__tab chatroom-member-sidebar__tab--action"
        @click="handleToggleMuteAll"
      >
        {{ isAllMuted ? t('chatroom.ui.unmuteAllAction') : t('chatroom.ui.muteAllAction') }}
      </button>
    </div>

    <!-- 成员列表（分页滚动加载；悬停快捷操作 + 点击/右键菜单） -->
    <div v-if="activeTab === 'members'" class="chatroom-member-sidebar__list" @scroll="handleListScroll">
      <ChatroomMemberItem
        v-for="member in members"
        :key="member.userId"
        :member="member"
        :manageable="canManageMember(member)"
        @manage="(m, e) => openContextMenu(e, m)"
        @contextmenu.prevent="openContextMenu($event, member)"
      >
        <template #manage-actions="{ member: m }">
          <button
            v-if="canManageMember(m) && props.management?.mute !== false"
            class="chatroom-member-sidebar__quick"
            :title="isMutedMember(m) ? t('chatroom.ui.unmute') : t('chatroom.ui.muteMinutes', '', { minutes: 10 })"
            @click.stop="handleQuickMute(m)"
          >
            {{ isMutedMember(m) ? t('chatroom.ui.unmute') : t('chatroom.ui.muteShort') }}
          </button>
          <button
            v-if="canManageMember(m) && props.management?.kick !== false"
            class="chatroom-member-sidebar__quick chatroom-member-sidebar__quick--danger"
            :title="t('chatroom.ui.kickMember')"
            @click.stop="handleQuickKick(m)"
          >
            {{ t('chatroom.ui.kickShort') }}
          </button>
        </template>
      </ChatroomMemberItem>
      <div v-if="membersHasMore" class="chatroom-member-sidebar__more">
        {{ t('chatroom.ui.memberLoadMore') }}
      </div>
    </div>

    <!-- 黑名单列表（owner/admin） -->
    <div v-else class="chatroom-member-sidebar__list">
      <div v-if="blocklist.length === 0" class="chatroom-member-sidebar__more">
        {{ t('chatroom.ui.emptyBlocklist') }}
      </div>
      <div
        v-for="member in blocklist"
        :key="member.userId"
        class="chatroom-member-sidebar__block-item"
      >
        <ChatroomMemberItem :member="member" :manageable="false" />
        <button class="chatroom-member-sidebar__unblock" @click="handleUnblock(member.userId)">
          {{ t('chatroom.ui.unblock') }}
        </button>
      </div>
    </div>

    <!-- 上下文菜单（点击 / 右键成员项） -->
    <ChatroomContextMenu
      v-model:show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenu.items"
      @select="handleContextSelect"
    />

    <!-- 危险操作确认（居中弹窗） -->
    <EmPopup
      :show="confirmTarget !== null"
      :to="getChatroomPopupTarget() ?? undefined"
      position="center"
      class="chatroom-member-sidebar__confirm"
      @update:show="(show: boolean) => { if (!show) { confirmTarget = null; confirmKind = null } }"
    >
      <div class="chatroom-member-sidebar__confirm-body">
        <div class="chatroom-member-sidebar__confirm-text">
          {{ confirmText }}
        </div>
        <div class="chatroom-member-sidebar__confirm-actions">
          <button class="chatroom-member-sidebar__confirm-btn" @click="confirmTarget = null; confirmKind = null">
            {{ t('chatroom.ui.cancel') }}
          </button>
          <button
            class="chatroom-member-sidebar__confirm-btn chatroom-member-sidebar__confirm-btn--danger"
            @click="handleConfirm"
          >
            {{ t('chatroom.ui.confirm') }}
          </button>
        </div>
      </div>
    </EmPopup>
  </div>
</template>

<style scoped>
.chatroom-member-sidebar {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.chatroom-member-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px 8px;
  flex-shrink: 0;
}

.chatroom-member-sidebar__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.chatroom-member-sidebar__count {
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

.chatroom-member-sidebar__tabs {
  display: flex;
  gap: 8px;
  padding: 0 16px 8px;
  flex-shrink: 0;
}

.chatroom-member-sidebar__tab {
  border: none;
  background: none;
  font-size: 13px;
  color: var(--uikit-text-secondary);
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
}

.chatroom-member-sidebar__tab--active {
  background: var(--uikit-bg-active, rgba(51, 177, 255, 0.12));
  color: var(--uikit-primary-color);
}

.chatroom-member-sidebar__tab--action {
  margin-left: auto;
  color: var(--uikit-danger-color, #e5484d);
}

.chatroom-member-sidebar__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.chatroom-member-sidebar__more {
  text-align: center;
  padding: 10px;
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

/* 悬停快捷操作按钮（member-item #manage-actions 插槽注入） */
.chatroom-member-sidebar__quick {
  padding: 2px 8px;
  border: none;
  border-radius: 999px;
  background: var(--uikit-bg-secondary, rgba(0, 0, 0, 0.05));
  color: var(--uikit-primary-color);
  font-size: 12px;
  cursor: pointer;
}

.chatroom-member-sidebar__quick--danger {
  color: var(--uikit-danger-color, #e5484d);
}

.chatroom-member-sidebar__block-item {
  display: flex;
  align-items: center;
}

.chatroom-member-sidebar__unblock {
  margin-right: 16px;
  padding: 4px 12px;
  border: none;
  border-radius: 999px;
  background: var(--uikit-bg-secondary, rgba(0, 0, 0, 0.04));
  color: var(--uikit-primary-color);
  font-size: 12px;
  cursor: pointer;
}

/* 确认弹窗 */
.chatroom-member-sidebar__confirm {
  width: 300px;
}

.chatroom-member-sidebar__confirm-body {
  padding: 20px 20px 16px;
  background: var(--uikit-bg-elevated, var(--uikit-bg-base, #fff));
  border-radius: var(--uikit-components-radius, 8px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chatroom-member-sidebar__confirm-text {
  font-size: 14px;
  color: var(--uikit-text-primary);
  line-height: 1.5;
}

.chatroom-member-sidebar__confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.chatroom-member-sidebar__confirm-btn {
  padding: 6px 16px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.12));
  border-radius: var(--uikit-components-radius, 8px);
  background: var(--uikit-bg-elevated, #fff);
  color: var(--uikit-text-primary);
  font-size: 13px;
  cursor: pointer;
}

.chatroom-member-sidebar__confirm-btn--danger {
  border-color: transparent;
  background: var(--uikit-danger-color, #e5484d);
  color: var(--uikit-text-inverse, #fff);
}
</style>
