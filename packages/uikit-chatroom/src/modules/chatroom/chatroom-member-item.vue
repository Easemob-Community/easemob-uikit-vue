<script setup lang="ts">
/**
 * 聊天室成员项：头像 + 昵称 + 角色徽章（房主/管理员）+ 禁言标记。
 * 点击触发 manage 事件（成员面板弹操作菜单）；Avatar 形状跟随主题（不硬编码 shape）。
 */
import { computed } from 'vue'
import { EmAvatar, t, useUserInfo } from '@easemob/uikit-core'
import { CHATROOM_MEMBER_ROLE } from '../../constants'
import type { ChatroomMember } from '../../sdk/domain/chatroom-domain'
import { useChatroomStore } from '../../store/chatroom'

export interface ChatroomMemberItemProps {
  /** 成员数据 */
  member: ChatroomMember
  /** 是否可管理（owner/admin 可管理普通成员；owner 才可管理 admin）——由面板按权限计算 */
  manageable?: boolean
}

const props = withDefaults(defineProps<ChatroomMemberItemProps>(), {
  manageable: false,
})

const emit = defineEmits<{
  /** 点击成员（manageable 时由面板弹操作菜单） */
  (e: 'manage', member: ChatroomMember): void
}>()

const chatroomStore = useChatroomStore()
const { displayName, avatarUrl } = useUserInfo(() => props.member.userId)

/** 角色徽章文案（owner/admin 展示） */
const roleBadge = computed(() => {
  if (props.member.role === CHATROOM_MEMBER_ROLE.OWNER)
    return t('chatroom.ui.roleOwner')
  if (props.member.role === CHATROOM_MEMBER_ROLE.ADMIN)
    return t('chatroom.ui.roleAdmin')
  return ''
})

/** 是否在禁言名单中 */
const isMuted = computed(() =>
  chatroomStore.muteList.some(item => item.userId === props.member.userId))
</script>

<template>
  <div
    class="chatroom-member-item"
    :class="{ 'chatroom-member-item--manageable': manageable }"
    @click="manageable && emit('manage', member)"
  >
    <EmAvatar :src="avatarUrl || undefined" :name="displayName" :size="36" />
    <span class="chatroom-member-item__name">
      {{ displayName }}
      <span v-if="isMuted" class="chatroom-member-item__muted">{{ t('chatroom.ui.memberMuted') }}</span>
    </span>
    <span v-if="roleBadge" class="chatroom-member-item__badge" :class="`chatroom-member-item__badge--${member.role}`">
      {{ roleBadge }}
    </span>
  </div>
</template>

<style scoped>
.chatroom-member-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
}

.chatroom-member-item--manageable {
  cursor: pointer;
}

.chatroom-member-item--manageable:active {
  background: var(--uikit-bg-active, rgba(0, 0, 0, 0.04));
}

.chatroom-member-item__name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: var(--uikit-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chatroom-member-item__muted {
  font-size: 12px;
  color: var(--uikit-text-tertiary);
}

.chatroom-member-item__badge {
  flex-shrink: 0;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: var(--uikit-radius-sm, 4px);
}

.chatroom-member-item__badge--owner {
  color: var(--uikit-warning-color, #f3c850);
  border: 1px solid currentColor;
}

.chatroom-member-item__badge--admin {
  color: var(--uikit-primary-color);
  border: 1px solid currentColor;
}
</style>
