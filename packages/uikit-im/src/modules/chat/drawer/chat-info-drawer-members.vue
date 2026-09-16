<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { EmEmpty as Empty, GROUP_MEMBER_ROLE, EmIconButton as IconButton, EmInput as Input, createLogger, formatSdkError, useLocale } from '@easemob/uikit-core'
import type { GroupMemberRoleValue, UiGroupMember } from '@easemob/uikit-core'
import { useGroup } from '../../../composables/use-group'
import { useUIKit } from '../../../composables/use-uikit'
import GroupMemberList from '../../group/group-member-list.vue'
import GroupMemberListItem from '../../group/group-member-list-item.vue'

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
}>()

const logger = createLogger('UIKit:ChatInfoDrawerMembers')
const { t } = useLocale()
const { stores } = useUIKit()
const { getGroupMuteList: fetchMuteList, getGroupBlocklist: fetchBlocklist } = useGroup()

/** 分栏 key（顺序对齐设计稿 All/Admin/Banned/Blocked；白名单分栏已按产品决策移除） */
type MembersTab = 'all' | 'admin' | 'muted' | 'blocked'

const activeTab = ref<MembersTab>('all')

/**
 * 分栏显隐（对齐 group-management-section 入口角色逻辑）：
 * All/Admin 所有人可见；Muted/Blocked 群主+管理员可见
 */
const visibleTabs = computed<MembersTab[]>(() => {
  const tabs: MembersTab[] = ['all', 'admin']
  if (props.isOwner || props.isAdmin)
    tabs.push('muted', 'blocked')
  return tabs
})

// 必须是 computed：t 依赖 locale ref，普通对象只在 setup 时求值一次，切语言不会重译
const tabLabels = computed<Record<MembersTab, string>>(() => ({
  all: t('chat.info.memberTabAll', '全部'),
  admin: t('chat.info.groupAdmin', '管理员'),
  muted: t('chat.info.memberTabMuted', '禁言'),
  blocked: t('chat.info.memberTabBlocked', '拉黑'),
}))

/** 角色变化导致当前分栏不可见时回落 All */
watch(visibleTabs, (tabs) => {
  if (!tabs.includes(activeTab.value))
    activeTab.value = 'all'
})

// ===== 共享搜索框（四个分栏共用一个关键词） =====
const keyword = ref('')
const searchInputRef = ref<InstanceType<typeof Input>>()

/** 聚焦共享搜索框（一级页假搜索框点击进入 members 页时由抽屉调用） */
function focusSearch() {
  nextTick(() => {
    searchInputRef.value?.inputRef?.focus()
  })
}

// ===== tabs 横向滚动与溢出箭头（右侧一组，仅溢出时显示） =====
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
  // 按可视宽度整页滚动：一次点击即可把隐藏的后续分栏滚入可视区，
  // 滚动尽头由浏览器自动收敛（scrollWidth - clientWidth），不会过冲
  el.scrollBy({ left: direction === 'left' ? -el.clientWidth : el.clientWidth, behavior: 'smooth' })
}

// ===== 禁言/拉黑数据保障 =====
// 仅群主/管理员可见这两个分栏才拉取；domain 内部会把结果写入 store 缓存
// （getGroupMuteList/getGroupBlocklist），All 分栏成员行的禁言/拉黑徽标也依赖这份数据
watch(
  () => [props.groupId, props.isOwner || props.isAdmin] as const,
  ([groupId, canManage]) => {
    if (!groupId || !canManage)
      return
    fetchMuteList(groupId).catch((err) => {
      logger.warn('load mute list failed:', formatSdkError(err))
    })
    fetchBlocklist(groupId).catch((err) => {
      logger.warn('load blocklist failed:', formatSdkError(err))
    })
  },
  { immediate: true },
)

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

/** 禁言/拉黑分栏数据源直接读 store 缓存：domain 操作与事件回推都会同步 store，分栏切换响应式更新 */
const mutedMembers = computed<UiGroupMember[]>(() => stores.group.getGroupMuteList(props.groupId))
const blockedMembers = computed<UiGroupMember[]>(() => stores.group.getGroupBlocklist(props.groupId))

/**
 * 当前分栏成员（Admin/Muted/Blocked 共用渲染），叠加共享搜索框关键词过滤：
 * nickname || userId 小写 includes（与原成员搜索页同口径）
 */
const currentTabMembers = computed<UiGroupMember[]>(() => {
  let list: UiGroupMember[] = []
  if (activeTab.value === 'admin')
    list = adminMembers.value
  else if (activeTab.value === 'muted')
    list = mutedMembers.value
  else if (activeTab.value === 'blocked')
    list = blockedMembers.value
  const kw = keyword.value.trim().toLowerCase()
  if (!kw)
    return list
  return list.filter(m => (m.nickname || m.userId).toLowerCase().includes(kw))
})

/** 转发抽屉 defineExpose 的成员列表操作（作用于 store 成员缓存，跨分栏生效） */
defineExpose({
  removeMember: (userId: string) => allListRef.value?.removeMember(userId),
  setMemberRole: (userId: string, role: UiGroupMember['role']) => allListRef.value?.setMemberRole(userId, role),
  refreshMemberList: () => allListRef.value?.refresh(),
  focusSearch,
})
</script>

<template>
  <div class="chat-info-drawer-members">
    <!-- 分栏 tabs：胶囊样式，横向可滚动，溢出时右侧显示一组滚动箭头 -->
    <div class="chat-info-drawer-members__tabs">
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
      <div v-if="canScrollLeft || canScrollRight" class="chat-info-drawer-members__tabs-arrows">
        <IconButton
          v-if="canScrollLeft"
          class="chat-info-drawer-members__tabs-arrow"
          icon="chevron/left"
          :icon-size="12"
          size="small"
          variant="ghost"
          @click="scrollTabs('left')"
        />
        <IconButton
          v-if="canScrollRight"
          class="chat-info-drawer-members__tabs-arrow"
          icon="chevron/right"
          :icon-size="12"
          size="small"
          variant="ghost"
          @click="scrollTabs('right')"
        />
      </div>
    </div>

    <!-- 共享搜索框（设计稿：tabs 下方一个搜索框服务所有分栏） -->
    <div class="chat-info-drawer-members__search">
      <Input
        ref="searchInputRef"
        v-model="keyword"
        variant="search"
        pill
        clearable
        clear-icon="search/xmark"
        :placeholder="t('group.memberList.searchPlaceholder', '搜索群成员')"
        prefix-icon="search"
      />
    </div>

    <!-- All：全部群成员（GroupMemberList 承担游标分页/presence 懒加载，
         隐藏自带搜索框，由共享搜索框经受控 keyword 驱动过滤与高亮） -->
    <div v-show="activeTab === 'all'" class="chat-info-drawer-members__pane">
      <GroupMemberList
        ref="allListRef"
        :group-id="props.groupId"
        :current-user-id="props.currentUserId"
        :allow-chat="props.allowChat"
        :keyword="keyword"
        :show-search="false"
        :show-header="false"
        :show-id="false"
        :show-no-more="false"
        border="bottom"
        menu-with-icon
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

    <!-- Admin/Muted/Blocked：同一口径成员行（行组件同 All，⋮ 菜单按权限自适应） -->
    <div v-if="activeTab !== 'all'" class="chat-info-drawer-members__pane">
      <Empty
        v-if="currentTabMembers.length === 0"
        icon="search"
        :description="t('group.memberList.noSearchResult', '未找到相关成员')"
        size="small"
      />
      <template v-else>
        <GroupMemberListItem
          v-for="member in currentTabMembers"
          :key="member.userId"
          :member="member"
          :group-id="props.groupId"
          :current-user-id="props.currentUserId"
          :current-user-role="currentUserRole"
          :highlight="keyword.trim()"
          :show-id="false"
          border="bottom"
          :show-mute-action="true"
          :show-block-action="true"
          :show-admin-action="true"
          :show-remove-action="true"
          :show-chat-action="true"
          :allow-chat="props.allowChat"
          menu-with-icon
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
  /* 设计稿：tabs 行上下留白 + 12px 横向内收（与下方搜索框/成员行的 12px 口径一致） */
  padding: 12px 12px 8px;
  flex-shrink: 0;
}

/* 溢出箭头成组置于 tabs 行右侧（设计稿） */
.chat-info-drawer-members__tabs-arrows {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.chat-info-drawer-members__tabs-scroll {
  display: flex;
  align-items: center;
  /* 胶囊间距 9px（设计稿） */
  gap: 9px;
  overflow-x: auto;
  scrollbar-width: none;
  flex: 1;
  min-width: 0;
}

.chat-info-drawer-members__tabs-scroll::-webkit-scrollbar {
  display: none;
}

/* 胶囊 tab（设计稿）：padding 4px 12px；
   未选中 = --uikit-bg-hover(#F5F5F5) 底 + 主文字 14px/400，选中 = --uikit-bg-active 底 + 主色字 14px/500 */
.chat-info-drawer-members__tab {
  flex-shrink: 0;
  padding: 4px 12px;
  border: none;
  border-radius: 999px;
  background-color: var(--uikit-bg-hover);
  color: var(--uikit-text-primary);
  font-size: var(--uikit-font-size-14);
  font-weight: 400;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color var(--uikit-anim-duration) var(--uikit-anim-easing),
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.chat-info-drawer-members__tab--active {
  background-color: var(--uikit-bg-active);
  color: var(--uikit-primary-color);
  font-weight: 500;
}

/* 共享搜索框容器（设计稿：padding 8px 12px） */
.chat-info-drawer-members__search {
  padding: 8px 12px;
  flex-shrink: 0;
}

.chat-info-drawer-members__pane {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
</style>
