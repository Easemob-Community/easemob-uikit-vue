<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CONVERSATION_TYPE, EmEmpty as Empty, GROUP_MEMBER_ROLE, EmModal as Modal, NOTICE_EVENT_TYPE, EmPopup as Popup, createLogger, insertChatNotice, useLocale, useToast } from '@easemob/uikit-core'
import type { NoticeEventTypeValue, UiGroupMember } from '@easemob/uikit-core'
import { useGroup } from '../../../composables/use-group'
import { useUIKit } from '../../../composables/use-uikit'
import MuteListItem from './mute-list-item.vue'
import MuteListSelectItem from './mute-list-select-item.vue'

export interface MuteListProps {
  groupId: string
  /** 是否显示顶部计数操作栏，默认 true；会话详情抽屉分栏页传 false（tabs 页不显示计数栏） */
  showHeader?: boolean
  /** 行分隔线（透传 EmCell border 能力），默认无；会话详情抽屉分栏页传 'bottom' */
  border?: boolean | 'top' | 'bottom'
}

const props = withDefaults(defineProps<MuteListProps>(), {
  showHeader: true,
})

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
// 列表数据源直接读 store 禁言缓存：domain 的禁言/解除禁言/事件回推都会同步 store，
// 保证「全部」分栏 ⋮ 禁言后本分栏响应式更新（v-show 分栏切换不会重新挂载组件）
const members = computed<any[]>(() => stores.group.getGroupMuteList(props.groupId))

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
    // domain 内部会把结果写入 store 禁言缓存（getGroupMuteList），members 计算属性自动更新
    await fetchMuteList(props.groupId)
  }
  catch (err) {
    logger.warn('load failed:', err)
  }
  finally {
    loading.value = false
  }
}

watch(() => props.groupId, loadData, { immediate: true })

/** 取消禁言：二次确认 */
const showUnmuteConfirm = ref(false)
const pendingUnmuteItem = ref<any>(null)

function onUnmute(item: any) {
  pendingUnmuteItem.value = item
  showUnmuteConfirm.value = true
}

async function confirmUnmute() {
  const item = pendingUnmuteItem.value
  pendingUnmuteItem.value = null
  showUnmuteConfirm.value = false
  if (!item)
    return
  const user = item.user || item
  const uid = user?.userId || ''
  const name = user?.nickname || uid
  try {
    // domain 内部已同步 store 禁言缓存（removeGroupMuteMembers），members 计算属性自动更新
    await unmuteGroupMembers(props.groupId, [uid])
    emit('unmute', { userId: uid })
    addNoticeToChat(NOTICE_EVENT_TYPE.MUTE_REMOVED, name, t('group.mutelist.unmuteNotice', '{name} 被解除禁言').replace('{name}', name))
  }
  catch (err) {
    logger.warn('unmute failed:', err)
  }
}

function cancelUnmute() {
  pendingUnmuteItem.value = null
  showUnmuteConfirm.value = false
}

// 通知消息：插入聊天中的灰色系统通知（统一走 insertChatNotice 管线，支持 noticeConfig 定制）
function addNoticeToChat(
  eventType: NoticeEventTypeValue,
  names: string,
  defaultText: string,
) {
  if (!props.groupId)
    return
  insertChatNotice(stores, props.groupId, CONVERSATION_TYPE.GROUPCHAT, {
    eventType,
    // params 契约与接收方（group-events.ts）对齐：names 顿号拼接 + count
    params: { names, count: 1 },
    defaultText,
  })
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
    addNoticeToChat(NOTICE_EVENT_TYPE.MUTE_ADDED, names, t('group.mutelist.muteNotice', '{name} 被禁言').replace('{name}', names))
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
    <div v-if="props.showHeader" class="mute-list__header">
      <span class="mute-list__header-count">
        {{ members.length }} {{ t('group.mutelist.memberCount', '名禁言成员') }}
      </span>
    </div>

    <div v-if="loading" class="mute-list__loading">
      {{ t('common.loading') }}
    </div>
    <Empty
      v-else-if="members.length === 0"
      icon="person/double"
      :description="t('group.memberList.empty', '暂无禁言成员')"
      size="small"
    />
    <MuteListItem
      v-for="item in members"
      :key="(item.user || item)?.userId || ''"
      :item="item"
      :border="props.border"
      @unmute="onUnmute(item)"
    />

    <!-- 取消禁言二次确认 -->
    <Modal
      v-model:show="showUnmuteConfirm"
      :title="t('chat.info.unmuteMemberConfirmTitle')"
      :width="719"
      type="warning"
      :confirm-text="t('button.confirm')"
      :cancel-text="t('button.cancel')"
      @confirm="confirmUnmute"
      @cancel="cancelUnmute"
    >
      {{ t('chat.info.unmuteMemberConfirmContent').replace('{name}', (pendingUnmuteItem?.user || pendingUnmuteItem)?.nickname || (pendingUnmuteItem?.user || pendingUnmuteItem)?.userId || '') }}
    </Modal>

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
            icon="person/double"
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
  font-weight: var(--uikit-font-weight-semibold);
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
  transition: all var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .mute-list__popup-btn:hover {
    background-color: var(--uikit-bg-secondary);
  }
}

.mute-list__popup-btn--confirm {
  border-color: var(--uikit-primary-color);
  background-color: var(--uikit-primary-color);
  color: var(--uikit-text-inverse);
}

@media (hover: hover) {
  .mute-list__popup-btn--confirm:hover:not(:disabled) {
    opacity: 0.9;
  }
}

.mute-list__popup-btn--confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
