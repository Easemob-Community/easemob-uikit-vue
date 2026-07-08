<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import Popup from '../../../components/popup/popup.vue'
import { useLocale } from '../../../locale'
import { useGroup } from '../../../composables/use-group'
import { useToast } from '../../../composables/use-toast'
import type { UiGroupMember } from '../../../sdk/types'

export interface BlockListProps {
  groupId: string
}

const props = defineProps<BlockListProps>()

const emit = defineEmits<{
  (e: 'unblock', member: UiGroupMember): void
  (e: 'block', members: UiGroupMember[]): void
}>()

const { t } = useLocale()
const { show: showToast } = useToast()
const {
  getGroupBlocklist: fetchBlocklist,
  unblockGroupMembers,
  blockGroupMembers,
  fetchGroupMembers,
} = useGroup()

const loading = ref(false)
const members = ref<any[]>([])

const showAddPopup = ref(false)
const loadingMembers = ref(false)
const groupMembers = ref<UiGroupMember[]>([])
const selectedUserIds = ref<Set<string>>(new Set())

const blockedUserIds = computed(() => new Set(members.value.map(m => userId(m)).filter(Boolean)))

async function loadData() {
  if (!props.groupId)
    return
  loading.value = true
  try {
    const result = await fetchBlocklist(props.groupId)
    members.value = Array.isArray(result) ? result : []
  }
  catch (err) {
    console.warn('[BlockList] load failed:', err)
  }
  finally {
    loading.value = false
  }
}

watch(() => props.groupId, loadData, { immediate: true })

function displayName(item: any): string {
  const user = item.user || item
  return user?.nickname || user?.userId || ''
}

function userId(item: any): string {
  const user = item.user || item
  return user?.userId || ''
}

function memberDisplayName(member: UiGroupMember): string {
  return member.nickname || member.userId || ''
}

async function onUnblock(item: any) {
  const uid = userId(item)
  try {
    await unblockGroupMembers(props.groupId, [uid])
    members.value = members.value.filter((m: any) => userId(m) !== uid)
    emit('unblock', { userId: uid })
  }
  catch (err) {
    console.warn('[BlockList] unblock failed:', err)
  }
}

function openAddMember() {
  showAddPopup.value = true
  selectedUserIds.value.clear()
  loadGroupMembers()
}

async function loadGroupMembers() {
  if (!props.groupId)
    return
  loadingMembers.value = true
  try {
    const { members: list } = await fetchGroupMembers(props.groupId, undefined, 200)
    groupMembers.value = list || []
  }
  catch (err) {
    console.warn('[BlockList] load group members failed:', err)
  }
  finally {
    loadingMembers.value = false
  }
}

const selectableMembers = computed(() => {
  return groupMembers.value.filter(m => !blockedUserIds.value.has(m.userId))
})

function toggleSelect(member: UiGroupMember) {
  if (selectedUserIds.value.has(member.userId))
    selectedUserIds.value.delete(member.userId)
  else
    selectedUserIds.value.add(member.userId)
}

async function onConfirmAdd() {
  const ids = Array.from(selectedUserIds.value)
  if (ids.length === 0 || !props.groupId)
    return
  try {
    await blockGroupMembers(props.groupId, ids)
    await loadData()
    showAddPopup.value = false
    selectedUserIds.value.clear()
    showToast(t('group.blocklist.addSuccess') || '添加成功')
    emit('block', ids.map(id => ({ userId: id })))
  }
  catch (err) {
    console.warn('[BlockList] add to blocklist failed:', err)
    showToast(t('group.blocklist.addFailed') || '添加失败')
  }
}

function closeAddPopup() {
  showAddPopup.value = false
  selectedUserIds.value.clear()
}

defineExpose({
  openAddMember,
})
</script>

<template>
  <div class="block-list">
    <div v-if="loading" class="block-list__loading">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="members.length === 0" class="block-list__empty">
      {{ t('group.memberList.empty') || '暂无黑名单成员' }}
    </div>
    <div
      v-for="item in members"
      :key="userId(item)"
      class="block-list__item"
    >
      <Avatar
        class="block-list__avatar"
        :name="displayName(item)"
        :size="36"
      />
      <div class="block-list__info">
        <span class="block-list__name">{{ displayName(item) }}</span>
      </div>
      <button class="block-list__action-btn" @click="onUnblock(item)">
        {{ t('group.memberList.unblock') || '移出黑名单' }}
      </button>
    </div>

    <Popup
      v-model:show="showAddPopup"
      position="center"
      :close-on-click-overlay="true"
      @close="closeAddPopup"
    >
      <div class="block-list__popup">
        <div class="block-list__popup-header">
          <span class="block-list__popup-title">{{ t('group.blocklist.addTitle') || '添加黑名单成员' }}</span>
        </div>
        <div class="block-list__popup-body">
          <div v-if="loadingMembers" class="block-list__popup-status">
            {{ t('common.loading') }}
          </div>
          <div v-else-if="selectableMembers.length === 0" class="block-list__popup-status">
            {{ t('group.blocklist.emptySelectable') || '暂无可添加的成员' }}
          </div>
          <div
            v-for="member in selectableMembers"
            :key="member.userId"
            class="block-list__popup-item"
            @click="toggleSelect(member)"
          >
            <Avatar
              class="block-list__popup-avatar"
              :name="memberDisplayName(member)"
              :size="36"
            />
            <span class="block-list__popup-name">{{ memberDisplayName(member) }}</span>
            <span
              class="block-list__popup-checkbox"
              :class="{ 'block-list__popup-checkbox--checked': selectedUserIds.has(member.userId) }"
            />
          </div>
        </div>
        <div class="block-list__popup-footer">
          <button class="block-list__popup-btn block-list__popup-btn--cancel" @click="closeAddPopup">
            {{ t('group.blocklist.cancel') || '取消' }}
          </button>
          <button
            class="block-list__popup-btn block-list__popup-btn--confirm"
            :disabled="selectedUserIds.size === 0"
            @click="onConfirmAdd"
          >
            {{ t('group.blocklist.confirm') || '确定' }}
          </button>
        </div>
      </div>
    </Popup>
  </div>
</template>

<style scoped>
.block-list {
  padding: 8px 0;
}
.block-list__loading,
.block-list__empty {
  text-align: center;
  padding: 16px;
  font-size: 14px;
  color: var(--uikit-text-secondary);
}
.block-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
}
.block-list__avatar {
  flex-shrink: 0;
}
.block-list__info {
  flex: 1;
  min-width: 0;
}
.block-list__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--uikit-text-primary);
}
.block-list__action-btn {
  padding: 4px 10px;
  border-radius: var(--uikit-components-radius, 5px);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.block-list__action-btn:hover {
  background-color: var(--uikit-bg-secondary);
}

.block-list__popup {
  width: 360px;
  max-width: 90vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 8px);
  overflow: hidden;
}
.block-list__popup-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--uikit-border-color, #f3f4f6);
}
.block-list__popup-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}
.block-list__popup-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 0;
}
.block-list__popup-status {
  text-align: center;
  padding: 24px 16px;
  font-size: 14px;
  color: var(--uikit-text-secondary);
}
.block-list__popup-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
}
.block-list__popup-item:hover {
  background-color: var(--uikit-bg-secondary);
}
.block-list__popup-avatar {
  flex-shrink: 0;
}
.block-list__popup-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: var(--uikit-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.block-list__popup-checkbox {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--uikit-border-color, #d1d5db);
  flex-shrink: 0;
  transition: all 0.15s;
}
.block-list__popup-checkbox--checked {
  border-color: var(--uikit-primary-color);
  background-color: var(--uikit-primary-color);
}
.block-list__popup-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--uikit-border-color, #f3f4f6);
}
.block-list__popup-btn {
  padding: 6px 16px;
  border-radius: var(--uikit-components-radius, 6px);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.block-list__popup-btn:hover {
  background-color: var(--uikit-bg-secondary);
}
.block-list__popup-btn--confirm {
  border-color: var(--uikit-primary-color);
  background-color: var(--uikit-primary-color);
  color: #ffffff;
}
.block-list__popup-btn--confirm:hover:not(:disabled) {
  opacity: 0.9;
}
.block-list__popup-btn--confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
