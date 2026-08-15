<script setup lang="ts">
/**
 * 聊天室顶部栏（H5-first）：返回 + 房间名 + 在线人数（点击开成员面板）+ 退出。
 * 全部区域可经容器命名插槽覆盖（header / header-title / header-extra）。
 */
import { EmIconButton, t } from '@easemob/uikit-core'

export interface ChatroomHeaderProps {
  /** 房间名称（未进房时展示 roomId 或空态） */
  title: string
  /** 在线人数（房间详情当前人数；undefined 不显示） */
  memberCount?: number
  /** 是否处于加入中 */
  joining?: boolean
  /** 是否可开成员面板（已进房且场景配置开启成员列表） */
  memberPanelEnabled?: boolean
}

export interface ChatroomHeaderEmits {
  /** 点击返回（容器转发给业务，业务决定路由/关闭） */
  (e: 'back'): void
  /** 点击人数/成员入口（打开成员面板） */
  (e: 'member-click'): void
  /** 点击退出（离开聊天室） */
  (e: 'exit'): void
}

defineProps<ChatroomHeaderProps>()
defineEmits<ChatroomHeaderEmits>()
</script>

<template>
  <div class="chatroom-header">
    <EmIconButton
      class="chatroom-header__back"
      icon="navigation/chevron_left"
      :title="t('chatroom.ui.back')"
      @click="$emit('back')"
    />
    <div class="chatroom-header__center">
      <div class="chatroom-header__title">
        <!-- 标题插槽（容器 header-title 透传） -->
        <slot name="title">
          {{ joining ? t('chatroom.ui.joining') : (title || t('chatroom.ui.notJoined')) }}
        </slot>
      </div>
      <button
        v-if="memberPanelEnabled && memberCount !== undefined"
        class="chatroom-header__count"
        @click="$emit('member-click')"
      >
        {{ t('chatroom.ui.memberCount', '', { count: memberCount }) }}
      </button>
    </div>
    <EmIconButton
      class="chatroom-header__exit"
      icon="actions/close"
      :title="t('chatroom.ui.exit')"
      @click="$emit('exit')"
    />
    <!-- 右侧扩展插槽（容器 header-extra 透传） -->
    <slot name="extra" />
  </div>
</template>

<style scoped>
.chatroom-header {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 48px;
  padding: 0 8px;
  background: var(--uikit-bg-elevated, var(--uikit-bg-base));
  border-bottom: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.06));
  flex-shrink: 0;
}

.chatroom-header__center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.chatroom-header__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
  max-width: 60vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chatroom-header__count {
  border: none;
  background: none;
  font-size: 12px;
  color: var(--uikit-text-secondary);
  padding: 0;
  cursor: pointer;
}
</style>
