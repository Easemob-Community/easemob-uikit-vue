<script setup lang="ts">
import { EmAvatar as Avatar } from '@easemob/uikit-core'
import { useUserInfo } from '../../../composables/use-user-info'
import type { UiGroupMember } from '@easemob/uikit-core'

export interface ChatInfoDrawerMemberCellProps {
  member: UiGroupMember
}

const props = defineProps<ChatInfoDrawerMemberCellProps>()

// ✅ 使用 useUserInfo 解析显示名和头像（优先级：备注 > 昵称 > userId）
const { displayName, avatarUrl } = useUserInfo(() => props.member.userId)
</script>

<template>
  <!-- 宫格单元格：仅头像 + 昵称（设计稿不展示角色标签；角色 tag 见成员列表行 group-member-list-item） -->
  <div class="chat-info-drawer__member-cell">
    <Avatar :name="displayName" :src="avatarUrl" :size="48" />
    <span class="chat-info-drawer__member-name">{{ displayName }}</span>
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
  font-size: var(--uikit-font-size-11);
  font-weight: var(--uikit-font-weight-regular);
  color: var(--uikit-text-primary);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
