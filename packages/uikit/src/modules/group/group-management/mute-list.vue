<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Popup from '../../../components/popup/popup.vue'
import { useLocale } from '../../../locale'
import { CONVERSATION_TYPE, GROUP_MEMBER_ROLE, MESSAGE_STATUS, MESSAGE_TYPE } from '../../../constants'
import { useGroup } from '../../../composables/use-group'
import { useToast } from '../../../composables/use-toast'
import { useUIKit } from '../../../composables/use-uikit'
import { createLogger } from '../../../utils/logger'
import type { UiGroupMember } from '../../../sdk/types'
import Empty from '../../../components/empty/empty.vue'
import MuteListItem from './mute-list-item.vue'
import MuteListSelectItem from './mute-list-select-item.vue'

export interface MuteListProps {
  groupId: string
}

const props = defineProps<MuteListProps>()

const emit = defineEmits<{
  (e: 'unmute', member: UiGroupMember): void
  (e: 'mute', members: UiGroupMember[]): void
}>()

const logger = createLogger('MuteList')
const { t } = useLocale()
const { show: showToast } = useToast()
const { stores } = useUIKit()
const {
  getGroupMuteList: fetchMuteList,
  unmuteGroupMembers,
  muteGroupMembers,
  fetchGroupMembers,
} = useGroup()

const loading = ref(false)
const members = ref<any[]>([])

// 添加禁言成员 Popup 状态
const showAddPopup = ref(false)
const loadingMembers = ref(false)
const groupMembers = ref<UiGroupMember[]>([])
const selectedUserIds = ref<Set<string>>(new Set())

const mutedUserIds = computed(() => new Set(members.value.map((m) => {
  const user = m.user || m
  return user?.userId || ''
}).filter(Boolean)))

async function loadData() {
  if (!props.groupId)
    return
  loading.value = true
  try {
    const result = await fetchMuteList(props.groupId)
    logger.info('loadData succeeded', { result })
    members.value = Array.isArray(result) ? result : []
  }
  catch (err) {
    logger.warn('load failed:', err)
  }
  finally {
    loading.value = false
  }
}

watch(() => props.groupId, loadData, { immediate: true })

async function onUnmute(item: any) {
  const user = item.user || item
  const uid = user?.userId || ''
  const name = user?.nickname || uid
  try {
    await unmuteGroupMembers(props.groupId, [uid])
    members.value = members.value.filter((m: any) => {
      const u = m.user || m
      return (u?.userId || '') !== uid
    })
    emit('unmute', { userId: uid })
    addNoticeToChat((t('group.mutelist.unmuteNotice', '{name} 被解除禁言')).replace('{name}', name))
  }
  catch (err) {
    logger.warn('unmute failed:', err)
  }
}

// 通知消息：插入聊天中的灰色系统通知
function addNoticeToChat(content: string) {
  if (!props.groupId)
    return
  const id = `notice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  stores.message.addMessage({
    msgLocalId: id,
    msgServerId: '',
    type: MESSAGE_TYPE.NOTICE as any,
    body: { content } as any,
    from: stores.client.currentUser ?? '',
    to: props.groupId,
    conversationId: props.groupId,
    conversationType: CONVERSATION_TYPE.GROUPCHAT,
    timestamp: Date.now(),
    status: MESSAGE_STATUS.SENT,
    isSelf: true,
    localId: id,
  } as any)
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
    logger.warn('load group members failed:', err)
  }
  finally {
    loadingMembers.value = false
  }
}

const selectableMembers = computed(() => {
  return groupMembers.value.filter(m => !mutedUserIds.value.has(m.userId) && m.role !== GROUP_MEMBER_ROLE.OWNER)
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
  logger.info('onConfirmAdd clicked', { groupId: props.groupId, count: ids.length, userIds: ids })
  if (ids.length === 0 || !props.groupId) {
    logger.info('onConfirmAdd early return: empty selection or no groupId')
    return
  }
  try {
    // SDK 5.0.0+ muteDuration 单位为毫秒，-1 表示永久禁言
    logger.info('calling muteGroupMembers', { groupId: props.groupId, userIds: ids, muteDuration: -1 })
    await muteGroupMembers(props.groupId, ids, -1)
    logger.info('muteGroupMembers succeeded')
    logger.info('calling loadData to refresh mute list')
    await loadData()
    logger.info('loadData finished, members count:', members.value.length)
    showAddPopup.value = false
    selectedUserIds.value.clear()
    showToast(t('group.mutelist.addSuccess', '添加成功'), 'success')
    logger.info('emitting mute event', { userIds: ids })
    emit('mute', ids.map(id => ({ userId: id })))
    // 插入系统通知
    const names = ids.map((uid) => {
      const member = groupMembers.value.find(m => m.userId === uid)
      return member?.nickname || uid
    }).join('、')
    logger.info('adding notice to chat', { names })
    addNoticeToChat((t('group.mutelist.muteNotice', '{name} 被禁言')).replace('{name}', names))
    logger.info('onConfirmAdd completed successfully')
  }
  catch (err) {
    logger.warn('add to mutelist failed:', err)
    showToast(t('group.mutelist.addFailed', '添加失败'), 'error')
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
  <div class="mute-list">
    <!-- 顶部操作栏 -->
    <div class="mute-list__header">
      <span class="mute-list__header-count">
        {{ members.length }} {{ t('group.mutelist.memberCount', '名禁言成员') }}
      </span>
    </div>

    <div v-if="loading" class="mute-list__loading">
      {{ t('common.loading') }}
    </div>
    <Empty
      v-else-if="members.length === 0"
      icon="empty/mutelist"
      :description="t('group.memberList.empty', '暂无禁言成员')"
      size="small"
    />
    <MuteListItem
      v-for="item in members"
      :key="(item.user || item)?.userId || ''"
      :item="item"
      @unmute="onUnmute(item)"
    />

    <!-- 添加禁言成员 Popup -->
    <Popup
      v-model:show="showAddPopup"
      position="center"
      :close-on-click-overlay="true"
      @close="closeAddPopup"
    >
      <div class="mute-list__popup" @pointerdown.stop @click.stop>
        <div class="mute-list__popup-header">
          <span class="mute-list__popup-title">{{ t('group.mutelist.addTitle', '添加禁言成员') }}</span>
        </div>
        <div class="mute-list__popup-body">
          <div v-if="loadingMembers" class="mute-list__popup-status">
            {{ t('common.loading') }}
          </div>
          <Empty
            v-else-if="selectableMembers.length === 0"
            icon="empty/mutelist"
            :description="t('group.mutelist.emptySelectable', '暂无可添加的成员')"
            size="small"
          />
          <MuteListSelectItem
            v-for="member in selectableMembers"
            :key="member.userId"
            :member="member"
            :selected="selectedUserIds.has(member.userId)"
            @toggle="toggleSelect(member)"
          />
        </div>
        <div class="mute-list__popup-footer">
          <button class="mute-list__popup-btn mute-list__popup-btn--cancel" @click="closeAddPopup">
            {{ t('group.blocklist.cancel', '取消') }}
          </button>
          <button
            class="mute-list__popup-btn mute-list__popup-btn--confirm"
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
.mute-list {
  padding: 8px 0;
}

/* 顶部操作栏 */
.mute-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
}

.mute-list__header-count {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
}

.mute-list__loading {
  text-align: center;
  padding: 16px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
}

/* Popup 样式 */
.mute-list__popup {
  width: 360px;
  max-width: 90vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 8px);
  overflow: hidden;
}

.mute-list__popup-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 16px;
}

.mute-list__popup-title {
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.mute-list__popup-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 0;
}

.mute-list__popup-status {
  text-align: center;
  padding: 24px 16px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
}

.mute-list__popup-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;
}

.mute-list__popup-btn {
  padding: 6px 16px;
  border-radius: var(--uikit-components-radius, 6px);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: var(--uikit-font-size-14);
  cursor: pointer;
  transition: all 0.15s;
}

@media (hover: hover) {
.mute-list__popup-btn:hover {
  background-color: var(--uikit-bg-secondary);
}
}

.mute-list__popup-btn--confirm {
  border-color: var(--uikit-primary-color);
  background-color: var(--uikit-primary-color);
  color: #ffffff;
}

.mute-list__popup-btn--confirm:hover:not(:disabled) {
  opacity: 0.9;
}

.mute-list__popup-btn--confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
