<script setup lang="ts">
import Avatar from '../../../components/avatar/avatar.vue'
import { useLocale } from '../../../locale'
import { useUserInfo } from '../../../composables/use-user-info'
import { GROUP_MEMBER_ROLE } from '../../../constants'
import type { UiGroupMember } from '../../../sdk/types'

export interface ChatInfoDrawerMemberCellProps {
  member: UiGroupMember
}

const props = defineProps<ChatInfoDrawerMemberCellProps>()

const { t } = useLocale()

// ✅ 使用 useUserInfo 解析显示名和头像（优先级：备注 > 昵称 > userId）
const { displayName, avatarUrl } = useUserInfo(() => props.member.userId)
</script>

<template>
  <div class="chat-info-drawer__member-cell">
    <Avatar :name="displayName" :src="avatarUrl" :size="48" />
    <span class="chat-info-drawer__member-name">{{ displayName }}</span>
    <span v-if="props.member.role === GROUP_MEMBER_ROLE.OWNER" class="chat-info-drawer__member-tag chat-info-drawer__member-tag--owner">
      {{ t('chat.info.groupOwner') }}
    </span>
    <span v-else-if="props.member.role === GROUP_MEMBER_ROLE.ADMIN" class="chat-info-drawer__member-tag chat-info-drawer__member-tag--admin">
      {{ t('chat.info.groupAdmin') }}
    </span>
  </div>
</template>

<style scoped>
.chat-info-drawer__member-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px;
  cursor: pointer;
  border-radius: var(--uikit-components-radius, 8px);
}

.chat-info-drawer__member-name {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-primary);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-info-drawer__member-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 16px;
  font-size: var(--uikit-font-size-10);
  padding: 1px 4px;
  border-radius: 4px;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
}

.chat-info-drawer__member-tag--owner {
  background-color: #fef3c7;
  color: #d97706;
}

.chat-info-drawer__member-tag--admin {
  background-color: #dbeafe;
  color: #2563eb;
}
</style>
