<script setup lang="ts">
/**
 * 聊天室成员项：头像 + 昵称 + 角色徽章（房主/管理员）+ 禁言标记。
 * 点击触发 manage 事件（成员面板弹操作菜单）；Avatar 形状跟随主题（不硬编码 shape）。
 *
 * PC 管理位（P5）：提供 #manage-actions 插槽——业务/侧栏注入悬停快捷操作
 * （禁言/移除等），仅在有插槽且处于 hover 能力设备时显示
 * （@media (hover: hover) 包裹，移动端 tap 不粘住）。
 */
import { computed } from 'vue'
import { EmAvatar, normalizeUserId, t, useUserInfo } from '@easemob/uikit-core'
import { CHATROOM_MEMBER_ROLE } from '../../../constants'
import { useChatroomMember } from '../../../composables/use-chatroom-member'
import type { ChatroomMember } from '../../../sdk/domain/chatroom-domain'

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
  /** 点击成员（manageable 时由面板/侧栏弹操作菜单；携带点击事件供定位） */
  (e: 'manage', member: ChatroomMember, event: MouseEvent): void
}>()

// 只消费公开 composable 契约（§5.10：禁止直取 store，P2 review P1-1）
const { muteList } = useChatroomMember()
const { displayName, avatarUrl } = useUserInfo(() => props.member.userId)

/** 角色徽章文案（owner/admin 展示） */
const roleBadge = computed(() => {
  if (props.member.role === CHATROOM_MEMBER_ROLE.OWNER)
    return t('chatroom.ui.roleOwner')
  if (props.member.role === CHATROOM_MEMBER_ROLE.ADMIN)
    return t('chatroom.ui.roleAdmin')
  return ''
})

/** 是否在禁言名单中（双方归一化后比较，P2 review P2-4） */
const isMuted = computed(() =>
  muteList.value.some(item => normalizeUserId(item.userId) === props.member.userId))
</script>

<template>
  <div
    class="chatroom-member-item"
    :class="{ 'chatroom-member-item--manageable': manageable }"
    @click="manageable && emit('manage', member, $event)"
  >
    <EmAvatar :src="avatarUrl || undefined" :name="displayName" :size="36" />
    <span class="chatroom-member-item__name">
      {{ displayName }}
      <span v-if="isMuted" class="chatroom-member-item__muted">{{ t('chatroom.ui.memberMuted') }}</span>
    </span>
    <span v-if="roleBadge" class="chatroom-member-item__badge" :class="`chatroom-member-item__badge--${member.role}`">
      {{ roleBadge }}
    </span>
    <!-- PC 悬停快捷操作（P5：仅 hover 能力设备显示；内容由业务/侧栏注入） -->
    <div v-if="$slots['manage-actions']" class="chatroom-member-item__actions" @click.stop>
      <slot name="manage-actions" :member="member" />
    </div>
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
  border-radius: var(--uikit-components-radius, 4px);
}

.chatroom-member-item__badge--owner {
  color: var(--uikit-warning-color, #f3c850);
  border: 1px solid currentColor;
}

.chatroom-member-item__badge--admin {
  color: var(--uikit-primary-color);
  border: 1px solid currentColor;
}

/* PC 悬停快捷操作：默认隐藏，hover 能力设备上悬停成员项时显示 */
.chatroom-member-item__actions {
  display: none;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
}

@media (hover: hover) {
  .chatroom-member-item:hover .chatroom-member-item__actions {
    display: flex;
  }
}
</style>
