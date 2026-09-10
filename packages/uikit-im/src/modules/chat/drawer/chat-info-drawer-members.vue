<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { EmEmpty as Empty, GROUP_MEMBER_ROLE, EmIconButton as IconButton, useLocale } from '@easemob/uikit-core'
import type { GroupMemberRoleValue, UiGroupMember } from '@easemob/uikit-core'
import GroupMemberList from '../../group/group-member-list.vue'
import GroupMemberListItem from '../../group/group-member-list-item.vue'
import BlockList from '../../group/group-management/block-list.vue'
import MuteList from '../../group/group-management/mute-list.vue'

export interface ChatInfoDrawerMembersProps {
  /** 群 ID */
  groupId: string
  /** 群成员列表（抽屉注入的群成员缓存） */
  members: UiGroupMember[]
  /** 当前登录用户 ID */
  currentUserId: string
  /** 当前用户是否为群主 */
  isOwner: boolean
  /** 当前用户是否为管理员 */
  isAdmin: boolean
  /** 是否允许对成员发起单聊：'all' 所有人，'contact' 仅联系人，'none' 不允许 */
  allowChat?: 'all' | 'contact' | 'none'
}

const props = withDefaults(defineProps<ChatInfoDrawerMembersProps>(), {
  allowChat: 'all',
})

const emit = defineEmits<{
  (e: 'chat-member', member: UiGroupMember): void
  (e: 'remove-member', member: UiGroupMember): void
  (e: 'set-admin', member: UiGroupMember): void
  (e: 'remove-admin', member: UiGroupMember): void
  (e: 'mute-member', member: UiGroupMember): void
  (e: 'unmute-member', member: UiGroupMember): void
  (e: 'block-member', member: UiGroupMember): void
  (e: 'unblock-member', member: UiGroupMember): void
  (e: 'transfer-owner', member: UiGroupMember): void
  /** 黑名单/禁言分栏操作转发（与 group-management-section 的 group-operation 语义一致） */
  (e: 'group-operation', payload: { type: string, groupId: string, userId?: string }): void
}>()

const { t } = useLocale()

/** 分栏 key（白名单分栏已按产品决策移除） */
type MembersTab = 'all' | 'admin' | 'blocked' | 'muted'

const activeTab = ref<MembersTab>('all')

/**
 * 分栏显隐（对齐 group-management-section 入口角色逻辑）：
 * All/Admin 所有人可见；Blocked/Muted 群主+管理员可见
 */
const visibleTabs = computed<MembersTab[]>(() => {
  const tabs: MembersTab[] = ['all', 'admin']
  if (props.isOwner || props.isAdmin)
    tabs.push('blocked', 'muted')
  return tabs
})

// 必须是 computed：t 依赖 locale ref，普通对象只在 setup 时求值一次，切语言不会重译
const tabLabels = computed<Record<MembersTab, string>>(() => ({
  all: t('chat.info.memberTabAll', '全部'),
  admin: t('chat.info.groupAdmin', '管理员'),
  blocked: t('group.management.blocklist', '黑名单'),
  muted: t('group.management.muteList', '禁言列表'),
}))

/** 角色变化导致当前分栏不可见时回落 All */
watch(visibleTabs, (tabs) => {
  if (!tabs.includes(activeTab.value))
    activeTab.value = 'all'
})

// ===== tabs 横向滚动与溢出箭头 =====
const tabsScrollRef = ref<HTMLElement>()
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function updateScrollState() {
  const el = tabsScrollRef.value
  if (!el)
    return
  canScrollLeft.value = el.scrollLeft > 1
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

useResizeObserver(tabsScrollRef, updateScrollState)
watch(visibleTabs, async () => {
  await nextTick()
  updateScrollState()
}, { immediate: true })

function scrollTabs(direction: 'left' | 'right') {
  const el = tabsScrollRef.value
  if (!el)
    return
  // 按可视宽度整页滚动：一次点击即可把隐藏的后续分栏（如禁言列表）滚入可视区，
  // 滚动尽头由浏览器自动收敛（scrollWidth - clientWidth），不会过冲
  el.scrollBy({ left: direction === 'left' ? -el.clientWidth : el.clientWidth, behavior: 'smooth' })
}

// ===== All / Admin 分栏 =====
const allListRef = ref<InstanceType<typeof GroupMemberList>>()

const currentUserRole = computed<GroupMemberRoleValue>(() => {
  if (props.isOwner)
    return GROUP_MEMBER_ROLE.OWNER
  if (props.isAdmin)
    return GROUP_MEMBER_ROLE.ADMIN
  return GROUP_MEMBER_ROLE.MEMBER
})

/** Admin 分栏：仅群主 + 管理员 */
const adminMembers = computed(() =>
  props.members.filter(m => m.role === GROUP_MEMBER_ROLE.OWNER || m.role === GROUP_MEMBER_ROLE.ADMIN),
)

/** 转发抽屉 defineExpose 的成员列表操作（作用于 store 成员缓存，跨分栏生效） */
defineExpose({
  removeMember: (userId: string) => allListRef.value?.removeMember(userId),
  setMemberRole: (userId: string, role: UiGroupMember['role']) => allListRef.value?.setMemberRole(userId, role),
  refreshMemberList: () => allListRef.value?.refresh(),
})
</script>

<template>
  <div class="chat-info-drawer-members">
    <!-- 分栏 tabs：胶囊样式，横向可滚动，溢出时显示滚动箭头 -->
    <div class="chat-info-drawer-members__tabs">
      <IconButton
        v-if="canScrollLeft"
        class="chat-info-drawer-members__tabs-arrow"
        icon="chevron/left"
        size="small"
        variant="ghost"
        @click="scrollTabs('left')"
      />
      <div ref="tabsScrollRef" class="chat-info-drawer-members__tabs-scroll" @scroll="updateScrollState">
        <button
          v-for="tab in visibleTabs"
          :key="tab"
          class="chat-info-drawer-members__tab"
          :class="{ 'chat-info-drawer-members__tab--active': activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ tabLabels[tab] }}
        </button>
      </div>
      <IconButton
        v-if="canScrollRight"
        class="chat-info-drawer-members__tabs-arrow"
        icon="chevron/right"
        size="small"
        variant="ghost"
        @click="scrollTabs('right')"
      />
    </div>

    <!-- All：全部群成员（现有 GroupMemberList，⋮ 权限菜单保持现状） -->
    <div v-show="activeTab === 'all'" class="chat-info-drawer-members__pane">
      <GroupMemberList
        ref="allListRef"
        :group-id="props.groupId"
        :current-user-id="props.currentUserId"
        :allow-chat="props.allowChat"
        :show-header="false"
        :show-id="false"
        :show-no-more="false"
        border="bottom"
        search-pill
        @chat-member="emit('chat-member', $event)"
        @remove-member="emit('remove-member', $event)"
        @set-admin="emit('set-admin', $event)"
        @remove-admin="emit('remove-admin', $event)"
        @mute-member="emit('mute-member', $event)"
        @unmute-member="emit('unmute-member', $event)"
        @block-member="emit('block-member', $event)"
        @unblock-member="emit('unblock-member', $event)"
        @transfer-owner="emit('transfer-owner', $event)"
      />
    </div>

    <!-- Admin：仅群主 + 管理员（行组件同 All，⋮ 菜单按权限自适应） -->
    <div v-show="activeTab === 'admin'" class="chat-info-drawer-members__pane">
      <Empty
        v-if="adminMembers.length === 0"
        icon="person/double"
        :description="t('group.memberList.empty', '暂无成员')"
        size="small"
      />
      <template v-else>
        <GroupMemberListItem
          v-for="member in adminMembers"
          :key="member.userId"
          :member="member"
          :group-id="props.groupId"
          :current-user-id="props.currentUserId"
          :current-user-role="currentUserRole"
          :show-id="false"
          border="bottom"
          :show-mute-action="true"
          :show-block-action="true"
          :show-admin-action="true"
          :show-remove-action="true"
          :show-chat-action="true"
          :allow-chat="props.allowChat"
          @chat-member="emit('chat-member', $event)"
          @remove-member="emit('remove-member', $event)"
          @set-admin="emit('set-admin', $event)"
          @remove-admin="emit('remove-admin', $event)"
          @mute-member="emit('mute-member', $event)"
          @unmute-member="emit('unmute-member', $event)"
          @block-member="emit('block-member', $event)"
          @unblock-member="emit('unblock-member', $event)"
          @transfer-owner="emit('transfer-owner', $event)"
        />
      </template>
    </div>

    <!-- Blocked：黑名单（复用 block-list，操作=移出黑名单） -->
    <div v-show="activeTab === 'blocked'" class="chat-info-drawer-members__pane">
      <BlockList
        :group-id="props.groupId"
        border="bottom"
        @unblock="emit('group-operation', { type: 'unblock-member', groupId: props.groupId, userId: $event.userId })"
        @block="emit('group-operation', { type: 'block-member', groupId: props.groupId, userId: $event[0]?.userId })"
      />
    </div>

    <!-- Muted：禁言列表（复用 mute-list，操作=解除禁言；隐藏自带计数栏） -->
    <div v-show="activeTab === 'muted'" class="chat-info-drawer-members__pane">
      <MuteList
        :group-id="props.groupId"
        :show-header="false"
        border="bottom"
        @unmute="emit('group-operation', { type: 'unmute-member', groupId: props.groupId, userId: $event.userId })"
        @mute="emit('group-operation', { type: 'mute-member', groupId: props.groupId, userId: $event[0]?.userId })"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-info-drawer-members {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.chat-info-drawer-members__tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  /* 外层 member-detail 容器已通栏化（无横向 padding），tabs 行自行保持 16px 内收 */
  padding: 0 16px 8px;
  flex-shrink: 0;
}

.chat-info-drawer-members__tabs-arrow {
  flex-shrink: 0;
}

.chat-info-drawer-members__tabs-scroll {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  flex: 1;
  min-width: 0;
}

.chat-info-drawer-members__tabs-scroll::-webkit-scrollbar {
  display: none;
}

/* 胶囊 tab：未选中灰底、选中主色字 + 主色 12% 浅底 */
.chat-info-drawer-members__tab {
  flex-shrink: 0;
  padding: 6px 14px;
  border: none;
  border-radius: 999px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-13);
  cursor: pointer;
  white-space: nowrap;
  transition:
    color var(--uikit-anim-duration) var(--uikit-anim-easing),
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.chat-info-drawer-members__tab--active {
  background-color: rgba(var(--uikit-primary-rgb), 0.12);
  color: var(--uikit-primary-color);
  font-weight: 500;
}

.chat-info-drawer-members__pane {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
</style>
