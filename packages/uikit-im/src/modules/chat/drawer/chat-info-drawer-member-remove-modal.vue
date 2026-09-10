<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { EmButton as Button, CONVERSATION_TYPE, EmEmpty as Empty, GROUP_MEMBER_ROLE, NOTICE_EVENT_TYPE, EmPopup as Popup, insertChatNotice, useLocale, useToast, useViewport } from '@easemob/uikit-core'
import type { GroupMemberRoleValue, UiGroupMember } from '@easemob/uikit-core'
import { useGroup } from '../../../composables/use-group'
import { useUIKit } from '../../../composables/use-uikit'
import MuteListSelectItem from '../../group/group-management/mute-list-select-item.vue'

export interface ChatInfoDrawerMemberRemoveModalProps {
  /** 是否显示（v-model:show 受控） */
  show: boolean
  /** 群 ID */
  groupId: string
  /** 候选成员列表（抽屉注入的群成员缓存） */
  members: UiGroupMember[]
  /** 当前登录用户 ID */
  currentUserId: string
  /** 当前用户群内角色 */
  currentUserRole?: GroupMemberRoleValue
}

const props = defineProps<ChatInfoDrawerMemberRemoveModalProps>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  /** 批量移除成功后触发，负载为被移除的用户 ID 列表 */
  (e: 'removed', userIds: string[]): void
}>()

const { t } = useLocale()
const { show: showToast } = useToast()
const { isMobile } = useViewport()
const { stores } = useUIKit()
const { removeGroupMembers } = useGroup()

const selectedUserIds = ref<Set<string>>(new Set())
const removing = ref(false)

const isOwner = computed(() => props.currentUserRole === GROUP_MEMBER_ROLE.OWNER)
const isAdmin = computed(() => props.currentUserRole === GROUP_MEMBER_ROLE.ADMIN)

/** 可移除成员：排除本人；群主可移除任何非本人，管理员只能移除普通成员（同 group-member-list-item 的 canRemove 语义） */
const removableMembers = computed(() =>
  props.members.filter((m) => {
    if (m.userId === props.currentUserId)
      return false
    if (isOwner.value)
      return true
    if (isAdmin.value && m.role === GROUP_MEMBER_ROLE.MEMBER)
      return true
    return false
  }),
)

watch(
  () => props.show,
  (show) => {
    if (show)
      selectedUserIds.value = new Set()
  },
)

function toggleSelect(member: UiGroupMember) {
  const next = new Set(selectedUserIds.value)
  if (next.has(member.userId))
    next.delete(member.userId)
  else
    next.add(member.userId)
  selectedUserIds.value = next
}

function onClose() {
  emit('update:show', false)
}

async function onConfirm() {
  const ids = Array.from(selectedUserIds.value)
  if (ids.length === 0 || !props.groupId || removing.value)
    return
  removing.value = true
  try {
    await removeGroupMembers(props.groupId, ids)
    // 同步 store 成员缓存（与 chat.vue 单个移除的 removeMember 通道一致）
    stores.group.removeGroupMembers(props.groupId, ids)
    showToast(t('chat.info.removeMemberSuccess', '成员已移除'), 'success')
    // 发布方本地插入灰色通知：SDK 不回推操作者本人，与接收方文案保持一致
    const names = ids
      .map(uid => props.members.find(m => m.userId === uid)?.nickname || uid)
      .join('、')
    insertChatNotice(stores, props.groupId, CONVERSATION_TYPE.GROUPCHAT, {
      eventType: NOTICE_EVENT_TYPE.USER_REMOVED,
      params: { name: names, count: ids.length },
      defaultText: t('chat.notice.userRemoved').replace('{name}', names),
    })
    emit('removed', ids)
    emit('update:show', false)
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.removeMemberFailed', '移除成员失败'), 'error')
  }
  finally {
    removing.value = false
  }
}
</script>

<template>
  <Popup
    :show="props.show"
    :position="isMobile ? 'bottom' : 'center'"
    :show-close="true"
    @update:show="emit('update:show', $event)"
    @close="onClose"
  >
    <div class="chat-info-drawer-member-remove" :class="{ 'chat-info-drawer-member-remove--mobile': isMobile }">
      <div class="chat-info-drawer-member-remove__header">
        <span class="chat-info-drawer-member-remove__title">{{ t('group.memberList.removeConfirmTitle', '移除成员') }}</span>
        <span v-if="selectedUserIds.size > 0" class="chat-info-drawer-member-remove__count">({{ selectedUserIds.size }})</span>
      </div>

      <div class="chat-info-drawer-member-remove__list">
        <Empty
          v-if="removableMembers.length === 0"
          icon="person/double"
          :description="t('group.memberList.empty', '暂无成员')"
          size="small"
        />
        <MuteListSelectItem
          v-for="member in removableMembers"
          :key="member.userId"
          :member="member"
          :selected="selectedUserIds.has(member.userId)"
          @toggle="toggleSelect(member)"
        />
      </div>

      <div class="chat-info-drawer-member-remove__footer">
        <Button type="default" @click="onClose">
          {{ t('button.cancel', '取消') }}
        </Button>
        <Button
          type="danger"
          :disabled="selectedUserIds.size === 0"
          :loading="removing"
          @click="onConfirm"
        >
          {{ t('chat.info.removeSelectedMembers', '移除（{count}）').replace('{count}', String(selectedUserIds.size)) }}
        </Button>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.chat-info-drawer-member-remove {
  width: 400px;
  max-width: 90vw;
  height: 60vh;
  max-height: 520px;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 12px);
  overflow: hidden;
}

.chat-info-drawer-member-remove--mobile {
  width: 100vw;
  max-width: 100vw;
  height: 80vh;
  max-height: 80vh;
  border-radius: var(--uikit-components-radius, 12px) var(--uikit-components-radius, 12px) 0 0;
}

.chat-info-drawer-member-remove__header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  flex-shrink: 0;
}

.chat-info-drawer-member-remove__title {
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.chat-info-drawer-member-remove__count {
  margin-left: 6px;
  font-size: var(--uikit-font-size-14);
  font-weight: 400;
  color: var(--uikit-text-secondary);
}

.chat-info-drawer-member-remove__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.chat-info-drawer-member-remove__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  flex-shrink: 0;
}
</style>
