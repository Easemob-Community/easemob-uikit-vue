<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Popup from '../../../components/popup/popup.vue'
import { useLocale } from '../../../locale'
import { useGroup } from '../../../composables/use-group'
import { useToast } from '../../../composables/use-toast'
import type { UiGroupMember } from '../../../sdk/types'
import BlockListItem from './block-list-item.vue'
import Empty from '../../../components/empty/empty.vue'
import BlockListSelectItem from './block-list-select-item.vue'

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

const blockedUserIds = computed(() => new Set(members.value.map((m) => {
  const user = m.user || m
  return user?.userId || ''
}).filter(Boolean)))

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

async function onUnblock(item: any) {
  const user = item.user || item
  const uid = user?.userId || ''
  try {
    await unblockGroupMembers(props.groupId, [uid])
    members.value = members.value.filter((m: any) => {
      const u = m.user || m
      return (u?.userId || '') !== uid
    })
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
  return groupMembers.value.filter(m => !blockedUserIds.value.has(m.userId) && m.role !== 'owner')
})

function toggleSelect(member: UiGroupMember) {
  const next = new Set(selectedUserIds.value)
  if (next.has(member.userId))
    next.delete(member.userId)
  else
    next.add(member.userId)
  selectedUserIds.value = next
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
    <Empty
      v-else-if="members.length === 0"
      icon="empty/blocklist"
      :description="t('group.memberList.empty') || '暂无黑名单成员'"
      size="small"
    />
    <BlockListItem
      v-for="item in members"
      :key="(item.user || item)?.userId || ''"
      :item="item"
      @unblock="onUnblock(item)"
    />

    <Popup
      v-model:show="showAddPopup"
      position="center"
      :close-on-click-overlay="true"
      @close="closeAddPopup"
    >
      <div class="block-list__popup" @pointerdown.stop @click.stop>
        <div class="block-list__popup-header">
          <span class="block-list__popup-title">{{ t('group.blocklist.addTitle') || '添加黑名单成员' }}</span>
        </div>
        <div class="block-list__popup-body">
          <div v-if="loadingMembers" class="block-list__popup-status">
            {{ t('common.loading') }}
          </div>
          <Empty
            v-else-if="selectableMembers.length === 0"
            icon="empty/blocklist"
            :description="t('group.blocklist.emptySelectable') || '暂无可添加的成员'"
            size="small"
          />
          <BlockListSelectItem
            v-for="member in selectableMembers"
            :key="member.userId"
            :member="member"
            :selected="selectedUserIds.has(member.userId)"
            @toggle="toggleSelect(member)"
          />
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
.block-list__loading {
  text-align: center;
  padding: 16px;
  font-size: 14px;
  color: var(--uikit-text-secondary);
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
.block-list__popup-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;
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
