<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { formatSdkError } from '../../utils/sdk-error'
import IconButton from '../../components/icon-button/icon-button.vue'
import Input from '../../components/input/input.vue'
import { useLocale } from '../../locale'
import { useUIKit } from '../../composables/use-uikit'
import { useGroup } from '../../composables/use-group'
import { usePresence } from '../../composables/use-presence'
import { useToast } from '../../composables/use-toast'
import type { UiGroup, UiGroupMember } from '../../sdk/types'
import type { PresenceDisplayStatus } from '../../components/avatar/avatar.vue'
import Empty from '../../components/empty/empty.vue'
import GroupMemberListItem from './group-member-list-item.vue'

export interface GroupMemberListProps {
  groupId: string
  group?: UiGroup | null
  members?: UiGroupMember[]
  loading?: boolean
  hasMore?: boolean
  currentUserId?: string
  showSearch?: boolean
  /** 是否在标题栏显示关闭按钮 */
  closable?: boolean
  /** 是否展示头部标题栏 */
  showHeader?: boolean
  /** 是否允许对成员发起单聊：'all' 所有人，'contact' 仅联系人，'none' 不允许 */
  allowChat?: 'all' | 'contact' | 'none'
  /** 是否展示禁言/取消禁言操作 */
  showMuteAction?: boolean
  /** 是否展示拉黑/取消拉黑操作 */
  showBlockAction?: boolean
  /** 是否展示设/取消管理员操作 */
  showAdminAction?: boolean
  /** 是否展示移除成员操作 */
  showRemoveAction?: boolean
  /** 是否展示发消息操作 */
  showChatAction?: boolean
}

const props = withDefaults(defineProps<GroupMemberListProps>(), {
  group: null,
  members: () => [],
  loading: false,
  hasMore: false,
  currentUserId: '',
  showSearch: true,
  closable: false,
  showHeader: true,
  allowChat: 'all',
  showMuteAction: true,
  showBlockAction: true,
  showAdminAction: true,
  showRemoveAction: true,
  showChatAction: true,
})

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
  (e: 'load-more'): void
  (e: 'close'): void
}>()

const { t } = useLocale()
const { show: showToast } = useToast()
const { stores, features } = useUIKit()
const { fetchGroupMembers } = useGroup()
const { fetchPresence, getPresence } = usePresence()

const searchKeyword = ref('')
const loadingMore = ref(false)
const cursor = ref<string | undefined>(undefined)
const localHasMore = ref(props.hasMore)
/** 首次拉取成功后以 store 为唯一数据源；拉取前/失败时回退到 props.members（独立使用场景） */
const hasFetched = ref(false)
const storeMembers = computed(() => stores.group.getGroupMembers(props.groupId))
const displayMembers = computed<UiGroupMember[]>(() =>
  hasFetched.value || storeMembers.value.length > 0 ? storeMembers.value : props.members,
)

// Presence 可视区域懒加载
const itemsRef = ref<HTMLElement>()
const visibleUserIds = ref<Set<string>>(new Set())
const observedUserIds = ref<Set<string>>(new Set())
let presenceObserver: IntersectionObserver | null = null
let presenceFetchTimer: ReturnType<typeof setTimeout> | null = null

function ensurePresenceObserver() {
  if (presenceObserver || !itemsRef.value || !features.fetchGroupMemberPresenceOnVisible)
    return
  presenceObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const id = entry.target.getAttribute('data-member-id')
      if (!id)
        return
      if (entry.isIntersecting)
        visibleUserIds.value.add(id)
      else
        visibleUserIds.value.delete(id)
    })
    scheduleFetchPresence()
  }, { root: itemsRef.value, threshold: 0 })
}

function observeMembers() {
  nextTick(() => {
    ensurePresenceObserver()
    const items = itemsRef.value?.querySelectorAll<HTMLElement>('[data-member-id]') ?? []
    items.forEach((item) => {
      const id = item.getAttribute('data-member-id')
      if (id && !observedUserIds.value.has(id)) {
        presenceObserver?.observe(item)
        observedUserIds.value.add(id)
      }
    })
  })
}

function scheduleFetchPresence() {
  if (presenceFetchTimer)
    clearTimeout(presenceFetchTimer)
  presenceFetchTimer = setTimeout(() => {
    if (!features.enablePresence)
      return
    const ids = Array.from(visibleUserIds.value).filter(id => !getPresence(id))
    if (ids.length > 0)
      void fetchPresence(ids)
  }, 200)
}

function getMemberPresence(userId: string): PresenceDisplayStatus | undefined {
  return getPresence(userId)?.status as PresenceDisplayStatus | undefined
}

// 卸载时清理 IntersectionObserver 与 presence 拉取定时器
onBeforeUnmount(() => {
  if (presenceObserver) {
    presenceObserver.disconnect()
    presenceObserver = null
  }
  if (presenceFetchTimer) {
    clearTimeout(presenceFetchTimer)
    presenceFetchTimer = null
  }
})

watch(() => props.hasMore, (val) => {
  localHasMore.value = val
}, { immediate: true })

const groupInfo = computed(() => props.group || stores.group.getGroupById(props.groupId))
const currentUserRole = computed<'owner' | 'admin' | 'member'>(() => {
  const member = displayMembers.value.find(m => m.userId === props.currentUserId)
  return (member?.role as 'owner' | 'admin' | 'member' | undefined) || 'member'
})

const filteredMembers = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword)
    return displayMembers.value
  return displayMembers.value.filter((m) => {
    const name = (m.nickname || m.userId).toLowerCase()
    return name.includes(keyword)
  })
})

watch(
  () => filteredMembers.value.map(m => m.userId).join(','),
  () => {
    observeMembers()
  },
  { immediate: true },
)

async function initialLoad() {
  try {
    // domain 内部会把结果写入 store（setGroupMembers/appendGroupMembers），这里只维护分页游标
    const result = await fetchGroupMembers(props.groupId)
    hasFetched.value = true
    cursor.value = result.cursor
    localHasMore.value = result.hasMore ?? false
  }
  catch (err) {
    console.warn('[GroupMemberList] load members failed:', formatSdkError(err))
    showToast(t('group.memberList.loadFailed') || '加载群成员失败')
  }
}

async function onLoadMore() {
  if (loadingMore.value || !localHasMore.value)
    return
  loadingMore.value = true
  try {
    const result = await fetchGroupMembers(props.groupId, cursor.value)
    cursor.value = result.cursor
    localHasMore.value = result.hasMore ?? false
    emit('load-more')
  }
  catch (err) {
    console.warn('[GroupMemberList] load more members failed:', formatSdkError(err))
    showToast(t('group.memberList.loadMoreFailed') || '加载更多失败')
  }
  finally {
    loadingMore.value = false
  }
}

watch(() => props.groupId, (id) => {
  if (id) {
    searchKeyword.value = ''
    cursor.value = undefined
    initialLoad()
  }
}, { immediate: true })

function clearSearch() {
  searchKeyword.value = ''
}

async function refresh() {
  cursor.value = undefined
  await initialLoad()
}

function removeMember(userId: string) {
  stores.group.removeGroupMembers(props.groupId, [userId])
}

function setMemberRole(userId: string, role: UiGroupMember['role']) {
  stores.group.updateGroupMemberRole(props.groupId, userId, role)
}

defineExpose({ refresh, removeMember, setMemberRole })
</script>

<template>
  <div class="group-member-list">
    <!-- 头部标题 -->
    <div v-if="props.showHeader" class="group-member-list__header">
      <div class="group-member-list__header-left">
        <span class="group-member-list__title">{{ t('group.memberList.title') || '群成员' }}</span>
        <span class="group-member-list__count">{{ groupInfo?.memberCount ?? displayMembers.length }}</span>
      </div>
      <IconButton
        v-if="props.closable"
        class="group-member-list__close"
        icon="actions/close"
        size="small"
        variant="ghost"
        :title="t('button.close') || '关闭'"
        @click="emit('close')"
      />
    </div>

    <!-- 搜索 -->
    <div v-if="props.showSearch" class="group-member-list__search">
      <Input
        v-model="searchKeyword"
        variant="search"
        :placeholder="t('group.memberList.searchPlaceholder') || '搜索群成员'"
        prefix-icon="misc/magnifier2"
      />
      <IconButton
        v-if="searchKeyword"
        class="group-member-list__clear"
        icon="actions/close"
        size="small"
        variant="ghost"
        :title="t('button.clear') || '清除'"
        @click="clearSearch"
      />
    </div>

    <!-- 成员列表 -->
    <div ref="itemsRef" class="group-member-list__items">
      <div v-if="props.loading && filteredMembers.length === 0" class="group-member-list__empty">
        <span class="group-member-list__empty-text">{{ t('common.loading') }}</span>
      </div>

      <Empty
        v-else-if="filteredMembers.length === 0"
        :icon="searchKeyword ? 'empty/search' : 'empty/members'"
        :description="searchKeyword ? (t('group.memberList.noSearchResult') || '未找到相关成员') : (t('group.memberList.empty') || '暂无成员')"
        size="small"
      />

      <template v-else>
        <GroupMemberListItem
          v-for="member in filteredMembers"
          :key="member.userId"
          :member="member"
          :group-id="props.groupId"
          :current-user-id="props.currentUserId"
          :current-user-role="currentUserRole"
          :show-mute-action="props.showMuteAction"
          :show-block-action="props.showBlockAction"
          :show-admin-action="props.showAdminAction"
          :show-remove-action="props.showRemoveAction"
          :show-chat-action="props.showChatAction"
          :allow-chat="props.allowChat"
          :presence="getMemberPresence(member.userId)"
          @click-member="emit('click-member', $event)"
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

        <!-- 加载更多 -->
        <div v-if="localHasMore || loadingMore" class="group-member-list__load-more">
          <button
            v-if="!loadingMore"
            class="group-member-list__load-more-btn"
            @click="onLoadMore"
          >
            {{ t('group.memberList.loadMore') || '加载更多' }}
          </button>
          <span v-else class="group-member-list__load-more-text">{{ t('common.loading') }}</span>
        </div>

        <div v-else-if="!localHasMore && filteredMembers.length > 0" class="group-member-list__no-more">
          <span>{{ t('group.memberList.noMore') || '没有更多了' }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.group-member-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--uikit-bg-base);
}

.group-member-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--uikit-border-color, #f3f4f6);
  flex-shrink: 0;
}

.group-member-list__header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-member-list__close {
  flex-shrink: 0;
  margin: -4px -8px -4px 0;
}

/* 抽屉背景与默认 ghost hover 色阶接近，特调关闭按钮 hover 使其更明显 */
.group-member-list__close:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.12) !important;
}

[data-uikit-theme='dark'] .group-member-list__close:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.18) !important;
}

.group-member-list__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.group-member-list__count {
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  background-color: var(--uikit-text-secondary);
  padding: 1px 7px;
  border-radius: 10px;
}

.group-member-list__search {
  position: relative;
  padding: 8px 16px;
  flex-shrink: 0;
}

.group-member-list__clear {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
}

.group-member-list__items {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.group-member-list__load-more,
.group-member-list__no-more,
.group-member-list__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.group-member-list__empty {
  flex-direction: column;
  gap: 8px;
  padding: 40px 16px;
}

.group-member-list__empty-text,
.group-member-list__no-more,
.group-member-list__load-more-text {
  font-size: 14px;
  color: var(--uikit-text-secondary);
}

.group-member-list__load-more-btn {
  border: none;
  background: none;
  color: var(--uikit-primary-color);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
}

.group-member-list__load-more-btn:hover {
  opacity: 0.8;
}
</style>
