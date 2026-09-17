<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { EmEmpty as Empty, GROUP_MEMBER_ROLE, EmModal as Modal, EmPopup as Popup, createLogger, formatSdkError, useLocale, useToast } from '@easemob/uikit-core'
import type { UiGroupMember } from '@easemob/uikit-core'
import { useGroup } from '../../../composables/use-group'
import { useUIKit } from '../../../composables/use-uikit'
import BlockListItem from './block-list-item.vue'
import BlockListSelectItem from './block-list-select-item.vue'

const props = defineProps<BlockListProps>()

const emit = defineEmits<{
  (e: 'unblock', member: UiGroupMember): void
  (e: 'block', members: UiGroupMember[]): void
}>()

const logger = createLogger('UIKit:BlockList')

export interface BlockListProps {
  groupId: string
  /** 行分隔线（透传 EmCell border 能力），默认无；会话详情抽屉分栏页传 'bottom' */
  border?: boolean | 'top' | 'bottom'
}

const { t } = useLocale()
const { show: showToast } = useToast()
const { stores } = useUIKit()
const {
  getGroupBlocklist: fetchBlocklist,
  unblockGroupMembers,
  blockGroupMembers,
  fetchGroupMembers,
} = useGroup()

const loading = ref(false)
// 列表数据源直接读 store 黑名单缓存：domain 的拉黑/移出/事件回推都会同步 store，
// 保证其他分栏操作后本分栏响应式更新（v-show 分栏切换不会重新挂载组件）
const members = computed<any[]>(() => stores.group.getGroupBlocklist(props.groupId))

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
    // domain 内部会把结果写入 store 黑名单缓存（getGroupBlocklist），members 计算属性自动更新
    await fetchBlocklist(props.groupId)
  }
  catch (err) {
    logger.warn('[BlockList] load failed:', formatSdkError(err))
  }
  finally {
    loading.value = false
  }
}

watch(() => props.groupId, loadData, { immediate: true })

/** 移出黑名单：二次确认 */
const showUnblockConfirm = ref(false)
const pendingUnblockItem = ref<any>(null)

function onUnblock(item: any) {
  pendingUnblockItem.value = item
  showUnblockConfirm.value = true
}

async function confirmUnblock() {
  const item = pendingUnblockItem.value
  pendingUnblockItem.value = null
  showUnblockConfirm.value = false
  if (!item)
    return
  const user = item.user || item
  const uid = user?.userId || ''
  try {
    // domain 内部已同步 store 黑名单缓存（removeGroupBlocklistMembers），members 计算属性自动更新
    await unblockGroupMembers(props.groupId, [uid])
    emit('unblock', { userId: uid })
  }
  catch (err) {
    logger.warn('[BlockList] unblock failed:', formatSdkError(err))
  }
}

function cancelUnblock() {
  pendingUnblockItem.value = null
  showUnblockConfirm.value = false
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
    const { list } = await fetchGroupMembers(props.groupId, undefined, 200)
    groupMembers.value = list || []
  }
  catch (err) {
    logger.warn('[BlockList] load group members failed:', formatSdkError(err))
  }
  finally {
    loadingMembers.value = false
  }
}

const selectableMembers = computed(() => {
  return groupMembers.value.filter(m => !blockedUserIds.value.has(m.userId) && m.role !== GROUP_MEMBER_ROLE.OWNER)
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
    showToast(t('group.blocklist.addSuccess', '添加成功'), 'success')
    emit('block', ids.map(id => ({ userId: id })))
  }
  catch (err) {
    logger.warn('[BlockList] add to blocklist failed:', formatSdkError(err))
    showToast(t('group.blocklist.addFailed', '添加失败'), 'error')
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
      icon="person/double"
      :description="t('group.memberList.empty', '暂无黑名单成员')"
      size="small"
    />
    <BlockListItem
      v-for="item in members"
      :key="(item.user || item)?.userId || ''"
      :item="item"
      :border="props.border"
      @unblock="onUnblock(item)"
    />

    <!-- 移出黑名单二次确认 -->
    <Modal
      v-model:show="showUnblockConfirm"
      :title="t('chat.info.unblockMemberConfirmTitle')"
      :width="719"
      type="warning"
      :confirm-text="t('button.confirm')"
      :cancel-text="t('button.cancel')"
      @confirm="confirmUnblock"
      @cancel="cancelUnblock"
    >
      {{ t('chat.info.unblockMemberConfirmContent').replace('{name}', (pendingUnblockItem?.user || pendingUnblockItem)?.nickname || (pendingUnblockItem?.user || pendingUnblockItem)?.userId || '') }}
    </Modal>

    <Popup
      v-model:show="showAddPopup"
      position="center"
      :close-on-click-overlay="true"
      @close="closeAddPopup"
    >
      <div class="block-list__popup" @pointerdown.stop @click.stop>
        <div class="block-list__popup-header">
          <span class="block-list__popup-title">{{ t('group.blocklist.addTitle', '添加黑名单成员') }}</span>
        </div>
        <div class="block-list__popup-body">
          <div v-if="loadingMembers" class="block-list__popup-status">
            {{ t('common.loading') }}
          </div>
          <Empty
            v-else-if="selectableMembers.length === 0"
            icon="person/double"
            :description="t('group.blocklist.emptySelectable', '暂无可添加的成员')"
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
            {{ t('group.blocklist.cancel', '取消') }}
          </button>
          <button
            class="block-list__popup-btn block-list__popup-btn--confirm"
            :disabled="selectedUserIds.size === 0"
            @click="onConfirmAdd"
          >
            {{ t('group.blocklist.confirm', '确定') }}
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
  font-size: var(--uikit-font-size-14);
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
  font-size: var(--uikit-font-size-16);
  font-weight: var(--uikit-font-weight-semibold);
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
  font-size: var(--uikit-font-size-14);
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
  font-size: var(--uikit-font-size-14);
  cursor: pointer;
  transition: all var(--uikit-anim-duration) var(--uikit-anim-easing);
}
@media (hover: hover) {
  .block-list__popup-btn:hover {
    background-color: var(--uikit-bg-secondary);
  }
}
.block-list__popup-btn--confirm {
  border-color: var(--uikit-primary-color);
  background-color: var(--uikit-primary-color);
  color: var(--uikit-text-inverse);
}

@media (hover: hover) {
  .block-list__popup-btn--confirm:hover:not(:disabled) {
    opacity: 0.9;
  }
}
.block-list__popup-btn--confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
