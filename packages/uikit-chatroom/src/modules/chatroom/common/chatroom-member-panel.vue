<script setup lang="ts">
/**
 * 聊天室成员面板（H5 底部 Popup）：成员分页列表 + 管理操作菜单。
 * - 大房间不做全量加载：只渲染已加载页，滚动到底部自动加载下一页；
 * - 权限模型：owner/admin 可管理普通成员（禁言/踢人），owner 还可管理管理员
 *   （设/移除管理员）；成员不可管理房主与自己。
 */
import { computed, ref, watch } from 'vue'
import { EmActionSheet, EmPopup, normalizeUserId, t, useClient } from '@easemob/uikit-core'
import type { ActionSheetItem } from '@easemob/uikit-core'
import { CHATROOM_MEMBER_ROLE } from '../../../constants'
import { getChatroomPopupTarget } from '../../../config/popup-target'
import { useChatroom } from '../../../composables/use-chatroom'
import { useChatroomMember } from '../../../composables/use-chatroom-member'
import type { ChatroomMember } from '../../../sdk/domain/chatroom-domain'
import ChatroomMemberItem from '../common/chatroom-member-item.vue'

export interface ChatroomMemberPanelProps {
  /** 是否显示成员面板（v-model:show 受控，由容器 header 触发） */
  show: boolean
  /** 是否展示全员禁言入口（场景 features.muteAll 驱动，P3） */
  muteAllEnabled?: boolean
}

export interface ChatroomMemberPanelEmits {
  (e: 'update:show', value: boolean): void
}

const props = withDefaults(defineProps<ChatroomMemberPanelProps>(), {
  muteAllEnabled: false,
})
const emit = defineEmits<ChatroomMemberPanelEmits>()

const { currentUser } = useClient()
// 只消费公开 composable 契约（§5.10：禁止直取 store，P2 review P1-1）
const { roomInfo, isAllMuted } = useChatroom()
const {
  members,
  membersHasMore,
  muteList,
  isOwner,
  canManage,
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

/** 当前用户 ID（归一化，与成员列表 userId 比较口径一致，P2 review P2-3） */
const selfId = computed(() => normalizeUserId(currentUser.value ?? ''))
/** 在线人数（房间详情接口的当前人数，成员面板只展示已加载页） */
const memberCount = computed(() => roomInfo.value?.memberCount ?? 0)

/** 面板 tab：成员 / 黑名单（黑名单仅 owner/admin，P3） */
const activeTab = ref<'members' | 'blocklist'>('members')
/** 黑名单（分页加载） */
const blocklist = ref<ChatroomMember[]>([])

/** 目标成员（点击列表项设置；null 表示未选中） */
const targetMember = ref<ChatroomMember | null>(null)
/** 操作菜单显隐 */
const showSheet = ref(false)

/** 打开面板时拉取成员首页 + 刷新禁言名单（进房前已禁言的成员也能正确显示，P2 review P2-2） */
watch(() => props.show, (show) => {
  if (show) {
    void loadMembers(false).catch(() => {})
    void refreshMuteList().catch(() => {})
  }
})

/** 目标成员是否可被当前用户管理 */
const targetManageable = computed(() => {
  const target = targetMember.value
  if (!target || !canManage.value)
    return false
  // 不能管理房主与自己
  if (target.role === CHATROOM_MEMBER_ROLE.OWNER)
    return false
  if (target.userId === selfId.value)
    return false
  // 管理员只能由房主管理
  if (target.role === CHATROOM_MEMBER_ROLE.ADMIN && !isOwner.value)
    return false
  return true
})

/** 目标成员是否在禁言名单中（归一化比较） */
const targetMuteState = computed(() => {
  const target = targetMember.value
  if (!target)
    return false
  return muteList.value.some(item => normalizeUserId(item.userId) === target.userId)
})

/** 组装操作菜单（按权限过滤） */
const sheetActions = computed<ActionSheetItem[]>(() => {
  const target = targetMember.value
  if (!target || !targetManageable.value)
    return []
  const actions: ActionSheetItem[] = []
  if (targetMuteState.value)
    actions.push({ name: t('chatroom.ui.unmute') })
  actions.push(
    { name: t('chatroom.ui.muteMinutes', '', { minutes: 10 }) },
    { name: t('chatroom.ui.muteHours', '', { hours: 1 }) },
    { name: t('chatroom.ui.muteDay') },
  )
  actions.push({ name: t('chatroom.ui.kickMember'), color: 'var(--uikit-danger-color)' })
  if (isOwner.value) {
    actions.push(
      target.role === CHATROOM_MEMBER_ROLE.ADMIN
        ? { name: t('chatroom.ui.removeAdmin') }
        : { name: t('chatroom.ui.setAdmin') },
    )
  }
  return actions
})

/** 点击成员 → 弹操作菜单（无管理权限的成员不弹，防空菜单，P2 review P2-1） */
function handleManage(member: ChatroomMember) {
  targetMember.value = member
  // targetManageable 依赖 targetMember，需在赋值后读取
  if (!targetManageable.value)
    return
  showSheet.value = true
}

/** 选中操作项（顺序：解除禁言? → 禁言 10分/1时/1天 → 踢人 → 设/移除管理员） */
async function handleSelect(_item: ActionSheetItem, index: number) {
  const target = targetMember.value
  if (!target)
    return
  const hasUnmute = targetMuteState.value
  const idx = index - (hasUnmute ? 1 : 0)
  try {
    if (hasUnmute && index === 0) {
      await unmuteMembers([target.userId])
      return
    }
    if (idx === 0)
      await muteMembers([target.userId], 10 * 60)
    else if (idx === 1)
      await muteMembers([target.userId], 60 * 60)
    else if (idx === 2)
      await muteMembers([target.userId], 24 * 60 * 60)
    else if (idx === 3)
      await kickMembers([target.userId])
    else if (idx === 4)
      await (target.role === CHATROOM_MEMBER_ROLE.ADMIN ? removeAdmin(target.userId) : addAdmin(target.userId))
  }
  catch {
    // 失败已由 useChatroomMember toast
  }
}

/** 滚动到底部加载下一页成员 */
function handleListScroll(event: Event) {
  const el = event.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40 && membersHasMore.value) {
    void loadMembers(true).catch(() => {})
  }
}

/** 切换 tab：黑名单（owner/admin）首次进入拉取 */
function switchTab(tab: 'members' | 'blocklist') {
  activeTab.value = tab
  if (tab === 'blocklist' && blocklist.value.length === 0) {
    void loadBlocklist(false).then((items) => {
      blocklist.value = items
    }).catch(() => {})
  }
}

/** 移出黑名单（解除拉黑，成功后本地移除） */
async function handleUnblock(userId: string) {
  try {
    await unblockMembers([userId])
    blocklist.value = blocklist.value.filter(item => item.userId !== userId)
  }
  catch {
    // 失败已由 useChatroomMember toast
  }
}

/** 全员禁言 / 解除（场景 features.muteAll 开启且 owner/admin） */
function handleToggleMuteAll() {
  if (isAllMuted.value)
    void unmuteAll().catch(() => {})
  else
    void muteAll().catch(() => {})
}
</script>

<template>
  <EmPopup
    :to="getChatroomPopupTarget() ?? undefined"
    :show="props.show"
    position="bottom"
    :close-on-click-overlay="true"
    class="chatroom-member-panel"
    @update:show="emit('update:show', $event)"
  >
    <div class="chatroom-member-panel__header">
      <span class="chatroom-member-panel__title">{{ t('chatroom.ui.memberPanelTitle') }}</span>
      <span class="chatroom-member-panel__count">{{ t('chatroom.ui.memberCount', '', { count: memberCount }) }}</span>
    </div>

    <!-- tab 栏：成员 / 黑名单（黑名单仅 owner/admin；全员禁言入口随场景 muteAll 开启，P3） -->
    <div class="chatroom-member-panel__tabs">
      <button
        class="chatroom-member-panel__tab"
        :class="{ 'chatroom-member-panel__tab--active': activeTab === 'members' }"
        @click="switchTab('members')"
      >
        {{ t('chatroom.ui.members') }}
      </button>
      <button
        v-if="canManage"
        class="chatroom-member-panel__tab"
        :class="{ 'chatroom-member-panel__tab--active': activeTab === 'blocklist' }"
        @click="switchTab('blocklist')"
      >
        {{ t('chatroom.ui.blocklist') }}
      </button>
      <button
        v-if="muteAllEnabled && canManage"
        class="chatroom-member-panel__tab chatroom-member-panel__tab--action"
        @click="handleToggleMuteAll"
      >
        {{ isAllMuted ? t('chatroom.ui.unmuteAllAction') : t('chatroom.ui.muteAllAction') }}
      </button>
    </div>

    <!-- 成员列表 -->
    <div v-if="activeTab === 'members'" class="chatroom-member-panel__list" @scroll="handleListScroll">
      <slot
        v-for="member in members"
        :key="member.userId"
        name="item"
        :member="member"
        :manageable="canManage && member.userId !== selfId"
      >
        <ChatroomMemberItem
          :member="member"
          :manageable="canManage && member.userId !== selfId"
          @manage="handleManage"
        />
      </slot>
      <div v-if="membersHasMore" class="chatroom-member-panel__more">
        {{ t('chatroom.ui.memberLoadMore') }}
      </div>
    </div>

    <!-- 黑名单列表（owner/admin） -->
    <div v-else class="chatroom-member-panel__list">
      <div v-if="blocklist.length === 0" class="chatroom-member-panel__more">
        {{ t('chatroom.ui.emptyBlocklist') }}
      </div>
      <div
        v-for="member in blocklist"
        :key="member.userId"
        class="chatroom-member-panel__block-item"
      >
        <ChatroomMemberItem :member="member" :manageable="false" />
        <button class="chatroom-member-panel__unblock" @click="handleUnblock(member.userId)">
          {{ t('chatroom.ui.unblock') }}
        </button>
      </div>
    </div>
  </EmPopup>

  <EmActionSheet
    v-model:show="showSheet"
    :to="getChatroomPopupTarget() ?? undefined"
    :title="t('chatroom.ui.members')"
    :actions="sheetActions"
    @select="handleSelect"
  />
</template>

<style scoped>
.chatroom-member-panel {
  border-radius: 12px 12px 0 0;
  overflow: hidden;
}

.chatroom-member-panel__header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px 8px;
}

.chatroom-member-panel__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.chatroom-member-panel__count {
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

.chatroom-member-panel__tabs {
  display: flex;
  gap: 8px;
  padding: 0 16px 8px;
}

.chatroom-member-panel__tab {
  border: none;
  background: none;
  font-size: 13px;
  color: var(--uikit-text-secondary);
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
}

.chatroom-member-panel__tab--active {
  background: var(--uikit-bg-active, rgba(51, 177, 255, 0.12));
  color: var(--uikit-primary-color);
}

.chatroom-member-panel__tab--action {
  margin-left: auto;
  color: var(--uikit-danger-color, #e5484d);
}

.chatroom-member-panel__block-item {
  display: flex;
  align-items: center;
}

.chatroom-member-panel__unblock {
  margin-right: 16px;
  padding: 4px 12px;
  border: none;
  border-radius: 999px;
  background: var(--uikit-bg-secondary, rgba(0, 0, 0, 0.04));
  color: var(--uikit-primary-color);
  font-size: 12px;
  cursor: pointer;
}

.chatroom-member-panel__list {
  max-height: 60vh;
  overflow-y: auto;
  padding-bottom: var(--uikit-safe-bottom, 0px);
  -webkit-overflow-scrolling: touch;
}

.chatroom-member-panel__more {
  text-align: center;
  padding: 10px;
  font-size: 12px;
  color: var(--uikit-text-secondary);
}
</style>
