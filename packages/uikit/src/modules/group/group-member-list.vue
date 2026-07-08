<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Avatar from '../../components/avatar/avatar.vue'
import Icon from '../../components/icon/icon.vue'
import Input from '../../components/input/input.vue'
import { useLocale } from '../../locale'
import { useUIKit } from '../../composables/use-uikit'
import { useGroup } from '../../composables/use-group'
import { usePresence } from '../../composables/use-presence'
import { useToast } from '../../composables/use-toast'
import type { UiGroup, UiGroupMember } from '../../sdk/types'
import type { PresenceDisplayStatus } from '../../components/avatar/avatar.vue'

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
const localMembers = ref<UiGroupMember[]>(props.members)

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

watch(() => props.members, (val) => {
  localMembers.value = val
}, { immediate: true })

watch(() => props.hasMore, (val) => {
  localHasMore.value = val
}, { immediate: true })

const groupInfo = computed(() => props.group || stores.group.getGroupById(props.groupId))
const currentUserRole = computed(() => {
  const member = localMembers.value.find(m => m.userId === props.currentUserId)
  return member?.role || 'member'
})
const isOwner = computed(() => currentUserRole.value === 'owner')
const isAdmin = computed(() => currentUserRole.value === 'admin')

const filteredMembers = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword)
    return localMembers.value
  return localMembers.value.filter((m) => {
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
    const result = await fetchGroupMembers(props.groupId)
    localMembers.value = result.members
    cursor.value = result.cursor
    localHasMore.value = result.hasMore ?? false
  }
  catch (err) {
    console.warn('[GroupMemberList] load members failed:', err)
    showToast(t('group.memberList.loadFailed') || '加载群成员失败')
  }
}

async function onLoadMore() {
  if (loadingMore.value || !localHasMore.value)
    return
  loadingMore.value = true
  try {
    const result = await fetchGroupMembers(props.groupId, cursor.value)
    localMembers.value = [...localMembers.value, ...result.members]
    cursor.value = result.cursor
    localHasMore.value = result.hasMore ?? false
    emit('load-more')
  }
  catch (err) {
    console.warn('[GroupMemberList] load more members failed:', err)
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

function canRemove(member: UiGroupMember): boolean {
  if (member.userId === props.currentUserId)
    return false
  if (isOwner.value)
    return true
  if (isAdmin.value && member.role === 'member')
    return true
  return false
}

function canSetAdmin(member: UiGroupMember): boolean {
  return isOwner.value && member.userId !== props.currentUserId && member.role !== 'admin'
}

function canRemoveAdmin(member: UiGroupMember): boolean {
  return isOwner.value && member.userId !== props.currentUserId && member.role === 'admin'
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

// ===== 禁言/拉黑权限检查 =====
function canMute(member: UiGroupMember): boolean {
  if (!props.showMuteAction)
    return false
  if (member.userId === props.currentUserId)
    return false
  if (isMemberMuted(props.groupId, member.userId))
    return false
  if (isOwner.value)
    return true
  if (isAdmin.value && member.role === 'member')
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
  if (isAdmin.value && member.role === 'member')
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

function roleClass(role?: string): string {
  if (role === 'owner')
    return 'group-member-list__role--owner'
  if (role === 'admin')
    return 'group-member-list__role--admin'
  return ''
}

function roleLabel(role?: string): string {
  if (role === 'owner')
    return t('group.memberList.owner') || '群主'
  if (role === 'admin')
    return t('group.memberList.admin') || '管理员'
  return t('group.memberList.member') || '成员'
}

function displayName(member: UiGroupMember): string {
  return member.nickname || member.userId
}

function onMemberClick(member: UiGroupMember) {
  emit('click-member', member)
}

function onChat(member: UiGroupMember) {
  emit('chat-member', member)
}

function onRemove(member: UiGroupMember) {
  emit('remove-member', member)
}

function onSetAdmin(member: UiGroupMember) {
  emit('set-admin', member)
}

function onRemoveAdmin(member: UiGroupMember) {
  emit('remove-admin', member)
}

function onMute(member: UiGroupMember) {
  emit('mute-member', member)
}

function onUnmute(member: UiGroupMember) {
  emit('unmute-member', member)
}

function onBlock(member: UiGroupMember) {
  emit('block-member', member)
}

function onUnblock(member: UiGroupMember) {
  emit('unblock-member', member)
}

function clearSearch() {
  searchKeyword.value = ''
}

async function refresh() {
  cursor.value = undefined
  await initialLoad()
}

function removeMember(userId: string) {
  localMembers.value = localMembers.value.filter(m => m.userId !== userId)
}

function setMemberRole(userId: string, role: UiGroupMember['role']) {
  const member = localMembers.value.find(m => m.userId === userId)
  if (member)
    member.role = role
}

defineExpose({ refresh, removeMember, setMemberRole })
</script>

<template>
  <div class="group-member-list">
    <!-- 头部标题 -->
    <div class="group-member-list__header">
      <div class="group-member-list__header-left">
        <span class="group-member-list__title">{{ t('group.memberList.title') || '群成员' }}</span>
        <span class="group-member-list__count">{{ groupInfo?.memberCount ?? localMembers.length }}</span>
      </div>
      <button
        v-if="props.closable"
        class="group-member-list__close"
        @click="emit('close')"
      >
        <Icon name="actions/xmark_thick" :size="16" />
      </button>
    </div>

    <!-- 搜索 -->
    <div v-if="props.showSearch" class="group-member-list__search">
      <Input
        v-model="searchKeyword"
        variant="search"
        :placeholder="t('group.memberList.searchPlaceholder') || '搜索群成员'"
        prefix-icon="misc/magnifier2"
      />
      <button v-if="searchKeyword" class="group-member-list__clear" @click="clearSearch">
        <Icon name="actions/xmark_thick" :size="14" />
      </button>
    </div>

    <!-- 成员列表 -->
    <div ref="itemsRef" class="group-member-list__items">
      <div v-if="props.loading && filteredMembers.length === 0" class="group-member-list__empty">
        <span class="group-member-list__empty-text">{{ t('common.loading') }}</span>
      </div>

      <div v-else-if="filteredMembers.length === 0" class="group-member-list__empty">
        <span class="group-member-list__empty-text">
          {{ searchKeyword ? (t('group.memberList.noSearchResult') || '未找到相关成员') : (t('group.memberList.empty') || '暂无成员') }}
        </span>
      </div>

      <template v-else>
        <div
          v-for="member in filteredMembers"
          :key="member.userId"
          class="group-member-list__item"
          :data-member-id="member.userId"
          @click="onMemberClick(member)"
        >
          <Avatar
            class="group-member-list__avatar"
            :name="displayName(member)"
            :src="member.avatarUrl"
            :size="40"
            :presence="getMemberPresence(member.userId)"
          />

          <div class="group-member-list__info">
            <div class="group-member-list__name-row">
              <span class="group-member-list__name">{{ displayName(member) }}</span>
              <span
                v-if="member.role !== 'member'"
                class="group-member-list__role"
                :class="roleClass(member.role)"
              >
                {{ roleLabel(member.role) }}
              </span>
              <span
                v-if="isMemberMuted(props.groupId, member.userId)"
                class="group-member-list__status-tag group-member-list__status-tag--muted"
              >
                {{ t('group.memberList.muted') || '禁言中' }}
              </span>
              <span
                v-if="isMemberBlocked(props.groupId, member.userId)"
                class="group-member-list__status-tag group-member-list__status-tag--blocked"
              >
                {{ t('group.memberList.blocked') || '已拉黑' }}
              </span>
              <span
                v-if="isMemberInAllowlist(props.groupId, member.userId)"
                class="group-member-list__status-tag group-member-list__status-tag--allowlist"
              >
                {{ t('group.memberList.inAllowlist') || '白名单' }}
              </span>
            </div>
            <div class="group-member-list__id">
              ID: {{ member.userId }}
            </div>
          </div>

          <div class="group-member-list__actions" @click.stop>
            <button
              v-if="canChat(member)"
              class="group-member-list__action-btn"
              @click="onChat(member)"
            >
              {{ t('group.memberList.chat') || '发消息' }}
            </button>

            <button
              v-if="canMute(member)"
              class="group-member-list__action-btn"
              @click="onMute(member)"
            >
              {{ t('group.memberList.mute') || '禁言' }}
            </button>

            <button
              v-if="canUnmute(member)"
              class="group-member-list__action-btn"
              @click="onUnmute(member)"
            >
              {{ t('group.memberList.unmute') || '取消禁言' }}
            </button>

            <button
              v-if="canBlock(member)"
              class="group-member-list__action-btn group-member-list__action-btn--danger"
              @click="onBlock(member)"
            >
              {{ t('group.memberList.block') || '拉黑' }}
            </button>

            <button
              v-if="canUnblock(member)"
              class="group-member-list__action-btn"
              @click="onUnblock(member)"
            >
              {{ t('group.memberList.unblock') || '取消拉黑' }}
            </button>

            <button
              v-if="props.showAdminAction && canSetAdmin(member)"
              class="group-member-list__action-btn"
              @click="onSetAdmin(member)"
            >
              {{ t('group.memberList.setAdmin') || '设管理员' }}
            </button>

            <button
              v-if="props.showAdminAction && canRemoveAdmin(member)"
              class="group-member-list__action-btn"
              @click="onRemoveAdmin(member)"
            >
              {{ t('group.memberList.removeAdmin') || '取消管理员' }}
            </button>

            <button
              v-if="props.showRemoveAction && canRemove(member)"
              class="group-member-list__action-btn group-member-list__action-btn--danger"
              @click="onRemove(member)"
            >
              {{ t('group.memberList.remove') || '移除' }}
            </button>
          </div>
        </div>

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
  background: none;
  border: none;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  margin: -4px -8px -4px 0;
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
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.group-member-list__items {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.group-member-list__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.group-member-list__item:hover {
  background-color: var(--uikit-bg-secondary);
}

.group-member-list__avatar {
  flex-shrink: 0;
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
  font-size: 15px;
  font-weight: 500;
  color: var(--uikit-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-member-list__role {
  font-size: 10px;
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
  font-size: 10px;
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
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

.group-member-list__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.group-member-list__item:hover .group-member-list__actions {
  opacity: 1;
}

.group-member-list__action-btn {
  padding: 5px 10px;
  border-radius: var(--uikit-components-radius, 5px);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.group-member-list__action-btn:hover {
  background-color: var(--uikit-bg-secondary);
}

.group-member-list__action-btn--danger {
  border-color: #fecaca;
  color: #ef4444;
}

.group-member-list__action-btn--danger:hover {
  background-color: #fef2f2;
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

@media (max-width: 480px) {
  .group-member-list__actions {
    opacity: 1;
  }
}
</style>
